import express from 'express';
import JSZip from 'jszip';
import { rateLimit } from 'express-rate-limit';
import { renderResumePdf } from '@cvmind/auto-apply-agent/resume/pdf.js';
import { sendEmail } from '../../admin/mailer.js';
import { clean, handle, httpError, isId, model } from '../../admin/util.js';
import { EXPORT_FONTS_HREF } from '../../services/exportFonts.js';
import { collegeAudit, joinedStudents, oid, requireCollege, scoped } from '../access.js';
import { reviewMessage } from '../emails.js';
import { REVIEW_STATUSES, ResumeReview } from '../models.js';
import { studentStats } from '../stats.js';
import { collegeTemplateIds, publicReview, workFor } from './dashboard.js';

const router = express.Router();
const anyone = requireCollege();
const write = requireCollege({ write: true });

export const MAX_ZIP_STUDENTS = 50;

const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => `college-download:${req.staff?._id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, error: 'Too many downloads this hour. Try again later.' })
});

// Swappable so tests don't need a browser
let pdfRenderer = (html) => renderResumePdf(html, { format: 'A4', fontsHref: EXPORT_FONTS_HREF });
export function setPdfRenderer(fn) {
  pdfRenderer = fn;
}

async function notifyStudent(req, student, { status, comment, title }) {
  try {
    await sendEmail(reviewMessage({ student, college: req.college, status, comment, title }));
  } catch (err) {
    console.error('[college] review email failed:', err.message);
  }
}

// Approve a resume or ask for changes. The review is tied to this version of the resume.
router.post('/students/:id/works/:workId/review', write, handle(async (req, res) => {
  const status = String(req.body?.status || '');
  if (!REVIEW_STATUSES.includes(status)) throw httpError(400, 'Choose approve or request changes.');
  const comment = clean(req.body?.comment, 2000);
  if (status === 'changes_requested' && !comment) throw httpError(400, 'Tell the student what to change.');
  const { student, work } = await workFor(req, req.params.id, req.params.workId);
  if (work.type !== 'resume') throw httpError(400, 'Only resumes can be reviewed.');
  const by = { by: String(req.staff._id), byName: req.staff.name || req.staff.email, text: comment, at: new Date() };
  const review = await ResumeReview.findOneAndUpdate(
    scoped(req, { workId: String(work._id) }),
    {
      $set: { studentId: student._id, workUpdatedAt: work.updatedAt || work.createdAt, templateId: work.templateId, status, reviewerId: req.staff._id, reviewerName: by.byName },
      ...(comment ? { $push: { comments: by } } : {})
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();
  await collegeAudit(req, status === 'approved' ? 'review.approved' : 'review.changes_requested', { targetId: work._id, targetLabel: `${student.email} · ${work.title}` });
  await notifyStudent(req, student, { status, comment, title: work.title });
  res.json({ success: true, review: publicReview(review, work) });
}));

router.post('/students/:id/works/:workId/comments', write, handle(async (req, res) => {
  const text = clean(req.body?.text, 2000);
  if (!text) throw httpError(400, 'Write a comment.');
  const { student, work } = await workFor(req, req.params.id, req.params.workId);
  const review = await ResumeReview.findOneAndUpdate(
    scoped(req, { workId: String(work._id) }),
    { $push: { comments: { by: String(req.staff._id), byName: req.staff.name || req.staff.email, text, at: new Date() } } },
    { returnDocument: 'after' }
  ).lean();
  if (!review) throw httpError(400, 'Review the resume before adding comments.');
  await collegeAudit(req, 'review.commented', { targetId: work._id, targetLabel: `${student.email} · ${work.title}` });
  res.json({ success: true, review: publicReview(review, work) });
}));

const fileName = (student, title) => `${[student.rollNo, student.name || student.email.split('@')[0], title].filter(Boolean).join('_')}`.replace(/[^A-Za-z0-9 _.-]/g, '').replace(/\s+/g, '_').slice(0, 100) || 'Resume';

async function pdfFor(work) {
  try {
    return await pdfRenderer(work.htmlContent);
  } catch (err) {
    if (err?.code === 'BROWSER_UNAVAILABLE') throw Object.assign(new Error('PDF export is not available on the server right now.'), { status: 503, expose: true });
    throw err;
  }
}

// One resume as a PDF. Without workId, the student's latest approved resume.
router.post('/downloads/resume', anyone, downloadLimiter, handle(async (req, res) => {
  let { studentId, workId } = req.body || {};
  if (!workId) {
    const students = await joinedStudents(req, { _id: isId(studentId) ? oid(studentId) : null });
    const stats = students.length ? (await studentStats(req, students, { collegeTemplateIds: await collegeTemplateIds(req) })).get(String(students[0]._id)) : null;
    if (!stats) throw httpError(404, 'Student not found.');
    if (!stats.approvedWorkId) throw httpError(400, 'This student has no approved resume yet.');
    workId = stats.approvedWorkId;
  }
  const { student, work } = await workFor(req, studentId, workId);
  if (work.type !== 'resume') throw httpError(400, 'Only resumes can be downloaded.');
  const pdf = await pdfFor(work);
  await collegeAudit(req, 'download.resume', { targetId: work._id, targetLabel: `${student.email} · ${work.title}` });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName(student, work.title)}.pdf"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(Buffer.from(pdf));
}));

// Approved resumes of the chosen students (or every eligible student) in one ZIP
router.post('/downloads/zip', anyone, downloadLimiter, handle(async (req, res) => {
  const { studentIds, eligible } = req.body || {};
  const filter = {};
  if (Array.isArray(studentIds) && studentIds.length) {
    const ids = studentIds.filter(isId).map(oid);
    if (!ids.length) throw httpError(400, 'Choose at least one student.');
    filter._id = { $in: ids };
  } else if (!eligible) {
    throw httpError(400, 'Choose students or download the eligible list.');
  }
  const students = await joinedStudents(req, filter);
  const stats = await studentStats(req, students, { collegeTemplateIds: await collegeTemplateIds(req) });
  const picked = students.filter((s) => {
    const st = stats.get(String(s._id));
    return st?.approvedWorkId && (!eligible || st.eligible);
  });
  if (!picked.length) throw httpError(400, 'None of these students has an approved resume.');
  if (picked.length > MAX_ZIP_STUDENTS) throw httpError(400, `Download up to ${MAX_ZIP_STUDENTS} resumes at a time. Filter by branch or batch.`);

  const works = await model('Work').find({ _id: { $in: picked.map((s) => oid(stats.get(String(s._id)).approvedWorkId)) }, userId: { $in: picked.map((s) => s.userId) } }).lean();
  const workById = new Map(works.map((w) => [String(w._id), w]));
  const zip = new JSZip();
  const used = new Set();
  for (const s of picked) {
    const work = workById.get(stats.get(String(s._id)).approvedWorkId);
    if (!work || work.userId !== s.userId) continue;
    let name = fileName(s, '');
    for (let n = 2; used.has(name); n++) name = `${fileName(s, '')}_${n}`;
    used.add(name);
    zip.file(`${name}.pdf`, await pdfFor(work));
  }
  await collegeAudit(req, 'download.zip', { details: { students: used.size, eligible: !!eligible } });
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${req.college.slug}-resumes.zip"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
}));

export default router;

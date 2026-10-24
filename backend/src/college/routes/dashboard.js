import express from 'express';
import { clean, escapeRegex, handle, httpError, isId, model, paging } from '../../admin/util.js';
import { collegeAudit, joinedStudents, oid, requireCollege, scoped, studentFor } from '../access.js';
import { CollegeStudent, CollegeTemplate, ResumeReview } from '../models.js';
import { COLLEGE_TEMPLATE_PREFIX, reviewState, studentStats } from '../stats.js';
import { seatsUsed } from './roster.js';

const router = express.Router();
const anyone = requireCollege();

export async function collegeTemplateIds(req) {
  const rows = await CollegeTemplate.find(scoped(req), { _id: 1 }).lean();
  return new Set(rows.map((t) => String(t._id)));
}

const publicRow = (s, stats) => ({
  id: String(s._id),
  email: s.email,
  name: s.name,
  rollNo: s.rollNo,
  branch: s.branch,
  batch: s.batch,
  status: s.status,
  invitedAt: s.invitedAt,
  joinedAt: s.joinedAt,
  inviteError: s.inviteError || '',
  ...(stats ? { stats } : {})
});

// The roster, with scores for students who joined. Score, review and eligibility filters run after
// the stats are worked out, so they apply to the whole roster before paging.
async function filteredRoster(req) {
  const q = req.query;
  const filter = scoped(req, { status: { $ne: 'removed' } });
  if (q.status && q.status !== 'all') filter.status = clean(q.status, 20);
  if (q.branch) filter.branch = clean(q.branch, 80);
  if (q.batch) filter.batch = clean(q.batch, 20);
  if (q.q) {
    const rx = new RegExp(escapeRegex(clean(q.q, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { rollNo: rx }];
  }
  const rows = await CollegeStudent.find(filter).sort({ rollNo: 1, name: 1, createdAt: 1 }).lean();
  const joined = rows.filter((s) => s.status === 'joined' && s.userId);
  const stats = await studentStats(req, joined, { collegeTemplateIds: await collegeTemplateIds(req) });

  const minAts = q.minAts !== undefined && q.minAts !== '' ? Number(q.minAts) : null;
  const maxAts = q.maxAts !== undefined && q.maxAts !== '' ? Number(q.maxAts) : null;
  return rows.filter((s) => {
    const st = stats.get(String(s._id));
    if (q.eligible === 'true' && !st?.eligible) return false;
    if (q.review && (!st || st.reviewStatus !== q.review)) return false;
    if (minAts !== null && !(st?.atsScore >= minAts)) return false;
    if (maxAts !== null && !(st && st.atsScore !== null && st.atsScore <= maxAts)) return false;
    return true;
  }).map((s) => publicRow(s, stats.get(String(s._id))));
}

router.get('/overview', anyone, handle(async (req, res) => {
  const all = await CollegeStudent.find(scoped(req, { status: { $ne: 'removed' } }), { status: 1, branch: 1, batch: 1, userId: 1 }).lean();
  const joined = all.filter((s) => s.status === 'joined' && s.userId);
  const stats = await studentStats(req, joined, { collegeTemplateIds: await collegeTemplateIds(req) });
  const count = (fn) => joined.filter((s) => fn(stats.get(String(s._id)))).length;
  const groups = (key) => {
    const map = new Map();
    for (const s of joined) {
      const name = s[key] || 'Not set';
      const st = stats.get(String(s._id));
      const g = map.get(name) || { name, students: 0, scored: 0, total: 0, eligible: 0 };
      g.students += 1;
      if (st.atsScore !== null) { g.scored += 1; g.total += st.atsScore; }
      if (st.eligible) g.eligible += 1;
      map.set(name, g);
    }
    return [...map.values()].map((g) => ({ name: g.name, students: g.students, eligible: g.eligible, avgAts: g.scored ? Math.round(g.total / g.scored) : null })).sort((a, b) => a.name.localeCompare(b.name));
  };
  const buckets = [0, 40, 60, 75, 90].map((from, i, arr) => ({ from, to: (arr[i + 1] ?? 101) - 1, students: 0 }));
  for (const s of joined) {
    const ats = stats.get(String(s._id)).atsScore;
    if (ats !== null) buckets.find((b) => ats >= b.from && ats <= b.to).students += 1;
  }
  res.json({
    success: true,
    data: {
      seats: req.college.contract?.seats || 0,
      seatsUsed: await seatsUsed(req),
      joined: joined.length,
      invited: all.filter((s) => s.status === 'invited').length,
      declined: all.filter((s) => s.status === 'declined' || s.status === 'left').length,
      approved: count((st) => st.reviewStatus === 'approved'),
      changesRequested: count((st) => st.reviewStatus === 'changes_requested'),
      notReviewed: count((st) => st.reviewStatus === 'not_reviewed' || st.reviewStatus === 'stale'),
      eligible: count((st) => st.eligible),
      noScore: count((st) => st.atsScore === null),
      scoreBuckets: buckets,
      byBranch: groups('branch'),
      byBatch: groups('batch')
    }
  });
}));

router.get('/students', anyone, handle(async (req, res) => {
  const rows = await filteredRoster(req);
  const { page, limit, skip } = paging(req.query, { defaultLimit: 50, maxLimit: 200 });
  const [branches, batches] = await Promise.all([
    CollegeStudent.distinct('branch', scoped(req, { status: { $ne: 'removed' } })),
    CollegeStudent.distinct('batch', scoped(req, { status: { $ne: 'removed' } }))
  ]);
  res.json({ success: true, data: rows.slice(skip, skip + limit), total: rows.length, page, limit, branches: branches.filter(Boolean).sort(), batches: batches.filter(Boolean).sort() });
}));

// Spreadsheet apps run cells that start with = + - @ as formulas, so those get a leading quote
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const REVIEW_LABELS = { approved: 'Approved', changes_requested: 'Needs changes', stale: 'Edited since review', not_reviewed: 'Not reviewed' };

router.get('/students/export.csv', anyone, handle(async (req, res) => {
  const rows = await filteredRoster(req);
  const header = ['Roll no', 'Name', 'Email', 'Branch', 'Batch', 'Status', 'ATS score', 'LinkedIn score', 'Resumes', 'Review', 'Eligible'];
  const lines = rows.map((r) => [r.rollNo, r.name, r.email, r.branch, r.batch, r.status, r.stats?.atsScore ?? '', r.stats?.linkedinScore ?? '', r.stats?.resumeCount ?? '', r.stats ? REVIEW_LABELS[r.stats.reviewStatus] : '', r.stats?.eligible ? 'Yes' : 'No'].map(csvCell).join(','));
  await collegeAudit(req, 'students.exported', { details: { rows: rows.length } });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.college.slug}-students.csv"`);
  res.send(`﻿${[header.join(','), ...lines].join('\r\n')}`);
}));

const parseJson = (s) => {
  try { return JSON.parse(s); } catch { return null; }
};

// One student's resumes, reports and score history. Only for a joined student of this college.
router.get('/students/:id', anyone, handle(async (req, res) => {
  const student = await studentFor(req, req.params.id);
  const Work = model('Work');
  const [works, scans, linkedin, reviews, templateIds] = await Promise.all([
    Work.find({ userId: student.userId, type: { $in: ['resume', 'resume-check', 'linkedin'] } }, { title: 1, type: 1, templateId: 1, createdAt: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(100).lean(),
    model('Scan').find({ userId: student.userId }, { score: 1, keywordsScore: 1, contentScore: 1, formattingScore: 1, fileName: 1, workId: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(50).lean(),
    model('LinkedinLog').find({ userId: student.userId }, { score: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(50).lean(),
    ResumeReview.find(scoped(req, { studentId: student._id })).lean(),
    collegeTemplateIds(req)
  ]);
  const [stats] = (await studentStats(req, [student.toObject()], { collegeTemplateIds: templateIds })).values();
  const reviewByWork = new Map(reviews.map((r) => [r.workId, r]));
  await collegeAudit(req, 'student.viewed', { targetId: student._id, targetLabel: student.email });
  res.json({
    success: true,
    student: publicRow(student, stats),
    works: works.map((w) => {
      const review = reviewByWork.get(String(w._id));
      return {
        id: String(w._id),
        title: w.title,
        type: w.type,
        templateId: w.templateId,
        collegeFormat: String(w.templateId).startsWith(COLLEGE_TEMPLATE_PREFIX) && templateIds.has(String(w.templateId).slice(COLLEGE_TEMPLATE_PREFIX.length)),
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        review: w.type === 'resume' ? publicReview(review, w) : null
      };
    }),
    scans: scans.map((s) => ({ score: s.score, keywordsScore: s.keywordsScore, contentScore: s.contentScore, formattingScore: s.formattingScore, fileName: s.fileName, workId: s.workId, createdAt: s.createdAt })),
    linkedin: linkedin.map((l) => ({ score: l.score, createdAt: l.createdAt }))
  });
}));

export function publicReview(review, work) {
  if (!review) return { state: 'not_reviewed', status: null, comments: [] };
  return {
    state: reviewState(review, work),
    status: review.status,
    reviewerName: review.reviewerName,
    reviewedAt: review.updatedAt,
    comments: (review.comments || []).map((c) => ({ byName: c.byName, fromStudent: !!c.fromStudent, text: c.text, at: c.at }))
  };
}

// The student's work, only if it belongs to a joined student of this college
export async function workFor(req, studentId, workId) {
  const student = await studentFor(req, studentId);
  if (!isId(workId)) throw httpError(404, 'Resume not found.');
  const work = await model('Work').findOne({ _id: oid(workId), userId: student.userId }).lean();
  if (!work) throw httpError(404, 'Resume not found.');
  return { student, work };
}

// A resume's HTML, or an ATS / LinkedIn report's saved result
router.get('/students/:id/works/:workId', anyone, handle(async (req, res) => {
  const { student, work } = await workFor(req, req.params.id, req.params.workId);
  const review = work.type === 'resume' ? await ResumeReview.findOne(scoped(req, { workId: String(work._id) })).lean() : null;
  await collegeAudit(req, 'work.viewed', { targetId: work._id, targetLabel: `${student.email} · ${work.title}` });
  const payload = work.type === 'resume' ? null : parseJson(work.htmlContent);
  res.json({
    success: true,
    work: {
      id: String(work._id),
      title: work.title,
      type: work.type,
      templateId: work.templateId,
      updatedAt: work.updatedAt,
      ...(work.type === 'resume' ? { html: work.htmlContent, review: publicReview(review, work) } : { evaluation: payload?.evaluation || null, targetRole: payload?.targetRole || '', fileName: payload?.fileName || '' })
    }
  });
}));

export default router;

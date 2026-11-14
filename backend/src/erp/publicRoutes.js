import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { dbReady } from '../admin/auth.js';
import { emailConfigured, escapeHtml, renderEmail, sendEmail } from '../admin/mailer.js';
import { clean, handle, httpError, isId } from '../admin/util.js';
import { TeamFile } from '../admin/team/models.js';
import { notify } from '../admin/team/notify.js';
import { headObject, presignUpload, removeObject } from '../admin/team/storage.js';
import { newFileKey } from '../admin/team/files.js';
import { ErpCandidate, ErpLetter, ErpOpening } from './models.js';
import { LETTER_LABELS } from './letters.js';
import { addEvent, CANDIDATE_UPLOADER, publicOpening, readApplication } from './hiring.js';
import { hrManagerIds } from './jobs.js';

// Public ERP routes, no sign-in: letter verify codes (cvmind.in/verify/<code>), the careers page and
// applications (cvmind.in/careers), and offer answers (cvmind.in/offer/<token>).
// A verify check shows only what's printed on the letter's face: number, name, type, date and validity.
const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many checks. Try again in a minute.' } });

router.get('/api/verify/:code', limiter, handle(async (req, res) => {
  if (!(await dbReady())) throw httpError(503, 'Verification is unavailable right now. Try again in a minute.');
  const code = clean(req.params.code, 20).toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(code)) throw httpError(404, 'No letter has this code.');
  const letter = await ErpLetter.findOne({ code }).lean();
  if (!letter) throw httpError(404, 'No letter has this code.');
  res.json({
    success: true,
    data: {
      number: letter.number,
      recipientName: letter.recipientName,
      type: LETTER_LABELS[letter.type],
      title: letter.title,
      issuedOn: letter.issuedOn,
      issuer: 'CVMind',
      status: letter.status,
      revokedOn: letter.revokedAt ? letter.revokedAt.toISOString().slice(0, 10) : null
    }
  });
}));

// ── Careers (cvmind.in/careers) ─────────────────────────────────────────────
const applyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many applications from this network. Try again in an hour.' } });
const RESUME_TYPES = { 'application/pdf': 'pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' };
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

router.get('/api/careers', handle(async (req, res) => {
  if (!(await dbReady())) return res.json({ success: true, data: [] });
  const rows = await ErpOpening.find({ status: 'open' }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ success: true, data: rows.map((o) => publicOpening(o)) });
}));

router.get('/api/careers/:slug', handle(async (req, res) => {
  const row = await ErpOpening.findOne({ slug: clean(req.params.slug, 80), status: 'open' }).lean();
  if (!row) throw httpError(404, 'This opening is closed or does not exist.');
  res.json({ success: true, data: publicOpening(row) });
}));

// The candidate's browser uploads the resume straight to storage, then confirms
router.post('/api/careers/resume-upload', applyLimiter, handle(async (req, res) => {
  const name = clean(req.body?.name, 180).replace(/[\\/]/g, '_');
  const mime = clean(req.body?.mime, 120).toLowerCase();
  const size = Number(req.body?.size);
  if (!RESUME_TYPES[mime] || name.split('.').pop().toLowerCase() !== RESUME_TYPES[mime]) throw httpError(400, 'Upload your resume as a PDF or DOCX file.');
  if (!Number.isFinite(size) || size <= 0 || size > MAX_RESUME_BYTES) throw httpError(400, 'Your resume must be under 5 MB.');
  const key = newFileKey(name);
  const uploadUrl = await presignUpload(key, mime);
  const file = await TeamFile.create({ key, name, mime, size, uploadedBy: CANDIDATE_UPLOADER, scope: 'hr' });
  res.json({ success: true, fileId: String(file._id), uploadUrl, headers: { 'Content-Type': mime } });
}));

router.post('/api/careers/:slug/apply', applyLimiter, handle(async (req, res) => {
  const opening = await ErpOpening.findOne({ slug: clean(req.params.slug, 80), status: 'open' }).lean();
  if (!opening) throw httpError(404, 'This opening is closed.');
  const fields = readApplication(req.body, opening);
  if (await ErpCandidate.exists({ openingId: opening._id, email: fields.email })) throw httpError(409, 'You have already applied for this role. We will be in touch.');
  const fileId = req.body?.resumeFileId;
  const file = isId(fileId) ? await TeamFile.findOne({ _id: fileId, uploadedBy: CANDIDATE_UPLOADER, status: 'pending', 'attachedTo.type': null }) : null;
  if (!file) throw httpError(400, 'Upload your resume first.');
  const stored = await headObject(file.key);
  if (!stored || stored.size !== file.size || String(stored.mime || '').split(';')[0].toLowerCase() !== file.mime) {
    await removeObject(file.key).catch(() => {});
    await file.deleteOne();
    throw httpError(400, 'Your resume did not finish uploading. Try again.');
  }
  const candidate = new ErpCandidate({ ...fields, openingId: opening._id, resumeFileId: file._id, ip: req.ip || '' });
  addEvent(candidate, 'Applied on cvmind.in/careers', candidate.name);
  await candidate.save();
  file.status = 'ready';
  file.attachedTo = { type: 'candidate_resume', id: candidate._id };
  await file.save();
  await notify([...new Set([...(await hrManagerIds()), ...(opening.ownerId ? [String(opening.ownerId)] : [])])], { type: 'candidate_applied', refType: 'candidate', refId: candidate._id, preview: `${candidate.name} · ${opening.title}` });
  if (emailConfigured()) {
    sendEmail({
      to: candidate.email,
      subject: `We got your application: ${opening.title}`,
      html: renderEmail({ preheader: 'Thanks for applying to CVMind', title: 'Application received', greetingName: candidate.name.split(/\s+/)[0], body: `Thanks for applying for <strong>${escapeHtml(opening.title)}</strong> at CVMind. Our team reads every application and will email you about the next step.` })
    }).catch((err) => console.error('[erp] application email failed:', err.message));
  }
  res.json({ success: true });
}));

// ── Offers (cvmind.in/offer/<token>) ────────────────────────────────────────
async function offerFor(token) {
  const t = clean(token, 64);
  if (t.length < 20) throw httpError(404, 'This offer link is not valid.');
  const c = await ErpCandidate.findOne({ offerToken: t });
  if (!c || !c.offerLetterId) throw httpError(404, 'This offer link is not valid.');
  return c;
}

router.get('/api/offers/:token', limiter, handle(async (req, res) => {
  const c = await offerFor(req.params.token);
  const letter = await ErpLetter.findById(c.offerLetterId).lean();
  if (!letter || letter.status === 'revoked') throw httpError(410, 'This offer has been withdrawn.');
  res.json({ success: true, data: { name: c.name, title: letter.title, body: letter.body, number: letter.number, issuedOn: letter.issuedOn, status: c.offerStatus, verifyCode: letter.code } });
}));

router.post('/api/offers/:token', limiter, handle(async (req, res) => {
  const c = await offerFor(req.params.token);
  const letter = await ErpLetter.findById(c.offerLetterId, { status: 1 }).lean();
  if (!letter || letter.status === 'revoked') throw httpError(410, 'This offer has been withdrawn.');
  if (c.offerStatus !== 'sent') throw httpError(400, `You have already ${c.offerStatus} this offer.`);
  const accept = req.body?.accept === true;
  c.offerStatus = accept ? 'accepted' : 'declined';
  c.offerAnsweredAt = new Date();
  if (!accept) c.stage = 'rejected';
  addEvent(c, accept ? 'Accepted the offer' : `Declined the offer${req.body?.reason ? `: ${clean(req.body.reason, 300)}` : ''}`, c.name);
  await c.save();
  await notify(await hrManagerIds(), { type: accept ? 'offer_accepted' : 'offer_declined', refType: 'candidate', refId: c._id, preview: c.name });
  res.json({ success: true, status: c.offerStatus });
}));

export default router;

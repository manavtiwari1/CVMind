import express from 'express';
import { AdminUser } from '../../admin/models.js';
import { audit } from '../../admin/audit.js';
import { requireAdmin } from '../../admin/auth.js';
import { emailConfigured, renderEmail, sendEmail } from '../../admin/mailer.js';
import { ROLES } from '../../admin/permissions.js';
import { clean, handle, httpError, isId } from '../../admin/util.js';
import { TeamFile } from '../../team/models.js';
import { notify } from '../../team/notify.js';
import { presignDownload } from '../../team/storage.js';
import { sendTeamInvite } from '../../team/routes/manage.js';
import { CANDIDATE_STAGES, ErpCandidate, ErpLetter, ErpOpening, ErpPayHistory, ErpProfile, PAY_TYPES } from '../models.js';
import { addEvent, newOfferToken, offerUrl, offerValues, publicCandidates, publicOpening, readOpening, rejectionEmail, STAGE_LABELS, uniqueSlug } from '../hiring.js';
import { fill, renderLetterPdf, templateFor } from '../letters.js';
import { getSettings } from '../settings.js';
import { issueLetter } from './letters.js';

// Admin panel → ERP → Hiring
const router = express.Router();
const view = requireAdmin('hr.view');
const manage = requireAdmin('hr.manage');
const byName = (req) => req.admin.name || req.admin.username;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function candidateOr404(id) {
  if (!isId(id)) throw httpError(404, 'Candidate not found.');
  const c = await ErpCandidate.findById(id);
  if (!c) throw httpError(404, 'Candidate not found.');
  return c;
}
const one = async (c) => (await publicCandidates([c.toObject ? c.toObject() : c]))[0];

// ── Openings ─────────────────────────────────────────────────────────────────
router.get('/hiring/openings', view, handle(async (req, res) => {
  const rows = await ErpOpening.find({}).sort({ status: -1, createdAt: -1 }).limit(200).lean();
  const counts = await ErpCandidate.aggregate([{ $group: { _id: { o: '$openingId', s: '$stage' }, n: { $sum: 1 } } }]);
  const byOpening = (id) => Object.fromEntries(counts.filter((c) => String(c._id.o) === String(id)).map((c) => [c._id.s, c.n]));
  res.json({ success: true, data: rows.map((o) => publicOpening(o, { internal: true, counts: byOpening(o._id) })) });
}));

router.post('/hiring/openings', manage, handle(async (req, res) => {
  const fields = readOpening(req.body);
  const ownerId = isId(req.body?.ownerId) ? req.body.ownerId : null;
  const row = await ErpOpening.create({ ...fields, ownerId, slug: await uniqueSlug(fields.title), createdByName: byName(req) });
  await audit(req, 'hr.opening_created', { targetType: 'opening', targetId: row._id, targetLabel: row.title });
  res.json({ success: true, data: publicOpening(row.toObject(), { internal: true }) });
}));

router.patch('/hiring/openings/:id', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Opening not found.');
  const row = await ErpOpening.findById(req.params.id);
  if (!row) throw httpError(404, 'Opening not found.');
  if (req.body?.status === 'closed' || req.body?.status === 'open') {
    row.status = req.body.status;
    row.closedAt = req.body.status === 'closed' ? new Date() : null;
  }
  if (req.body?.title !== undefined) Object.assign(row, readOpening({ ...row.toObject(), ...req.body }));
  if (req.body?.ownerId !== undefined) row.ownerId = isId(req.body.ownerId) ? req.body.ownerId : null;
  await row.save();
  await audit(req, 'hr.opening_updated', { targetType: 'opening', targetId: row._id, targetLabel: row.title, details: { status: row.status } });
  res.json({ success: true, data: publicOpening(row.toObject(), { internal: true }) });
}));

// ── Candidates ───────────────────────────────────────────────────────────────
router.get('/hiring/candidates', view, handle(async (req, res) => {
  const filter = {};
  if (isId(req.query.openingId)) filter.openingId = req.query.openingId;
  if (CANDIDATE_STAGES.includes(req.query.stage)) filter.stage = req.query.stage;
  const q = clean(req.query.q, 80);
  if (q) filter.$or = [{ name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { email: q.toLowerCase() }];
  const rows = await ErpCandidate.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ success: true, data: await publicCandidates(rows), stages: CANDIDATE_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] })) });
}));

router.get('/hiring/candidates/:id', view, handle(async (req, res) => {
  const c = await candidateOr404(req.params.id);
  const others = await ErpCandidate.find({ email: c.email, _id: { $ne: c._id } }).lean();
  res.json({ success: true, data: await one(c), otherApplications: await publicCandidates(others) });
}));

router.get('/hiring/candidates/:id/resume', view, handle(async (req, res) => {
  const c = await candidateOr404(req.params.id);
  const file = c.resumeFileId ? await TeamFile.findById(c.resumeFileId).lean() : null;
  if (!file || file.status !== 'ready') throw httpError(404, 'No resume.');
  res.json({ success: true, url: await presignDownload(file, req.query.download === '1') });
}));

// Moves a candidate to another stage (offer, joined and rejected have their own actions)
router.post('/hiring/candidates/:id/stage', manage, handle(async (req, res) => {
  const c = await candidateOr404(req.params.id);
  const stage = req.body?.stage;
  if (!['applied', 'screening', 'task', 'interview'].includes(stage)) throw httpError(400, 'Use Offer, Reject or Add to team for those steps.');
  if (['joined', 'rejected'].includes(c.stage)) throw httpError(400, `${c.name} is already ${STAGE_LABELS[c.stage].toLowerCase()}.`);
  if (stage === 'task') c.taskLink = clean(req.body?.taskLink, 300) || c.taskLink;
  if (stage === 'interview') {
    const at = req.body?.interviewAt ? new Date(req.body.interviewAt) : null;
    if (at && isNaN(at)) throw httpError(400, 'Pick a valid interview time.');
    c.interviewAt = at;
    c.interviewLink = clean(req.body?.interviewLink, 300);
    const ids = (Array.isArray(req.body?.interviewerIds) ? req.body.interviewerIds : []).filter(isId).slice(0, 5);
    c.interviewerIds = (await AdminUser.find({ _id: { $in: ids }, active: true }, { _id: 1 }).lean()).map((a) => a._id);
  }
  c.stage = stage;
  addEvent(c, `Moved to ${STAGE_LABELS[stage]}${stage === 'interview' && c.interviewAt ? ` on ${c.interviewAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST` : ''}`, byName(req));
  await c.save();
  if (stage === 'interview' && c.interviewerIds.length) {
    await notify(c.interviewerIds.map(String), { type: 'interview_scheduled', refType: 'candidate', refId: c._id, preview: `${c.name}${c.interviewAt ? ` · ${c.interviewAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST` : ''}` });
  }
  res.json({ success: true, data: await one(c) });
}));

router.post('/hiring/candidates/:id/notes', view, handle(async (req, res) => {
  const c = await candidateOr404(req.params.id);
  const text = clean(req.body?.text, 2000);
  const rating = Math.round(Number(req.body?.rating) || 0);
  if (!text && !rating) throw httpError(400, 'Write a note or give a rating.');
  if (rating && (rating < 1 || rating > 5)) throw httpError(400, 'Ratings are 1 to 5.');
  c.notes.push({ byName: byName(req), text, rating, at: new Date() });
  const rated = c.notes.filter((n) => n.rating);
  c.rating = rated.length ? Math.round((rated.reduce((s, n) => s + n.rating, 0) / rated.length) * 10) / 10 : 0;
  await c.save();
  res.json({ success: true, data: await one(c) });
}));

router.post('/hiring/candidates/:id/reject', manage, handle(async (req, res) => {
  const c = await candidateOr404(req.params.id);
  if (['joined', 'rejected'].includes(c.stage)) throw httpError(400, `${c.name} is already ${STAGE_LABELS[c.stage].toLowerCase()}.`);
  c.stage = 'rejected';
  c.rejectedReason = clean(req.body?.reason, 300);
  addEvent(c, `Rejected${c.rejectedReason ? `: ${c.rejectedReason}` : ''}`, byName(req));
  if (req.body?.sendEmail !== false && emailConfigured()) {
    const opening = await ErpOpening.findById(c.openingId, { title: 1 }).lean();
    try {
      await sendEmail({ to: c.email, subject: `Your application to CVMind`, html: renderEmail(rejectionEmail(c, opening?.title || 'the role')) });
      addEvent(c, 'Rejection email sent');
    } catch (err) {
      console.error('[erp] rejection email failed:', err.message);
    }
  }
  await c.save();
  await audit(req, 'hr.candidate_rejected', { targetType: 'candidate', targetId: c._id, targetLabel: c.name });
  res.json({ success: true, data: await one(c) });
}));

// ── Offer ────────────────────────────────────────────────────────────────────
function readTerms(body = {}) {
  if (!DAY.test(clean(body.joiningDate, 10))) throw httpError(400, 'Pick the joining date.');
  if (body.endDate && !DAY.test(clean(body.endDate, 10))) throw httpError(400, 'Pick a valid end date.');
  if (body.endDate && body.endDate < body.joiningDate) throw httpError(400, 'The end date is before the joining date.');
  if (!PAY_TYPES.includes(body.payType)) throw httpError(400, 'Pick stipend, salary or unpaid.');
  const amount = body.payType === 'unpaid' ? 0 : Math.round(Number(body.amount));
  if (body.payType !== 'unpaid' && !(amount > 0)) throw httpError(400, 'Enter the monthly amount.');
  const role = clean(body.role, 30);
  if (role && !ROLES[role]?.teamOnly && !ROLES[role]) throw httpError(400, 'Pick their role on the team.');
  return { joiningDate: body.joiningDate, endDate: clean(body.endDate, 10), payType: body.payType, amount, designation: clean(body.designation, 80), details: clean(body.details, 3000), role: role || 'content_intern' };
}

router.post('/hiring/candidates/:id/offer/preview', manage, handle(async (req, res) => {
  const c = await candidateOr404(req.params.id);
  const opening = await ErpOpening.findById(c.openingId).lean();
  const terms = readTerms({ designation: opening?.title, ...req.body });
  const template = await templateFor('offer');
  const values = offerValues(c, opening || { title: 'Team member' }, terms, await getSettings());
  res.json({ success: true, data: { title: fill(template.title, values), body: fill(template.body, values) } });
}));

// Issues the offer letter and emails it with an accept link (cvmind.in/offer/<token>)
router.post('/hiring/candidates/:id/offer', manage, handle(async (req, res) => {
  const c = await candidateOr404(req.params.id);
  if (['joined', 'rejected'].includes(c.stage)) throw httpError(400, `${c.name} is already ${STAGE_LABELS[c.stage].toLowerCase()}.`);
  if (c.offerStatus === 'sent' || c.offerStatus === 'accepted') throw httpError(400, 'An offer has already gone out. Revoke it from Letters to send a new one.');
  const opening = await ErpOpening.findById(c.openingId).lean();
  const terms = readTerms({ designation: opening?.title, ...req.body });
  const title = clean(req.body?.title, 120);
  const body = clean(req.body?.body, 12000);
  if (!title || !body) throw httpError(400, 'The letter needs a title and text.');
  if (/\{\w+\}/.test(body)) throw httpError(400, 'Some {placeholders} are still in the text. Replace them before sending.');
  const letter = await issueLetter(req, { type: 'offer', candidateId: c._id, recipientName: c.name, recipientEmail: '', title, body });
  c.offerLetterId = letter._id;
  c.offerToken = newOfferToken();
  c.offerStatus = 'sent';
  c.offerTerms = terms;
  c.stage = 'offer';
  addEvent(c, `Offer ${letter.number} sent`, byName(req));
  if (emailConfigured()) {
    try {
      const pdf = await renderLetterPdf(letter.toObject(), await getSettings());
      await sendEmail({
        to: c.email,
        subject: `Your offer from CVMind: ${opening?.title || title}`,
        html: renderEmail({
          preheader: 'Your offer letter is attached',
          title: 'You have an offer from CVMind',
          greetingName: c.name.split(/\s+/)[0],
          body: 'Your offer letter is attached. Read it, then accept or decline with the button below.',
          ctaLabel: 'Accept or decline',
          ctaUrl: offerUrl(c.offerToken)
        }),
        attachments: [{ filename: `${letter.number.replace(/\//g, '-')}.pdf`, content: pdf.toString('base64') }]
      });
      letter.emailedAt = new Date();
      await letter.save();
    } catch (err) {
      console.error('[erp] offer email failed:', err.message);
      addEvent(c, 'The offer email could not be sent. Share the accept link by hand.');
    }
  }
  await c.save();
  res.json({ success: true, data: await one(c), offerUrl: offerUrl(c.offerToken) });
}));

// After they accept: the Team account, their HR file and their first pay entry
router.post('/hiring/candidates/:id/add-to-team', manage, handle(async (req, res) => {
  const c = await candidateOr404(req.params.id);
  if (c.offerStatus !== 'accepted') throw httpError(400, 'They haven\'t accepted the offer yet.');
  if (c.adminId) throw httpError(400, `${c.name} is already on the team.`);
  const terms = c.offerTerms || {};
  const opening = await ErpOpening.findById(c.openingId).lean();
  const { member } = await sendTeamInvite(req, { name: c.name, username: clean(req.body?.username, 30), email: c.email, role: clean(req.body?.role, 30) || terms.role });
  await ErpProfile.findOneAndUpdate({ adminId: member._id }, {
    $set: {
      employmentType: opening?.employmentType || 'intern',
      designation: terms.designation || opening?.title || '',
      managerId: opening?.ownerId || null,
      joiningDate: terms.joiningDate || '',
      endDate: terms.endDate || '',
      legalName: c.name,
      payType: terms.payType || 'unpaid',
      payAmount: terms.amount || 0
    }
  }, { upsert: true });
  if (terms.joiningDate) await ErpPayHistory.create({ adminId: member._id, payType: terms.payType || 'unpaid', amount: terms.amount || 0, effectiveFrom: terms.joiningDate, note: 'From the offer', createdByName: byName(req) });
  if (opening?.department) await AdminUser.updateOne({ _id: member._id }, { $set: { department: opening.department } });
  await ErpLetter.updateMany({ candidateId: c._id }, { $set: { adminId: member._id } });
  c.adminId = member._id;
  c.stage = 'joined';
  addEvent(c, `Added to CVMind Team as @${member.username}`, byName(req));
  await c.save();
  res.json({ success: true, data: await one(c), adminId: String(member._id) });
}));

export default router;

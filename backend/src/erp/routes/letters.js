import express from 'express';
import { AdminUser } from '../../admin/models.js';
import { audit } from '../../admin/audit.js';
import { requireAdmin } from '../../admin/auth.js';
import { emailConfigured, renderEmail, sendEmail } from '../../admin/mailer.js';
import { clean, handle, httpError, isId } from '../../admin/util.js';
import { TeamPastMember } from '../../admin/team/models.js';
import { istDay, notify } from '../../admin/team/notify.js';
import { ErpLetter, ErpLetterRequest, ErpLetterTemplate, LETTER_TYPES } from '../models.js';
import { DEFAULT_TEMPLATES, fill, LETTER_LABELS, newVerifyCode, nextLetterNumber, PLACEHOLDERS, publicLetter, renderLetterPdf, templateFor, valuesFor } from '../letters.js';
import { isLeadership } from '../payroll.js';
import { getSettings } from '../settings.js';

// Admin panel → ERP → Letters
const router = express.Router();
const view = requireAdmin('hr.view');
const manage = requireAdmin('hr.manage');
const actorId = (req) => (req.admin.id === 'env-owner' ? null : req.admin.id);

// Creates a letter, emails it with the PDF attached, and tells the member in CVMind Team.
// Used here and by Hiring (offer letters to candidates).
export async function issueLetter(req, { type, adminId = null, candidateId = null, recipientName, recipientEmail = '', title, body }) {
  const settings = await getSettings();
  const letter = await ErpLetter.create({
    number: await nextLetterNumber(),
    code: newVerifyCode(),
    type,
    adminId,
    candidateId,
    recipientName,
    recipientEmail,
    title: clean(title, 120),
    body: clean(body, 12000),
    issuedOn: istDay(),
    issuedBy: actorId(req),
    issuedByName: req.admin.name || req.admin.username,
    signatoryName: settings.signatoryName,
    signatoryTitle: settings.signatoryTitle
  });
  if (recipientEmail && emailConfigured()) {
    try {
      const pdf = await renderLetterPdf(letter.toObject(), settings);
      await sendEmail({
        to: recipientEmail,
        subject: `${letter.title} from CVMind`,
        html: renderEmail({
          preheader: `${letter.title} · ${letter.number}`,
          title: letter.title,
          greetingName: recipientName.split(/\s+/)[0],
          body: `CVMind has issued your ${LETTER_LABELS[type].toLowerCase()}. The PDF is attached. Anyone can check that it's genuine with its verify link.`,
          ctaLabel: 'Verify this letter',
          ctaUrl: `${(process.env.PUBLIC_SITE_URL || 'https://www.cvmind.in').replace(/\/$/, '')}/verify/${letter.code}`
        }),
        attachments: [{ filename: `${letter.number.replace(/\//g, '-')}.pdf`, content: pdf.toString('base64') }]
      });
      letter.emailedAt = new Date();
      await letter.save();
    } catch (err) {
      console.error('[erp] letter email failed:', err.message);
    }
  }
  if (adminId) {
    await notify([String(adminId)], { type: 'letter_issued', actorId: actorId(req), refType: 'letter', refId: letter._id, preview: letter.title });
    // Past members keep a tick for the documents they were given
    if (type === 'completion' || type === 'experience') await TeamPastMember.updateMany({ adminId }, { $set: { certificateIssued: true } });
    if (type === 'recommendation') await TeamPastMember.updateMany({ adminId }, { $set: { lorIssued: true } });
  }
  await audit(req, 'hr.letter_issued', { targetType: 'letter', targetId: letter._id, targetLabel: `${letter.number} · ${recipientName}`, details: { type } });
  return letter;
}

router.get('/letters', view, handle(async (req, res) => {
  const filter = {};
  if (LETTER_TYPES.includes(req.query.type)) filter.type = req.query.type;
  if (isId(req.query.adminId)) filter.adminId = req.query.adminId;
  const rows = await ErpLetter.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  const pending = await ErpLetterRequest.countDocuments({ status: 'pending' });
  res.json({ success: true, data: rows.map(publicLetter), types: LETTER_TYPES.map((t) => ({ value: t, label: LETTER_LABELS[t] })), pendingRequests: pending });
}));

// Fills the template for one person so HR can read and edit it before issuing
router.post('/letters/preview', manage, handle(async (req, res) => {
  if (!isId(req.body?.adminId)) throw httpError(400, 'Pick who the letter is for.');
  const template = await templateFor(req.body.type);
  const values = await valuesFor(req.body.adminId, { details: clean(req.body?.details, 3000) });
  res.json({ success: true, data: { title: fill(template.title, values), body: fill(template.body, values), recipientName: values.name, recipientEmail: values.email } });
}));

router.post('/letters', manage, handle(async (req, res) => {
  if (!LETTER_TYPES.includes(req.body?.type)) throw httpError(400, 'Pick a letter type.');
  if (!isId(req.body?.adminId)) throw httpError(400, 'Pick who the letter is for.');
  const person = await AdminUser.findById(req.body.adminId).lean();
  if (!person) throw httpError(404, 'Person not found.');
  const title = clean(req.body?.title, 120);
  const body = clean(req.body?.body, 12000);
  if (!title || !body) throw httpError(400, 'The letter needs a title and text.');
  if (/\{\w+\}/.test(body)) throw httpError(400, 'Some {placeholders} are still in the text. Replace them before issuing.');
  const values = await valuesFor(person._id);
  const letter = await issueLetter(req, { type: req.body.type, adminId: person._id, recipientName: values.name, recipientEmail: req.body?.sendEmail === false ? '' : person.email || '', title, body });
  if (isId(req.body?.requestId)) {
    await ErpLetterRequest.updateOne({ _id: req.body.requestId, adminId: person._id, status: 'pending' }, { $set: { status: 'issued', letterId: letter._id, decidedByName: req.admin.name || req.admin.username, decidedAt: new Date() } });
  }
  res.json({ success: true, data: publicLetter(letter.toObject()) });
}));

router.get('/letters/:id/pdf', view, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Letter not found.');
  const letter = await ErpLetter.findById(req.params.id).lean();
  if (!letter) throw httpError(404, 'Letter not found.');
  const pdf = await renderLetterPdf(letter, await getSettings());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${letter.number.replace(/\//g, '-')}.pdf"`);
  res.send(pdf);
}));

router.post('/letters/:id/revoke', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Letter not found.');
  const reason = clean(req.body?.reason, 300);
  if (!reason) throw httpError(400, 'Say why the letter is being revoked.');
  const letter = await ErpLetter.findById(req.params.id);
  if (!letter) throw httpError(404, 'Letter not found.');
  if (letter.status === 'revoked') throw httpError(400, 'This letter is already revoked.');
  letter.status = 'revoked';
  letter.revokedAt = new Date();
  letter.revokedReason = reason;
  await letter.save();
  await audit(req, 'hr.letter_revoked', { targetType: 'letter', targetId: letter._id, targetLabel: letter.number, details: { reason } });
  res.json({ success: true, data: publicLetter(letter.toObject()) });
}));

// ── Templates (leadership edits; HR reads) ───────────────────────────────────
router.get('/letter-templates', view, handle(async (req, res) => {
  const saved = new Map((await ErpLetterTemplate.find({}).lean()).map((t) => [t.type, t]));
  res.json({
    success: true,
    placeholders: PLACEHOLDERS,
    canEdit: isLeadership(req.admin),
    data: LETTER_TYPES.map((type) => {
      const t = saved.get(type);
      return { type, label: LETTER_LABELS[type], title: t?.title || DEFAULT_TEMPLATES[type].title, body: t?.body || DEFAULT_TEMPLATES[type].body, custom: !!t, updatedByName: t?.updatedByName || '' };
    })
  });
}));

router.put('/letter-templates/:type', manage, handle(async (req, res) => {
  if (!isLeadership(req.admin)) throw httpError(403, 'Only the CEO, CTO, CMO or owner can change letter templates.');
  if (!LETTER_TYPES.includes(req.params.type)) throw httpError(404, 'Template not found.');
  if (req.body?.reset === true) {
    await ErpLetterTemplate.deleteOne({ type: req.params.type });
  } else {
    const title = clean(req.body?.title, 120);
    const body = clean(req.body?.body, 12000);
    if (!title || !body) throw httpError(400, 'The template needs a title and text.');
    await ErpLetterTemplate.findOneAndUpdate({ type: req.params.type }, { title, body, updatedByName: req.admin.name || req.admin.username }, { upsert: true });
  }
  await audit(req, 'hr.letter_template_updated', { targetType: 'letter_template', targetLabel: req.params.type, details: { reset: req.body?.reset === true } });
  res.json({ success: true });
}));

// ── Requests from members ────────────────────────────────────────────────────
router.get('/letter-requests', view, handle(async (req, res) => {
  const rows = await ErpLetterRequest.find(req.query.status === 'all' ? {} : { status: 'pending' }).sort({ createdAt: -1 }).limit(200).lean();
  const people = new Map((await AdminUser.find({ _id: { $in: rows.map((r) => r.adminId) } }, { name: 1, username: 1 }).lean()).map((a) => [String(a._id), a.name || a.username]));
  res.json({ success: true, data: rows.map((r) => ({ id: String(r._id), adminId: String(r.adminId), name: people.get(String(r.adminId)) || 'Former member', type: r.type, typeLabel: LETTER_LABELS[r.type], note: r.note, status: r.status, reply: r.reply, createdAt: r.createdAt })) });
}));

router.post('/letter-requests/:id/decline', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Request not found.');
  const row = await ErpLetterRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'declined', reply: clean(req.body?.reply, 300), decidedByName: req.admin.name || req.admin.username, decidedAt: new Date() } },
    { returnDocument: 'after' }
  ).lean();
  if (!row) throw httpError(404, 'Request not found.');
  await notify([String(row.adminId)], { type: 'letter_declined', actorId: actorId(req), refType: 'letter', preview: `${LETTER_LABELS[row.type]}${row.reply ? `: ${row.reply}` : ''}` });
  res.json({ success: true });
}));

export default router;

import express from 'express';
import { audit } from '../../admin/audit.js';
import { clean, handle, httpError, isId } from '../../admin/util.js';
import { requireTeam, sameId } from '../../admin/team/access.js';
import { softDeleteFiles } from '../../admin/team/files.js';
import { TeamFile } from '../../admin/team/models.js';
import { ErpLetter, ErpLetterRequest, ErpPayHistory, ErpPayLine, ErpProfile, LETTER_TYPES } from '../models.js';
import { LETTER_LABELS, publicLetter, renderLetterPdf } from '../letters.js';
import { hrManagerIds } from '../jobs.js';
import { notify } from '../../admin/team/notify.js';
import { publicLine } from '../payroll.js';
import { renderPayslipPdf } from '../pdf.js';
import { getSettings } from '../settings.js';
import { isDocumentKind, loadProfile, publicProfile, readProfileFields, SELF_EDITABLE } from '../people.js';

// CVMind Team → Profile → My HR file (mounted under /api/admin/team). A member reads their own file and fills in their
// personal and bank details and documents. Job, dates and pay are set by HR.
const router = express.Router();
const team = requireTeam();

async function ownFile(adminId) {
  const profile = await loadProfile(adminId);
  const history = await ErpPayHistory.find({ adminId }).sort({ effectiveFrom: -1, createdAt: -1 }).lean();
  const data = await publicProfile(profile, { history });
  delete data.notes;
  return data;
}

router.get('/me/hr', team, handle(async (req, res) => {
  res.json({ success: true, data: await ownFile(req.admin.id) });
}));

router.patch('/me/hr', team, handle(async (req, res) => {
  const fields = await readProfileFields(req.body, { allowed: SELF_EDITABLE, adminId: req.admin.id });
  await ErpProfile.updateOne({ adminId: req.admin.id }, { $set: { ...fields, updatedBy: req.admin.id } }, { upsert: true });
  const changed = Object.keys(fields).map((k) => k.replace(/Enc$/, '')).filter((k) => !/Last4$/.test(k));
  await audit(req, 'hr.self_updated', { targetType: 'admin', targetId: req.admin.id, targetLabel: req.admin.username, details: { fields: changed } });
  res.json({ success: true, data: await ownFile(req.admin.id) });
}));

// Adds an uploaded file (scope "hr", uploaded by this member) to their file
router.post('/me/hr/documents', team, handle(async (req, res) => {
  const fileId = clean(req.body?.fileId, 24);
  const kind = req.body?.kind;
  if (!isDocumentKind(kind)) throw httpError(400, 'Pick what the document is.');
  if (!isId(fileId)) throw httpError(400, 'Upload the file first.');
  const file = await TeamFile.findOneAndUpdate(
    { _id: fileId, uploadedBy: req.admin.id, scope: 'hr', status: 'ready', 'attachedTo.type': null },
    { attachedTo: { type: 'hr_document', id: req.admin.id }, scopeId: req.admin.id },
    { returnDocument: 'after' }
  ).lean();
  if (!file) throw httpError(400, 'The file is not ready or is already used. Upload it again.');
  const profile = await ErpProfile.findOneAndUpdate({ adminId: req.admin.id }, { $setOnInsert: { adminId: req.admin.id } }, { upsert: true, returnDocument: 'after' });
  if (profile.documents.length >= 20) {
    await softDeleteFiles([file._id]);
    throw httpError(400, 'You can keep up to 20 documents. Remove one first.');
  }
  profile.documents.push({ fileId: file._id, kind });
  await profile.save();
  await audit(req, 'hr.document_added', { targetType: 'admin', targetId: req.admin.id, targetLabel: req.admin.username, details: { kind } });
  res.json({ success: true, data: await ownFile(req.admin.id) });
}));

// A member can remove a document until HR has verified it
router.delete('/me/hr/documents/:docId', team, handle(async (req, res) => {
  if (!isId(req.params.docId)) throw httpError(404, 'Document not found.');
  const profile = await ErpProfile.findOne({ adminId: req.admin.id });
  const doc = profile?.documents.id(req.params.docId);
  if (!doc) throw httpError(404, 'Document not found.');
  if (doc.verifiedAt) throw httpError(400, 'HR has verified this document, so it can\'t be removed. Ask HR to change it.');
  const fileId = doc.fileId;
  profile.documents = profile.documents.filter((d) => !sameId(d._id, req.params.docId));
  await profile.save();
  await softDeleteFiles([fileId]);
  res.json({ success: true, data: await ownFile(req.admin.id) });
}));

// Profile → Payslips: months that have been paid
router.get('/me/payslips', team, handle(async (req, res) => {
  const lines = await ErpPayLine.find({ adminId: req.admin.id, paidAt: { $ne: null } }).sort({ month: -1 }).limit(60).lean();
  res.json({ success: true, data: lines.map(publicLine) });
}));

router.get('/me/payslips/:id/pdf', team, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Payslip not found.');
  const line = await ErpPayLine.findOne({ _id: req.params.id, adminId: req.admin.id, paidAt: { $ne: null } }).lean();
  if (!line) throw httpError(404, 'Payslip not found.');
  const pdf = await renderPayslipPdf(line, await getSettings());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${line.month}.pdf"`);
  res.send(pdf);
}));

// Profile → Documents: letters CVMind has issued to me, and my requests
router.get('/me/letters', team, handle(async (req, res) => {
  const [letters, requests] = await Promise.all([
    ErpLetter.find({ adminId: req.admin.id }).sort({ createdAt: -1 }).lean(),
    ErpLetterRequest.find({ adminId: req.admin.id }).sort({ createdAt: -1 }).limit(20).lean()
  ]);
  res.json({
    success: true,
    data: letters.map((l) => { const p = publicLetter(l); delete p.body; return p; }),
    requests: requests.map((r) => ({ id: String(r._id), type: r.type, typeLabel: LETTER_LABELS[r.type], note: r.note, status: r.status, reply: r.reply, createdAt: r.createdAt })),
    types: LETTER_TYPES.filter((t) => t !== 'offer').map((t) => ({ value: t, label: LETTER_LABELS[t] }))
  });
}));

router.get('/me/letters/:id/pdf', team, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Letter not found.');
  const letter = await ErpLetter.findOne({ _id: req.params.id, adminId: req.admin.id }).lean();
  if (!letter) throw httpError(404, 'Letter not found.');
  const pdf = await renderLetterPdf(letter, await getSettings());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${letter.number.replace(/\//g, '-')}.pdf"`);
  res.send(pdf);
}));

router.post('/me/letter-requests', team, handle(async (req, res) => {
  const type = req.body?.type;
  if (!LETTER_TYPES.includes(type) || type === 'offer') throw httpError(400, 'Pick the letter you need.');
  if (await ErpLetterRequest.exists({ adminId: req.admin.id, type, status: 'pending' })) throw httpError(409, 'You already asked for this letter. HR will get to it soon.');
  const row = await ErpLetterRequest.create({ adminId: req.admin.id, type, note: clean(req.body?.note, 500) });
  await notify(await hrManagerIds(), { type: 'letter_requested', actorId: req.admin.id, refType: 'letter_request', refId: row._id, preview: LETTER_LABELS[type] });
  res.json({ success: true });
}));

export default router;

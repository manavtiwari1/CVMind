import express from 'express';
import { AdminUser } from '../../admin/models.js';
import { audit } from '../../admin/audit.js';
import { requireAdmin } from '../../admin/auth.js';
import { clean, escapeRegex, handle, httpError, isId } from '../../admin/util.js';
import { TeamFile } from '../../admin/team/models.js';
import { presignDownload } from '../../admin/team/storage.js';
import { EMPLOYMENT_TYPES, ErpPayHistory, ErpProfile } from '../models.js';
import { HR_EDITABLE, loadProfile, missingParts, publicProfile, readPayEntry, readProfileFields, roleLabel, syncCurrentPay } from '../people.js';
import { decrypt } from '../secure.js';

// Admin panel → ERP → People: one HR file per person on the team.
const router = express.Router();
const view = requireAdmin('hr.view');
const manage = requireAdmin('hr.manage');
// Pay amounts are only shown to people who can manage HR
const seesPay = (req) => req.admin.permissions.includes('hr.manage');

async function personOr404(adminId) {
  if (!isId(adminId)) throw httpError(404, 'Person not found.');
  const person = await AdminUser.findById(adminId, { passwordHash: 0 }).lean();
  if (!person) throw httpError(404, 'Person not found.');
  return person;
}

const personSummary = (a) => ({
  id: String(a._id),
  name: a.name || a.username,
  username: a.username,
  email: a.email || '',
  phone: a.phone || '',
  role: a.role,
  roleLabel: roleLabel(a.role),
  department: a.department || '',
  idNumber: a.idNumber || '',
  active: a.active !== false,
  createdAt: a.createdAt
});

router.get('/people', view, handle(async (req, res) => {
  const filter = {};
  if (req.query.status !== 'all') filter.active = true;
  const q = clean(req.query.q, 80);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { username: rx }, { email: rx }, { idNumber: rx }, { department: rx }];
  }
  const people = await AdminUser.find(filter, { passwordHash: 0 }).sort({ name: 1, username: 1 }).limit(500).lean();
  const profiles = new Map((await ErpProfile.find({ adminId: { $in: people.map((p) => p._id) } }).lean()).map((p) => [String(p.adminId), p]));
  const managers = new Map(people.map((p) => [String(p._id), p.name || p.username]));
  let rows = people.map((a) => {
    const p = profiles.get(String(a._id)) || {};
    return {
      ...personSummary(a),
      employmentType: p.employmentType || '',
      designation: p.designation || '',
      managerName: p.managerId ? managers.get(String(p.managerId)) || '' : '',
      joiningDate: p.joiningDate || '',
      endDate: p.endDate || '',
      ...(seesPay(req) ? { payType: p.payType || 'unpaid', payAmount: p.payAmount || 0 } : {}),
      hasFile: !!p._id,
      missing: missingParts(p),
      documentsToVerify: (p.documents || []).filter((d) => !d.verifiedAt).length
    };
  });
  if (EMPLOYMENT_TYPES.includes(req.query.type)) rows = rows.filter((r) => r.employmentType === req.query.type);
  res.json({ success: true, data: rows, canManage: seesPay(req) });
}));

router.get('/people/:adminId', view, handle(async (req, res) => {
  const person = await personOr404(req.params.adminId);
  const profile = await loadProfile(person._id);
  const history = seesPay(req) ? await ErpPayHistory.find({ adminId: person._id }).sort({ effectiveFrom: -1, createdAt: -1 }).lean() : [];
  res.json({ success: true, person: personSummary(person), data: await publicProfile(profile, { pay: seesPay(req), history }), canManage: seesPay(req) });
}));

router.patch('/people/:adminId', manage, handle(async (req, res) => {
  const person = await personOr404(req.params.adminId);
  const fields = await readProfileFields(req.body, { allowed: HR_EDITABLE, adminId: person._id });
  // Department and phone live on the account, where Team's People page reads them
  const account = {};
  if (req.body.department !== undefined) account.department = clean(req.body.department, 60);
  if (Object.keys(account).length) await AdminUser.updateOne({ _id: person._id }, { $set: account });
  const profile = await ErpProfile.findOneAndUpdate(
    { adminId: person._id },
    { $set: { ...fields, updatedBy: req.admin.id === 'env-owner' ? null : req.admin.id } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();
  const changed = [...Object.keys(fields), ...Object.keys(account)].map((k) => k.replace(/Enc$/, '')).filter((k) => !/Last4$/.test(k));
  await audit(req, 'hr.profile_updated', { targetType: 'admin', targetId: person._id, targetLabel: person.username, details: { fields: changed } });
  const history = await ErpPayHistory.find({ adminId: person._id }).sort({ effectiveFrom: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: await publicProfile(profile, { history }) });
}));

// A pay change from a date. The current pay follows the newest change that has started.
router.post('/people/:adminId/pay', manage, handle(async (req, res) => {
  const person = await personOr404(req.params.adminId);
  const entry = readPayEntry(req.body);
  await ErpPayHistory.create({ ...entry, adminId: person._id, createdBy: req.admin.id === 'env-owner' ? null : req.admin.id, createdByName: req.admin.name || req.admin.username });
  await syncCurrentPay(person._id);
  await audit(req, 'hr.pay_changed', { targetType: 'admin', targetId: person._id, targetLabel: person.username, details: entry });
  const history = await ErpPayHistory.find({ adminId: person._id }).sort({ effectiveFrom: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: await publicProfile(await loadProfile(person._id), { history }) });
}));

router.delete('/people/:adminId/pay/:id', manage, handle(async (req, res) => {
  const person = await personOr404(req.params.adminId);
  if (!isId(req.params.id)) throw httpError(404, 'Pay change not found.');
  const row = await ErpPayHistory.findOneAndDelete({ _id: req.params.id, adminId: person._id }).lean();
  if (!row) throw httpError(404, 'Pay change not found.');
  await syncCurrentPay(person._id);
  await audit(req, 'hr.pay_change_deleted', { targetType: 'admin', targetId: person._id, targetLabel: person.username, details: { payType: row.payType, amount: row.amount, effectiveFrom: row.effectiveFrom } });
  res.json({ success: true });
}));

// Shows the full account number and PAN once, and records who looked
router.post('/people/:adminId/reveal', manage, handle(async (req, res) => {
  const person = await personOr404(req.params.adminId);
  const p = await ErpProfile.findOne({ adminId: person._id }, { bankAccountEnc: 1, panEnc: 1 }).lean();
  await audit(req, 'hr.bank_revealed', { targetType: 'admin', targetId: person._id, targetLabel: person.username });
  res.json({ success: true, bankAccount: decrypt(p?.bankAccountEnc), pan: decrypt(p?.panEnc) });
}));

async function documentOr404(person, docId) {
  if (!isId(docId)) throw httpError(404, 'Document not found.');
  const profile = await ErpProfile.findOne({ adminId: person._id });
  const doc = profile?.documents.id(docId);
  if (!doc) throw httpError(404, 'Document not found.');
  return { profile, doc };
}

router.post('/people/:adminId/documents/:docId/verify', manage, handle(async (req, res) => {
  const person = await personOr404(req.params.adminId);
  const { profile, doc } = await documentOr404(person, req.params.docId);
  const verified = req.body?.verified !== false;
  doc.verifiedAt = verified ? new Date() : null;
  doc.verifiedBy = verified && req.admin.id !== 'env-owner' ? req.admin.id : null;
  await profile.save();
  await audit(req, verified ? 'hr.document_verified' : 'hr.document_unverified', { targetType: 'admin', targetId: person._id, targetLabel: person.username, details: { kind: doc.kind } });
  res.json({ success: true, data: await publicProfile(profile.toObject(), { pay: false }) });
}));

// A short-lived link to the document; every opening is recorded
router.get('/people/:adminId/documents/:docId/url', view, handle(async (req, res) => {
  const person = await personOr404(req.params.adminId);
  const { doc } = await documentOr404(person, req.params.docId);
  const file = await TeamFile.findById(doc.fileId).lean();
  if (!file || file.status !== 'ready') throw httpError(404, 'This file is no longer available.');
  const url = await presignDownload(file, req.query.download === '1');
  await audit(req, 'hr.document_opened', { targetType: 'admin', targetId: person._id, targetLabel: person.username, details: { kind: doc.kind } });
  res.json({ success: true, url });
}));

export default router;

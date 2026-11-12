import express from 'express';
import { AdminUser } from '../../models.js';
import { invalidateAdminCache } from '../../auth.js';
import { audit } from '../../audit.js';
import { ROLES } from '../../permissions.js';
import { clean, escapeRegex, handle, httpError, isEmail, isId } from '../../util.js';
import { requireTeam } from '../access.js';
import { ID_PATTERN } from '../idcard.js';
import { PAST_REASONS, TeamPastMember } from '../models.js';
import { disconnectUser } from '../realtime.js';

// Past members (admin panel → Team workspace → Past members). Managers only.
const router = express.Router();
const manage = requireTeam({ manage: true });

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

const publicPast = (p) => ({
  id: String(p._id),
  adminId: p.adminId ? String(p.adminId) : null,
  name: p.name,
  email: p.email || '',
  phone: p.phone || '',
  idNumber: p.idNumber || '',
  role: p.role || '',
  department: p.department || '',
  joinedOn: p.joinedOn || '',
  leftOn: p.leftOn,
  reason: p.reason,
  certificateIssued: !!p.certificateIssued,
  lorIssued: !!p.lorIssued,
  notes: p.notes || '',
  addedByName: p.addedByName || '',
  createdAt: p.createdAt
});

// The editable fields, checked. With `partial` (edits), fields that weren't sent stay as they are.
async function readFields(body = {}, { partial = false, adminId = null } = {}) {
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!partial || has('name')) {
    out.name = clean(body.name, 80);
    if (!out.name) throw httpError(400, 'Enter their name.');
  }
  if (has('email')) {
    out.email = clean(body.email, 120).toLowerCase();
    if (out.email && !isEmail(out.email)) throw httpError(400, 'Enter a valid email address.');
  }
  if (has('phone')) out.phone = clean(body.phone, 20);
  if (has('role')) out.role = clean(body.role, 80);
  if (has('department')) out.department = clean(body.department, 60);
  if (has('notes')) out.notes = clean(body.notes, 1000);
  if (has('idNumber')) {
    out.idNumber = clean(body.idNumber, 20).toUpperCase();
    // Old records may predate CVM numbers. A CVM number must not belong to someone else on the team.
    if (out.idNumber && ID_PATTERN.test(out.idNumber)) {
      const holder = await AdminUser.findOne({ idNumber: out.idNumber }, { _id: 1, name: 1, username: 1 }).lean();
      if (holder && String(holder._id) !== String(adminId || '')) throw httpError(400, `${holder.name || holder.username} on the team has ${out.idNumber}.`);
    }
  }
  if (has('joinedOn')) {
    out.joinedOn = clean(body.joinedOn, 10);
    if (out.joinedOn && !DAY.test(out.joinedOn)) throw httpError(400, 'Pick a valid joining date.');
  }
  if (!partial || has('leftOn')) {
    out.leftOn = clean(body.leftOn, 10);
    if (!DAY.test(out.leftOn)) throw httpError(400, 'Pick the date they left.');
  }
  if (out.joinedOn && out.leftOn && out.joinedOn > out.leftOn) throw httpError(400, 'The leaving date is before the joining date.');
  if (has('reason')) {
    if (!PAST_REASONS.includes(body.reason)) throw httpError(400, 'Pick why they left.');
    out.reason = body.reason;
  }
  if (typeof body.certificateIssued === 'boolean') out.certificateIssued = body.certificateIssued;
  if (typeof body.lorIssued === 'boolean') out.lorIssued = body.lorIssued;
  return out;
}

router.get('/past-members', manage, handle(async (req, res) => {
  const filter = {};
  const q = clean(req.query.q, 80);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { idNumber: rx }, { role: rx }];
  }
  if (PAST_REASONS.includes(req.query.reason)) filter.reason = req.query.reason;
  const rows = await TeamPastMember.find(filter).sort({ leftOn: -1, createdAt: -1 }).limit(500).lean();
  res.json({ success: true, data: rows.map(publicPast), reasons: PAST_REASONS });
}));

// An older record typed in by hand
router.post('/past-members', manage, handle(async (req, res) => {
  const fields = await readFields(req.body);
  const row = await TeamPastMember.create({ ...fields, addedBy: req.admin.id, addedByName: req.admin.name });
  await audit(req, 'teamchat.past_member_added', { targetType: 'past_member', targetId: row._id, targetLabel: row.name });
  res.json({ success: true, data: publicPast(row.toObject()) });
}));

// A current member leaves: their details are copied into a record, and Team access can be turned off
router.post('/past-members/from-member/:adminId', manage, handle(async (req, res) => {
  if (!isId(req.params.adminId)) throw httpError(404, 'Person not found.');
  if (req.params.adminId === req.admin.id) throw httpError(400, 'You cannot mark yourself as left.');
  const member = await AdminUser.findById(req.params.adminId).lean();
  if (!member) throw httpError(404, 'Person not found.');
  if (await TeamPastMember.exists({ adminId: member._id })) throw httpError(409, `${member.name || member.username} is already in Past members. Edit that record instead.`);
  const fields = await readFields({
    name: member.name || member.username,
    email: member.email || '',
    phone: member.phone || '',
    idNumber: member.idNumber || '',
    role: ROLES[member.role]?.label || member.role,
    department: member.department || '',
    joinedOn: day(member.createdAt),
    ...req.body
  }, { adminId: member._id });
  const row = await TeamPastMember.create({ ...fields, adminId: member._id, addedBy: req.admin.id, addedByName: req.admin.name });
  const removeAccess = req.body?.removeAccess === true;
  if (removeAccess && member.chatAccess !== false) {
    await AdminUser.updateOne({ _id: member._id }, { $set: { chatAccess: false } });
    invalidateAdminCache(String(member._id));
    disconnectUser(String(member._id));
  }
  await audit(req, 'teamchat.member_left', { targetType: 'admin', targetId: member._id, targetLabel: member.username, details: { reason: row.reason, leftOn: row.leftOn, removeAccess } });
  res.json({ success: true, data: publicPast(row.toObject()) });
}));

router.patch('/past-members/:id', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Record not found.');
  const row = await TeamPastMember.findById(req.params.id);
  if (!row) throw httpError(404, 'Record not found.');
  const fields = await readFields({ joinedOn: row.joinedOn, leftOn: row.leftOn, ...req.body }, { partial: true, adminId: row.adminId });
  Object.assign(row, fields);
  await row.save();
  await audit(req, 'teamchat.past_member_updated', { targetType: 'past_member', targetId: row._id, targetLabel: row.name });
  res.json({ success: true, data: publicPast(row.toObject()) });
}));

router.delete('/past-members/:id', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Record not found.');
  const row = await TeamPastMember.findByIdAndDelete(req.params.id).lean();
  if (!row) throw httpError(404, 'Record not found.');
  await audit(req, 'teamchat.past_member_deleted', { targetType: 'past_member', targetId: row._id, targetLabel: row.name });
  res.json({ success: true });
}));

export default router;

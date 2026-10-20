import express from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { AdminUser, AdminAuditLog } from '../models.js';
import { loginAdmin, requireAdmin, requireDb, toPublicAdmin, invalidateAdminCache } from '../auth.js';
import { ROLES, ROLE_KEYS, PERMISSIONS, FULL_ACCESS_ROLES, isFullAccess, isTeamOnlyRole } from '../permissions.js';
import { audit } from '../audit.js';
import { createAdminMember } from '../members.js';
import { clean, handle, httpError, isId, paging, dateRange, escapeRegex } from '../util.js';

const router = express.Router();

// 10 attempts per 15 minutes per IP, so the password can't be brute-forced
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' })
});

router.post('/login', loginLimiter, handle(async (req, res) => {
  const { username, password } = req.body || {};
  const result = await loginAdmin(username, password);
  if (!result) return res.status(401).json({ success: false, error: 'Invalid username or password.' });
  if (isTeamOnlyRole(result.admin.role)) {
    return res.status(403).json({ success: false, code: 'TEAM_ONLY', error: 'This account is for CVMind Team only. Sign in at team.cvmind.in.' });
  }
  req.admin = result.admin;
  if (result.admin.id !== 'env-owner') await audit(req, 'admin.login', { targetType: 'admin', targetId: result.admin.id, targetLabel: result.admin.username });
  res.json({ success: true, token: result.token, admin: result.admin });
}));

router.get('/me', requireAdmin(), (req, res) => {
  res.json({ success: true, admin: req.admin, roles: ROLES, dbReady: req.admin.id !== 'env-owner' });
});

router.post('/me/password', requireAdmin(), requireDb, handle(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (String(newPassword || '').length < 10) throw httpError(400, 'Use at least 10 characters for the new password.');
  const admin = await AdminUser.findById(req.admin.id);
  if (!admin || !(await bcrypt.compare(String(currentPassword || ''), admin.passwordHash))) throw httpError(400, 'Your current password is not correct.');
  admin.passwordHash = await bcrypt.hash(String(newPassword), 10);
  admin.mustChangePassword = false;
  await admin.save();
  invalidateAdminCache(String(admin._id));
  await audit(req, 'admin.password_changed', { targetType: 'admin', targetId: admin._id, targetLabel: admin.username });
  res.json({ success: true });
}));

// ── Team (roles & permissions) ───────────────────────────────────────────────
router.get('/team', requireAdmin('team.manage'), requireDb, handle(async (req, res) => {
  const members = await AdminUser.find().sort({ createdAt: 1 }).lean();
  res.json({ success: true, data: members.map(toPublicAdmin), roles: ROLES, permissions: PERMISSIONS });
}));

router.post('/team', requireAdmin('team.manage'), requireDb, handle(async (req, res) => {
  const member = await createAdminMember(req.body);
  await audit(req, 'team.member_added', { targetType: 'admin', targetId: member._id, targetLabel: member.username, details: { role: member.role } });
  res.json({ success: true, data: toPublicAdmin(member) });
}));

router.patch('/team/:id', requireAdmin('team.manage'), requireDb, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Team member not found.');
  const member = await AdminUser.findById(req.params.id);
  if (!member) throw httpError(404, 'Team member not found.');
  const changes = {};
  const { role, active, name, password } = req.body || {};

  const self = String(member._id) === req.admin.id;
  if (role !== undefined && role !== member.role) {
    if (!ROLE_KEYS.includes(role)) throw httpError(400, 'Pick a valid role.');
    // Your own title can change (Owner → CEO) but never to less than full access
    if (self && !isFullAccess(role)) throw httpError(400, 'You can only switch yourself to another full-access role.');
    changes.role = { from: member.role, to: role };
    member.role = role;
  }
  if (typeof active === 'boolean' && active !== member.active) {
    changes.active = { from: member.active, to: active };
    member.active = active;
  }
  if (name !== undefined) member.name = clean(name, 80);
  if (password) {
    if (String(password).length < 10) throw httpError(400, 'Use at least 10 characters for the password.');
    member.passwordHash = await bcrypt.hash(String(password), 10);
    changes.password = 'reset';
  }

  // Never leave the panel without an active full-access account (Owner, CEO, CMO or CTO)
  if ((changes.role || changes.active) && (await AdminUser.countDocuments({ role: { $in: FULL_ACCESS_ROLES }, active: true, _id: { $ne: member._id } })) === 0
    && (!isFullAccess(member.role) || !member.active)) {
    throw httpError(400, 'There must always be at least one active Owner, CEO, CMO or CTO.');
  }

  // Role, status or password changes sign the member out everywhere. Switching between full-access
  // roles changes only the title, so nobody is signed out for it.
  const sameAccess = changes.role && isFullAccess(changes.role.from) && isFullAccess(changes.role.to);
  if ((changes.role && !sameAccess) || changes.active || changes.password) member.tokenVersion = (member.tokenVersion || 0) + 1;
  await member.save();
  invalidateAdminCache(String(member._id));
  await audit(req, 'team.member_updated', { targetType: 'admin', targetId: member._id, targetLabel: member.username, details: changes });
  res.json({ success: true, data: toPublicAdmin(member) });
}));

router.delete('/team/:id', requireAdmin('team.manage'), requireDb, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Team member not found.');
  if (req.params.id === req.admin.id) throw httpError(400, "You can't remove your own account.");
  const member = await AdminUser.findById(req.params.id);
  if (!member) throw httpError(404, 'Team member not found.');
  if (isFullAccess(member.role) && (await AdminUser.countDocuments({ role: { $in: FULL_ACCESS_ROLES }, active: true })) <= 1) {
    throw httpError(400, 'There must always be at least one active owner.');
  }
  await member.deleteOne();
  invalidateAdminCache(String(member._id));
  await audit(req, 'team.member_removed', { targetType: 'admin', targetId: member._id, targetLabel: member.username, details: { role: member.role } });
  res.json({ success: true });
}));

// ── Audit log ────────────────────────────────────────────────────────────────
export function auditFilter(query) {
  const filter = { ...dateRange(query) };
  if (query.action) filter.action = clean(query.action, 60);
  if (query.actor) filter.actorId = clean(query.actor, 60);
  if (query.targetType) filter.targetType = clean(query.targetType, 30);
  if (query.q) {
    const rx = new RegExp(escapeRegex(clean(query.q, 80)), 'i');
    filter.$or = [{ targetLabel: rx }, { actorName: rx }, { action: rx }, { targetId: rx }];
  }
  return filter;
}

router.get('/audit', requireAdmin('audit.view'), requireDb, handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query, { defaultLimit: 50 });
  const filter = auditFilter(req.query);
  const [rows, total, actions] = await Promise.all([
    AdminAuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AdminAuditLog.countDocuments(filter),
    AdminAuditLog.distinct('action')
  ]);
  res.json({ success: true, data: rows.map((r) => ({ ...r, id: String(r._id) })), total, page, limit, actions: actions.sort() });
}));

export default router;

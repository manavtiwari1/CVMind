import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { Ticket, Notification } from '../models.js';
import { listSessions, revokeSession, revokeAllSessions, toPublicSession, invalidateSessionCache } from '../sessions.js';
import { renderEmail, sendEmail } from '../mailer.js';
import { FEATURE_LOGS } from './analytics.js';
import { model, clean, handle, httpError, isId, paging, escapeRegex, isEmail, dateRange } from '../util.js';
import {
  setUserStatus, deleteAccount, saveUserResetToken,
  getWhitelistedEmails, addWhitelistedEmail, deleteWhitelistedEmail,
  getAutoApplyAccessList, grantAutoApplyAccess, revokeAutoApplyAccess, hasAutoApplyAccess
} from '../../db.js';

const router = express.Router();
router.use(requireDb);

const providerOf = (u) => u.provider || (u.isGoogleUser ? 'google' : 'password');

export function userFilter(query) {
  const filter = { ...dateRange(query) };
  if (query.q) {
    const rx = new RegExp(escapeRegex(clean(query.q, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
    if (isId(query.q)) filter.$or.push({ _id: query.q });
  }
  if (['active', 'suspended', 'banned'].includes(query.status)) {
    filter.status = query.status === 'active' ? { $in: ['active', null] } : query.status;
  }
  if (query.provider) {
    filter.$and = query.provider === 'password'
      ? [{ $or: [{ provider: 'password' }, { provider: '', isGoogleUser: false }, { provider: null, isGoogleUser: false }] }]
      : query.provider === 'google'
        ? [{ $or: [{ provider: 'google' }, { provider: { $in: ['', null] }, isGoogleUser: true }] }]
        : [{ provider: clean(query.provider, 20) }];
  }
  if (query.verified === 'true') filter.emailVerified = true;
  if (query.verified === 'false') filter.emailVerified = { $ne: true };
  return filter;
}

router.get('/', requireAdmin('users.view'), handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const filter = userFilter(req.query);
  const sortField = ['createdAt', 'name', 'email'].includes(req.query.sort) ? req.query.sort : 'createdAt';
  const sortDir = req.query.dir === 'asc' ? 1 : -1;
  const User = model('User');
  const [users, total] = await Promise.all([
    User.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(limit)
      .select('name email provider isGoogleUser status statusReason emailVerified createdAt avatar').lean(),
    User.countDocuments(filter)
  ]);

  // Last sign-in per listed user
  const emails = users.map((u) => u.email);
  const logins = await model('LoginLog').aggregate([
    { $match: { email: { $in: emails } } },
    { $group: { _id: '$email', last: { $max: '$createdAt' }, count: { $sum: 1 } } }
  ]);
  const loginMap = new Map(logins.map((l) => [l._id, l]));

  res.json({
    success: true,
    total,
    page,
    limit,
    data: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      avatar: u.avatar && u.avatar.length < 600 ? u.avatar : '',
      provider: providerOf(u),
      status: u.status || 'active',
      statusReason: u.statusReason || '',
      emailVerified: !!u.emailVerified,
      createdAt: u.createdAt,
      lastLogin: loginMap.get(u.email)?.last || null,
      loginCount: loginMap.get(u.email)?.count || 0
    }))
  });
}));

async function findUserOr404(id) {
  if (!isId(id)) throw httpError(404, 'User not found.');
  const user = await model('User').findById(id).lean();
  if (!user) throw httpError(404, 'User not found.');
  return user;
}

router.get('/:id', requireAdmin('users.view'), handle(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const id = String(user._id);
  const ExtensionDevice = mongoose.models.ExtensionDevice;

  const [works, logins, payments, sessions, devices, tickets, autoApply, usage] = await Promise.all([
    model('Work').find({ userId: id }).sort({ updatedAt: -1 }).limit(50).select('title type templateId hidden source createdAt updatedAt').lean(),
    model('LoginLog').find({ email: user.email }).sort({ createdAt: -1 }).limit(20).lean(),
    model('PaymentLog').find({ email: user.email }).sort({ createdAt: -1 }).limit(20).lean(),
    listSessions(id),
    ExtensionDevice ? ExtensionDevice.find({ userId: id, revokedAt: null }).sort({ createdAt: -1 }).lean() : [],
    Ticket.find({ email: user.email }).sort({ createdAt: -1 }).limit(10).select('number subject status createdAt').lean(),
    hasAutoApplyAccess(user.email),
    Promise.all(FEATURE_LOGS.map(async (f) => ({ key: f.key, label: f.label, count: await model(f.model).countDocuments({ userId: id }) })))
  ]);

  res.json({
    success: true,
    data: {
      id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || '',
      address: user.address || '',
      provider: providerOf(user),
      status: user.status || 'active',
      statusReason: user.statusReason || '',
      statusUpdatedAt: user.statusUpdatedAt || null,
      emailVerified: !!user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt || null,
      createdAt: user.createdAt,
      sessionsRevokedAt: user.sessionsRevokedAt || null,
      autoApplyAccess: autoApply,
      usage: usage.filter((u) => u.count > 0).sort((a, b) => b.count - a.count),
      works: works.map((w) => ({ id: String(w._id), title: w.title, type: w.type, templateId: w.templateId, hidden: !!w.hidden, createdAt: w.createdAt, updatedAt: w.updatedAt })),
      logins: logins.map((l) => ({ id: String(l._id), provider: l.provider, createdAt: l.createdAt })),
      payments: payments.map((p) => ({ id: String(p._id), amount: p.amount, currency: p.currency, status: p.status, paymentMethod: p.paymentMethod, transactionId: p.transactionId, createdAt: p.createdAt })),
      sessions: sessions.map((s) => toPublicSession(s)),
      devices: devices.map((d) => ({ id: String(d._id), name: d.name, lastSeenAt: d.lastSeenAt, createdAt: d.createdAt })),
      tickets: tickets.map((t) => ({ id: String(t._id), number: t.number, subject: t.subject, status: t.status, createdAt: t.createdAt }))
    }
  });
}));

router.post('/:id/status', requireAdmin('users.manage'), handle(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const status = clean(req.body?.status, 20);
  const reason = clean(req.body?.reason, 300);
  if (status !== 'active' && !reason) throw httpError(400, 'Add a reason. The user sees it when they try to sign in.');
  const result = await setUserStatus(String(user._id), status, reason);
  invalidateSessionCache(String(user._id));
  await audit(req, `user.${status === 'active' ? 'reactivated' : status}`, {
    targetType: 'user', targetId: user._id, targetLabel: user.email, details: { from: user.status || 'active', to: status, reason }
  });
  res.json({ success: true, data: result });
}));

router.post('/:id/verify', requireAdmin('users.manage'), handle(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const verified = req.body?.verified !== false;
  await model('User').updateOne({ _id: user._id }, { emailVerified: verified, emailVerifiedAt: verified ? new Date() : null });
  await audit(req, verified ? 'user.verified' : 'user.unverified', { targetType: 'user', targetId: user._id, targetLabel: user.email });
  res.json({ success: true, data: { emailVerified: verified } });
}));

// Emails the user a reset link, same as "Forgot password" on the site
router.post('/:id/password-reset', requireAdmin('users.manage'), handle(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  if (user.isGoogleUser) throw httpError(400, 'This account signs in with a social login and has no password.');
  const token = crypto.randomBytes(32).toString('hex');
  await saveUserResetToken(user.email, token, Date.now() + 60 * 60 * 1000);
  const host = (process.env.FRONTEND_URL || 'https://www.cvmind.in').replace(/\/$/, '');
  const link = `${host}/?resetToken=${token}&email=${encodeURIComponent(user.email)}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your CV Mind password',
    html: renderEmail({
      greetingName: user.name,
      body: 'Our support team sent you a link to set a new password for your CV Mind account.\n\nThe link works for 1 hour. If you did not ask for this, you can ignore this email.',
      ctaLabel: 'Set a new password',
      ctaUrl: link
    })
  });
  await audit(req, 'user.password_reset_sent', { targetType: 'user', targetId: user._id, targetLabel: user.email });
  res.json({ success: true });
}));

router.delete('/:id/sessions/:sessionId', requireAdmin('sessions.manage'), handle(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  if (!isId(req.params.sessionId)) throw httpError(404, 'Session not found.');
  const session = await revokeSession(user._id, req.params.sessionId, req.admin.username);
  if (!session) throw httpError(404, 'Session not found or already signed out.');
  await audit(req, 'user.session_revoked', { targetType: 'user', targetId: user._id, targetLabel: user.email, details: { device: `${session.browser} on ${session.os}`, ip: session.ip } });
  res.json({ success: true });
}));

router.post('/:id/sessions/revoke-all', requireAdmin('sessions.manage'), handle(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  await revokeAllSessions(user._id, req.admin.username);
  await audit(req, 'user.signed_out_everywhere', { targetType: 'user', targetId: user._id, targetLabel: user.email });
  res.json({ success: true });
}));

router.delete('/:id/devices/:deviceId', requireAdmin('sessions.manage'), handle(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const ExtensionDevice = mongoose.models.ExtensionDevice;
  if (!ExtensionDevice || !isId(req.params.deviceId)) throw httpError(404, 'Device not found.');
  const result = await ExtensionDevice.updateOne({ _id: req.params.deviceId, userId: String(user._id), revokedAt: null }, { revokedAt: new Date() });
  if (!result.modifiedCount) throw httpError(404, 'Device not found or already disconnected.');
  await audit(req, 'user.device_revoked', { targetType: 'user', targetId: user._id, targetLabel: user.email, details: { deviceId: req.params.deviceId } });
  res.json({ success: true });
}));

router.delete('/:id', requireAdmin('users.delete'), handle(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  if (clean(req.body?.confirm, 200).toLowerCase() !== user.email.toLowerCase()) {
    throw httpError(400, "Type the user's email address to confirm.");
  }
  await revokeAllSessions(user._id, req.admin.username).catch(() => {});
  await deleteAccount(String(user._id));
  await Notification.updateMany({ userIds: String(user._id) }, { $pull: { userIds: String(user._id) } });
  await audit(req, 'user.deleted', { targetType: 'user', targetId: user._id, targetLabel: user.email, details: { name: user.name } });
  res.json({ success: true });
}));

// ── Access lists ─────────────────────────────────────────────────────────────
const ACCESS_LISTS = {
  'job-finder': { get: getWhitelistedEmails, add: addWhitelistedEmail, remove: deleteWhitelistedEmail, label: 'Job finder whitelist' },
  'auto-apply': { get: getAutoApplyAccessList, add: grantAutoApplyAccess, remove: revokeAutoApplyAccess, label: 'Auto Apply access' }
};

router.get('/access/:list', requireAdmin('users.view'), handle(async (req, res) => {
  const list = ACCESS_LISTS[req.params.list];
  if (!list) throw httpError(404, 'Unknown list.');
  const rows = await list.get();
  res.json({ success: true, data: rows.map((r) => (typeof r === 'string' ? { email: r } : { email: r.email, addedAt: r.createdAt || r.grantedAt || null, source: r.source || 'database' })) });
}));

router.post('/access/:list', requireAdmin('users.manage'), handle(async (req, res) => {
  const list = ACCESS_LISTS[req.params.list];
  if (!list) throw httpError(404, 'Unknown list.');
  const email = clean(req.body?.email, 120).toLowerCase();
  if (!isEmail(email)) throw httpError(400, 'Enter a valid email address.');
  await list.add(email);
  await audit(req, `access.${req.params.list}.granted`, { targetType: 'email', targetId: email, targetLabel: email });
  res.json({ success: true });
}));

router.delete('/access/:list/:email', requireAdmin('users.manage'), handle(async (req, res) => {
  const list = ACCESS_LISTS[req.params.list];
  if (!list) throw httpError(404, 'Unknown list.');
  const email = clean(req.params.email, 120).toLowerCase();
  await list.remove(email);
  await audit(req, `access.${req.params.list}.revoked`, { targetType: 'email', targetId: email, targetLabel: email });
  res.json({ success: true });
}));

export default router;

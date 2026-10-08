import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { AuthEvent, Notification, UserSession } from '../models.js';
import { invalidateSessionCache, revokeAllSessions } from '../sessions.js';
import { sendEmailBatch, emailConfigured } from '../mailer.js';
import { notificationEmail } from '../../services/emailTemplates.js';
import { logAuthEvent } from '../../services/authEvents.js';
import { AiUsage, FeatureUse } from '../../billing/models.js';
import { setUserStatus, deleteAccount } from '../../db.js';
import { model, clean, handle, httpError, isId, escapeRegex } from '../util.js';

// Who is using CVMind and who isn't. "Last active" is the latest of: a signed-in device being
// seen, a sign-in or other auth event, an AI request, or a weekly free use. These records only
// started on `trackingSince`, so an account with nothing recorded may have been active before then.
const router = express.Router();
router.use(requireDb);

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BULK = 500;
const MAX_EMAIL = 500;

async function lastActiveMap() {
  const [sessions, eventsById, eventsByEmail, ai, uses] = await Promise.all([
    UserSession.aggregate([{ $group: { _id: '$userId', at: { $max: '$lastSeenAt' } } }]),
    AuthEvent.aggregate([{ $match: { userId: { $gt: '' } } }, { $group: { _id: '$userId', at: { $max: '$createdAt' } } }]),
    AuthEvent.aggregate([{ $match: { email: { $gt: '' } } }, { $group: { _id: { $toLower: '$email' }, at: { $max: '$createdAt' } } }]),
    AiUsage.aggregate([{ $group: { _id: '$email', at: { $max: '$createdAt' } } }]),
    FeatureUse.aggregate([{ $group: { _id: '$email', at: { $max: '$createdAt' } } }])
  ]);
  const byId = new Map();
  const byEmail = new Map();
  const put = (map, key, at) => {
    if (!key || !at) return;
    const k = String(key);
    if (!map.has(k) || map.get(k) < at) map.set(k, at);
  };
  for (const r of [...sessions, ...eventsById]) put(byId, r._id, r.at);
  for (const r of [...eventsByEmail, ...ai, ...uses]) put(byEmail, String(r._id).toLowerCase(), r.at);
  return (user) => {
    const a = byId.get(String(user._id));
    const b = byEmail.get(String(user.email).toLowerCase());
    return a && b ? (a > b ? a : b) : a || b || null;
  };
}

async function trackingSince() {
  const [first] = await AuthEvent.find().sort({ createdAt: 1 }).limit(1).select('createdAt').lean();
  return first?.createdAt || null;
}

router.get('/', requireAdmin('users.view'), handle(async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const cutoff = new Date(Date.now() - days * DAY_MS);
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (['active', 'suspended', 'banned'].includes(req.query.status)) {
    filter.status = req.query.status === 'active' ? { $in: ['active', null] } : req.query.status;
  }
  if (req.query.verified === 'true') filter.emailVerified = true;
  if (req.query.verified === 'false') filter.emailVerified = { $ne: true };

  const [users, lastActive, since] = await Promise.all([
    model('User').find(filter).select('name email avatar status emailVerified createdAt').sort({ createdAt: -1 }).limit(5000).lean(),
    lastActiveMap(),
    trackingSince()
  ]);

  const rows = users.map((u) => {
    const last = lastActive(u);
    // New sign-ups count as active: they haven't had the chance to come back yet
    const active = (last && last > cutoff) || new Date(u.createdAt) > cutoff;
    return {
      id: String(u._id),
      name: u.name,
      email: u.email,
      avatar: u.avatar || '',
      status: u.status || 'active',
      emailVerified: !!u.emailVerified,
      createdAt: u.createdAt,
      lastActiveAt: last,
      activity: active ? 'active' : last ? 'inactive' : 'never'
    };
  });

  const stats = {
    total: rows.length,
    active: rows.filter((r) => r.activity === 'active').length,
    inactive: rows.filter((r) => r.activity === 'inactive').length,
    never: rows.filter((r) => r.activity === 'never').length
  };
  const activity = clean(req.query.activity, 20);
  const shown = activity === 'inactive'
    ? rows.filter((r) => r.activity !== 'active')
    : ['active', 'never'].includes(activity) ? rows.filter((r) => r.activity === activity) : rows;
  // Longest-quiet first: never-seen accounts by sign-up date, then the oldest last activity
  shown.sort((a, b) => new Date(a.lastActiveAt || a.createdAt) - new Date(b.lastActiveAt || b.createdAt));

  res.json({ success: true, days, trackingSince: since, stats, emailConfigured: emailConfigured(), data: shown });
}));

// One action on many users: suspend, ban, reactivate, delete or email
router.post('/bulk', requireAdmin(), handle(async (req, res) => {
  const action = clean(req.body?.action, 20);
  const needs = { suspend: 'users.manage', ban: 'users.manage', reactivate: 'users.manage', delete: 'users.delete', email: 'notifications.send' }[action];
  if (!needs) throw httpError(400, 'Unknown action.');
  if (!req.admin.permissions.includes(needs)) throw httpError(403, 'Your role does not allow this action.');

  const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map(String).filter(isId))];
  if (!ids.length) throw httpError(400, 'Select at least one user.');
  if (ids.length > MAX_BULK) throw httpError(400, `Select at most ${MAX_BULK} users at a time.`);
  const users = await model('User').find({ _id: { $in: ids } }).select('name email status emailVerified').lean();
  if (!users.length) throw httpError(404, 'None of the selected users exist any more.');

  if (action === 'email') {
    const title = clean(req.body?.subject, 120);
    const body = String(req.body?.body || '').trim().slice(0, 4000);
    const link = clean(req.body?.link, 500);
    if (!title) throw httpError(400, 'Add a subject.');
    if (!body) throw httpError(400, 'Write a message.');
    if (link && !/^(https:\/\/|\/)/i.test(link)) throw httpError(400, 'The link must start with https:// or /');
    if (!emailConfigured()) throw httpError(503, 'Email is not configured on this server (RESEND_API_KEY).');
    // Unverified addresses are often fake and bounce, which hurts cvmind.in's sender reputation
    const to = users.filter((u) => u.emailVerified);
    if (!to.length) throw httpError(400, 'None of the selected users have a verified email address.');
    if (to.length > MAX_EMAIL) throw httpError(400, `Email can go to at most ${MAX_EMAIL} people at a time.`);
    const ctaUrl = link.startsWith('/') ? `${(process.env.FRONTEND_URL || 'https://www.cvmind.in').replace(/\/$/, '')}${link}` : link;
    const { sent, failed, errors } = await sendEmailBatch(to.map((u) => ({ to: u.email, ...notificationEmail({ name: u.name, title, body, ctaLabel: link ? 'Open CVMind' : '', ctaUrl }) })));
    for (const e of errors) console.error('[user-activity] email failed for', e.to.join(', '), e.message);
    // Kept in the Notifications history like any other send
    const notification = await Notification.create({
      title, body, link, audience: 'segment', segment: { emails: to.map((u) => u.email) },
      userIds: to.map((u) => String(u._id)), channels: ['email'], recipientCount: to.length,
      createdBy: req.admin.name, emailSent: sent, emailFailed: failed, emailSkipped: users.length - to.length
    });
    await audit(req, 'users.bulk_emailed', {
      targetType: 'notification', targetId: notification._id, targetLabel: title,
      details: { selected: users.length, sent, failed, skippedUnverified: users.length - to.length }
    });
    return res.json({ success: true, data: { sent, failed, skipped: users.length - to.length } });
  }

  if (action === 'delete') {
    if (clean(req.body?.confirm, 40) !== `DELETE ${users.length}`) throw httpError(400, `Type DELETE ${users.length} to confirm.`);
    let done = 0;
    for (const u of users) {
      try {
        await revokeAllSessions(u._id, req.admin.username).catch(() => {});
        await deleteAccount(String(u._id));
        await Notification.updateMany({ userIds: String(u._id) }, { $pull: { userIds: String(u._id) } });
        await audit(req, 'user.deleted', { targetType: 'user', targetId: u._id, targetLabel: u.email, details: { name: u.name, bulk: true } });
        done++;
      } catch (err) {
        console.error('[user-activity] delete failed for', u.email, err.message);
      }
    }
    return res.json({ success: true, data: { done, failed: users.length - done } });
  }

  const status = { suspend: 'suspended', ban: 'banned', reactivate: 'active' }[action];
  const reason = clean(req.body?.reason, 300);
  if (status !== 'active' && !reason) throw httpError(400, 'Add a reason. The user sees it when they try to sign in.');
  let done = 0;
  for (const u of users) {
    if ((u.status || 'active') === status) continue;
    await setUserStatus(String(u._id), status, status === 'active' ? '' : reason);
    invalidateSessionCache(String(u._id));
    if (status !== 'active') logAuthEvent(req, 'ACCOUNT_SUSPENDED', { userId: u._id, email: u.email, metadata: { status, reason, admin: req.admin.username } });
    await audit(req, `user.${status === 'active' ? 'reactivated' : status}`, {
      targetType: 'user', targetId: u._id, targetLabel: u.email, details: { from: u.status || 'active', to: status, reason, bulk: true }
    });
    done++;
  }
  res.json({ success: true, data: { done, unchanged: users.length - done } });
}));

export default router;

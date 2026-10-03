import express from 'express';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import { requireUser, verifyToken } from '../services/authToken.js';
import { dbReady, requireDb } from './auth.js';
import { ContentBlock, CONTENT_SLOTS, ContentReport, Notification, REPORT_TARGETS, UserSession } from './models.js';
import { FEATURES, VERSION_CLIENTS, getSettings, versionVerdict } from './settings.js';
import { evaluateCoupon } from './coupons.js';
import { listSessions, revokeSession, toPublicSession, invalidateSessionCache } from './sessions.js';
import { clean, handle, httpError, isId, isEmail } from './util.js';

// Endpoints the website, Android app and extension call: config, content, notifications, coupons, reports, sessions
const router = express.Router();

// ── Config ───────────────────────────────────────────────────────────────────
router.get('/api/config', handle(async (req, res) => {
  const settings = await getSettings();
  res.set('Cache-Control', 'public, max-age=30');
  res.json({
    success: true,
    maintenance: settings.maintenance.enabled ? settings.maintenance : { enabled: false, message: '' },
    disabledFeatures: Object.keys(FEATURES).filter((key) => settings.features[key] === false)
  });
}));

// ?client=android|extension&v=1.2.0 → { verdict: ok | recommended | required, ... }
router.get('/api/config/version', handle(async (req, res) => {
  const client = String(req.query.client || '');
  if (!VERSION_CLIENTS[client]) throw httpError(400, 'Unknown client.');
  const entry = (await getSettings()).versions[client];
  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    success: true,
    client,
    verdict: versionVerdict(entry, req.query.v),
    minVersion: entry.minVersion,
    latestVersion: entry.latestVersion,
    message: entry.message,
    updateUrl: entry.updateUrl
  });
}));

// ── Site content ─────────────────────────────────────────────────────────────
let contentCache = null;
let contentCacheAt = 0;

export function invalidatePublicContent() {
  contentCache = null;
}

async function liveContent() {
  if (contentCache && Date.now() - contentCacheAt < 60 * 1000) return contentCache;
  const grouped = Object.fromEntries(CONTENT_SLOTS.map((slot) => [slot, []]));
  if (await dbReady(2000)) {
    const now = new Date();
    const blocks = await ContentBlock.find({
      active: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }
      ]
    }).sort({ order: 1, createdAt: -1 }).lean();
    for (const b of blocks) {
      grouped[b.slot].push({ id: String(b._id), title: b.title, body: b.body, ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl, tone: b.tone, endsAt: b.endsAt });
    }
  }
  // Cached for a minute, so a scheduled block appears or ends at most a minute late
  contentCache = grouped;
  contentCacheAt = Date.now();
  return grouped;
}

router.get('/api/content', handle(async (req, res) => {
  const all = await liveContent();
  const wanted = String(req.query.slots || '').split(',').filter((s) => CONTENT_SLOTS.includes(s));
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ success: true, data: wanted.length ? Object.fromEntries(wanted.map((s) => [s, all[s]])) : all });
}));

// ── In-app notifications ─────────────────────────────────────────────────────
async function userCreatedAt(userId) {
  const User = mongoose.models.User;
  const user = User && isId(userId) ? await User.findById(userId).select('createdAt').lean() : null;
  return user?.createdAt || new Date(0);
}

function notificationQuery(userId, since) {
  return {
    channels: 'in-app',
    $or: [
      // Broadcasts from after the user joined
      { audience: 'all', createdAt: { $gte: since } },
      { userIds: String(userId) }
    ]
  };
}

router.get('/api/notifications', requireUser, requireDb, handle(async (req, res) => {
  const userId = req.auth.sub;
  const rows = await Notification.find(notificationQuery(userId, await userCreatedAt(userId)))
    .sort({ createdAt: -1 }).limit(30).select('title body link readBy createdAt').lean();
  const data = rows.map((n) => ({ id: String(n._id), title: n.title, body: n.body, link: n.link, createdAt: n.createdAt, read: (n.readBy || []).includes(userId) }));
  res.json({ success: true, data, unread: data.filter((n) => !n.read).length });
}));

router.post('/api/notifications/read', requireUser, requireDb, handle(async (req, res) => {
  const userId = req.auth.sub;
  const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isId).slice(0, 100);
  const filter = ids.length ? { _id: { $in: ids }, ...notificationQuery(userId, await userCreatedAt(userId)) } : notificationQuery(userId, await userCreatedAt(userId));
  await Notification.updateMany(filter, { $addToSet: { readBy: userId } });
  res.json({ success: true });
}));

// ── Coupons ──────────────────────────────────────────────────────────────────
const couponLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, error: 'Too many tries. Please wait a few minutes.' })
});

router.post('/api/coupons/validate', couponLimiter, requireDb, handle(async (req, res) => {
  const result = await evaluateCoupon(req.body?.code, { email: req.body?.email, amount: req.body?.amount });
  if (!result.ok) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: { code: result.coupon.code, description: result.coupon.description, discount: result.discount, finalAmount: result.finalAmount } });
}));

// ── Content reports ──────────────────────────────────────────────────────────
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, error: 'Too many reports. Please try again later.' })
});

router.post('/api/reports', reportLimiter, requireDb, handle(async (req, res) => {
  const targetType = clean(req.body?.targetType, 20);
  const targetId = clean(req.body?.targetId, 80);
  const reason = clean(req.body?.reason, 80);
  if (!REPORT_TARGETS.includes(targetType) || !targetId) throw httpError(400, 'Invalid report.');
  if (!reason) throw httpError(400, 'Pick a reason.');
  const header = req.headers.authorization || '';
  const auth = header.startsWith('Bearer ') ? verifyToken(header.slice(7).trim()) : null;
  const email = clean(auth?.email || req.body?.email, 120).toLowerCase();
  await ContentReport.create({
    targetType,
    targetId,
    reason,
    details: clean(req.body?.details, 1000),
    reporterEmail: isEmail(email) ? email : ''
  });
  res.json({ success: true });
}));

// ── The signed-in user's own sessions ────────────────────────────────────────
router.get('/api/account/sessions', requireUser, requireDb, handle(async (req, res) => {
  const sessions = await listSessions(req.auth.sub);
  res.json({ success: true, data: sessions.filter((s) => !s.revokedAt).map((s) => toPublicSession(s, req.auth.jti)) });
}));

router.delete('/api/account/sessions/:id', requireUser, requireDb, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Session not found.');
  const session = await revokeSession(req.auth.sub, req.params.id, 'self');
  if (!session) throw httpError(404, 'Session not found.');
  res.json({ success: true });
}));

// Signs out every other device; the current one stays signed in
router.post('/api/account/sessions/revoke-others', requireUser, requireDb, handle(async (req, res) => {
  await UserSession.updateMany({ userId: req.auth.sub, revokedAt: null, jti: { $ne: req.auth.jti || '' } }, { revokedAt: new Date(), revokedBy: 'self' });
  invalidateSessionCache(req.auth.sub);
  res.json({ success: true });
}));

export default router;

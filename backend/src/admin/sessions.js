import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { setUserSessionValidator, TOKEN_TTL_MS } from '../services/authToken.js';
import { UserSession } from './models.js';
import { dbReady } from './auth.js';

// Readable device info from a User-Agent header. Good enough for a session list, not for analytics.
export function describeUserAgent(ua = '') {
  const s = String(ua);
  const browser =
    /Edg\//.test(s) ? 'Edge'
      : /OPR\/|Opera/.test(s) ? 'Opera'
        : /SamsungBrowser/.test(s) ? 'Samsung Internet'
          : /Chrome\//.test(s) ? 'Chrome'
            : /Firefox\//.test(s) ? 'Firefox'
              : /Safari\//.test(s) ? 'Safari'
                : /okhttp|Dalvik/i.test(s) ? 'Android app'
                  : s ? 'Other' : 'Unknown';
  const os =
    /Windows/.test(s) ? 'Windows'
      : /Android/.test(s) ? 'Android'
        : /iPhone|iPad|iOS/.test(s) ? 'iOS'
          : /Mac OS X|Macintosh/.test(s) ? 'macOS'
            : /Linux/.test(s) ? 'Linux'
              : 'Unknown';
  const device = /Mobile|Android|iPhone/.test(s) ? 'Mobile' : /iPad|Tablet/.test(s) ? 'Tablet' : 'Desktop';
  return { browser, os, device };
}

export function newSessionId() {
  return randomUUID();
}

// Stores the session row for a token that was just issued. Never fails the sign-in.
export async function recordSession({ jti, userId, email, provider = '', req }) {
  try {
    if (!jti || !(await dbReady(2000))) return;
    const ua = String(req?.headers?.['user-agent'] || '').slice(0, 400);
    await UserSession.create({
      jti,
      userId: String(userId),
      email: String(email || '').toLowerCase(),
      provider,
      userAgent: ua,
      ...describeUserAgent(ua),
      ip: req?.ip || '',
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
    });
  } catch (err) {
    console.error('[sessions] could not record session:', err.message);
  }
}

// ── Request-time validation ──────────────────────────────────────────────────
const cache = new Map();
const CACHE_MS = 30 * 1000;
const TOUCH_MS = 5 * 60 * 1000;

function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  // Mongoose queries are thenables that run on every then(); wrap once so the cached value is a plain promise
  const value = Promise.resolve(load());
  cache.set(key, { value, at: Date.now() });
  // Don't let a failed lookup stick for the cache window
  value.catch(() => cache.delete(key));
  return value;
}

export function invalidateSessionCache(userId) {
  for (const key of cache.keys()) {
    if (!userId || key.startsWith(`${userId}:`) || key === `user:${userId}`) cache.delete(key);
  }
}

const lastTouched = new Map();

// Rejects tokens for revoked sessions, signed-out-everywhere users, and suspended/banned/deleted accounts.
// Without a database it allows everything, matching the JSON-file fallback.
async function validateUserSession(payload) {
  if (!(await dbReady(0))) return { ok: true };
  const User = mongoose.models.User;
  if (!User || !mongoose.isValidObjectId(payload.sub)) return { ok: true };

  const user = await cached(`user:${payload.sub}`, () =>
    User.findById(payload.sub).select('status sessionsRevokedAt emailVerified').lean());
  if (!user) return { ok: false, error: 'This account no longer exists.' };
  if (user.status && user.status !== 'active') return { ok: false, error: 'Your account access has been restricted.' };

  const issuedAt = payload.iat || (payload.exp - TOKEN_TTL_MS);
  if (user.sessionsRevokedAt && issuedAt < new Date(user.sessionsRevokedAt).getTime()) {
    return { ok: false, error: 'You were signed out. Please sign in again.' };
  }

  if (payload.jti) {
    const session = await cached(`${payload.sub}:${payload.jti}`, () =>
      UserSession.findOne({ jti: payload.jti }).select('revokedAt').lean());
    if (session?.revokedAt) return { ok: false, error: 'This session was signed out. Please sign in again.' };
    if (session && Date.now() - (lastTouched.get(payload.jti) || 0) > TOUCH_MS) {
      lastTouched.set(payload.jti, Date.now());
      UserSession.updateOne({ jti: payload.jti }, { lastSeenAt: new Date() }).catch(() => {});
    }
  }
  return { ok: true, emailVerified: !!user.emailVerified };
}

export function installSessionValidator() {
  setUserSessionValidator(validateUserSession);
}

// ── Admin / account actions ──────────────────────────────────────────────────
export async function listSessions(userId) {
  return UserSession.find({ userId: String(userId), expiresAt: { $gt: new Date() } })
    .sort({ lastSeenAt: -1 })
    .limit(50)
    .lean();
}

export async function revokeSession(userId, sessionId, revokedBy) {
  const result = await UserSession.findOneAndUpdate(
    { _id: sessionId, userId: String(userId), revokedAt: null },
    { revokedAt: new Date(), revokedBy },
    { returnDocument: 'after' }
  ).lean();
  invalidateSessionCache(userId);
  return result;
}

// Signs the user out on every device, including tokens issued before sessions were tracked
export async function revokeAllSessions(userId, revokedBy) {
  const now = new Date();
  await UserSession.updateMany({ userId: String(userId), revokedAt: null }, { revokedAt: now, revokedBy });
  await mongoose.models.User.updateOne({ _id: userId }, { sessionsRevokedAt: now });
  invalidateSessionCache(userId);
}

export function toPublicSession(s, currentJti) {
  return {
    id: String(s._id),
    device: s.device,
    browser: s.browser,
    os: s.os,
    ip: s.ip,
    provider: s.provider,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    revoked: !!s.revokedAt,
    revokedAt: s.revokedAt,
    current: !!currentJti && s.jti === currentJti
  };
}

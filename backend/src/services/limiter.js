import { dbReady } from '../admin/auth.js';
import { tryConsume } from '@cvmind/auto-apply-agent/rateLimit.js';
import RateBucket from '@cvmind/auto-apply-agent/models/RateBucket.js';

// Abuse limits (sign-ups, verification emails, support messages). Counted in MongoDB so every
// serverless instance shares them; without a database each process counts on its own.
const memory = new Map(); // `${key}|${windowStart}` -> count

function consumeInMemory(key, limit, windowMs, now) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const bucket = `${key}|${windowStart}`;
  if (memory.size > 5000) {
    for (const k of memory.keys()) if (Number(k.split('|').pop()) + windowMs < now) memory.delete(k);
  }
  const count = memory.get(bucket) || 0;
  const retryAt = new Date(windowStart + windowMs);
  if (count >= limit) return { ok: false, count, retryAt };
  memory.set(bucket, count + 1);
  return { ok: true, count: count + 1, retryAt };
}

// Counts one hit against key. { ok, count, retryAfter } with retryAfter in seconds.
// A database error lets the request through: a limiter outage must not lock everyone out.
export async function hitLimit(key, limit, windowMs) {
  const now = Date.now();
  let result;
  try {
    result = (await dbReady(0))
      ? await tryConsume(`abuse:${key}`, { limit, windowMs, now })
      : consumeInMemory(key, limit, windowMs, now);
  } catch (err) {
    console.error('[limiter] check failed, allowing request:', err.message);
    return { ok: true, count: 0, retryAfter: 0 };
  }
  return { ok: result.ok, count: result.count, retryAfter: Math.max(1, Math.ceil((result.retryAt.getTime() - now) / 1000)) };
}

// Whether key is already at its limit, without counting a hit (e.g. "too many failed sign-ins").
// { ok, retryAfter }; like hitLimit, a database error lets the request through.
export async function checkLimit(key, limit, windowMs) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const retryAfter = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
  try {
    const count = (await dbReady(0))
      ? (await RateBucket.findOne({ key: `abuse:${key}`, windowStart: new Date(windowStart) }).select('count').lean())?.count || 0
      : memory.get(`${key}|${windowStart}`) || 0;
    return { ok: count < limit, retryAfter };
  } catch (err) {
    console.error('[limiter] check failed, allowing request:', err.message);
    return { ok: true, retryAfter: 0 };
  }
}

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export const clientIp = (req) => String(req.ip || req.socket?.remoteAddress || 'unknown');

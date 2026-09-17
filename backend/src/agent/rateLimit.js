import RateBucket from './models/RateBucket.js';
import { RateLimitDeferral } from './errors.js';

// Fixed-window limiter: count < limit is part of the filter, so a full window turns the upsert into a duplicate-key error
export async function tryConsume(key, { limit, windowMs, now = Date.now() }) {
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const retryAt = new Date(windowStart.getTime() + windowMs);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const bucket = await RateBucket.findOneAndUpdate(
        { key, windowStart, count: { $lt: limit } },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(retryAt.getTime() + windowMs) } },
        { upsert: true, returnDocument: 'after' }
      ).lean();
      return { ok: true, count: bucket.count, remaining: limit - bucket.count, retryAt };
    } catch (err) {
      // First E11000 can be a race between two inserts for a fresh window; retrying settles it
      if (err?.code !== 11000) throw err;
    }
  }
  return { ok: false, count: limit, remaining: 0, retryAt };
}

export async function consumeOrDefer(key, options) {
  const result = await tryConsume(key, options);
  if (!result.ok) throw new RateLimitDeferral(result.retryAt, `Rate limit reached for ${key}`);
  return result;
}

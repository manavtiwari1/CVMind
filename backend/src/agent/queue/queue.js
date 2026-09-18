import os from 'os';
import crypto from 'crypto';
import QueueJob from '../models/QueueJob.js';
import { RateLimitDeferral } from '../errors.js';
import { RETRY_POLICY } from '../config.js';

const LOCK_FIELDS = { lockedBy: '', lockedUntil: '' };

export function makeWorkerId() {
  return `${os.hostname()}:${process.pid}:${crypto.randomBytes(3).toString('hex')}`;
}

export function backoffMs(attempts, random = Math.random) {
  const delay = Math.min(RETRY_POLICY.capMs, RETRY_POLICY.baseMs * 2 ** Math.max(0, attempts - 1));
  return Math.round(delay * (1 + RETRY_POLICY.jitter * random()));
}

function errorInfo(err, now) {
  return { message: String(err?.message || err).slice(0, 2000), code: err?.code ? String(err.code) : undefined, at: now };
}

// Returns the existing live job instead of a duplicate when dedupeKey is already queued or running
export async function enqueue({
  queue, type, payload = {}, userId, applicationId, priority = 0,
  maxAttempts = RETRY_POLICY.defaultMaxAttempts, runAt = new Date(), dedupeKey
}) {
  try {
    const job = await QueueJob.create({
      queue, type, payload, userId, applicationId, priority, maxAttempts, runAt,
      dedupeKey, activeDedupeKey: dedupeKey
    });
    return job.toObject();
  } catch (err) {
    if (err?.code === 11000 && dedupeKey) {
      const existing = await QueueJob.findOne({ activeDedupeKey: dedupeKey }).lean();
      if (existing) return existing;
    }
    throw err;
  }
}

// Atomically leases the next due job; a running job whose lease expired (crashed worker) is reclaimable
export function claim(queue, { workerId, leaseMs, now = new Date() }) {
  return QueueJob.findOneAndUpdate(
    {
      queue,
      $or: [
        { status: 'queued', runAt: { $lte: now } },
        { status: 'running', lockedUntil: { $lt: now } }
      ]
    },
    {
      $set: { status: 'running', lockedBy: workerId, lockedUntil: new Date(now.getTime() + leaseMs) },
      $inc: { attempts: 1 }
    },
    { sort: { priority: -1, runAt: 1 }, returnDocument: 'after' }
  ).lean();
}

const owned = (job, workerId) => ({ _id: job._id, lockedBy: workerId, status: 'running' });

export async function heartbeat(job, workerId, leaseMs) {
  const result = await QueueJob.updateOne(owned(job, workerId), { $set: { lockedUntil: new Date(Date.now() + leaseMs) } });
  return result.matchedCount === 1;
}

export async function complete(job, workerId, now = new Date()) {
  const result = await QueueJob.updateOne(owned(job, workerId), {
    $set: { status: 'succeeded', finishedAt: now },
    $unset: { ...LOCK_FIELDS, activeDedupeKey: '' }
  });
  return result.matchedCount === 1;
}

// Unclassified errors are retried; only errors marked retryable === false go straight to dead
export async function fail(job, workerId, err, now = new Date()) {
  if (err instanceof RateLimitDeferral) {
    const result = await QueueJob.updateOne(owned(job, workerId), {
      $set: { status: 'queued', runAt: err.retryAt },
      $unset: LOCK_FIELDS,
      $inc: { attempts: -1, deferrals: 1 }
    });
    return { outcome: 'deferred', runAt: err.retryAt, owned: result.matchedCount === 1 };
  }

  const lastError = errorInfo(err, now);
  if (err?.retryable !== false && job.attempts < job.maxAttempts) {
    const runAt = new Date(now.getTime() + backoffMs(job.attempts));
    const result = await QueueJob.updateOne(owned(job, workerId), {
      $set: { status: 'queued', runAt, lastError },
      $unset: LOCK_FIELDS
    });
    return { outcome: 'retry', runAt, owned: result.matchedCount === 1 };
  }

  const result = await QueueJob.updateOne(owned(job, workerId), {
    $set: { status: 'dead', finishedAt: now, lastError },
    $unset: { ...LOCK_FIELDS, activeDedupeKey: '' }
  });
  return { outcome: 'dead', owned: result.matchedCount === 1 };
}

// On shutdown, expire this worker's leases so another worker can pick the jobs up immediately
export async function releaseLeases(workerId) {
  const result = await QueueJob.updateMany({ lockedBy: workerId, status: 'running' }, { $set: { lockedUntil: new Date(0) } });
  return result.modifiedCount;
}

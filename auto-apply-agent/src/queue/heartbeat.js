import os from 'os';
import WorkerHeartbeat from '../models/WorkerHeartbeat.js';
import QueueJob from '../models/QueueJob.js';

export const HEARTBEAT_MS = 60 * 1000;
// Three missed beats: the worker is gone (or the server it ran on is asleep)
export const STALE_AFTER_MS = 3 * HEARTBEAT_MS;

function beat({ workerId, queues, startedAt, now = new Date() }) {
  return WorkerHeartbeat.updateOne(
    { _id: workerId },
    { $set: { host: os.hostname(), pid: process.pid, queues, startedAt, lastSeenAt: now } },
    { upsert: true }
  );
}

// Beats now and every minute until stopped; stopping removes the row so a clean shutdown shows at once.
// It waits for a beat still in flight first, or that beat would write the row back after the delete.
export function startHeartbeat({ workerId, queues, intervalMs = HEARTBEAT_MS, logger = console }) {
  const startedAt = new Date();
  let stopped = false;
  let inFlight = Promise.resolve();
  const tick = () => {
    if (stopped) return inFlight;
    inFlight = beat({ workerId, queues, startedAt }).catch((err) => logger.error('[agent] heartbeat failed:', err.message));
    return inFlight;
  };
  const first = tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return {
    ready: first,
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await inFlight;
      await WorkerHeartbeat.deleteOne({ _id: workerId }).catch(() => {});
    }
  };
}

// Whether any worker beat recently, and how much work is due but not picked up
export async function workerStatus({ now = new Date(), staleAfterMs = STALE_AFTER_MS } = {}) {
  const since = new Date(now.getTime() - staleAfterMs);
  const [live, last, dueJobs, oldestDue] = await Promise.all([
    WorkerHeartbeat.countDocuments({ lastSeenAt: { $gt: since } }),
    WorkerHeartbeat.findOne().sort({ lastSeenAt: -1 }).select('lastSeenAt').lean(),
    QueueJob.countDocuments({ status: 'queued', runAt: { $lte: now } }),
    QueueJob.findOne({ status: 'queued', runAt: { $lte: now } }).sort({ runAt: 1 }).select('runAt').lean()
  ]);
  return {
    running: live > 0,
    workers: live,
    lastSeenAt: last?.lastSeenAt || null,
    dueJobs,
    oldestDueAt: oldestDue?.runAt || null
  };
}

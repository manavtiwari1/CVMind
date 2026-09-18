import mongoose from 'mongoose';
import { QueueRunner } from './runner.js';
import { makeWorkerId } from './queue.js';
import { QUEUES } from '../models/QueueJob.js';
import { QUEUE_CONFIG } from '../config.js';
import { handlers } from '../handlers/index.js';
import { logEvent } from '../events.js';
import { markFailed } from '../pipeline.js';
import { startSweeper } from '../sweeper.js';

async function ensureConnected() {
  const { readyState } = mongoose.connection;
  if (readyState === 1) return;
  // db.js may already be connecting on import; wait for it instead of opening a second connection
  if (readyState === 2) return void await mongoose.connection.asPromise();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required to run agent workers.');
  await mongoose.connect(process.env.MONGODB_URI);
}

async function onDead(job, err) {
  if (job.applicationId) await markFailed(job.applicationId, job.type, err);
  if (!job.userId) return;
  await logEvent({
    applicationId: job.applicationId || null,
    userId: job.userId,
    type: 'queue.dead',
    actor: 'system',
    message: `${job.type} failed permanently: ${err.message}`,
    data: { jobType: job.type, attempts: job.attempts, code: err.code || null },
    queueJobId: job._id
  });
}

export async function startWorkers({ queues = QUEUES, logger = console } = {}) {
  await ensureConnected();
  const workerId = makeWorkerId();
  const runners = queues.map((queue) => new QueueRunner({
    queue,
    handlers,
    workerId,
    concurrency: QUEUE_CONFIG[queue].concurrency,
    leaseMs: QUEUE_CONFIG[queue].leaseMs,
    onDead,
    logger
  }).start());

  // Catches applications orphaned by a worker dying between a status change and the next enqueue
  const sweeper = startSweeper({ logger });

  logger.log(`[agent] workers started (${workerId}) on queues: ${queues.join(', ')}`);
  return {
    workerId,
    stop: async () => {
      sweeper.stop();
      await Promise.all(runners.map((runner) => runner.stop()));
    }
  };
}

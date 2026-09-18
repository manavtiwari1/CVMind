import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import QueueJob from '../../src/agent/models/QueueJob.js';
import { enqueue, claim, complete, fail, heartbeat, backoffMs, releaseLeases } from '../../src/agent/queue/queue.js';
import { QueueRunner } from '../../src/agent/queue/runner.js';
import { RetryableError, FatalError, RateLimitDeferral } from '../../src/agent/errors.js';
import { startTestMongo } from '../helpers/mongo.js';

let mongo;
before(async () => { mongo = await startTestMongo([QueueJob]); });
after(async () => { await mongo.stop(); });
beforeEach(async () => { await mongo.reset(); });

const silent = { log() {}, warn() {}, error() {} };
const waitFor = async (predicate, timeoutMs = 10000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for condition');
};

test('backoff grows exponentially and is capped', () => {
  assert.equal(backoffMs(1, () => 0), 5000);
  assert.equal(backoffMs(3, () => 0), 20000);
  assert.equal(backoffMs(20, () => 0), 15 * 60 * 1000);
  assert.equal(backoffMs(1, () => 1), 6000);
});

test('enqueue dedupes live jobs but allows a new job once the old one finishes', async () => {
  const first = await enqueue({ queue: 'parse', type: 't', dedupeKey: 'job:1' });
  const second = await enqueue({ queue: 'parse', type: 't', dedupeKey: 'job:1' });
  assert.equal(String(first._id), String(second._id));

  const claimed = await claim('parse', { workerId: 'w', leaseMs: 1000 });
  assert.ok(await complete(claimed, 'w'));
  const third = await enqueue({ queue: 'parse', type: 't', dedupeKey: 'job:1' });
  assert.notEqual(String(third._id), String(first._id));
});

test('claim honours runAt and priority', async () => {
  await enqueue({ queue: 'match', type: 'later', runAt: new Date(Date.now() + 60000), priority: 10 });
  await enqueue({ queue: 'match', type: 'low', priority: 0 });
  await enqueue({ queue: 'match', type: 'high', priority: 5 });
  assert.equal((await claim('match', { workerId: 'w', leaseMs: 1000 })).type, 'high');
  assert.equal((await claim('match', { workerId: 'w', leaseMs: 1000 })).type, 'low');
  assert.equal(await claim('match', { workerId: 'w', leaseMs: 1000 }), null);
});

test('expired lease is reclaimed and the old worker can no longer complete', async () => {
  await enqueue({ queue: 'tailor', type: 't' });
  const byA = await claim('tailor', { workerId: 'A', leaseMs: 30 });
  await new Promise((resolve) => setTimeout(resolve, 50));
  const byB = await claim('tailor', { workerId: 'B', leaseMs: 1000 });
  assert.equal(String(byB._id), String(byA._id));
  assert.equal(byB.attempts, 2);
  assert.equal(await heartbeat(byA, 'A', 1000), false);
  assert.equal(await complete(byA, 'A'), false);
  assert.equal(await complete(byB, 'B'), true);
});

test('retryable failures back off until maxAttempts, then the job is dead', async () => {
  await enqueue({ queue: 'parse', type: 't', maxAttempts: 2 });
  let job = await claim('parse', { workerId: 'w', leaseMs: 1000 });
  const first = await fail(job, 'w', new RetryableError('flaky'));
  assert.equal(first.outcome, 'retry');
  assert.ok(first.runAt > new Date());

  job = await claim('parse', { workerId: 'w', leaseMs: 1000, now: new Date(Date.now() + 60000) });
  const second = await fail(job, 'w', new RetryableError('flaky again'));
  assert.equal(second.outcome, 'dead');
  const stored = await QueueJob.findById(job._id).lean();
  assert.equal(stored.status, 'dead');
  assert.equal(stored.lastError.message, 'flaky again');
});

test('fatal errors go straight to dead', async () => {
  await enqueue({ queue: 'parse', type: 't' });
  const job = await claim('parse', { workerId: 'w', leaseMs: 1000 });
  assert.equal((await fail(job, 'w', new FatalError('bad input'))).outcome, 'dead');
});

test('rate-limit deferral reschedules without spending an attempt', async () => {
  await enqueue({ queue: 'apply', type: 't' });
  const job = await claim('apply', { workerId: 'w', leaseMs: 1000 });
  const retryAt = new Date(Date.now() + 3600000);
  assert.equal((await fail(job, 'w', new RateLimitDeferral(retryAt))).outcome, 'deferred');
  const stored = await QueueJob.findById(job._id).lean();
  assert.equal(stored.status, 'queued');
  assert.equal(stored.attempts, 0);
  assert.equal(stored.deferrals, 1);
  assert.equal(stored.runAt.getTime(), retryAt.getTime());
});

test('releaseLeases makes a worker\'s running jobs immediately claimable', async () => {
  await enqueue({ queue: 'parse', type: 't' });
  await claim('parse', { workerId: 'A', leaseMs: 60000 });
  assert.equal(await releaseLeases('A'), 1);
  assert.ok(await claim('parse', { workerId: 'B', leaseMs: 1000 }));
});

test('concurrent runners process every job exactly once', async () => {
  const runs = new Map();
  const handlers = {
    count: async (job) => {
      runs.set(job.payload.n, (runs.get(job.payload.n) || 0) + 1);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  };
  for (let n = 0; n < 20; n++) await enqueue({ queue: 'match', type: 'count', payload: { n } });

  const runners = ['A', 'B'].map((workerId) => new QueueRunner({
    queue: 'match', handlers, workerId, concurrency: 3, leaseMs: 5000, pollMinMs: 5, pollMaxMs: 20, logger: silent
  }).start());
  await waitFor(async () => (await QueueJob.countDocuments({ status: 'succeeded' })) === 20);
  await Promise.all(runners.map((runner) => runner.stop({ timeoutMs: 1000 })));

  assert.equal(runs.size, 20);
  assert.ok([...runs.values()].every((count) => count === 1));
});

test('runner marks unknown job types dead and calls onDead', async () => {
  const dead = [];
  await enqueue({ queue: 'parse', type: 'missing', userId: 'u1' });
  const runner = new QueueRunner({
    queue: 'parse', handlers: {}, workerId: 'w', pollMinMs: 5, pollMaxMs: 20, logger: silent,
    onDead: async (job, err) => { dead.push(err.code); }
  }).start();
  await waitFor(async () => dead.length === 1);
  await runner.stop({ timeoutMs: 1000 });
  assert.deepEqual(dead, ['NO_HANDLER']);
});

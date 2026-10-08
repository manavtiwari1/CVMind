import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import WorkerHeartbeat from '@cvmind/auto-apply-agent/models/WorkerHeartbeat.js';
import QueueJob from '@cvmind/auto-apply-agent/models/QueueJob.js';
import { startHeartbeat, workerStatus, STALE_AFTER_MS } from '@cvmind/auto-apply-agent/queue/heartbeat.js';
import { startAgentTestApp, AGENT_MODELS } from '../helpers/agentFixtures.js';

let testApp;
before(async () => { testApp = await startAgentTestApp([...AGENT_MODELS, WorkerHeartbeat]); });
after(async () => { await testApp.stop(); });
beforeEach(async () => { await testApp.reset(); });

test('with no worker, the status says so and counts the work waiting for one', async () => {
  await QueueJob.create({ queue: 'parse', type: 'resume.parse', payload: {}, runAt: new Date(Date.now() - 60 * 60 * 1000) });
  await QueueJob.create({ queue: 'parse', type: 'resume.parse', payload: {}, runAt: new Date(Date.now() + 60 * 60 * 1000) });
  const status = await workerStatus();
  assert.equal(status.running, false);
  assert.equal(status.workers, 0);
  assert.equal(status.lastSeenAt, null);
  assert.equal(status.dueJobs, 1, 'a job deferred to later is not waiting yet');
  assert.ok(status.oldestDueAt);
});

test('a running worker beats, goes stale when it stops beating, and disappears on a clean stop', async () => {
  const heartbeat = startHeartbeat({ workerId: 'test-worker', queues: ['parse'], intervalMs: 60 * 60 * 1000 });
  await heartbeat.ready;
  let status = await workerStatus();
  assert.equal(status.running, true);
  assert.equal(status.workers, 1);

  // Seen from a little after its last beat went stale
  status = await workerStatus({ now: new Date(Date.now() + STALE_AFTER_MS + 1000) });
  assert.equal(status.running, false);
  assert.ok(status.lastSeenAt, 'the last sighting is still reported');

  await heartbeat.stop();
  assert.equal(await WorkerHeartbeat.countDocuments(), 0);
});

test('stopping right after starting leaves no row behind', async () => {
  // The first beat is still being written when stop() runs
  const heartbeat = startHeartbeat({ workerId: 'quick-stop', queues: ['parse'], intervalMs: 60 * 60 * 1000 });
  await heartbeat.stop();
  assert.equal(await WorkerHeartbeat.countDocuments({ _id: 'quick-stop' }), 0);
});

test('signed-in users only learn whether a worker is running', async () => {
  const res = await testApp.api('/worker-status');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, { running: false });
  assert.equal((await testApp.api('/worker-status', { token: null })).status, 401);
});

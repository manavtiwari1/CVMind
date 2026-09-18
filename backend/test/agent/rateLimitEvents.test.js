import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import RateBucket from '../../src/agent/models/RateBucket.js';
import ApplicationEvent from '../../src/agent/models/ApplicationEvent.js';
import { tryConsume, consumeOrDefer } from '../../src/agent/rateLimit.js';
import { logEvent, listEvents, redact } from '../../src/agent/events.js';
import { RateLimitDeferral } from '../../src/agent/errors.js';
import { startTestMongo } from '../helpers/mongo.js';

let mongo;
before(async () => { mongo = await startTestMongo([RateBucket, ApplicationEvent]); });
after(async () => { await mongo.stop(); });
beforeEach(async () => { await mongo.reset(); });

const HOUR = 60 * 60 * 1000;

test('tryConsume allows up to the limit within a window, then blocks until the next window', async () => {
  const now = Date.UTC(2026, 8, 14, 10, 15);
  const opts = { limit: 2, windowMs: HOUR, now };
  assert.equal((await tryConsume('user:u1:company:acme', opts)).ok, true);
  assert.equal((await tryConsume('user:u1:company:acme', opts)).ok, true);
  const blocked = await tryConsume('user:u1:company:acme', opts);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAt.getTime(), Date.UTC(2026, 8, 14, 11, 0));

  assert.equal((await tryConsume('user:u1:company:acme', { ...opts, now: now + HOUR })).ok, true);
  assert.equal((await tryConsume('user:u1:company:other', opts)).ok, true);
});

test('tryConsume never exceeds the limit under concurrent calls', async () => {
  const opts = { limit: 5, windowMs: HOUR, now: Date.now() };
  const results = await Promise.all(Array.from({ length: 20 }, () => tryConsume('ats:boards.greenhouse.io', opts)));
  assert.equal(results.filter((r) => r.ok).length, 5);
});

test('consumeOrDefer throws a RateLimitDeferral when the window is full', async () => {
  const opts = { limit: 1, windowMs: HOUR, now: Date.now() };
  await consumeOrDefer('user:u1:daily', opts);
  await assert.rejects(consumeOrDefer('user:u1:daily', opts), RateLimitDeferral);
});

test('redact hides personal values but keeps structure', () => {
  const out = redact({ fieldKeys: ['first_name'], counts: { mapped: 3 }, items: [{ canonicalKey: 'email', value: 'a@b.c' }], candidateEmail: 'a@b.c' });
  assert.deepEqual(out, { fieldKeys: ['first_name'], counts: { mapped: 3 }, items: [{ canonicalKey: 'email', value: '[redacted]' }], candidateEmail: '[redacted]' });
});

test('logEvent stores redacted events in order and never throws', async () => {
  const applicationId = new mongoose.Types.ObjectId();
  await logEvent({ applicationId, userId: 'u1', type: 'job.parsed', data: { phone: '123' } });
  await logEvent({ applicationId, userId: 'u1', type: 'score.computed', data: { total: 81 } });
  const events = await listEvents({ applicationId, userId: 'u1' });
  assert.deepEqual(events.map((e) => e.type), ['job.parsed', 'score.computed']);
  assert.equal(events[0].data.phone, '[redacted]');
  assert.equal(await listEvents({ applicationId, userId: 'someone-else' }).then((e) => e.length), 0);

  assert.equal(await logEvent({ type: 'missing.user' }), null);
});

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Notification emails: only verified addresses, sent through Resend's batch API, retried once when rate-limited.
// Resend is faked by intercepting fetch calls to api.resend.com; everything else goes through.
let mongod;
let server;
let base;
let mongoose;
let ownerToken;
const resendCalls = [];
let resendReplies = [];

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_notify_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = 're_test_key';

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input?.url || input);
    if (!url.startsWith('https://api.resend.com')) return realFetch(input, init);
    resendCalls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    const reply = resendReplies.shift() || { status: 200, json: { data: [] } };
    return new Response(JSON.stringify(reply.json), { status: reply.status, headers: { 'content-type': 'application/json' } });
  };

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  const adminRouter = (await import('../../src/admin/router.js')).default;
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;

  const login = await call('/api/admin/login', { method: 'POST', body: { username: 'owner', password: 'owner-password-123' } });
  ownerToken = login.body.token;

  await import('../../src/db.js');
  const User = mongoose.models.User;
  await User.create([
    { email: 'ada@example.com', name: 'Ada', password: 'x', emailVerified: true },
    { email: 'bob@example.com', name: 'Bob', password: 'x', emailVerified: true },
    { email: 'fake@mailinator.com', name: 'Fake', password: 'x', emailVerified: false }
  ]);
});

after(async () => {
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

test('preview counts who would get the email', async () => {
  const res = await call('/api/admin/notifications/preview', { method: 'POST', token: ownerToken, body: { segment: {} } });
  assert.equal(res.body.data.count, 3);
  assert.equal(res.body.data.emailCount, 2);
});

test('notification emails go only to verified addresses, in one batch, and a rate limit is retried', async () => {
  resendCalls.length = 0;
  resendReplies = [
    { status: 429, json: { statusCode: 429, name: 'rate_limit_exceeded', message: 'Too many requests' } },
    { status: 200, json: { data: [{ id: 'e1' }], errors: [{ index: 1, message: 'Invalid `to` field' }] } }
  ];
  const res = await call('/api/admin/notifications', {
    method: 'POST', token: ownerToken,
    body: { title: 'Meet Leo', body: 'Leo guides you.', link: '/tailor', channels: ['in-app', 'email'], segment: {} }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.recipientCount, 3, 'in-app reaches everyone');

  const batches = resendCalls.filter((c) => c.url.endsWith('/emails/batch'));
  assert.equal(batches.length, 2, 'rate-limited batch was retried once');
  const recipients = batches[1].body.map((m) => m.to[0]).sort();
  assert.deepEqual(recipients, ['ada@example.com', 'bob@example.com']);
  assert.ok(batches[1].body[0].html.includes('Meet Leo'));
  assert.ok(batches[1].body[0].html.includes('/tailor'));

  const saved = await mongoose.connection.db.collection('notifications').findOne({ title: 'Meet Leo' });
  assert.equal(saved.emailSent, 1);
  assert.equal(saved.emailFailed, 1);
  assert.equal(saved.emailSkipped, 1);
});

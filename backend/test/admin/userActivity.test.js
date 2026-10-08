import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// db.js and the admin module read MONGODB_URI at import time, so the in-memory server starts first
let mongod;
let server;
let base;
let mongoose;
let ownerToken;
let AuthEvent;
let User;

const DAY = 24 * 60 * 60 * 1000;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_user_activity_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = '';

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  const adminRouter = (await import('../../src/admin/router.js')).default;
  ({ AuthEvent } = await import('../../src/admin/models.js'));
  const { installSessionValidator } = await import('../../src/admin/sessions.js');
  installSessionValidator();

  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));
  User = mongoose.model('User');

  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;

  const login = await call('/api/admin/login', { method: 'POST', body: { username: 'owner', password: 'owner-password-123' } });
  ownerToken = login.body.token;
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

const admin = (path, opts = {}) => call(`/api/admin/user-activity${path}`, { ...opts, token: ownerToken });
const old = () => new Date(Date.now() - 90 * DAY);

test('accounts are sorted into active, inactive and never seen', async () => {
  const recent = await User.create({ email: 'recent@example.com', name: 'Recent', password: 'x', createdAt: old() });
  const quiet = await User.create({ email: 'quiet@example.com', name: 'Quiet', password: 'x', createdAt: old() });
  await User.create({ email: 'ghost@example.com', name: 'Ghost', password: 'x', createdAt: old() });
  await User.create({ email: 'newbie@example.com', name: 'Newbie', password: 'x' });
  await AuthEvent.create({ userId: String(recent._id), email: recent.email, event: 'LOGIN_SUCCESS', createdAt: new Date(Date.now() - 2 * DAY) });
  await AuthEvent.create({ userId: String(quiet._id), email: quiet.email, event: 'LOGIN_SUCCESS', createdAt: new Date(Date.now() - 45 * DAY) });

  const all = await admin('?days=30');
  assert.equal(all.status, 200);
  const by = Object.fromEntries(all.body.data.map((r) => [r.email, r.activity]));
  assert.equal(by['recent@example.com'], 'active');
  assert.equal(by['quiet@example.com'], 'inactive');
  assert.equal(by['ghost@example.com'], 'never');
  // Joined this week: not counted as inactive
  assert.equal(by['newbie@example.com'], 'active');
  assert.ok(all.body.trackingSince);

  const inactive = await admin('?activity=inactive&days=30');
  assert.deepEqual(inactive.body.data.map((r) => r.email).sort(), ['ghost@example.com', 'quiet@example.com']);
  // With a 60-day window the account last seen 45 days ago counts as active again
  assert.equal((await admin('?activity=active&days=60')).body.data.some((r) => r.email === 'quiet@example.com'), true);
});

test('bulk suspend, ban and reactivate need a reason and change each account once', async () => {
  const a = await User.create({ email: 'bulk-a@example.com', name: 'A', password: 'x' });
  const b = await User.create({ email: 'bulk-b@example.com', name: 'B', password: 'x', status: 'banned' });
  const ids = [String(a._id), String(b._id)];

  assert.equal((await admin('/bulk', { method: 'POST', body: { action: 'ban', ids } })).status, 400);
  const banned = await admin('/bulk', { method: 'POST', body: { action: 'ban', ids, reason: 'Spam sign-ups' } });
  assert.equal(banned.status, 200);
  assert.deepEqual(banned.body.data, { done: 1, unchanged: 1 });
  assert.equal((await User.findById(a._id).lean()).status, 'banned');

  const back = await admin('/bulk', { method: 'POST', body: { action: 'reactivate', ids } });
  assert.deepEqual(back.body.data, { done: 2, unchanged: 0 });
  assert.equal((await User.countDocuments({ _id: { $in: ids }, status: 'active' })), 2);
});

test('bulk delete needs the typed confirmation', async () => {
  const c = await User.create({ email: 'bulk-c@example.com', name: 'C', password: 'x' });
  const d = await User.create({ email: 'bulk-d@example.com', name: 'D', password: 'x' });
  const ids = [String(c._id), String(d._id)];
  assert.equal((await admin('/bulk', { method: 'POST', body: { action: 'delete', ids, confirm: 'DELETE 1' } })).status, 400);
  const res = await admin('/bulk', { method: 'POST', body: { action: 'delete', ids, confirm: 'DELETE 2' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.done, 2);
  assert.equal(await User.countDocuments({ _id: { $in: ids } }), 0);
});

test('bulk email refuses to send when email is not configured, and bad input is rejected', async () => {
  const e = await User.create({ email: 'bulk-e@example.com', name: 'E', password: 'x', emailVerified: true });
  const ids = [String(e._id)];
  assert.equal((await admin('/bulk', { method: 'POST', body: { action: 'email', ids, subject: '', body: 'Hi' } })).status, 400);
  assert.equal((await admin('/bulk', { method: 'POST', body: { action: 'email', ids, subject: 'Hi', body: 'Hello' } })).status, 503);
  assert.equal((await admin('/bulk', { method: 'POST', body: { action: 'explode', ids } })).status, 400);
  assert.equal((await admin('/bulk', { method: 'POST', body: { action: 'ban', ids: [], reason: 'x' } })).status, 400);
  assert.equal((await call('/api/admin/user-activity/bulk', { method: 'POST', body: { action: 'ban', ids, reason: 'x' } })).status, 401);
});

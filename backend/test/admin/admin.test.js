import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// db.js and the admin module read MONGODB_URI at import time, so the in-memory server starts first
let mongod;
let server;
let base;
let mongoose;
let signToken;
let requireUser;
let ownerToken;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_admin_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  // Empty (not deleted) so dotenv can't load a real key from .env and send real email
  process.env.RESEND_API_KEY = '';

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken, requireUser } = await import('../../src/services/authToken.js'));
  const adminRouter = (await import('../../src/admin/router.js')).default;
  const publicRoutes = (await import('../../src/admin/publicRoutes.js')).default;
  const { featureGate } = await import('../../src/admin/settings.js');
  const { installSessionValidator } = await import('../../src/admin/sessions.js');
  installSessionValidator();

  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  const app = express();
  app.use(express.json());
  app.use(featureGate);
  app.use('/api/admin', adminRouter);
  app.use('/', publicRoutes);
  app.get('/api/me', requireUser, (req, res) => res.json({ ok: true, sub: req.auth.sub }));
  app.post('/api/tailor', (req, res) => res.json({ ok: true }));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
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
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* CSV */ }
  return { status: res.status, body: json, text };
}

async function login(username, password) {
  const res = await call('/api/admin/login', { method: 'POST', body: { username, password } });
  return res;
}

async function createUser(email, extra = {}) {
  const User = mongoose.model('User');
  return User.create({ email, name: email.split('@')[0], password: 'x', ...extra });
}

test('admin login seeds the env owner and rejects bad credentials', async () => {
  const bad = await login('owner', 'wrong');
  assert.equal(bad.status, 401);

  const ok = await login('owner', 'owner-password-123');
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  assert.equal(ok.body.admin.role, 'owner');
  assert.equal(ok.body.secret, undefined, 'the old shared secret must never be returned');
  ownerToken = ok.body.token;

  const me = await call('/api/admin/me', { token: ownerToken });
  assert.equal(me.status, 200);
  assert.ok(me.body.admin.permissions.includes('team.manage'));

  const noToken = await call('/api/admin/users');
  assert.equal(noToken.status, 401);
});

test('roles limit what a team member can do', async () => {
  const created = await call('/api/admin/team', { method: 'POST', token: ownerToken, body: { username: 'support1', name: 'Sam', role: 'support', password: 'support-pass-1' } });
  assert.equal(created.status, 200);

  const { body } = await login('support1', 'support-pass-1');
  const supportToken = body.token;
  assert.equal((await call('/api/admin/users', { token: supportToken })).status, 200);
  assert.equal((await call('/api/admin/payments', { token: supportToken })).status, 403);
  assert.equal((await call('/api/admin/team', { token: supportToken })).status, 403);

  // Changing the role signs the member out
  await call(`/api/admin/team/${created.body.data.id}`, { method: 'PATCH', token: ownerToken, body: { role: 'viewer' } });
  assert.equal((await call('/api/admin/users', { token: supportToken })).status, 401);

  // The last owner can't be demoted
  const team = await call('/api/admin/team', { token: ownerToken });
  const owner = team.body.data.find((m) => m.role === 'owner');
  const demote = await call(`/api/admin/team/${owner.id}`, { method: 'PATCH', token: ownerToken, body: { role: 'admin' } });
  assert.equal(demote.status, 400);
});

test('suspending a user is audited and blocks their existing token', async () => {
  const user = await createUser('suspend-me@example.com');
  const userToken = signToken({ sub: String(user._id), kind: 'user', email: user.email });
  assert.equal((await call('/api/me', { token: userToken })).status, 200);

  const noReason = await call(`/api/admin/users/${user._id}/status`, { method: 'POST', token: ownerToken, body: { status: 'suspended' } });
  assert.equal(noReason.status, 400);

  const res = await call(`/api/admin/users/${user._id}/status`, { method: 'POST', token: ownerToken, body: { status: 'suspended', reason: 'Spam' } });
  assert.equal(res.status, 200);
  assert.equal((await call('/api/me', { token: userToken })).status, 401);

  const auditRes = await call('/api/admin/audit?action=user.suspended', { token: ownerToken });
  assert.equal(auditRes.body.total, 1);
  assert.equal(auditRes.body.data[0].targetLabel, 'suspend-me@example.com');
  assert.equal(auditRes.body.data[0].details.reason, 'Spam');
});

test('revoking a session signs out only that token', async () => {
  const { recordSession } = await import('../../src/admin/sessions.js');
  const user = await createUser('sessions@example.com');
  const tokenA = signToken({ sub: String(user._id), kind: 'user', email: user.email, jti: 'session-a' });
  const tokenB = signToken({ sub: String(user._id), kind: 'user', email: user.email, jti: 'session-b' });
  await recordSession({ jti: 'session-a', userId: user._id, email: user.email, req: { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0' }, ip: '1.2.3.4' } });
  await recordSession({ jti: 'session-b', userId: user._id, email: user.email, req: { headers: {} } });

  const detail = await call(`/api/admin/users/${user._id}`, { token: ownerToken });
  assert.equal(detail.body.data.sessions.length, 2);
  const sessionA = detail.body.data.sessions.find((s) => s.browser === 'Chrome');
  assert.equal(sessionA.os, 'Windows');

  await call(`/api/admin/users/${user._id}/sessions/${sessionA.id}`, { method: 'DELETE', token: ownerToken });
  assert.equal((await call('/api/me', { token: tokenA })).status, 401);
  assert.equal((await call('/api/me', { token: tokenB })).status, 200);

  // Sign out everywhere also covers tokens without a session id
  const legacy = signToken({ sub: String(user._id), kind: 'user', email: user.email });
  await new Promise((r) => setTimeout(r, 5));
  await call(`/api/admin/users/${user._id}/sessions/revoke-all`, { method: 'POST', token: ownerToken });
  assert.equal((await call('/api/me', { token: tokenB })).status, 401);
  assert.equal((await call('/api/me', { token: legacy })).status, 401);
});

test('feature switches and maintenance mode block the public API, not the admin panel', async () => {
  assert.equal((await call('/api/tailor', { method: 'POST' })).status, 200);

  await call('/api/admin/system/settings/features', { method: 'PUT', token: ownerToken, body: { tailor: false } });
  const blocked = await call('/api/tailor', { method: 'POST' });
  assert.equal(blocked.status, 503);
  assert.equal(blocked.body.code, 'FEATURE_DISABLED');
  const config = await call('/api/config');
  assert.deepEqual(config.body.disabledFeatures, ['tailor']);

  await call('/api/admin/system/settings/maintenance', { method: 'PUT', token: ownerToken, body: { enabled: true, message: 'Back soon' } });
  const down = await call('/api/me');
  assert.equal(down.status, 503);
  assert.equal(down.body.error, 'Back soon');
  assert.equal((await call('/api/admin/me', { token: ownerToken })).status, 200);

  await call('/api/admin/system/settings/maintenance', { method: 'PUT', token: ownerToken, body: { enabled: false } });
  await call('/api/admin/system/settings/features', { method: 'PUT', token: ownerToken, body: { tailor: true } });
  assert.equal((await call('/api/tailor', { method: 'POST' })).status, 200);
});

test('version gates tell old clients to update', async () => {
  const bad = await call('/api/admin/system/settings/versions', { method: 'PUT', token: ownerToken, body: { extension: { minVersion: '2.0', latestVersion: '1.5' } } });
  assert.equal(bad.status, 400);

  await call('/api/admin/system/settings/versions', { method: 'PUT', token: ownerToken, body: { extension: { minVersion: '1.2.0', latestVersion: '1.3.0', updateUrl: 'https://example.com/ext' } } });
  assert.equal((await call('/api/config/version?client=extension&v=1.1.0')).body.verdict, 'required');
  assert.equal((await call('/api/config/version?client=extension&v=1.2.5')).body.verdict, 'recommended');
  assert.equal((await call('/api/config/version?client=extension&v=1.3.0')).body.verdict, 'ok');
  assert.equal((await call('/api/config/version?client=android&v=1.0')).body.verdict, 'ok');
});

test('coupons validate limits and cannot be over-redeemed', async () => {
  const { evaluateCoupon, redeemCoupon } = await import('../../src/admin/coupons.js');
  const created = await call('/api/admin/payments/coupons', { method: 'POST', token: ownerToken, body: { code: 'launch20', type: 'percent', value: 20, maxUses: 1, perUserLimit: 1 } });
  assert.equal(created.status, 200);
  assert.equal(created.body.data.code, 'LAUNCH20');

  const valid = await call('/api/coupons/validate', { method: 'POST', body: { code: 'launch20', amount: 200, email: 'a@x.com' } });
  assert.equal(valid.body.data.discount, 40);
  assert.equal(valid.body.data.finalAmount, 160);

  const first = await evaluateCoupon('LAUNCH20', { email: 'a@x.com', amount: 200 });
  assert.equal(await redeemCoupon(first.coupon, { email: 'a@x.com', amount: 200, discount: 40, transactionId: 't1' }), true);
  // A second checkout that validated before the first one finished still can't redeem
  assert.equal(await redeemCoupon(first.coupon, { email: 'b@x.com', amount: 200, discount: 40, transactionId: 't2' }), false);

  const usedUp = await call('/api/coupons/validate', { method: 'POST', body: { code: 'LAUNCH20', amount: 200, email: 'c@x.com' } });
  assert.equal(usedUp.status, 400);

  const del = await call(`/api/admin/payments/coupons/${created.body.data.id}`, { method: 'DELETE', token: ownerToken });
  assert.equal(del.status, 400, 'used coupons are kept for the records');
});

test('contact messages become tickets and notes are internal', async () => {
  const { ticketFromContact } = await import('../../src/admin/tickets.js');
  const first = await ticketFromContact({ _id: 'c1', name: 'Asha', email: 'Asha@Example.com', subject: 'Billing', message: 'Help please' });
  const again = await ticketFromContact({ _id: 'c1', name: 'Asha', email: 'asha@example.com', subject: 'Billing', message: 'Help please' });
  assert.ok(first.number >= 1001);
  assert.equal(again, null, 'the same contact message never makes two tickets');

  const note = await call(`/api/admin/tickets/${first._id}/messages`, { method: 'POST', token: ownerToken, body: { kind: 'note', body: 'Checking with finance' } });
  assert.equal(note.status, 200);
  assert.equal(note.body.data.status, 'open');
  assert.equal(note.body.data.messages.at(-1).emailed, false);

  // Replies need email; without it the reply is refused instead of silently dropped
  const reply = await call(`/api/admin/tickets/${first._id}/messages`, { method: 'POST', token: ownerToken, body: { kind: 'reply', body: 'Hi' } });
  assert.equal(reply.status, 503);
});

test('in-app notifications reach the right users and track reads', async () => {
  const target = await createUser('notify-me@example.com');
  const other = await createUser('not-me@example.com');
  const sent = await call('/api/admin/notifications', { method: 'POST', token: ownerToken, body: { title: 'Hello', body: 'New feature', channels: ['in-app'], segment: { emails: ['notify-me@example.com'] } } });
  assert.equal(sent.status, 200);
  assert.equal(sent.body.data.recipientCount, 1);

  const targetToken = signToken({ sub: String(target._id), kind: 'user', email: target.email });
  const otherToken = signToken({ sub: String(other._id), kind: 'user', email: other.email });
  const mine = await call('/api/notifications', { token: targetToken });
  assert.equal(mine.body.unread, 1);
  assert.equal((await call('/api/notifications', { token: otherToken })).body.data.length, 0);

  await call('/api/notifications/read', { method: 'POST', token: targetToken, body: {} });
  assert.equal((await call('/api/notifications', { token: targetToken })).body.unread, 0);
});

test('moderators can hide reported work', async () => {
  const user = await createUser('author@example.com');
  const work = await mongoose.model('Work').create({ userId: String(user._id), title: 'My portfolio', type: 'portfolio', templateId: 't', htmlContent: '<h1>Hi</h1>' });
  const report = await call('/api/reports', { method: 'POST', body: { targetType: 'work', targetId: String(work._id), reason: 'Spam' } });
  assert.equal(report.status, 200);

  const reports = await call('/api/admin/content/moderation/reports?status=open', { token: ownerToken });
  assert.equal(reports.body.open, 1);
  assert.equal(reports.body.data[0].targetLabel, 'My portfolio');

  const hide = await call(`/api/admin/content/moderation/items/work/${work._id}/hide`, { method: 'POST', token: ownerToken, body: { reason: 'Spam' } });
  assert.equal(hide.status, 200);
  assert.equal((await mongoose.model('Work').findById(work._id).lean()).hidden, true);
});

test('CSV exports escape formulas and quotes', async () => {
  await createUser('csv@example.com', { name: '=HYPERLINK("http://evil")' });
  const res = await call('/api/admin/export/users?q=csv@example.com', { token: ownerToken });
  assert.equal(res.status, 200);
  const lines = res.text.replace(/^﻿/, '').trim().split('\n');
  assert.equal(lines[0], 'id,name,email,provider,status,statusReason,emailVerified,createdAt');
  assert.equal(lines.length, 2);
  assert.match(lines[1], /,"'=HYPERLINK\(""http:\/\/evil""\)",csv@example.com,password,active,,false,/);
});

test('dashboard overview counts real records', async () => {
  const res = await call('/api/admin/analytics/overview?range=7', { token: ownerToken });
  assert.equal(res.status, 200);
  const { kpis, series } = res.body.data;
  assert.equal(kpis.totalUsers, await mongoose.model('User').countDocuments());
  assert.equal(series.length, 7);
  assert.equal(series.reduce((sum, d) => sum + d.signups, 0), kpis.signups.range);
});

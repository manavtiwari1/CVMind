import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// db.js reads MONGODB_URI at import time, so the in-memory server starts before the app is imported
let mongod;
let server;
let base;
let mongoose;
let issueVerification;
let invalidateSettings;
let AppSetting;
const sentLinks = [];

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_verify_test');
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_URL = 'https://www.cvmind.in';
  // Empty (not deleted) so dotenv can't load a real key: links are logged instead of emailed
  process.env.RESEND_API_KEY = '';
  process.env.NODE_ENV = 'test';

  const warn = console.warn;
  console.warn = (...args) => {
    const match = String(args[0]).match(/verify-email\?token=(\S+)/);
    if (match) sentLinks.push(match[1]);
    else warn(...args);
  };

  mongoose = (await import('mongoose')).default;
  const app = (await import('../../src/index.js')).default;
  ({ issueVerification } = await import('../../src/services/emailVerification.js'));
  ({ invalidateSettings } = await import('../../src/admin/settings.js'));
  ({ AppSetting } = await import('../../src/admin/models.js'));
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));
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
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

const signup = (email, extra = {}) => call('/api/auth/signup', { method: 'POST', body: { name: 'Test User', email, password: 'secret123', ...extra } });
const userDoc = (email) => mongoose.connection.db.collection('users').findOne({ email });

test('a new account starts unverified, is emailed a hashed single-use link, and is kept out of gated features', async () => {
  const res = await signup('ada@example.com');
  assert.equal(res.status, 200);
  assert.equal(res.body.user.emailVerified, false);
  const token = res.body.user.token;

  const raw = sentLinks.at(-1);
  assert.ok(raw, 'verification link was issued');
  const stored = await userDoc('ada@example.com');
  assert.equal(stored.emailVerified, false);
  assert.ok(stored.emailVerificationTokenHash);
  assert.notEqual(stored.emailVerificationTokenHash, raw, 'raw token is never stored');

  const tailor = await call('/api/tailor', { method: 'POST', token });
  assert.equal(tailor.status, 403);
  assert.equal(tailor.body.code, 'EMAIL_NOT_VERIFIED');

  const contact = await call('/api/contact', { method: 'POST', token, body: { message: 'Legal notice', subject: 'URGENT' } });
  assert.equal(contact.status, 403);
  assert.match(contact.body.error, /verify your email before contacting CVMind Support/);

  const save = await call('/api/user/work', { method: 'POST', token, body: {} });
  assert.equal(save.status, 403);

  // Only the account's own session learns the flag
  const own = await call('/api/auth/account-status?email=ada@example.com', { token });
  assert.equal(own.body.emailVerified, false);
  const other = await call('/api/auth/account-status?email=ada@example.com');
  assert.equal(other.body.emailVerified, undefined);

  const verify = await call('/api/auth/verify-email', { method: 'POST', body: { token: raw } });
  assert.equal(verify.status, 200);
  assert.equal(verify.body.code, 'VERIFIED');
  const reuse = await call('/api/auth/verify-email', { method: 'POST', body: { token: raw } });
  assert.equal(reuse.status, 400);
  assert.equal(reuse.body.code, 'INVALID');

  const verified = await userDoc('ada@example.com');
  assert.equal(verified.emailVerified, true);
  assert.equal(verified.emailVerificationTokenHash, '');

  // Session cache is cleared on verification, so access opens straight away
  const saveAfter = await call('/api/user/work', { method: 'POST', token, body: {} });
  assert.equal(saveAfter.status, 400, 'reaches the route (which rejects the empty body)');

  const ticket = await call('/api/contact', { method: 'POST', token, body: { name: 'Someone Else', email: 'spoof@example.com', message: 'Hello', subject: 'Question' } });
  assert.equal(ticket.status, 200);
  const saved = await mongoose.connection.db.collection('tickets').findOne({});
  assert.equal(saved.email, 'ada@example.com', 'ticket uses the account email, not the form');
  assert.equal(saved.priority, 'normal');

  const events = await mongoose.connection.db.collection('authevents').distinct('event', { email: 'ada@example.com' });
  for (const e of ['USER_REGISTERED', 'EMAIL_VERIFIED', 'SUPPORT_TICKET_CREATED']) assert.ok(events.includes(e), e);
});

test('support messages are limited per account per day', async () => {
  const login = await signup('limits@example.com');
  const token = login.body.user.token;
  await call('/api/auth/verify-email', { method: 'POST', body: { token: sentLinks.at(-1) } });
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await call('/api/contact', { method: 'POST', token, body: { message: `Message ${i}` } })).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
});

test('expired links are refused, and resends respect the cooldown', async () => {
  const res = await signup('late@example.com');
  const token = res.body.user.token;

  const resend = await call('/api/auth/resend-verification', { method: 'POST', token });
  assert.equal(resend.status, 429);
  assert.equal(resend.body.code, 'COOLDOWN');
  assert.ok(resend.body.retryAfter > 0 && resend.body.retryAfter <= 60);

  const user = await userDoc('late@example.com');
  await issueVerification({ ...user, id: String(user._id) });
  const raw = sentLinks.at(-1);
  await mongoose.connection.db.collection('users').updateOne({ _id: user._id }, { $set: { emailVerificationExpires: new Date(Date.now() - 1000) } });
  const verify = await call('/api/auth/verify-email', { method: 'POST', body: { token: raw } });
  assert.equal(verify.status, 400);
  assert.equal(verify.body.code, 'EXPIRED');
  assert.match(verify.body.error, /expired/);
});

test('signed-out visitors keep a few ATS checks; other AI tools need sign-in', async () => {
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await call('/api/analyze', { method: 'POST' })).status);
  assert.equal(statuses.filter((s) => s !== 429).length, 5);
  assert.equal(statuses.at(-1), 429);

  const tailor = await call('/api/tailor', { method: 'POST' });
  assert.equal(tailor.status, 401);
  assert.equal(tailor.body.code, 'AUTH_REQUIRED');
});

test('disposable addresses must pass a captcha and are flagged for review', async () => {
  const res = await signup('someone@mailinator.com');
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'CAPTCHA_REQUIRED');
  assert.equal(await userDoc('someone@mailinator.com'), null);
});

test('the admin switch turns the verification requirement off', async () => {
  const res = await signup('switch@example.com');
  const token = res.body.user.token;
  await AppSetting.findOneAndUpdate({ key: 'security' }, { value: { requireEmailVerification: false } }, { upsert: true });
  invalidateSettings();
  try {
    const save = await call('/api/user/work', { method: 'POST', token, body: {} });
    assert.equal(save.status, 400);
  } finally {
    await AppSetting.deleteOne({ key: 'security' });
    invalidateSettings();
  }
});

test('sign-ups are limited per IP', async () => {
  // Earlier tests already used part of this hour's allowance from 127.0.0.1
  let last;
  for (let i = 0; i < 6; i++) last = await signup(`burst${i}@example.com`);
  assert.equal(last.status, 429);
  assert.equal(last.body.code, 'RATE_LIMITED');
});

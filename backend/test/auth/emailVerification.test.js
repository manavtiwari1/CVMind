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

test('wrong passwords lock the account for a while, even for the right password', async () => {
  const bcrypt = (await import('bcryptjs')).default;
  const { createUser } = await import('../../src/db.js');
  const { CaptchaChallenge } = await import('../../src/admin/models.js');
  await createUser({ email: 'guessed@example.com', name: 'Target', password: await bcrypt.hash('right-password', 10), isGoogleUser: false });

  const login = async (password) => {
    const { captchaId } = (await call('/api/auth/captcha')).body;
    const { answer } = await CaptchaChallenge.findById(captchaId).lean();
    return call('/api/auth/login', { method: 'POST', body: { email: 'guessed@example.com', password, captchaId, captchaAnswer: answer } });
  };

  assert.equal((await login('right-password')).status, 200, 'the right password works before any failures');
  for (let i = 0; i < 10; i++) assert.equal((await login('wrong-password')).status, 401, `attempt ${i + 1}`);
  const locked = await login('right-password');
  assert.equal(locked.status, 429);
  assert.equal(locked.body.code, 'RATE_LIMITED');
  assert.ok(locked.body.retryAfter > 0);
});

test('GitHub sign-in returns a single-use code, never the session token, and works across server instances', async () => {
  process.env.GITHUB_CLIENT_ID = 'test-client';
  process.env.GITHUB_CLIENT_SECRET = 'test-secret';
  const realFetch = globalThis.fetch;
  // GitHub's side of the flow, faked; requests to this test server still go through
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    if (href.startsWith('https://github.com/login/oauth/access_token')) return Response.json({ access_token: 'gh-token' });
    if (href === 'https://api.github.com/user') return Response.json({ login: 'octo', name: 'Octo Cat', avatar_url: '' });
    if (href === 'https://api.github.com/user/emails') return Response.json([{ email: 'octo@example.com', primary: true, verified: true }]);
    return realFetch(url, init);
  };
  try {
    // Without the browser's nonce the sign-in doesn't start
    const noNonce = await realFetch(`${base}/api/auth/github?origin=${encodeURIComponent('http://localhost:5173')}`, { redirect: 'manual' });
    assert.match(noNonce.headers.get('location'), /authError=/);

    const nonce = 'browser-nonce-0123456789abcdef';
    const signIn = async () => {
      const start = await realFetch(`${base}/api/auth/github?origin=${encodeURIComponent('http://localhost:5173')}&nonce=${nonce}`, { redirect: 'manual' });
      const startState = new URL(start.headers.get('location')).searchParams.get('state');
      const back = await realFetch(`${base}/api/auth/github/callback?state=${encodeURIComponent(startState)}&code=abc`, { redirect: 'manual' });
      return new URL(back.headers.get('location')).searchParams.get('oauthCode');
    };
    const start = await realFetch(`${base}/api/auth/github?origin=${encodeURIComponent('http://localhost:5173')}&nonce=${nonce}`, { redirect: 'manual' });
    const state = new URL(start.headers.get('location')).searchParams.get('state');
    assert.ok(state, 'the consent URL carries a state');

    // Signed state: valid on any instance, but not when forged or changed
    const forged = await realFetch(`${base}/api/auth/github/callback?state=${encodeURIComponent(`${state}x`)}&code=abc`, { redirect: 'manual' });
    assert.match(forged.headers.get('location'), /authError=/);

    const back = await realFetch(`${base}/api/auth/github/callback?state=${encodeURIComponent(state)}&code=abc`, { redirect: 'manual' });
    const location = back.headers.get('location');
    assert.ok(location.startsWith('http://localhost:5173/?oauthCode='), location);
    assert.doesNotMatch(location, /oauthUser|token%22|\.ey/, 'no session data in the address');

    const code = new URL(location).searchParams.get('oauthCode');
    const exchanged = await call('/api/auth/oauth/exchange', { method: 'POST', body: { code, nonce } });
    assert.equal(exchanged.status, 200);
    assert.equal(exchanged.body.user.email, 'octo@example.com');
    assert.ok(exchanged.body.user.token);
    assert.equal(exchanged.body.user.emailVerified, true);

    const again = await call('/api/auth/oauth/exchange', { method: 'POST', body: { code, nonce } });
    assert.equal(again.status, 400, 'a code works once');
    assert.equal((await call('/api/auth/oauth/exchange', { method: 'POST', body: { code: 'made-up', nonce } })).status, 400);

    // A code planted in someone else's browser fails: that browser doesn't hold the nonce, and the code is spent
    const planted = await signIn();
    assert.equal((await call('/api/auth/oauth/exchange', { method: 'POST', body: { code: planted, nonce: 'victim-browser-nonce-000000' } })).status, 400);
    assert.equal((await call('/api/auth/oauth/exchange', { method: 'POST', body: { code: planted, nonce } })).status, 400);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('account status only answers for the account in the caller\'s own token', async () => {
  const { createUser } = await import('../../src/db.js');
  const { signToken } = await import('../../src/services/authToken.js');
  const owner = await createUser({ email: 'status-owner@example.com', name: 'Owner', password: 'x', isGoogleUser: false });
  const ownerToken = signToken({ sub: String(owner._id || owner.id), kind: 'user', email: 'status-owner@example.com' });

  // Without a token nobody learns whether an address is registered or banned
  const anonymous = await call('/api/auth/account-status?email=status-owner@example.com');
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.body.active, false);
  assert.equal(anonymous.body.status, 'signed-out');

  const own = await call('/api/auth/account-status?email=status-owner@example.com', { token: ownerToken });
  assert.equal(own.status, 200);
  assert.equal(own.body.active, true);
  assert.equal(own.body.emailVerified, false);

  // The ?email= is ignored: asking about someone else still answers about the caller
  const probe = await call('/api/auth/account-status?email=nobody-here@example.com', { token: ownerToken });
  assert.equal(probe.body.active, true);
});

test('a provider that has not confirmed the email cannot open an existing account', async () => {
  const bcrypt = (await import('bcryptjs')).default;
  const { createUser } = await import('../../src/db.js');
  await createUser({ email: 'existing@example.com', name: 'Owner', password: await bcrypt.hash('pw-123456', 10), isGoogleUser: false });
  process.env.LINKEDIN_CLIENT_ID = 'test-client';
  process.env.LINKEDIN_CLIENT_SECRET = 'test-secret';
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    if (href.startsWith('https://www.linkedin.com/oauth/v2/accessToken')) return Response.json({ access_token: 'li-token' });
    if (href === 'https://api.linkedin.com/v2/userinfo') return Response.json({ email: 'existing@example.com', email_verified: false, name: 'Someone' });
    return realFetch(url, init);
  };
  try {
    const nonce = 'browser-nonce-linkedin-0123456';
    const start = await realFetch(`${base}/api/auth/linkedin?origin=${encodeURIComponent('http://localhost:5173')}&nonce=${nonce}`, { redirect: 'manual' });
    const state = new URL(start.headers.get('location')).searchParams.get('state');
    const back = await realFetch(`${base}/api/auth/linkedin/callback?state=${encodeURIComponent(state)}&code=abc`, { redirect: 'manual' });
    const location = back.headers.get('location');
    assert.match(location, /authError=/);
    assert.doesNotMatch(location, /oauthCode=/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('verifying an account first opened through a provider still signs everyone else out', async () => {
  const { verifyThroughProvider } = await import('../../src/services/emailVerification.js');
  const { createUser } = await import('../../src/db.js');
  const { signToken } = await import('../../src/services/authToken.js');
  const created = await createUser({ email: 'oauth-made@example.com', name: 'Made', password: 'x', isGoogleUser: true });
  const earlyToken = signToken({ sub: String(created._id || created.id), kind: 'user', email: 'oauth-made@example.com' });
  const doc = await userDoc('oauth-made@example.com');
  const { passwordCleared } = await verifyThroughProvider({ ...doc, id: String(doc._id) });
  assert.equal(passwordCleared, false, 'a provider account has no password to clear');
  assert.equal((await call('/api/auth/resend-verification', { method: 'POST', token: earlyToken })).status, 401);
});

// Placed before the per-IP sign-up test, which uses up this IP's sign-ups
test('a social login that verifies a password account clears that password and signs everyone out', async () => {
  const { verifyThroughProvider } = await import('../../src/services/emailVerification.js');
  const bcrypt = (await import('bcryptjs')).default;
  const { createUser } = await import('../../src/db.js');
  const { signToken } = await import('../../src/services/authToken.js');
  // Someone opened an account with this address and a password they know, and never verified it
  // (created directly: earlier tests use up this IP's sign-ups)
  const squatter = await createUser({ email: 'claimed@example.com', name: 'Squatter', password: await bcrypt.hash('secret123', 10), isGoogleUser: false });
  const squatterToken = signToken({ sub: String(squatter._id || squatter.id), kind: 'user', email: 'claimed@example.com' });
  assert.notEqual((await call('/api/auth/resend-verification', { method: 'POST', token: squatterToken })).status, 401);

  const before = await userDoc('claimed@example.com');
  const { passwordCleared } = await verifyThroughProvider({ ...before, id: String(before._id) });
  assert.equal(passwordCleared, true);

  const after = await userDoc('claimed@example.com');
  assert.equal(after.emailVerified, true);
  assert.equal(await bcrypt.compare('secret123', after.password), false, 'the old password must stop working');
  const stale = await call('/api/auth/resend-verification', { method: 'POST', token: squatterToken });
  assert.equal(stale.status, 401);
  assert.equal(stale.body.code, 'SESSION_REVOKED');
});

test('sign-ups are limited per IP', async () => {
  // Earlier tests already used part of this hour's allowance from 127.0.0.1
  let last;
  for (let i = 0; i < 6; i++) last = await signup(`burst${i}@example.com`);
  assert.equal(last.status, 429);
  assert.equal(last.body.code, 'RATE_LIMITED');
});

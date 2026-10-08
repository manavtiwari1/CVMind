import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// db.js and the admin module read MONGODB_URI at import time, so the in-memory server starts first
let mongod;
let server;
let base;
let mongoose;
let signToken;
let invalidateSettings;
let ProductGrant;
let ownerToken;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_product_access_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = '';

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken } = await import('../../src/services/authToken.js'));
  const adminRouter = (await import('../../src/admin/router.js')).default;
  ({ invalidateSettings } = await import('../../src/admin/settings.js'));
  ({ ProductGrant } = await import('../../src/admin/models.js'));
  const { productGate } = await import('../../src/services/productGate.js');
  const { installSessionValidator } = await import('../../src/admin/sessions.js');
  installSessionValidator();

  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  const app = express();
  app.use(express.json());
  app.use(productGate);
  app.use('/api/admin', adminRouter);
  app.post('/api/tailor', (req, res) => res.json({ ok: true }));
  app.post('/api/cover-letter/read-resume', (req, res) => res.json({ ok: true }));
  app.post('/api/cover-letter/generate', (req, res) => res.json({ ok: true }));
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

async function userToken(email) {
  const user = await mongoose.model('User').create({ email, name: email.split('@')[0], password: 'x' });
  return signToken({ sub: String(user._id), kind: 'user', email });
}

const admin = (path, opts = {}) => call(`/api/admin/product-access${path}`, { ...opts, token: ownerToken });

test('unlocked products stay open to everyone, signed in or not', async () => {
  assert.equal((await call('/api/tailor', { method: 'POST' })).status, 200);
  const list = await admin('');
  assert.equal(list.status, 200);
  assert.ok(list.body.products.every((p) => !p.locked));
  assert.ok(!list.body.products.some((p) => ['signups', 'company-portal', 'auto-apply'].includes(p.key)));
});

test('a locked product only works for accounts with an active grant', async () => {
  const granted = await userToken('granted@example.com');
  const other = await userToken('other@example.com');

  const give = await admin('', { method: 'POST', body: { emails: 'Granted@example.com, later@example.com', products: ['tailor'], expiresAt: null, note: 'beta' } });
  assert.equal(give.status, 200);
  assert.equal(give.body.granted, 2);

  assert.equal((await admin('/locks/tailor', { method: 'PUT', body: { locked: true } })).status, 200);
  invalidateSettings();

  assert.equal((await call('/api/tailor', { method: 'POST', token: granted })).status, 200);
  const denied = await call('/api/tailor', { method: 'POST', token: other });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, 'PRODUCT_LOCKED');
  const anon = await call('/api/tailor', { method: 'POST' });
  assert.equal(anon.status, 401);
  assert.equal(anon.body.code, 'AUTH_REQUIRED');

  // An email granted before sign-up gets access once the account exists
  const later = await userToken('later@example.com');
  assert.equal((await call('/api/tailor', { method: 'POST', token: later })).status, 200);

  // Other products are untouched
  assert.equal((await call('/api/cover-letter/generate', { method: 'POST', token: other })).status, 200);

  assert.equal((await admin('/locks/tailor', { method: 'PUT', body: { locked: false } })).status, 200);
  invalidateSettings();
  assert.equal((await call('/api/tailor', { method: 'POST', token: other })).status, 200);
});

test('expired and revoked grants stop working', async () => {
  const token = await userToken('expiring@example.com');
  await admin('', { method: 'POST', body: { emails: ['expiring@example.com'], products: ['cover-letter'], expiresAt: new Date(Date.now() + 86400000).toISOString() } });
  await admin('/locks/cover-letter', { method: 'PUT', body: { locked: true } });
  invalidateSettings();

  assert.equal((await call('/api/cover-letter/generate', { method: 'POST', token })).status, 200);
  // Reading the resume never needs access
  assert.equal((await call('/api/cover-letter/read-resume', { method: 'POST' })).status, 200);

  await ProductGrant.updateOne({ email: 'expiring@example.com' }, { expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await call('/api/cover-letter/generate', { method: 'POST', token })).status, 403);

  const list = await admin('');
  const grant = list.body.data.find((g) => g.email === 'expiring@example.com');
  assert.equal(grant.active, false);

  // Renewing brings it back, revoking removes it
  assert.equal((await admin(`/${grant.id}`, { method: 'PATCH', body: { expiresAt: null } })).status, 200);
  assert.equal((await call('/api/cover-letter/generate', { method: 'POST', token })).status, 200);
  assert.equal((await admin(`/${grant.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await call('/api/cover-letter/generate', { method: 'POST', token })).status, 403);

  await admin('/locks/cover-letter', { method: 'PUT', body: { locked: false } });
  invalidateSettings();
});

test('grant input is validated', async () => {
  assert.equal((await admin('', { method: 'POST', body: { emails: 'not-an-email', products: ['tailor'] } })).status, 400);
  assert.equal((await admin('', { method: 'POST', body: { emails: 'a@example.com', products: ['signups'] } })).status, 400);
  assert.equal((await admin('', { method: 'POST', body: { emails: 'a@example.com', products: [] } })).status, 400);
  assert.equal((await admin('', { method: 'POST', body: { emails: 'a@example.com', products: ['tailor'], expiresAt: '2000-01-01' } })).status, 400);
  assert.equal((await admin('/locks/auto-apply', { method: 'PUT', body: { locked: true } })).status, 404);
  assert.equal((await call('/api/admin/product-access')).status, 401);
});

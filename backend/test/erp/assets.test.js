import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ERP → Assets & subscriptions: register, hand-outs, renewal reminders and renewal drafts, offboarding check
let mongod;
let server;
let base;
let mongoose;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_erp_assets_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = 're_test_key';
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => (String(url).includes('api.resend.com')
    ? new Response(JSON.stringify({ id: 'e' }), { status: 200, headers: { 'content-type': 'application/json' } })
    : realFetch(url, init));
  const express = (await import('express')).default;
  const http = await import('http');
  mongoose = (await import('mongoose')).default;
  const adminRouter = (await import('../../src/admin/router.js')).default;
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}/api/admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const adminLogin = async (username, password) => (await call('/login', { method: 'POST', body: { username, password } })).body.token;
async function onboard(panelToken, { username, role }) {
  const temp = `temp-${username}-12345`;
  await call('/team/invitations', { method: 'POST', token: panelToken, body: { name: username, username, email: `${username}@cvmind.test`, role, password: temp } });
  const login = await call('/team/login', { method: 'POST', body: { username, password: temp } });
  await call('/team/me/password', { method: 'POST', token: login.body.token, body: { currentPassword: temp, newPassword: `real-${username}-password` } });
  return { id: login.body.admin.id, token: login.body.token };
}

let owner;
let lead;
let dev;
let laptop;
let domain;

test('physical assets are handed out and returned with a history', async () => {
  owner = await adminLogin('owner', 'owner-password-123');
  lead = await onboard(owner, { username: 'cto', role: 'cto' });
  dev = await onboard(owner, { username: 'dev', role: 'fullstack_developer' });
  const made = await call('/erp/assets', { method: 'POST', token: owner, body: { kind: 'physical', name: 'MacBook Air M3', category: 'laptop', serialNumber: 'C02XYZ', cost: 99900, purchaseDate: '2026-09-01' } });
  assert.equal(made.status, 200, JSON.stringify(made.body));
  laptop = made.body.data;
  const given = await call(`/erp/assets/${laptop.id}/assign`, { method: 'POST', token: owner, body: { adminId: dev.id, condition: 'New' } });
  assert.equal(given.body.data.assignedTo.id, dev.id);
  assert.match(given.body.data.history.at(-1).text, /Given to dev/);
  assert.equal((await call('/erp/assets', { method: 'POST', token: owner, body: { kind: 'physical', name: 'X', category: 'domain' } })).status, 400);
});

test('subscriptions remind 14 and 3 days before, then become a draft expense and move on', async () => {
  const made = await call('/erp/assets', { method: 'POST', token: owner, body: { kind: 'digital', name: 'cvmind.in', category: 'domain', provider: 'GoDaddy', billing: 'yearly', cost: 899, renewalDate: '2026-12-01', ownerId: lead.id, loginHolderIds: [dev.id] } });
  assert.equal(made.status, 200, JSON.stringify(made.body));
  domain = made.body.data;
  assert.equal((await call('/erp/assets', { method: 'POST', token: owner, body: { kind: 'digital', name: 'Render', category: 'hosting', billing: 'monthly' } })).status, 400);

  const { runAssetRenewals } = await import('../../src/erp/assets.js');
  assert.equal((await runAssetRenewals(new Date('2026-11-17T06:00:00Z'))).reminded, 1);
  assert.equal((await runAssetRenewals(new Date('2026-11-17T06:00:00Z'))).reminded, 0);
  assert.equal((await runAssetRenewals(new Date('2026-11-28T06:00:00Z'))).reminded, 1);
  const notes = await mongoose.connection.db.collection('teamnotifications').find({ type: 'asset_renewal_soon' }).toArray();
  assert.ok(notes.some((n) => String(n.adminId) === lead.id));

  const renewed = await runAssetRenewals(new Date('2026-12-01T06:00:00Z'));
  assert.equal(renewed.drafted, 1);
  const list = await call('/erp/assets?kind=digital', { token: owner });
  assert.equal(list.body.data[0].renewalDate, '2027-12-01');
  assert.equal(list.body.summary.yearlyCost, 899);
  const drafts = await mongoose.connection.db.collection('erpexpenses').find({ status: 'draft' }).toArray();
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].category, 'domains');
  assert.equal(drafts[0].amount, 899);
});

test('offboarding shows what someone holds; members see their own', async () => {
  const held = await call(`/erp/assets/held-by/${dev.id}`, { token: owner });
  assert.deepEqual(held.body.data.map((a) => a.name).sort(), ['MacBook Air M3', 'cvmind.in']);
  const mine = await call('/team/me/assets', { token: dev.token });
  const mac = mine.body.data.find((a) => a.name === 'MacBook Air M3');
  assert.equal(mac.assignedToMe, true);
  assert.equal(mine.body.data.find((a) => a.name === 'cvmind.in').loginHolder, true);

  const back = await call(`/erp/assets/${laptop.id}/assign`, { method: 'POST', token: owner, body: { adminId: null, condition: 'Good' } });
  assert.equal(back.body.data.assignedTo, null);
  assert.match(back.body.data.history.at(-1).text, /Returned by dev/);
  const retired = await call(`/erp/assets/${domain.id}`, { method: 'PATCH', token: owner, body: { status: 'retired' } });
  assert.equal(retired.body.data.status, 'retired');
  assert.equal((await call(`/erp/assets/held-by/${dev.id}`, { token: owner })).body.data.length, 0);
});

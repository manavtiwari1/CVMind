import { makeLeadershipManagers } from '../helpers/teamManagers.js';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ERP → Finance (profit & loss): revenue from payments, minus refunds, payroll and expenses
let mongod;
let server;
let base;
let mongoose;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_erp_finance_test');
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

async function call(path, { method = 'GET', token, body, raw = false } = {}) {
  const res = await fetch(`${base}/api/admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (raw) return { status: res.status, text: await res.text() };
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const adminLogin = async (username, password) => {
  const token = (await call('/login', { method: 'POST', body: { username, password } })).body.token;
  await makeLeadershipManagers();
  return token;
};

let owner;

test('the October P&L adds up from payments, refunds, payroll and expenses', async () => {
  owner = await adminLogin('owner', 'owner-password-123');
  const PaymentLog = mongoose.model('PaymentLog');
  await PaymentLog.create([
    { email: 'a@x.com', amount: 189, paymentMethod: 'upi', transactionId: 't1', status: 'success', plan: 'monthly', createdAt: new Date('2026-10-05T10:00:00+05:30') },
    { email: 'b@x.com', amount: 1099, paymentMethod: 'upi', transactionId: 't2', status: 'success', plan: 'yearly', createdAt: new Date('2026-10-20T10:00:00+05:30') },
    // Paid in October, refunded in October
    { email: 'c@x.com', amount: 189, paymentMethod: 'card', transactionId: 't3', status: 'refunded', plan: 'monthly', createdAt: new Date('2026-10-21T10:00:00+05:30'), refundedAt: new Date('2026-10-25T10:00:00+05:30') },
    // 1 Nov 00:30 IST is still 31 Oct in UTC: it belongs to November
    { email: 'd@x.com', amount: 79, paymentMethod: 'upi', transactionId: 't4', status: 'success', plan: 'pass-7d', createdAt: new Date('2026-11-01T00:30:00+05:30') },
    { email: 'e@x.com', amount: 500, paymentMethod: 'upi', transactionId: 't5', status: 'failed', plan: 'monthly', createdAt: new Date('2026-10-10T10:00:00+05:30') }
  ]);
  await call('/erp/expenses', { method: 'POST', token: owner, body: { date: '2026-10-03', amount: 400, category: 'ai_apis', description: 'DeepSeek' } });
  await call('/erp/expenses', { method: 'POST', token: owner, body: { date: '2026-10-09', amount: 600, category: 'servers', description: 'Render' } });

  const res = await call('/erp/finance?month=2026-10', { token: owner });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const m = res.body.data.current;
  assert.equal(m.revenue, 189 + 1099 + 189);
  assert.equal(m.refunds, 189);
  assert.equal(m.expenses, 1000);
  assert.equal(m.payroll, 0);
  assert.equal(m.net, 1477 - 189 - 1000);
  assert.equal(m.payingUsers, 3);
  assert.equal(m.byPlan[0].label, 'Yearly');
  assert.equal(m.aiCostPerPayingUser, 133);
  assert.equal(res.body.data.trend.length, 12);
  assert.equal(res.body.data.fiscalYear.label, 'FY 2026-27');

  const nov = await call('/erp/finance?month=2026-11', { token: owner });
  assert.equal(nov.body.data.current.revenue, 79);
});

test('runway uses the bank balance and recent costs; only leadership enters it', async () => {
  assert.equal((await call('/erp/finance/cash', { method: 'PUT', token: owner, body: { month: '2026-10', amount: 5000 } })).status, 200);
  const res = await call('/erp/finance?month=2026-10', { token: owner });
  assert.equal(res.body.data.cash.balance, 5000);
  assert.equal(res.body.data.cash.runwayMonths, 5);
  const csv = await call('/erp/finance/export?from=2026-10&to=2026-10', { token: owner, raw: true });
  assert.match(csv.text, /2026-10,1477,189,1288,0,1000,1000,288/);
});

test('HR staff do not see finance', async () => {
  const temp = 'temp-hrx-12345';
  await call('/team/invitations', { method: 'POST', token: owner, body: { name: 'hrx', username: 'hrx', email: 'hrx@cvmind.test', role: 'hr', password: temp } });
  const login = await call('/team/login', { method: 'POST', body: { username: 'hrx', password: temp } });
  await call('/team/me/password', { method: 'POST', token: login.body.token, body: { currentPassword: temp, newPassword: 'real-hrx-password' } });
  const hrPanel = await adminLogin('hrx', 'real-hrx-password');
  assert.equal((await call('/erp/finance', { token: hrPanel })).status, 403);
});

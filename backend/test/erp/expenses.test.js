import { makeLeadershipManagers } from '../helpers/teamManagers.js';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ERP → Expenses: company spending, member claims and their approvals, reimbursement, repeats
let mongod;
let server;
let base;
let mongoose;
const stored = new Map();

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_erp_expenses_test');
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
  const { setStorageDriver } = await import('../../src/admin/team/storage.js');
  setStorageDriver({
    presignPut: async (key) => `https://r2.test/put/${key}`,
    presignGet: async (key) => `https://r2.test/get/${key}`,
    head: async (key) => stored.get(key) || null,
    remove: async (key) => { stored.delete(key); }
  });
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
const adminLogin = async (username, password) => {
  const token = (await call('/login', { method: 'POST', body: { username, password } })).body.token;
  await makeLeadershipManagers();
  return token;
};
async function onboard(panelToken, { username, role }) {
  const temp = `temp-${username}-12345`;
  const invite = await call('/team/invitations', { method: 'POST', token: panelToken, body: { name: username, username, email: `${username}@cvmind.test`, role, password: temp } });
  assert.equal(invite.status, 200, JSON.stringify(invite.body));
  await makeLeadershipManagers();
  const login = await call('/team/login', { method: 'POST', body: { username, password: temp } });
  const password = `real-${username}-password`;
  await call('/team/me/password', { method: 'POST', token: login.body.token, body: { currentPassword: temp, newPassword: password } });
  return { id: login.body.admin.id, token: login.body.token, password };
}
// Uploads a receipt through a route pair (team or panel) → file id
async function receipt(token, prefix, scopeId) {
  const up = await call(`${prefix}/files/upload-url`, { method: 'POST', token, body: { name: 'bill.pdf', mime: 'application/pdf', size: 500, scope: 'hr', scopeId } });
  assert.equal(up.status, 200, JSON.stringify(up.body));
  stored.set(up.body.uploadUrl.replace('https://r2.test/put/', ''), { size: 500, mime: 'application/pdf' });
  const done = await call(`${prefix}/files/${up.body.file.id}/complete`, { method: 'POST', token });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  return up.body.file.id;
}

let owner;
let lead;
let intern;
let solo;

test('HR records company expenses with receipts; the month totals by category', async () => {
  owner = await adminLogin('owner', 'owner-password-123');
  const fileId = await receipt(owner, '/erp', null);
  const added = await call('/erp/expenses', { method: 'POST', token: owner, body: { date: '2026-11-03', amount: 1999, category: 'servers', paidTo: 'Render', description: 'Backend hosting', receiptFileId: fileId, recurring: 'monthly' } });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  assert.equal(added.body.data.hasReceipt, true);
  assert.equal(added.body.data.nextDueOn, '2026-12-03');
  await call('/erp/expenses', { method: 'POST', token: owner, body: { date: '2026-11-05', amount: 3000, category: 'marketing', paidTo: 'Meta', description: 'Black Friday ads' } });
  assert.equal((await call('/erp/expenses', { method: 'POST', token: owner, body: { date: '2099-01-01', amount: 1, category: 'other' } })).status, 400);

  const list = await call('/erp/expenses', { token: owner, query: undefined });
  assert.equal(list.body.total, 4999);
  const link = await call(`/erp/expenses/${added.body.data.id}/receipt`, { token: owner });
  assert.match(link.body.url, /r2\.test\/get/);
});

test('a small claim: the manager approves it and HR pays it back with that month\'s payroll', async () => {
  lead = await onboard(owner, { username: 'mgr', role: 'cto' });
  intern = await onboard(owner, { username: 'ria', role: 'frontend_intern' });
  await call(`/erp/people/${intern.id}`, { method: 'PATCH', token: owner, body: { managerId: lead.id, joiningDate: '2026-10-01' } });
  await call(`/erp/people/${intern.id}/pay`, { method: 'POST', token: owner, body: { payType: 'stipend', amount: 5000, effectiveFrom: '2026-10-01' } });

  // A receipt is required
  assert.equal((await call('/team/me/claims', { method: 'POST', token: intern.token, body: { date: '2026-11-04', amount: 450, category: 'office_travel', description: 'Cab to the client' } })).status, 400);
  const fileId = await receipt(intern.token, '/team', intern.id);
  const claim = await call('/team/me/claims', { method: 'POST', token: intern.token, body: { date: '2026-11-04', amount: 450, category: 'office_travel', description: 'Cab to the client', receiptFileId: fileId } });
  assert.equal(claim.status, 200, JSON.stringify(claim.body));
  assert.equal(claim.body.data.status, 'pending_manager');
  const pinged = await mongoose.connection.db.collection('teamnotifications').findOne({ type: 'claim_submitted' });
  assert.equal(String(pinged.adminId), lead.id);

  // HR can't skip the manager; the manager sees and approves it in Team
  assert.equal((await call(`/erp/expenses/${claim.body.data.id}/decide`, { method: 'POST', token: owner, body: { approve: true } })).status, 403);
  const queue = await call('/team/me/claims', { token: lead.token });
  assert.equal(queue.body.toApprove.length, 1);
  assert.equal((await call(`/team/claims/${claim.body.data.id}/receipt`, { token: lead.token })).status, 200);
  assert.equal((await call(`/team/claims/${claim.body.data.id}/decide`, { method: 'POST', token: lead.token, body: { approve: true } })).status, 200);
  const approved = (await call('/erp/expenses?kind=claim', { token: owner })).body.data.find((e) => e.id === claim.body.data.id);
  assert.equal(approved.status, 'approved');

  // Into the November draft run
  await call('/erp/payroll/runs', { method: 'POST', token: owner, body: { month: '2026-11' } });
  const paid = await call(`/erp/expenses/${claim.body.data.id}/reimburse`, { method: 'POST', token: owner, body: { via: 'payroll', month: '2026-11' } });
  assert.equal(paid.status, 200, JSON.stringify(paid.body));
  assert.equal(paid.body.data.status, 'reimbursed');
  const runs = await call('/erp/payroll/runs', { token: owner });
  const run = await call(`/erp/payroll/runs/${runs.body.data[0].id}`, { token: owner });
  const line = run.body.lines.find((l) => l.adminId === intern.id);
  assert.equal(line.reimbursements, 450);
  assert.equal(line.netPay, line.basePay + 450);
  // Recalculating keeps it
  await call(`/erp/payroll/runs/${runs.body.data[0].id}/recalculate`, { method: 'POST', token: owner });
  const again = await call(`/erp/payroll/runs/${runs.body.data[0].id}`, { token: owner });
  assert.equal(again.body.lines.find((l) => l.adminId === intern.id).reimbursements, 450);
});

test('a claim above the limit also needs leadership; HR staff cannot approve that step', async () => {
  const fileId = await receipt(intern.token, '/team', intern.id);
  const claim = await call('/team/me/claims', { method: 'POST', token: intern.token, body: { date: '2026-11-06', amount: 5000, category: 'software', description: 'Figma yearly', receiptFileId: fileId } });
  await call(`/team/claims/${claim.body.data.id}/decide`, { method: 'POST', token: lead.token, body: { approve: true } });
  let row = (await call('/erp/expenses?status=pending', { token: owner })).body.data.find((e) => e.id === claim.body.data.id);
  assert.equal(row.status, 'pending_leadership');

  const hr = await onboard(owner, { username: 'hrdesk', role: 'hr' });
  const hrPanel = await adminLogin('hrdesk', hr.password);
  assert.equal((await call(`/erp/expenses/${claim.body.data.id}/decide`, { method: 'POST', token: hrPanel, body: { approve: true } })).status, 403);
  assert.equal((await call(`/erp/expenses/${claim.body.data.id}/decide`, { method: 'POST', token: owner, body: { approve: true } })).status, 200);
  const paid = await call(`/erp/expenses/${claim.body.data.id}/reimburse`, { method: 'POST', token: hrPanel, body: { via: 'direct', paidOn: '2026-11-07', reference: 'UPI-889' } });
  assert.equal(paid.body.data.status, 'reimbursed');
  row = paid.body.data;
  assert.equal(row.approvals.length, 2);
});

test('a member with no manager goes to HR, who can decline', async () => {
  solo = await onboard(owner, { username: 'solo', role: 'graphic_designer' });
  const fileId = await receipt(solo.token, '/team', solo.id);
  const claim = await call('/team/me/claims', { method: 'POST', token: solo.token, body: { date: '2026-11-08', amount: 300, category: 'other', description: 'Stickers', receiptFileId: fileId } });
  assert.equal(claim.body.data.status, 'pending_hr');
  const declined = await call(`/erp/expenses/${claim.body.data.id}/decide`, { method: 'POST', token: owner, body: { approve: false, reason: 'Not a work expense' } });
  assert.equal(declined.body.data.status, 'declined');
  const mine = await call('/team/me/claims', { token: solo.token });
  assert.equal(mine.body.data[0].declinedReason, 'Not a work expense');
});

test('a monthly expense creates next month\'s draft when its date comes', async () => {
  const { spawnRecurringExpenses } = await import('../../src/erp/expenses.js');
  const domain = await call('/erp/expenses', { method: 'POST', token: owner, body: { date: '2026-09-10', amount: 899, category: 'domains', paidTo: 'GoDaddy', description: 'cvmind.in', recurring: 'monthly' } });
  assert.equal(domain.body.data.nextDueOn, '2026-10-10');
  assert.equal((await spawnRecurringExpenses(new Date('2026-10-09T10:00:00Z'))).created, 0);
  assert.equal((await spawnRecurringExpenses(new Date('2026-10-10T10:00:00Z'))).created, 1);
  assert.equal((await spawnRecurringExpenses(new Date('2026-10-10T10:00:00Z'))).created, 0);
  const drafts = await call('/erp/expenses?status=draft', { token: owner });
  assert.equal(drafts.body.data.length, 1);
  assert.equal(drafts.body.data[0].date, '2026-10-10');
  assert.equal(drafts.body.data[0].nextDueOn, '2026-11-10');
  const confirmed = await call(`/erp/expenses/${drafts.body.data[0].id}`, { method: 'PATCH', token: owner, body: { confirm: true, amount: 2099 } });
  assert.equal(confirmed.body.data.status, 'recorded');
  assert.equal(confirmed.body.data.amount, 2099);
});

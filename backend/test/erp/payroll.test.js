import { makeLeadershipManagers } from '../helpers/teamManagers.js';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ERP → Payroll. November 2026 has 30 days and 5 Sundays (1, 8, 15, 22, 29): 25 working days, Mon–Sat.
let mongod;
let server;
let base;
let mongoose;
let models;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_erp_payroll_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.ERP_ENCRYPTION_KEY = 'b'.repeat(64);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => (String(url).includes('api.resend.com')
    ? new Response(JSON.stringify({ id: 'email-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    : realFetch(url, init));

  const express = (await import('express')).default;
  const http = await import('http');
  mongoose = (await import('mongoose')).default;
  const adminRouter = (await import('../../src/admin/router.js')).default;
  models = await import('../../src/admin/team/models.js');
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
  if (raw) return { status: res.status, headers: res.headers, buffer: Buffer.from(await res.arrayBuffer()) };
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

let owner;
let intern;
let lead;
let runId;
let lines;

test('a November run pro-rates a mid-month joiner and counts leave beyond the quota as unpaid', async () => {
  owner = await adminLogin('owner', 'owner-password-123');
  intern = await onboard(owner, { username: 'neha', role: 'frontend_intern' });
  lead = await onboard(owner, { username: 'arjun', role: 'cto' });

  await call(`/erp/people/${intern.id}`, { method: 'PATCH', token: owner, body: { employmentType: 'intern', designation: 'Frontend Intern', joiningDate: '2026-11-10', bankAccount: '111122223333', bankIfsc: 'HDFC0000123' } });
  await call(`/erp/people/${intern.id}/pay`, { method: 'POST', token: owner, body: { payType: 'stipend', amount: 5000, effectiveFrom: '2026-10-01' } });
  await call(`/erp/people/${lead.id}`, { method: 'PATCH', token: owner, body: { employmentType: 'full_time', joiningDate: '2026-01-01' } });
  await call(`/erp/people/${lead.id}/pay`, { method: 'POST', token: owner, body: { payType: 'salary', amount: 30000, effectiveFrom: '2026-01-01' } });

  // Casual leave on 12–13 Nov (intern quota: 1 paid day), WFH on 14 Nov, check-ins on two days
  await models.TeamLeave.create({ adminId: intern.id, from: '2026-11-12', to: '2026-11-13', kind: 'casual', status: 'approved' });
  await models.TeamLeave.create({ adminId: intern.id, from: '2026-11-14', to: '2026-11-14', kind: 'wfh', status: 'approved' });
  await models.TeamLeave.create({ adminId: intern.id, from: '2026-11-20', to: '2026-11-20', kind: 'sick', status: 'pending' });
  await models.TeamStandup.create({ adminId: intern.id, day: '2026-11-10', done: 'x' });
  await models.TeamStandup.create({ adminId: intern.id, day: '2026-11-11', done: 'x' });

  const created = await call('/erp/payroll/runs', { method: 'POST', token: owner, body: { month: '2026-11' } });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  runId = created.body.data.id;
  assert.equal((await call('/erp/payroll/runs', { method: 'POST', token: owner, body: { month: '2026-11' } })).status, 409);

  const run = await call(`/erp/payroll/runs/${runId}`, { token: owner });
  lines = run.body.lines;
  const neha = lines.find((l) => l.adminId === intern.id);
  // 10–30 Nov minus Sundays 15, 22, 29 = 18 working days
  assert.equal(neha.monthWorkingDays, 25);
  assert.equal(neha.workingDays, 18);
  assert.equal(neha.paidLeaveDays, 1);
  assert.equal(neha.unpaidLeaveDays, 1);
  assert.equal(neha.unpaidDays, 1);
  assert.equal(neha.wfhDays, 1);
  assert.equal(neha.presentDays, 3);
  // 5000 / 25 × (18 − 1)
  assert.equal(neha.basePay, 3400);
  assert.equal(neha.netPay, 3400);

  const arjun = lines.find((l) => l.adminId === lead.id);
  assert.equal(arjun.basePay, 30000);
  assert.equal(run.body.data.totals.net, 33400);
  // The owner with no HR file and no pay isn't in the run
  assert.equal(lines.length, 2);
});

test('HR adds a bonus; recalculating keeps it; the missed check-in setting cuts pay when turned on', async () => {
  const neha = lines.find((l) => l.adminId === intern.id);
  const edited = await call(`/erp/payroll/lines/${neha.id}`, { method: 'PATCH', token: owner, body: { bonus: 500, note: 'Great first sprint' } });
  assert.equal(edited.body.data.netPay, 3900);

  assert.equal((await call('/erp/settings', { method: 'PUT', token: owner, body: { missedCheckInUnpaid: true } })).status, 200);
  await call(`/erp/payroll/runs/${runId}/recalculate`, { method: 'POST', token: owner });
  let run = await call(`/erp/payroll/runs/${runId}`, { token: owner });
  const arjunStrict = run.body.lines.find((l) => l.adminId === lead.id);
  assert.equal(arjunStrict.absentDays, 25);
  assert.equal(arjunStrict.basePay, 0);
  const nehaStrict = run.body.lines.find((l) => l.adminId === intern.id);
  assert.equal(nehaStrict.bonus, 500);

  await call('/erp/settings', { method: 'PUT', token: owner, body: { missedCheckInUnpaid: false } });
  await call(`/erp/payroll/runs/${runId}/recalculate`, { method: 'POST', token: owner });
  run = await call(`/erp/payroll/runs/${runId}`, { token: owner });
  assert.equal(run.body.lines.find((l) => l.adminId === intern.id).netPay, 3900);
  lines = run.body.lines;
});

test('only leadership approves; approved numbers are locked', async () => {
  const hrUser = await onboard(owner, { username: 'hrperson', role: 'hr' });
  const adminPanel = await adminLogin('hrperson', hrUser.password);
  // HR can see and edit the run, but not approve it
  assert.equal((await call(`/erp/payroll/runs/${runId}`, { token: adminPanel })).status, 200);
  const denied = await call(`/erp/payroll/runs/${runId}/approve`, { method: 'POST', token: adminPanel });
  assert.equal(denied.status, 403);
  assert.equal((await call(`/erp/payroll/lines/${lines[0].id}/paid`, { method: 'POST', token: owner, body: { paidOn: '2026-11-30', mode: 'bank' } })).status, 400);

  const approved = await call(`/erp/payroll/runs/${runId}/approve`, { method: 'POST', token: owner });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.data.status, 'approved');
  assert.equal((await call(`/erp/payroll/lines/${lines[0].id}`, { method: 'PATCH', token: owner, body: { bonus: 1 } })).status, 400);
  assert.equal((await call(`/erp/payroll/runs/${runId}`, { method: 'DELETE', token: owner })).status, 400);
});

test('the bank file has full account numbers and is audited', async () => {
  const file = await call(`/erp/payroll/runs/${runId}/bank-file`, { token: owner, raw: true });
  assert.equal(file.status, 200);
  const text = file.buffer.toString('utf8');
  assert.match(text, /111122223333/);
  assert.match(text, /HDFC0000123/);
  const log = await mongoose.connection.db.collection('adminauditlogs').findOne({ action: 'hr.bank_file_downloaded' });
  assert.ok(log);
});

test('marking paid numbers the payslip, notifies the member, and the member downloads it', async () => {
  const neha = lines.find((l) => l.adminId === intern.id);
  const paid = await call(`/erp/payroll/lines/${neha.id}/paid`, { method: 'POST', token: owner, body: { paidOn: '2026-11-30', mode: 'bank', reference: 'UTR123' } });
  assert.equal(paid.status, 200, JSON.stringify(paid.body));
  assert.equal(paid.body.data.payslipNumber, 'CVM/PAY/2026-11/0001');
  assert.equal((await call(`/erp/payroll/lines/${neha.id}/paid`, { method: 'POST', token: owner, body: { paidOn: '2026-11-30', mode: 'bank' } })).status, 400);
  const note = await mongoose.connection.db.collection('teamnotifications').findOne({ type: 'payslip_ready' });
  assert.equal(String(note.adminId), intern.id);

  let run = await call(`/erp/payroll/runs/${runId}`, { token: owner });
  assert.equal(run.body.data.status, 'approved');
  const arjun = lines.find((l) => l.adminId === lead.id);
  await call(`/erp/payroll/lines/${arjun.id}/paid`, { method: 'POST', token: owner, body: { paidOn: '2026-11-30', mode: 'upi' } });
  run = await call(`/erp/payroll/runs/${runId}`, { token: owner });
  assert.equal(run.body.data.status, 'paid');

  const mine = await call('/team/me/payslips', { token: intern.token });
  assert.equal(mine.body.data.length, 1);
  assert.equal(mine.body.data[0].netPay, 3900);
  const pdf = await call(`/team/me/payslips/${neha.id}/pdf`, { token: intern.token, raw: true });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.buffer.subarray(0, 4).toString(), '%PDF');
  // Not someone else's
  assert.equal((await call(`/team/me/payslips/${arjun.id}/pdf`, { token: intern.token, raw: true })).status, 404);

  const csv = await call(`/erp/payroll/runs/${runId}/export`, { token: owner, raw: true });
  assert.match(csv.buffer.toString('utf8'), /neha|Frontend Intern/);
});

test('settings validate their values', async () => {
  assert.equal((await call('/erp/settings', { method: 'PUT', token: owner, body: { workingWeekdays: [] } })).status, 400);
  assert.equal((await call('/erp/settings', { method: 'PUT', token: owner, body: { holidays: [{ date: 'nope', name: 'x' }] } })).status, 400);
  const ok = await call('/erp/settings', { method: 'PUT', token: owner, body: { holidays: [{ date: '2026-11-08', name: 'Diwali' }], paidLeavePerMonth: { intern: 2 } } });
  assert.equal(ok.body.data.paidLeavePerMonth.intern, 2);
  assert.equal(ok.body.data.paidLeavePerMonth.full_time, 2);
});

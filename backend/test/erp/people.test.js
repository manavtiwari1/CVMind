import { makeLeadershipManagers } from '../helpers/teamManagers.js';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ERP → People (HR files). The admin module reads MONGODB_URI at import time, so Mongo starts first.
let mongod;
let server;
let base;
let mongoose;
const emails = [];
const stored = new Map();

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_erp_people_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.ERP_ENCRYPTION_KEY = 'a'.repeat(64);

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('api.resend.com')) {
      emails.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: `email-${emails.length}` }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, init);
  };

  const express = (await import('express')).default;
  const http = await import('http');
  mongoose = (await import('mongoose')).default;
  const adminRouter = (await import('../../src/admin/router.js')).default;
  const { setStorageDriver } = await import('../../src/team/storage.js');
  setStorageDriver({
    presignPut: async (key) => `https://r2.test/put/${key}`,
    presignGet: async (key, { download }) => `https://r2.test/get/${key}${download ? '?dl=1' : ''}`,
    head: async (key) => stored.get(key) || null,
    remove: async (key) => { stored.delete(key); }
  });
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  const app = express();
  app.set('trust proxy', 1);
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
  const token = login.body.token;
  const password = `real-${username}-password`;
  const set = await call('/team/me/password', { method: 'POST', token, body: { currentPassword: temp, newPassword: password } });
  assert.equal(set.status, 200);
  // Setting a password signs out every other session and renews this one
  return { id: login.body.admin.id, token: set.body.token, password };
}

let owner;
let lead;
let intern;
let support;

test('HR edits an HR file; bank details are encrypted, masked and revealed only with an audit entry', async () => {
  owner = await adminLogin('owner', 'owner-password-123');
  lead = await onboard(owner, { username: 'lead', role: 'cto' });
  intern = await onboard(owner, { username: 'asha', role: 'content_intern' });

  const saved = await call(`/erp/people/${intern.id}`, {
    method: 'PATCH', token: owner,
    body: { employmentType: 'intern', designation: 'Content Writing Intern', managerId: lead.id, joiningDate: '2026-10-01', endDate: '2026-12-31', department: 'Marketing', bankAccount: '1234 5678 9012', bankIfsc: 'sbin0001234', pan: 'abcde1234f' }
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.data.bankAccountLast4, '9012');
  assert.equal(saved.body.data.panLast4, '234F');
  assert.equal(saved.body.data.bankIfsc, 'SBIN0001234');
  assert.equal(saved.body.data.managerName, 'lead');
  assert.equal(JSON.stringify(saved.body).includes('123456789012'), false);

  // Stored encrypted, never in plain text
  const raw = await mongoose.connection.db.collection('erpprofiles').findOne({});
  assert.match(raw.bankAccountEnc, /^v1:/);
  assert.equal(JSON.stringify(raw).includes('123456789012'), false);

  const reveal = await call(`/erp/people/${intern.id}/reveal`, { method: 'POST', token: owner });
  assert.equal(reveal.body.bankAccount, '123456789012');
  assert.equal(reveal.body.pan, 'ABCDE1234F');
  const log = await mongoose.connection.db.collection('adminauditlogs').findOne({ action: 'hr.bank_revealed' });
  assert.ok(log);

  const list = await call('/erp/people', { token: owner });
  const row = list.body.data.find((r) => r.id === intern.id);
  assert.equal(row.designation, 'Content Writing Intern');
  assert.equal(row.department, 'Marketing');
  assert.ok(row.missing.includes('legal name'));
});

test('bad bank details, dates and managers are refused', async () => {
  const cases = [
    [{ bankIfsc: 'XYZ' }, /IFSC/],
    [{ pan: '12345' }, /PAN/],
    [{ bankAccount: '12ab' }, /account number/],
    [{ joiningDate: '2026-12-01', endDate: '2026-11-01' }, /before the joining/],
    [{ managerId: intern.id }, /themselves/],
    [{ employmentType: 'boss' }, /type of job/]
  ];
  for (const [body, message] of cases) {
    const res = await call(`/erp/people/${intern.id}`, { method: 'PATCH', token: owner, body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.match(res.body.error, message);
  }
});

test('pay history: the current pay is the newest change that has started', async () => {
  const first = await call(`/erp/people/${intern.id}/pay`, { method: 'POST', token: owner, body: { payType: 'stipend', amount: 5000, effectiveFrom: '2026-10-01' } });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.data.payAmount, 5000);
  // A raise from far in the future doesn't apply yet
  const future = await call(`/erp/people/${intern.id}/pay`, { method: 'POST', token: owner, body: { payType: 'stipend', amount: 8000, effectiveFrom: '2099-01-01' } });
  assert.equal(future.body.data.payAmount, 5000);
  assert.equal(future.body.data.payHistory.length, 2);
  assert.equal(future.body.data.payHistory[0].amount, 8000);

  const removed = await call(`/erp/people/${intern.id}/pay/${first.body.data.payHistory[0].id}`, { method: 'DELETE', token: owner });
  assert.equal(removed.status, 200);
  const after = await call(`/erp/people/${intern.id}`, { token: owner });
  assert.equal(after.body.data.payType, 'unpaid');
  assert.equal(after.body.data.payAmount, 0);

  assert.equal((await call(`/erp/people/${intern.id}/pay`, { method: 'POST', token: owner, body: { payType: 'stipend', amount: -1, effectiveFrom: '2026-10-01' } })).status, 400);
  await call(`/erp/people/${intern.id}/pay`, { method: 'POST', token: owner, body: { payType: 'stipend', amount: 6000, effectiveFrom: '2026-10-01' } });
});

test('roles without hr.* cannot open HR files; team tokens cannot use panel routes', async () => {
  support = await onboard(owner, { username: 'sam', role: 'support' });
  const supportPanel = await adminLogin('sam', support.password);
  assert.equal((await call('/erp/people', { token: supportPanel })).status, 403);
  assert.equal((await call(`/erp/people/${intern.id}`, { token: intern.token })).status, 401);
});

test('a member fills their own personal and bank details but cannot change job or pay', async () => {
  const mine = await call('/team/me/hr', { token: intern.token });
  assert.equal(mine.status, 200);
  assert.equal(mine.body.data.payAmount, 6000);
  assert.equal(mine.body.data.designation, 'Content Writing Intern');
  assert.equal(mine.body.data.notes, undefined);

  const edit = await call('/team/me/hr', {
    method: 'PATCH', token: intern.token,
    body: { legalName: 'Asha Verma', emergencyName: 'Ravi Verma', emergencyPhone: '+91 98765 43210', upiId: 'asha@okicici', designation: 'CEO', payAmount: 999999, joiningDate: '2020-01-01' }
  });
  assert.equal(edit.status, 200, JSON.stringify(edit.body));
  assert.equal(edit.body.data.legalName, 'Asha Verma');
  assert.equal(edit.body.data.upiId, 'asha@okicici');
  assert.equal(edit.body.data.designation, 'Content Writing Intern');
  assert.equal(edit.body.data.payAmount, 6000);
  assert.equal(edit.body.data.joiningDate, '2026-10-01');
});

test('documents: a member uploads into their own file, HR verifies, others cannot open it', async () => {
  const up = await call('/team/files/upload-url', { method: 'POST', token: intern.token, body: { name: 'pan.pdf', mime: 'application/pdf', size: 1000, scope: 'hr', scopeId: intern.id } });
  assert.equal(up.status, 200, JSON.stringify(up.body));
  stored.set(up.body.uploadUrl.replace('https://r2.test/put/', ''), { size: 1000, mime: 'application/pdf' });
  assert.equal((await call(`/team/files/${up.body.file.id}/complete`, { method: 'POST', token: intern.token })).status, 200);

  // Not into someone else's file
  const other = await call('/team/files/upload-url', { method: 'POST', token: intern.token, body: { name: 'x.pdf', mime: 'application/pdf', size: 10, scope: 'hr', scopeId: lead.id } });
  assert.equal(other.status, 403);

  const added = await call('/team/me/hr/documents', { method: 'POST', token: intern.token, body: { fileId: up.body.file.id, kind: 'pan_card' } });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  const doc = added.body.data.documents[0];
  assert.equal(doc.kind, 'pan_card');
  assert.equal(doc.verified, false);

  // The owner can open it in Team; a manager can't, and it never shows in the media library
  assert.equal((await call(`/team/files/${up.body.file.id}`, { token: intern.token })).status, 200);
  assert.equal((await call(`/team/files/${up.body.file.id}`, { token: lead.token })).status, 404);
  const media = await call('/team/media', { token: lead.token });
  assert.equal(media.body.data.some((f) => f.id === up.body.file.id), false);

  // HR opens and verifies it from the panel
  const link = await call(`/erp/people/${intern.id}/documents/${doc.id}/url`, { token: owner });
  assert.match(link.body.url, /^https:\/\/r2\.test\/get\//);
  const verified = await call(`/erp/people/${intern.id}/documents/${doc.id}/verify`, { method: 'POST', token: owner, body: { verified: true } });
  assert.equal(verified.body.data.documents[0].verified, true);

  // Verified documents stay
  const remove = await call(`/team/me/hr/documents/${doc.id}`, { method: 'DELETE', token: intern.token });
  assert.equal(remove.status, 400);
});

test('HR reminders go out once, 7 days before an internship ends', async () => {
  const { sendHrReminders } = await import('../../src/erp/jobs.js');
  const now = new Date('2026-12-24T05:00:00Z');
  const first = await sendHrReminders(now);
  assert.equal(first.reminded, 1);
  const again = await sendHrReminders(now);
  assert.equal(again.reminded, 0);
  const notes = await mongoose.connection.db.collection('teamnotifications').find({ type: 'hr_end_soon' }).toArray();
  const to = notes.map((n) => String(n.adminId));
  assert.ok(to.includes(lead.id));
  assert.equal(to.includes(intern.id), false);
  assert.match(notes[0].preview, /asha's ends on 2026-12-31/);
});

import { makeLeadershipManagers } from '../helpers/teamManagers.js';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ERP → Letters & certificates, and the public verify check
let mongod;
let server;
let base;
let mongoose;
const emails = [];

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_erp_letters_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = 're_test_key';
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
  const erpPublic = (await import('../../src/erp/publicRoutes.js')).default;
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  app.use('/', erpPublic);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

async function call(path, { method = 'GET', token, body, raw = false, root = false } = {}) {
  const res = await fetch(`${base}${root ? '' : '/api/admin'}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (raw) return { status: res.status, buffer: Buffer.from(await res.arrayBuffer()) };
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
  const set = await call('/team/me/password', { method: 'POST', token: login.body.token, body: { currentPassword: temp, newPassword: password } });
  // Setting a password signs out every other session and renews this one
  return { id: login.body.admin.id, token: set.body.token, password };
}

let owner;
let intern;
let letter;

test('a completion certificate is filled from the HR file, issued with a number, emailed with the PDF', async () => {
  owner = await adminLogin('owner', 'owner-password-123');
  intern = await onboard(owner, { username: 'kabir', role: 'content_intern' });
  await call('/erp/settings', { method: 'PUT', token: owner, body: { signatoryName: 'Manav T', signatoryTitle: 'Founder & CEO' } });
  await call(`/erp/people/${intern.id}`, { method: 'PATCH', token: owner, body: { designation: 'Content Writing Intern', joiningDate: '2026-08-01', lastWorkingDay: '2026-10-31', legalName: 'Kabir Singh' } });

  const preview = await call('/erp/letters/preview', { method: 'POST', token: owner, body: { adminId: intern.id, type: 'completion', details: 'Kabir wrote 40 blog posts for CVMind.' } });
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.equal(preview.body.data.title, 'Certificate of Internship Completion');
  assert.match(preview.body.data.body, /Kabir Singh/);
  assert.match(preview.body.data.body, /1 August 2026 to 31 October 2026/);
  assert.match(preview.body.data.body, /40 blog posts/);
  assert.doesNotMatch(preview.body.data.body, /\{\w+\}/);

  // Left-over placeholders are refused
  const bad = await call('/erp/letters', { method: 'POST', token: owner, body: { adminId: intern.id, type: 'completion', title: 'X', body: 'Hello {name}' } });
  assert.equal(bad.status, 400);

  const issued = await call('/erp/letters', { method: 'POST', token: owner, body: { adminId: intern.id, type: 'completion', title: preview.body.data.title, body: preview.body.data.body } });
  assert.equal(issued.status, 200, JSON.stringify(issued.body));
  letter = issued.body.data;
  assert.equal(letter.number, `CVM/LTR/${new Date().getFullYear()}/0001`);
  assert.match(letter.code, /^[A-Z0-9]{10}$/);
  assert.match(letter.verifyUrl, /\/verify\/[A-Z0-9]{10}$/);

  const mail = emails.at(-1);
  assert.deepEqual(mail.to, ['kabir@cvmind.test']);
  assert.equal(mail.attachments.length, 1);
  assert.equal(Buffer.from(mail.attachments[0].content, 'base64').subarray(0, 4).toString(), '%PDF');
  const note = await mongoose.connection.db.collection('teamnotifications').findOne({ type: 'letter_issued' });
  assert.equal(String(note.adminId), intern.id);
});

test('anyone can verify a letter by its code; a revoked letter says so', async () => {
  const check = await call(`/api/verify/${letter.code}`, { root: true });
  assert.equal(check.status, 200);
  assert.equal(check.body.data.recipientName, 'Kabir Singh');
  assert.equal(check.body.data.status, 'valid');
  assert.equal(check.body.data.body, undefined);
  assert.equal((await call('/api/verify/AAAAAAAAAA', { root: true })).status, 404);
  assert.equal((await call('/api/verify/bad', { root: true })).status, 404);

  assert.equal((await call(`/erp/letters/${letter.id}/revoke`, { method: 'POST', token: owner, body: {} })).status, 400);
  const revoked = await call(`/erp/letters/${letter.id}/revoke`, { method: 'POST', token: owner, body: { reason: 'Issued with a wrong date' } });
  assert.equal(revoked.body.data.status, 'revoked');
  const after = await call(`/api/verify/${letter.code}`, { root: true });
  assert.equal(after.body.data.status, 'revoked');
});

test('a member sees their letters, downloads the PDF, and requests a new one', async () => {
  const mine = await call('/team/me/letters', { token: intern.token });
  assert.equal(mine.body.data.length, 1);
  assert.equal(mine.body.data[0].body, undefined);
  const pdf = await call(`/team/me/letters/${letter.id}/pdf`, { token: intern.token, raw: true });
  assert.equal(pdf.buffer.subarray(0, 4).toString(), '%PDF');

  const asked = await call('/team/me/letter-requests', { method: 'POST', token: intern.token, body: { type: 'experience', note: 'For a job application' } });
  assert.equal(asked.status, 200);
  assert.equal((await call('/team/me/letter-requests', { method: 'POST', token: intern.token, body: { type: 'experience' } })).status, 409);
  assert.equal((await call('/team/me/letter-requests', { method: 'POST', token: intern.token, body: { type: 'offer' } })).status, 400);

  const requests = await call('/erp/letter-requests', { token: owner });
  assert.equal(requests.body.data.length, 1);
  const preview = await call('/erp/letters/preview', { method: 'POST', token: owner, body: { adminId: intern.id, type: 'experience' } });
  const issued = await call('/erp/letters', { method: 'POST', token: owner, body: { adminId: intern.id, type: 'experience', title: preview.body.data.title, body: preview.body.data.body, requestId: requests.body.data[0].id } });
  assert.equal(issued.status, 200);
  assert.equal((await call('/erp/letter-requests', { token: owner })).body.data.length, 0);
});

test('templates: leadership edits and resets them; HR staff cannot', async () => {
  const saved = await call('/erp/letter-templates/completion', { method: 'PUT', token: owner, body: { title: 'Internship Certificate', body: 'Certified: {name} as {designation}.' } });
  assert.equal(saved.status, 200);
  const preview = await call('/erp/letters/preview', { method: 'POST', token: owner, body: { adminId: intern.id, type: 'completion' } });
  assert.equal(preview.body.data.body, 'Certified: Kabir Singh as Content Writing Intern.');

  const hr = await onboard(owner, { username: 'hrlead', role: 'hr' });
  const hrPanel = await adminLogin('hrlead', hr.password);
  assert.equal((await call('/erp/letter-templates/completion', { method: 'PUT', token: hrPanel, body: { reset: true } })).status, 403);
  await call('/erp/letter-templates/completion', { method: 'PUT', token: owner, body: { reset: true } });
  const list = await call('/erp/letter-templates', { token: hrPanel });
  assert.equal(list.body.data.find((t) => t.type === 'completion').custom, false);
  assert.equal(list.body.canEdit, false);
});

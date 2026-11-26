import { makeLeadershipManagers } from '../helpers/teamManagers.js';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ERP → Hiring: an opening on cvmind.in/careers, an application, stages, an offer, accepting it, joining the team
let mongod;
let server;
let base;
let mongoose;
const emails = [];
const stored = new Map();

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_erp_hiring_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = 're_test_key';
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('api.resend.com')) {
      emails.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: `e${emails.length}` }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, init);
  };
  const express = (await import('express')).default;
  const http = await import('http');
  mongoose = (await import('mongoose')).default;
  const adminRouter = (await import('../../src/admin/router.js')).default;
  const erpPublic = (await import('../../src/erp/publicRoutes.js')).default;
  const { setStorageDriver } = await import('../../src/team/storage.js');
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

async function call(path, { method = 'GET', token, body, root = false } = {}) {
  const res = await fetch(`${base}${root ? '' : '/api/admin'}${path}`, {
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
async function uploadResume() {
  const up = await call('/api/careers/resume-upload', { method: 'POST', root: true, body: { name: 'cv.pdf', mime: 'application/pdf', size: 2000 } });
  assert.equal(up.status, 200, JSON.stringify(up.body));
  stored.set(up.body.uploadUrl.replace('https://r2.test/put/', ''), { size: 2000, mime: 'application/pdf' });
  return up.body.fileId;
}

let owner;
let opening;
let candidateId;
let offerToken;

test('an open opening shows on the careers page and takes applications', async () => {
  owner = await adminLogin('owner', 'owner-password-123');
  const created = await call('/erp/hiring/openings', { method: 'POST', token: owner, body: { title: 'Frontend Developer Intern', employmentType: 'intern', department: 'Engineering', payType: 'stipend', payMin: 5000, payMax: 8000, duration: '3 months', description: 'Build CVMind with React.', questions: ['Why CVMind?'] } });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  opening = created.body.data;
  assert.equal(opening.slug, 'frontend-developer-intern');
  assert.equal(opening.pay, '₹5,000–₹8,000 a month');

  const list = await call('/api/careers', { root: true });
  assert.equal(list.body.data.length, 1);

  // Every question must be answered, and a resume is required
  const noAnswer = await call(`/api/careers/${opening.slug}/apply`, { method: 'POST', root: true, body: { name: 'Isha Rao', email: 'isha@x.com', phone: '+91 98765 43210', resumeFileId: await uploadResume() } });
  assert.equal(noAnswer.status, 400);
  assert.equal((await call(`/api/careers/${opening.slug}/apply`, { method: 'POST', root: true, body: { name: 'Isha Rao', email: 'isha@x.com', phone: '+91 98765 43210', answers: ['I use it'] } })).status, 400);

  const applied = await call(`/api/careers/${opening.slug}/apply`, { method: 'POST', root: true, body: { name: 'Isha Rao', email: 'Isha@X.com', phone: '+91 98765 43210', college: 'IIT Delhi', links: ['https://github.com/isha', 'javascript:alert(1)'], answers: ['I use it every day'], resumeFileId: await uploadResume() } });
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  assert.equal(emails.at(-1).to[0], 'isha@x.com');
  const again = await call(`/api/careers/${opening.slug}/apply`, { method: 'POST', root: true, body: { name: 'Isha Rao', email: 'isha@x.com', phone: '+91 98765 43210', answers: ['x'], resumeFileId: await uploadResume() } });
  assert.equal(again.status, 409);

  const candidates = await call(`/erp/hiring/candidates?openingId=${opening.id}`, { token: owner });
  assert.equal(candidates.body.data.length, 1);
  const c = candidates.body.data[0];
  candidateId = c.id;
  assert.deepEqual(c.links, ['https://github.com/isha']);
  assert.equal(c.stage, 'applied');
  assert.match((await call(`/erp/hiring/candidates/${c.id}/resume`, { token: owner })).body.url, /r2\.test\/get/);
});

test('HR moves the candidate through screening and an interview, with notes and ratings', async () => {
  const screened = await call(`/erp/hiring/candidates/${candidateId}/stage`, { method: 'POST', token: owner, body: { stage: 'screening' } });
  assert.equal(screened.body.data.stage, 'screening');
  const interview = await call(`/erp/hiring/candidates/${candidateId}/stage`, { method: 'POST', token: owner, body: { stage: 'interview', interviewAt: '2026-11-20T11:00:00+05:30', interviewLink: 'https://meet.example/abc' } });
  assert.equal(interview.body.data.stage, 'interview');
  await call(`/erp/hiring/candidates/${candidateId}/notes`, { method: 'POST', token: owner, body: { text: 'Strong React', rating: 4 } });
  const noted = await call(`/erp/hiring/candidates/${candidateId}/notes`, { method: 'POST', token: owner, body: { text: 'Good communication', rating: 5 } });
  assert.equal(noted.body.data.rating, 4.5);
  assert.equal((await call(`/erp/hiring/candidates/${candidateId}/stage`, { method: 'POST', token: owner, body: { stage: 'joined' } })).status, 400);
});

test('an offer is issued from the template, emailed with an accept link, and accepted', async () => {
  await call('/erp/settings', { method: 'PUT', token: owner, body: { signatoryName: 'Manav', signatoryTitle: 'CEO' } });
  const terms = { joiningDate: '2026-12-01', endDate: '2027-02-28', payType: 'stipend', amount: 7000, role: 'frontend_intern' };
  const preview = await call(`/erp/hiring/candidates/${candidateId}/offer/preview`, { method: 'POST', token: owner, body: terms });
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.match(preview.body.data.body, /Frontend Developer Intern/);
  assert.match(preview.body.data.body, /₹7,000/);
  assert.match(preview.body.data.body, /1 December 2026 until 28 February 2027/);

  const sent = await call(`/erp/hiring/candidates/${candidateId}/offer`, { method: 'POST', token: owner, body: { ...terms, ...preview.body.data } });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  offerToken = sent.body.offerUrl.split('/offer/')[1];
  const mail = emails.at(-1);
  assert.equal(mail.to[0], 'isha@x.com');
  assert.equal(mail.attachments.length, 1);
  assert.match(mail.html, new RegExp(`/offer/${offerToken}`));
  assert.equal((await call(`/erp/hiring/candidates/${candidateId}/offer`, { method: 'POST', token: owner, body: { ...terms, ...preview.body.data } })).status, 400);

  const page = await call(`/api/offers/${offerToken}`, { root: true });
  assert.equal(page.body.data.name, 'Isha Rao');
  assert.equal(page.body.data.status, 'sent');
  assert.equal((await call('/api/offers/short', { root: true })).status, 404);
  // Adding to the team needs an accepted offer
  assert.equal((await call(`/erp/hiring/candidates/${candidateId}/add-to-team`, { method: 'POST', token: owner, body: { username: 'isha' } })).status, 400);
  const accepted = await call(`/api/offers/${offerToken}`, { method: 'POST', root: true, body: { accept: true } });
  assert.equal(accepted.body.status, 'accepted');
  assert.equal((await call(`/api/offers/${offerToken}`, { method: 'POST', root: true, body: { accept: false } })).status, 400);
});

test('adding the candidate creates their Team account, HR file and pay from the offer', async () => {
  const added = await call(`/erp/hiring/candidates/${candidateId}/add-to-team`, { method: 'POST', token: owner, body: { username: 'isha' } });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  assert.equal(added.body.data.stage, 'joined');
  const invite = emails.at(-1);
  assert.equal(invite.to[0], 'isha@x.com');
  assert.match(invite.html, /team\.cvmind\.in/);
  const file = await call(`/erp/people/${added.body.adminId}`, { token: owner });
  assert.equal(file.body.data.designation, 'Frontend Developer Intern');
  assert.equal(file.body.data.joiningDate, '2026-12-01');
  assert.equal(file.body.data.endDate, '2027-02-28');
  assert.equal(file.body.data.payHistory[0].amount, 7000);
  assert.equal(file.body.person.department, 'Engineering');
  const letters = await call(`/erp/letters?adminId=${added.body.adminId}`, { token: owner });
  assert.equal(letters.body.data[0].type, 'offer');
});

test('rejections email the candidate; old candidates are deleted 180 days after the opening closes', async () => {
  const applied = await call(`/api/careers/${opening.slug}/apply`, { method: 'POST', root: true, body: { name: 'Dev Shah', email: 'dev@x.com', phone: '9876543210', answers: ['Love it'], resumeFileId: await uploadResume() } });
  assert.equal(applied.status, 200);
  const dev = (await call(`/erp/hiring/candidates?q=dev@x.com`, { token: owner })).body.data[0];
  const rejected = await call(`/erp/hiring/candidates/${dev.id}/reject`, { method: 'POST', token: owner, body: { reason: 'Needs more React' } });
  assert.equal(rejected.body.data.stage, 'rejected');
  assert.equal(emails.at(-1).to[0], 'dev@x.com');
  assert.doesNotMatch(emails.at(-1).html, /Needs more React/);

  await call(`/erp/hiring/openings/${opening.id}`, { method: 'PATCH', token: owner, body: { status: 'closed' } });
  assert.equal((await call('/api/careers', { root: true })).body.data.length, 0);
  const { deleteOldCandidates } = await import('../../src/erp/hiring.js');
  assert.equal((await deleteOldCandidates(new Date())).deleted, 0);
  const later = await deleteOldCandidates(new Date(Date.now() + 181 * 864e5));
  assert.equal(later.deleted, 1);
  const left = await call(`/erp/hiring/candidates?openingId=${opening.id}`, { token: owner });
  assert.deepEqual(left.body.data.map((c) => c.name), ['Isha Rao']);
});

test('candidate emails are plain paragraphs, with no HTML tags shown as text', async () => {
  const mails = emails.filter((m) => /application|Your application to CVMind/i.test(m.subject));
  assert.ok(mails.length >= 2);
  for (const m of mails) assert.doesNotMatch(m.html, /&lt;(strong|br)/);
});

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { signToken } from '../../src/services/authToken.js';

// db.js picks MongoDB or its JSON fallback from MONGODB_URI at import time, so the in-memory
// server starts first and the modules are imported afterwards
let server;
let mongo;
let db;
let baseUrl;
const userToken = signToken({ sub: 'cand-1', kind: 'user', email: 'cand@example.com' });
const otherToken = signToken({ sub: 'cand-2', kind: 'user', email: 'other@example.com' });

before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongo.getUri();
  db = await import('../../src/db.js');
  const { default: autoApplyRouter } = await import('../../src/routes/autoApply.js');
  if (mongoose.connection.readyState !== 1) await mongoose.connection.asPromise();
  await db.grantAutoApplyAccess('cand@example.com');
  await db.grantAutoApplyAccess('other@example.com');

  const app = express();
  app.use(express.json());
  app.use('/api/auto-apply', autoApplyRouter);
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}/api/auto-apply`;
});

after(async () => {
  server?.close();
  await mongoose.disconnect();
  await mongo?.stop();
  delete process.env.MONGODB_URI;
});

async function call(path, { token = userToken, method = 'GET', json } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) },
    body: json ? JSON.stringify(json) : undefined
  });
  return { status: res.status, body: await res.json() };
}

const listMine = async () => (await call('/applications/cand-1')).body.data;

test('tracker status and notes changes survive a reload and never touch the recruiter status', async () => {
  await db.saveCentralApplication({ id: 'CVM-111111', jobId: 'job-1', candidateId: 'cand-1', candidateName: 'Ada', candidateEmail: 'cand@example.com', status: 'Applied' });

  assert.equal((await call('/applications/CVM-111111', { method: 'PATCH', json: { status: 'Interview', notes: 'Prep system design' } })).status, 200);
  let mine = (await listMine()).find((a) => a.id === 'CVM-111111');
  assert.equal(mine.status, 'Interview');
  assert.equal(mine.notes, 'Prep system design');
  // The employer still sees their own status
  const [recruiterView] = await db.getJobApplications('job-1');
  assert.equal(recruiterView.status, 'Applied');

  // A newer recruiter update wins in the candidate's tracker
  await db.updateApplicationStatus('CVM-111111', 'Rejected', 'Recruiter');
  mine = (await listMine()).find((a) => a.id === 'CVM-111111');
  assert.equal(mine.status, 'Rejected');
});

test('tracker edits are checked and limited to the candidate\'s own applications', async () => {
  await db.saveCentralApplication({ id: 'CVM-222222', jobId: 'job-2', candidateId: 'cand-1', candidateName: 'Ada', candidateEmail: 'cand@example.com' });

  assert.equal((await call('/applications/CVM-222222', { method: 'PATCH', json: { status: 'Hired!!' } })).status, 400);
  assert.equal((await call('/applications/CVM-222222', { token: otherToken, method: 'PATCH', json: { status: 'Offer' } })).status, 404);
  assert.equal((await call('/applications/CVM-222222', { token: otherToken, method: 'DELETE' })).status, 404);
  assert.equal((await call('/applications/CVM-404404', { method: 'PATCH', json: { status: 'Offer' } })).status, 404);
  assert.equal((await listMine()).find((a) => a.id === 'CVM-222222').status, 'Applied');
});

test('removing an application hides it from the candidate but keeps it for the employer', async () => {
  await db.saveCentralApplication({ id: 'CVM-333333', jobId: 'job-3', candidateId: 'cand-1', candidateName: 'Ada', candidateEmail: 'cand@example.com' });
  assert.ok((await listMine()).some((a) => a.id === 'CVM-333333'));

  assert.equal((await call('/applications/CVM-333333', { method: 'DELETE' })).status, 200);
  assert.ok(!(await listMine()).some((a) => a.id === 'CVM-333333'), 'stays gone after a reload');
  assert.equal((await db.getJobApplications('job-3')).length, 1);
});

test('applications sent with a different contact email still belong to the account that sent them', async () => {
  await db.saveCentralApplication({ id: 'CVM-444444', jobId: 'job-4', candidateId: 'cand-1', candidateName: 'Ada', candidateEmail: 'ada.personal@example.org' });
  assert.ok((await listMine()).some((a) => a.id === 'CVM-444444'));
  assert.equal((await call('/applications/CVM-444444', { method: 'PATCH', json: { status: 'Assessment' } })).status, 200);
  assert.equal((await listMine()).find((a) => a.id === 'CVM-444444').status, 'Assessment');
  // Another account cannot reach it
  assert.equal((await call('/applications/CVM-444444', { token: otherToken, method: 'PATCH', json: { status: 'Offer' } })).status, 404);
});

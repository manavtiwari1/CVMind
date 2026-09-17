import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import AgentApplication from '../../src/agent/models/AgentApplication.js';
import QueueJob from '../../src/agent/models/QueueJob.js';
import Preferences from '../../src/agent/models/Preferences.js';
import { createParseJobHandler } from '../../src/agent/handlers/parseJob.js';
import { createMatchHandler } from '../../src/agent/handlers/matchApplication.js';
import { createTailorHandler, createRenderPdfHandler } from '../../src/agent/handlers/tailorApplication.js';
import { sha256 } from '../../src/agent/resume/derive.js';
import { FatalError } from '../../src/agent/errors.js';
import { DESCRIPTION, fakeAi, createReadyResume, runQueued, startAgentTestApp, tokenB } from '../helpers/agentFixtures.js';

let testApp;
let api;
before(async () => {
  testApp = await startAgentTestApp();
  api = testApp.api;
});
after(async () => { await testApp.stop(); });
beforeEach(async () => { await testApp.reset(); });

const fakeRender = async (html) => Buffer.from(`%PDF-1.4\n% fake ${sha256(html).slice(0, 8)}\n`);
const parseJob = () => runQueued('job.parse', createParseJobHandler({ ai: { client: fakeAi() } }));
const matchApplication = () => runQueued('app.match', createMatchHandler({ ai: { client: fakeAi() } }));

// Adds a job, scores it and approves it, leaving the application in "tailoring"
async function approvedApplication({ description = DESCRIPTION } = {}) {
  const created = await api('/applications', { method: 'POST', json: { description } });
  assert.equal(created.status, 202, JSON.stringify(created.body));
  if (await QueueJob.exists({ type: 'job.parse', status: 'queued' })) await parseJob();
  await matchApplication();
  const approved = await api(`/applications/${created.body.data.id}/decision`, { method: 'POST', json: { action: 'approve' } });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.data.status, 'tailoring');
  return created.body.data.id;
}

const tailor = (options = {}) => runQueued('app.tailor', createTailorHandler({ ai: { client: fakeAi(options.ai) }, render: options.render ?? fakeRender }));

test('approving tailors the resume inside the guard rails and renders a PDF', async () => {
  await createReadyResume();
  const id = await approvedApplication();
  assert.equal((await api(`/applications/${id}`)).body.data.progress.step, 'tailoring_resume');

  await tailor();

  const application = (await api(`/applications/${id}`)).body.data;
  assert.equal(application.status, 'ready_for_review');
  assert.equal(application.progress.step, 'awaiting_submission');
  assert.equal(application.tailored.hasPdf, true);
  assert.deepEqual(application.tailored.changes, ['Moved payments work to the top']);

  const docs = (await api(`/applications/${id}/tailored`)).body.data;
  assert.deepEqual(docs.resume.experience[0].bullets, [
    { sourceBulletId: 'exp0-b0', text: 'Built the billing pipeline behind payments checkout', original: 'Built billing pipeline for payments' },
    { sourceBulletId: 'exp0-b1', text: 'Led migration to Kubernetes', original: 'Led migration to Kubernetes' }
  ]);
  assert.deepEqual(docs.resume.skills, ['Node', 'Postgres', 'JavaScript', 'Docker']);
  assert.equal(docs.violations, 3);
  assert.equal(docs.userEdited, false);
  assert.equal(docs.coverLetter.needsReview, false);
  assert.match(docs.coverLetter.body, /^Dear Acme Pay team,/);
  assert.equal(docs.pdf.filename, 'Ada_Lovelace_Resume.pdf');

  const types = (await api(`/applications/${id}/events`)).body.data.map((e) => e.type);
  for (const type of ['tailor.guard_violation', 'tailor.completed', 'pdf.rendered']) assert.ok(types.includes(type), type);

  const pdf = await api(`/applications/${id}/resume.pdf`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.match(pdf.body.toString('utf8'), /^%PDF-1\.4/);
});

test('editing tailored documents re-renders the PDF and submitting locks them', async () => {
  await createReadyResume();
  const id = await approvedApplication();
  await tailor();
  const before = (await AgentApplication.findById(id).lean()).tailored.pdf;

  const edited = await api(`/applications/${id}/tailored`, {
    method: 'PATCH',
    json: {
      summary: 'Backend engineer focused on payments.',
      experience: [{ id: 'exp0', bullets: ['Led migration to Kubernetes', 'Built the billing pipeline behind payments checkout', '   '] }],
      coverLetter: { subject: 'Hello', body: 'Dear team, I would love to help.' }
    }
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.data.userEdited, true);
  assert.equal(edited.body.data.resume.summary, 'Backend engineer focused on payments.');
  assert.deepEqual(edited.body.data.resume.experience[0].bullets.map((b) => b.sourceBulletId), ['exp0-b1', 'exp0-b0']);
  assert.equal(edited.body.data.coverLetter.needsReview, false);

  // The old PDF no longer matches the edited resume, so it is not served
  const stale = await api(`/applications/${id}/resume.pdf`);
  assert.equal(stale.status, 202);
  assert.equal(stale.body.code, 'PDF_RENDERING');

  await runQueued('app.render_pdf', createRenderPdfHandler({ render: fakeRender }));
  const after = (await AgentApplication.findById(id).lean()).tailored.pdf;
  assert.notEqual(after.sha256, before.sha256);
  assert.equal((await api(`/applications/${id}/resume.pdf`)).status, 200);
  // The superseded file is removed rather than left behind in GridFS
  const files = await mongoose.connection.db.collection('agentArtifacts.files').countDocuments({ 'metadata.applicationId': id });
  assert.equal(files, 1);

  assert.equal((await api(`/applications/${id}/tailored`, { method: 'PATCH', json: { madeUpField: 1 } })).body.code, 'INVALID_EDIT');

  const submitted = await api(`/applications/${id}/mark-submitted`, { method: 'POST' });
  assert.equal(submitted.body.data.status, 'submitted');
  assert.equal(submitted.body.data.submission.via, 'manual');
  assert.ok(submitted.body.data.submission.submittedAt);
  assert.equal((await api(`/applications/${id}/mark-submitted`, { method: 'POST' })).body.code, 'NOT_READY');
  assert.equal((await api(`/applications/${id}/tailored`, { method: 'PATCH', json: { summary: 'later' } })).body.code, 'NOT_EDITABLE');
  assert.ok((await api(`/applications/${id}/events`)).body.data.some((e) => e.type === 'application.submitted'));
});

test('tailored documents are private to their owner', async () => {
  await createReadyResume();
  const id = await approvedApplication();
  await tailor();

  for (const [path, options] of [
    ['/tailored', {}],
    ['/tailored', { method: 'PATCH', json: { summary: 'mine now' } }],
    ['/resume.pdf', {}],
    ['/mark-submitted', { method: 'POST' }]
  ]) {
    assert.equal((await api(`/applications/${id}${path}`, { token: tokenB, ...options })).status, 404, path);
  }
  assert.equal((await api(`/applications/${id}/tailored`, { token: null })).status, 401);
});

test('the daily approval cap stops further approvals', async () => {
  await createReadyResume();
  await Preferences.create({ userId: 'user-a', dailyApplyCap: 1 });
  await approvedApplication();

  const second = await api('/applications', { method: 'POST', json: { description: `${DESCRIPTION} This is a second posting.` } });
  await parseJob();
  await matchApplication();
  const blocked = await api(`/applications/${second.body.data.id}/decision`, { method: 'POST', json: { action: 'approve' } });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'DAILY_CAP');
  assert.match(blocked.body.error, /daily limit of 1/);
  assert.equal((await api(`/applications/${second.body.data.id}`)).body.data.status, 'matched');
});

test('a failed PDF still leaves usable documents, but a failed rewrite fails the application', async () => {
  await createReadyResume();
  const id = await approvedApplication();
  await tailor({ render: async () => { throw new Error('Chromium missing'); } });

  const application = (await api(`/applications/${id}`)).body.data;
  assert.equal(application.status, 'ready_for_review');
  assert.equal(application.tailored.hasPdf, false);
  assert.ok((await api(`/applications/${id}/events`)).body.data.some((e) => e.type === 'pdf.failed'));
  assert.equal((await api(`/applications/${id}/resume.pdf`)).status, 202);
  assert.ok(await QueueJob.findOne({ type: 'app.render_pdf', status: 'queued' }));

  const other = await approvedApplication({ description: `${DESCRIPTION} Another posting entirely.` });
  await assert.rejects(tailor({ ai: { fail: { tailor: new FatalError('the model refused', { code: 'REFUSED' }) } } }), /the model refused/);
  const failed = (await api(`/applications/${other}`)).body.data;
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error.stage, 'tailor');
  assert.equal(failed.tailored, null);
  assert.ok((await api(`/applications/${other}/events`)).body.data.some((e) => e.type === 'tailor.failed'));
});

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import AgentApplication from '@cvmind/auto-apply-agent/models/AgentApplication.js';
import JobPosting from '@cvmind/auto-apply-agent/models/JobPosting.js';
import ResumeProfile from '@cvmind/auto-apply-agent/models/ResumeProfile.js';
import QueueJob from '@cvmind/auto-apply-agent/models/QueueJob.js';
import RateBucket from '@cvmind/auto-apply-agent/models/RateBucket.js';
import Preferences from '@cvmind/auto-apply-agent/models/Preferences.js';
import { createMatchHandler } from '@cvmind/auto-apply-agent/handlers/matchApplication.js';
import { createApplyFillHandler, createApplySubmitHandler } from '@cvmind/auto-apply-agent/handlers/applyApplication.js';
import { onDead } from '@cvmind/auto-apply-agent/queue/workers.js';
import { formUrlFor } from '@cvmind/auto-apply-agent/adapters/index.js';
import { RateLimitDeferral, FatalError } from '@cvmind/auto-apply-agent/errors.js';
import { createReadyResume, fakeAi, jobRun, startAgentTestApp } from '../helpers/agentFixtures.js';

let testApp;
let api;
before(async () => {
  testApp = await startAgentTestApp();
  api = testApp.api;
});
after(async () => { await testApp.stop(); });
beforeEach(async () => { await testApp.reset(); });

const DAY_MS = 24 * 60 * 60 * 1000;
const GREENHOUSE_URL = 'https://boards.greenhouse.io/acmepay/jobs/12345';

async function postingFor(extra = {}) {
  return JobPosting.create({
    source: 'url',
    url: GREENHOUSE_URL,
    applyUrl: GREENHOUSE_URL,
    ats: 'greenhouse',
    atsIds: { boardToken: 'acmepay', jobId: '12345' },
    status: 'ready',
    title: 'Backend Engineer',
    company: { name: 'Acme Pay', key: 'company:acmepay' },
    ...extra
  });
}

async function reviewableApplication({ posting, resume, ...extra } = {}) {
  posting ??= await postingFor();
  resume ??= await createReadyResume();
  return AgentApplication.create({
    userId: 'user-a',
    jobPostingId: posting._id,
    resumeProfileId: resume._id,
    status: 'ready_for_review',
    decision: { state: 'approved' },
    companyKey: 'company:acmepay',
    progress: { step: 'awaiting_submission', updatedAt: new Date() },
    ...extra
  });
}

const filled = (planHash = 'plan-1') => ({
  adapter: 'greenhouse',
  plan: { items: [{ selector: '#first_name', label: 'First Name', action: 'fill', value: 'Ada' }], planHash },
  planHash,
  fingerprint: 'fp',
  filled: 1
});

const fillCompanySlot = (userId = 'user-a') => {
  const windowStart = new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS);
  return RateBucket.create({ key: `user:${userId}:company:company:acmepay`, windowStart, count: 1, expiresAt: new Date(windowStart.getTime() + 2 * DAY_MS) });
};

// ── Queue and handlers ────────────────────────────────────────────────────────

test('a PDF render that fails for good leaves the application reviewable', async () => {
  const application = await reviewableApplication();
  const err = new FatalError('No browser.', { code: 'BROWSER_UNAVAILABLE' });

  await onDead({ _id: application._id, type: 'app.render_pdf', applicationId: application._id, userId: 'user-a', attempts: 3 }, err);
  assert.equal((await AgentApplication.findById(application._id).lean()).status, 'ready_for_review');

  // Other stages still fail the application
  await onDead({ _id: application._id, type: 'app.tailor', applicationId: application._id, userId: 'user-a', attempts: 5 }, err);
  assert.equal((await AgentApplication.findById(application._id).lean()).status, 'failed');
});

test('scoring waits for a resume that is still being parsed instead of failing', async () => {
  const posting = await postingFor();
  const resume = await ResumeProfile.create({ userId: 'user-a', source: 'upload', status: 'parsing' });
  const application = await AgentApplication.create({ userId: 'user-a', jobPostingId: posting._id, resumeProfileId: resume._id, status: 'pending' });
  const match = createMatchHandler({ ai: { client: fakeAi() } });

  // Even on what would be its last attempt, waiting defers rather than failing
  const lastAttempt = { ...jobRun({ applicationId: String(application._id) }), attempts: 5, maxAttempts: 5 };
  await assert.rejects(match(lastAttempt), RateLimitDeferral);
  let stored = await AgentApplication.findById(application._id).lean();
  assert.equal(stored.status, 'pending');
  assert.equal(stored.progress.step, 'parsing_resume');

  // A parse that never finishes eventually fails the application with a clear reason
  await assert.rejects(match({ ...lastAttempt, deferrals: 240 }), FatalError);
  stored = await AgentApplication.findById(application._id).lean();
  assert.equal(stored.status, 'failed');
  assert.equal(stored.error.code, 'RESUME_NOT_READY');
});

test('scoring also waits for a job posting that is still being read', async () => {
  const posting = await postingFor({ status: 'parsing' });
  const resume = await createReadyResume();
  const application = await AgentApplication.create({ userId: 'user-a', jobPostingId: posting._id, resumeProfileId: resume._id, status: 'pending' });

  await assert.rejects(createMatchHandler({ ai: { client: fakeAi() } })({ ...jobRun({ applicationId: String(application._id) }), attempts: 5 }), RateLimitDeferral);
  const stored = await AgentApplication.findById(application._id).lean();
  assert.equal(stored.status, 'pending');
  assert.equal(stored.progress.step, 'parsing_job');
});

test('filling never uses the one-per-company daily slot, so it can be retried the same day', async () => {
  const application = await reviewableApplication();
  await fillCompanySlot();
  const fill = createApplyFillHandler({ runInContext: async () => ({ blockers: { blocked: true, captcha: true } }) });

  // Twice: a retry or a second "Fill it for me" must not be pushed to tomorrow
  await fill(jobRun({ applicationId: String(application._id) }));
  await fill(jobRun({ applicationId: String(application._id) }));
  const stored = await AgentApplication.findById(application._id).lean();
  assert.equal(stored.fill.blockedReason, 'captcha');
  assert.equal(stored.status, 'ready_for_review');
});

test('a rate-limited fill on its last attempt is deferred, not failed', async () => {
  const application = await reviewableApplication();
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000);
  await RateBucket.create({ key: 'ats:greenhouse', windowStart, count: 6, expiresAt: new Date(windowStart.getTime() + 120000) });

  const fill = createApplyFillHandler({ runInContext: async () => { throw new Error('should not open a browser'); } });
  const lastAttempt = { ...jobRun({ applicationId: String(application._id) }), attempts: 5, maxAttempts: 5 };
  try {
    await fill(lastAttempt);
    assert.fail('expected a deferral');
  } catch (err) {
    // The window can roll over between creating the bucket and the call; then the browser stub runs instead
    if (!(err instanceof RateLimitDeferral)) assert.equal(err.message, 'should not open a browser');
  }
  assert.equal((await AgentApplication.findById(application._id).lean()).status, 'ready_for_review');
});

test('the daily company limit defers a submit to tomorrow without failing it or showing it as running', async () => {
  const application = await reviewableApplication({ fill: { ...filled(), approvedPlanHash: 'plan-1' } });
  await fillCompanySlot();
  const submit = createApplySubmitHandler({ runInContext: async () => { throw new Error('should not open a browser'); } });

  await assert.rejects(submit({ ...jobRun({ applicationId: String(application._id) }), attempts: 1, maxAttempts: 1 }), RateLimitDeferral);
  const stored = await AgentApplication.findById(application._id).lean();
  assert.equal(stored.status, 'ready_for_review');
  assert.equal(stored.progress.step, 'submit_scheduled');
  assert.equal(stored.submission, null);
});

// ── Greenhouse boards on company domains ──────────────────────────────────────

test('Greenhouse jobs on a company careers page are filled through the Greenhouse embed form', () => {
  const ids = { boardToken: 'acmepay', jobId: '12345' };
  assert.equal(
    formUrlFor({ ats: 'greenhouse', atsIds: ids, applyUrl: 'https://acme.com/careers?gh_jid=12345', url: GREENHOUSE_URL }),
    'https://boards.greenhouse.io/embed/job_app?for=acmepay&token=12345'
  );
  // A greenhouse.io link is used as it is
  assert.equal(formUrlFor({ ats: 'greenhouse', atsIds: ids, applyUrl: 'https://job-boards.greenhouse.io/acmepay/jobs/12345' }), 'https://job-boards.greenhouse.io/acmepay/jobs/12345');
  // Other boards and incomplete ids are untouched
  assert.equal(formUrlFor({ ats: 'lever', applyUrl: 'https://jobs.lever.co/acme/x' }), 'https://jobs.lever.co/acme/x');
  assert.equal(formUrlFor({ ats: 'greenhouse', atsIds: { boardToken: 'acmepay' }, applyUrl: 'https://acme.com/careers' }), 'https://acme.com/careers');
  assert.equal(formUrlFor({ url: 'https://example.com/job' }), 'https://example.com/job');
  assert.equal(formUrlFor(null), '');
});

// ── Routes ────────────────────────────────────────────────────────────────────

test('server fill saves its progress up front and works for Greenhouse jobs on company domains', async () => {
  const posting = await postingFor({ applyUrl: 'https://acme.com/careers?gh_jid=12345' });
  const application = await reviewableApplication({ posting });

  const started = await api(`/applications/${application._id}/server-fill`, { method: 'POST' });
  assert.equal(started.status, 202, JSON.stringify(started.body));
  assert.equal(started.body.data.progress.step, 'filling');
  // Stored, so the next poll still sees it as running
  assert.equal((await AgentApplication.findById(application._id).lean()).progress.step, 'filling');
  assert.ok(await QueueJob.exists({ applicationId: application._id, type: 'apply.fill', status: 'queued' }));
});

test('server fill is refused while a submit is queued', async () => {
  const application = await reviewableApplication({ fill: filled() });
  await QueueJob.create({ queue: 'apply', type: 'apply.submit', applicationId: application._id, userId: 'user-a', payload: {} });
  const res = await api(`/applications/${application._id}/server-fill`, { method: 'POST' });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'IN_PROGRESS');
});

test('submitting checks the status, the reviewed answers and running work before queuing', async () => {
  const application = await reviewableApplication({ fill: filled() });
  const submit = (planHash) => api(`/applications/${application._id}/submit`, { method: 'POST', json: { planHash } });

  assert.equal((await submit('stale')).body.code, 'PLAN_CHANGED');
  assert.equal((await submit(undefined)).body.code, 'PLAN_CHANGED');

  const fillJob = await QueueJob.create({ queue: 'apply', type: 'apply.fill', applicationId: application._id, userId: 'user-a', payload: {} });
  assert.equal((await submit('plan-1')).body.code, 'IN_PROGRESS');
  await QueueJob.deleteOne({ _id: fillJob._id });

  const ok = await submit('plan-1');
  assert.equal(ok.status, 202, JSON.stringify(ok.body));
  const stored = await AgentApplication.findById(application._id).lean();
  assert.equal(stored.fill.approvedPlanHash, 'plan-1');
  assert.equal(stored.progress.step, 'submitting');
  assert.ok(await QueueJob.exists({ applicationId: application._id, type: 'apply.submit', status: 'queued' }));

  await AgentApplication.updateOne({ _id: application._id }, { $set: { status: 'failed' } });
  await QueueJob.deleteMany({});
  assert.equal((await submit('plan-1')).body.code, 'NOT_READY');
});

test('making a resume the default, or deleting the preferred one, clears the preferences override', async () => {
  const first = await createReadyResume();
  const second = await ResumeProfile.create({ userId: 'user-a', source: 'upload', status: 'ready', label: 'Second' });
  await Preferences.create({ userId: 'user-a', defaultResumeProfileId: first._id });

  assert.equal((await api(`/resumes/${second._id}/default`, { method: 'POST' })).status, 200);
  assert.equal((await Preferences.findOne({ userId: 'user-a' }).lean()).defaultResumeProfileId, null);

  await Preferences.updateOne({ userId: 'user-a' }, { $set: { defaultResumeProfileId: second._id } });
  assert.equal((await api(`/resumes/${first._id}`, { method: 'DELETE' })).status, 200);
  assert.equal(String((await Preferences.findOne({ userId: 'user-a' }).lean()).defaultResumeProfileId), String(second._id), 'deleting another resume keeps the choice');
  assert.equal((await api(`/resumes/${second._id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await Preferences.findOne({ userId: 'user-a' }).lean()).defaultResumeProfileId, null);
});

test('answers are locked while a submit is scheduled, and a stale approval cancels the submit quietly', async () => {
  const application = await reviewableApplication({ fill: { ...filled(), approvedPlanHash: 'plan-1' } });
  await QueueJob.create({ queue: 'apply', type: 'apply.submit', applicationId: application._id, userId: 'user-a', payload: {} });
  const edit = await api(`/applications/${application._id}/fill-plan`, { method: 'PATCH', json: { items: [{ selector: '#first_name', value: 'Grace' }] } });
  assert.equal(edit.status, 409);
  assert.equal(edit.body.code, 'IN_PROGRESS');
  assert.equal((await AgentApplication.findById(application._id).lean()).fill.approvedPlanHash, 'plan-1');

  // If the answers changed anyway (e.g. an older client), the submit sends nothing and does not fail the application
  await AgentApplication.updateOne({ _id: application._id }, { $set: { 'fill.approvedPlanHash': null } });
  const submit = createApplySubmitHandler({ runInContext: async () => { throw new Error('should not open a browser'); } });
  await submit({ ...jobRun({ applicationId: String(application._id) }), attempts: 1, maxAttempts: 1 });
  const stored = await AgentApplication.findById(application._id).lean();
  assert.equal(stored.status, 'ready_for_review');
  assert.equal(stored.progress.step, 'awaiting_submit');
  assert.equal(stored.submission, null);
});

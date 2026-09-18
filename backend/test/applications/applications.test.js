import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import ResumeProfile from '../../src/agent/models/ResumeProfile.js';
import QueueJob from '../../src/agent/models/QueueJob.js';
import JobPosting from '../../src/agent/models/JobPosting.js';
import AgentApplication from '../../src/agent/models/AgentApplication.js';
import Preferences from '../../src/agent/models/Preferences.js';
import { createParseJobHandler } from '../../src/agent/handlers/parseJob.js';
import { createMatchHandler } from '../../src/agent/handlers/matchApplication.js';
import { migrateLegacyApplications } from '../../src/agent/migrations/legacyApplications.js';
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

const parseJob = () => runQueued('job.parse', createParseJobHandler({ ai: { client: fakeAi() } }));
const matchApplication = () => runQueued('app.match', createMatchHandler({ ai: { client: fakeAi() } }));

test('adding a job validates input and needs a usable resume', async () => {
  assert.equal((await api('/applications', { token: null, method: 'POST', json: {} })).status, 401);
  assert.equal((await api('/applications', { method: 'POST', json: { description: DESCRIPTION } })).body.code, 'NO_RESUME');

  await createReadyResume();
  assert.equal((await api('/applications', { method: 'POST', json: {} })).body.code, 'MISSING_JOB');
  assert.equal((await api('/applications', { method: 'POST', json: { description: 'Too short' } })).body.code, 'DESCRIPTION_TOO_SHORT');
  assert.equal((await api('/applications', { method: 'POST', json: { url: 'not a url' } })).body.code, 'INVALID_URL');
  assert.equal((await api('/applications', { method: 'POST', json: { url: 'ftp://example.com/job' } })).body.code, 'INVALID_URL');

  const foreign = await ResumeProfile.create({ userId: 'user-b', source: 'upload', status: 'ready' });
  assert.equal((await api('/applications', { method: 'POST', json: { description: DESCRIPTION, resumeProfileId: String(foreign._id) } })).body.code, 'NO_RESUME');
});

test('a pasted job is parsed, scored and explained', async () => {
  await createReadyResume();
  const created = await api('/applications', { method: 'POST', json: { description: DESCRIPTION } });
  assert.equal(created.status, 202);
  assert.equal(created.body.data.status, 'pending');
  assert.equal(created.body.data.progress.step, 'parsing_job');
  const id = created.body.data.id;

  const parse = await parseJob();
  const posting = await JobPosting.findById(parse.payload.jobPostingId).lean();
  assert.equal(posting.status, 'ready');
  assert.deepEqual(posting.requirements.normalizedMust, ['node.js', 'postgresql', 'kubernetes']);
  assert.deepEqual(posting.requirements.normalizedNice, ['golang']);
  assert.equal(posting.company.key, 'company:acmepay');
  assert.equal(posting.embeddings.responsibilities.length, 2);

  const match = await matchApplication();
  assert.equal(match.payload.applicationId, id);

  const application = (await api(`/applications/${id}`)).body.data;
  assert.equal(application.status, 'matched');
  assert.equal(application.progress.step, 'awaiting_decision');
  assert.equal(application.job.title, 'Senior Backend Engineer');
  assert.equal(application.job.company, 'Acme Pay');
  assert.equal(application.tailored, null);
  assert.deepEqual(application.score.matchedSkills, ['node.js', 'postgresql']);
  assert.deepEqual(application.score.missingMustHave, ['kubernetes']);
  assert.equal(application.score.components.semantic, 1);
  assert.equal(application.score.components.skills, Math.round((2 / 3.5) * 1000) / 1000);
  assert.equal(application.score.gatesPassed, true);
  assert.equal(application.score.gates.find((g) => g.key === 'min_years').result, 'pass');
  assert.equal(application.score.topMatches.find((m) => m.responsibility === 'Own the payments checkout service').bulletText, 'Built billing pipeline for payments');
  assert.ok(application.score.total > 0 && application.score.total <= 100);

  const events = await api(`/applications/${id}/events`);
  assert.deepEqual(events.body.data.map((e) => e.type), ['application.created', 'job.parsed', 'score.computed']);
  assert.equal((await api('/applications')).body.data[0].id, id);
});

test('a job is parsed once, shared across users and added once per user', async () => {
  await createReadyResume('user-a');
  await createReadyResume('user-b');
  const created = await api('/applications', { method: 'POST', json: { description: DESCRIPTION } });
  await parseJob();

  const again = await api('/applications', { method: 'POST', json: { description: `  ${DESCRIPTION}  ` } });
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'ALREADY_ADDED');
  assert.equal(again.body.data.id, created.body.data.id);

  const other = await api('/applications', { token: tokenB, method: 'POST', json: { description: DESCRIPTION } });
  assert.equal(other.status, 202);
  assert.equal(other.body.data.progress.step, 'scoring');
  assert.equal(await JobPosting.countDocuments(), 1);
  assert.ok(await QueueJob.findOne({ type: 'app.match', applicationId: other.body.data.id }));

  assert.equal((await api(`/applications/${created.body.data.id}`, { token: tokenB })).status, 404);
  assert.equal((await api(`/applications/${created.body.data.id}/events`, { token: tokenB })).status, 404);
  assert.equal((await api('/applications', { token: tokenB })).body.data.length, 1);

  assert.equal((await api(`/applications/${created.body.data.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await api('/applications')).body.data.length, 0);
});

test('approving needs a scored job, an explicit override for failed requirements, and starts tailoring', async () => {
  await createReadyResume();
  await Preferences.create({ userId: 'user-a', excludedCompanies: ['Acme Pay Pvt Ltd'] });
  const id = (await api('/applications', { method: 'POST', json: { description: DESCRIPTION } })).body.data.id;

  assert.equal((await api(`/applications/${id}/decision`, { method: 'POST', json: { action: 'maybe' } })).status, 400);
  assert.equal((await api(`/applications/${id}/decision`, { method: 'POST', json: { action: 'approve' } })).body.code, 'NOT_SCORED');

  await parseJob();
  await matchApplication();
  const detail = (await api(`/applications/${id}`)).body.data;
  assert.equal(detail.score.gatesPassed, false);
  assert.equal(detail.score.recommendation, 'not_recommended');

  const skipped = await api(`/applications/${id}/decision`, { method: 'POST', json: { action: 'skip' } });
  assert.equal(skipped.body.data.decision.state, 'skipped');
  assert.equal(skipped.body.data.status, 'matched');

  assert.equal((await api(`/applications/${id}/decision`, { method: 'POST', json: { action: 'approve' } })).body.code, 'GATES_FAILED');
  const approved = await api(`/applications/${id}/decision`, { method: 'POST', json: { action: 'approve', overrideGates: true, mode: 'extension' } });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.data.status, 'tailoring');
  assert.equal(approved.body.data.decision.state, 'approved');
  assert.equal(approved.body.data.decision.overrideGates, true);
  assert.equal(approved.body.data.decision.mode, 'extension');
  assert.ok(await QueueJob.findOne({ type: 'app.tailor', applicationId: id }));

  // Once tailoring has started the decision can no longer change
  assert.equal((await api(`/applications/${id}/decision`, { method: 'POST', json: { action: 'skip' } })).body.code, 'NOT_SCORED');
  assert.equal((await api(`/applications/${id}/rescore`, { method: 'POST', json: {} })).body.code, 'IN_PROGRESS');

  const types = (await api(`/applications/${id}/events`)).body.data.map((e) => e.type);
  assert.ok(types.includes('decision.skipped'));
  assert.ok(types.includes('decision.gate_override'));
});

test('re-scoring picks up changed preferences and resets the decision', async () => {
  await createReadyResume();
  await Preferences.create({ userId: 'user-a', excludedCompanies: ['Acme Pay'] });
  const id = (await api('/applications', { method: 'POST', json: { description: DESCRIPTION } })).body.data.id;
  await parseJob();
  await matchApplication();
  await api(`/applications/${id}/decision`, { method: 'POST', json: { action: 'skip' } });

  await Preferences.updateOne({ userId: 'user-a' }, { $set: { excludedCompanies: [] } });
  const rescore = await api(`/applications/${id}/rescore`, { method: 'POST', json: {} });
  assert.equal(rescore.status, 202);
  assert.equal(rescore.body.data.decision.state, 'undecided');
  await matchApplication();
  assert.equal((await api(`/applications/${id}`)).body.data.score.gatesPassed, true);
});

test('Greenhouse links are normalized, deduplicated and read through the ATS API', async () => {
  await createReadyResume();
  const created = await api('/applications', { method: 'POST', json: { url: 'https://www.boards.greenhouse.io/acmepay/jobs/12345?gh_src=newsletter&utm_source=x' } });
  assert.equal(created.status, 202);
  const posting = await JobPosting.findOne().lean();
  assert.equal(posting.url, 'https://boards.greenhouse.io/acmepay/jobs/12345');
  assert.equal(posting.ats, 'greenhouse');
  assert.equal(posting.atsIds.boardToken, 'acmepay');
  assert.equal(posting.atsIds.jobId, '12345');

  const calls = [];
  const unexpected = async () => { throw new Error('wrong fetcher'); };
  const fetchers = {
    greenhouse: async (ids) => {
      calls.push(ids);
      return { title: 'Senior Backend Engineer', company: 'Acme Pay', location: 'Bengaluru', descriptionText: DESCRIPTION, applyUrl: 'https://boards.greenhouse.io/acmepay/jobs/12345', atsQuestions: [{ label: 'Resume', required: true, fields: [] }] };
    },
    lever: unexpected,
    generic: unexpected
  };
  await runQueued('job.parse', createParseJobHandler({ ai: { client: fakeAi() }, fetchers }));
  assert.equal(calls[0].boardToken, 'acmepay');
  const ready = await JobPosting.findById(posting._id).lean();
  assert.equal(ready.company.key, 'greenhouse:acmepay');
  assert.equal(ready.atsQuestions.length, 1);

  await createReadyResume('user-b');
  const sameJob = await api('/applications', { token: tokenB, method: 'POST', json: { url: 'https://boards.greenhouse.io/acmepay/jobs/12345/' } });
  assert.equal(sameJob.body.data.job.id, String(posting._id));
});

test('a job that cannot be read fails its applications, and retrying reads it again', async () => {
  await createReadyResume();
  const created = await api('/applications', { method: 'POST', json: { url: 'https://careers.example.com/jobs/backend' } });
  const fetchers = { generic: async () => { throw new FatalError('Could not read a job description on that page.', { code: 'JOB_PAGE_EMPTY' }); } };
  await assert.rejects(runQueued('job.parse', createParseJobHandler({ ai: { client: fakeAi() }, fetchers })), /Could not read/);

  const failed = (await api(`/applications/${created.body.data.id}`)).body.data;
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error.stage, 'job.parse');
  assert.equal(failed.job.status, 'failed');
  assert.ok((await api(`/applications/${created.body.data.id}/events`)).body.data.some((e) => e.type === 'job.parse_failed'));

  await QueueJob.deleteMany({});
  const retry = await api(`/applications/${created.body.data.id}/rescore`, { method: 'POST', json: {} });
  assert.equal(retry.status, 202);
  assert.equal(retry.body.data.status, 'pending');
  assert.equal(retry.body.data.job.status, 'pending');
  assert.ok(await QueueJob.findOne({ type: 'job.parse', status: 'queued' }));
});

test('legacy JSON applications migrate once, keeping status, score and history', async () => {
  const legacy = [
    {
      id: 'CVM-123456', userId: 'user-a', job: { id: 'j002', title: 'Full Stack Developer', company: 'Zepto', location: 'Mumbai' },
      matchScore: 88, status: 'Applied', appliedAt: '2026-08-01T10:00:00.000Z', coverLetter: 'Dear team', notes: 'Follow up',
      events: [{ title: 'Application Submitted', description: 'Applied via Auto mode.', timestamp: '2026-08-01T10:00:00.000Z', actor: 'Candidate' }]
    },
    { id: 'CVM-999999', userId: 'ghost', job: { id: 'j003', title: 'X', company: 'Y' } },
    { id: 'broken' }
  ];
  const userExists = async (id) => id === 'user-a';

  const dry = await migrateLegacyApplications(legacy, { dryRun: true, userExists });
  assert.deepEqual(dry, { total: 3, migrated: 1, skippedExisting: 0, skippedUnknownUser: 1, invalid: 1 });
  assert.equal(await AgentApplication.countDocuments(), 0);

  const applied = await migrateLegacyApplications(legacy, { dryRun: false, userExists });
  assert.equal(applied.migrated, 1);
  const again = await migrateLegacyApplications(legacy, { dryRun: false, userExists });
  assert.equal(again.skippedExisting, 1);
  assert.equal(await AgentApplication.countDocuments(), 1);

  const { body } = await api('/applications');
  assert.equal(body.data[0].status, 'submitted');
  assert.equal(body.data[0].score.total, 88);
  assert.equal(body.data[0].job.company, 'Zepto');
  assert.equal(body.data[0].tailored, null);
  const events = (await api(`/applications/${body.data[0].id}/events`)).body.data;
  assert.equal(events[0].message, 'Application Submitted — Applied via Auto mode.');
  assert.equal(new Date(events[0].createdAt).toISOString(), '2026-08-01T10:00:00.000Z');
});

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import AgentApplication from '../../src/agent/models/AgentApplication.js';
import JobPosting from '../../src/agent/models/JobPosting.js';
import QueueJob from '../../src/agent/models/QueueJob.js';
import ApplicationEvent from '../../src/agent/models/ApplicationEvent.js';
import { sweepStuckApplications } from '../../src/agent/sweeper.js';
import { JOB_PARSE_VERSION } from '../../src/agent/jobs/jobData.js';
import { startTestMongo } from '../helpers/mongo.js';

let mongo;
before(async () => { mongo = await startTestMongo([AgentApplication, JobPosting, QueueJob, ApplicationEvent]); });
after(async () => { await mongo.stop(); });
beforeEach(async () => { await mongo.reset(); });

const LONG_AGO = new Date(Date.now() - 30 * 60 * 1000);
const JUST_NOW = new Date();

const readyPosting = () => JobPosting.create({ source: 'paste', status: 'ready', parseVersion: JOB_PARSE_VERSION, title: 'Backend Engineer' });
const unparsedPosting = () => JobPosting.create({ source: 'url', url: 'https://boards.greenhouse.io/x/jobs/1', status: 'pending', title: '' });

const application = (props) => AgentApplication.create({
  userId: 'user-a',
  jobPostingId: props.jobPostingId,
  status: props.status,
  progress: { step: props.step, updatedAt: props.updatedAt ?? LONG_AGO },
  ...(props.submission ? { submission: props.submission } : {})
});

test('a stalled application waiting on scoring is queued again', async () => {
  const posting = await readyPosting();
  const app = await application({ jobPostingId: posting._id, status: 'pending', step: 'scoring' });

  const resumed = await sweepStuckApplications();
  assert.deepEqual(resumed, [{ applicationId: String(app._id), step: 'app.match' }]);
  assert.ok(await QueueJob.findOne({ type: 'app.match', applicationId: app._id }));
  assert.ok(await ApplicationEvent.findOne({ applicationId: app._id, type: 'queue.resumed' }));
});

test('a stalled application whose job was never read re-queues the job parse', async () => {
  const posting = await unparsedPosting();
  const app = await application({ jobPostingId: posting._id, status: 'pending', step: 'parsing_job' });

  assert.deepEqual((await sweepStuckApplications()).map((r) => r.step), ['job.parse']);
  assert.ok(await QueueJob.findOne({ type: 'job.parse', 'payload.jobPostingId': String(posting._id) }));

  // The parse job is shared by posting, not application, so a live one must stop a duplicate
  await AgentApplication.updateOne({ _id: app._id }, { $set: { 'progress.updatedAt': LONG_AGO } });
  assert.deepEqual(await sweepStuckApplications(), []);
});

test('stalled tailoring and server filling both resume', async () => {
  // A unique {userId, jobPostingId} index stops one user adding the same job twice,
  // so each application in a multi-application test needs its own posting
  const tailoring = await application({ jobPostingId: (await readyPosting())._id, status: 'tailoring', step: 'tailoring_resume' });
  const filling = await application({ jobPostingId: (await readyPosting())._id, status: 'ready_for_review', step: 'filling' });

  const steps = (await sweepStuckApplications()).map((r) => r.step).sort();
  assert.deepEqual(steps, ['app.tailor', 'apply.fill']);
  assert.ok(await QueueJob.findOne({ type: 'app.tailor', applicationId: tailoring._id }));
  assert.ok(await QueueJob.findOne({ type: 'apply.fill', applicationId: filling._id }));
});

test('a submission is never resumed automatically', async () => {
  const posting = await readyPosting();
  await application({ jobPostingId: posting._id, status: 'ready_for_review', step: 'submitting' });
  // Re-running apply.submit could file the same application twice
  assert.deepEqual(await sweepStuckApplications(), []);
  assert.equal(await QueueJob.countDocuments(), 0);
});

test('recent work and applications with a live job are left alone', async () => {
  // Each needs its own posting: {userId, jobPostingId} is unique
  await application({ jobPostingId: (await readyPosting())._id, status: 'tailoring', step: 'tailoring_resume', updatedAt: JUST_NOW });

  const busy = await application({ jobPostingId: (await readyPosting())._id, status: 'tailoring', step: 'tailoring_resume' });
  await QueueJob.create({ queue: 'tailor', type: 'app.tailor', applicationId: busy._id, status: 'running', userId: 'user-a' });

  const settled = await application({ jobPostingId: (await readyPosting())._id, status: 'matched', step: 'awaiting_decision' });
  const done = await application({ jobPostingId: (await readyPosting())._id, status: 'ready_for_review', step: 'filling', submission: { via: 'manual', submittedAt: LONG_AGO } });

  assert.deepEqual(await sweepStuckApplications(), []);
  assert.equal(await QueueJob.countDocuments({ type: { $ne: 'app.tailor' } }), 0);
  assert.ok(settled && done);
});

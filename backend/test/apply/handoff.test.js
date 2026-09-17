import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import AgentApplication from '../../src/agent/models/AgentApplication.js';
import JobPosting from '../../src/agent/models/JobPosting.js';
import ResumeProfile from '../../src/agent/models/ResumeProfile.js';
import ApplicationEvent from '../../src/agent/models/ApplicationEvent.js';
import Preferences from '../../src/agent/models/Preferences.js';
import RateBucket from '../../src/agent/models/RateBucket.js';
import { createApplyFillHandler } from '../../src/agent/handlers/applyApplication.js';
import { buildProfileData } from '../../src/agent/resume/derive.js';
import { startTestMongo } from '../helpers/mongo.js';
import { RESUME, jobRun } from '../helpers/agentFixtures.js';

// Regression cover for a bug found during the first real trial: handOff() wrote `fill.handoff`
// and `fill.blockedReason` as dotted paths, but `fill` was not on the schema, so mongoose
// silently dropped both. The user saw a handoff with no reason and the UI could not explain it.

let mongo;
before(async () => { mongo = await startTestMongo([AgentApplication, JobPosting, ResumeProfile, ApplicationEvent, Preferences, RateBucket]); });
after(async () => { await mongo.stop(); });
beforeEach(async () => { await mongo.reset(); });

const { structured, derived } = buildProfileData(RESUME);

async function readyApplication(extra = {}) {
  const posting = await JobPosting.create({
    source: 'url',
    url: 'https://careers.example.com/jobs/1',
    applyUrl: 'https://careers.example.com/jobs/1',
    ats: 'unknown',
    status: 'ready',
    title: 'Backend Engineer',
    company: { name: 'Example', key: 'company:example' }
  });
  const resume = await ResumeProfile.create({ userId: 'user-a', source: 'upload', status: 'ready', structured, derived });
  const application = await AgentApplication.create({
    userId: 'user-a',
    jobPostingId: posting._id,
    resumeProfileId: resume._id,
    status: 'ready_for_review',
    decision: { state: 'approved' },
    ...extra
  });
  return application;
}

test('handing off records why, so the user is told which form needs the extension', async () => {
  const application = await readyApplication();
  await createApplyFillHandler()(jobRun({ applicationId: String(application._id) }));

  const stored = await AgentApplication.findById(application._id).lean();
  assert.equal(stored.fill.handoff, 'extension');
  assert.equal(stored.fill.blockedReason, 'unsupported_site', 'the reason must survive the write');
  assert.ok(stored.fill.handedOffAt);
  // The application stays reviewable rather than failing
  assert.equal(stored.status, 'ready_for_review');
  assert.equal(stored.progress.step, 'awaiting_submission');

  const event = await ApplicationEvent.findOne({ applicationId: application._id, type: 'fill.handoff' }).lean();
  assert.equal(event.data.reason, 'unsupported_site');
});

test('handing off after a successful fill keeps the plan and screenshot already captured', async () => {
  const application = await readyApplication({
    fill: { adapter: 'greenhouse', planHash: 'abc123', filled: 7, screenshotId: 'shot-1', plan: { items: [] } }
  });
  await createApplyFillHandler()(jobRun({ applicationId: String(application._id) }));

  const stored = await AgentApplication.findById(application._id).lean();
  assert.equal(stored.fill.handoff, 'extension');
  assert.equal(stored.fill.planHash, 'abc123', 'existing fill data must not be wiped by the handoff');
  assert.equal(stored.fill.filled, 7);
  assert.equal(stored.fill.screenshotId, 'shot-1');
});

test('an application that is already submitted is left alone', async () => {
  const application = await readyApplication({ submission: { via: 'manual', submittedAt: new Date() } });
  await createApplyFillHandler()(jobRun({ applicationId: String(application._id) }));

  const stored = await AgentApplication.findById(application._id).lean();
  assert.equal(stored.fill, null);
  assert.equal(await ApplicationEvent.countDocuments({ applicationId: application._id }), 0);
});

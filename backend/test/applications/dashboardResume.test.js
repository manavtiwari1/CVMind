import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import ResumeProfile from '../../src/agent/models/ResumeProfile.js';
import QueueJob from '../../src/agent/models/QueueJob.js';
import AgentApplication from '../../src/agent/models/AgentApplication.js';
import { DESCRIPTION, createReadyResume, startAgentTestApp } from '../helpers/agentFixtures.js';

// Stands in for the user's CVMind dashboard (My Works); tests swap in what each user has saved
let dashboard = new Map();
const loadLatestResumeWork = async (userId) => dashboard.get(userId) || null;

let testApp;
let api;
before(async () => {
  testApp = await startAgentTestApp(undefined, { loadLatestResumeWork });
  api = testApp.api;
});
after(async () => { await testApp.stop(); });
beforeEach(async () => {
  dashboard = new Map();
  await testApp.reset();
});

const builderResume = (overrides = {}) => ({
  _id: 'work-a', userId: 'user-a', type: 'resume', title: 'My dashboard resume',
  htmlContent: '<h1>Ada Lovelace</h1><p>Senior engineer</p>', updatedAt: new Date('2026-09-01'), ...overrides
});

test('with no agent resume, adding a job uses the resume saved in the dashboard', async () => {
  dashboard.set('user-a', builderResume());

  const created = await api('/applications', { method: 'POST', json: { description: DESCRIPTION } });
  assert.equal(created.status, 202);

  const profile = await ResumeProfile.findOne({ userId: 'user-a' }).lean();
  assert.equal(profile.source, 'cvmind');
  assert.equal(profile.originalFileRef.workId, 'work-a');
  assert.equal(profile.isDefault, true);
  assert.equal(created.body.data.resumeProfileId, String(profile._id));
  assert.equal(await QueueJob.countDocuments({ type: 'resume.parse', 'payload.resumeProfileId': String(profile._id) }), 1);

  // A second job reuses the imported resume instead of importing it again
  await api('/applications', { method: 'POST', json: { description: `${DESCRIPTION} Also: remote friendly.` } });
  assert.equal(await ResumeProfile.countDocuments({ userId: 'user-a' }), 1);
});

test('with no agent resume and nothing in the dashboard, adding a job asks for a resume', async () => {
  const res = await api('/applications', { method: 'POST', json: { description: DESCRIPTION } });
  assert.equal(res.body.code, 'NO_RESUME');
  assert.equal(await ResumeProfile.countDocuments({}), 0);
});

test('an existing agent resume is used and the dashboard resume is not imported', async () => {
  const resume = await createReadyResume();
  dashboard.set('user-a', builderResume());

  const created = await api('/applications', { method: 'POST', json: { description: DESCRIPTION } });
  assert.equal(created.body.data.resumeProfileId, String(resume._id));
  assert.equal(await ResumeProfile.countDocuments({ source: 'cvmind' }), 0);
});

test('an explicitly chosen resume is never swapped for the dashboard resume', async () => {
  dashboard.set('user-a', builderResume());
  const foreign = await ResumeProfile.create({ userId: 'user-b', source: 'upload', status: 'ready' });

  const res = await api('/applications', { method: 'POST', json: { description: DESCRIPTION, resumeProfileId: String(foreign._id) } });
  assert.equal(res.body.code, 'NO_RESUME');
  assert.equal(await AgentApplication.countDocuments({}), 0);
  assert.equal(await ResumeProfile.countDocuments({ userId: 'user-a' }), 0);
});

test("another user's dashboard resume is never imported", async () => {
  dashboard.set('user-a', builderResume({ userId: 'user-b' }));
  const res = await api('/applications', { method: 'POST', json: { description: DESCRIPTION } });
  assert.equal(res.body.code, 'NO_RESUME');
});

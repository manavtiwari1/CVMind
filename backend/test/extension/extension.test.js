import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import ExtensionDevice from '../../src/agent/models/ExtensionDevice.js';
import AgentApplication from '../../src/agent/models/AgentApplication.js';
import ApplicationEvent from '../../src/agent/models/ApplicationEvent.js';
import { createParseJobHandler } from '../../src/agent/handlers/parseJob.js';
import { createMatchHandler } from '../../src/agent/handlers/matchApplication.js';
import { buildFillPlan } from '../../src/agent/fill/buildFillPlan.js';
import { DESCRIPTION, fakeAi, createReadyResume, runQueued, startAgentTestApp, tokenB } from '../helpers/agentFixtures.js';

const JOB_URL = 'https://boards.greenhouse.io/acmepay/jobs/12345';

// Keep the mapper offline: the AI fallback is covered by the fill-plan unit tests
const offlinePlan = (descriptors, context, options) => buildFillPlan(descriptors, context, { ...options, useAi: false });

const FORM = [
  { id: '1', selector: '#first_name', label: 'First Name', name: 'first_name', type: 'text', tag: 'input', required: true },
  { id: '2', selector: '#last_name', label: 'Last Name', name: 'last_name', type: 'text', tag: 'input', required: true },
  { id: '3', selector: '#email', label: 'Email', type: 'email', tag: 'input', required: true },
  { id: '4', selector: '#phone', label: 'Phone', type: 'tel', tag: 'input' },
  { id: '5', selector: '#notice', label: 'Notice period', type: 'text', tag: 'input' }
];

let testApp;
let api;
before(async () => {
  testApp = await startAgentTestApp(undefined, { buildPlan: offlinePlan });
  api = testApp.api;
});
after(async () => { await testApp.stop(); });
beforeEach(async () => { await testApp.reset(); });

async function pairExtension() {
  const created = await api('/extension/pair-codes', { method: 'POST' });
  assert.equal(created.status, 200);
  assert.match(created.body.data.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const paired = await api('/extension/pair', { token: null, method: 'POST', json: { code: created.body.data.code, deviceName: 'Chrome on Mac' } });
  assert.equal(paired.status, 200);
  return { token: paired.body.data.token, deviceId: paired.body.data.device.id, code: created.body.data.code };
}

const ext = (path, token, options = {}) => api(path, { rawToken: token, ...options });

async function trackedApplication(token) {
  const tracked = await ext('/extension/track', token, { method: 'POST', json: { url: JOB_URL } });
  assert.equal(tracked.status, 202, JSON.stringify(tracked.body));
  const fetchers = {
    greenhouse: async () => ({ title: 'Senior Backend Engineer', company: 'Acme Pay', location: 'Bengaluru, India', descriptionText: DESCRIPTION, applyUrl: JOB_URL, atsQuestions: [] }),
    lever: async () => { throw new Error('unexpected'); },
    generic: async () => { throw new Error('unexpected'); }
  };
  await runQueued('job.parse', createParseJobHandler({ ai: { client: fakeAi() }, fetchers }));
  await runQueued('app.match', createMatchHandler({ ai: { client: fakeAi() } }));
  return tracked.body.data.applicationId;
}

test('pairing issues a device token once, and codes cannot be reused', async () => {
  assert.equal((await api('/extension/pair-codes', { token: null, method: 'POST' })).status, 401);

  const { token, code, deviceId } = await pairExtension();
  assert.ok(token);
  assert.equal((await api('/extension/pair', { token: null, method: 'POST', json: { code } })).body.code, 'INVALID_CODE');
  assert.equal((await api('/extension/pair', { token: null, method: 'POST', json: { code: 'AAAA-AAAA' } })).body.code, 'INVALID_CODE');

  const devices = await api('/extension/devices');
  assert.equal(devices.body.data.length, 1);
  assert.equal(devices.body.data[0].name, 'Chrome on Mac');
  assert.equal(devices.body.data[0].id, deviceId);
  assert.equal((await api('/extension/devices', { token: tokenB })).body.data.length, 0);
});

test('the extension needs a device token, and revoking one cuts it off immediately', async () => {
  await createReadyResume();
  const { token, deviceId } = await pairExtension();

  assert.equal((await api('/extension/context?url=https://x.test', { token: null })).body.code, 'PAIR_REQUIRED');
  // A signed-in web token is not a device token
  assert.equal((await api('/extension/context?url=https://x.test')).body.code, 'PAIR_REQUIRED');
  assert.equal((await ext('/extension/context?url=https://x.test', token)).status, 200);

  assert.equal((await api(`/extension/devices/${deviceId}`, { token: tokenB, method: 'DELETE' })).status, 404);
  assert.equal((await api(`/extension/devices/${deviceId}`, { method: 'DELETE' })).status, 200);

  const afterRevoke = await ext('/extension/context?url=https://x.test', token);
  assert.equal(afterRevoke.status, 401);
  assert.equal(afterRevoke.body.code, 'DEVICE_REVOKED');
  assert.equal((await ExtensionDevice.findById(deviceId).lean()).revokedAt instanceof Date, true);
});

test('context reports what the extension can do on the current page', async () => {
  await createReadyResume();
  const { token } = await pairExtension();

  const unknown = await ext('/extension/context?url=https://careers.example.com/jobs/7', token);
  assert.equal(unknown.body.data.application, null);
  assert.equal(unknown.body.data.canTrack, true);
  assert.equal(unknown.body.data.resumeReady, true);

  const applicationId = await trackedApplication(token);
  const known = await ext(`/extension/context?url=${encodeURIComponent(`${JOB_URL}?utm_source=x`)}`, token);
  assert.equal(known.body.data.application.id, applicationId);
  assert.equal(known.body.data.application.status, 'matched');
  assert.ok(known.body.data.application.score > 0);
  assert.equal(known.body.data.application.title, 'Senior Backend Engineer');
  assert.equal(known.body.data.canTrack, false);

  // Tracking the same page twice reuses the application instead of failing
  const again = await ext('/extension/track', token, { method: 'POST', json: { url: JOB_URL } });
  assert.equal(again.status, 200);
  assert.equal(again.body.data.alreadyAdded, true);
  assert.equal(again.body.data.applicationId, applicationId);
});

test('fill plans use the profile, flag sensitive answers and are logged on the application', async () => {
  await createReadyResume();
  const { token } = await pairExtension();
  const applicationId = await trackedApplication(token);

  const plan = await ext('/extension/fill-plan', token, { method: 'POST', json: { url: JOB_URL, descriptors: FORM } });
  assert.equal(plan.status, 200);
  assert.equal(plan.body.data.applicationId, applicationId);
  const byKey = Object.fromEntries(plan.body.data.items.map((item) => [item.canonicalKey, item]));
  assert.equal(byKey.first_name.value, 'Ada');
  assert.equal(byKey.email.value, 'ada@example.com');
  assert.equal(byKey.first_name.requiresReview, false);
  // Notice period is unset in preferences, so nothing is invented for it
  assert.equal(byKey.notice_period, undefined);
  assert.equal(plan.body.data.resumeFile, null);
  assert.ok(plan.body.data.planHash);

  const events = await ApplicationEvent.find({ applicationId, type: 'extension.fill_plan' }).lean();
  assert.equal(events.length, 1);
  assert.equal(events[0].actor, 'extension');

  assert.equal((await ext('/extension/fill-plan', token, { method: 'POST', json: { url: JOB_URL, descriptors: [] } })).body.code, 'NO_FIELDS');
  const foreign = await AgentApplication.create({ userId: 'user-b', jobPostingId: (await AgentApplication.findById(applicationId).lean()).jobPostingId });
  assert.equal((await ext('/extension/fill-plan', token, { method: 'POST', json: { url: JOB_URL, descriptors: FORM, applicationId: String(foreign._id) } })).status, 404);
});

test('the extension confirms a submission, and only once', async () => {
  await createReadyResume();
  const { token } = await pairExtension();
  const applicationId = await trackedApplication(token);

  const confirmed = await ext('/extension/confirm-submitted', token, { method: 'POST', json: { applicationId } });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.data.status, 'submitted');

  const stored = await AgentApplication.findById(applicationId).lean();
  assert.equal(stored.submission.via, 'extension');
  assert.ok((await ApplicationEvent.find({ applicationId, type: 'application.submitted' }).lean()).length);

  assert.equal((await ext('/extension/confirm-submitted', token, { method: 'POST', json: { applicationId } })).body.code, 'ALREADY_SUBMITTED');
  assert.equal((await ext('/extension/confirm-submitted', token, { method: 'POST', json: { url: 'https://nope.test/job' } })).status, 404);
});

test('fill plans need a ready resume', async () => {
  const { token } = await pairExtension();
  const plan = await ext('/extension/fill-plan', token, { method: 'POST', json: { url: JOB_URL, descriptors: FORM } });
  assert.equal(plan.status, 400);
  assert.equal(plan.body.code, 'NO_RESUME');
});

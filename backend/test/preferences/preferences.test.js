import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Preferences from '../../src/agent/models/Preferences.js';
import ResumeProfile from '../../src/agent/models/ResumeProfile.js';
import ApplicationEvent from '../../src/agent/models/ApplicationEvent.js';
import { createAgentRouter } from '../../src/routes/agent.js';
import { signToken } from '../../src/services/authToken.js';
import { getPreferences } from '../../src/agent/preferences/service.js';
import { startTestMongo } from '../helpers/mongo.js';

let mongo;
let server;
let baseUrl;
const originalUri = process.env.MONGODB_URI;
const tokenA = signToken({ sub: 'user-a', kind: 'user', email: 'a@example.com' });
const tokenB = signToken({ sub: 'user-b', kind: 'user', email: 'b@example.com' });

before(async () => {
  mongo = await startTestMongo([Preferences, ResumeProfile, ApplicationEvent]);
  process.env.MONGODB_URI = 'mongodb://in-memory-test';
  const app = express();
  app.use(express.json());
  app.use('/api/agent', createAgentRouter({ loadWork: async () => null }));
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}/api/agent`;
});

after(async () => {
  server.close();
  await mongo.stop();
  if (originalUri === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = originalUri;
});

beforeEach(async () => { await mongo.reset(); });

async function api(path, { token = tokenA, method = 'GET', json } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: json ? JSON.stringify(json) : undefined });
  return { status: res.status, body: await res.json() };
}

test('preferences require a signed-in user', async () => {
  assert.equal((await api('/preferences', { token: null })).status, 401);
  assert.equal((await api('/preferences', { token: null, method: 'PUT', json: {} })).status, 401);
});

test('GET returns defaults before anything is saved', async () => {
  const { status, body } = await api('/preferences');
  assert.equal(status, 200);
  assert.equal(body.exists, false);
  assert.equal(body.data.dailyApplyCap, 25);
  assert.equal(body.data.eeo.gender, 'decline');
  assert.deepEqual(body.data.employmentTypes, ['full_time']);
});

test('PUT saves a partial update, cleans lists and merges later updates', async () => {
  const first = await api('/preferences', {
    method: 'PUT',
    json: {
      targetTitles: [' Backend Engineer', 'Backend Engineer', '', 'SRE '],
      workModes: ['remote', 'hybrid'],
      minSalary: { amount: 2500000, currency: 'inr', period: 'year' },
      excludedCompanies: ['Acme']
    }
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.exists, true);
  assert.deepEqual(first.body.data.targetTitles, ['Backend Engineer', 'SRE']);
  assert.equal(first.body.data.minSalary.currency, 'INR');
  assert.equal(first.body.data.applyMode, 'ask');

  await api('/preferences', { method: 'PUT', json: { dailyApplyCap: 10, seniority: ['senior'] } });
  const { body } = await api('/preferences');
  assert.equal(body.data.dailyApplyCap, 10);
  assert.deepEqual(body.data.seniority, ['senior']);
  assert.deepEqual(body.data.targetTitles, ['Backend Engineer', 'SRE']);
  assert.equal(body.data.userId, undefined);

  const events = await ApplicationEvent.find({ userId: 'user-a', type: 'preferences.updated' }).lean();
  assert.equal(events.length, 2);
});

test('PUT rejects invalid values and unknown fields', async () => {
  for (const json of [{ dailyApplyCap: 0 }, { workModes: ['moon'] }, { minSalary: { amount: 1, currency: 'rupees', period: 'year' } }, { favouriteColour: 'blue' }]) {
    const { status, body } = await api('/preferences', { method: 'PUT', json });
    assert.equal(status, 400, JSON.stringify(json));
    assert.equal(body.code, 'INVALID_PREFERENCES');
  }
  assert.equal(await getPreferences('user-a'), null);
});

test('default resume must belong to the user; empty string clears it', async () => {
  const mine = await ResumeProfile.create({ userId: 'user-a', source: 'upload' });
  const theirs = await ResumeProfile.create({ userId: 'user-b', source: 'upload' });

  assert.equal((await api('/preferences', { method: 'PUT', json: { defaultResumeProfileId: String(theirs._id) } })).body.code, 'INVALID_RESUME');
  assert.equal((await api('/preferences', { method: 'PUT', json: { defaultResumeProfileId: 'nope' } })).body.code, 'INVALID_RESUME');

  const saved = await api('/preferences', { method: 'PUT', json: { defaultResumeProfileId: String(mine._id) } });
  assert.equal(saved.body.data.defaultResumeProfileId, String(mine._id));

  const cleared = await api('/preferences', { method: 'PUT', json: { defaultResumeProfileId: '' } });
  assert.equal(cleared.body.data.defaultResumeProfileId, null);
});

test('preferences are isolated per user', async () => {
  await api('/preferences', { method: 'PUT', json: { targetTitles: ['Designer'] } });
  const other = await api('/preferences', { token: tokenB });
  assert.equal(other.body.exists, false);
  assert.deepEqual(other.body.data.targetTitles, []);
});

import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Connectors: Leo only gets the tools the user has connected, and this is enforced on the server.
let mongod;
let server;
let base;
let mongoose;
let signToken;
let createUser;
let saveSettingGroup;
let setLeoStream;
let setMissionTools;
let LeoMission;

let script = [];
let seen = [];

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_leo_connectors_test');
  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken } = await import('../../src/services/authToken.js'));
  ({ createUser } = await import('../../src/db.js'));
  const settings = await import('../../src/admin/settings.js');
  saveSettingGroup = settings.saveSettingGroup;
  ({ LeoMission } = await import('../../src/leo/models.js'));
  ({ setLeoStream } = await import('../../src/leo/service.js'));
  ({ setMissionTools } = await import('../../src/leo/missions/index.js'));
  const { setProfileParser } = await import('../../src/leo/careerProfile.js');
  setProfileParser(async () => ({}));
  const { createLeoChatRouter } = await import('../../src/routes/leoChat.js');
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  setLeoStream(async function* ({ messages, tools }) {
    seen.push({ system: messages[0].content, tools: (tools || []).map((t) => t.function.name) });
    const next = script.shift();
    if (next?.tools) {
      yield { type: 'done', model: 'fake', finishReason: 'tool_calls', usage: { tokensIn: 1, tokensOut: 1 }, toolCalls: next.tools.map((t, i) => ({ id: `c${i}`, name: t.name, arguments: JSON.stringify(t.arguments || {}) })) };
      return;
    }
    yield { type: 'text', delta: 'ok' };
    yield { type: 'done', model: 'fake', finishReason: 'stop', usage: { tokensIn: 1, tokensOut: 1 }, toolCalls: [] };
  });
  const upload = { single: () => (req, res, next) => next() };
  const app = express();
  app.use(express.json());
  app.use(settings.featureGate);
  app.use('/api/leo-chat', createLeoChatRouter({ upload, extractResumeText: async () => '' }));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  setLeoStream(null);
  setMissionTools(null);
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

beforeEach(() => {
  script = [];
  seen = [];
  setMissionTools(null);
});

let count = 0;
async function newUser() {
  count += 1;
  const email = `connector${count}@example.com`;
  const user = await createUser({ email, name: 'Priya', password: 'hash', emailVerified: true });
  const id = String(user._id || user.id);
  return { id, email, token: signToken({ sub: id, kind: 'user', email }) };
}

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* event stream */ }
  return { status: res.status, body: json, text };
}

const cardsOf = (text) => text.split('\n\n').filter((b) => b.startsWith('event: card')).map((b) => JSON.parse(b.split('\n')[1].slice(6)).card);
const chat = (user, message = 'hello') => call('/api/leo-chat/chat', { method: 'POST', token: user?.token, body: { message } });
const connected = async (user) => (await call('/api/leo-chat/connectors', { token: user.token })).body.data.filter((c) => c.connected).map((c) => c.id);
const connect = (user, id) => call(`/api/leo-chat/connectors/${id}`, { method: 'POST', token: user.token, body: {} });

test('every tool starts disconnected, and Leo is told how to ask for one', async () => {
  const user = await newUser();
  assert.deepEqual(await connected(user), []);
  await chat(user);
  const { tools, system } = seen.at(-1);
  assert.ok(!tools.includes('write_cover_letter'));
  assert.ok(!tools.includes('find_jobs'));
  assert.ok(!tools.includes('start_flow'));
  assert.ok(tools.includes('request_connector'));
  assert.match(system, /Cover Letter \(id "cover-letter"/);
});

test('connecting a tool gives Leo only that tool', async () => {
  const user = await newUser();
  assert.equal((await connect(user, 'cover-letter')).status, 200);
  await chat(user);
  const { tools, system } = seen.at(-1);
  assert.ok(tools.includes('write_cover_letter'));
  assert.ok(!tools.includes('tailor_resume'));
  assert.doesNotMatch(system, /id "cover-letter"/);
});

test('disconnecting takes it away again, and one user\'s tools are not another\'s', async () => {
  const user = await newUser();
  const other = await newUser();
  await connect(user, 'tailor');
  assert.deepEqual(await connected(other), []);
  await call('/api/leo-chat/connectors/tailor', { method: 'DELETE', token: user.token });
  assert.deepEqual(await connected(user), []);
});

test('Connect all connects every tool, and unknown ids are refused', async () => {
  const user = await newUser();
  const { body } = await call('/api/leo-chat/connectors', { token: user.token });
  const all = body.data.map((c) => c.id);
  assert.equal((await call('/api/leo-chat/connectors', { method: 'PUT', token: user.token, body: { connected: all } })).status, 200);
  assert.deepEqual((await connected(user)).sort(), [...all].sort());
  await chat(user);
  assert.doesNotMatch(seen.at(-1).system, /## Connectors/);
  assert.equal((await connect(user, 'not-a-tool')).status, 400);
  assert.equal((await call('/api/leo-chat/connectors', { method: 'PUT', token: user.token, body: { connected: ['nope'] } })).status, 400);
});

test('a disconnected tool cannot run even if the model asks for it', async () => {
  const user = await newUser();
  script = [{ tools: [{ name: 'find_jobs', arguments: { query: 'react' } }] }, { text: 'x' }];
  const [card] = cardsOf((await chat(user)).text);
  assert.equal(card.type, 'connect');
  assert.equal(card.connector.id, 'job-finder');
});

test('Leo can ask for a connector with a card, and knows when it is already connected', async () => {
  const user = await newUser();
  script = [{ tools: [{ name: 'request_connector', arguments: { id: 'linkedin' } }] }, { text: 'x' }];
  const [card] = cardsOf((await chat(user)).text);
  assert.equal(card.connector.label, 'LinkedIn Tools');

  await connect(user, 'linkedin');
  script = [{ tools: [{ name: 'request_connector', arguments: { id: 'linkedin' } }] }, { text: 'x' }];
  assert.equal(cardsOf((await chat(user)).text).length, 0);
});

test('a mission cannot plan a step whose tool is not connected', async () => {
  const user = await newUser();
  await connect(user, 'career');
  script = [{ tools: [{ name: 'plan_mission', arguments: { goal: 'Do it', steps: [
    { tool: 'career_roadmap', title: 'Roadmap', args: { target_role: 'Analyst' } },
    { tool: 'find_jobs', title: 'Jobs', args: { query: 'analyst' } }
  ] } }] }, { text: 'x' }];
  await chat(user);
  assert.equal(await LeoMission.countDocuments({ userId: user.id }), 0);
});

test('the connectors list needs an account; guests keep today\'s chat', async () => {
  assert.equal((await call('/api/leo-chat/connectors')).status, 401);
  await chat(null);
  assert.ok(seen.at(-1).tools.includes('find_jobs'));
  assert.doesNotMatch(seen.at(-1).system, /## Connectors/);
});

test('with Agent Mode off, signed-in users keep every chat tool', async () => {
  const user = await newUser();
  await saveSettingGroup('features', { 'leo-agent': false }, 'test');
  try {
    await chat(user);
    assert.ok(seen.at(-1).tools.includes('find_jobs'));
    assert.equal((await call('/api/leo-chat/connectors', { token: user.token })).status, 503);
  } finally {
    await saveSettingGroup('features', { 'leo-agent': true }, 'test');
  }
});

test('deleting an account removes everything Leo kept', async () => {
  const user = await newUser();
  const other = await newUser();
  await connect(user, 'tailor');
  await connect(other, 'tailor');
  const { LEO_MODELS, CareerProfile, LeoReminder } = await import('../../src/leo/models.js');
  await CareerProfile.create({ userId: user.id, masterResumeName: 'cv.pdf', masterResumeText: 'private' });
  await LeoReminder.create({ userId: user.id, email: user.email, text: 'Interview', dueAt: new Date(Date.now() + 100000) });
  await chat(user);

  const { deleteAccount } = await import('../../src/db.js');
  await deleteAccount(user.id);

  for (const model of LEO_MODELS) assert.equal(await model.countDocuments({ userId: user.id }), 0, model.modelName);
  assert.deepEqual(await connected(other), ['tailor']);
});

import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Leo Agent Mode, Phase 1: the Career Profile, missions, approvals and limits.
// db.js reads MONGODB_URI at import time, so the in-memory server starts first
let mongod;
let server;
let base;
let mongoose;
let signToken;
let createUser;
let saveSettingGroup;
let setLeoStream;
let setMissionTools;
let setProfileParser;
let runMission;
let startMission;
let LeoMission;
let LeoTurn;
let CareerProfile;
let FeatureUse;
let chargeAiUsage;

let script = [];
let seen = [];
let toolCalls = [];
let parsed = null;

const RESUME = 'Priya Sharma. B.Tech CSE 2026. Built a React dashboard used by 300 students. Skills: React, Node.js, SQL.';

// A tool that counts its calls. behave(callNumber) may return a different result.
const fakeTool = (name, meta = { risk: 'read' }, behave = null) => ({
  meta,
  run: async () => {
    toolCalls.push(name);
    const made = behave?.(toolCalls.filter((t) => t === name).length);
    return made || { card: { type: 'link', page: 'pricing', label: name, reason: '' }, summary: `${name} done` };
  }
});

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_leo_missions_test');

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken } = await import('../../src/services/authToken.js'));
  ({ createUser } = await import('../../src/db.js'));
  const settings = await import('../../src/admin/settings.js');
  saveSettingGroup = settings.saveSettingGroup;
  ({ LeoMission, LeoTurn, CareerProfile } = await import('../../src/leo/models.js'));
  ({ FeatureUse } = await import('../../src/billing/models.js'));
  ({ setLeoStream } = await import('../../src/leo/service.js'));
  ({ setMissionTools, runMission, startMission } = await import('../../src/leo/missions/index.js'));
  ({ setProfileParser } = await import('../../src/leo/careerProfile.js'));
  ({ chargeAiUsage } = await import('../../src/billing/aiContext.js'));
  const { createLeoChatRouter } = await import('../../src/routes/leoChat.js');

  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));
  await LeoMission.init();

  setLeoStream(async function* ({ messages, tools }) {
    seen.push({ messages: structuredClone(messages), toolNames: (tools || []).map((t) => t.function.name) });
    const next = script.shift();
    if (next?.tools) {
      yield { type: 'done', model: 'fake-model', finishReason: 'tool_calls', usage: { tokensIn: 100, tokensOut: 10 }, toolCalls: next.tools.map((t, i) => ({ id: `c${i}`, name: t.name, arguments: JSON.stringify(t.arguments || {}) })) };
      return;
    }
    yield { type: 'text', delta: next?.text ?? 'ok' };
    yield { type: 'done', model: 'fake-model', finishReason: 'stop', usage: { tokensIn: 100, tokensOut: 10 }, toolCalls: [] };
  });
  setProfileParser(async () => {
    if (!parsed) throw new Error('no parse scripted');
    return parsed;
  });

  const upload = { single: () => (req, res, next) => next() };
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json());
  app.use(settings.featureGate);
  app.use('/api/leo-chat', createLeoChatRouter({ upload, extractResumeText: async () => '' }));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  setLeoStream(null);
  setMissionTools(null);
  setProfileParser(null);
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

beforeEach(() => {
  script = [];
  seen = [];
  toolCalls = [];
  parsed = null;
  setMissionTools({ fake_a: fakeTool('fake_a'), fake_b: fakeTool('fake_b') });
});

const connectAll = async (id) => {
  const { CONNECTORS, setConnected } = await import('../../src/leo/connectors.js');
  await setConnected(id, CONNECTORS.map((c) => c.id));
};

let userCount = 0;
async function newUser() {
  userCount += 1;
  const email = `mission${userCount}@example.com`;
  const user = await createUser({ email, name: `Priya ${userCount}`, password: 'hash', emailVerified: true });
  const id = String(user._id || user.id);
  await connectAll(id);
  return { id, email, token: signToken({ sub: id, kind: 'user', email }) };
}

let ipCount = 0;
async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.1.0.${++ipCount}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* event stream */ }
  return { status: res.status, body: json, text };
}

function events(text) {
  return text.split('\n\n').filter((b) => b.startsWith('event:')).map((b) => {
    const [eventLine, dataLine] = b.split('\n');
    return { event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) };
  });
}

const chat = (body, token) => call('/api/leo-chat/chat', { method: 'POST', body, token });
const lastMission = (list) => list.filter((e) => e.event === 'mission').at(-1).data.mission;
const cardsOf = (list) => list.filter((e) => e.event === 'card').map((e) => e.data.card);

// Plans a mission through the chat and returns its id
async function plan(user, steps, goal = 'Do the whole job') {
  script = [{ tools: [{ name: 'plan_mission', arguments: { goal, steps } }] }, { text: 'Check the plan and tap Start.' }];
  const list = events((await chat({ message: goal }, user.token)).text);
  const card = cardsOf(list).find((c) => c.type === 'mission');
  return { id: card?.id, card, list };
}

const steps = (...names) => names.map((tool) => ({ tool, title: `Run ${tool}`, args: {} }));
const go = (user, id, verb = 'start', body = {}) => call(`/api/leo-chat/missions/${id}/${verb}`, { method: 'POST', token: user.token, body });

test('a plan runs nothing until Start, and a typed yes does not start it', async () => {
  const user = await newUser();
  const { id, card } = await plan(user, steps('fake_a', 'fake_b'));
  assert.equal(card.mission.status, 'planned');
  assert.equal(card.mission.steps.length, 2);
  assert.deepEqual(toolCalls, []);

  script = [{ text: 'Please tap Start.' }];
  await chat({ message: 'yes start it', conversationId: (await LeoMission.findById(id).lean()).conversationId }, user.token);
  assert.deepEqual(toolCalls, []);
  assert.equal((await LeoMission.findById(id).lean()).status, 'planned');
});

test('a 6-step mission runs to the end from one Start tap', async () => {
  const user = await newUser();
  const names = ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => `six_${n}`);
  setMissionTools(Object.fromEntries(names.map((n) => [n, fakeTool(n)])));
  const { id } = await plan(user, steps(...names));

  const res = await go(user, id);
  assert.equal(res.status, 200);
  const list = events(res.text);
  assert.deepEqual(toolCalls, names);
  assert.equal(lastMission(list).status, 'done');
  assert.ok(lastMission(list).steps.every((s) => s.status === 'done' && s.card));
  assert.equal(list.at(-1).event, 'done');

  const saved = await LeoMission.findById(id).lean();
  assert.equal(saved.active, false);
  // The admin AI activity list and the budget alert see the run, but the chat thread doesn't
  assert.equal(await LeoTurn.countDocuments({ conversationId: `mission:${id}`, page: 'mission' }), 1);
});

test('the user can take steps off the plan before Start', async () => {
  const user = await newUser();
  const { id, card } = await plan(user, steps('fake_a', 'fake_b'));
  const removed = card.mission.steps.find((s) => s.tool === 'fake_b').id;
  await go(user, id, 'start', { removeSteps: [removed] });
  assert.deepEqual(toolCalls, ['fake_a']);
});

test('a closed tab pauses after the step in hand, and Continue never repeats finished work', async () => {
  const user = await newUser();
  const leo = { freeWeeklyMissions: 1, proDailyMissions: 1, freeMissionTokenCap: 150000, proMissionTokenCap: 400000 };
  const closing = new AbortController();
  setMissionTools({
    fake_a: fakeTool('fake_a', { risk: 'read' }, () => { closing.abort(); return null; }),
    fake_b: fakeTool('fake_b')
  });
  const { id } = await plan(user, steps('fake_a', 'fake_b'));
  const claimed = await startMission({ id, userId: user.id, email: user.email, leo });
  const result = await runMission(claimed, { resumeText: '', send: () => {}, signal: closing.signal });

  assert.equal(result.status, 'paused');
  assert.deepEqual(toolCalls, ['fake_a']);
  assert.equal((await LeoMission.findById(id).lean()).pausedReason, 'closed');

  const next = await go(user, id, 'continue');
  assert.equal(lastMission(events(next.text)).status, 'done');
  assert.deepEqual(toolCalls, ['fake_a', 'fake_b']);
});

test('a mission over its token cap pauses with its work saved and cannot be continued', async () => {
  const user = await newUser();
  setMissionTools({
    fake_a: fakeTool('fake_a', { risk: 'read' }, () => {
      chargeAiUsage({ tokensIn: 200000, tokensOut: 0 });
      return null;
    }),
    fake_b: fakeTool('fake_b')
  });
  const { id } = await plan(user, steps('fake_a', 'fake_b'));
  const mission = lastMission(events((await go(user, id)).text));
  assert.equal(mission.status, 'paused');
  assert.equal(mission.pausedReason, 'cap');
  assert.equal(mission.steps[0].status, 'done');
  assert.ok(mission.steps[0].card);
  assert.deepEqual(toolCalls, ['fake_a']);
  assert.equal((await go(user, id, 'continue')).status, 409);
});

test('an external step waits for a tap every time, and only the waiting step can be approved', async () => {
  const user = await newUser();
  setMissionTools({ fake_a: fakeTool('fake_a'), send_it: fakeTool('send_it', { risk: 'external' }) });
  const { id } = await plan(user, steps('fake_a', 'send_it'));

  const first = lastMission(events((await go(user, id)).text));
  assert.equal(first.status, 'waiting_review');
  assert.deepEqual(toolCalls, ['fake_a']);
  const waiting = first.steps.find((s) => s.tool === 'send_it');
  assert.equal(first.pendingStepId, waiting.id);

  assert.equal((await go(user, id, 'approve', { stepId: first.steps[0].id })).status, 409);
  assert.deepEqual(toolCalls, ['fake_a']);

  const done = lastMission(events((await go(user, id, 'approve', { stepId: waiting.id })).text));
  assert.equal(done.status, 'done');
  assert.deepEqual(toolCalls, ['fake_a', 'send_it']);
});

test('a step marked for review waits after its result', async () => {
  const user = await newUser();
  const { id } = await plan(user, [{ tool: 'fake_a', title: 'First', args: {}, review: true }, { tool: 'fake_b', title: 'Second', args: {} }]);
  const first = lastMission(events((await go(user, id)).text));
  assert.equal(first.status, 'waiting_review');
  assert.equal(first.steps[0].needsReview, true);
  assert.deepEqual(toolCalls, ['fake_a']);
  const done = lastMission(events((await go(user, id, 'approve', { stepId: first.steps[0].id })).text));
  assert.equal(done.status, 'done');
  assert.deepEqual(toolCalls, ['fake_a', 'fake_b']);
});

test('a failing step is retried once, then pauses, and Continue tries only that step', async () => {
  const user = await newUser();
  let healthy = false;
  setMissionTools({
    fake_a: fakeTool('fake_a'),
    flaky: fakeTool('flaky', { risk: 'read' }, () => (healthy ? null : { card: { type: 'error', message: 'nope' }, summary: 'failed' }))
  });
  const { id } = await plan(user, steps('fake_a', 'flaky'));
  const mission = lastMission(events((await go(user, id)).text));
  assert.equal(mission.status, 'paused');
  assert.equal(mission.pausedReason, 'failed');
  assert.deepEqual(toolCalls, ['fake_a', 'flaky', 'flaky']);

  healthy = true;
  const done = lastMission(events((await go(user, id, 'continue')).text));
  assert.equal(done.status, 'done');
  assert.deepEqual(toolCalls, ['fake_a', 'flaky', 'flaky', 'flaky']);
});

test('free users get one mission a week, and deleting the chat does not give it back', async () => {
  const user = await newUser();
  const { id } = await plan(user, steps('fake_a', 'fake_b'));
  const { conversationId } = await LeoMission.findById(id).lean();
  await go(user, id);

  assert.equal((await call(`/api/leo-chat/conversations/${conversationId}`, { method: 'DELETE', token: user.token })).status, 200);
  assert.equal(await LeoMission.countDocuments({ _id: id }), 0);

  const again = await plan(user, steps('fake_a', 'fake_b'));
  assert.equal(again.id, undefined);
  const locked = cardsOf(again.list).find((c) => c.type === 'locked');
  assert.equal(locked.action, 'upgrade');
});

test('only one mission can be open at a time', async () => {
  const user = await newUser();
  await saveSettingGroup('leo', { freeWeeklyMissions: 5 });
  try {
    setMissionTools({ fake_a: fakeTool('fake_a', { risk: 'external' }), fake_b: fakeTool('fake_b') });
    const first = await plan(user, steps('fake_a', 'fake_b'));
    const second = await plan(user, steps('fake_b', 'fake_b'));
    await go(user, first.id);
    assert.equal((await go(user, second.id)).status, 409);

    // A new plan shows the open mission instead
    const third = await plan(user, steps('fake_a', 'fake_b'));
    assert.equal(third.id, first.id);

    const stopped = await call(`/api/leo-chat/missions/${first.id}/stop`, { method: 'POST', token: user.token });
    assert.equal(stopped.body.data.status, 'stopped');
    assert.equal(lastMission(events((await go(user, second.id)).text)).status, 'done');
  } finally {
    await saveSettingGroup('leo', { freeWeeklyMissions: 1 });
  }
});

test('a step past a free weekly limit is shown locked and never runs', async () => {
  const user = await newUser();
  await FeatureUse.create({ email: user.email, feature: 'cover-letter' });
  setMissionTools({ fake_a: fakeTool('fake_a'), letter: fakeTool('letter', { risk: 'create', limit: 'cover-letter' }) });
  const { id, card } = await plan(user, steps('fake_a', 'letter'));
  assert.equal(card.mission.steps.find((s) => s.tool === 'letter').status, 'locked');
  const done = lastMission(events((await go(user, id)).text));
  assert.equal(done.status, 'done');
  assert.deepEqual(toolCalls, ['fake_a']);
});

test('one user cannot see or run another user\'s mission', async () => {
  const owner = await newUser();
  const other = await newUser();
  const { id } = await plan(owner, steps('fake_a', 'fake_b'));
  assert.equal((await call(`/api/leo-chat/missions/${id}`, { token: other.token })).status, 404);
  assert.equal((await go(other, id)).status, 404);
  assert.deepEqual(toolCalls, []);
});

test('a mission needing a resume asks for one first', async () => {
  const user = await newUser();
  setMissionTools({ needs: fakeTool('needs', { risk: 'read', needsResume: true }), fake_a: fakeTool('fake_a') });
  const { id, list } = await plan(user, steps('needs', 'fake_a'));
  assert.equal(id, undefined);
  assert.equal(cardsOf(list).find((c) => c.type === 'locked').action, 'attach');
});

test('interview questions now spend the weekly free use, and guests must sign in', async () => {
  const user = await newUser();
  await FeatureUse.create({ email: user.email, feature: 'interview-text' });
  script = [{ tools: [{ name: 'interview_questions', arguments: { role: 'Analyst' } }] }, { text: 'done' }];
  const used = cardsOf(events((await chat({ message: 'questions' }, user.token)).text));
  assert.equal(used[0].type, 'locked');
  assert.equal(used[0].action, 'upgrade');

  script = [{ tools: [{ name: 'interview_questions', arguments: { role: 'Analyst' } }] }, { text: 'done' }];
  const guest = cardsOf(events((await chat({ message: 'questions' })).text));
  assert.equal(guest[0].action, 'signin');
});

test('a resume attached in one chat pre-fills a resume flow in a new chat, without another AI read', async () => {
  const user = await newUser();
  parsed = { personalInfo: { fullName: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210', jobTitle: 'Data Analyst' }, educations: [{ degree: 'B.Tech CSE', university: 'IIT' }], skills: ['SQL'] };
  const first = events((await chat({ message: 'hi', resume: { name: 'cv.pdf', text: RESUME } }, user.token)).text);
  assert.match(cardsOf(first)[0].message, /cv\.pdf/);
  await new Promise((r) => setTimeout(r, 100));

  parsed = null; // a second read would now throw and leave the draft empty
  script = [{ tools: [{ name: 'start_flow', arguments: { product: 'resume' } }] }, { text: 'Is this right?' }];
  const second = events((await chat({ message: 'make my resume' }, user.token)).text);
  const flow = second.find((e) => e.event === 'flow').data.flow;
  assert.equal(flow.data.fullName, 'Priya Sharma');
  assert.equal(flow.data.skills[0], 'SQL');

  // The saved resume reaches the tools but isn't sent to the model with every message
  assert.ok(!seen.at(-1).messages[0].content.includes('300 students'));
  assert.match(seen.at(-1).messages[0].content, /cv\.pdf/);
});

test('the same resume attached again is not read twice', async () => {
  const user = await newUser();
  let reads = 0;
  setProfileParser(async () => { reads += 1; return { personalInfo: { fullName: 'Priya' } }; });
  try {
    await chat({ message: 'one', resume: { name: 'cv.pdf', text: RESUME } }, user.token);
    const second = events((await chat({ message: 'two', resume: { name: 'cv.pdf', text: RESUME } }, user.token)).text);
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(reads, 1);
    assert.equal(cardsOf(second).length, 0);
  } finally {
    setProfileParser(async () => { if (!parsed) throw new Error('no parse scripted'); return parsed; });
  }
});

test('a detail the user corrected is not overwritten by a later resume', async () => {
  const user = await newUser();
  script = [{ tools: [{ name: 'update_career_profile', arguments: { fields: { phone: '9000000001', location: 'Pune' } } }] }, { text: 'Saved.' }];
  const saved = cardsOf(events((await chat({ message: 'my phone is 9000000001' }, user.token)).text));
  assert.equal(saved[0].type, 'profile_note');

  parsed = { personalInfo: { fullName: 'Priya Sharma', phone: '9111111111', location: 'Delhi' } };
  await chat({ message: 'new file', resume: { name: 'new.pdf', text: RESUME } }, user.token);
  await new Promise((r) => setTimeout(r, 100));

  const { data } = (await call('/api/leo-chat/profile', { token: user.token })).body;
  assert.equal(data.data.phone, '9000000001');
  assert.equal(data.data.location, 'Pune');
  assert.equal(data.data.fullName, 'Priya Sharma');
  assert.equal(data.sources.phone, 'chat');
  assert.equal(data.sources.fullName, 'resume');
});

test('the user can edit and delete the profile, and deleting removes it at once', async () => {
  const user = await newUser();
  parsed = { personalInfo: { fullName: 'Priya Sharma' }, skills: ['SQL'] };
  await chat({ message: 'hi', resume: { name: 'cv.pdf', text: RESUME } }, user.token);
  await new Promise((r) => setTimeout(r, 100));

  const edited = await call('/api/leo-chat/profile', { method: 'PUT', token: user.token, body: { data: { fullName: 'Priya S', skills: ['SQL', 'Excel'] } } });
  assert.equal(edited.body.data.data.fullName, 'Priya S');
  assert.equal(edited.body.data.sources.fullName, 'user');

  assert.equal((await call('/api/leo-chat/profile', { method: 'DELETE', token: user.token })).status, 200);
  assert.equal(await CareerProfile.countDocuments({ userId: user.id }), 0);

  script = [{ text: 'hello' }];
  await chat({ message: 'what do you know' }, user.token);
  assert.ok(!seen.at(-1).messages[0].content.includes('Priya S\"'));
  assert.match(seen.at(-1).messages[0].content, /No resume is attached/);
});

test('deleting all history removes missions but leaves the profile', async () => {
  const user = await newUser();
  await plan(user, steps('fake_a', 'fake_b'));
  await CareerProfile.create({ userId: user.id, masterResumeName: 'cv.pdf' });
  await call('/api/leo-chat/history', { method: 'DELETE', token: user.token });
  assert.equal(await LeoMission.countDocuments({ userId: user.id }), 0);
  assert.equal(await CareerProfile.countDocuments({ userId: user.id }), 1);
});

test('guests get no agent tools, and the admin switch turns Agent Mode off', async () => {
  script = [{ text: 'hi' }];
  await chat({ message: 'hello' });
  assert.ok(!seen.at(-1).toolNames.includes('plan_mission'));

  const user = await newUser();
  script = [{ text: 'hi' }];
  await chat({ message: 'hello' }, user.token);
  assert.ok(seen.at(-1).toolNames.includes('plan_mission'));

  await saveSettingGroup('features', { 'leo-agent': false });
  try {
    script = [{ text: 'hi' }];
    await chat({ message: 'hello' }, user.token);
    assert.ok(!seen.at(-1).toolNames.includes('plan_mission'));
    assert.equal((await call('/api/leo-chat/profile', { token: user.token })).status, 503);
  } finally {
    await saveSettingGroup('features', { 'leo-agent': true });
  }
});

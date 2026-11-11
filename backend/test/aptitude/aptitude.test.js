import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Aptitude Tests: the coming-soon lock, starting a test without answers, grading, and the Leo tool.

let mongod;
let server;
let base;
let mongoose;
let signToken;
let bank;
let runTool;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_aptitude_test');
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'aptitude-test-secret';
  process.env.APTITUDE_EMAILS = '*';

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken } = await import('../../src/services/authToken.js'));
  await import('../../src/db.js');
  bank = await import('../../src/aptitude/questions.js');
  ({ runTool } = await import('../../src/leo/tools.js'));
  const { installSessionValidator } = await import('../../src/admin/sessions.js');
  installSessionValidator();
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  const { createAptitudeRouter } = await import('../../src/routes/aptitude.js');
  const app = express();
  app.use(express.json());
  app.use('/api/aptitude', createAptitudeRouter());
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json() };
}

let seq = 0;
async function account() {
  seq += 1;
  const email = `apt${seq}@example.com`;
  const user = await mongoose.model('User').create({ email, name: 'Test Student', password: 'x', emailVerified: true });
  return { email, token: signToken({ sub: String(user._id), kind: 'user', email }) };
}

test('the bank is well formed: unique ids, four options, a valid answer and an explanation', () => {
  const ids = new Set();
  for (const q of bank.QUESTIONS) {
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
    ids.add(q.id);
    assert.ok(Object.hasOwn(bank.TOPICS, q.topic) && q.topic !== 'mixed', q.id);
    assert.equal(q.options.length, 4, q.id);
    assert.equal(new Set(q.options).size, 4, `${q.id} repeats an option`);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, q.id);
    assert.ok(q.explanation.length > 20, q.id);
  }
  for (const [topic, t] of Object.entries(bank.TOPICS)) {
    if (topic === 'mixed') continue;
    assert.ok(bank.QUESTIONS.filter((q) => q.topic === topic).length >= t.count, `${topic} has fewer than ${t.count} questions`);
  }
  // The calendar question depends on a real date
  assert.equal(new Date(2025, 0, 1).getDay(), 3); // Wednesday
  assert.equal(new Date(2026, 0, 1).getDay(), 4); // Thursday
});

test('coming soon: only listed accounts get in, everyone else gets COMING_SOON', async () => {
  const me = await account();
  const other = await account();
  process.env.APTITUDE_EMAILS = `someone@cvmind.in, ${me.email.toUpperCase()}`;
  try {
    assert.equal((await call('/api/aptitude/access')).body.access, false);
    assert.equal((await call('/api/aptitude/access', { token: other.token })).body.access, false);
    assert.equal((await call('/api/aptitude/access', { token: me.token })).body.access, true);
    assert.equal((await call('/api/aptitude/topics')).status, 401);
    const blocked = await call('/api/aptitude/start', { method: 'POST', token: other.token, body: { topic: 'quant' } });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, 'COMING_SOON');
    assert.equal((await call('/api/aptitude/check', { method: 'POST', token: other.token, body: { answers: [{ id: 'q-train-pole', choice: 1 }] } })).status, 403);
    assert.equal((await call('/api/aptitude/start', { method: 'POST', token: me.token, body: { topic: 'quant' } })).status, 200);
    delete process.env.APTITUDE_EMAILS; // default: only the test account
    assert.equal((await call('/api/aptitude/access', { token: me.token })).body.access, false);
  } finally {
    process.env.APTITUDE_EMAILS = '*';
  }
});

test('a started test has the right questions and never includes the answers', async () => {
  const me = await account();
  const topics = await call('/api/aptitude/topics', { token: me.token });
  assert.deepEqual(topics.body.topics.map((t) => t.id), ['quant', 'reasoning', 'verbal', 'mixed']);

  const quant = await call('/api/aptitude/start', { method: 'POST', token: me.token, body: { topic: 'quant' } });
  assert.equal(quant.body.questions.length, 10);
  assert.equal(quant.body.minutes, 10);
  assert.ok(quant.body.questions.every((q) => q.topic === 'quant'));
  assert.equal(new Set(quant.body.questions.map((q) => q.id)).size, 10);
  for (const q of quant.body.questions) {
    assert.deepEqual(Object.keys(q).sort(), ['id', 'options', 'question', 'subtopic', 'topic']);
  }

  const mixed = await call('/api/aptitude/start', { method: 'POST', token: me.token, body: { topic: 'mixed' } });
  assert.equal(mixed.body.questions.length, 15);
  for (const t of ['quant', 'reasoning', 'verbal']) assert.equal(mixed.body.questions.filter((q) => q.topic === t).length, 5);

  assert.equal((await call('/api/aptitude/start', { method: 'POST', token: me.token, body: { topic: 'gk' } })).status, 400);
});

test('checking grades right, wrong and skipped answers, with sections and explanations', async () => {
  const me = await account();
  const res = await call('/api/aptitude/check', {
    method: 'POST',
    token: me.token,
    body: { answers: [
      { id: 'q-train-pole', choice: 1 }, // right: 54 km/h
      { id: 'q-dice-seven', choice: 2 }, // wrong
      { id: 'v-if-were', choice: null }, // skipped
      { id: 'v-if-were', choice: 1 }, // repeat: ignored
      { id: 'r-clock-330', choice: 9 }, // out of range: counts as skipped
      { id: 'not-a-question', choice: 0 } // unknown: ignored
    ] }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 4);
  assert.equal(res.body.score, 1);
  assert.equal(res.body.wrong, 1);
  assert.equal(res.body.skipped, 2);
  assert.deepEqual(res.body.sections.quant, { label: 'Quantitative Aptitude', correct: 1, total: 2 });
  const dice = res.body.results.find((r) => r.id === 'q-dice-seven');
  assert.equal(dice.correct, false);
  assert.equal(dice.answer, 0);
  assert.match(dice.explanation, /6\/36/);

  assert.equal((await call('/api/aptitude/check', { method: 'POST', token: me.token, body: { answers: [] } })).status, 400);
});

test('a checked test is saved to My Documents and listed in the history, newest first', async () => {
  const me = await account();
  const other = await account();
  const Work = mongoose.model('Work');

  const first = await call('/api/aptitude/check', {
    method: 'POST',
    token: me.token,
    body: { topic: 'quant', seconds: 312.4, answers: [{ id: 'q-train-pole', choice: 1 }, { id: 'q-dice-seven', choice: 0 }, { id: 'q-age-ratio', choice: 0 }] }
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.work.title, 'Quantitative Aptitude - 2/3');

  const work = await Work.findById(first.body.work.id).lean();
  assert.equal(work.userId, (await mongoose.model('User').findOne({ email: me.email }))._id.toString());
  assert.equal(work.type, 'aptitude');
  assert.equal(work.templateId, 'quant');
  const saved = JSON.parse(work.htmlContent);
  assert.equal(saved.seconds, 312);
  assert.equal(saved.result.score, 2);
  assert.equal(saved.result.results.length, 3);
  assert.match(saved.result.results[0].explanation, /\w/); // reopening from My Documents shows the worked answers

  // No topic sent: questions from several sections count as a mixed test
  await new Promise((r) => setTimeout(r, 5));
  const second = await call('/api/aptitude/check', {
    method: 'POST',
    token: me.token,
    body: { seconds: -4, answers: [{ id: 'v-if-were', choice: 1 }, { id: 'r-clock-330', choice: 1 }] }
  });
  assert.equal(second.body.topic, 'mixed');
  assert.equal(JSON.parse((await Work.findById(second.body.work.id).lean()).htmlContent).seconds, null);

  const history = await call('/api/aptitude/history', { token: me.token });
  assert.equal(history.status, 200);
  assert.deepEqual(history.body.tests.map((t) => [t.label, t.score, t.total]), [['Mixed Mock Test', 2, 2], ['Quantitative Aptitude', 2, 3]]);

  // One saved test opens with every answer, for its owner only
  const one = await call(`/api/aptitude/history/${first.body.work.id}`, { token: me.token });
  assert.equal(one.status, 200);
  assert.equal(one.body.result.score, 2);
  assert.equal(one.body.topic, 'quant');
  assert.equal(one.body.result.results.length, 3);
  assert.equal((await call(`/api/aptitude/history/${first.body.work.id}`, { token: other.token })).status, 404);
  assert.equal((await call('/api/aptitude/history/not-an-id', { token: me.token })).status, 404);

  // Someone else's history is their own
  assert.deepEqual((await call('/api/aptitude/history', { token: other.token })).body.tests, []);
});

test('Leo: locked accounts get a coming-soon button, allowed accounts get the practice page', async () => {
  process.env.APTITUDE_EMAILS = 'allowed@example.com';
  try {
    const call = { name: 'aptitude_practice', arguments: JSON.stringify({ topic: 'reasoning' }) };
    const locked = await runTool(call, { email: 'someone@example.com', resumeText: '' });
    assert.equal(locked.card.page, 'aptitude');
    assert.match(locked.card.label, /coming soon/i);
    assert.match(locked.summary, /Do not quiz/);

    const guest = await runTool(call, { email: null, resumeText: '' });
    assert.equal(guest.card.page, 'aptitude');

    const open = await runTool(call, { email: 'allowed@example.com', resumeText: '' });
    assert.equal(open.card.page, 'aptitude-practice');
    assert.match(open.card.label, /Logical Reasoning/);
  } finally {
    process.env.APTITUDE_EMAILS = '*';
  }
});

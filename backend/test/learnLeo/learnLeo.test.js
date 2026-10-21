import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Learn with Leo: plan → start (daily limit, cache) → SSE beats → checkpoints → replay.
// The AI model is replaced by a scripted fake, so these tests make no network calls.

let mongod;
let server;
let base;
let mongoose;
let signToken;
let service;
let validate;
let models;
let Subscription;

const fake = { calls: [], plan: null, beat: null, approach: null, reexplain: null };

const narration = (n = 50, first = 'Socho') => [first, ...Array.from({ length: n - 1 }, (_, i) => (i === 5 ? 'array' : i === 10 ? 'beech' : `shabd${i}`))].join(' ');

const goodBeat = ({ checkpoint }) => ({
  title: 'Binary search ka idea',
  narration: narration(),
  elements: [
    { type: 'heading', content: 'Binary search ka idea', cue: 'Socho' },
    { type: 'diagram', format: 'mermaid', content: 'graph LR; A[1]-->B[3]-->C[5]', cue: 'array' },
    { type: 'code', language: 'js', content: 'let mid = Math.floor((lo + hi) / 2);', cue: 'beech' },
    ...(checkpoint ? [{ type: 'checkpoint', format: 'mcq', question: 'Array sorted na ho toh?', options: ['Kaam karega', 'Kaam nahi karega'], answer: 1, explanation: 'Sorted order hi half chhodne deta hai.' }] : [])
  ]
});

function fakeModel({ system, prompt }) {
  fake.calls.push({ system, prompt });
  if (system.includes('planning a short lesson')) {
    if (fake.plan) return fake.plan({ system, prompt });
    return { allowed: true, title: 'Binary search', message: 'Chalo binary search seekhte hain.', steps: [
      { title: 'Idea', goal: 'Why halving works' },
      { title: 'Pointers', goal: 'lo, hi, mid' },
      { title: 'Code', goal: 'Write it' },
      { title: 'Mistakes', goal: 'Off by one' }
    ] };
  }
  if (system.includes('answered a checkpoint wrong')) {
    return fake.reexplain ? fake.reexplain() : { title: 'Ek aur baar', narration: narration(40, 'Dekho'), elements: [{ type: 'callout', content: 'Sorted hona zaroori hai', cue: 'Dekho' }] };
  }
  if (system.includes('asked to see the full approach')) return fake.approach();
  const checkpoint = system.includes('MUST end with exactly one checkpoint');
  return fake.beat ? fake.beat({ system, prompt, checkpoint }) : goodBeat({ checkpoint });
}

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_learn_leo_test');
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'learn-leo-test-secret';
  process.env.LEO_HINGLISH = 'true'; // the language tests below need Hinglish on; one test turns it off
  process.env.LEARN_LEO_EMAILS = '*'; // open to the test accounts; one test checks the coming-soon lock

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken } = await import('../../src/services/authToken.js'));
  await import('../../src/db.js');
  service = await import('../../src/learnLeo/service.js');
  validate = await import('../../src/learnLeo/validate.js');
  models = await import('../../src/learnLeo/models.js');
  ({ Subscription } = await import('../../src/billing/models.js'));
  const { installSessionValidator } = await import('../../src/admin/sessions.js');
  installSessionValidator();
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));
  await Promise.all(models.LEARN_LEO_MODELS.map((m) => m.syncIndexes()));

  service.setLessonModel(fakeModel);
  const { createLearnLeoRouter } = await import('../../src/routes/learnLeo.js');
  const app = express();
  app.use(express.json());
  app.use('/api/leo', createLearnLeoRouter());
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  service?.setLessonModel(null);
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

beforeEach(async () => {
  fake.calls = [];
  fake.plan = null;
  fake.beat = null;
  fake.approach = null;
  fake.reexplain = null;
  await Promise.all(models.LEARN_LEO_MODELS.map((m) => m.deleteMany({})));
  await mongoose.connection.collection('ratebuckets').deleteMany({}).catch(() => {});
});

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

// Reads a whole SSE response into [{ event, data }]
async function stream(path, token) {
  const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.match(res.headers.get('content-type') || '', /text\/event-stream/);
  const text = await res.text();
  return text.split('\n\n').filter((chunk) => chunk.startsWith('event:')).map((chunk) => {
    const [eventLine, dataLine] = chunk.split('\n');
    return { event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) };
  });
}

let seq = 0;
async function account({ pro = false } = {}) {
  seq += 1;
  const email = `leo${seq}@example.com`;
  const user = await mongoose.model('User').create({ email, name: 'Test Student', password: 'x', emailVerified: true });
  if (pro) await Subscription.create({ email, plan: 'monthly', startsAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 30 * 86400000), source: 'admin' });
  return { id: String(user._id), email, token: signToken({ sub: String(user._id), kind: 'user', email }) };
}

async function planAndStart(me, body = { topic: 'Binary search', language: 'hinglish', level: 'beginner' }) {
  const plan = await call('/api/leo/plan', { method: 'POST', token: me.token, body });
  assert.equal(plan.status, 200, JSON.stringify(plan.body));
  const start = await call(`/api/leo/lessons/${plan.body.lesson.id}/start`, { method: 'POST', token: me.token });
  assert.equal(start.status, 200, JSON.stringify(start.body));
  return start.body.lesson;
}

// ── Validator ─────────────────────────────────────────────────────────────────

test('the validator clears cues that are not in the narration and times the rest', () => {
  const raw = goodBeat({ checkpoint: false });
  raw.elements[1].cue = 'nowhere';
  const { ok, beat } = validate.validateBeat(raw, { checkpoint: 'forbidden' });
  assert.ok(ok);
  assert.equal(beat.elements[1].cue, '');
  assert.equal(beat.elements[1].wordIndex, 0);
  assert.equal(beat.elements[2].wordIndex, 11);
  assert.ok(beat.durationMs > 10000);
});

test('the validator rejects broken Mermaid and JavaScript, and drops them on the lenient retry', () => {
  const raw = goodBeat({ checkpoint: false });
  raw.elements[1].content = 'graph LR; A[1-->B';
  raw.elements[2].content = 'let x = (1 +;';
  const strict = validate.validateBeat(raw, { checkpoint: 'forbidden' });
  assert.equal(strict.ok, false);
  assert.ok(strict.errors.some((e) => e.includes('diagram')));
  assert.ok(strict.errors.some((e) => e.includes('syntax')));
  const lenient = validate.validateBeat(raw, { checkpoint: 'forbidden', lenient: true });
  assert.ok(lenient.ok);
  assert.deepEqual(lenient.beat.elements.map((e) => e.type), ['heading']);
});

test('function-body snippets with return are valid JavaScript', () => {
  assert.equal(validate.checkCode('if (lo > hi) return -1;\nreturn mid;', 'js'), null);
  assert.equal(validate.checkCode('def f():\n  return 1', 'python'), null);
});

test('a required checkpoint must be there, and a forbidden one is removed', () => {
  assert.equal(validate.validateBeat(goodBeat({ checkpoint: false }), { checkpoint: 'required' }).ok, false);
  const { beat } = validate.validateBeat(goodBeat({ checkpoint: true }), { checkpoint: 'forbidden' });
  assert.ok(!beat.elements.some((e) => e.type === 'checkpoint'));
});

// ── Plan and limits ───────────────────────────────────────────────────────────

test('a plan is created, can be changed once, and needs a signed-in user', async () => {
  const me = await account();
  assert.equal((await call('/api/leo/plan', { method: 'POST', body: { topic: 'Recursion' } })).status, 401);

  const res = await call('/api/leo/plan', { method: 'POST', token: me.token, body: { topic: 'Recursion', role: 'SDE', level: 'beginner' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.lesson.status, 'planning');
  assert.equal(res.body.lesson.plan.length, 4);
  assert.equal(res.body.lesson.beatCount, 5); // 4 steps + recap
  assert.ok(fake.calls[0].prompt.includes('Target role: SDE'));

  const shorter = await call(`/api/leo/lessons/${res.body.lesson.id}/plan`, { method: 'POST', token: me.token, body: { shorter: true } });
  assert.equal(shorter.status, 200);
  assert.ok(shorter.body.lesson.planEdited);
  const again = await call(`/api/leo/lessons/${res.body.lesson.id}/plan`, { method: 'POST', token: me.token, body: { edits: 'more code' } });
  assert.equal(again.status, 409);
});

test('non-learning topics are refused', async () => {
  const me = await account();
  const blocked = await call('/api/leo/plan', { method: 'POST', token: me.token, body: { topic: 'how to make a bomb' } });
  assert.equal(blocked.status, 422);
  assert.equal(fake.calls.length, 0);

  fake.plan = () => ({ allowed: false, message: 'Leo sirf technical topics padhata hai.' });
  const refused = await call('/api/leo/plan', { method: 'POST', token: me.token, body: { topic: 'Celebrity gossip' } });
  assert.equal(refused.status, 422);
  assert.equal(refused.body.code, 'TOPIC_NOT_ALLOWED');
});

test('free accounts get 1 new lesson a day and Pro gets 10', async () => {
  const free = await account();
  await planAndStart(free, { topic: 'Hashing' });
  const second = await call('/api/leo/plan', { method: 'POST', token: free.token, body: { topic: 'Sorting' } });
  const blocked = await call(`/api/leo/lessons/${second.body.lesson.id}/start`, { method: 'POST', token: free.token });
  assert.equal(blocked.status, 402);
  assert.equal(blocked.body.code, 'UPGRADE_REQUIRED');

  const pro = await account({ pro: true });
  for (let i = 0; i < 10; i += 1) await planAndStart(pro, { topic: `Topic number ${i}` });
  const eleventh = await call('/api/leo/plan', { method: 'POST', token: pro.token, body: { topic: 'One more' } });
  assert.equal((await call(`/api/leo/lessons/${eleventh.body.lesson.id}/start`, { method: 'POST', token: pro.token })).status, 429);
});

// ── Streaming ─────────────────────────────────────────────────────────────────

test('beats stream in order, are saved, and resume with ?from', async () => {
  const me = await account();
  const lesson = await planAndStart(me);
  assert.equal(lesson.status, 'streaming');

  const events = await stream(`/api/leo/lessons/${lesson.id}/stream`, me.token);
  assert.equal(events[0].event, 'meta');
  const beats = events.filter((e) => e.event === 'beat').map((e) => e.data);
  assert.deepEqual(beats.map((b) => b.order), [0, 1, 2, 3, 4]);
  assert.equal(events.at(-1).event, 'done');
  assert.equal(events.at(-1).data.lesson.status, 'ready');

  // checkpoints sit in the planned beats and their answers are not sent to the browser
  const withCheckpoint = beats.filter((b) => b.elements.some((e) => e.type === 'checkpoint')).map((b) => b.order);
  assert.deepEqual(withCheckpoint, lesson.checkpointBeats);
  assert.ok(beats.flatMap((b) => b.elements).every((e) => !('answer' in e)));

  const callsBefore = fake.calls.length;
  const resumed = await stream(`/api/leo/lessons/${lesson.id}/stream?from=3`, me.token);
  assert.deepEqual(resumed.filter((e) => e.event === 'beat').map((e) => e.data.order), [3, 4]);
  assert.equal(fake.calls.length, callsBefore, 'saved beats are never generated again');
});

test('a bad beat is retried once; failing twice ends the lesson with earlier beats kept', async () => {
  const me = await account();
  const lesson = await planAndStart(me);
  let beatCalls = 0;
  fake.beat = ({ checkpoint }) => {
    beatCalls += 1;
    if (beatCalls === 1) return { title: 'x', narration: 'too short', elements: [] }; // retried
    if (beatCalls >= 4) return { nonsense: true };
    return goodBeat({ checkpoint });
  };
  const events = await stream(`/api/leo/lessons/${lesson.id}/stream`, me.token);
  const beats = events.filter((e) => e.event === 'beat');
  assert.equal(beats.length, 2);
  assert.equal(events.at(-1).event, 'error');
  assert.equal(events.at(-1).data.code, 'BEAT_FAILED');

  const saved = await call(`/api/leo/lessons/${lesson.id}`, { token: me.token });
  assert.equal(saved.body.lesson.status, 'failed');
  assert.equal(saved.body.beats.length, 2);
});

// ── Checkpoints, replay, ownership ────────────────────────────────────────────

test('checkpoint answers: right gets praise, wrong gets a saved re-explain beat; only the first answer counts', async () => {
  const me = await account();
  const lesson = await planAndStart(me);
  await stream(`/api/leo/lessons/${lesson.id}/stream`, me.token);
  const order = lesson.checkpointBeats[0];

  const wrong = await call(`/api/leo/lessons/${lesson.id}/checkpoint`, { method: 'POST', token: me.token, body: { beatOrder: order, chosen: 0 } });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.body.correct, false);
  assert.equal(wrong.body.answer, 1);
  assert.equal(wrong.body.reexplain.kind, 'reexplain');

  const right = await call(`/api/leo/lessons/${lesson.id}/checkpoint`, { method: 'POST', token: me.token, body: { beatOrder: order, chosen: 1 } });
  assert.equal(right.body.correct, true);
  assert.ok(right.body.reply);

  const progress = await models.LeoProgress.findOne({ lessonId: lesson.id }).lean();
  assert.equal(progress.checkpointAnswers.length, 1);
  assert.equal(progress.checkpointAnswers[0].correct, false);
});

test('replay returns the saved lesson with no AI calls, and other users cannot see it', async () => {
  const me = await account();
  const lesson = await planAndStart(me);
  await stream(`/api/leo/lessons/${lesson.id}/stream`, me.token);
  const callsBefore = fake.calls.length;

  const replay = await call(`/api/leo/lessons/${lesson.id}`, { token: me.token });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.beats.length, 5);
  const list = await call('/api/leo/lessons', { token: me.token });
  assert.equal(list.body.lessons.length, 1);
  assert.equal(fake.calls.length, callsBefore);

  const progress = await call(`/api/leo/lessons/${lesson.id}/progress`, { method: 'POST', token: me.token, body: { lastBeat: 4, completed: true, prepClicked: true } });
  assert.ok(progress.body.progress.completedAt);
  assert.ok(progress.body.progress.prepClickedAt);

  const other = await account();
  assert.equal((await call(`/api/leo/lessons/${lesson.id}`, { token: other.token })).status, 404);
  assert.equal((await call(`/api/leo/lessons/${lesson.id}/checkpoint`, { method: 'POST', token: other.token, body: { beatOrder: 2, chosen: 1 } })).status, 404);
});

test('a finished catalogue lesson is cached and copied for the next student with zero AI calls', async () => {
  const first = await account();
  const lesson = await planAndStart(first, { topic: 'binary search', language: 'english', level: 'beginner' });
  await stream(`/api/leo/lessons/${lesson.id}/stream`, first.token);
  assert.equal(await models.LeoCache.countDocuments(), 1);

  fake.calls = [];
  const second = await account();
  const copy = await planAndStart(second, { topic: 'Binary Search', language: 'english', level: 'beginner' });
  assert.equal(copy.status, 'ready');
  assert.equal(copy.cached, true);
  const events = await stream(`/api/leo/lessons/${copy.id}/stream`, second.token);
  assert.equal(events.filter((e) => e.event === 'beat').length, 5);
  assert.equal(fake.calls.length, 0);
  assert.equal((await models.LeoCache.findOne().lean()).hits, 1);

  // a different language is a different lesson
  const third = await account();
  const hinglish = await planAndStart(third, { topic: 'Binary Search', language: 'hinglish', level: 'beginner' });
  assert.equal(hinglish.cached, false);
});

// ── DSA problem lessons ───────────────────────────────────────────────────────

test('a problem lesson uses the server copy of the problem and unlocks the full approach after the checkpoint', async () => {
  const me = await account({ pro: true });
  fake.plan = () => ({ allowed: true, title: 'Two Sum', message: 'Dekhte hain kahan atka.', steps: [
    { title: 'Concept', goal: 'Complement lookup' }, { title: 'Dry run', goal: 'On the failing test' }, { title: 'The bug', goal: 'Where the code goes wrong' }
  ] });
  const lesson = await planAndStart(me, {
    problemId: 'two-sum',
    code: 'function twoSum(nums, target) { return [0, 0]; }',
    codeLanguage: 'javascript',
    failingTest: { input: [[4, 9, 1, 7], 10], expected: [1, 2], actual: [0, 0] },
    language: 'hinglish'
  });
  assert.equal(lesson.source, 'dsa_problem');
  assert.equal(lesson.beatCount, 3);
  assert.ok(fake.calls[0].prompt.includes('PROBLEM: Two Sum'));
  assert.ok(fake.calls[0].prompt.includes('FAILING TEST'));

  await stream(`/api/leo/lessons/${lesson.id}/stream`, me.token);
  const early = await call(`/api/leo/lessons/${lesson.id}/full-approach`, { method: 'POST', token: me.token });
  assert.equal(early.status, 409);
  assert.equal(early.body.code, 'CHECKPOINT_FIRST');

  await call(`/api/leo/lessons/${lesson.id}/checkpoint`, { method: 'POST', token: me.token, body: { beatOrder: lesson.checkpointBeats[0], chosen: 1 } });

  // a wrong solution is rejected by the judge and retried
  let attempts = 0;
  fake.approach = () => {
    attempts += 1;
    const content = attempts === 1
      ? 'function twoSum(nums, target) { return [0, 1]; }'
      : 'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];\n    seen.set(nums[i], i);\n  }\n}';
    return { title: 'Full approach', narration: narration(60, 'Approach'), elements: [
      { type: 'heading', content: 'Hash map approach', cue: 'Approach' },
      { type: 'code', language: 'js', content, cue: 'array' },
      { type: 'callout', content: 'O(n) time, O(n) space', cue: 'beech' }
    ] };
  };
  const full = await call(`/api/leo/lessons/${lesson.id}/full-approach`, { method: 'POST', token: me.token });
  assert.equal(full.status, 200, JSON.stringify(full.body));
  assert.equal(attempts, 2);
  assert.equal(full.body.beat.kind, 'approach');
});

test('Hinglish is coming soon: without LEO_HINGLISH a Hinglish request becomes an English lesson', async () => {
  const me = await account();
  process.env.LEO_HINGLISH = '';
  try {
    const res = await call('/api/leo/plan', { method: 'POST', token: me.token, body: { topic: 'Recursion', language: 'hinglish' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.lesson.language, 'english');
    assert.ok(fake.calls.at(-1).system.includes('Language: simple, spoken Indian English'));
  } finally {
    process.env.LEO_HINGLISH = 'true';
  }
});

test('coming soon: only listed accounts get in, everyone else gets COMING_SOON', async () => {
  const me = await account();
  const other = await account();
  process.env.LEARN_LEO_EMAILS = `test@cvmind.in, ${me.email.toUpperCase()}`;
  try {
    assert.equal((await call('/api/leo/access')).body.access, false);
    assert.equal((await call('/api/leo/access', { token: other.token })).body.access, false);
    assert.equal((await call('/api/leo/access', { token: me.token })).body.access, true);
    const blocked = await call('/api/leo/plan', { method: 'POST', token: other.token, body: { topic: 'Recursion' } });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, 'COMING_SOON');
    assert.equal((await call('/api/leo/lessons', { token: other.token })).status, 403);
    assert.equal((await call('/api/leo/plan', { method: 'POST', token: me.token, body: { topic: 'Recursion' } })).status, 200);
    delete process.env.LEARN_LEO_EMAILS; // default: only the test account
    assert.equal((await call('/api/leo/access', { token: me.token })).body.access, false);
  } finally {
    process.env.LEARN_LEO_EMAILS = '*';
  }
});

test('an unknown problem is a 404', async () => {
  const me = await account();
  const res = await call('/api/leo/plan', { method: 'POST', token: me.token, body: { problemId: 'no-such-problem', code: '' } });
  assert.equal(res.status, 404);
});

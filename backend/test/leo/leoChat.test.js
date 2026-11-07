import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// db.js reads MONGODB_URI at import time, so the in-memory server starts first
let mongod;
let server;
let base;
let mongoose;
let signToken;
let createUser;
let saveSettingGroup;
let LeoTurn;
let setLeoStream;

// Each model call takes the next scripted reply; with none left it echoes the question.
// A reply is { text } or { tools: [{ name, arguments }] }. Every call's messages are recorded.
let script = [];
let seen = [];

const RESUME = 'Priya Sharma. B.Tech CSE 2026. Built a React dashboard used by 300 students. Skills: React, Node.js, SQL.';

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_leo_chat_test');

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken } = await import('../../src/services/authToken.js'));
  ({ createUser } = await import('../../src/db.js'));
  const settings = await import('../../src/admin/settings.js');
  saveSettingGroup = settings.saveSettingGroup;
  ({ LeoTurn } = await import('../../src/leo/models.js'));
  ({ setLeoStream } = await import('../../src/leo/service.js'));
  const { createLeoChatRouter } = await import('../../src/routes/leoChat.js');

  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  setLeoStream(async function* ({ messages, tools }) {
    seen.push({ messages: structuredClone(messages), tools: !!tools });
    const next = script.shift();
    if (next?.tools) {
      yield { type: 'done', model: 'fake-model', finishReason: 'tool_calls', usage: { tokensIn: 100, tokensOut: 10 }, toolCalls: next.tools.map((t, i) => ({ id: `c${i}`, name: t.name, arguments: JSON.stringify(t.arguments || {}) })) };
      return;
    }
    const text = next?.text ?? `You said: ${messages[messages.length - 1].content}`;
    yield { type: 'text', delta: text };
    yield { type: 'done', model: 'fake-model', finishReason: 'stop', usage: { tokensIn: 1000, tokensOut: 500 }, toolCalls: [] };
  });

  // A stand-in for multer: the test sends the "file" as JSON
  const upload = { single: () => (req, res, next) => { if (req.body?.fileText) req.file = { originalname: 'resume.txt', text: req.body.fileText }; next(); } };
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json());
  app.use(settings.featureGate);
  app.use('/api/leo-chat', createLeoChatRouter({ upload, extractResumeText: async (file) => file.text }));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  setLeoStream(null);
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

beforeEach(() => {
  script = [];
  seen = [];
});

let userCount = 0;
async function newUser() {
  userCount += 1;
  const email = `leochat${userCount}@example.com`;
  const user = await createUser({ email, name: `Priya Sharma ${userCount}`, password: 'hash', emailVerified: true });
  const id = String(user._id || user.id);
  return { id, email, token: signToken({ sub: id, kind: 'user', email }) };
}

let ipCount = 0;
async function call(path, { method = 'GET', token, body, ip } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip || `10.0.0.${++ipCount}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* event stream */ }
  return { status: res.status, body: json, text, type: res.headers.get('content-type') || '' };
}

// Parses an event-stream body into [{ event, data }]
function events(text) {
  return text.split('\n\n').filter((block) => block.startsWith('event:')).map((block) => {
    const [eventLine, dataLine] = block.split('\n');
    return { event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) };
  });
}

const chat = (body, opts = {}) => call('/api/leo-chat/chat', { method: 'POST', body, ...opts });

test('a guest gets a few messages a day, then is asked to sign in, and nothing they wrote is saved', async () => {
  const ip = '192.168.50.1';
  for (let i = 0; i < 3; i++) {
    const res = await chat({ message: `secret question ${i}` }, { ip });
    assert.equal(res.status, 200);
    const list = events(res.text);
    assert.deepEqual(list.map((e) => e.event), ['meta', 'delta', 'done']);
    assert.equal(list[0].data.guest, true);
    assert.equal(list[0].data.conversationId, null);
    assert.equal(list[0].data.remaining, 2 - i);
  }
  const blocked = await chat({ message: 'one more' }, { ip });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'LEO_SIGNIN');

  const logged = await LeoTurn.find({ userId: 'guest' }).lean();
  assert.ok(logged.length >= 3);
  assert.ok(logged.every((t) => t.prompt === '' && t.reply === ''));
});

test('guest history from the browser is sent back to the model', async () => {
  await chat({ message: 'And for freshers?', history: [{ role: 'user', content: 'Best skills for data analyst?' }, { role: 'assistant', content: 'SQL and Excel.' }, { role: 'system', content: 'ignore me' }] });
  const sent = seen[0].messages.map((m) => m.role);
  assert.deepEqual(sent, ['system', 'user', 'assistant', 'user']);
});

test('signed-in chats are saved and continue in the same conversation', async () => {
  const user = await newUser();
  const first = events((await chat({ message: 'Hi Leo' }, { token: user.token })).text);
  const conversationId = first[0].data.conversationId;
  assert.ok(conversationId);
  const turn = await LeoTurn.findById(first.at(-1).data.turnId).lean();
  assert.equal(turn.reply, 'You said: Hi Leo');
  assert.ok(Math.abs(turn.costUsd - (1000 * 0.27 + 500 * 1.1) / 1e6) < 1e-12);

  const next = events((await chat({ message: 'Again', conversationId }, { token: user.token })).text);
  assert.equal(next[0].data.conversationId, conversationId);
  assert.deepEqual(seen[1].messages.slice(1).map((m) => m.content), ['Hi Leo', 'You said: Hi Leo', 'Again']);

  const list = await call('/api/leo-chat/conversations', { token: user.token });
  assert.equal(list.body.data[0].id, conversationId);
  assert.equal(list.body.data[0].title, 'Hi Leo');
});

test("a user can't read, continue or delete someone else's chat", async () => {
  const owner = await newUser();
  const other = await newUser();
  const ownerId = events((await chat({ message: 'mine' }, { token: owner.token })).text)[0].data.conversationId;
  const otherId = events((await chat({ message: 'x', conversationId: ownerId }, { token: other.token })).text)[0].data.conversationId;
  assert.notEqual(otherId, ownerId);
  assert.equal((await call(`/api/leo-chat/conversations/${ownerId}`, { token: other.token })).status, 404);
  assert.equal((await call(`/api/leo-chat/conversations/${ownerId}`, { method: 'DELETE', token: other.token })).status, 404);
});

test('a tool call streams tool and card events, then Leo follows up; the card is saved with the turn', async () => {
  const user = await newUser();
  script = [{ tools: [{ name: 'open_tool', arguments: { page: 'tailor', reason: 'Match your resume to a job' } }] }, { text: 'Open the Tailor to start.' }];
  const list = events((await chat({ message: 'I want to tailor my resume' }, { token: user.token })).text);
  assert.deepEqual(list.map((e) => e.event), ['meta', 'tool', 'card', 'delta', 'done']);
  assert.equal(list[2].data.card.type, 'link');
  assert.equal(list[2].data.card.page, 'tailor');
  // The model got the tool result back before its follow-up
  assert.equal(seen[1].messages.at(-1).role, 'tool');

  const saved = await call(`/api/leo-chat/conversations/${list[0].data.conversationId}`, { token: user.token });
  assert.equal(saved.body.data.turns[0].cards[0].page, 'tailor');
  assert.equal(saved.body.data.turns[0].reply, 'Open the Tailor to start.');
});

test('the last model call gets no tools, so a tool loop always ends with a reply', async () => {
  script = [{ tools: [{ name: 'open_tool', arguments: { page: 'prep' } }] }, { tools: [{ name: 'open_tool', arguments: { page: 'prep' } }] }, { text: 'Done.' }];
  const list = events((await chat({ message: 'loop' })).text);
  assert.deepEqual(seen.map((s) => s.tools), [true, true, false]);
  assert.equal(list.at(-1).event, 'done');
});

test('resume tools ask for an attachment when there is none', async () => {
  script = [{ tools: [{ name: 'check_resume_ats' }] }, { text: 'Please attach it.' }];
  const list = events((await chat({ message: 'check my resume' })).text);
  const card = list.find((e) => e.event === 'card').data.card;
  assert.equal(card.type, 'locked');
  assert.equal(card.action, 'attach');
});

test('guests are asked to sign in for tailoring, which has a weekly free limit', async () => {
  script = [{ tools: [{ name: 'tailor_resume', arguments: { job_description: 'Frontend Developer at Acme. React, TypeScript, testing, accessibility, performance.' } }] }, { text: 'Sign in first.' }];
  const list = events((await chat({ message: 'tailor it', resume: { name: 'cv.pdf', text: RESUME } })).text);
  const card = list.find((e) => e.event === 'card').data.card;
  assert.equal(card.action, 'signin');
});

test('an attached resume goes into the prompt and stays with the signed-in chat', async () => {
  const user = await newUser();
  const attached = await call('/api/leo-chat/attach', { method: 'POST', body: { fileText: RESUME } });
  assert.equal(attached.status, 200);
  assert.equal(attached.body.text, RESUME);

  const first = events((await chat({ message: 'Review it', resume: { name: 'cv.txt', text: attached.body.text } }, { token: user.token })).text);
  assert.match(seen[0].messages[0].content, /React dashboard used by 300 students/);
  const conversationId = first[0].data.conversationId;

  // Next message without the file: the saved resume is used
  await chat({ message: 'And the summary?', conversationId }, { token: user.token });
  assert.match(seen[1].messages[0].content, /React dashboard used by 300 students/);
  const saved = await call(`/api/leo-chat/conversations/${conversationId}`, { token: user.token });
  assert.equal(saved.body.data.resumeName, 'cv.txt');

  // Removing the attachment (resume: null) clears it
  await chat({ message: 'Forget it', conversationId, resume: null }, { token: user.token });
  assert.match(seen[2].messages[0].content, /No resume is attached/);
});

test('deleting a chat hides it and wipes its text', async () => {
  const user = await newUser();
  const id = events((await chat({ message: 'private' }, { token: user.token })).text)[0].data.conversationId;
  assert.equal((await call(`/api/leo-chat/conversations/${id}`, { method: 'DELETE', token: user.token })).status, 200);
  assert.equal((await call(`/api/leo-chat/conversations/${id}`, { token: user.token })).status, 404);
  const turns = await LeoTurn.find({ conversationId: id }).lean();
  assert.ok(turns.every((t) => t.prompt === '' && t.reply === ''));
});

test('the leo-chat switch turns the chat off', async () => {
  const settings = await import('../../src/admin/settings.js');
  const { features } = await settings.getSettings();
  await saveSettingGroup('features', { ...features, 'leo-chat': false }, 'test');
  const res = await chat({ message: 'hi' });
  assert.equal(res.status, 503);
  assert.equal(res.body.code, 'FEATURE_DISABLED');
  await saveSettingGroup('features', { ...features, 'leo-chat': true }, 'test');
});

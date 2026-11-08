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
    seen.push({ messages: structuredClone(messages), tools: !!tools, toolNames: (tools || []).map((t) => t.function.name) });
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
  assert.ok(Math.abs(turn.costUsd - (1000 * 4 + 500 * 20) / 1e6) < 1e-12);

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

// ── Guided flows: Resume Builder in chat ────────────────────────────────────

const action = (body, opts = {}) => call('/api/leo-chat/action', { method: 'POST', body, ...opts });
const cardsOf = (list) => list.filter((e) => e.event === 'card').map((e) => e.data.card);
const flowOf = (list) => list.filter((e) => e.event === 'flow').at(-1)?.data.flow;

const ANSWERS = {
  level: 'fresher',
  fullName: 'Priya Sharma',
  email: 'priya@example.com',
  phone: '+91 98765 43210',
  targetRole: 'Frontend Developer intern',
  education: [{ degree: 'B.Tech CSE', university: 'VIT Pune', gradYear: '2026', cgpa: '8.4' }],
  projects: [{ name: 'Campus Dashboard', tech: 'React, Node.js', description: 'Used by 300 students' }],
  skills: ['React', 'JavaScript', 'SQL']
};

// Runs a signed-in chat up to the summary card; returns the conversation id
async function fillDraft(user) {
  script = [{ tools: [{ name: 'start_flow', arguments: { product: 'resume' } }] }, { text: 'Fresher or experienced?' }];
  const started = events((await chat({ message: 'resume banana hai' }, { token: user.token })).text);
  const conversationId = started[0].data.conversationId;
  assert.equal(flowOf(started).product, 'resume');
  assert.equal(flowOf(started).step, 'collect');

  // Everything required in one go: the extras (achievements, LinkedIn, city) are asked next
  script = [{ tools: [{ name: 'update_draft', arguments: { fields: ANSWERS } }] }, { text: 'Any achievements, LinkedIn or city? Or say skip.' }];
  const answered = events((await chat({ message: 'all my details', conversationId }, { token: user.token })).text);
  assert.equal(flowOf(answered).step, 'collect');
  assert.deepEqual(flowOf(answered).missing, []);
  assert.ok(!cardsOf(answered).some((c) => c.type === 'summary_confirm'));

  // The model forgets to call update_draft after "skip": the server still shows the summary
  script = [{ text: 'Okay!' }];
  const skipped = events((await chat({ message: 'skip', conversationId }, { token: user.token })).text);
  const summary = cardsOf(skipped).find((c) => c.type === 'summary_confirm');
  assert.ok(summary, 'summary card shown');
  assert.equal(flowOf(skipped).step, 'confirm');
  assert.ok(summary.sections.some((s) => s.title === 'Projects' && s.lines[0].includes('Campus Dashboard')));
  return conversationId;
}

test('guided flow: the flow tools are offered and the draft state goes into the prompt', async () => {
  const user = await newUser();
  script = [{ tools: [{ name: 'start_flow', arguments: { product: 'resume' } }] }, { text: 'Are you a fresher?' }];
  const list = events((await chat({ message: 'I want to make a resume' }, { token: user.token })).text);
  assert.ok(seen[0].toolNames.includes('start_flow'));
  assert.ok(seen[0].toolNames.includes('update_draft'));
  // The tool result tells the model what to ask next
  assert.match(seen[1].messages.at(-1).content, /Next: acknowledge in a few words, then ask if they are a fresher or experienced/);

  await chat({ message: 'Fresher', conversationId: list[0].data.conversationId }, { token: user.token });
  assert.match(seen[2].messages[0].content, /Resume Builder flow is open \(step: collect\)/);
});

test('guided flow: answers are saved, a summary is confirmed, a template is picked and the resume is built', async () => {
  const user = await newUser();
  const conversationId = await fillDraft(user);

  script = [{ text: 'Pick a template.' }];
  const confirmed = events((await action({ conversationId, action: 'confirm' }, { token: user.token })).text);
  assert.deepEqual(confirmed.slice(0, 3).map((e) => e.event), ['meta', 'tool', 'card']);
  assert.equal(cardsOf(confirmed)[0].type, 'template_picker');
  assert.equal(flowOf(confirmed).step, 'template');

  script = [{ text: 'Here it is! Want me to check its ATS score?' }];
  const built = events((await action({ conversationId, action: 'template', value: { templateId: 'cv-ivy-league', name: 'Ivy League' } }, { token: user.token })).text);
  const doc = cardsOf(built).find((c) => c.type === 'document');
  assert.ok(doc, 'document card');
  assert.equal(doc.templateId, 'cv-ivy-league');
  assert.equal(doc.data.personalInfo.fullName, 'Priya Sharma');
  assert.equal(doc.data.personalInfo.jobTitle, 'Frontend Developer intern');
  assert.equal(doc.data.workExperiences[0].jobTitle, 'Campus Dashboard');
  assert.equal(doc.keepFacts, false);
  assert.equal(flowOf(built).step, 'built');

  // The browser fills the template and hands the HTML back for reloads
  const saved = await action({ conversationId, action: 'built', value: { cardId: doc.id, html: '<div>Priya</div>', workId: 'w1' } }, { token: user.token });
  assert.equal(saved.status, 200);
  const chatNow = await call(`/api/leo-chat/conversations/${conversationId}`, { token: user.token });
  const savedDoc = chatNow.body.data.turns.flatMap((t) => t.cards).find((c) => c.type === 'document');
  assert.equal(savedDoc.html, '<div>Priya</div>');
  assert.equal(savedDoc.workId, 'w1');
  assert.equal(chatNow.body.data.flow.step, 'built');
  // The tap shows up as the user's message
  assert.equal(chatNow.body.data.turns.at(-1).prompt, 'Use the Ivy League template');

  const { LeoFlowEvent } = await import('../../src/leo/models.js');
  const kinds = (await LeoFlowEvent.find({ conversationId }).lean()).map((e) => e.event);
  for (const kind of ['flow_started', 'field_filled', 'choice_made', 'build_done']) assert.ok(kinds.includes(kind), kind);
});

test('guided flow: a free account picking a Pro template gets the upgrade card, not a resume', async () => {
  const user = await newUser();
  const conversationId = await fillDraft(user);
  await action({ conversationId, action: 'confirm' }, { token: user.token });
  const list = events((await action({ conversationId, action: 'template', value: { templateId: 'cv-stylish' } }, { token: user.token })).text);
  const cards = cardsOf(list);
  assert.equal(cards[0].type, 'locked');
  assert.equal(cards[0].action, 'upgrade');
  assert.ok(!cards.some((c) => c.type === 'document'));
});

test('guided flow: a guest keeps the draft in the browser and is asked to sign in to build', async () => {
  script = [{ tools: [{ name: 'start_flow', arguments: { product: 'resume' } }, { name: 'update_draft', arguments: { fields: ANSWERS, skip: ['achievements', 'linkedin', 'location'] } }] }, { text: 'Check these.' }];
  const first = events((await chat({ message: 'make my CV' })).text);
  const flow = flowOf(first);
  assert.equal(flow.step, 'confirm');
  assert.equal(flow.data.fullName, 'Priya Sharma');

  // The browser sends the draft back with the tap; building needs an account
  const list = events((await action({ action: 'template', value: { templateId: 'cv-ivy-league' }, flow })).text);
  const card = cardsOf(list)[0];
  assert.equal(card.type, 'locked');
  assert.equal(card.action, 'signin');

  // Nothing the guest typed is stored server-side
  const { LeoConversation } = await import('../../src/leo/models.js');
  assert.equal(await LeoConversation.countDocuments({ 'flow.data.email': 'priya@example.com', userId: 'guest' }), 0);
});

test('guided flow: the template picker waits until the user has checked the summary', async () => {
  script = [{ tools: [{ name: 'start_flow', arguments: { product: 'resume' } }, { name: 'update_draft', arguments: { fields: ANSWERS, skip: ['achievements', 'linkedin', 'location'] } }] }, { tools: [{ name: 'show_template_picker' }] }, { text: 'Check the card.' }];
  const first = events((await chat({ message: 'make my resume' })).text);
  assert.deepEqual(cardsOf(first).map((c) => c.type), ['summary_confirm']);
  assert.equal(flowOf(first).step, 'confirm');

  // Next message: "looks good" with a no-op update_draft still reaches the picker
  script = [{ tools: [{ name: 'update_draft', arguments: { fields: {} } }, { name: 'show_template_picker' }] }, { text: 'Pick one.' }];
  const next = events((await chat({ message: 'looks good', flow: flowOf(first) })).text);
  assert.deepEqual(cardsOf(next).map((c) => c.type), ['template_picker']);
});

test('guided flow: an empty follow-up after a tool gets one nudge to ask the next question', async () => {
  script = [{ tools: [{ name: 'start_flow', arguments: { product: 'resume' } }] }, { text: '' }, { text: 'Fresher or experienced?' }];
  const list = events((await chat({ message: 'make my resume' })).text);
  assert.equal(seen.length, 3);
  assert.equal(seen[2].messages.at(-1).role, 'system');
  assert.match(list.filter((e) => e.event === 'delta').map((e) => e.data.text).join(''), /Fresher or experienced\?/);
});

test('guided flow: tapping "Fresher" saves the answer even when the model changes nothing', async () => {
  const user = await newUser();
  script = [{ tools: [{ name: 'start_flow', arguments: { product: 'resume' } }, { name: 'show_choices', arguments: { question: 'Fresher or experienced?', options: ['Fresher', 'Experienced'], field: 'level' } }] }, { text: 'Pick one.' }];
  const conversationId = events((await chat({ message: 'make my resume' }, { token: user.token })).text)[0].data.conversationId;

  // The model repeats the answer in update_draft: no change on top of the tap, still saved
  script = [{ tools: [{ name: 'update_draft', arguments: { fields: { level: 'fresher' } } }] }, { text: 'Your name, email and phone?' }];
  const tapped = events((await action({ conversationId, action: 'choose', value: { field: 'level', label: 'Fresher' } }, { token: user.token })).text);
  assert.equal(flowOf(tapped).data.level, 'fresher');
  const saved = await call(`/api/leo-chat/conversations/${conversationId}`, { token: user.token });
  assert.equal(saved.body.data.flow.data.level, 'fresher');
  assert.ok(!saved.body.data.flow.missing.includes('level'));
});

test('guided flow: flow tool notes are not replayed to the model as history', async () => {
  const user = await newUser();
  script = [{ tools: [{ name: 'start_flow', arguments: { product: 'resume' } }] }, { text: 'Fresher or experienced?' }];
  const conversationId = events((await chat({ message: 'make my resume' }, { token: user.token })).text)[0].data.conversationId;
  await chat({ message: 'Fresher', conversationId }, { token: user.token });
  const history = seen.at(-1).messages.slice(1, -1).map((m) => m.content).join('\n');
  assert.match(history, /Fresher or experienced\?/);
  assert.doesNotMatch(history, /Tool results shown to the user/);
});

test('guided flow: a bad tap is rejected before anything streams', async () => {
  const res = await action({ action: 'template', value: { templateId: '../../etc' }, flow: { product: 'resume', step: 'template', data: ANSWERS } });
  assert.equal(res.status, 400);
  assert.equal((await action({ action: 'launch-missiles' })).status, 400);
});

test('guided flow: deleting the chat wipes the draft', async () => {
  const user = await newUser();
  const conversationId = await fillDraft(user);
  await call(`/api/leo-chat/conversations/${conversationId}`, { method: 'DELETE', token: user.token });
  const { LeoConversation } = await import('../../src/leo/models.js');
  const row = await LeoConversation.findById(conversationId).lean();
  assert.equal(row.flow, null);
});

test('the leo-flows switch removes the flow tools and closes card taps', async () => {
  const settings = await import('../../src/admin/settings.js');
  const { features } = await settings.getSettings();
  await saveSettingGroup('features', { ...features, 'leo-flows': false }, 'test');
  try {
    await chat({ message: 'make a resume' });
    assert.ok(!seen[0].toolNames.includes('start_flow'));
    assert.doesNotMatch(seen[0].messages[0].content, /Guided flows/);
    const tap = await action({ action: 'confirm' });
    assert.equal(tap.status, 503);
    assert.equal(tap.body.code, 'FEATURE_DISABLED');
  } finally {
    await saveSettingGroup('features', { ...features, 'leo-flows': true }, 'test');
  }
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

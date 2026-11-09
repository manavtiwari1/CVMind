import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Leo Agent Mode, Phases 2 to 5: chat tools, mock interview, job hunt, background runs, reminders.
let mongod;
let server;
let base;
let mongoose;
let signToken;
let createUser;
let setLeoStream;
let missions;
let worker;
let careerTools;
let jobHunt;
let reminders;
let profiles;
let models;
let FinderJob;
let FeatureUse;

let script = [];
let aiCalls = [];

const RESUME = 'Priya Sharma. B.Tech CSE 2026. Built a React dashboard used by 300 students. Skills: React, Node.js, SQL.';
const LINKEDIN = 'Priya Sharma\nContact\nlinkedin.com/in/priya\nTop Skills\nReact\nExperience\nIntern at Acme for a summer, building dashboards.';
const APPLY_URL = 'https://boards.greenhouse.io/acme/jobs/1234';

const tailored = { matchScore: 80, keyTailoringInsights: ['Moved React to the top'], matchedSkills: ['React'], missingSkillsRecommended: ['AWS'], tailoredData: { summary: 'React developer.', personalInfo: { fullName: 'Priya' }, workExperiences: [] } };
const letter = { name: 'Priya', title: 'Dev', email: 'p@e.in', phone: '', location: '', linkedin: '', jobTitle: 'React Dev', company: 'Acme', recipient: 'Hiring Manager', greeting: 'Dear Team,', paragraphs: ['I built things.', 'I would like to help.'], closing: 'Best,' };

const count = (name, value) => (...args) => { aiCalls.push({ name, args }); return Promise.resolve(value); };

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_leo_phases_test');
  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken } = await import('../../src/services/authToken.js'));
  ({ createUser } = await import('../../src/db.js'));
  const settings = await import('../../src/admin/settings.js');
  models = await import('../../src/leo/models.js');
  ({ setLeoStream } = await import('../../src/leo/service.js'));
  missions = await import('../../src/leo/missions/index.js');
  worker = await import('../../src/leo/missions/worker.js');
  careerTools = await import('../../src/leo/careerTools.js');
  jobHunt = await import('../../src/leo/missions/jobHunt.js');
  reminders = await import('../../src/leo/reminders.js');
  profiles = await import('../../src/leo/careerProfile.js');
  ({ FinderJob } = await import('../../src/jobFinder/models.js'));
  ({ FeatureUse } = await import('../../src/billing/models.js'));
  const { createLeoChatRouter } = await import('../../src/routes/leoChat.js');

  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));
  await models.LeoMission.init();

  setLeoStream(async function* () {
    const next = script.shift();
    if (next?.tools) {
      yield { type: 'done', model: 'fake', finishReason: 'tool_calls', usage: { tokensIn: 10, tokensOut: 1 }, toolCalls: next.tools.map((t, i) => ({ id: `c${i}`, name: t.name, arguments: JSON.stringify(t.arguments || {}) })) };
      return;
    }
    yield { type: 'text', delta: next?.text ?? 'ok' };
    yield { type: 'done', model: 'fake', finishReason: 'stop', usage: { tokensIn: 10, tokensOut: 1 }, toolCalls: [] };
  });
  profiles.setProfileParser(async () => ({ personalInfo: { fullName: 'Priya Sharma', jobTitle: 'Developer' }, skills: ['React'] }));
  careerTools.setCareerAi({
    bio: count('bio', { headlines: ['React developer'], aboutSummaries: ['I build.'], bannerIdeas: [{ text: 'Build' }], hashtags: ['#react'] }),
    proofread: count('proofread', { correctedText: 'Fixed text of the resume.', score: 70, summary: 'Better.', changes: [{ original: 'teh', corrected: 'the' }] }),
    negotiate: count('negotiate', { email: { subject: 'Offer', body: 'Hello' }, callScript: 'Say this', talkingPoints: ['One'], avoid: [], warnings: [] }),
    linkedinAudit: count('audit', { score: 60, summary: 'Fine.', headline: { suggestions: ['H'] }, about: { improvedText: 'A' }, experience: { tips: [] }, skillsAndKeywords: { missing: [] }, generalTips: [] }),
    interviewPlan: count('plan', { questions: [{ question: 'Why React?', keyPoints: ['a'] }, { question: 'Tell me about a bug.', keyPoints: [] }] }),
    interviewAnswer: count('answer', { score: 8, verdict: 'Good', strengths: ['Clear'], missing: [], improvedAnswer: 'Better' }),
    interviewReport: count('report', { summary: 'Solid.', strengths: ['Clear'], weakAreas: ['Depth'], practiceNext: ['System design'] })
  });
  jobHunt.setJobHuntDeps({
    tailor: count('tailor', tailored),
    letter: count('letter', letter),
    referral: count('referral', { connectionRequest: 'Hi', referralPitch: 'Could you refer me?' }),
    sources: { jsearch: async () => ({ jobs: [] }), adzuna: async () => ({ jobs: [] }), recruiters: async () => [], boards: async () => boardJobs }
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
  missions.setMissionTools(null);
  careerTools.setCareerAi(null);
  jobHunt.setJobHuntDeps(null);
  profiles.setProfileParser(null);
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

let boardJobs = [];
beforeEach(() => {
  script = [];
  aiCalls = [];
  boardJobs = [];
  missions.setMissionTools(null);
});

const connectAll = async (id) => {
  const { CONNECTORS, setConnected } = await import('../../src/leo/connectors.js');
  await setConnected(id, CONNECTORS.map((c) => c.id));
};

let userCount = 0;
async function newUser() {
  userCount += 1;
  const email = `phase${userCount}@example.com`;
  const user = await createUser({ email, name: `Priya ${userCount}`, password: 'hash', emailVerified: true });
  const id = String(user._id || user.id);
  await connectAll(id);
  return { id, email, token: signToken({ sub: id, kind: 'user', email }) };
}

async function call(path, { method = 'GET', token, body, signal } = {}) {
  const res = await fetch(`${base}${path}`, { method, signal, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* event stream */ }
  return { status: res.status, body: json, text };
}

const events = (text) => text.split('\n\n').filter((b) => b.startsWith('event:')).map((b) => {
  const [e, d] = b.split('\n');
  return { event: e.slice(7), data: JSON.parse(d.slice(6)) };
});
const lastMission = (text) => events(text).filter((e) => e.event === 'mission').at(-1).data.mission;
const cardsOf = (res) => events(res.text).filter((e) => e.event === 'card').map((e) => e.data.card);
const chat = (user, message, extra = {}) => call('/api/leo-chat/chat', { method: 'POST', token: user.token, body: { message, ...extra } });

async function useTool(user, name, args, extra) {
  script = [{ tools: [{ name, arguments: args }] }, { text: 'Done.' }];
  return chat(user, 'please', extra);
}

const go = (user, id, verb, body = {}) => call(`/api/leo-chat/missions/${id}/${verb}`, { method: 'POST', token: user.token, body });

async function seedJob(key = 'gh:acme:1234', applyUrl = APPLY_URL) {
  const job = { jobKey: key, source: 'greenhouse', title: 'React Developer', company: 'Acme', location: 'Bangalore', description: 'Build with React and SQL.', applyUrl, postedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) };
  await FinderJob.updateOne({ jobKey: key }, { $set: job }, { upsert: true });
  return job;
}

test('a writing tool returns a finished card and saves to My Documents', async () => {
  const user = await newUser();
  const [card] = cardsOf(await useTool(user, 'write_linkedin_bio', { job_title: 'React Developer' }));
  assert.equal(card.type, 'writing');
  assert.equal(card.blocks.find((b) => b.title === 'Headlines').text, 'React developer');
  const { getUserWorks } = await import('../../src/db.js');
  assert.ok((await getUserWorks(user.id)).some((w) => w.type === 'linkedin-bio'));
});

test('the writing tools are only offered and run for signed-in users', async () => {
  script = [{ tools: [{ name: 'write_linkedin_bio', arguments: { job_title: 'Dev' } }] }, { text: 'x' }];
  const res = await call('/api/leo-chat/chat', { method: 'POST', body: { message: 'bio' } });
  assert.equal(cardsOf(res)[0].action, 'signin');
  assert.equal(aiCalls.length, 0);
});

test('a corrected resume can be made the saved resume', async () => {
  const user = await newUser();
  const card = cardsOf(await useTool(user, 'proofread_resume', {}, { resume: { name: 'cv.pdf', text: RESUME } })).find((c) => c.type === 'writing');
  const version = card.blocks.find((b) => b.title === 'Corrected version');
  assert.equal(version.saveAsResume, true);
  assert.equal((await call('/api/leo-chat/profile/resume', { method: 'PUT', token: user.token, body: { resume: { name: 'Improved', text: 'Corrected resume text that is long enough to keep around.' } } })).status, 200);
  assert.equal((await models.CareerProfile.findOne({ userId: user.id }).lean()).masterResumeName, 'Improved');
});

test('offer negotiation spends the weekly free use', async () => {
  const user = await newUser();
  await FeatureUse.create({ email: user.email, feature: 'negotiation' });
  const [card] = cardsOf(await useTool(user, 'negotiate_offer', { company: 'Acme', role: 'Dev', fixed: '10 LPA' }));
  assert.equal(card.action, 'upgrade');
  assert.equal(aiCalls.length, 0);
});

test('a LinkedIn PDF is audited and does not replace the saved resume', async () => {
  const user = await newUser();
  await chat(user, 'hi', { resume: { name: 'cv.pdf', text: RESUME } });
  const res = await useTool(user, 'audit_linkedin', {}, { resume: { name: 'Profile.pdf', text: LINKEDIN } });
  assert.equal(cardsOf(res).find((c) => c.type === 'writing').score, 60);
  assert.equal((await models.CareerProfile.findOne({ userId: user.id }).lean()).masterResumeName, 'cv.pdf');
});

test('the audit asks for the LinkedIn PDF rather than reading the saved resume', async () => {
  const user = await newUser();
  await chat(user, 'hi', { resume: { name: 'cv.pdf', text: RESUME } });
  const [card] = cardsOf(await useTool(user, 'audit_linkedin', {}));
  assert.equal(card.action, 'attach');
  assert.equal(aiCalls.length, 0);
});

test('a mock interview takes answers one by one, then gives a report', async () => {
  const user = await newUser();
  const first = await useTool(user, 'start_mock_interview', { role: 'React Developer' });
  assert.match(cardsOf(first)[0].blocks[0].text, /Why React/);
  const { conversationId } = events(first.text)[0].data;

  const second = await useTool(user, 'answer_mock_interview', { answer: 'Because of components.' }, { conversationId });
  assert.ok(cardsOf(second)[0].blocks.some((b) => /Tell me about a bug/.test(b.text)));

  const last = await useTool(user, 'answer_mock_interview', { answer: 'A race condition.' }, { conversationId });
  const report = cardsOf(last)[0];
  assert.equal(report.score, 80);
  assert.ok(report.blocks.some((b) => b.title === 'Practise next'));
  assert.equal((await models.LeoConversation.findById(conversationId).lean()).mock, null);
  assert.equal(aiCalls.filter((c) => c.name === 'answer').length, 2);
  assert.equal(await FeatureUse.countDocuments({ email: user.email, feature: 'interview-text' }), 1);
});

async function huntPlan(user) {
  await chat(user, 'hi', { resume: { name: 'cv.pdf', text: RESUME } });
  await new Promise((r) => setTimeout(r, 50));
  const res = await useTool(user, 'plan_job_hunt', { role: 'React Developer', location: 'Bangalore' });
  return cardsOf(res).find((c) => c.type === 'mission').id;
}

test('a job hunt ranks real jobs, waits for picks, then prepares a full pack', async () => {
  const user = await newUser();
  boardJobs = [await seedJob()];
  const id = await huntPlan(user);

  const ranked = lastMission((await go(user, id, 'start')).text);
  assert.equal(ranked.status, 'waiting_review');
  const [step] = ranked.steps;
  assert.equal(step.card.jobs[0].jobKey, 'gh:acme:1234');
  assert.equal(step.card.maxPicks, 1);
  assert.equal(aiCalls.length, 0);

  // Only jobs from the list, and no more than the plan allows
  assert.equal((await go(user, id, 'approve', { stepId: step.id, picks: [] })).status, 400);
  assert.equal((await go(user, id, 'approve', { stepId: step.id, picks: ['gh:other:9'] })).status, 400);
  assert.equal((await models.LeoMission.findById(id).lean()).status, 'waiting_review');

  const done = lastMission((await go(user, id, 'approve', { stepId: step.id, picks: ['gh:acme:1234'] })).text);
  assert.equal(done.status, 'done');
  const pack = done.steps.at(-1).card;
  assert.equal(pack.type, 'apply_pack');
  assert.deepEqual(pack.changes, ['Moved React to the top']);
  assert.equal(pack.letter.greeting, 'Dear Team,');
  assert.ok(pack.tailor.data);
  assert.equal(pack.referral.referralPitch, 'Could you refer me?');
  assert.equal(await FeatureUse.countDocuments({ email: user.email, feature: 'tailor' }), 1);
  assert.equal(await FeatureUse.countDocuments({ email: user.email, feature: 'cover-letter' }), 1);
});

test('a job hunt with no results finishes instead of waiting', async () => {
  const user = await newUser();
  const id = await huntPlan(user);
  const mission = lastMission((await go(user, id, 'start')).text);
  assert.equal(mission.status, 'done');
  assert.equal(mission.steps[0].card.jobs.length, 0);
});

test('a pack past the free limits is refused before any AI runs', async () => {
  const user = await newUser();
  boardJobs = [await seedJob('gh:acme:55', 'https://boards.greenhouse.io/acme/jobs/55')];
  await FeatureUse.create({ email: user.email, feature: 'cover-letter' });
  const id = await huntPlan(user);
  const ranked = lastMission((await go(user, id, 'start')).text);
  const mission = lastMission((await go(user, id, 'approve', { stepId: ranked.steps[0].id, picks: ['gh:acme:55'] })).text);
  assert.equal(mission.status, 'paused');
  assert.equal(mission.pausedReason, 'blocked');
  assert.equal(aiCalls.filter((c) => ['tailor', 'letter'].includes(c.name)).length, 0);
});

test('the extension finds a pack by its page, and only for its owner', async () => {
  const owner = await newUser();
  const other = await newUser();
  boardJobs = [await seedJob('gh:acme:77', 'https://boards.greenhouse.io/acme/jobs/77')];
  const id = await huntPlan(owner);
  const ranked = lastMission((await go(owner, id, 'start')).text);
  await go(owner, id, 'approve', { stepId: ranked.steps[0].id, picks: ['gh:acme:77'] });

  const pack = await jobHunt.packForUrl(owner.id, 'https://boards.greenhouse.io/acme/jobs/77?utm_source=x');
  assert.equal(pack.job.company, 'Acme');
  assert.match(jobHunt.packLetterText(pack), /Dear Team,\n\nI built things/);
  assert.equal(await jobHunt.packForUrl(other.id, 'https://boards.greenhouse.io/acme/jobs/77'), null);
});

test('the Career Profile can stand in for a parsed resume in autofill and job matching', async () => {
  const user = await newUser();
  await profiles.mergeFacts(user.id, { fullName: 'Priya S', email: 'p@e.in', targetRole: 'Data Analyst', skills: ['SQL'], education: [{ degree: 'BTech', university: 'IIT' }] }, 'chat');
  const auto = profiles.autofillProfile(await profiles.getProfile(user.id));
  assert.equal(auto.contact.name, 'Priya S');
  assert.equal(auto.education[0].institution, 'IIT');
  const { profile, preferences } = await profiles.matchingFor(user.id);
  assert.ok(profile.derived.normalizedSkillSet.length > 0);
  assert.deepEqual(preferences.targetTitles, ['Data Analyst']);
  assert.equal(profiles.autofillProfile(null), null);
});

const twoSteps = [{ tool: 'slow', title: 'Slow', args: {} }, { tool: 'after', title: 'After', args: {} }];
async function planTwo(user) {
  const res = await useTool(user, 'plan_mission', { goal: 'Two', steps: twoSteps });
  return cardsOf(res).find((c) => c.type === 'mission').id;
}
const link = { card: { type: 'link', page: 'pricing', label: 'x', reason: '' }, summary: 'ok' };

test('a mission keeps running after the browser disconnects', async () => {
  const user = await newUser();
  const ran = [];
  let release;
  const gate = new Promise((r) => { release = r; });
  missions.setMissionTools({
    slow: { meta: { risk: 'read' }, run: async () => { ran.push('slow'); await gate; return link; } },
    after: { meta: { risk: 'read' }, run: async () => { ran.push('after'); return link; } }
  });
  const id = await planTwo(user);

  const request = go(user, id, 'start');
  while (!ran.length) await new Promise((r) => setTimeout(r, 10));
  // A second browser listens in while it runs
  const listening = call(`/api/leo-chat/missions/${id}/stream`, { token: user.token });
  await new Promise((r) => setTimeout(r, 50));
  release();
  await request;
  const heard = events((await listening).text);
  assert.equal(heard.at(-1).event, 'done');
  assert.deepEqual(ran, ['slow', 'after']);
  assert.equal((await models.LeoMission.findById(id).lean()).status, 'done');
});

test('closing the connection does not stop the run', async () => {
  const user = await newUser();
  const ran = [];
  let release;
  const gate = new Promise((r) => { release = r; });
  missions.setMissionTools({
    slow: { meta: { risk: 'read' }, run: async () => { ran.push('slow'); await gate; return link; } },
    after: { meta: { risk: 'read' }, run: async () => { ran.push('after'); return link; } }
  });
  const id = await planTwo(user);
  const leaving = new AbortController();
  const request = call(`/api/leo-chat/missions/${id}/start`, { method: 'POST', token: user.token, body: {}, signal: leaving.signal }).catch(() => 'closed');
  while (!ran.length) await new Promise((r) => setTimeout(r, 10));
  leaving.abort();
  assert.equal(await request, 'closed');
  release();
  while ((await models.LeoMission.findById(id).lean()).status === 'running') await new Promise((r) => setTimeout(r, 20));
  assert.equal((await models.LeoMission.findById(id).lean()).status, 'done');
  assert.deepEqual(ran, ['slow', 'after']);
});

test('after a restart the sweep resumes a mission without repeating finished steps', async () => {
  const user = await newUser();
  const ran = [];
  missions.setMissionTools({
    slow: { meta: { risk: 'read' }, run: async () => { ran.push('slow'); return link; } },
    after: { meta: { risk: 'read' }, run: async () => { ran.push('after'); return link; } }
  });
  const id = await planTwo(user);
  const mission = await models.LeoMission.findById(id).lean();
  // As a dead server leaves it: first step done, second in hand, lease run out
  const steps = [{ ...mission.steps[0], status: 'done', card: link.card }, { ...mission.steps[1], status: 'running' }];
  await models.LeoMission.updateOne({ _id: id }, { $set: { status: 'running', active: true, steps, tokenCap: 100000, leaseUntil: new Date(Date.now() - 1000) } });

  const launched = [];
  await worker.leoWorkerTick({ launch: (m) => { const p = worker.launchMission(m); launched.push(p); return p; } });
  await Promise.all(launched);
  assert.deepEqual(ran, ['after']);
  assert.equal((await models.LeoMission.findById(id).lean()).status, 'done');

  // A mission whose lease is alive belongs to a running server
  await models.LeoMission.updateOne({ _id: id }, { $set: { status: 'running', leaseUntil: new Date(Date.now() + 60000) } });
  assert.equal((await missions.reclaimStale()).length, 0);
});

test('reminders are set by asking, can be cancelled and are sent once', async () => {
  const user = await newUser();
  const when = new Date(Date.now() + 3600000).toISOString();
  const [card] = cardsOf(await useTool(user, 'set_reminder', { text: 'Interview at Acme', when }));
  assert.equal(card.type, 'reminders');
  const [second] = cardsOf(await useTool(user, 'set_reminder', { text: 'Second one', when }));
  assert.equal((await call(`/api/leo-chat/reminders/${second.items[0].id}/cancel`, { method: 'POST', token: user.token, body: {} })).status, 200);

  const sent = [];
  const later = new Date(Date.now() + 7200000);
  assert.equal(await reminders.sendDueReminders({ now: later, send: async (m) => sent.push(m) }), 1);
  assert.equal(await reminders.sendDueReminders({ now: later, send: async (m) => sent.push(m) }), 0);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, user.email);

  const past = cardsOf(await useTool(user, 'set_reminder', { text: 'Too late', when: new Date(Date.now() - 1000).toISOString() }));
  assert.equal(past.length, 0);
});

test('a failed reminder email is tried again on the next pass', async () => {
  const user = await newUser();
  const { reminder } = await reminders.createReminder({ userId: user.id, email: user.email, name: 'P', text: 'Hello', when: new Date(Date.now() + 1000) });
  const later = new Date(Date.now() + 5000);
  assert.equal(await reminders.sendDueReminders({ now: later, send: async () => { throw new Error('mail down'); } }), 0);
  assert.equal((await models.LeoReminder.findById(reminder.id).lean()).sentAt, null);
});

test('one user cannot cancel another user\'s reminder', async () => {
  const owner = await newUser();
  const other = await newUser();
  const { reminder } = await reminders.createReminder({ userId: owner.id, email: owner.email, text: 'Mine', when: new Date(Date.now() + 100000) });
  assert.equal((await call(`/api/leo-chat/reminders/${reminder.id}/cancel`, { method: 'POST', token: other.token, body: {} })).status, 404);
});

test('job alerts are turned on by asking, and daily stays a Pro option', async () => {
  const user = await newUser();
  const [on] = cardsOf(await useTool(user, 'set_job_alerts', { enabled: true }));
  assert.match(on.message, /on, weekly/);
  const [daily] = cardsOf(await useTool(user, 'set_job_alerts', { enabled: true, frequency: 'daily' }));
  assert.equal(daily.action, 'upgrade');
  const [off] = cardsOf(await useTool(user, 'set_job_alerts', { enabled: false }));
  assert.match(off.message, /off/);
});

test('an unverified account is asked to verify before a job hunt is planned', async () => {
  const email = 'unverified-hunt@example.com';
  const created = await createUser({ email, name: 'New Person', password: 'hash', emailVerified: false });
  const id = String(created._id || created.id);
  await connectAll(id);
  const user = { id, email, token: signToken({ sub: id, kind: 'user', email }) };
  const [card] = cardsOf(await useTool(user, 'plan_job_hunt', { role: 'Analyst' }));
  assert.equal(card.type, 'locked');
  assert.match(card.message, /verify your email/);
  assert.equal(await models.LeoMission.countDocuments({ userId: id }), 0);
});

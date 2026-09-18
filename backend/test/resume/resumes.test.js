import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import ResumeProfile from '../../src/agent/models/ResumeProfile.js';
import QueueJob from '../../src/agent/models/QueueJob.js';
import ApplicationEvent from '../../src/agent/models/ApplicationEvent.js';
import { createAgentRouter } from '../../src/routes/agent.js';
import { createParseResumeHandler, createEmbedResumeHandler } from '../../src/agent/handlers/parseResume.js';
import { signToken } from '../../src/services/authToken.js';
import { vectorFromStored } from '../../src/agent/resume/embeddings.js';
import { startTestMongo } from '../helpers/mongo.js';

const EXTRACTED = {
  contact: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '', location: 'London', linkedin: '', github: '', portfolio: '' },
  headline: 'Senior Software Engineer',
  summary: 'Engineer building data systems.',
  experience: [
    { company: 'Acme', title: 'Senior Software Engineer', employmentType: 'full_time', startDate: '2020-01', endDate: '', current: true, location: '', skills: ['Node', 'Postgres'], bullets: ['Built billing pipeline', 'Led migration to k8s'] },
    { company: 'Beta', title: 'Software Engineer Intern', employmentType: 'internship', startDate: '2019-01', endDate: '2019-12', current: false, location: '', skills: [], bullets: ['Wrote integration tests'] }
  ],
  education: [{ institution: 'UCL', degree: 'BSc Computer Science', degreeLevel: 'bachelor', field: 'Computer Science', endYear: '2019', gpa: '' }],
  skills: [{ name: 'JavaScript', category: 'technical' }, { name: 'JS', category: 'technical' }, { name: 'Docker', category: 'tool' }],
  projects: [],
  certifications: [],
  languages: ['English']
};

const RESUME_TEXT = `Ada Lovelace\nSenior Software Engineer at Acme since 2020.\n${'Built billing pipeline and led migrations. '.repeat(10)}`;

function fakeAiClient() {
  const calls = { generate: 0, embedTexts: [] };
  return {
    calls,
    models: {
      generateContent: async () => { calls.generate++; return { text: JSON.stringify(EXTRACTED) }; },
      embedContent: async ({ contents }) => {
        calls.embedTexts.push(...contents);
        return { embeddings: contents.map((text) => ({ values: [text.length, 1] })) };
      }
    }
  };
}

const works = new Map([
  ['work-a', { _id: 'work-a', userId: 'user-a', type: 'resume', title: 'Builder resume', htmlContent: `<h1>Ada</h1><p>${RESUME_TEXT}</p>`, updatedAt: new Date('2026-09-01') }],
  ['work-b', { _id: 'work-b', userId: 'user-b', type: 'resume', title: 'Not yours', htmlContent: '<p>Other</p>', updatedAt: new Date('2026-09-01') }]
]);
const loadWork = async (id) => works.get(id) || null;

let mongo;
let server;
let baseUrl;
const originalUri = process.env.MONGODB_URI;
const tokenA = signToken({ sub: 'user-a', kind: 'user', email: 'a@example.com' });
const tokenB = signToken({ sub: 'user-b', kind: 'user', email: 'b@example.com' });

before(async () => {
  mongo = await startTestMongo([ResumeProfile, QueueJob, ApplicationEvent]);
  // requireMongo only checks that a URI is configured; the in-memory connection is already open
  process.env.MONGODB_URI = 'mongodb://in-memory-test';
  const app = express();
  app.use(express.json());
  app.use('/api/agent', createAgentRouter({ loadWork }));
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

async function api(path, { token = tokenA, method = 'GET', json, form } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: form || (json ? JSON.stringify(json) : undefined) });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.text() };
}

function resumeForm(text = RESUME_TEXT, name = 'ada.txt') {
  const form = new FormData();
  form.append('resume', new Blob([text], { type: 'text/plain' }), name);
  return form;
}

const jobFor = (resumeProfileId, extra = {}) => ({ _id: new mongoose.Types.ObjectId(), attempts: 1, maxAttempts: 5, payload: { resumeProfileId, ...extra } });

test('resume routes require a signed-in user', async () => {
  assert.equal((await api('/resumes', { token: null })).status, 401);
});

test('upload stores the file, queues parsing and dedupes identical uploads', async () => {
  const first = await api('/resumes/upload', { method: 'POST', form: resumeForm() });
  assert.equal(first.status, 202);
  assert.equal(first.body.data.status, 'queued');
  assert.equal(first.body.data.isDefault, true);
  assert.equal(first.body.data.rawText, undefined);

  const job = await QueueJob.findOne({ type: 'resume.parse' }).lean();
  assert.equal(job.payload.resumeProfileId, first.body.data.id);
  assert.equal(job.userId, 'user-a');

  const again = await api('/resumes/upload', { method: 'POST', form: resumeForm() });
  assert.equal(again.status, 200);
  assert.equal(again.body.deduped, true);
  assert.equal(again.body.data.id, first.body.data.id);

  const file = await api(`/resumes/${first.body.data.id}/file`);
  assert.equal(file.body, RESUME_TEXT);
});

test('upload rejects unsupported file types', async () => {
  const form = new FormData();
  form.append('resume', new Blob(['x'], { type: 'image/png' }), 'photo.png');
  assert.equal((await api('/resumes/upload', { method: 'POST', form })).status, 400);
});

test('parse handler builds a ready profile with derived fields and bullet embeddings', async () => {
  const { body } = await api('/resumes/upload', { method: 'POST', form: resumeForm() });
  const client = fakeAiClient();
  await createParseResumeHandler({ ai: { client } })(jobFor(body.data.id));

  const { body: detail } = await api(`/resumes/${body.data.id}`);
  const profile = detail.data;
  assert.equal(profile.status, 'ready');
  assert.equal(profile.structured.contact.name, 'Ada Lovelace');
  assert.deepEqual(profile.structured.experience[0].bullets.map((b) => b.id), ['exp0-b0', 'exp0-b1']);
  assert.deepEqual(profile.structured.skills.map((s) => s.normalized), ['javascript', 'docker']);
  assert.ok(profile.derived.totalYearsExperience >= 6);
  assert.equal(profile.derived.seniority, 'senior');
  assert.equal(profile.embeddedBullets, 4);
  assert.equal(client.calls.embedTexts.length, 4);

  const stored = await ResumeProfile.findById(body.data.id).select('+rawText').lean();
  assert.equal(stored.rawText, RESUME_TEXT.trim());
  const vector = vectorFromStored(stored.embeddings.bullets[0].vector);
  assert.ok(Math.abs(vector[0] ** 2 + vector[1] ** 2 - 1) < 1e-5);

  const events = await ApplicationEvent.find({ resumeProfileId: stored._id }).lean();
  assert.deepEqual(events.map((e) => e.type).sort(), ['resume.parsed', 'resume.uploaded']);
});

test('users cannot see or modify each other\'s resumes', async () => {
  const { body } = await api('/resumes/upload', { method: 'POST', form: resumeForm() });
  assert.equal((await api(`/resumes/${body.data.id}`, { token: tokenB })).status, 404);
  assert.equal((await api(`/resumes/${body.data.id}`, { token: tokenB, method: 'DELETE' })).status, 404);
  assert.equal((await api('/resumes', { token: tokenB })).body.data.length, 0);
  assert.equal((await api('/resumes/not-an-id')).status, 404);
});

test('editing re-embeds only changed bullets and protects edits from re-parsing', async () => {
  const { body } = await api('/resumes/upload', { method: 'POST', form: resumeForm() });
  await createParseResumeHandler({ ai: { client: fakeAiClient() } })(jobFor(body.data.id));

  const edited = structuredClone(EXTRACTED);
  edited.experience[0].bullets[1] = 'Led migration of 40 services to Kubernetes';
  const patch = await api(`/resumes/${body.data.id}`, { method: 'PATCH', json: { structured: edited } });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.data.userEdited, true);
  assert.ok(await QueueJob.findOne({ type: 'resume.embed' }));

  const client = fakeAiClient();
  await createEmbedResumeHandler({ ai: { client } })(jobFor(body.data.id));
  assert.deepEqual(client.calls.embedTexts, ['Led migration of 40 services to Kubernetes']);

  // A queued re-parse without force must not overwrite the edit
  await createParseResumeHandler({ ai: { client: fakeAiClient() } })(jobFor(body.data.id));
  assert.equal((await ResumeProfile.findById(body.data.id).lean()).structured.experience[0].bullets[1].text, 'Led migration of 40 services to Kubernetes');

  assert.equal((await api(`/resumes/${body.data.id}/reparse`, { method: 'POST', json: {} })).body.code, 'USER_EDITED');
  assert.equal((await api(`/resumes/${body.data.id}/reparse`, { method: 'POST', json: { force: true } })).status, 202);

  const invalid = await api(`/resumes/${body.data.id}`, { method: 'PATCH', json: { structured: { contact: {} } } });
  assert.equal(invalid.status, 409);
});

test('importing a CVMind resume checks ownership, parses its HTML and reports staleness', async () => {
  assert.equal((await api('/resumes/from-work', { method: 'POST', json: { workId: 'work-b' } })).status, 404);

  const imported = await api('/resumes/from-work', { method: 'POST', json: { workId: 'work-a' } });
  assert.equal(imported.status, 202);
  assert.equal(imported.body.data.source, 'cvmind');

  await createParseResumeHandler({ ai: { client: fakeAiClient() }, loadWork })(jobFor(imported.body.data.id));
  const stored = await ResumeProfile.findById(imported.body.data.id).select('+rawText').lean();
  assert.equal(stored.status, 'ready');
  assert.match(stored.rawText, /^Ada\n/);

  assert.equal((await api('/resumes/from-work', { method: 'POST', json: { workId: 'work-a' } })).body.deduped, true);
  let list = await api('/resumes');
  assert.equal(list.body.data[0].outOfDate, false);

  works.set('work-a', { ...works.get('work-a'), htmlContent: '<p>Updated</p>', updatedAt: new Date('2026-09-10') });
  list = await api('/resumes');
  assert.equal(list.body.data[0].outOfDate, true);
  assert.equal((await api('/resumes/from-work', { method: 'POST', json: { workId: 'work-a' } })).status, 202);
});

test('parse failures that cannot be retried mark the profile failed', async () => {
  const { body } = await api('/resumes/upload', { method: 'POST', form: resumeForm('too short') });
  await assert.rejects(createParseResumeHandler({ ai: { client: fakeAiClient() } })(jobFor(body.data.id)), /Could not read any text/);
  const stored = await ResumeProfile.findById(body.data.id).lean();
  assert.equal(stored.status, 'failed');
  assert.match(stored.parseError, /Could not read/);
});

test('default switching and deletion keep exactly one default resume', async () => {
  const first = (await api('/resumes/upload', { method: 'POST', form: resumeForm('first resume text', 'a.txt') })).body.data;
  const second = (await api('/resumes/upload', { method: 'POST', form: resumeForm('second resume text', 'b.txt') })).body.data;
  assert.equal(second.isDefault, false);

  await api(`/resumes/${second.id}/default`, { method: 'POST' });
  assert.equal((await ResumeProfile.findById(first.id).lean()).isDefault, false);

  assert.equal((await api(`/resumes/${second.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await ResumeProfile.findById(first.id).lean()).isDefault, true);
  assert.equal((await api(`/resumes/${second.id}/file`)).status, 404);
});

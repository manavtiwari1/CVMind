import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import ResumeProfile from '../../src/agent/models/ResumeProfile.js';
import QueueJob from '../../src/agent/models/QueueJob.js';
import ApplicationEvent from '../../src/agent/models/ApplicationEvent.js';
import JobPosting from '../../src/agent/models/JobPosting.js';
import AgentApplication from '../../src/agent/models/AgentApplication.js';
import Preferences from '../../src/agent/models/Preferences.js';
import RateBucket from '../../src/agent/models/RateBucket.js';
import ExtensionDevice from '../../src/agent/models/ExtensionDevice.js';
import PairCode from '../../src/agent/models/PairCode.js';
import { createAgentRouter } from '../../src/routes/agent.js';
import { buildProfileData } from '../../src/agent/resume/derive.js';
import { embedProfileBullets } from '../../src/agent/resume/embeddings.js';
import { signToken } from '../../src/services/authToken.js';
import { startTestMongo } from './mongo.js';

export const AGENT_MODELS = [ResumeProfile, QueueJob, ApplicationEvent, JobPosting, AgentApplication, Preferences, RateBucket, ExtensionDevice, PairCode];

export const tokenA = signToken({ sub: 'user-a', kind: 'user', email: 'a@example.com' });
export const tokenB = signToken({ sub: 'user-b', kind: 'user', email: 'b@example.com' });

// Toy embeddings: one axis per topic, so related texts get cosine 1 and unrelated ones stay low
const AXES = [/payment|billing|checkout/i, /kubernetes|k8s|migrat|deploy/i, /test|quality/i, /design|figma/i];
export const fakeVector = (text) => [...AXES.map((axis) => (axis.test(text) ? 1 : 0)), 0.2];

export const JOB_EXTRACTED = {
  title: 'Senior Backend Engineer', company: 'Acme Pay', location: 'Bengaluru, India', workMode: 'hybrid', employmentType: 'full_time',
  seniority: 'senior', industry: 'Fintech', salary: { min: 0, max: 0, currency: '', period: 'unknown' },
  mustHaveSkills: ['Node.js', 'PostgreSQL', 'Kubernetes'], niceToHaveSkills: ['Go'], minYearsExperience: 5,
  educationLevel: 'bachelor', educationFields: ['Computer Science'], equivalentExperienceAccepted: false, sponsorshipAvailable: 'unknown',
  responsibilities: [{ text: 'Own the payments checkout service', core: true }, { text: 'Run deployments on Kubernetes', core: false }]
};

export const RESUME = {
  contact: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '', location: 'Bengaluru', linkedin: '', github: '', portfolio: '' },
  headline: 'Senior Software Engineer',
  summary: 'Engineer building data systems.',
  experience: [{ company: 'Acme', title: 'Senior Software Engineer', employmentType: 'full_time', startDate: '2020-01', endDate: '', current: true, location: '', skills: ['Node', 'Postgres'], bullets: ['Built billing pipeline for payments', 'Led migration to Kubernetes'] }],
  education: [{ institution: 'IIT', degree: 'B.Tech CSE', degreeLevel: 'bachelor', field: 'Computer Science', endYear: '2019', gpa: '' }],
  skills: [{ name: 'JavaScript', category: 'technical' }, { name: 'Docker', category: 'tool' }],
  projects: [], certifications: [], languages: []
};

// Includes three unsupported changes the guard must undo: an unknown bullet, an invented "40", a new skill
export const TAILORED_OUTPUT = {
  headline: 'Senior Backend Engineer',
  summary: 'Engineer building payment systems.',
  experience: [{
    roleId: 'exp0',
    bullets: [
      { sourceBulletId: 'exp0-b0', text: 'Built the billing pipeline behind payments checkout' },
      { sourceBulletId: 'exp0-b1', text: 'Led migration of 40 services to Kubernetes' },
      { sourceBulletId: 'exp9-b0', text: 'Invented achievement' }
    ]
  }],
  projects: [],
  skillOrder: ['Node', 'Postgres', 'Rust'],
  changes: ['Moved payments work to the top']
};

export const COVER_LETTER_OUTPUT = {
  subject: 'Application for Senior Backend Engineer',
  body: [
    'Dear Acme Pay team,',
    'I am excited to apply for the Senior Backend Engineer role. '.repeat(8).trim(),
    'At Acme I built the billing pipeline behind payments checkout and led our migration to Kubernetes, work that maps closely to owning your checkout service. '.repeat(5).trim(),
    'Thank you for considering my application. I would welcome the chance to discuss the role.',
    'Ada Lovelace'
  ].join('\n\n')
};

export const DESCRIPTION = `Senior Backend Engineer at Acme Pay (Bengaluru, hybrid). ${'You will own the payments checkout service and run deployments on Kubernetes. '.repeat(3)}Requirements: 5+ years, Node.js, PostgreSQL, Kubernetes. Nice to have: Go.`;

// Answers by the schema requested, so one fake serves job parsing, tailoring and cover letters
export function fakeAi({ job = JOB_EXTRACTED, tailored = TAILORED_OUTPUT, letter = COVER_LETTER_OUTPUT, fail = {} } = {}) {
  return {
    models: {
      generateContent: async ({ config }) => {
        const keys = Object.keys(config?.responseJsonSchema?.properties || {});
        const kind = keys.includes('mustHaveSkills') ? 'job' : keys.includes('skillOrder') ? 'tailor' : 'letter';
        if (fail[kind]) throw fail[kind];
        return { text: JSON.stringify({ job, tailor: tailored, letter }[kind]) };
      },
      embedContent: async ({ contents }) => ({ embeddings: contents.map((text) => ({ values: fakeVector(text) })) })
    }
  };
}

export const jobRun = (payload) => ({ _id: new mongoose.Types.ObjectId(), attempts: 1, maxAttempts: 5, payload });

export async function createReadyResume(userId = 'user-a') {
  const { structured, derived } = buildProfileData(RESUME);
  const { embeddedCount, ...embeddings } = await embedProfileBullets(structured, null, { client: fakeAi() });
  return ResumeProfile.create({ userId, label: 'Main', source: 'upload', status: 'ready', isDefault: true, structured, derived, embeddings });
}

// Runs the newest queued job of a type through a handler, then marks it done like the real runner would
export async function runQueued(type, handler) {
  const queued = await QueueJob.findOne({ type, status: 'queued' }).sort({ createdAt: -1, _id: -1 }).lean();
  assert.ok(queued, `expected a queued ${type} job`);
  await handler(jobRun(queued.payload));
  await QueueJob.updateOne({ _id: queued._id }, { $set: { status: 'succeeded' }, $unset: { activeDedupeKey: '' } });
  return queued;
}

export async function startAgentTestApp(models = AGENT_MODELS, routerOptions = {}) {
  const mongo = await startTestMongo(models);
  const originalUri = process.env.MONGODB_URI;
  // requireMongo only checks that a URI is configured; the in-memory connection is already open
  process.env.MONGODB_URI = 'mongodb://in-memory-test';

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/agent', createAgentRouter({ loadWork: async () => null, loadLatestResumeWork: async () => null, ...routerOptions }));
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/agent`;

  async function api(path, { token = tokenA, method = 'GET', json, rawToken } = {}) {
    const bearer = rawToken ?? token;
    const headers = bearer ? { Authorization: `Bearer ${bearer}` } : {};
    if (json) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${baseUrl}${path}`, { method, headers, body: json ? JSON.stringify(json) : undefined });
    const type = res.headers.get('content-type') || '';
    return { status: res.status, headers: res.headers, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
  }

  return {
    api,
    reset: () => mongo.reset(),
    stop: async () => {
      server.close();
      await mongo.stop();
      if (originalUri === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = originalUri;
    }
  };
}

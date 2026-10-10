import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Growth features: "Your plan" checklist, ATS score history, job alerts, referral requests,
// offer negotiation, resume share links and invite-a-friend credits.

let mongod;
let server;
let base;
let mongoose;
let signToken;
let models;
let growth;
let alerts;
let FinderJob;
let JobApplyLog;
let ResumeProfile;
let Subscription;
let saveScan;
let realFetch;

const stub = { boards: [], recruiters: [], outreach: 0, negotiate: 0 };

const job = (overrides) => ({
  jobKey: `gh:acme:${Math.random().toString(16).slice(2, 10)}`,
  source: 'greenhouse',
  title: 'Frontend Developer',
  company: 'Acme',
  location: 'Bengaluru, India',
  remote: false,
  postedAt: new Date(),
  applyUrl: 'https://acme.example.com/apply',
  description: 'React, JavaScript and TypeScript',
  ...overrides
});

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_growth_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.JSEARCH_API_KEY = '';
  process.env.ADZUNA_APP_ID = '';
  process.env.ADZUNA_APP_KEY = '';
  process.env.CRON_SECRET = 'cron-secret-for-tests';
  realFetch = globalThis.fetch;

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken } = await import('../../src/services/authToken.js'));
  ({ saveScan } = await import('../../src/db.js'));
  const { createJobFinderRouter } = await import('../../src/routes/jobFinder.js');
  const { createGrowthRouter } = await import('../../src/routes/growth.js');
  models = await import('../../src/growth/models.js');
  growth = await import('../../src/growth/referrals.js');
  alerts = await import('../../src/growth/alerts.js');
  ({ FinderJob, JobApplyLog } = await import('../../src/jobFinder/models.js'));
  ({ Subscription } = await import('../../src/billing/models.js'));
  ResumeProfile = (await import('@cvmind/auto-apply-agent/models/ResumeProfile.js')).default;
  const { installSessionValidator } = await import('../../src/admin/sessions.js');
  installSessionValidator();
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  const remember = async (list) => {
    for (const j of list) {
      await FinderJob.updateOne({ jobKey: j.jobKey }, { $set: { ...j, expiresAt: new Date(Date.now() + 86400000) } }, { upsert: true });
    }
    return list;
  };
  const sources = { boards: async () => remember(stub.boards), recruiters: async () => remember(stub.recruiters) };
  const outreach = async ({ companyName }) => {
    stub.outreach += 1;
    return { connectionRequest: `Hi, I would love to join ${companyName}.`, referralPitch: 'Could you refer me?', recruiterDM: 'Hello', inMailSubject: 'Frontend role', followUp: 'Following up' };
  };
  const negotiate = async ({ offer }) => {
    stub.negotiate += 1;
    return { email: { subject: `Offer from ${offer.company}`, body: 'Thank you for the offer.' }, callScript: ['Thank them'], talkingPoints: ['Competing offer'], avoid: ['Ultimatums'], warnings: [] };
  };

  const app = express();
  app.use(express.json());
  app.use('/api/job-finder', createJobFinderRouter({ sources, outreach }));
  app.use('/', createGrowthRouter({ sources, negotiate }));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

async function call(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await realFetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

async function account(email, { pro = false, verified = true, resume = true, createdAt = new Date() } = {}) {
  const user = await mongoose.model('User').create({ email, name: 'Manav Tiwari', password: 'x', emailVerified: verified, createdAt });
  if (pro) {
    await Subscription.create({ email, plan: 'monthly', startsAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 30 * 86400000), source: 'admin' });
  }
  if (resume) {
    await ResumeProfile.create({
      userId: String(user._id), label: 'Resume', isDefault: true, source: 'upload', status: 'ready',
      structured: { experience: [{ company: 'X', title: 'Frontend Developer', startDate: '2023-01', current: true }], skills: ['react', 'javascript', 'typescript'].map((name) => ({ name, normalized: name })) },
      derived: { totalYearsExperience: 2, seniority: 'junior', normalizedSkillSet: ['react', 'javascript', 'typescript'] }
    });
    const { savePreferences } = await import('@cvmind/auto-apply-agent/preferences/service.js');
    await savePreferences(String(user._id), { targetTitles: ['Frontend Developer'], locations: ['bengaluru'] });
  }
  return { id: String(user._id), user, token: signToken({ sub: String(user._id), kind: 'user', email }) };
}

// ── "Your plan" checklist ──────────────────────────────────────────────────

test('the plan marks steps done from saved results and can be hidden', async () => {
  const me = await account('plan@example.com', { resume: false });
  let res = await call('/api/user/progress', { token: me.token });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.steps.map((s) => s.id), ['resume', 'ats', 'tailor', 'practise', 'apply']);
  assert.equal(res.body.doneCount, 0);

  const Work = mongoose.model('Work');
  await Work.create({ userId: me.id, title: 'My resume', type: 'resume', templateId: 't', htmlContent: '{}' });
  await Work.create({ userId: me.id, title: 'Check', type: 'resume-check', templateId: 't', htmlContent: '{}' });
  await JobApplyLog.create({ email: 'plan@example.com', userId: me.id, jobKey: 'gh:x:1', source: 'greenhouse', title: 'Dev', company: 'X', applyUrl: 'https://x.example.com' });
  res = await call('/api/user/progress', { token: me.token });
  const done = Object.fromEntries(res.body.steps.map((s) => [s.id, s.done]));
  assert.deepEqual(done, { resume: true, ats: true, tailor: false, practise: false, apply: true });
  assert.equal(res.body.hidden, false);

  res = await call('/api/user/progress/hide', { method: 'POST', token: me.token, body: { hidden: true } });
  assert.equal(res.body.hidden, true);
  res = await call('/api/user/progress/hide', { method: 'POST', token: me.token, body: { hidden: false } });
  assert.equal(res.body.hidden, false);
});

// ── ATS score history ──────────────────────────────────────────────────────

test('score history lists only your own checks, with sub-scores', async () => {
  const me = await account('scans@example.com', { resume: false });
  const other = await account('other-scans@example.com', { resume: false });
  const evaluation = (score) => ({ score, atsKeywords: { score: score - 5, missing: [] }, contentAndImpact: { score: score + 2 }, formattingAndStyle: { score: 80 } });
  await saveScan({ fileName: 'Manav_Resume.pdf', fileType: 'application/pdf', fileSize: 10, evaluation: evaluation(62), userId: me.id, workId: 'w1' });
  await saveScan({ fileName: 'Manav_Resume (1).pdf', fileType: 'application/pdf', fileSize: 10, evaluation: evaluation(74), userId: me.id });
  await saveScan({ fileName: 'Theirs.pdf', fileType: 'application/pdf', fileSize: 10, evaluation: evaluation(50), userId: other.id });

  const res = await call('/api/user/scans', { token: me.token });
  assert.equal(res.status, 200);
  assert.equal(res.body.scans.length, 2);
  const [latest, first] = res.body.scans;
  assert.equal(latest.score, 74);
  assert.equal(latest.keywordsScore, 69);
  assert.equal(latest.resumeKey, first.resumeKey, 'a re-upload of the same file is the same resume');
  assert.equal(first.workId, 'w1');

  const { previousScan, scoreChange } = await import('../../src/growth/scans.js');
  const change = scoreChange(await previousScan(me.id, 'Manav_Resume.pdf'), 80);
  assert.deepEqual({ delta: change.delta, trend: change.trend }, { delta: 6, trend: 'up' });
  assert.equal(scoreChange({ score: 80 }, 81).trend, 'same');
});

// ── Job alerts ─────────────────────────────────────────────────────────────

test('job alerts: daily is Pro only, and each job is emailed once', async () => {
  const me = await account('alerts@example.com');
  let res = await call('/api/job-finder/alerts', { method: 'PUT', token: me.token, body: { enabled: true, frequency: 'daily' } });
  assert.equal(res.status, 402);
  res = await call('/api/job-finder/alerts', { method: 'PUT', token: me.token, body: { enabled: true, frequency: 'weekly', minScore: 40 } });
  assert.equal(res.status, 200);
  assert.deepEqual({ enabled: res.body.alerts.enabled, frequency: res.body.alerts.frequency, minScore: res.body.alerts.minScore, canDaily: res.body.alerts.canDaily },
    { enabled: true, frequency: 'weekly', minScore: 40, canDaily: false });

  const good = job({ title: 'Frontend Developer' });
  const poor = job({ title: 'Senior Accountant', location: 'London', description: 'Excel and audits' });
  stub.boards = [good, poor];
  const sent = [];
  const send = async (messages) => { sent.push(...messages); return { sent: messages.length, failed: 0, errors: [] }; };

  const now = new Date();
  let result = await alerts.runJobAlerts({ now, sources: { boards: async () => stub.boards, recruiters: async () => [] }, send });
  assert.equal(result.sent, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'alerts@example.com');
  assert.match(sent[0].html, /Frontend Developer/);
  assert.doesNotMatch(sent[0].html, /Senior Accountant/);
  assert.match(sent[0].headers['List-Unsubscribe'], /\/api\/unsubscribe\//);

  // Not due again until next week
  result = await alerts.runJobAlerts({ now: new Date(now.getTime() + 3600000), sources: { boards: async () => stub.boards }, send });
  assert.equal(result.due, 0);

  // A week later the same job is not sent again
  result = await alerts.runJobAlerts({ now: new Date(now.getTime() + 7 * 86400000), sources: { boards: async () => stub.boards }, send });
  assert.equal(result.sent, 0);
  assert.equal(sent.length, 1);

  // One-click unsubscribe works without signing in
  const token = (await models.JobAlert.findOne({ userId: me.id }).lean()).unsubscribeToken;
  res = await call(`/api/unsubscribe/${token}`);
  assert.equal(res.status, 200);
  assert.match(res.body, /unsubscribed/);
  assert.equal((await models.JobAlert.findOne({ userId: me.id }).lean()).enabled, false);
  res = await call('/api/unsubscribe/not-a-real-token');
  assert.equal(res.status, 404);
});

test('the alert runner needs the cron secret', async () => {
  let res = await call('/api/cron/job-alerts', { method: 'POST' });
  assert.equal(res.status, 401);
  res = await call('/api/cron/job-alerts', { headers: { Authorization: 'Bearer wrong' } });
  assert.equal(res.status, 401);
});

// ── Find a referral ────────────────────────────────────────────────────────

test('a referral request is written for the job and can be marked sent', async () => {
  const me = await account('referral-ask@example.com');
  const j = job({ company: 'Globex' });
  await FinderJob.create({ ...j, expiresAt: new Date(Date.now() + 86400000) });

  let res = await call('/api/job-finder/referral-sent', { method: 'POST', token: me.token, body: { jobKey: j.jobKey } });
  assert.equal(res.status, 404);

  res = await call('/api/job-finder/referral', { method: 'POST', token: me.token, body: { jobKey: j.jobKey, targetName: 'Asha', relation: 'Same college' } });
  assert.equal(res.status, 200);
  assert.match(res.body.messages.connectionRequest, /Globex/);
  assert.match(res.body.links.people, /linkedin\.com\/search\/results\/people/);
  assert.ok(res.body.workId);

  res = await call('/api/job-finder/referral-sent', { method: 'POST', token: me.token, body: { jobKey: j.jobKey } });
  assert.equal(res.status, 200);
  res = await call(`/api/job-finder/referral/${encodeURIComponent(j.jobKey)}`, { token: me.token });
  assert.ok(res.body.ask.sentAt);
});

// ── Offer negotiation ──────────────────────────────────────────────────────

test('offer negotiation needs the offer, saves the result, and free accounts get one a week', async () => {
  const me = await account('offer@example.com', { resume: false });
  let res = await call('/api/negotiation', { method: 'POST', token: me.token, body: { offer: { company: 'Initech' } } });
  assert.equal(res.status, 400);

  const body = { offer: { company: 'Initech', role: 'Frontend Developer', fixed: '18 LPA' }, position: { target: '21 LPA', priorities: ['pay'] }, tone: 'Warm' };
  res = await call('/api/negotiation', { method: 'POST', token: me.token, body });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.email.subject, 'Offer from Initech');
  assert.equal((await mongoose.model('Work').findOne({ userId: me.id, type: 'offer-negotiation' }).lean()).title, 'Offer Negotiation - Initech');
  assert.equal(await models.NegotiationLog.countDocuments({ userId: me.id }), 1);

  // The use is recorded once the response finishes
  await new Promise((r) => setTimeout(r, 100));
  res = await call('/api/negotiation', { method: 'POST', token: me.token, body });
  assert.equal(res.status, 402);
  assert.equal(res.body.code, 'UPGRADE_REQUIRED');
});

// ── Resume share links ─────────────────────────────────────────────────────

test('share links: readable name, view counting, owner views ignored, switch off', async () => {
  const me = await account('share@example.com', { resume: false });
  const other = await account('share-other@example.com', { resume: false });
  const Work = mongoose.model('Work');
  const resume = await Work.create({ userId: me.id, title: 'Resume - Manav', type: 'resume', templateId: 't', htmlContent: '{"name":"Manav"}' });
  const letter = await Work.create({ userId: me.id, title: 'Letter', type: 'cover-letter', templateId: 't', htmlContent: '{}' });

  let res = await call(`/api/user/share/${letter._id}`, { method: 'PUT', token: me.token, body: { enabled: true } });
  assert.equal(res.status, 400);
  res = await call(`/api/user/share/${resume._id}`, { method: 'PUT', token: other.token, body: { enabled: true } });
  assert.equal(res.status, 404);

  res = await call(`/api/user/share/${resume._id}`, { method: 'PUT', token: me.token, body: { enabled: true } });
  assert.equal(res.status, 200);
  const { slug } = res.body.link;
  assert.equal(slug, 'manav-tiwari');

  // Custom names are Pro
  res = await call(`/api/user/share/${resume._id}`, { method: 'PUT', token: me.token, body: { slug: 'manav-frontend' } });
  assert.equal(res.status, 402);

  const visitor = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/130' } };
  res = await call(`/api/r/${slug}`, visitor);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.htmlContent, '{"name":"Manav"}');
  await call(`/api/r/${slug}`, visitor); // same visitor within 30 minutes
  await call(`/api/r/${slug}`, { headers: { 'User-Agent': 'LinkedInBot/1.0' } });
  await call(`/api/r/${slug}`, { ...visitor, token: me.token });

  res = await call(`/api/user/share/${resume._id}`, { token: me.token });
  assert.equal(res.body.link.viewCount, 1);
  assert.equal(res.body.stats, null, 'view details are for Pro');
  assert.equal(await models.ResumeView.countDocuments({}), 1);
  const stored = await models.ResumeView.findOne({}).lean();
  assert.equal(stored.visitor.length, 32, 'only a hash is stored, never the IP');

  res = await call(`/api/user/share/${resume._id}`, { method: 'PUT', token: me.token, body: { enabled: false } });
  assert.equal(res.body.link.enabled, false);
  res = await call(`/api/r/${slug}`, visitor);
  assert.equal(res.status, 410);
  res = await call('/api/r/no-such-link');
  assert.equal(res.status, 404);
});

test('Pro accounts can rename a link, and names are checked', async () => {
  const me = await account('share-pro@example.com', { pro: true, resume: false });
  const resume = await mongoose.model('Work').create({ userId: me.id, title: 'Resume', type: 'resume', templateId: 't', htmlContent: '{}' });
  let res = await call(`/api/user/share/${resume._id}`, { method: 'PUT', token: me.token, body: { slug: 'Admin' } });
  assert.equal(res.status, 400);
  res = await call(`/api/user/share/${resume._id}`, { method: 'PUT', token: me.token, body: { slug: 'manav-frontend-dev' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.link.slug, 'manav-frontend-dev');
  res = await call(`/api/user/share/${resume._id}`, { token: me.token });
  assert.ok(res.body.stats, 'Pro sees the views breakdown');
});

// ── Invite friends ─────────────────────────────────────────────────────────

test('an invited friend who verifies their email earns both people an extra apply', async () => {
  const inviter = await account('inviter@example.com', { resume: false });
  let res = await call('/api/user/referral', { token: inviter.token });
  assert.equal(res.status, 200);
  const { code } = res.body;
  assert.match(code, /^[A-Z0-9]{7}$/);

  // Own code, old accounts and bad codes don't count
  res = await call('/api/referral/claim', { method: 'POST', token: inviter.token, body: { code } });
  assert.equal(res.body.reason, 'own-code');
  const old = await account('old-friend@example.com', { resume: false, createdAt: new Date(Date.now() - 30 * 86400000) });
  res = await call('/api/referral/claim', { method: 'POST', token: old.token, body: { code } });
  assert.equal(res.body.reason, 'not-new');
  res = await call('/api/referral/claim', { method: 'POST', token: old.token, body: { code: 'NOPE' } });
  assert.equal(res.body.reason, 'invalid-code');

  // An unverified friend waits; verifying the email gives both credits
  const friend = await account('friend@example.com', { resume: false, verified: false });
  res = await call('/api/referral/claim', { method: 'POST', token: friend.token, body: { code: code.toLowerCase() } });
  assert.deepEqual({ ok: res.body.ok, status: res.body.status }, { ok: true, status: 'signed_up' });
  res = await call('/api/referral/claim', { method: 'POST', token: friend.token, body: { code } });
  assert.equal(res.body.reason, 'already-claimed');
  assert.equal(await models.ApplyCredit.countDocuments({}), 0);

  const { markEmailVerified } = await import('../../src/services/emailVerification.js');
  await markEmailVerified(friend.user);
  for (let i = 0; i < 40 && !(await models.ApplyCredit.countDocuments({})); i++) await new Promise((r) => setTimeout(r, 25));
  assert.equal(await models.ApplyCredit.countDocuments({ email: 'inviter@example.com' }), 1);
  assert.equal(await models.ApplyCredit.countDocuments({ email: 'friend@example.com' }), 1);

  res = await call('/api/user/referral', { token: inviter.token });
  assert.equal(res.body.credits.available, 1);
  assert.equal(res.body.invites[0].status, 'qualified');
  assert.match(res.body.invites[0].email, /^fr•+@example\.com$/);
});

test('a disposable-email friend is not rewarded', async () => {
  const inviter = await account('inviter2@example.com', { resume: false });
  const { code } = (await call('/api/user/referral', { token: inviter.token })).body;
  const friend = await account('throwaway@mailinator.com', { resume: false });
  await mongoose.model('User').updateOne({ _id: friend.id }, { $set: { riskFlags: ['disposable_email'] } });
  const res = await call('/api/referral/claim', { method: 'POST', token: friend.token, body: { code } });
  assert.equal(res.body.status, 'rejected');
  assert.equal(await models.ApplyCredit.countDocuments({ email: 'inviter2@example.com' }), 0);
});

test('an invite credit lets a free account apply past its monthly application', async () => {
  const me = await account('credit@example.com');
  await models.ApplyCredit.create({ email: 'credit@example.com', userId: me.id });
  const first = job({ company: 'One' });
  const second = job({ company: 'Two' });
  const third = job({ company: 'Three' });
  for (const j of [first, second, third]) await FinderJob.create({ ...j, expiresAt: new Date(Date.now() + 86400000) });

  let res = await call('/api/job-finder/apply', { method: 'POST', token: me.token, body: { jobKey: first.jobKey } });
  assert.equal(res.status, 200);
  assert.deepEqual({ used: res.body.plan.applies.used, limit: res.body.plan.applies.limit }, { used: 1, limit: 2 });

  res = await call('/api/job-finder/apply', { method: 'POST', token: me.token, body: { jobKey: second.jobKey } });
  assert.equal(res.status, 200, 'the credit pays for the second application');
  assert.deepEqual({ used: res.body.plan.applies.used, limit: res.body.plan.applies.limit, credits: res.body.plan.applies.credits }, { used: 1, limit: 1, credits: 0 });
  assert.ok((await models.ApplyCredit.findOne({ email: 'credit@example.com' }).lean()).usedAt);

  res = await call('/api/job-finder/apply', { method: 'POST', token: me.token, body: { jobKey: third.jobKey } });
  assert.equal(res.status, 402);
  assert.equal(res.body.code, 'JOB_APPLY_LIMIT');
});

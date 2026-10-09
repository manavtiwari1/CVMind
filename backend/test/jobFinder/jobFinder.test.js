import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { extractSkills } from '../../src/jobFinder/skills.js';
import { matchJob, candidateFrom, jobSeniority } from '../../src/jobFinder/match.js';
import { mergeJobs, applyFilters } from '../../src/jobFinder/feed.js';

// db.js and the admin module read MONGODB_URI at import time, so the in-memory server starts first
let mongod;
let server;
let base;
let mongoose;
let signToken;
let ownerToken;
let models;
let jsearch;
let Subscription;
let ResumeProfile;
let deleteAccount;
let realFetch;

// What the stubbed sources return for the next feed request
const stub = { jsearch: [], boards: [], recruiters: [], calls: 0 };

const job = (overrides) => ({
  jobKey: `js:${Math.random().toString(16).slice(2, 14)}`,
  source: 'jsearch',
  title: 'Software Engineer',
  company: 'Acme',
  location: 'Bengaluru, India',
  remote: false,
  postedAt: new Date(),
  applyUrl: 'https://acme.example.com/apply',
  description: '',
  ...overrides
});

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_jobfinder_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  // db.js loads .env on import; empty values here keep the real job APIs out of the tests
  process.env.JSEARCH_API_KEY = '';
  process.env.ADZUNA_APP_ID = '';
  process.env.ADZUNA_APP_KEY = '';
  realFetch = globalThis.fetch;

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken } = await import('../../src/services/authToken.js'));
  ({ deleteAccount } = await import('../../src/db.js'));
  const adminRouter = (await import('../../src/admin/router.js')).default;
  const { createJobFinderRouter } = await import('../../src/routes/jobFinder.js');
  models = await import('../../src/jobFinder/models.js');
  jsearch = await import('../../src/jobFinder/sources/jsearch.js');
  ({ Subscription } = await import('../../src/billing/models.js'));
  ResumeProfile = (await import('@cvmind/auto-apply-agent/models/ResumeProfile.js')).default;
  const { installSessionValidator } = await import('../../src/admin/sessions.js');
  installSessionValidator();
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  // The stubs store their jobs like the real sources do, so detail and apply can find them
  const remember = async (list) => {
    for (const j of list) {
      await models.FinderJob.updateOne({ jobKey: j.jobKey }, { $set: { ...j, expiresAt: new Date(Date.now() + 86400000) } }, { upsert: true });
    }
    return list;
  };
  const sources = {
    jsearch: async () => { stub.calls += 1; return { jobs: await remember(stub.jsearch) }; },
    boards: async () => remember(stub.boards),
    recruiters: async () => remember(stub.recruiters)
  };

  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  app.use('/api/job-finder', createJobFinderRouter({ sources }));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;

  const login = await call('/api/admin/login', { method: 'POST', body: { username: 'owner', password: 'owner-password-123' } });
  ownerToken = login.body.token;
});

after(async () => {
  globalThis.fetch = realFetch;
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

beforeEach(() => {
  Object.assign(stub, { jsearch: [], boards: [], recruiters: [], calls: 0 });
});

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await realFetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// A signed-in account; Pro and a parsed resume when asked
async function account(email, { pro = true, skills = ['react', 'javascript', 'node.js'], title = 'Frontend Developer' } = {}) {
  const user = await mongoose.model('User').create({ email, name: email.split('@')[0], password: 'x' });
  if (pro) {
    await Subscription.create({ email, plan: 'monthly', startsAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 30 * 86400000), source: 'admin' });
  }
  await ResumeProfile.create({
    userId: String(user._id), label: 'Resume', isDefault: true, source: 'upload', status: 'ready',
    structured: { experience: [{ company: 'X', title, startDate: '2023-01', current: true }], skills: skills.map((name) => ({ name, normalized: name })) },
    derived: { totalYearsExperience: 2, seniority: 'junior', normalizedSkillSet: skills }
  });
  return { id: String(user._id), token: signToken({ sub: String(user._id), kind: 'user', email }) };
}

// ── Matching, without the database ────────────────────────────────────────────

test('skills are read from job text, with everyday words left out', () => {
  assert.deepEqual(extractSkills('Backend Engineer: Node.js, Go, PostgreSQL, k8s and REST APIs').sort(),
    ['golang', 'kubernetes', 'node.js', 'postgresql', 'rest api'].sort());
  assert.deepEqual(extractSkills('We rest well, excel at sales and go to R&D meetings'), []);
  assert.deepEqual(extractSkills('Must know Webflow', ['Webflow']), ['webflow']);
});

test('a matching job scores higher than an unrelated one and lists missing skills', () => {
  const candidate = candidateFrom({ derived: { normalizedSkillSet: ['react', 'javascript'], seniority: 'junior' }, structured: { experience: [] } },
    { targetTitles: ['Frontend Developer'], locations: ['bengaluru'] });
  const good = matchJob(job({ title: 'Frontend Engineer', description: 'React, JavaScript and TypeScript' }), candidate);
  const poor = matchJob(job({ title: 'Senior Accountant', location: 'London', description: 'Accounting and Excel' }), candidate);
  assert.ok(good.score > poor.score, `${good.score} vs ${poor.score}`);
  assert.deepEqual(good.missingSkills, ['typescript']);
  assert.ok(good.matchedSkills.includes('react'));
  assert.equal(jobSeniority('Software Engineer'), null);
  assert.equal(jobSeniority('Senior Software Engineer'), 'senior');
});

test('the same job from two sources is kept once, from the most direct source', () => {
  const merged = mergeJobs([
    [job({ jobKey: 'gh:acme:1', source: 'greenhouse', title: 'SDE II', company: 'Acme' })],
    [job({ title: 'SDE II', company: 'ACME' }), job({ title: 'Data Analyst' })]
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((j) => j.title === 'SDE II').source, 'greenhouse');
});

test('filters drop old, on-site or wrong-level jobs but keep jobs that state no level', () => {
  const now = Date.now();
  const jobs = [
    job({ title: 'Senior Engineer', postedAt: new Date(now) }),
    job({ title: 'Engineer', postedAt: new Date(now - 10 * 86400000) }),
    job({ title: 'Engineer', remote: true, postedAt: new Date(now) })
  ];
  assert.equal(applyFilters(jobs, { level: 'fresher', now }).length, 2);
  assert.equal(applyFilters(jobs, { days: 7, now }).length, 2);
  assert.equal(applyFilters(jobs, { remote: true, now }).length, 1);
});

// ── API ───────────────────────────────────────────────────────────────────────

test('Job Finder needs sign-in; free accounts can use it and see their limits', async () => {
  assert.equal((await call('/api/job-finder/feed')).status, 401);
  const free = await account('free@example.com', { pro: false });
  const feed = await call('/api/job-finder/feed', { token: free.token });
  assert.equal(feed.status, 200);
  assert.equal(feed.body.plan.pro, false);
  assert.deepEqual({ used: feed.body.plan.applies.used, limit: feed.body.plan.applies.limit }, { used: 0, limit: 1 });
  assert.equal(feed.body.plan.searches.used, 1);

  const pro = await account('pro@example.com');
  const proFeed = await call('/api/job-finder/feed', { token: pro.token });
  assert.deepEqual(proFeed.body.plan, { pro: true, applies: null, searches: null });
});

test('a free account applies to 1 job a month; Pro has no limit', async () => {
  const free = await account('free-apply@example.com', { pro: false });
  const pro = await account('pro-apply@example.com');
  const first = job({ jobKey: 'js:freeapply00001', title: 'Frontend Engineer' });
  const second = job({ jobKey: 'js:freeapply00002', title: 'React Developer' });
  stub.jsearch = [first, second];
  await call('/api/job-finder/feed?q=frontend', { token: free.token });

  const ok = await call('/api/job-finder/apply', { method: 'POST', token: free.token, body: { jobKey: first.jobKey } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.plan.applies.used, 1);

  const refused = await call('/api/job-finder/apply', { method: 'POST', token: free.token, body: { jobKey: second.jobKey } });
  assert.equal(refused.status, 402);
  assert.equal(refused.body.code, 'JOB_APPLY_LIMIT');
  assert.equal(await models.JobApplyLog.countDocuments({ email: 'free-apply@example.com' }), 1);
  // The job already applied to still answers "you applied on …"
  assert.equal((await call('/api/job-finder/apply', { method: 'POST', token: free.token, body: { jobKey: first.jobKey } })).body.alreadyApplied, true);

  // An application from over a month ago no longer counts
  await models.JobApplyLog.updateOne({ email: 'free-apply@example.com' }, { $set: { createdAt: new Date(Date.now() - 31 * 86400000) } });
  assert.equal((await call('/api/job-finder/apply', { method: 'POST', token: free.token, body: { jobKey: second.jobKey } })).status, 200);

  for (const j of [first, second]) {
    assert.equal((await call('/api/job-finder/apply', { method: 'POST', token: pro.token, body: { jobKey: j.jobKey } })).status, 200);
  }
});

test('past 10 searches a day, a free account searches without the paid job APIs', async () => {
  const free = await account('free-search@example.com', { pro: false });
  const FeatureUse = mongoose.model('FeatureUse');
  await FeatureUse.insertMany(Array.from({ length: 10 }, () => ({ email: 'free-search@example.com', feature: 'job-finder-search' })));
  stub.jsearch = [job({ jobKey: 'js:freesearch0001', title: 'Frontend Engineer' })];
  stub.boards = [job({ jobKey: 'gh:acme:777', source: 'greenhouse', title: 'Frontend Developer', company: 'Acme Boards' })];

  const res = await call('/api/job-finder/feed?q=frontend', { token: free.token });
  assert.equal(res.body.limitedSources, true);
  assert.equal(stub.calls, 0);
  assert.deepEqual(res.body.jobs.map((j) => j.source), ['greenhouse']);
  // Limited searches aren't counted again
  assert.equal(await FeatureUse.countDocuments({ email: 'free-search@example.com' }), 10);
});

test('the feed merges the sources and ranks the best match first', async () => {
  const { token } = await account('feed@example.com');
  stub.jsearch = [job({ title: 'Accountant', description: 'Tally and GST filing' })];
  stub.boards = [job({ jobKey: 'gh:acme:42', source: 'greenhouse', title: 'Frontend Engineer', company: 'Acme', description: 'React and JavaScript' })];
  stub.recruiters = [job({ jobKey: 'cv:job_1', source: 'cvmind', title: 'React Developer', company: 'Beta', applyUrl: '', description: 'React, Node.js' })];

  const res = await call('/api/job-finder/feed?q=frontend%20developer', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.jobs.length, 3);
  assert.notEqual(res.body.jobs[0].title, 'Accountant');
  assert.equal(res.body.jobs.at(-1).title, 'Accountant');
  assert.ok(res.body.jobs.every((j) => j.appliedAt === null));
  assert.equal(res.body.jobs.find((j) => j.source === 'cvmind').appliesInCvmind, true);
});

test('the skills view searches by resume skills and keeps only jobs that ask for one of them', async () => {
  const { token } = await account('skills-view@example.com');
  stub.jsearch = [
    job({ jobKey: 'js:skillview00001', title: 'Backend Engineer', description: 'Node.js and PostgreSQL' }),
    job({ jobKey: 'js:skillview00002', title: 'Accountant', description: 'Tally and GST filing' }),
    job({ jobKey: 'js:skillview00003', title: 'UI Developer', description: 'React and CSS' })
  ];

  const all = await call('/api/job-finder/feed?mode=skills', { token });
  assert.equal(all.body.mode, 'skills');
  assert.deepEqual(all.body.skills, ['react', 'javascript', 'node.js']);
  assert.deepEqual(all.body.jobs.map((j) => j.title).sort(), ['Backend Engineer', 'UI Developer']);

  const picked = await call('/api/job-finder/feed?mode=skills&skills=Node,cobol', { token });
  assert.deepEqual(picked.body.skills, ['node.js']);
  assert.deepEqual(picked.body.jobs.map((j) => j.title), ['Backend Engineer']);
});

test('a company search keeps only jobs at that employer, not jobs that mention it', async () => {
  const { token } = await account('company@example.com');
  stub.jsearch = [
    job({ jobKey: 'js:company000001', title: 'Systems Engineer', company: 'Infosys BPM Limited' }),
    job({ jobKey: 'js:company000002', title: 'Infosys Finacle Consultant', company: 'Ignites Human Capital' }),
    job({ jobKey: 'js:company000003', title: 'Software Engineer', company: 'Tata Consultancy Services' })
  ];
  const infosys = await call('/api/job-finder/feed?company=Infosys', { token });
  assert.equal(infosys.body.company, 'Infosys');
  assert.equal(infosys.body.query, '');
  assert.deepEqual(infosys.body.jobs.map((j) => j.company), ['Infosys BPM Limited']);

  const tcs = await call('/api/job-finder/feed?company=TCS&q=software%20engineer', { token });
  assert.deepEqual(tcs.body.jobs.map((j) => j.company), ['Tata Consultancy Services']);
});

test('without a search or a target role the feed asks for one', async () => {
  const { token, id } = await account('norole@example.com');
  await ResumeProfile.updateOne({ userId: id }, { $set: { 'structured.experience': [] } });
  const res = await call('/api/job-finder/feed', { token });
  assert.equal(res.body.needsRole, true);
  assert.equal(stub.calls, 0);
});

test('applying is remembered per account: the second time says when they first applied', async () => {
  const a = await account('apply-a@example.com');
  const b = await account('apply-b@example.com');
  const target = job({ jobKey: 'js:applytest00001', title: 'Frontend Engineer' });
  stub.jsearch = [target];
  await call('/api/job-finder/feed?q=frontend', { token: a.token });

  const first = await call('/api/job-finder/apply', { method: 'POST', token: a.token, body: { jobKey: target.jobKey } });
  assert.equal(first.status, 200);
  assert.equal(first.body.alreadyApplied, false);
  assert.equal(first.body.applyUrl, target.applyUrl);

  const again = await call('/api/job-finder/apply', { method: 'POST', token: a.token, body: { jobKey: target.jobKey } });
  assert.equal(again.body.alreadyApplied, true);
  assert.equal(again.body.appliedAt, first.body.appliedAt);

  const other = await call('/api/job-finder/apply', { method: 'POST', token: b.token, body: { jobKey: target.jobKey } });
  assert.equal(other.body.alreadyApplied, false);

  const log = await models.JobApplyLog.findOne({ email: 'apply-a@example.com', jobKey: target.jobKey }).lean();
  assert.equal(log.openCount, 2);
  assert.equal(log.title, 'Frontend Engineer');
  assert.equal(typeof log.matchScore, 'number');

  // The feed marks it as applied for that account only
  stub.jsearch = [target];
  const feedA = await call('/api/job-finder/feed?q=frontend', { token: a.token });
  assert.equal(feedA.body.jobs[0].appliedAt, first.body.appliedAt);

  assert.equal((await call('/api/job-finder/apply', { method: 'POST', token: a.token, body: { jobKey: 'js:missing00000001' } })).status, 404);
  assert.equal((await call('/api/job-finder/apply', { method: 'POST', token: a.token, body: { jobKey: '../etc' } })).status, 400);
});

test('applying to a CVMind recruiter job sends the application once', async () => {
  const { token } = await account('recruit@example.com');
  const target = job({ jobKey: 'cv:job_77', source: 'cvmind', title: 'React Developer', company: 'Beta', applyUrl: '', cvmindJobId: 'job_77', companyId: 'comp_beta', description: 'React' });
  stub.recruiters = [target];
  await call('/api/job-finder/feed?q=react', { token });

  assert.equal((await call('/api/job-finder/apply', { method: 'POST', token, body: { jobKey: target.jobKey } })).body.alreadyApplied, false);
  assert.equal((await call('/api/job-finder/apply', { method: 'POST', token, body: { jobKey: target.jobKey } })).body.alreadyApplied, true);
  const sent = await mongoose.model('Application').find({ jobId: 'job_77', candidateEmail: 'recruit@example.com' }).lean();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].mode, 'Job Finder');
});

test('job detail returns the description and the full match', async () => {
  const { token } = await account('detail@example.com');
  const target = job({ jobKey: 'js:detailtest0001', title: 'Frontend Engineer', description: 'React, TypeScript' });
  stub.jsearch = [target];
  await call('/api/job-finder/feed?q=frontend', { token });
  const res = await call(`/api/job-finder/jobs/${target.jobKey}`, { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.job.description, 'React, TypeScript');
  assert.deepEqual(res.body.match.missingSkills, ['typescript']);
  assert.equal((await call('/api/job-finder/jobs/js:nothere000000001', { token })).status, 404);
});

test('preferences are validated and only the account\'s own resumes can be picked', async () => {
  const { token } = await account('prefs@example.com');
  const saved = await call('/api/job-finder/profile', { method: 'PUT', token, body: { targetTitles: ['Frontend Developer', ' '], locations: ['Pune'], workModes: ['remote'] } });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.preferences.targetTitles, ['Frontend Developer']);
  assert.equal(saved.body.onboarded, true);
  assert.equal(saved.body.resumes.length, 1);

  assert.equal((await call('/api/job-finder/profile', { method: 'PUT', token, body: { workModes: ['moon'] } })).status, 400);
  assert.equal((await call('/api/job-finder/profile', { method: 'PUT', token, body: { applyMode: 'server' } })).status, 400);
  const someoneElse = await ResumeProfile.findOne({ userId: { $ne: saved.body.resumes[0].id } }).lean();
  assert.equal((await call('/api/job-finder/profile', { method: 'PUT', token, body: { defaultResumeProfileId: String(someoneElse._id) } })).status, 404);
});

test('admins see who applied where; deleting the account removes its records', async () => {
  const user = await account('admin-view@example.com');
  const target = job({ jobKey: 'js:adminview00001', title: 'Data Analyst', company: 'Gamma' });
  stub.jsearch = [target];
  await call('/api/job-finder/feed?q=analyst', { token: user.token });
  await call('/api/job-finder/apply', { method: 'POST', token: user.token, body: { jobKey: target.jobKey } });

  assert.equal((await call('/api/admin/job-finder')).status, 401);
  const list = await call('/api/admin/job-finder?q=admin-view', { token: ownerToken });
  assert.equal(list.status, 200);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.data[0].company, 'Gamma');
  assert.equal(list.body.data[0].name, 'admin-view');

  const summary = await call('/api/admin/job-finder/summary', { token: ownerToken });
  assert.ok(summary.body.data.appliesToday >= 1);
  assert.equal(summary.body.data.jsearch.configured, false);

  await deleteAccount(user.id);
  assert.equal(await models.JobApplyLog.countDocuments({ email: 'admin-view@example.com' }), 0);
});

test('an uploaded resume is matched from its text while the worker has not read it yet', async () => {
  const user = await mongoose.model('User').create({ email: 'upload@example.com', name: 'upload', password: 'x' });
  await Subscription.create({ email: 'upload@example.com', plan: 'monthly', startsAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 86400000), source: 'admin' });
  const token = signToken({ sub: String(user._id), kind: 'user', email: 'upload@example.com' });

  const form = new FormData();
  form.append('resume', new Blob(['Asha Rao\nFrontend Developer\nSkills: React, TypeScript, Node.js, CSS\nBuilt dashboards for 3 years at a fintech startup.'], { type: 'text/plain' }), 'asha.txt');
  const res = await realFetch(`${base}/api/job-finder/resumes/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const body = await res.json();
  assert.equal(res.status, 200);
  const resume = body.resumes.find((r) => r.id === body.resumeId);
  assert.equal(resume.status, 'queued');
  assert.equal(resume.skillsFromText, true);
  assert.deepEqual([...resume.skills].sort(), ['css', 'node.js', 'react', 'typescript']);

  await call('/api/job-finder/profile', { method: 'PUT', token, body: { targetTitles: ['Frontend Developer'] } });
  stub.jsearch = [job({ jobKey: 'js:quickskills0001', title: 'Frontend Engineer', description: 'React and GraphQL' })];
  const feed = await call('/api/job-finder/feed', { token });
  assert.deepEqual(feed.body.jobs[0].match.matchedSkills, ['react']);
  assert.deepEqual(feed.body.jobs[0].match.missingSkills, ['graphql']);
});

// ── Adzuna: cache and daily cap ───────────────────────────────────────────────

test('Adzuna searches are cached, credited and stop at the daily cap', async () => {
  const adzuna = await import('../../src/jobFinder/sources/adzuna.js');
  Object.assign(process.env, { ADZUNA_APP_ID: 'id', ADZUNA_APP_KEY: 'key', ADZUNA_DAILY_CAP: '1' });
  let fetches = 0;
  const fetchImpl = async (url) => {
    fetches += 1;
    const u = new URL(url);
    assert.equal(u.pathname, '/v1/api/jobs/in/search/1');
    assert.equal(u.searchParams.get('what'), 'sales manager');
    assert.equal(u.searchParams.get('where'), 'Mumbai');
    return new Response(JSON.stringify({ results: [
      { id: '4567', title: '<strong>Sales</strong> Manager', company: { display_name: 'Acme Retail' }, location: { display_name: 'Mumbai, Maharashtra' },
        description: 'Lead a team of 8. Excel and CRM. Work from home on Fridays.', redirect_url: 'https://www.adzuna.in/land/ad/4567', created: '2026-10-08T10:00:00Z', contract_time: 'full_time' },
      { id: '9', title: 'No link' }
    ] }), { status: 200 });
  };
  try {
    const first = await adzuna.searchAdzuna({ query: 'sales manager', location: 'Mumbai' }, { fetchImpl });
    assert.equal(first.jobs.length, 1);
    assert.deepEqual(
      { key: first.jobs[0].jobKey, title: first.jobs[0].title, company: first.jobs[0].company, type: first.jobs[0].employmentType, remote: first.jobs[0].remote, publisher: first.jobs[0].publisher },
      { key: 'az:4567', title: 'Sales Manager', company: 'Acme Retail', type: 'Full-time', remote: true, publisher: 'Adzuna' }
    );
    assert.equal((await adzuna.searchAdzuna({ query: 'Sales  Manager', location: 'mumbai' }, { fetchImpl })).cached, true);
    assert.equal((await adzuna.searchAdzuna({ query: 'sales manager', location: 'Pune' }, { fetchImpl })).capped, true);
    assert.equal(fetches, 1);
    const usage = await adzuna.adzunaUsage();
    // The refused day call gave its month call back
    assert.deepEqual({ used: usage.used, today: usage.today }, { used: 1, today: 1 });
  } finally {
    Object.assign(process.env, { ADZUNA_APP_ID: '', ADZUNA_APP_KEY: '' });
    delete process.env.ADZUNA_DAILY_CAP;
  }
});

// ── JSearch: cache and monthly cap ────────────────────────────────────────────

test('JSearch searches are cached for the hour and stop at the monthly cap', async () => {
  process.env.JSEARCH_API_KEY = 'test-key';
  process.env.JSEARCH_MONTHLY_CAP = '1';
  let fetches = 0;
  const fetchImpl = async (url, opts) => {
    fetches += 1;
    assert.equal(opts.headers['X-RapidAPI-Key'], 'test-key');
    assert.match(String(url), /query=react\+developer\+jobs/);
    return new Response(JSON.stringify({ data: [{
      job_id: 'abc==/1', job_title: 'React Developer', employer_name: 'Delta', employer_website: 'https://www.delta.example.com',
      job_apply_link: 'https://delta.example.com/jobs/1', job_description: 'React and Redux', job_city: 'Pune', job_country: 'IN',
      job_employment_type: 'FULLTIME', job_posted_at_datetime_utc: '2026-10-01T00:00:00.000Z'
    }, { job_id: 'no-link', job_title: 'Missing link' }] }), { status: 200 });
  };
  try {
    const first = await jsearch.searchJsearch({ query: 'react developer jobs', days: 7 }, { fetchImpl });
    assert.equal(first.jobs.length, 1);
    assert.equal(first.jobs[0].companyDomain, 'delta.example.com');
    assert.equal(first.jobs[0].employmentType, 'Full-time');
    assert.match(first.jobs[0].jobKey, /^js:[0-9a-f]{24}$/);

    const cached = await jsearch.searchJsearch({ query: 'React  Developer jobs', days: 7 }, { fetchImpl });
    assert.equal(cached.cached, true);
    assert.equal(cached.jobs[0].title, 'React Developer');
    assert.equal(fetches, 1);

    const capped = await jsearch.searchJsearch({ query: 'react developer jobs', days: 30 }, { fetchImpl });
    assert.equal(capped.capped, true);
    assert.equal(fetches, 1);
    assert.deepEqual(await jsearch.jsearchUsage(), { used: 1, cap: 1, configured: true });
  } finally {
    process.env.JSEARCH_API_KEY = '';
    delete process.env.JSEARCH_MONTHLY_CAP;
  }
});

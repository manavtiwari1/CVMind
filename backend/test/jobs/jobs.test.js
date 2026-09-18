import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJobUrl, detectAts } from '../../src/agent/jobs/urlNormalize.js';
import { isPrivateAddress, safeFetch } from '../../src/agent/jobs/fetchers/http.js';
import { fetchGreenhouseJob } from '../../src/agent/jobs/fetchers/greenhouse.js';
import { fetchLeverJob } from '../../src/agent/jobs/fetchers/lever.js';
import { fetchGenericJob, extractJobPostingJsonLd } from '../../src/agent/jobs/fetchers/generic.js';
import { buildJobData, companyKeyFor } from '../../src/agent/jobs/jobData.js';
import { FatalError, RetryableError } from '../../src/agent/errors.js';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('normalizeJobUrl strips tracking, www, fragments and trailing slashes', () => {
  assert.equal(normalizeJobUrl('http://www.Boards.Greenhouse.io/acme/jobs/123/?gh_src=x&utm_source=li#apply'), 'https://boards.greenhouse.io/acme/jobs/123');
  assert.equal(normalizeJobUrl('https://jobs.lever.co/acme/0f8fad5b-d9cb-469f-a165-70867728950e/apply'), 'https://jobs.lever.co/acme/0f8fad5b-d9cb-469f-a165-70867728950e');
  assert.equal(normalizeJobUrl('https://careers.example.com/jobs?id=7&ref=feed'), 'https://careers.example.com/jobs?id=7');
  assert.equal(normalizeJobUrl('ftp://example.com/job'), null);
  assert.equal(normalizeJobUrl('not a url'), null);
});

test('detectAts recognises Greenhouse, Lever and Workday links', () => {
  assert.deepEqual(detectAts('https://boards.greenhouse.io/acme/jobs/123'), { ats: 'greenhouse', boardToken: 'acme', jobId: '123' });
  assert.deepEqual(detectAts('https://job-boards.greenhouse.io/acme/jobs/456'), { ats: 'greenhouse', boardToken: 'acme', jobId: '456' });
  assert.deepEqual(detectAts('https://boards.greenhouse.io/embed/job_app?for=acme&token=789'), { ats: 'greenhouse', boardToken: 'acme', jobId: '789' });
  assert.deepEqual(detectAts('https://jobs.eu.lever.co/acme/0f8fad5b-d9cb-469f-a165-70867728950e'), { ats: 'lever', company: 'acme', postingId: '0f8fad5b-d9cb-469f-a165-70867728950e', region: 'eu' });
  assert.equal(detectAts('https://acme.wd5.myworkdayjobs.com/en-US/careers/job/123').ats, 'workday');
  assert.equal(detectAts('https://careers.example.com/jobs/1').ats, 'unknown');
});

test('isPrivateAddress blocks loopback, private and link-local ranges', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700::1111']) assert.equal(isPrivateAddress(ip), false, ip);
});

test('safeFetch refuses private hosts, including after a redirect', async () => {
  await assert.rejects(safeFetch('http://127.0.0.1/admin', {}, { fetchImpl: async () => new Response('x') }), (err) => err.code === 'BLOCKED_URL');

  const lookup = async (host) => [{ address: host === 'internal.example' ? '10.0.0.5' : '93.184.216.34', family: 4 }];
  const fetchImpl = async (url) => (url.startsWith('https://careers.example.com')
    ? new Response(null, { status: 302, headers: { location: 'http://internal.example/secret' } })
    : new Response('secret'));
  await assert.rejects(safeFetch('https://careers.example.com/job', {}, { fetchImpl, lookup }), (err) => err.code === 'BLOCKED_URL');
});

test('fetchGreenhouseJob unescapes content and keeps application questions', async () => {
  let requested;
  const fetchImpl = async (url) => {
    requested = url;
    return jsonResponse({
      title: 'Backend Engineer',
      location: { name: 'Remote' },
      content: '&lt;p&gt;Build &amp;amp; ship&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Own payments&lt;/li&gt;&lt;/ul&gt;',
      absolute_url: 'https://boards.greenhouse.io/acme-pay/jobs/1',
      questions: [{ label: 'Resume', required: true, fields: [{ name: 'resume', type: 'input_file', values: [] }] }]
    });
  };
  const job = await fetchGreenhouseJob({ boardToken: 'acme-pay', jobId: '1' }, { fetchImpl });
  assert.match(requested, /boards-api\.greenhouse\.io\/v1\/boards\/acme-pay\/jobs\/1\?questions=true$/);
  assert.equal(job.company, 'Acme Pay');
  assert.equal(job.descriptionText, 'Build & ship\n• Own payments');
  assert.deepEqual(job.atsQuestions, [{ label: 'Resume', required: true, fields: [{ name: 'resume', type: 'input_file', options: [] }] }]);

  await assert.rejects(fetchGreenhouseJob({ boardToken: 'a', jobId: '1' }, { fetchImpl: async () => jsonResponse({}, 404) }), FatalError);
  await assert.rejects(fetchGreenhouseJob({ boardToken: 'a', jobId: '1' }, { fetchImpl: async () => jsonResponse({}, 503) }), RetryableError);
});

test('fetchLeverJob combines description lists, work mode and salary', async () => {
  const fetchImpl = async () => jsonResponse({
    text: 'Platform Engineer',
    categories: { location: 'Bengaluru' },
    descriptionPlain: 'Join the platform team.',
    lists: [{ text: 'What you will do', content: '<li>Run Kubernetes</li><li>Automate deploys</li>' }],
    additionalPlain: 'We value kindness.',
    workplaceType: 'hybrid',
    hostedUrl: 'https://jobs.lever.co/acme/x',
    salaryRange: { min: 2000000, max: 3500000, currency: 'inr', interval: 'per-year-salary' }
  });
  const job = await fetchLeverJob({ company: 'acme', postingId: 'x' }, { fetchImpl });
  assert.equal(job.descriptionText, 'Join the platform team.\nWhat you will do\n• Run Kubernetes\n• Automate deploys\nWe value kindness.');
  assert.equal(job.workMode, 'hybrid');
  assert.deepEqual(job.salary, { min: 2000000, max: 3500000, currency: 'INR', period: 'year' });
});

test('fetchGenericJob prefers JSON-LD JobPosting data and rejects empty pages', async () => {
  const description = `<p>${'Build reliable payment systems for millions of merchants. '.repeat(6)}</p>`;
  const html = `<html><head><title>Careers</title><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [{ '@type': 'Organization' }, { '@type': 'JobPosting', title: 'Payments Engineer', description, hiringOrganization: { name: 'Acme Pay' }, jobLocation: { address: { addressLocality: 'Pune', addressCountry: 'IN' } }, jobLocationType: 'TELECOMMUTE' }]
  })}</script></head><body>nav</body></html>`;
  const fetchImpl = async () => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  const job = await fetchGenericJob('https://careers.example.com/jobs/1', { fetchImpl, lookup: publicLookup });
  assert.equal(job.title, 'Payments Engineer');
  assert.equal(job.company, 'Acme Pay');
  assert.equal(job.location, 'Pune, IN');
  assert.equal(job.workMode, 'remote');
  assert.match(job.descriptionText, /^Build reliable payment systems/);

  const empty = async () => new Response('<html><body>Please enable JavaScript</body></html>', { headers: { 'content-type': 'text/html' } });
  await assert.rejects(fetchGenericJob('https://careers.example.com/jobs/2', { fetchImpl: empty, lookup: publicLookup }), (err) => err.code === 'JOB_PAGE_EMPTY');
  assert.equal(extractJobPostingJsonLd('<script type="application/ld+json">{broken</script>'), null);
});

test('buildJobData prefers ATS fields, dedupes skills and maps unknowns to null', () => {
  const extracted = {
    title: 'Sr. Backend Eng', company: 'ACME', location: 'Somewhere', workMode: 'onsite', employmentType: 'full_time', seniority: 'senior', industry: 'Fintech',
    salary: { min: 0, max: 0, currency: '', period: 'unknown' },
    mustHaveSkills: ['Node.js', 'NodeJS', 'Postgres'], niceToHaveSkills: ['node', 'Go'],
    minYearsExperience: -1, educationLevel: 'none', educationFields: [], equivalentExperienceAccepted: false, sponsorshipAvailable: 'unknown',
    responsibilities: [{ text: ' Own payments ', core: true }, { text: '', core: false }]
  };
  const posting = { ats: 'greenhouse', atsIds: { boardToken: 'AcmePay' } };
  const data = buildJobData(extracted, { title: 'Senior Backend Engineer', company: 'Acme Pay', workMode: 'hybrid' }, posting);
  assert.equal(data.title, 'Senior Backend Engineer');
  assert.deepEqual(data.company, { name: 'Acme Pay', key: 'greenhouse:acmepay' });
  assert.equal(data.workMode, 'hybrid');
  assert.deepEqual(data.requirements.normalizedMust, ['node.js', 'postgresql']);
  assert.deepEqual(data.requirements.niceToHaveSkills, ['Go']);
  assert.equal(data.requirements.minYearsExperience, null);
  assert.equal(data.requirements.educationLevel, null);
  assert.equal(data.salary, null);
  assert.deepEqual(data.responsibilities, [{ text: 'Own payments', core: true }]);
  assert.equal(companyKeyFor({ url: 'https://careers.example.com/x' }, ''), 'host:careers.example.com');
});

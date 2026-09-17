import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { BaseAdapter, pickAdapter, enabledAdapterIds } from '../../src/agent/adapters/index.js';
import { GreenhouseAdapter } from '../../src/agent/adapters/greenhouse.js';
import { LeverAdapter } from '../../src/agent/adapters/lever.js';
import { withContext, closeBrowser } from '../../src/agent/browser.js';
import { buildFillPlan } from '../../src/agent/fill/buildFillPlan.js';
import { buildProfileData } from '../../src/agent/resume/derive.js';
import { DEFAULT_PREFERENCES } from '../../src/agent/preferences/schema.js';
import { RESUME } from '../helpers/agentFixtures.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, '../fixtures/ats');

const chromiumInstalled = (() => {
  try {
    return fs.existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();
const needsBrowser = chromiumInstalled ? false : 'Chromium is not installed (npx playwright install chromium)';

const { structured, derived } = buildProfileData(RESUME);
const context = {
  profile: structured,
  derived,
  preferences: {
    ...structuredClone(DEFAULT_PREFERENCES),
    noticePeriod: '30 days',
    workAuthorization: [{ country: 'India', authorized: true, needsSponsorship: false }],
    standardAnswers: [{ key: 'why', question: 'Why do you want to work here?', answer: 'Your payments work matches mine.' }]
  },
  job: { title: 'Senior Backend Engineer', location: 'Bengaluru, India', company: { name: 'Acme Pay' } },
  tailored: { pdf: { filename: 'Ada_Lovelace_Resume.pdf' } }
};
const resumeFile = { name: 'Ada_Lovelace_Resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') };

let server;
let baseUrl;
const posts = [];

before(async () => {
  const app = express();
  app.use(express.static(FIXTURE_DIR));
  // Records any submission the page makes, so "we never submitted" is provable
  app.post('/submit', express.raw({ type: '*/*', limit: '10mb' }), (req, res) => {
    posts.push({ length: req.body?.length || 0, type: req.headers['content-type'] || '' });
    res.send('<html><body><h1>Thank you for applying</h1><p>Your application was submitted.</p></body></html>');
  });
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await closeBrowser();
});

const planFor = (descriptors) => buildFillPlan(descriptors, context, { useAi: false });

// Runs one adapter against a fixture page and hands the open adapter to the test
async function withAdapter(AdapterClass, fixture, fn) {
  return withContext(async (browserContext) => {
    await BaseAdapter.prepare(browserContext);
    const page = await browserContext.newPage();
    const adapter = new AdapterClass({ page, job: { applyUrl: `${baseUrl}/${fixture}` } });
    await adapter.open();
    return fn(adapter, page);
  }, { viewport: { width: 1280, height: 1200 } });
}

test('pickAdapter matches known ATS hosts and honours the feature flag', () => {
  assert.equal(pickAdapter('https://boards.greenhouse.io/acme/jobs/1').AdapterClass.id, 'greenhouse');
  assert.equal(pickAdapter('https://jobs.lever.co/acme/abc').AdapterClass.id, 'lever');
  assert.equal(pickAdapter('https://careers.example.com/jobs/1').enabled, false);
  assert.equal(pickAdapter('https://careers.example.com/jobs/1').reason, 'unsupported_site');
  assert.equal(pickAdapter('not a url').enabled, false);
  assert.equal(GreenhouseAdapter.canServerSubmit, true);
  assert.equal(LeverAdapter.canServerSubmit, true);
  assert.equal(BaseAdapter.canServerSubmit, false);

  const original = process.env.AGENT_SERVER_ADAPTERS;
  process.env.AGENT_SERVER_ADAPTERS = 'lever';
  try {
    assert.deepEqual(enabledAdapterIds(), ['lever']);
    const disabled = pickAdapter('https://boards.greenhouse.io/acme/jobs/1');
    assert.equal(disabled.enabled, false);
    assert.equal(disabled.reason, 'adapter_disabled');
  } finally {
    if (original === undefined) delete process.env.AGENT_SERVER_ADAPTERS;
    else process.env.AGENT_SERVER_ADAPTERS = original;
  }
});

test('fingerprint changes when the form changes', () => {
  const form = [{ selector: '#a', type: 'text', required: true }, { selector: '#b', type: 'email', required: false }];
  assert.equal(BaseAdapter.fingerprint(form), BaseAdapter.fingerprint([...form].reverse()));
  assert.notEqual(BaseAdapter.fingerprint(form), BaseAdapter.fingerprint([form[0]]));
});

test('Greenhouse form: fills every mapped field and submits nothing', { skip: needsBrowser }, async () => {
  posts.length = 0;
  await withAdapter(GreenhouseAdapter, 'greenhouse.html', async (adapter, page) => {
    const descriptors = await adapter.scan();
    assert.ok(descriptors.length >= 9, `scanned ${descriptors.length} fields`);
    assert.equal((await adapter.detectBlockers()).blocked, false);

    const plan = await planFor(descriptors);
    const result = await adapter.fill(plan, { resumeFile });

    assert.equal(await page.inputValue('#first_name'), 'Ada');
    assert.equal(await page.inputValue('#last_name'), 'Lovelace');
    assert.equal(await page.inputValue('#email'), 'ada@example.com');
    assert.equal(await page.inputValue('#auth'), '1', 'select resolves "Yes" to its option value');
    assert.equal(await page.inputValue('#why'), 'Your payments work matches mine.');
    assert.equal(await page.inputValue('#notice'), '30 days');
    assert.equal(await page.evaluate(() => document.querySelector('#resume').files.length), 1);
    assert.deepEqual(await adapter.verify(plan), []);
    assert.equal(result.failed.length, 0, JSON.stringify(result.failed));

    const screenshot = await adapter.screenshot();
    assert.equal(screenshot.subarray(1, 4).toString('utf8'), 'PNG');
    // Nothing reached the server: filling is not applying
    assert.equal(posts.length, 0);
  });
});

test('Greenhouse form: submits exactly once when asked', { skip: needsBrowser }, async () => {
  posts.length = 0;
  await withAdapter(GreenhouseAdapter, 'greenhouse.html', async (adapter) => {
    const plan = await planFor(await adapter.scan());
    await adapter.fill(plan, { resumeFile });
    const submitted = await adapter.submit();
    assert.equal(submitted.confirmed, true);
    // submit() reports the confirmation phrase it matched, not the whole page
    assert.match(submitted.text, /thank you/i);
    assert.equal(posts.length, 1, 'the form is submitted exactly once');
    assert.match(posts[0].type, /multipart\/form-data/);
  });
});

test('Lever form: fills name, links and the sponsorship radio group', { skip: needsBrowser }, async () => {
  posts.length = 0;
  await withAdapter(LeverAdapter, 'lever.html', async (adapter, page) => {
    const descriptors = await adapter.scan();
    // The radio group is one question, not one field per option
    const sponsorship = descriptors.find((item) => item.name === 'cards[sponsorship]');
    assert.ok(sponsorship);
    assert.deepEqual(sponsorship.options.map((option) => option.value), ['Yes', 'No']);

    const plan = await planFor(descriptors);
    await adapter.fill(plan, { resumeFile });
    assert.equal(await page.inputValue('input[name="name"]'), 'Ada Lovelace');
    assert.equal(await page.inputValue('input[name="org"]'), 'Acme');
    assert.equal(await page.evaluate(() => document.querySelector('input[name="cards[sponsorship]"][value="No"]').checked), true);
    assert.equal(posts.length, 0);
  });
});

test('awkward form: reads aria labels, drives a controlled input, and reports what it could not fill', { skip: needsBrowser }, async () => {
  posts.length = 0;
  await withAdapter(BaseAdapter, 'generic-messy.html', async (adapter, page) => {
    const descriptors = await adapter.scan();
    const labels = descriptors.map((item) => item.label);
    assert.ok(labels.includes('Given name'), JSON.stringify(labels));
    assert.ok(labels.includes('Email address'));

    const plan = await planFor(descriptors);
    await adapter.fill(plan, { resumeFile });

    // The framework-controlled input only accepts values delivered with a real input event
    assert.equal(await page.evaluate(() => document.getElementById('controlled-phone').value), '');
    assert.equal(await page.inputValue('input[name="q_7734"]'), 'ada@example.com');
    assert.equal(await page.inputValue('select[name="q_eeo"]'), 'decline');

    // "Which team interests you most?" is required and unknowable, so it is reported rather than invented
    assert.ok(plan.unmappedRequired.some((item) => item.label.includes('team')), JSON.stringify(plan.unmappedRequired));
    assert.equal(posts.length, 0);
  });
});

test('a captcha blocks server filling', { skip: needsBrowser }, async () => {
  await withAdapter(BaseAdapter, 'generic-messy.html?captcha=1', async (adapter) => {
    const blockers = await adapter.detectBlockers();
    assert.equal(blockers.captcha, true);
    assert.equal(blockers.blocked, true);
  });
});

test('a changed form is detected before submitting', { skip: needsBrowser }, async () => {
  await withAdapter(GreenhouseAdapter, 'greenhouse.html', async (adapter, page) => {
    const before = BaseAdapter.fingerprint(await adapter.scan());
    await page.evaluate(() => document.querySelector('#phone').remove());
    assert.notEqual(BaseAdapter.fingerprint(await adapter.scan()), before);
  });
});

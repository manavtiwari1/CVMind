import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { chromium } from 'playwright';
import { renderPdf, closeBrowser } from '../../src/agent/resume/pdf.js';
import { renderResumeHtml } from '../../src/agent/resume/atsTemplate.js';
import { parsePdf } from '../../src/services/parser.js';

// Chromium is installed separately (npx playwright install chromium), so skip rather than fail without it
const chromiumInstalled = (() => {
  try {
    return fs.existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

after(closeBrowser);

test('renders a real PDF whose text an ATS can read', { skip: chromiumInstalled ? false : 'Chromium is not installed (npx playwright install chromium)' }, async () => {
  const html = renderResumeHtml({
    contact: { name: 'Ada Lovelace', email: 'ada@example.com', location: 'Bengaluru' },
    headline: 'Senior Backend Engineer',
    summary: 'Engineer building payment systems.',
    experience: [{
      id: 'exp0', title: 'Senior Software Engineer', company: 'Acme', location: 'Bengaluru',
      startDate: '2020-01', endDate: '', current: true,
      bullets: [{ text: 'Built the billing pipeline behind payments checkout' }, { text: 'Led migration to Kubernetes' }]
    }],
    projects: [],
    skills: ['Node', 'Postgres'],
    education: [{ degree: 'B.Tech CSE', field: 'Computer Science', institution: 'IIT', endYear: '2019', gpa: '' }],
    certifications: [],
    languages: []
  });

  const pdf = await renderPdf(html);
  assert.equal(pdf.subarray(0, 5).toString('utf8'), '%PDF-');

  const text = await parsePdf(pdf);
  assert.match(text, /Ada Lovelace/);
  assert.match(text, /Built the billing pipeline behind payments checkout/);
  assert.match(text, /Jan 2020/);
});

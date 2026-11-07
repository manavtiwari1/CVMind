import test from 'node:test';
import assert from 'node:assert/strict';
import { diwaliEmail, DIWALI_EMAIL } from '../../src/services/emailTemplates.js';
import { renderEmail } from '../../src/admin/mailer.js';

test('the Diwali email carries the code, the dates and an https banner', () => {
  const { subject, html } = diwaliEmail({ name: 'Priya' });
  assert.match(subject, /Diwali/);
  assert.match(subject, /50%/);
  assert.ok(html.includes('LEODIWALI'));
  assert.ok(html.includes('12 November, 11:59 pm'));
  assert.ok(html.includes(`src="${DIWALI_EMAIL.image}"`));
  assert.ok(html.includes('Hi Priya,'));
  // Every link and image goes to our own https pages
  const urls = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('mailto:'));
  assert.ok(urls.length > 0);
  for (const u of urls) assert.match(u, /^https:\/\/(www|app)\.cvmind\.in(\/|$)/, u);
});

test('a name with markup cannot inject HTML into the Diwali email', () => {
  const { html } = diwaliEmail({ name: '<img src=x onerror=alert(1)>' });
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x'));
});

test('the banner is only shown for an https image', () => {
  assert.ok(renderEmail({ title: 'T', heroImage: 'https://www.cvmind.in/email/x.jpg', heroAlt: 'a' }).includes('x.jpg'));
  assert.ok(!renderEmail({ title: 'T', heroImage: 'http://evil.example/x.jpg' }).includes('evil.example'));
  assert.ok(!renderEmail({ title: 'T', heroImage: 'javascript:alert(1)' }).includes('javascript:'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { leoLiveEmail, LEO_LIVE_EMAIL } from '../../src/services/emailTemplates.js';

test('the Leo email shows its banner, opens the chat and links only to our own pages', () => {
  const { subject, html } = leoLiveEmail({ name: 'Priya' });
  assert.match(subject, /Leo is on/);
  assert.ok(html.includes(`src="${LEO_LIVE_EMAIL.image}"`));
  assert.ok(html.includes(`href="${LEO_LIVE_EMAIL.chatUrl}"`));
  assert.ok(html.includes('Hi Priya,'));
  const urls = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('mailto:'));
  for (const u of urls) assert.match(u, /^https:\/\/(www|app)\.cvmind\.in(\/|$)/, u);
});

test('a name with markup cannot inject HTML into the Leo email', () => {
  const { html } = leoLiveEmail({ name: '<img src=x onerror=alert(1)>' });
  assert.ok(!html.includes('<img src=x'));
});

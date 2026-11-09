import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;
let server;
let base;
let mongoose;
let opt;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_unsub_test');
  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  opt = await import('../../src/services/emailOptOut.js');
  const { createGrowthRouter } = await import('../../src/routes/growth.js');
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));
  await opt.EmailOptOut.init();
  const app = express();
  app.use(express.json());
  app.use(createGrowthRouter());
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

const path = (email) => `/api/email/unsubscribe/${opt.unsubscribeToken(email)}`;

test('opening the link only asks, so a mail scanner cannot unsubscribe anyone', async () => {
  const res = await fetch(`${base}${path('scanned@example.com')}`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /Unsubscribe from CVMind emails/);
  assert.match(html, /s\*\*\*@example\.com/);
  assert.ok(!html.includes('scanned@'));
  assert.equal(await opt.isOptedOut('scanned@example.com'), false);
});

test('the page button unsubscribes, and the person can subscribe again', async () => {
  const email = 'Button@Example.com';
  const out = await (await fetch(`${base}${path(email)}?do=unsubscribe`)).text();
  assert.match(out, /You are unsubscribed/);
  assert.equal(await opt.isOptedOut('button@example.com'), true);
  assert.match(await (await fetch(`${base}${path(email)}`)).text(), /You are unsubscribed/);
  assert.match(await (await fetch(`${base}${path(email)}?do=resubscribe`)).text(), /subscribed again/);
  assert.equal(await opt.isOptedOut(email), false);
});

test('a mail app button unsubscribes with one POST', async () => {
  const res = await fetch(`${base}${path('oneclick@example.com')}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
  assert.equal(res.status, 200);
  assert.equal(await opt.isOptedOut('oneclick@example.com'), true);
});

test('a link cannot be made or altered for someone else', async () => {
  const forged = `${Buffer.from('victim@example.com').toString('base64url')}.${opt.unsubscribeToken('me@example.com').split('.')[1]}`;
  assert.equal(opt.emailFromToken(forged), null);
  assert.equal((await fetch(`${base}/api/email/unsubscribe/${forged}?do=unsubscribe`)).status, 404);
  assert.equal((await fetch(`${base}/api/email/unsubscribe/${forged}`, { method: 'POST' })).status, 404);
  assert.equal(await opt.isOptedOut('victim@example.com'), false);
  assert.equal(opt.emailFromToken('garbage'), null);
});

test('people who unsubscribed are left out, and the rest get the link and headers', async () => {
  await opt.optOut('gone@example.com');
  const left = await opt.withoutOptedOut([{ email: 'GONE@example.com' }, { email: 'stay@example.com' }]);
  assert.deepEqual(left, [{ email: 'stay@example.com' }]);
  const { url, headers } = opt.optOutFields('stay@example.com');
  assert.match(url, /\/api\/email\/unsubscribe\//);
  assert.equal(headers['List-Unsubscribe'], `<${url}>`);
  assert.equal(headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  const { notificationEmail } = await import('../../src/services/emailTemplates.js');
  assert.ok(notificationEmail({ name: 'P', title: 'T', body: 'B', unsubscribeUrl: 'https://x.example/u' }).html.includes('Unsubscribe'));
});

test('the Account page switch reads and changes the same setting as the email link', async () => {
  const { createUser } = await import('../../src/db.js');
  const { signToken } = await import('../../src/services/authToken.js');
  const email = 'account-switch@example.com';
  const user = await createUser({ email, name: 'Priya', password: 'hash', emailVerified: true });
  const token = signToken({ sub: String(user._id || user.id), kind: 'user', email });
  const prefs = (method, body) => fetch(`${base}/api/user/email-preferences`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });

  assert.equal((await (await prefs('GET')).json()).subscribed, true);
  assert.equal((await prefs('PUT', { subscribed: false })).status, 200);
  assert.equal(await opt.isOptedOut(email), true);

  // Unsubscribed from an email, back on from the Account page
  assert.equal((await (await prefs('GET')).json()).subscribed, false);
  await prefs('PUT', { subscribed: true });
  assert.equal(await opt.isOptedOut(email), false);

  assert.equal((await prefs('PUT', { subscribed: 'no' })).status, 400);
  assert.equal((await fetch(`${base}/api/user/email-preferences`)).status, 401);
});

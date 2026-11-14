import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// db.js and the admin module read MONGODB_URI at import time, so the in-memory server starts first
let mongod;
let mongoose;
let bf;
let tpl;
let coupons;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_bf_test');
  process.env.RESEND_API_KEY = '';
  mongoose = (await import('mongoose')).default;
  await import('../../src/db.js');
  bf = await import('../../src/services/blackFriday.js');
  tpl = await import('../../src/services/emailTemplates.js');
  coupons = await import('../../src/admin/coupons.js');
  const { dbReady } = await import('../../src/admin/auth.js');
  await dbReady(20000);
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const IST = (d, h = 0, m = 0) => Date.UTC(2026, 10, d, h, m) - 5.5 * 60 * 60 * 1000;

test('rounds fall every 48 hours from midnight IST on 19 Nov and stop after 30 Nov', () => {
  assert.equal(bf.currentRound(IST(18, 23, 59)), -1);
  assert.equal(bf.currentRound(IST(19)), 0);
  assert.equal(bf.currentRound(IST(20, 23, 59)), 0);
  assert.equal(bf.currentRound(IST(21)), 1);
  assert.equal(bf.currentRound(IST(29)), 5);
  assert.equal(bf.currentRound(IST(30, 23, 58)), 5);
  assert.equal(bf.currentRound(IST(30, 23, 59) + 60 * 1000), -1);
});

test('the coupon is made once, gives 50% and only works during the sale', async () => {
  await bf.ensureBlackFridayCoupon();
  await bf.ensureBlackFridayCoupon();
  const { Coupon } = await import('../../src/admin/models.js');
  assert.equal(await Coupon.countDocuments({ code: 'BLACKFRIDAY' }), 1);
  const c = await Coupon.findOne({ code: 'BLACKFRIDAY' }).lean();
  assert.equal(c.value, 50);
  assert.equal(c.validFrom.getTime(), IST(19));
  assert.equal(c.validTo.getTime(), IST(30, 24));
  // Before the sale (today) the code is refused
  const early = await coupons.evaluateCoupon('blackfriday', { email: 'a@b.in', amount: 199 });
  assert.equal(early.ok, false);
  assert.match(early.error, /not active yet/);
});

test('each round is sent once, to verified non-Pro users who did not opt out', async () => {
  const User = mongoose.model('User');
  await User.create([
    { email: 'free@x.in', name: 'Free', password: 'x', emailVerified: true },
    { email: 'unverified@x.in', name: 'U', password: 'x', emailVerified: false },
    { email: 'pro@x.in', name: 'Pro', password: 'x', emailVerified: true },
    { email: 'out@x.in', name: 'Out', password: 'x', emailVerified: true },
    { email: 'banned@x.in', name: 'B', password: 'x', emailVerified: true, status: 'banned' }
  ]);
  const { Subscription } = await import('../../src/billing/models.js');
  await Subscription.collection.insertOne({ email: 'pro@x.in', status: 'active', expiresAt: new Date(Date.now() + 864e5 * 60) });
  const { optOut } = await import('../../src/services/emailOptOut.js');
  await optOut('out@x.in');

  const batches = [];
  const send = async (msgs) => { batches.push(msgs); return { sent: msgs.length, failed: 0, errors: [] }; };
  const first = await bf.runBlackFridayMail({ now: IST(19, 0, 5), send });
  assert.deepEqual(batches[0].map((m) => m.to), ['free@x.in']);
  assert.equal(first.sent, 1);
  assert.match(batches[0][0].subject, /Black Friday/);
  assert.ok(batches[0][0].html.includes('BLACKFRIDAY'));
  assert.ok(batches[0][0].headers['List-Unsubscribe']);

  // Same round again: nothing more goes out
  await bf.runBlackFridayMail({ now: IST(20, 12), send });
  assert.equal(batches.length, 1);
  // The next round, 48 hours later, goes out with a different subject
  await bf.runBlackFridayMail({ now: IST(21, 0, 10), send });
  assert.equal(batches.length, 2);
  assert.notEqual(batches[1][0].subject, batches[0][0].subject);
  // After the sale: nothing
  const late = await bf.runBlackFridayMail({ now: IST(30, 24, 1), send });
  assert.ok(late.skipped);
  assert.equal(batches.length, 2);
});

test('every link in the email goes to our own https pages and names are escaped', () => {
  const { html } = tpl.blackFridayEmail({ name: '<b>x</b>', round: 5 });
  assert.ok(html.includes('&lt;b&gt;x'));
  assert.ok(html.includes('30 November, 11:59 pm IST'));
  const urls = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('mailto:'));
  for (const u of urls) assert.match(u, /^https:\/\/(www|app)\.cvmind\.in(\/|$)/, u);
});

test('the email carries the Gmail deal badge with the code and end date', () => {
  const { html } = tpl.blackFridayEmail({ name: 'A', round: 0 });
  const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(json && html.indexOf(json[0]) < html.indexOf('</head>'));
  const deal = JSON.parse(json[1]).find((x) => x['@type'] === 'DiscountOffer');
  assert.equal(deal.discountCode, 'BLACKFRIDAY');
  assert.equal(new Date(deal.availabilityEnds).getTime(), Date.UTC(2026, 10, 30, 18, 29));
});

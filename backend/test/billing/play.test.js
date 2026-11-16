import test from 'node:test';
import assert from 'node:assert/strict';

import { PLAY_PRODUCTS, PlayError, playAccountId, verifyPlayPurchase } from '../../src/billing/play.js';
import { addToken, isExpoPushToken, removeToken, sendPush, MAX_TOKENS_PER_USER } from '../../src/services/push.js';

// Google Play is faked: products.get returns `purchase`, and :consume calls are counted.
function fakePlay(purchase, { status = 200 } = {}) {
  const calls = { get: 0, consume: 0, urls: [] };
  const fetchImpl = async (url, opts = {}) => {
    calls.urls.push(String(url));
    if (String(url).endsWith(':consume')) {
      calls.consume += 1;
      return new Response(null, { status: 204 });
    }
    calls.get += 1;
    assert.equal(opts.headers.Authorization, 'Bearer test-access');
    return new Response(JSON.stringify(purchase), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, fetchImpl, getAccessToken: async () => 'test-access' };
}

// activatePlan stand-in with the same idempotency: one subscription per orderId
function fakeActivate() {
  const byOrder = new Map();
  const activate = async (args) => {
    if (!byOrder.has(args.orderId)) byOrder.set(args.orderId, { ...args, expiresAt: new Date('2027-01-01') });
    return byOrder.get(args.orderId);
  };
  return { byOrder, activate };
}

const user = { userId: 'u1', email: 'a@example.com' };

test('a paid purchase turns Pro on as the matching plan, then is consumed', async () => {
  const play = fakePlay({ purchaseState: 0, consumptionState: 0, orderId: 'GPA.1', obfuscatedExternalAccountId: playAccountId('u1') });
  const db = fakeActivate();
  const out = await verifyPlayPurchase({ ...user, productId: 'pro_half_yearly', purchaseToken: 'tok-1' }, { ...play, activate: db.activate });
  assert.equal(out.plan, 'half-yearly');
  const sub = db.byOrder.get('play:GPA.1');
  assert.equal(sub.source, 'play');
  assert.equal(sub.email, 'a@example.com');
  assert.equal(sub.plan, 'half-yearly');
  assert.equal(play.calls.consume, 1);
  assert.match(play.calls.urls[0], /\/applications\/in\.cvmind\.app\/purchases\/products\/pro_half_yearly\/tokens\/tok-1$/);
});

test('verifying the same purchase twice grants Pro once and does not consume it again', async () => {
  const db = fakeActivate();
  const first = fakePlay({ purchaseState: 0, consumptionState: 0, orderId: 'GPA.2' });
  await verifyPlayPurchase({ ...user, productId: 'pro_monthly', purchaseToken: 'tok-2' }, { ...first, activate: db.activate });
  const again = fakePlay({ purchaseState: 0, consumptionState: 1, orderId: 'GPA.2' });
  await verifyPlayPurchase({ ...user, productId: 'pro_monthly', purchaseToken: 'tok-2' }, { ...again, activate: db.activate });
  assert.equal(db.byOrder.size, 1);
  assert.equal(again.calls.consume, 0);
});

test('pending, cancelled and other-account purchases are refused', async () => {
  const db = fakeActivate();
  const cases = [
    [{ purchaseState: 2 }, 'PLAY_PENDING', 409],
    [{ purchaseState: 1 }, 'PLAY_INVALID', 400],
    [{ purchaseState: 0, obfuscatedExternalAccountId: playAccountId('someone-else') }, 'PLAY_OTHER_ACCOUNT', 403],
  ];
  for (const [purchase, code, status] of cases) {
    const play = fakePlay({ orderId: 'GPA.x', ...purchase });
    await assert.rejects(verifyPlayPurchase({ ...user, productId: 'pro_yearly', purchaseToken: 'tok-x' }, { ...play, activate: db.activate }), (err) => {
      assert.ok(err instanceof PlayError);
      assert.equal(err.code, code);
      assert.equal(err.status, status);
      return true;
    });
    assert.equal(play.calls.consume, 0);
  }
  assert.equal(db.byOrder.size, 0);
});

test('unknown products, missing tokens and tokens Google does not know are refused', async () => {
  const db = fakeActivate();
  const play = fakePlay({ purchaseState: 0 });
  await assert.rejects(verifyPlayPurchase({ ...user, productId: 'free_money', purchaseToken: 't' }, { ...play, activate: db.activate }), /Unknown product/);
  await assert.rejects(verifyPlayPurchase({ ...user, productId: 'pro_monthly', purchaseToken: '' }, { ...play, activate: db.activate }), /Missing purchase token/);
  const missing = fakePlay({}, { status: 404 });
  await assert.rejects(verifyPlayPurchase({ ...user, productId: 'pro_monthly', purchaseToken: 'nope' }, { ...missing, activate: db.activate }), /not found on Google Play/);
  assert.equal(db.byOrder.size, 0);
});

test('without a service account the route says payments are not available', async () => {
  const saved = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
  delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
  try {
    await assert.rejects(verifyPlayPurchase({ ...user, productId: 'pro_monthly', purchaseToken: 't' }), (err) => err.code === 'PLAY_NOT_CONFIGURED' && err.status === 503);
  } finally {
    if (saved !== undefined) process.env.GOOGLE_PLAY_SERVICE_ACCOUNT = saved;
  }
});

test('every Play product maps to a website plan', async () => {
  const { PLANS } = await import('../../src/billing/plans.js');
  for (const plan of Object.values(PLAY_PRODUCTS)) assert.ok(PLANS[plan], `${plan} is a plan`);
});

test('push tokens: valid format, newest first, no duplicates, capped', () => {
  assert.ok(isExpoPushToken('ExponentPushToken[abcdefghijklmnop]'));
  assert.ok(!isExpoPushToken('hello'));
  let list = [];
  for (let i = 0; i < MAX_TOKENS_PER_USER + 2; i++) list = addToken(list, `ExponentPushToken[token${String(i).padStart(10, '0')}]`, 'android');
  assert.equal(list.length, MAX_TOKENS_PER_USER);
  list = addToken(list, list[3].token, 'android');
  assert.equal(list[0].token, `ExponentPushToken[token${String(3).padStart(10, '0')}]`);
  assert.equal(new Set(list.map((t) => t.token)).size, list.length);
  assert.equal(removeToken(list, list[0].token).length, list.length - 1);
});

test('sendPush batches messages and reports tokens that are gone', async () => {
  const good = 'ExponentPushToken[aaaaaaaaaaaaaaaa]';
  const gone = 'ExponentPushToken[bbbbbbbbbbbbbbbb]';
  let body;
  const fetchImpl = async (url, opts) => {
    body = JSON.parse(opts.body);
    return new Response(JSON.stringify({ data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }] }), { status: 200 });
  };
  const out = await sendPush([good, gone, 'not-a-token', good], { title: 'Hi', body: 'There' }, { fetchImpl });
  assert.equal(body.length, 2);
  assert.equal(body[0].title, 'Hi');
  assert.deepEqual(out, { sent: 1, failed: 1, invalid: [gone] });
});

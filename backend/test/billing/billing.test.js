import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';

// db.js and the admin module read MONGODB_URI at import time, so the in-memory server starts first
let mongod;
let server;
let base;
let mongoose;
let signToken;
let ownerToken;
let billing;
let models;
let settleOrder;
let isUserPaid;
let realFetch;
const cashfree = { status: 'ACTIVE', calls: 0 };

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_billing_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = '';
  process.env.CASHFREE_APP_ID = 'test-app';
  process.env.CASHFREE_SECRET_KEY = 'test-secret';

  // Cashfree is faked; everything else (the test's own requests) goes through
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('cashfree.com')) {
      cashfree.calls += 1;
      const u = String(url);
      const body = u.endsWith('/orders') ? { payment_session_id: 'session_123', order_status: 'ACTIVE' }
        : u.endsWith('/payments') ? [{ payment_status: 'SUCCESS', cf_payment_id: 99, payment_group: 'upi' }]
        : { order_status: cashfree.status };
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(url, opts);
  };

  const express = (await import('express')).default;
  mongoose = (await import('mongoose')).default;
  ({ signToken } = await import('../../src/services/authToken.js'));
  ({ isUserPaid } = await import('../../src/db.js'));
  const adminRouter = (await import('../../src/admin/router.js')).default;
  const billingRoutes = await import('../../src/billing/routes.js');
  settleOrder = billingRoutes.settleOrder;
  billing = await import('../../src/billing/gate.js');
  models = await import('../../src/billing/models.js');
  const { chargeAiUsage, keepAiContext } = await import('../../src/billing/aiContext.js');
  const multer = (await import('multer')).default;
  const upload = multer({ storage: multer.memoryStorage() });
  const { installSessionValidator } = await import('../../src/admin/sessions.js');
  installSessionValidator();

  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  const app = express();
  app.use(express.json({ verify: (req, res, buf) => { if (req.originalUrl.endsWith('/api/billing/webhook')) req.rawBody = buf.toString('utf8'); } }));
  app.use(billing.aiBudgetGate);
  app.use('/api/admin', adminRouter);
  app.use('/', billingRoutes.default);
  // Stand-ins for the real AI routes: each "spends" the tokens it is asked to
  app.post('/api/tailor', billing.requireFreeUse('tailor'), (req, res) => {
    chargeAiUsage({ total_tokens: Number(req.body?.spend || 0) });
    res.json({ ok: true });
  });
  // Like the real upload routes: multer parses the file, then the handler awaits before calling the AI
  app.post('/api/prep', keepAiContext(upload.single('resume')), async (req, res) => {
    await new Promise((r) => setTimeout(r, 20));
    chargeAiUsage({ prompt_tokens: 300, completion_tokens: 200 });
    res.json({ ok: true });
  });
  app.post('/api/code/ai/hint', billing.requireFreeUse(billing.codeHintFeature), (req, res) => res.json({ ok: true }));
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

async function call(path, { method = 'GET', token, body, headers = {}, raw } = {}) {
  const res = await realFetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? (body ? JSON.stringify(body) : undefined)
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function userToken(email) {
  const user = await mongoose.model('User').create({ email, name: email.split('@')[0], password: 'x' });
  return signToken({ sub: String(user._id), kind: 'user', email });
}

const DAY = 24 * 60 * 60 * 1000;

test('nobody is Pro until a subscription is added, and plans stack', async () => {
  assert.equal(await isUserPaid({ email: 'stack@example.com' }), false);
  const give = (body) => call('/api/admin/subscriptions', { method: 'POST', token: ownerToken, body });
  assert.equal((await give({ email: 'stack@example.com', plan: 'pass-7d' })).status, 200);
  assert.equal(await isUserPaid({ email: 'STACK@example.com' }), true);

  const second = await give({ email: 'stack@example.com', plan: 'pass-3d' });
  const days = (new Date(second.body.expiresAt) - Date.now()) / DAY;
  assert.ok(days > 9.9 && days < 10.1, `3 days should stack on 7, got ${days}`);

  assert.equal((await give({ email: 'stack@example.com', plan: 'custom', days: 0 })).status, 400);
  assert.equal((await give({ email: 'bad', plan: 'monthly' })).status, 400);

  const list = await call('/api/admin/subscriptions?q=stack', { token: ownerToken });
  assert.equal(list.body.stats.activeSubscribers, 1);
  const first = list.body.data.find((s) => s.plan === 'pass-7d');
  assert.equal((await call(`/api/admin/subscriptions/${first.id}/cancel`, { method: 'POST', token: ownerToken, body: {} })).status, 200);
  // The 3-day pass moves up to start now, so the account stays Pro for about 3 days
  const sub = await models.Subscription.findOne({ email: 'stack@example.com', plan: 'pass-3d' }).lean();
  const left = (new Date(sub.expiresAt) - Date.now()) / DAY;
  assert.ok(left > 2.9 && left < 3.1, `got ${left}`);
  assert.equal(await isUserPaid({ email: 'stack@example.com' }), true);
});

test('free accounts get two tailors a week; Pro is unlimited', async () => {
  const token = await userToken('weekly@example.com');
  assert.equal((await call('/api/tailor', { method: 'POST', token, body: {} })).status, 200);
  assert.equal((await call('/api/tailor', { method: 'POST', token, body: {} })).status, 200);
  const third = await call('/api/tailor', { method: 'POST', token, body: {} });
  assert.equal(third.status, 402);
  assert.equal(third.body.code, 'UPGRADE_REQUIRED');

  // Uses older than a week no longer count
  await models.FeatureUse.updateMany({ email: 'weekly@example.com' }, { createdAt: new Date(Date.now() - 8 * DAY) });
  assert.equal((await call('/api/tailor', { method: 'POST', token, body: {} })).status, 200);

  await call('/api/admin/subscriptions', { method: 'POST', token: ownerToken, body: { email: 'weekly@example.com', plan: 'monthly' } });
  for (let i = 0; i < 3; i++) assert.equal((await call('/api/tailor', { method: 'POST', token, body: {} })).status, 200);

  const me = await call('/api/billing/me', { token });
  assert.equal(me.body.pro, true);
  assert.equal(me.body.subscription.plan, 'monthly');
});

test('code hints: the first four levels are free, explanation and solution twice a week', async () => {
  const token = await userToken('coder@example.com');
  for (let i = 0; i < 5; i++) assert.equal((await call('/api/code/ai/hint', { method: 'POST', token, body: { requestedLevel: 4 } })).status, 200);
  for (let i = 0; i < 2; i++) assert.equal((await call('/api/code/ai/hint', { method: 'POST', token, body: { requestedLevel: 6 } })).status, 200);
  assert.equal((await call('/api/code/ai/hint', { method: 'POST', token, body: { requestedLevel: 6 } })).status, 402);
  // The explanation has its own two
  assert.equal((await call('/api/code/ai/hint', { method: 'POST', token, body: { requestedLevel: 5 } })).status, 200);
});

test('AI tokens: 75,000 per 3 days free, 2,00,000 with Pro', async () => {
  const token = await userToken('tokens@example.com');
  // Spend through a Pro account's tailor allowance so the weekly limit isn't what stops it
  await call('/api/admin/subscriptions', { method: 'POST', token: ownerToken, body: { email: 'tokens@example.com', plan: 'pass-3d' } });
  assert.equal((await call('/api/tailor', { method: 'POST', token, body: { spend: 190000 } })).status, 200);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal((await call('/api/tailor', { method: 'POST', token, body: { spend: 10000 } })).status, 200);
  await new Promise((r) => setTimeout(r, 100));
  const blocked = await call('/api/tailor', { method: 'POST', token, body: {} });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'TOKEN_LIMIT');
  assert.equal(blocked.body.limit, 200000);

  const free = await userToken('free-tokens@example.com');
  await models.AiUsage.create({ email: 'free-tokens@example.com', tokens: 75000 });
  const freeBlocked = await call('/api/tailor', { method: 'POST', token: free, body: {} });
  assert.equal(freeBlocked.status, 429);
  assert.equal(freeBlocked.body.limit, 75000);

  // Spending from more than 3 days ago doesn't count
  await models.AiUsage.updateMany({ email: 'free-tokens@example.com' }, { createdAt: new Date(Date.now() - 4 * DAY) });
  assert.equal((await call('/api/tailor', { method: 'POST', token: free, body: {} })).status, 200);
});

test('admins can add extra AI tokens to an account and take them back', async () => {
  const token = await userToken('bonus@example.com');
  await models.AiUsage.create({ email: 'bonus@example.com', tokens: 75000 });
  assert.equal((await call('/api/tailor', { method: 'POST', token, body: {} })).status, 429);

  assert.equal((await call('/api/admin/subscriptions/tokens', { method: 'POST', token: ownerToken, body: { email: 'bonus@example.com', tokens: 0, days: 3 } })).status, 400);
  const added = await call('/api/admin/subscriptions/tokens', { method: 'POST', token: ownerToken, body: { email: 'Bonus@example.com', tokens: 50000, days: 3 } });
  assert.equal(added.status, 200);
  assert.equal((await call('/api/tailor', { method: 'POST', token, body: {} })).status, 200);

  const usage = await call('/api/admin/subscriptions/usage/bonus@example.com', { token: ownerToken });
  assert.equal(usage.body.tokens.limit, 125000);
  assert.equal(usage.body.tokens.bonus, 50000);
  assert.equal(usage.body.grants.length, 1);

  assert.equal((await call(`/api/admin/subscriptions/tokens/${usage.body.grants[0].id}`, { method: 'DELETE', token: ownerToken })).status, 200);
  assert.equal((await call('/api/tailor', { method: 'POST', token, body: {} })).status, 429);
});

test('a Cashfree payment turns Pro on exactly once', async () => {
  const token = await userToken('buyer@example.com');
  assert.equal((await call('/api/billing/checkout', { method: 'POST', token, body: { plan: 'monthly', phone: '12345' } })).status, 400);
  const checkout = await call('/api/billing/checkout', { method: 'POST', token, body: { plan: 'monthly', phone: '+91 98765 43210' } });
  assert.equal(checkout.status, 200);
  assert.equal(checkout.body.paymentSessionId, 'session_123');
  const { orderId } = checkout.body;

  const pending = await call('/api/billing/verify', { method: 'POST', token, body: { orderId } });
  assert.equal(pending.body.status, 'pending');
  assert.equal(await isUserPaid({ email: 'buyer@example.com' }), false);

  // Someone else can't confirm this order
  const other = await userToken('other-buyer@example.com');
  assert.equal((await call('/api/billing/verify', { method: 'POST', token: other, body: { orderId } })).status, 404);

  cashfree.status = 'PAID';
  // The return page and the webhook arrive together
  const [a, b] = await Promise.all([settleOrder(orderId), settleOrder(orderId)]);
  assert.equal(a.status, 'paid');
  assert.equal(b.status, 'paid');
  assert.equal(await models.Subscription.countDocuments({ orderId }), 1);
  assert.equal(await mongoose.model('PaymentLog').countDocuments({ transactionId: orderId }), 1);
  assert.equal(await isUserPaid({ email: 'buyer@example.com' }), true);
  const order = await models.PaymentOrder.findOne({ orderId }).lean();
  assert.equal(order.paymentMethod, 'upi');
  cashfree.status = 'ACTIVE';
});

test('the webhook only accepts Cashfree-signed requests', async () => {
  const raw = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'cvm_missing' } } });
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', 'test-secret').update(ts + raw).digest('base64');
  assert.equal((await call('/api/billing/webhook', { method: 'POST', raw, headers: { 'x-webhook-timestamp': ts, 'x-webhook-signature': 'forged' } })).status, 401);
  assert.equal((await call('/api/billing/webhook', { method: 'POST', raw, headers: { 'x-webhook-timestamp': ts, 'x-webhook-signature': sig } })).status, 200);
});

test('plans are public', async () => {
  const res = await call('/api/billing/plans');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.plans.map((p) => [p.key, p.price]), [['pass-3d', 39], ['pass-7d', 79], ['monthly', 189], ['half-yearly', 600], ['yearly', 1099]]);
  assert.equal(res.body.tokenLimits.free, 75000);
  assert.equal(res.body.payments.enabled, true);
});

test('tokens spent after a file upload are charged to the account', async () => {
  const token = await userToken('upload@example.com');
  const form = new FormData();
  form.append('resume', new Blob(['hello'], { type: 'text/plain' }), 'cv.txt');
  const res = await realFetch(`${base}/api/prep`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  assert.equal(res.status, 200);
  await new Promise((r) => setTimeout(r, 100));
  const rows = await models.AiUsage.find({ email: 'upload@example.com' }).lean();
  assert.equal(rows.reduce((n, r) => n + r.tokens, 0), 500);
});

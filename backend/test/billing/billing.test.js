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
const cashfree = { status: 'ACTIVE', calls: 0, refundStatus: 200, refunds: [] };
const sentEmails = [];

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_billing_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = '';
  process.env.CASHFREE_APP_ID = 'test-app';
  process.env.CASHFREE_SECRET_KEY = 'test-secret';
  // Checkout tests run as if after launch; the launch test moves this
  process.env.PAYMENTS_OPEN_AT = '2026-01-01T00:00:00+05:30';

  // Cashfree is faked; everything else (the test's own requests) goes through
  realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('cashfree.com')) {
      cashfree.calls += 1;
      const u = String(url);
      if (u.endsWith('/refunds')) {
        cashfree.refunds.push(JSON.parse(opts.body));
        const ok = cashfree.refundStatus === 200;
        return new Response(JSON.stringify(ok ? { refund_status: 'PENDING' } : { message: 'refund failed' }), { status: cashfree.refundStatus, headers: { 'Content-Type': 'application/json' } });
      }
      const body = u.endsWith('/orders') ? { payment_session_id: 'session_123', order_status: 'ACTIVE' }
        : u.endsWith('/payments') ? [{ payment_status: 'SUCCESS', cf_payment_id: 99, payment_group: 'upi' }]
        : { order_status: cashfree.status };
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).includes('api.resend.com')) {
      sentEmails.push(JSON.parse(opts.body));
      return new Response(JSON.stringify({ id: `email_${sentEmails.length}` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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

async function paidOrder(email, plan = 'monthly') {
  const token = await userToken(email);
  const checkout = await call('/api/billing/checkout', { method: 'POST', token, body: { plan, phone: '9876543210' } });
  cashfree.status = 'PAID';
  await settleOrder(checkout.body.orderId);
  cashfree.status = 'ACTIVE';
  const log = await mongoose.model('PaymentLog').findOne({ transactionId: checkout.body.orderId }).lean();
  return { orderId: checkout.body.orderId, logId: String(log._id), token };
}

const waitForMail = async (to, subjectPart) => {
  for (let i = 0; i < 60; i++) {
    const found = sentEmails.find((m) => m.to.includes(to) && m.subject.includes(subjectPart));
    if (found) return found;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
};

const GOOD_REASON = { category: 'not-working', details: 'The PDF download fails every time I export my resume on Chrome.', acknowledged: true };

test('an admin refund pays the money back through Cashfree and ends that Pro time', async () => {
  const { orderId, logId } = await paidOrder('refund@example.com');
  assert.equal(await isUserPaid({ email: 'refund@example.com' }), true);

  const refund = (body) => call(`/api/admin/payments/${logId}/refund`, { method: 'POST', token: ownerToken, body });
  assert.equal((await refund({})).status, 400);
  const res = await refund({ reason: 'Charged twice' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'refunded');
  assert.deepEqual(cashfree.refunds.at(-1), { refund_amount: 189, refund_id: `rf_${orderId}`, refund_note: 'Charged twice' });
  assert.equal(await isUserPaid({ email: 'refund@example.com' }), false);
  assert.equal((await models.Subscription.findOne({ orderId }).lean()).status, 'cancelled');
  // A second refund is refused before reaching Cashfree
  const before = cashfree.refunds.length;
  assert.equal((await refund({ reason: 'again' })).status, 400);
  assert.equal(cashfree.refunds.length, before);
});

test('a refund Cashfree rejects leaves the payment and Pro as they were', async () => {
  const { logId } = await paidOrder('refund-fail@example.com');
  cashfree.refundStatus = 400;
  const res = await call(`/api/admin/payments/${logId}/refund`, { method: 'POST', token: ownerToken, body: { reason: 'Test' } });
  cashfree.refundStatus = 200;
  assert.equal(res.status, 502);
  assert.equal((await mongoose.model('PaymentLog').findById(logId).lean()).status, 'success');
  assert.equal(await isUserPaid({ email: 'refund-fail@example.com' }), true);

  // Already refunded at Cashfree (an earlier try that didn't finish): still marked refunded here
  cashfree.refundStatus = 409;
  const retry = await call(`/api/admin/payments/${logId}/refund`, { method: 'POST', token: ownerToken, body: { reason: 'Test' } });
  cashfree.refundStatus = 200;
  assert.equal(retry.status, 200);
  assert.equal(await isUserPaid({ email: 'refund-fail@example.com' }), false);
});

test('a paid order emails one PDF invoice, numbered in order', async () => {
  process.env.RESEND_API_KEY = 're_test';
  try {
    const { orderId } = await paidOrder('invoice@example.com');
    const { sendInvoice } = await import('../../src/billing/invoice.js');
    // settleOrder sends it without waiting
    for (let i = 0; i < 50 && !sentEmails.some((m) => m.to.includes('invoice@example.com')); i++) await new Promise((r) => setTimeout(r, 50));
    const mails = sentEmails.filter((m) => m.to.includes('invoice@example.com'));
    assert.equal(mails.length, 1);
    const order = await models.PaymentOrder.findOne({ orderId }).lean();
    assert.match(order.invoiceNumber, /^CVM-\d{4}-\d{4}$/);
    assert.ok(order.invoiceSentAt);
    assert.equal(mails[0].subject, `Your CVMind invoice ${order.invoiceNumber}`);
    assert.equal(mails[0].attachments[0].filename, `CVMind-Invoice-${order.invoiceNumber}.pdf`);
    assert.equal(Buffer.from(mails[0].attachments[0].content, 'base64').subarray(0, 5).toString(), '%PDF-');

    // Never twice for the same order
    assert.equal(await sendInvoice(orderId), false);
    assert.equal(sentEmails.filter((m) => m.to.includes('invoice@example.com')).length, 1);

    const next = await paidOrder('invoice2@example.com');
    for (let i = 0; i < 50 && !(await models.PaymentOrder.findOne({ orderId: next.orderId }).lean()).invoiceNumber; i++) await new Promise((r) => setTimeout(r, 50));
    const second = await models.PaymentOrder.findOne({ orderId: next.orderId }).lean();
    assert.equal(Number(second.invoiceNumber.slice(-4)), Number(order.invoiceNumber.slice(-4)) + 1);
  } finally {
    process.env.RESEND_API_KEY = '';
  }
});

test('the sweep turns on Pro for a paid order nobody came back for', async () => {
  const token = await userToken('lost-return@example.com');
  const checkout = await call('/api/billing/checkout', { method: 'POST', token, body: { plan: 'pass-7d', phone: '9876543210' } });
  const { orderId } = checkout.body;
  // No webhook and no return page: the order is still "created" here, but paid at Cashfree
  await models.PaymentOrder.updateOne({ orderId }, { createdAt: new Date(Date.now() - 5 * 60 * 1000) });
  cashfree.status = 'PAID';
  const { sweepOrders } = await import('../../src/billing/routes.js');
  const result = await sweepOrders();
  cashfree.status = 'ACTIVE';
  assert.ok(result.settled >= 1);
  assert.equal(await isUserPaid({ email: 'lost-return@example.com' }), true);
  assert.equal((await models.PaymentOrder.findOne({ orderId }).lean()).status, 'paid');
});

test('only a running Monthly plan can ask for a refund, with a real reason, once', async () => {
  // A 7-day pass can't
  const pass = await paidOrder('pass-buyer@example.com', 'pass-7d');
  const passStatus = await call('/api/billing/refund-request', { token: pass.token });
  assert.equal(passStatus.body.canRequest, false);
  assert.equal((await call('/api/billing/refund-request', { method: 'POST', token: pass.token, body: GOOD_REASON })).status, 400);

  const { token } = await paidOrder('monthly-buyer@example.com');
  const before = await call('/api/billing/refund-request', { token });
  assert.equal(before.body.canRequest, true);
  assert.equal(before.body.request, null);
  assert.equal(before.body.plan.label, 'Monthly');

  const ask = (body) => call('/api/billing/refund-request', { method: 'POST', token, body });
  assert.equal((await ask({ ...GOOD_REASON, category: 'bored' })).status, 400);
  assert.equal((await ask({ ...GOOD_REASON, details: 'too short' })).status, 400);
  assert.equal((await ask({ ...GOOD_REASON, acknowledged: false })).status, 400);
  const sent = await ask(GOOD_REASON);
  assert.equal(sent.status, 200);
  assert.equal(sent.body.request.status, 'pending');
  assert.equal((await ask(GOOD_REASON)).status, 409);

  const after = await call('/api/billing/refund-request', { token });
  assert.equal(after.body.canRequest, false);
  assert.equal(after.body.request.status, 'pending');
  // Asking doesn't refund anything or end Pro
  assert.equal(await isUserPaid({ email: 'monthly-buyer@example.com' }), true);
  assert.equal(cashfree.refunds.filter((r) => r.refund_note?.includes('Refund request')).length, 0);
});

test('Pro given by an admin has nothing to cancel or refund', async () => {
  const token = await userToken('granted@example.com');
  await call('/api/admin/subscriptions', { method: 'POST', token: ownerToken, body: { email: 'granted@example.com', plan: 'monthly' } });
  const status = await call('/api/billing/refund-request', { token });
  assert.equal(status.body.canRequest, false);
  assert.equal(status.body.activeSource, 'admin');
  assert.equal((await call('/api/billing/refund-request', { method: 'POST', token, body: GOOD_REASON })).status, 400);
});

test('an admin rejects or approves a refund request; approving refunds and ends Pro', async () => {
  process.env.RESEND_API_KEY = 're_test';
  try {
    const reject = await paidOrder('reject-me@example.com');
    await call('/api/billing/refund-request', { method: 'POST', token: reject.token, body: GOOD_REASON });
    assert.ok(await waitForMail('reject-me@example.com', 'We received your refund request'));

    const list = await call('/api/admin/refund-requests?status=pending', { token: ownerToken });
    assert.equal(list.status, 200);
    const pendingReject = list.body.data.find((r) => r.email === 'reject-me@example.com');
    assert.equal(pendingReject.categoryLabel, "A Pro feature doesn't work for me");
    assert.equal(pendingReject.proActive, true);
    const badges = await call('/api/admin/badges', { token: ownerToken });
    assert.ok(badges.body.data.refunds >= 1);

    assert.equal((await call(`/api/admin/refund-requests/${pendingReject.id}/reject`, { method: 'POST', token: ownerToken, body: {} })).status, 400);
    const rejected = await call(`/api/admin/refund-requests/${pendingReject.id}/reject`, { method: 'POST', token: ownerToken, body: { note: 'The download works; we checked your account.' } });
    assert.equal(rejected.status, 200);
    assert.ok(await waitForMail('reject-me@example.com', "couldn't approve"));
    assert.equal(await isUserPaid({ email: 'reject-me@example.com' }), true);
    assert.equal((await call(`/api/admin/refund-requests/${pendingReject.id}/approve`, { method: 'POST', token: ownerToken, body: {} })).status, 409);
    assert.equal((await call('/api/billing/refund-request', { token: reject.token })).body.request.note, 'The download works; we checked your account.');

    const approve = await paidOrder('approve-me@example.com');
    await call('/api/billing/refund-request', { method: 'POST', token: approve.token, body: GOOD_REASON });
    const id = (await call('/api/admin/refund-requests?status=pending', { token: ownerToken })).body.data.find((r) => r.email === 'approve-me@example.com').id;

    // Cashfree refuses: nothing changes and the request waits again
    cashfree.refundStatus = 400;
    assert.equal((await call(`/api/admin/refund-requests/${id}/approve`, { method: 'POST', token: ownerToken, body: {} })).status, 502);
    cashfree.refundStatus = 200;
    assert.equal((await models.RefundRequest.findById(id).lean()).status, 'pending');
    assert.equal(await isUserPaid({ email: 'approve-me@example.com' }), true);

    const ok = await call(`/api/admin/refund-requests/${id}/approve`, { method: 'POST', token: ownerToken, body: { note: 'Confirmed the export bug.' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.status, 'approved');
    assert.equal(cashfree.refunds.at(-1).refund_id, `rf_${approve.orderId}`);
    assert.equal((await mongoose.model('PaymentLog').findById(approve.logId).lean()).status, 'refunded');
    assert.equal(await isUserPaid({ email: 'approve-me@example.com' }), false);
    assert.ok(await waitForMail('approve-me@example.com', 'Your refund of ₹189 has been started'));
    assert.equal((await call('/api/billing/refund-request', { token: approve.token })).body.request.status, 'approved');
  } finally {
    process.env.RESEND_API_KEY = '';
  }
});

test('Admin → Invoices lists paid orders, serves the PDF and resends the email', async () => {
  const { orderId } = await paidOrder('invoice-admin@example.com');
  const list = await call('/api/admin/invoices?q=invoice-admin', { token: ownerToken });
  assert.equal(list.status, 200);
  const row = list.body.data.find((i) => i.orderId === orderId);
  assert.ok(row);
  assert.equal(row.amount, 189);
  assert.equal(row.refunded, false);

  // Email is off in this test, so the order has no number until its PDF is made
  const pdf = await realFetch(`${base}/api/admin/invoices/${orderId}/pdf`, { headers: { Authorization: `Bearer ${ownerToken}` } });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
  const number = (await models.PaymentOrder.findOne({ orderId }).lean()).invoiceNumber;
  assert.match(number, /^CVM-\d{4}-\d{4}$/);
  assert.match(pdf.headers.get('content-disposition'), new RegExp(`CVMind-Invoice-${number}\\.pdf`));
  assert.equal((await call('/api/admin/invoices/bad id!/pdf', { token: ownerToken })).status, 404);

  assert.equal((await call(`/api/admin/invoices/${orderId}/send`, { method: 'POST', token: ownerToken })).status, 503);
  process.env.RESEND_API_KEY = 're_test';
  try {
    const sent = await call(`/api/admin/invoices/${orderId}/send`, { method: 'POST', token: ownerToken });
    assert.equal(sent.status, 200);
    assert.equal(sent.body.number, number);
    assert.ok(await waitForMail('invoice-admin@example.com', `Your CVMind invoice ${number}`));
  } finally {
    process.env.RESEND_API_KEY = '';
  }
});

test('refunding from Payments answers a waiting refund request', async () => {
  const { token, logId, orderId } = await paidOrder('payments-page@example.com');
  await call('/api/billing/refund-request', { method: 'POST', token, body: GOOD_REASON });
  const res = await call(`/api/admin/payments/${logId}/refund`, { method: 'POST', token: ownerToken, body: { reason: 'Refunded from Payments' } });
  assert.equal(res.status, 200);
  const request = await models.RefundRequest.findOne({ orderId }).lean();
  assert.equal(request.status, 'approved');
  assert.equal(request.adminNote, 'Refunded from Payments');
});

test('the webhook only accepts Cashfree-signed requests', async () => {
  const raw = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'cvm_missing' } } });
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', 'test-secret').update(ts + raw).digest('base64');
  assert.equal((await call('/api/billing/webhook', { method: 'POST', raw, headers: { 'x-webhook-timestamp': ts, 'x-webhook-signature': 'forged' } })).status, 401);
  assert.equal((await call('/api/billing/webhook', { method: 'POST', raw, headers: { 'x-webhook-timestamp': ts, 'x-webhook-signature': sig } })).status, 200);
});

test('checkout stays closed until payments open', async () => {
  const token = await userToken('early@example.com');
  process.env.PAYMENTS_OPEN_AT = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  try {
    const early = await call('/api/billing/checkout', { method: 'POST', token, body: { plan: 'monthly', phone: '9876543210' } });
    assert.equal(early.status, 403);
    assert.equal(early.body.code, 'PAYMENTS_NOT_OPEN');
    assert.equal(await models.PaymentOrder.countDocuments({ email: 'early@example.com' }), 0);
    const plans = await call('/api/billing/plans');
    assert.equal(plans.body.launch.paymentsOpenAt, process.env.PAYMENTS_OPEN_AT);
    assert.ok(plans.body.launch.pricingOpensAt && plans.body.launch.now);
  } finally {
    process.env.PAYMENTS_OPEN_AT = '2026-01-01T00:00:00+05:30';
  }
  assert.equal((await call('/api/billing/checkout', { method: 'POST', token, body: { plan: 'monthly', phone: '9876543210' } })).status, 200);
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

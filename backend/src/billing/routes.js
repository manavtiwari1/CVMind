import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { requireUser } from '../services/authToken.js';
import { dbReady } from '../admin/auth.js';
import { evaluateCoupon, redeemCoupon } from '../admin/coupons.js';
import { frontendUrl } from '../services/emailVerification.js';
import { savePaymentLog } from '../db.js';
import { PLANS, PLAN_KEYS, pricingOpensAt, paymentsOpenAt, FREE_WEEKLY, TOKEN_LIMITS, PRO_TEMPLATES, PRO_LETTER_TEMPLATES } from './plans.js';
import { PaymentOrder } from './models.js';
import { sendInvoice } from './invoice.js';
import { activeSubscription, activatePlan, tokenStatus, weeklyUses } from './service.js';
import { cashfreeConfigured, cashfreeMode, createCashfreeOrder, getCashfreeOrder, getSuccessfulPayment, verifyCashfreeWebhook } from './cashfree.js';
import { RefundRequest, REFUND_CATEGORIES, MIN_DETAILS, refundEligibility, formatRupees } from './refunds.js';
import { sendEmail, emailConfigured, SUPPORT_EMAIL } from '../admin/mailer.js';
import { refundRequestReceivedEmail, notificationEmail } from '../services/emailTemplates.js';

// CVMind Pro: plans, the signed-in account's plan and allowance, and Cashfree checkout.
const router = express.Router();

const plansPayload = () => PLAN_KEYS.map((key) => ({ key, ...PLANS[key] }));

router.get('/api/billing/plans', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    success: true,
    plans: plansPayload(),
    freeWeekly: FREE_WEEKLY,
    tokenLimits: TOKEN_LIMITS,
    proTemplates: PRO_TEMPLATES,
    proLetterTemplates: PRO_LETTER_TEMPLATES,
    payments: { enabled: cashfreeConfigured(), mode: cashfreeMode() },
    // The page uses "now" to count down by the server's clock, not the visitor's
    launch: { pricingOpensAt: pricingOpensAt(), paymentsOpenAt: paymentsOpenAt(), now: new Date() }
  });
});

router.get('/api/billing/me', requireUser, async (req, res) => {
  try {
    const sub = await activeSubscription(req.auth.email);
    const [tokens, used] = await Promise.all([tokenStatus(req.auth.email, !!sub), weeklyUses(req.auth.email)]);
    res.set('Cache-Control', 'private, no-store');
    res.json({
      success: true,
      pro: !!sub,
      subscription: sub ? { plan: sub.plan, label: PLANS[sub.plan]?.label || sub.plan, expiresAt: sub.expiresAt, source: sub.source } : null,
      tokens,
      weekly: Object.fromEntries(Object.entries(FREE_WEEKLY).map(([key, f]) => [key, { label: f.label, limit: f.limit, used: used[key] || 0 }]))
    });
  } catch (err) {
    console.error('[billing] me failed:', err);
    res.status(500).json({ success: false, error: 'Could not load your plan. Please try again.' });
  }
});

// Where Cashfree sends the buyer back: the site they paid from, if it is ours
const SITE_ORIGIN = /^https?:\/\/((localhost|127\.0\.0\.1)(:\d+)?|([a-z0-9-]+\.)*cvmind\.in|([a-z0-9-]+\.)*lvh\.me(:\d+)?)$/i;
const returnBase = (req) => {
  const origin = String(req.headers.origin || '');
  return SITE_ORIGIN.test(origin) ? origin : frontendUrl();
};

const notifyUrl = () => {
  if (process.env.CASHFREE_NOTIFY_URL) return process.env.CASHFREE_NOTIFY_URL;
  const base = String(process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
  return base.startsWith('https://') ? `${base}/api/billing/webhook` : undefined;
};

router.post('/api/billing/checkout', requireUser, async (req, res) => {
  if (!(await dbReady(3000))) return res.status(503).json({ success: false, error: 'Payments are unavailable right now. Please try again shortly.' });
  if (!cashfreeConfigured()) return res.status(503).json({ success: false, code: 'PAYMENTS_OFF', error: 'Online payment is not set up yet. Please contact support to upgrade.' });
  if (Date.now() < paymentsOpenAt().getTime()) {
    const when = paymentsOpenAt().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    return res.status(403).json({ success: false, code: 'PAYMENTS_NOT_OPEN', opensAt: paymentsOpenAt(), error: `Payments open on ${when} IST.` });
  }

  const plan = String(req.body?.plan || '');
  if (!PLANS[plan]) return res.status(400).json({ success: false, error: 'Pick a plan.' });
  const phone = String(req.body?.phone || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, error: 'Enter a valid 10-digit mobile number.' });

  const email = req.auth.email;
  const listPrice = PLANS[plan].price;
  let coupon = null;
  let discount = 0;
  if (req.body?.couponCode) {
    const check = await evaluateCoupon(req.body.couponCode, { email, amount: listPrice });
    if (!check.ok) return res.status(400).json({ success: false, error: check.error });
    coupon = check.coupon;
    discount = Math.min(check.discount, listPrice);
  }
  const amount = Math.round((listPrice - discount) * 100) / 100;
  const orderId = `cvm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  try {
    // A coupon that covers the whole price needs no payment
    if (amount < 1) {
      if (!(await redeemCoupon(coupon, { email, amount: listPrice, discount, transactionId: orderId }))) {
        return res.status(400).json({ success: false, error: 'That coupon has just been fully used.' });
      }
      await PaymentOrder.create({ orderId, email, userId: String(req.auth.sub), plan, listPrice, amount: 0, couponCode: coupon.code, discount, status: 'paid', paymentMethod: 'coupon', paidAt: new Date() });
      await activatePlan({ email, plan, amount: 0, source: 'coupon', orderId });
      return res.json({ success: true, paid: true, orderId });
    }

    await PaymentOrder.create({ orderId, email, userId: String(req.auth.sub), plan, listPrice, amount, couponCode: coupon?.code || '', discount });
    const order = await createCashfreeOrder({
      orderId,
      amount,
      customerId: String(req.auth.sub).replace(/[^a-zA-Z0-9]/g, '').slice(0, 50).padEnd(3, '0'),
      email,
      phone,
      name: req.body?.name ? String(req.body.name) : '',
      returnUrl: `${returnBase(req)}/pricing?order_id={order_id}`,
      notifyUrl: notifyUrl()
    });
    res.json({ success: true, orderId, paymentSessionId: order.payment_session_id, mode: cashfreeMode() });
  } catch (err) {
    console.error('[billing] checkout failed:', err.message);
    await PaymentOrder.updateOne({ orderId, status: 'created' }, { status: 'failed' }).catch(() => {});
    res.status(502).json({ success: false, error: 'Could not start the payment. Please try again.' });
  }
});

// Asks Cashfree whether an order is paid and, the first time it is, turns on the plan.
// The webhook and the return page both call this; Cashfree's own answer is what counts.
export async function settleOrder(orderId) {
  const order = await PaymentOrder.findOne({ orderId }).lean();
  if (!order) return { status: 'unknown' };
  if (order.status === 'paid') {
    await activatePlan({ email: order.email, plan: order.plan, amount: order.amount, source: order.paymentMethod === 'coupon' ? 'coupon' : 'cashfree', orderId });
    return { status: 'paid', order };
  }

  const cf = await getCashfreeOrder(orderId);
  if (cf.order_status === 'PAID') {
    const payment = await getSuccessfulPayment(orderId);
    const won = await PaymentOrder.findOneAndUpdate(
      { orderId, status: { $ne: 'paid' } },
      { status: 'paid', paidAt: new Date(), cfPaymentId: String(payment?.cf_payment_id || ''), paymentMethod: String(payment?.payment_group || '') },
      { returnDocument: 'after' }
    ).lean();
    const sub = await activatePlan({ email: order.email, plan: order.plan, amount: order.amount, source: 'cashfree', orderId });
    if (won) {
      // Only the first caller logs the payment and uses up the coupon
      await savePaymentLog({ email: order.email, amount: order.amount, paymentMethod: won.paymentMethod || 'cashfree', transactionId: orderId, status: 'success', plan: order.plan, couponCode: order.couponCode, discount: order.discount }).catch((e) => console.error('[billing] payment log failed:', e.message));
      if (order.couponCode) {
        const { Coupon } = await import('../admin/models.js');
        const coupon = await Coupon.findOne({ code: order.couponCode }).lean();
        if (coupon) await redeemCoupon(coupon, { email: order.email, amount: order.listPrice, discount: order.discount, transactionId: orderId }).catch(() => {});
      }
      // Not awaited: a slow email shouldn't hold up the webhook or the return page
      sendInvoice(orderId).catch((e) => console.error('[billing] invoice email failed:', orderId, e.message));
    }
    return { status: 'paid', order, subscription: sub };
  }
  if (['EXPIRED', 'TERMINATED'].includes(cf.order_status)) {
    await PaymentOrder.updateOne({ orderId, status: 'created' }, { status: 'failed' });
    return { status: 'failed', order };
  }
  return { status: 'pending', order };
}

// Safety net for a missed webhook and a buyer who closed the tab after paying: checks recent
// unpaid orders with Cashfree, and retries invoice emails that didn't go out.
export async function sweepOrders() {
  if (!cashfreeConfigured() || !(await dbReady(0))) return { settled: 0, invoices: 0 };
  const now = Date.now();
  const open = await PaymentOrder.find({ status: 'created', createdAt: { $gt: new Date(now - 24 * 60 * 60 * 1000), $lt: new Date(now - 2 * 60 * 1000) } })
    .sort({ createdAt: -1 }).limit(50).lean();
  let settled = 0;
  for (const o of open) {
    try {
      if ((await settleOrder(o.orderId)).status === 'paid') settled += 1;
    } catch (err) {
      console.error('[billing] sweep settle failed:', o.orderId, err.message);
    }
  }
  const unsent = await PaymentOrder.find({ status: 'paid', amount: { $gt: 0 }, invoiceSentAt: null, paidAt: { $gt: new Date(now - 3 * 24 * 60 * 60 * 1000), $lt: new Date(now - 60 * 1000) } })
    .limit(20).lean();
  let invoices = 0;
  for (const o of unsent) {
    if (await sendInvoice(o.orderId).catch((err) => console.error('[billing] invoice retry failed:', o.orderId, err.message))) invoices += 1;
  }
  return { settled, invoices };
}

// Long-running servers sweep every 5 minutes
export function startOrderSweep(intervalMs = 5 * 60 * 1000) {
  const tick = () => sweepOrders().catch((err) => console.error('[billing] sweep failed:', err.message));
  setTimeout(tick, 30000);
  return setInterval(tick, intervalMs);
}

// ── Refund requests ──────────────────────────────────────────────────────────
// Payments are non-refundable. A Monthly plan can be cancelled with a refund request for a genuine
// reason; an admin reviews it in Admin → Refund requests and starts the refund by hand.
const dayText = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

const toUserRequest = (r) => ({
  status: r.status === 'processing' ? 'pending' : r.status,
  plan: PLANS[r.plan]?.label || r.plan,
  amount: r.amount,
  category: REFUND_CATEGORIES[r.category] || r.category,
  createdAt: r.createdAt,
  decidedAt: r.decidedAt,
  note: r.status === 'rejected' ? r.adminNote : ''
});

const NOT_ELIGIBLE = {
  'no-monthly': 'Cancelling with a refund request is only available for a Monthly plan bought on CVMind.',
  refunded: 'This payment has already been refunded.',
  ended: 'Your Monthly plan has already ended, so there is nothing to cancel.'
};

router.get('/api/billing/refund-request', requireUser, async (req, res) => {
  try {
    const email = String(req.auth.email).toLowerCase();
    const [check, latest, active] = await Promise.all([
      refundEligibility(email),
      RefundRequest.findOne({ email }).sort({ createdAt: -1 }).lean(),
      activeSubscription(email)
    ]);
    const asked = check.order ? await RefundRequest.exists({ orderId: check.order.orderId }) : null;
    res.set('Cache-Control', 'private, no-store');
    res.json({
      success: true,
      canRequest: check.eligible && !asked,
      plan: check.order ? { label: PLANS[check.order.plan]?.label || check.order.plan, amount: check.order.amount, paidAt: check.order.paidAt, expiresAt: check.sub?.expiresAt || null } : null,
      request: latest ? toUserRequest(latest) : null,
      categories: REFUND_CATEGORIES,
      minDetails: MIN_DETAILS,
      // How the running Pro plan was got: 'cashfree', 'admin' (given by the team) or 'coupon'
      activeSource: active?.source || null
    });
  } catch (err) {
    console.error('[billing] refund request status failed:', err.message);
    res.status(500).json({ success: false, error: 'Could not load this right now. Please try again.' });
  }
});

router.post('/api/billing/refund-request', requireUser, async (req, res) => {
  if (!(await dbReady(3000))) return res.status(503).json({ success: false, error: 'This is unavailable right now. Please try again shortly.' });
  const category = String(req.body?.category || '');
  const details = String(req.body?.details || '').trim().slice(0, 1000);
  if (!REFUND_CATEGORIES[category]) return res.status(400).json({ success: false, error: 'Pick the reason for your request.' });
  if (details.length < MIN_DETAILS) return res.status(400).json({ success: false, error: `Tell us what happened in at least ${MIN_DETAILS} characters.` });
  if (req.body?.acknowledged !== true) return res.status(400).json({ success: false, error: 'Please confirm that you have read the refund policy.' });

  const email = String(req.auth.email).toLowerCase();
  try {
    const check = await refundEligibility(email);
    if (!check.eligible) return res.status(400).json({ success: false, error: NOT_ELIGIBLE[check.why] || 'This plan cannot be cancelled.' });
    let request;
    try {
      request = (await RefundRequest.create({ email, userId: String(req.auth.sub), orderId: check.order.orderId, plan: check.order.plan, amount: check.order.amount, category, details })).toObject();
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ success: false, error: 'You have already asked for a refund on this payment.' });
      throw err;
    }

    if (emailConfigured()) {
      const user = await mongoose.models.User?.findOne({ email }, { name: 1 }).lean();
      const plan = PLANS[check.order.plan]?.label || check.order.plan;
      const amount = formatRupees(check.order.amount);
      const log = (e) => console.error('[billing] refund request email failed:', e.message);
      sendEmail({ to: email, ...refundRequestReceivedEmail({ name: user?.name || '', plan, amount, until: dayText(check.sub.expiresAt) }) }).catch(log);
      sendEmail({
        to: SUPPORT_EMAIL,
        replyTo: email,
        ...notificationEmail({
          name: 'team',
          title: `Refund request from ${email}`,
          body: `${email} asked to cancel their ${plan} plan (${amount}, order ${check.order.orderId}) and get a refund.\n\nReason: ${REFUND_CATEGORIES[category]}\n\n${details}`,
          ctaLabel: 'Review in the admin panel',
          ctaUrl: `${frontendUrl()}/admin#refunds`
        })
      }).catch(log);
    }
    res.json({ success: true, request: toUserRequest(request) });
  } catch (err) {
    console.error('[billing] refund request failed:', err.message);
    res.status(500).json({ success: false, error: 'Could not send your request. Please try again.' });
  }
});

router.post('/api/billing/verify', requireUser, async (req, res) => {
  const orderId = String(req.body?.orderId || '').slice(0, 60);
  try {
    const order = await PaymentOrder.findOne({ orderId }).lean();
    if (!order || order.email !== String(req.auth.email).toLowerCase()) return res.status(404).json({ success: false, error: 'Order not found.' });
    const result = await settleOrder(orderId);
    const sub = result.status === 'paid' ? await activeSubscription(order.email) : null;
    res.json({ success: true, status: result.status, plan: order.plan, expiresAt: sub?.expiresAt || null });
  } catch (err) {
    console.error('[billing] verify failed:', err.message);
    res.status(502).json({ success: false, error: 'Could not confirm the payment yet. Refresh in a minute.' });
  }
});

// Cashfree payment webhook. Needs the raw body (kept by express.json in index.js) for the signature.
router.post('/api/billing/webhook', async (req, res) => {
  if (!verifyCashfreeWebhook(req.rawBody, req.headers['x-webhook-timestamp'], req.headers['x-webhook-signature'])) {
    return res.status(401).json({ success: false });
  }
  const orderId = req.body?.data?.order?.order_id;
  if (!orderId) return res.json({ success: true });
  try {
    await settleOrder(String(orderId));
    res.json({ success: true });
  } catch (err) {
    console.error('[billing] webhook settle failed:', err.message);
    // A 5xx makes Cashfree retry later
    res.status(500).json({ success: false });
  }
});

export default router;

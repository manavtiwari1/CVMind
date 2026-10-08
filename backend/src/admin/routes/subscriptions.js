import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { model, clean, handle, httpError, isId, isEmail, escapeRegex } from '../util.js';
import { Subscription, PaymentOrder, TokenGrant } from '../../billing/models.js';
import { PLANS, PLAN_KEYS, FREE_WEEKLY, MAX_BONUS_TOKENS, MAX_BONUS_DAYS } from '../../billing/plans.js';
import { activatePlan, activeSubscription, cancelSubscription, tokenStatus, weeklyUses, grantTokens } from '../../billing/service.js';

// CVMind Pro subscriptions: who has Pro until when, Cashfree orders, and Pro given by hand.
const router = express.Router();
router.use(requireDb);

router.get('/', requireAdmin('payments.view'), handle(async (req, res) => {
  const now = new Date();
  const filter = {};
  if (req.query.q) filter.email = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
  if (req.query.source) filter.source = clean(req.query.source, 20);
  if (req.query.status === 'active') Object.assign(filter, { status: 'active', expiresAt: { $gt: now } });
  else if (req.query.status === 'ended') filter.$or = [{ status: 'cancelled' }, { expiresAt: { $lte: now } }];

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [rows, activeEmails, revenue, byPlan] = await Promise.all([
    Subscription.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
    Subscription.distinct('email', { status: 'active', expiresAt: { $gt: now } }),
    PaymentOrder.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Subscription.aggregate([
      { $match: { status: 'active', expiresAt: { $gt: now } } },
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ])
  ]);
  const users = await model('User').find({ email: { $in: [...new Set(rows.map((r) => r.email))] } }, { email: 1, name: 1 }).lean();
  const nameOf = new Map(users.map((u) => [u.email.toLowerCase(), u.name]));

  res.json({
    success: true,
    plans: PLAN_KEYS.map((key) => ({ key, ...PLANS[key] })),
    stats: {
      activeSubscribers: activeEmails.length,
      revenueThisMonth: revenue[0]?.total || 0,
      paymentsThisMonth: revenue[0]?.count || 0,
      byPlan: Object.fromEntries(byPlan.map((p) => [p._id, p.count]))
    },
    data: rows.map((r) => ({
      id: String(r._id),
      email: r.email,
      name: nameOf.get(r.email) || null,
      plan: r.plan,
      planLabel: PLANS[r.plan]?.label || r.plan,
      amount: r.amount,
      source: r.source,
      orderId: r.orderId,
      startsAt: r.startsAt,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      grantedBy: r.grantedBy,
      note: r.note,
      status: r.status === 'cancelled' ? 'cancelled' : new Date(r.expiresAt) > now ? (new Date(r.startsAt) > now ? 'upcoming' : 'active') : 'expired'
    }))
  });
}));

// Gives Pro by hand: a plan's length, or a custom number of days. Stacks on an active subscription.
router.post('/', requireAdmin('payments.manage'), handle(async (req, res) => {
  const email = clean(req.body?.email, 120).toLowerCase();
  if (!isEmail(email)) throw httpError(400, 'Enter a valid email address.');
  const plan = clean(req.body?.plan, 30);
  let days;
  if (plan === 'custom') {
    days = Number(req.body?.days);
    if (!Number.isInteger(days) || days < 1 || days > 3650) throw httpError(400, 'Days must be a whole number from 1 to 3650.');
  } else if (!PLANS[plan]) {
    throw httpError(400, 'Pick a plan.');
  }
  const amount = Math.max(0, Number(req.body?.amount) || 0);
  const note = clean(req.body?.note, 300);
  const sub = await activatePlan({ email, plan, days, amount, source: 'admin', grantedBy: req.admin.name, note });
  await audit(req, 'subscription.granted', { targetType: 'email', targetId: email, targetLabel: email, details: { plan, days: days ?? PLANS[plan].days, amount, note, expiresAt: sub.expiresAt } });
  res.json({ success: true, expiresAt: sub.expiresAt });
}));

router.post('/:id/cancel', requireAdmin('payments.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Subscription not found.');
  const sub = await cancelSubscription({ _id: req.params.id });
  if (!sub) throw httpError(404, 'Subscription not found or already cancelled.');
  await audit(req, 'subscription.cancelled', { targetType: 'email', targetId: sub.email, targetLabel: sub.email, details: { plan: sub.plan, reason: clean(req.body?.reason, 300) } });
  res.json({ success: true });
}));

router.get('/orders', requireAdmin('payments.view'), handle(async (req, res) => {
  const orders = await PaymentOrder.find().sort({ createdAt: -1 }).limit(300).lean();
  res.json({
    success: true,
    data: orders.map((o) => ({
      id: String(o._id), orderId: o.orderId, email: o.email, plan: o.plan, planLabel: PLANS[o.plan]?.label || o.plan,
      listPrice: o.listPrice, amount: o.amount, couponCode: o.couponCode, discount: o.discount,
      status: o.status, paymentMethod: o.paymentMethod, createdAt: o.createdAt, paidAt: o.paidAt
    }))
  });
}));

// One account's plan, AI tokens and weekly free uses
router.get('/usage/:email', requireAdmin('users.view'), handle(async (req, res) => {
  const email = clean(req.params.email, 120).toLowerCase();
  const sub = await activeSubscription(email);
  const [tokens, used, grants] = await Promise.all([
    tokenStatus(email, !!sub),
    weeklyUses(email),
    TokenGrant.find({ email, expiresAt: { $gt: new Date() } }).sort({ expiresAt: 1 }).lean()
  ]);
  res.json({
    success: true,
    pro: !!sub,
    expiresAt: sub?.expiresAt || null,
    tokens,
    grants: grants.map((g) => ({ id: String(g._id), tokens: g.tokens, expiresAt: g.expiresAt, createdAt: g.createdAt, grantedBy: g.grantedBy, note: g.note })),
    weekly: Object.fromEntries(Object.entries(FREE_WEEKLY).map(([k, f]) => [k, { label: f.label, limit: f.limit, used: used[k] || 0 }]))
  });
}));

// Gives an account extra AI tokens on top of its 3-day limit, for a number of days
router.post('/tokens', requireAdmin('payments.manage'), handle(async (req, res) => {
  const email = clean(req.body?.email, 120).toLowerCase();
  if (!isEmail(email)) throw httpError(400, 'Enter a valid email address.');
  const tokens = Number(req.body?.tokens);
  if (!Number.isInteger(tokens) || tokens < 1 || tokens > MAX_BONUS_TOKENS) throw httpError(400, `Tokens must be a whole number from 1 to ${MAX_BONUS_TOKENS.toLocaleString('en-IN')}.`);
  const days = Number(req.body?.days);
  if (!Number.isInteger(days) || days < 1 || days > MAX_BONUS_DAYS) throw httpError(400, `Days must be a whole number from 1 to ${MAX_BONUS_DAYS}.`);
  const note = clean(req.body?.note, 300);
  const grant = await grantTokens({ email, tokens, days, grantedBy: req.admin.name, note });
  await audit(req, 'tokens.granted', { targetType: 'email', targetId: email, targetLabel: email, details: { tokens, days, note, expiresAt: grant.expiresAt } });
  res.json({ success: true, expiresAt: grant.expiresAt });
}));

router.delete('/tokens/:id', requireAdmin('payments.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Token grant not found.');
  const grant = await TokenGrant.findByIdAndDelete(req.params.id).lean();
  if (!grant) throw httpError(404, 'Token grant not found.');
  await audit(req, 'tokens.revoked', { targetType: 'email', targetId: grant.email, targetLabel: grant.email, details: { tokens: grant.tokens } });
  res.json({ success: true });
}));

export default router;

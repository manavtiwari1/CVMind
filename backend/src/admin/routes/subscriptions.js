import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { model, clean, handle, httpError, isId, isEmail, escapeRegex } from '../util.js';
import { Subscription, PaymentOrder } from '../../billing/models.js';
import { PLANS, PLAN_KEYS, FREE_WEEKLY } from '../../billing/plans.js';
import { activatePlan, activeSubscription, tokenStatus, weeklyUses } from '../../billing/service.js';

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
  const sub = await Subscription.findOneAndUpdate({ _id: req.params.id, status: 'active' }, { status: 'cancelled', cancelledAt: new Date() }, { returnDocument: 'after' }).lean();
  if (!sub) throw httpError(404, 'Subscription not found or already cancelled.');
  // Later subscriptions that stacked on this one move up to fill the gap
  const removed = Math.max(0, new Date(sub.expiresAt).getTime() - Math.max(Date.now(), new Date(sub.startsAt).getTime()));
  if (removed > 0) {
    const later = await Subscription.find({ email: sub.email, status: 'active', startsAt: { $gte: sub.expiresAt } }).lean();
    for (const s of later) {
      await Subscription.updateOne({ _id: s._id }, {
        startsAt: new Date(new Date(s.startsAt).getTime() - removed),
        expiresAt: new Date(new Date(s.expiresAt).getTime() - removed)
      });
    }
  }
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
  const [tokens, used] = await Promise.all([tokenStatus(email, !!sub), weeklyUses(email)]);
  res.json({
    success: true,
    pro: !!sub,
    expiresAt: sub?.expiresAt || null,
    tokens,
    weekly: Object.fromEntries(Object.entries(FREE_WEEKLY).map(([k, f]) => [k, { label: f.label, limit: f.limit, used: used[k] || 0 }]))
  });
}));

export default router;

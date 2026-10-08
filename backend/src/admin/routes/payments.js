import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { Coupon } from '../models.js';
import { cashfreeConfigured } from '../../billing/cashfree.js';
import { model, clean, handle, httpError, isId, paging, escapeRegex, dateRange } from '../util.js';

const router = express.Router();
router.use(requireDb);

const TZ = 'Asia/Kolkata';

export function paymentFilter(query) {
  const filter = { ...dateRange(query) };
  if (['success', 'failed', 'refunded'].includes(query.status)) filter.status = query.status;
  if (query.method) filter.paymentMethod = clean(query.method, 20);
  if (query.coupon) filter.couponCode = clean(query.coupon, 40).toUpperCase();
  if (query.q) {
    const rx = new RegExp(escapeRegex(clean(query.q, 80)), 'i');
    filter.$or = [{ email: rx }, { transactionId: rx }];
  }
  return filter;
}

const toPayment = (p) => ({
  id: String(p._id),
  email: p.email,
  amount: p.amount,
  currency: p.currency || 'INR',
  paymentMethod: p.paymentMethod,
  transactionId: p.transactionId,
  status: p.status,
  plan: p.plan || '',
  couponCode: p.couponCode || '',
  discount: p.discount || 0,
  refundedAt: p.refundedAt || null,
  refundReason: p.refundReason || '',
  createdAt: p.createdAt
});

router.get('/', requireAdmin('payments.view'), handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const filter = paymentFilter(req.query);
  const PaymentLog = model('PaymentLog');
  const [rows, total, summary, methods] = await Promise.all([
    PaymentLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PaymentLog.countDocuments(filter),
    PaymentLog.aggregate([{ $match: filter }, { $group: { _id: '$status', amount: { $sum: '$amount' }, count: { $sum: 1 }, discount: { $sum: '$discount' } } }]),
    PaymentLog.distinct('paymentMethod')
  ]);
  const byStatus = Object.fromEntries(summary.map((s) => [s._id || 'success', { amount: s.amount, count: s.count, discount: s.discount || 0 }]));
  res.json({ success: true, total, page, limit, data: rows.map(toPayment), summary: byStatus, methods });
}));

// Revenue by month and by method/plan for the charts
router.get('/summary', requireAdmin('payments.view'), handle(async (req, res) => {
  const PaymentLog = model('PaymentLog');
  const since = new Date();
  since.setMonth(since.getMonth() - 11, 1);
  since.setHours(0, 0, 0, 0);
  const [monthly, byMethod, byPlan, totals] = await Promise.all([
    PaymentLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: TZ } },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    PaymentLog.aggregate([{ $match: { status: 'success' } }, { $group: { _id: '$paymentMethod', amount: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { amount: -1 } }]),
    PaymentLog.aggregate([{ $match: { status: 'success' } }, { $group: { _id: { $ifNull: ['$plan', ''] }, amount: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { amount: -1 } }]),
    PaymentLog.aggregate([{ $group: { _id: '$status', amount: { $sum: '$amount' }, count: { $sum: 1 } } }])
  ]);

  // Fill missing months so the chart has 12 bars
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const row = monthly.find((m) => m._id === key);
    months.push({ month: key, revenue: row?.revenue || 0, refunded: row?.refunded || 0, failed: row?.failed || 0, count: row?.count || 0 });
  }
  res.json({
    success: true,
    data: {
      months,
      byMethod: byMethod.map((m) => ({ method: m._id || 'unknown', amount: m.amount, count: m.count })),
      byPlan: byPlan.map((p) => ({ plan: p._id || 'Unlabelled', amount: p.amount, count: p.count })),
      totals: Object.fromEntries(totals.map((t) => [t._id || 'success', { amount: t.amount, count: t.count }])),
      // Real payments come through Cashfree once its keys are set (see billing/cashfree.js)
      gatewaySimulated: !cashfreeConfigured()
    }
  });
}));

router.post('/:id/refund', requireAdmin('payments.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Payment not found.');
  const reason = clean(req.body?.reason, 300);
  if (!reason) throw httpError(400, 'Add a reason for the refund.');
  const payment = await model('PaymentLog').findOneAndUpdate(
    { _id: req.params.id, status: 'success' },
    { status: 'refunded', refundedAt: new Date(), refundReason: reason },
    { returnDocument: 'after' }
  ).lean();
  if (!payment) throw httpError(400, 'Only successful payments can be refunded.');
  await audit(req, 'payment.refunded', { targetType: 'payment', targetId: payment._id, targetLabel: `${payment.transactionId} · ${payment.email}`, details: { amount: payment.amount, reason } });
  res.json({ success: true, data: toPayment(payment) });
}));

// ── Coupons ──────────────────────────────────────────────────────────────────
const toCoupon = (c) => {
  const now = Date.now();
  const state = !c.active ? 'retired'
    : c.validTo && new Date(c.validTo).getTime() < now ? 'expired'
      : c.validFrom && new Date(c.validFrom).getTime() > now ? 'scheduled'
        : c.maxUses && c.usedCount >= c.maxUses ? 'used-up'
          : 'live';
  return {
    id: String(c._id),
    code: c.code,
    description: c.description,
    type: c.type,
    value: c.value,
    maxUses: c.maxUses,
    perUserLimit: c.perUserLimit,
    minAmount: c.minAmount,
    validFrom: c.validFrom,
    validTo: c.validTo,
    active: c.active,
    usedCount: c.usedCount,
    discountGiven: (c.redemptions || []).reduce((sum, r) => sum + (r.discount || 0), 0),
    state,
    createdAt: c.createdAt,
    recentRedemptions: (c.redemptions || []).slice(-10).reverse().map((r) => ({ email: r.email, amount: r.amount, discount: r.discount, at: r.at }))
  };
};

function parseCouponInput(body, existing = null) {
  const out = {};
  if (!existing || body.code !== undefined) {
    const code = clean(body.code, 30).toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw httpError(400, 'Code must be 3–30 characters: letters, numbers, dash or underscore.');
    out.code = code;
  }
  if (!existing || body.type !== undefined) {
    if (!['percent', 'flat'].includes(body.type)) throw httpError(400, 'Choose a percent or flat discount.');
    out.type = body.type;
  }
  if (!existing || body.value !== undefined) {
    const value = Number(body.value);
    const type = out.type || existing?.type;
    if (!(value > 0) || (type === 'percent' && value > 100)) throw httpError(400, type === 'percent' ? 'Percent must be between 1 and 100.' : 'Amount must be more than 0.');
    out.value = value;
  }
  for (const field of ['maxUses', 'perUserLimit', 'minAmount']) {
    if (body[field] !== undefined) {
      const n = Number(body[field]);
      if (!(n >= 0)) throw httpError(400, `${field} can't be negative.`);
      out[field] = Math.floor(n);
    }
  }
  for (const field of ['validFrom', 'validTo']) {
    if (body[field] !== undefined) {
      const d = body[field] ? new Date(body[field]) : null;
      if (d && isNaN(d)) throw httpError(400, 'Enter valid dates.');
      out[field] = d;
    }
  }
  const from = out.validFrom !== undefined ? out.validFrom : existing?.validFrom;
  const to = out.validTo !== undefined ? out.validTo : existing?.validTo;
  if (from && to && new Date(from) >= new Date(to)) throw httpError(400, 'The end date must be after the start date.');
  if (body.description !== undefined) out.description = clean(body.description, 200);
  if (typeof body.active === 'boolean') out.active = body.active;
  return out;
}

router.get('/coupons', requireAdmin('coupons.manage'), handle(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: coupons.map(toCoupon) });
}));

router.post('/coupons', requireAdmin('coupons.manage'), handle(async (req, res) => {
  const input = parseCouponInput(req.body || {});
  if (await Coupon.exists({ code: input.code })) throw httpError(409, 'A coupon with that code already exists.');
  const coupon = await Coupon.create({ ...input, createdBy: req.admin.username });
  await audit(req, 'coupon.created', { targetType: 'coupon', targetId: coupon._id, targetLabel: coupon.code, details: input });
  res.json({ success: true, data: toCoupon(coupon.toObject()) });
}));

router.patch('/coupons/:id', requireAdmin('coupons.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Coupon not found.');
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw httpError(404, 'Coupon not found.');
  const input = parseCouponInput(req.body || {}, coupon);
  if (input.code && input.code !== coupon.code) {
    if (coupon.usedCount > 0) throw httpError(400, "A coupon that has been used can't be renamed.");
    if (await Coupon.exists({ code: input.code })) throw httpError(409, 'A coupon with that code already exists.');
  }
  Object.assign(coupon, input);
  await coupon.save();
  const action = input.active === false && Object.keys(input).length === 1 ? 'coupon.retired' : 'coupon.updated';
  await audit(req, action, { targetType: 'coupon', targetId: coupon._id, targetLabel: coupon.code, details: input });
  res.json({ success: true, data: toCoupon(coupon.toObject()) });
}));

router.delete('/coupons/:id', requireAdmin('coupons.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Coupon not found.');
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw httpError(404, 'Coupon not found.');
  if (coupon.usedCount > 0) throw httpError(400, 'This coupon has been used, so it is kept for the records. Retire it instead.');
  await coupon.deleteOne();
  await audit(req, 'coupon.deleted', { targetType: 'coupon', targetId: coupon._id, targetLabel: coupon.code });
  res.json({ success: true });
}));

export default router;

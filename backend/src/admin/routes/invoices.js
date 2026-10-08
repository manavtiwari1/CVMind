import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { model, clean, handle, httpError, paging, escapeRegex, dateRange } from '../util.js';
import { emailConfigured } from '../mailer.js';
import { PaymentOrder } from '../../billing/models.js';
import { PLANS } from '../../billing/plans.js';
import { invoiceForOrder, emailInvoice, invoiceFileName } from '../../billing/invoice.js';

// Invoices for paid Cashfree orders: every bill emailed to a buyer, as a list with PDF download and resend.
const router = express.Router();
router.use(requireDb);

// Paid orders that cost money; orders a coupon covered in full have no invoice
const invoiceFilter = (query) => {
  const filter = { status: 'paid', amount: { $gt: 0 }, ...dateRange(query, 'paidAt') };
  if (query.q) {
    const rx = new RegExp(escapeRegex(clean(query.q, 80)), 'i');
    filter.$or = [{ email: rx }, { invoiceNumber: rx }, { orderId: rx }];
  }
  return filter;
};

const orderIdParam = (value) => {
  const id = String(value || '');
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(id)) throw httpError(404, 'Invoice not found.');
  return id;
};

router.get('/', requireAdmin('payments.view'), handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const filter = invoiceFilter(req.query);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [rows, total, totals, month] = await Promise.all([
    PaymentOrder.find(filter).sort({ paidAt: -1 }).skip(skip).limit(limit).lean(),
    PaymentOrder.countDocuments(filter),
    PaymentOrder.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    PaymentOrder.aggregate([{ $match: { status: 'paid', amount: { $gt: 0 }, paidAt: { $gte: monthStart } } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }])
  ]);
  const [users, logs] = await Promise.all([
    model('User').find({ email: { $in: [...new Set(rows.map((r) => r.email))] } }, { email: 1, name: 1 }).lean(),
    model('PaymentLog').find({ transactionId: { $in: rows.map((r) => r.orderId) } }, { transactionId: 1, status: 1, refundedAt: 1 }).lean()
  ]);
  const nameOf = new Map(users.map((u) => [u.email.toLowerCase(), u.name]));
  const logOf = new Map(logs.map((l) => [l.transactionId, l]));
  res.json({
    success: true,
    total,
    page,
    limit,
    emailEnabled: emailConfigured(),
    totals: { amount: totals[0]?.amount || 0, count: totals[0]?.count || 0 },
    thisMonth: { amount: month[0]?.amount || 0, count: month[0]?.count || 0 },
    data: rows.map((o) => ({
      orderId: o.orderId,
      number: o.invoiceNumber || '',
      email: o.email,
      name: nameOf.get(o.email) || null,
      plan: PLANS[o.plan]?.label || o.plan,
      listPrice: o.listPrice,
      discount: o.discount || 0,
      couponCode: o.couponCode || '',
      amount: o.amount,
      paymentMethod: o.paymentMethod || '',
      paidAt: o.paidAt,
      sentAt: o.invoiceSentAt || null,
      refunded: logOf.get(o.orderId)?.status === 'refunded',
      refundedAt: logOf.get(o.orderId)?.refundedAt || null
    }))
  });
}));

// The invoice PDF. An order paid before invoices existed gets its number the first time it's opened.
router.get('/:orderId/pdf', requireAdmin('payments.view'), handle(async (req, res) => {
  const invoice = await invoiceForOrder(orderIdParam(req.params.orderId));
  if (!invoice) throw httpError(404, 'Invoice not found.');
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${invoiceFileName(invoice.data.number)}"`,
    'Cache-Control': 'private, no-store'
  });
  res.send(invoice.pdf);
}));

router.post('/:orderId/send', requireAdmin('payments.manage'), handle(async (req, res) => {
  const orderId = orderIdParam(req.params.orderId);
  if (!emailConfigured()) throw httpError(503, 'Email is not configured on this server (RESEND_API_KEY).');
  const order = await PaymentOrder.findOne({ orderId, status: 'paid', amount: { $gt: 0 } }).lean();
  if (!order) throw httpError(404, 'Invoice not found.');
  await emailInvoice(orderId);
  const updated = await PaymentOrder.findOne({ orderId }, { invoiceNumber: 1, invoiceSentAt: 1 }).lean();
  await audit(req, 'invoice.sent', { targetType: 'email', targetId: order.email, targetLabel: `${updated.invoiceNumber} · ${order.email}`, details: { orderId } });
  res.json({ success: true, number: updated.invoiceNumber, sentAt: updated.invoiceSentAt });
}));

export default router;

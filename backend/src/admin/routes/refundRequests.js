import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { model, clean, handle, httpError, isId } from '../util.js';
import { sendEmail, emailConfigured } from '../mailer.js';
import { refundRejectedEmail } from '../../services/emailTemplates.js';
import { Subscription } from '../../billing/models.js';
import { PLANS } from '../../billing/plans.js';
import { RefundRequest, refundPayment, toRefundRequest } from '../../billing/refunds.js';

// Refund requests from Account → Billing. Nothing is refunded until an admin approves one here.
const router = express.Router();
router.use(requireDb);

const STATUSES = ['pending', 'approved', 'rejected'];

router.get('/', requireAdmin('payments.view'), handle(async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : '';
  const filter = status === 'pending' ? { status: { $in: ['pending', 'processing'] } } : status ? { status } : {};
  const [rows, counts] = await Promise.all([
    RefundRequest.find(filter).sort({ createdAt: -1 }).limit(300).lean(),
    RefundRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);
  const [users, subs] = await Promise.all([
    model('User').find({ email: { $in: [...new Set(rows.map((r) => r.email))] } }, { email: 1, name: 1 }).lean(),
    Subscription.find({ orderId: { $in: rows.map((r) => r.orderId) } }, { orderId: 1, startsAt: 1, expiresAt: 1, status: 1 }).lean()
  ]);
  const nameOf = new Map(users.map((u) => [u.email.toLowerCase(), u.name]));
  const subOf = new Map(subs.map((s) => [s.orderId, s]));
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  res.json({
    success: true,
    counts: { pending: (byStatus.pending || 0) + (byStatus.processing || 0), approved: byStatus.approved || 0, rejected: byStatus.rejected || 0 },
    data: rows.map((r) => {
      const sub = subOf.get(r.orderId);
      return {
        ...toRefundRequest(r),
        name: nameOf.get(r.email) || null,
        proFrom: sub?.startsAt || null,
        proUntil: sub?.expiresAt || null,
        proActive: !!sub && sub.status === 'active' && new Date(sub.expiresAt) > new Date()
      };
    })
  });
}));

// Approving starts the refund: Cashfree pays it back, the payment is marked refunded,
// the Pro time from that order ends and the buyer gets an email.
router.post('/:id/approve', requireAdmin('payments.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Request not found.');
  const note = clean(req.body?.note, 300);
  const request = await RefundRequest.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { status: 'processing' }, { returnDocument: 'after' }).lean();
  if (!request) throw httpError(409, 'This request has already been handled.');
  try {
    const payment = await model('PaymentLog').findOne({ transactionId: request.orderId }).lean();
    if (!payment) throw httpError(404, 'The payment for this request was not found.');
    let cfRefundId = '';
    // Already refunded from Payments: the request just closes as approved
    if (payment.status !== 'refunded') {
      ({ cfRefundId } = await refundPayment(payment._id, `Refund request: ${note || request.category}`));
    }
    const done = await RefundRequest.findByIdAndUpdate(request._id, { status: 'approved', adminNote: note, decidedBy: req.admin.name, decidedAt: new Date(), cfRefundId }, { returnDocument: 'after' }).lean();
    await audit(req, 'refund-request.approved', { targetType: 'email', targetId: request.email, targetLabel: `${request.orderId} · ${request.email}`, details: { amount: request.amount, note, cfRefundId } });
    res.json({ success: true, data: toRefundRequest(done) });
  } catch (err) {
    // Cashfree refused or something broke: the request goes back to waiting
    await RefundRequest.updateOne({ _id: request._id, status: 'processing' }, { status: 'pending' }).catch(() => {});
    throw err;
  }
}));

router.post('/:id/reject', requireAdmin('payments.manage'), handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Request not found.');
  const note = clean(req.body?.note, 300);
  if (!note) throw httpError(400, 'Add a note for the customer explaining why.');
  const request = await RefundRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { status: 'rejected', adminNote: note, decidedBy: req.admin.name, decidedAt: new Date() },
    { returnDocument: 'after' }
  ).lean();
  if (!request) throw httpError(409, 'This request has already been handled.');
  if (emailConfigured()) {
    const [user, sub] = await Promise.all([
      model('User').findOne({ email: request.email }, { name: 1 }).lean(),
      Subscription.findOne({ orderId: request.orderId, status: 'active' }).lean()
    ]);
    const until = sub ? new Date(sub.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
    sendEmail({ to: request.email, ...refundRejectedEmail({ name: user?.name || '', plan: PLANS[request.plan]?.label || request.plan, note, until }) })
      .catch((err) => console.error('[admin] refund rejection email failed:', err.message));
  }
  await audit(req, 'refund-request.rejected', { targetType: 'email', targetId: request.email, targetLabel: `${request.orderId} · ${request.email}`, details: { note } });
  res.json({ success: true, data: toRefundRequest(request) });
}));

export default router;

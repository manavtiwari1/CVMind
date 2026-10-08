import mongoose from 'mongoose';
import { sendEmail, emailConfigured } from '../admin/mailer.js';
import { refundInitiatedEmail } from '../services/emailTemplates.js';
import { cashfreeConfigured, createCashfreeRefund } from './cashfree.js';
import { PaymentOrder, Subscription, RefundRequest } from './models.js';
import { PLANS } from './plans.js';
import { cancelSubscription } from './service.js';

// Payments are non-refundable. A Monthly plan bought through Cashfree can ask for a refund for a
// genuine reason while its Pro time is running; an admin reviews it and starts the refund by hand.
export const REFUNDABLE_PLAN = 'monthly';

export const REFUND_CATEGORIES = {
  'charged-twice': 'I was charged twice',
  'not-working': "A Pro feature doesn't work for me",
  'bought-by-mistake': 'I bought it by mistake',
  other: 'Another genuine reason'
};

export const MIN_DETAILS = 30;

const PaymentLog = () => mongoose.models.PaymentLog;
const httpError = (status, message) => Object.assign(new Error(message), { status });

export const formatRupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// The account's latest Monthly payment and whether a refund can be asked for on it
export async function refundEligibility(email) {
  const order = await PaymentOrder.findOne({ email, status: 'paid', plan: REFUNDABLE_PLAN, amount: { $gt: 0 } }).sort({ paidAt: -1 }).lean();
  if (!order) return { eligible: false, why: 'no-monthly' };
  const [sub, log] = await Promise.all([
    Subscription.findOne({ orderId: order.orderId }).lean(),
    PaymentLog().findOne({ transactionId: order.orderId }).lean()
  ]);
  if (log?.status === 'refunded') return { eligible: false, why: 'refunded', order, sub };
  if (!sub || sub.status !== 'active' || new Date(sub.expiresAt) <= new Date()) return { eligible: false, why: 'ended', order, sub };
  return { eligible: true, order, sub };
}

/**
 * Refunds a successful payment: Cashfree pays it back (for a Cashfree order), the payment is marked
 * refunded, the Pro time from that order ends and the buyer gets an email. Used by Admin → Payments
 * and by approving a refund request.
 * @returns {Promise<{ payment: object, order: object|null, cfRefundId: string, subscriptionEnded: boolean }>}
 */
export async function refundPayment(paymentId, reason) {
  const found = await PaymentLog().findOne({ _id: paymentId, status: 'success' }).lean();
  if (!found) throw httpError(400, 'Only successful payments can be refunded.');

  const order = found.transactionId ? await PaymentOrder.findOne({ orderId: found.transactionId, status: 'paid' }).lean() : null;
  let cfRefundId = '';
  if (order && order.amount > 0 && cashfreeConfigured()) {
    cfRefundId = `rf_${order.orderId}`;
    try {
      await createCashfreeRefund({ orderId: order.orderId, amount: order.amount, refundId: cfRefundId, note: reason });
    } catch (err) {
      // 409: this refund was already made (an earlier attempt that didn't finish here)
      if (err.status !== 409) throw httpError(502, `Cashfree couldn't refund this payment: ${err.message}`);
    }
  }

  const payment = await PaymentLog().findOneAndUpdate(
    { _id: found._id, status: 'success' },
    { status: 'refunded', refundedAt: new Date(), refundReason: reason },
    { returnDocument: 'after' }
  ).lean();
  if (!payment) throw httpError(400, 'Only successful payments can be refunded.');
  const ended = order ? await cancelSubscription({ orderId: order.orderId }) : null;

  if (emailConfigured()) {
    const user = await mongoose.models.User?.findOne({ email: payment.email }, { name: 1 }).lean();
    sendEmail({
      to: payment.email,
      ...refundInitiatedEmail({
        name: user?.name || '',
        amount: formatRupees(payment.amount),
        plan: PLANS[order?.plan || payment.plan]?.label || payment.plan || 'CVMind Pro',
        orderId: payment.transactionId,
        proEnded: !!ended,
        viaCashfree: !!cfRefundId
      })
    }).catch((err) => console.error('[billing] refund email failed:', payment.transactionId, err.message));
  }
  return { payment, order, cfRefundId, subscriptionEnded: !!ended };
}

export const toRefundRequest = (r) => ({
  id: String(r._id),
  email: r.email,
  orderId: r.orderId,
  plan: r.plan,
  planLabel: PLANS[r.plan]?.label || r.plan,
  amount: r.amount,
  category: r.category,
  categoryLabel: REFUND_CATEGORIES[r.category] || r.category,
  details: r.details,
  status: r.status,
  adminNote: r.adminNote,
  decidedBy: r.decidedBy,
  decidedAt: r.decidedAt,
  createdAt: r.createdAt
});

export { RefundRequest };

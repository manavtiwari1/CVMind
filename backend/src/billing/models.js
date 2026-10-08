import mongoose from 'mongoose';

const { Schema } = mongoose;

// One paid (or admin-given) stretch of CVMind Pro. An account is Pro while any of its
// subscriptions is active and not past expiresAt.
const subscriptionSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  plan: { type: String, required: true },
  amount: { type: Number, default: 0 },
  startsAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  status: { type: String, default: 'active' }, // 'active' | 'cancelled'
  source: { type: String, default: 'cashfree' }, // 'cashfree' | 'admin'
  orderId: { type: String, default: '' },
  grantedBy: { type: String, default: '' },
  note: { type: String, default: '' },
  cancelledAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
subscriptionSchema.index({ email: 1, expiresAt: -1 });
// One subscription per paid order, so a webhook and the return page can't both add one
subscriptionSchema.index({ orderId: 1 }, { unique: true, partialFilterExpression: { orderId: { $gt: '' } } });
export const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);

// A Cashfree checkout. Created before the payment page opens, marked paid once Cashfree confirms it.
const paymentOrderSchema = new Schema({
  orderId: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  userId: { type: String, default: '' },
  plan: { type: String, required: true },
  listPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
  couponCode: { type: String, default: '' },
  discount: { type: Number, default: 0 },
  status: { type: String, default: 'created' }, // 'created' | 'paid' | 'failed'
  paymentMethod: { type: String, default: '' },
  cfPaymentId: { type: String, default: '' },
  paidAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
paymentOrderSchema.index({ email: 1, createdAt: -1 });
export const PaymentOrder = mongoose.models.PaymentOrder || mongoose.model('PaymentOrder', paymentOrderSchema);

// AI tokens spent per request, for the rolling 3-day budget and the admin dashboard totals.
// Kept long enough for the dashboard's 90-day view and the 90 days before it; older rows clean themselves up.
const AI_USAGE_KEEP_SECONDS = 400 * 24 * 60 * 60;
const aiUsageSchema = new Schema({
  email: { type: String, required: true },
  tokens: { type: Number, required: true },
  path: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
aiUsageSchema.index({ email: 1, createdAt: -1 });
aiUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: AI_USAGE_KEEP_SECONDS });
export const AiUsage = mongoose.models.AiUsage || mongoose.model('AiUsage', aiUsageSchema);

// MongoDB keeps an existing TTL index's old expiry when the schema's value changes, so update it in place.
// Fails quietly when the collection doesn't exist yet: the index is then created with the new value.
const syncAiUsageTtl = () => mongoose.connection.db
  .command({ collMod: AiUsage.collection.collectionName, index: { keyPattern: { createdAt: 1 }, expireAfterSeconds: AI_USAGE_KEEP_SECONDS } })
  .catch(() => {});
if (mongoose.connection.readyState === 1) syncAiUsageTtl();
else mongoose.connection.once('open', syncAiUsageTtl);

// Extra AI tokens an admin gave an account. Raises its 3-day limit until expiresAt.
const tokenGrantSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  tokens: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  grantedBy: { type: String, default: '' },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
tokenGrantSchema.index({ email: 1, expiresAt: -1 });
export const TokenGrant = mongoose.models.TokenGrant || mongoose.model('TokenGrant', tokenGrantSchema);

// One free use of a weekly-limited feature (portfolio, tailor, interview session, code hints)
const featureUseSchema = new Schema({
  email: { type: String, required: true },
  feature: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
featureUseSchema.index({ email: 1, feature: 1, createdAt: -1 });
featureUseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
export const FeatureUse = mongoose.models.FeatureUse || mongoose.model('FeatureUse', featureUseSchema);

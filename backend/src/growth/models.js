import mongoose from 'mongoose';

// Models for the growth features: the "Your plan" checklist, job alert emails, referral requests,
// resume share links, offer negotiation and invite-a-friend credits.

const DAY = 24 * 60 * 60 * 1000;
const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

// ── "Your plan" checklist ────────────────────────────────────────────────────
const onboardingSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hiddenAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true });
export const OnboardingState = model('OnboardingState', onboardingSchema);

// ── Job alert emails ─────────────────────────────────────────────────────────
const jobAlertSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true },
  enabled: { type: Boolean, default: true },
  frequency: { type: String, enum: ['weekly', 'daily'], default: 'weekly' },
  minScore: { type: Number, default: 60, min: 0, max: 100 },
  // Secret for the one-click unsubscribe link; works without signing in
  unsubscribeToken: { type: String, required: true, unique: true },
  lastSentAt: { type: Date, default: null },
  lastRunAt: { type: Date, default: null },
  sentCount: { type: Number, default: 0 }
}, { timestamps: true });
jobAlertSchema.index({ enabled: 1, lastRunAt: 1 });
export const JobAlert = model('JobAlert', jobAlertSchema);

// Jobs already emailed to a user, so the same job is never sent twice
const jobAlertSentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  jobKey: { type: String, required: true },
  sentAt: { type: Date, default: Date.now, expires: 90 * 24 * 60 * 60 }
});
jobAlertSentSchema.index({ userId: 1, jobKey: 1 }, { unique: true });
export const JobAlertSent = model('JobAlertSent', jobAlertSentSchema);

// ── "Find a referral" from a job ─────────────────────────────────────────────
const referralAskSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  email: { type: String, default: '' },
  jobKey: { type: String, required: true },
  company: { type: String, default: '' },
  title: { type: String, default: '' },
  workId: { type: String, default: '' },
  sentAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
referralAskSchema.index({ userId: 1, jobKey: 1 });
export const ReferralAsk = model('ReferralAsk', referralAskSchema);

// ── Resume share links ───────────────────────────────────────────────────────
const shareLinkSchema = new mongoose.Schema({
  workId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  lastViewedAt: { type: Date, default: null }
}, { timestamps: true });
export const ShareLink = model('ShareLink', shareLinkSchema);

// One row per counted view. No IP or browser is stored: `visitor` is a hash with a daily salt,
// only used to count a visitor once per 30 minutes.
const resumeViewSchema = new mongoose.Schema({
  shareId: { type: String, required: true, index: true },
  visitor: { type: String, required: true },
  refDomain: { type: String, default: '' },
  country: { type: String, default: '' },
  at: { type: Date, default: Date.now, expires: 180 * 24 * 60 * 60 }
});
resumeViewSchema.index({ shareId: 1, visitor: 1, at: -1 });
export const ResumeView = model('ResumeView', resumeViewSchema);

// ── Offer negotiation (admin AI Activity reads this; no salary figures are logged) ──
const negotiationLogSchema = new mongoose.Schema({
  userId: { type: String, default: '', index: true },
  email: { type: String, default: '' },
  company: { type: String, default: '' },
  role: { type: String, default: '' },
  tone: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
export const NegotiationLog = model('NegotiationLog', negotiationLogSchema);

// ── Invite friends ───────────────────────────────────────────────────────────
const referralCodeSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true },
  code: { type: String, required: true, unique: true }
}, { timestamps: true });
export const ReferralCode = model('ReferralCode', referralCodeSchema);

const referralSchema = new mongoose.Schema({
  referrerId: { type: String, required: true, index: true },
  referrerEmail: { type: String, required: true, lowercase: true },
  // One referral per friend account: the first code wins
  friendUserId: { type: String, required: true, unique: true },
  friendEmail: { type: String, required: true, lowercase: true },
  code: { type: String, required: true },
  status: { type: String, enum: ['signed_up', 'qualified', 'rejected'], default: 'signed_up' },
  reason: { type: String, default: '' },
  qualifiedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
export const Referral = model('Referral', referralSchema);

// An extra Job Finder application on top of the free monthly one
const applyCreditSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  userId: { type: String, default: '' },
  source: { type: String, default: 'referral' },
  referralId: { type: String, default: '' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * DAY) },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
export const ApplyCredit = model('ApplyCredit', applyCreditSchema);

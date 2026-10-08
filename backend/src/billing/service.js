import { dbReady } from '../admin/auth.js';
import { Subscription, AiUsage, FeatureUse, TokenGrant } from './models.js';
import { PLANS, FREE_WEEKLY, WEEK_MS, TOKEN_LIMITS, TOKEN_WINDOW_MS } from './plans.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const norm = (email) => String(email || '').trim().toLowerCase();

// The latest active subscription that hasn't ended, or null
export async function activeSubscription(email) {
  const clean = norm(email);
  if (!clean || !(await dbReady(2000))) return null;
  return Subscription.findOne({ email: clean, status: 'active', expiresAt: { $gt: new Date() } }).sort({ expiresAt: -1 }).lean();
}

export async function isPro(email) {
  return !!(await activeSubscription(email));
}

// Adds a plan to an account. Time stacks on top of an active subscription.
// With an orderId it runs once per order: a second call returns the first subscription.
export async function activatePlan({ email, plan, days, amount = 0, source, orderId = '', grantedBy = '', note = '' }) {
  const clean = norm(email);
  const length = days ?? PLANS[plan]?.days;
  if (!clean || !length) throw new Error('Unknown plan.');
  if (orderId) {
    const existing = await Subscription.findOne({ orderId }).lean();
    if (existing) return existing;
  }
  const current = await activeSubscription(clean);
  const startsAt = current ? new Date(current.expiresAt) : new Date();
  const expiresAt = new Date(startsAt.getTime() + length * DAY_MS);
  try {
    return (await Subscription.create({ email: clean, plan, amount, startsAt, expiresAt, source, orderId, grantedBy, note })).toObject();
  } catch (err) {
    // The other path (webhook or return page) won the race for this order
    if (err.code === 11000 && orderId) return Subscription.findOne({ orderId }).lean();
    throw err;
  }
}

// ── AI token budget ─────────────────────────────────────────────────────────
// Extra tokens from admin grants that haven't expired
export async function bonusTokens(email) {
  const clean = norm(email);
  if (!clean) return 0;
  const [row] = await TokenGrant.aggregate([
    { $match: { email: clean, expiresAt: { $gt: new Date() } } },
    { $group: { _id: null, tokens: { $sum: '$tokens' } } }
  ]);
  return row?.tokens || 0;
}

export async function grantTokens({ email, tokens, days, grantedBy = '', note = '' }) {
  const expiresAt = new Date(Date.now() + days * DAY_MS);
  return (await TokenGrant.create({ email: norm(email), tokens, expiresAt, grantedBy, note })).toObject();
}

export async function tokenStatus(email, pro) {
  const clean = norm(email);
  const base = pro ? TOKEN_LIMITS.pro : TOKEN_LIMITS.free;
  if (!clean || !(await dbReady(2000))) return { used: 0, limit: base, base, bonus: 0, resetsAt: null };
  const since = new Date(Date.now() - TOKEN_WINDOW_MS);
  const [[row], bonus] = await Promise.all([
    AiUsage.aggregate([
      { $match: { email: clean, createdAt: { $gt: since } } },
      { $group: { _id: null, used: { $sum: '$tokens' }, first: { $min: '$createdAt' } } }
    ]),
    bonusTokens(clean)
  ]);
  return {
    used: row?.used || 0,
    limit: base + bonus,
    base,
    bonus,
    // The oldest use in the window drops out first
    resetsAt: row?.first ? new Date(row.first.getTime() + TOKEN_WINDOW_MS) : null
  };
}

export async function recordTokens(email, tokens, path = '') {
  const clean = norm(email);
  const n = Math.round(Number(tokens) || 0);
  if (!clean || n <= 0 || !(await dbReady(0))) return;
  await AiUsage.create({ email: clean, tokens: n, path: String(path).slice(0, 120) });
}

// ── Weekly free uses ────────────────────────────────────────────────────────
export async function weeklyUses(email) {
  const clean = norm(email);
  const counts = Object.fromEntries(Object.keys(FREE_WEEKLY).map((k) => [k, 0]));
  if (!clean || !(await dbReady(2000))) return counts;
  const rows = await FeatureUse.aggregate([
    { $match: { email: clean, createdAt: { $gt: new Date(Date.now() - WEEK_MS) } } },
    { $group: { _id: '$feature', count: { $sum: 1 } } }
  ]);
  for (const r of rows) if (r._id in counts) counts[r._id] = r.count;
  return counts;
}

export async function featureAllowance(email, feature) {
  const clean = norm(email);
  const { limit } = FREE_WEEKLY[feature];
  const since = new Date(Date.now() - WEEK_MS);
  const uses = await FeatureUse.find({ email: clean, feature, createdAt: { $gt: since } }).sort({ createdAt: 1 }).limit(limit).lean();
  return {
    used: uses.length,
    limit,
    resetsAt: uses.length >= limit ? new Date(uses[0].createdAt.getTime() + WEEK_MS) : null
  };
}

export async function recordFeatureUse(email, feature) {
  const clean = norm(email);
  if (!clean || !(await dbReady(0))) return;
  await FeatureUse.create({ email: clean, feature });
}

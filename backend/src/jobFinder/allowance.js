import { isPro } from '../billing/service.js';
import { FeatureUse } from '../billing/models.js';
import { JobApplyLog } from './models.js';
import { availableCredits } from '../growth/referrals.js';

// What a free account gets in AI Job Finder: one application a month, and a few searches a day
// that use the paid job APIs (after that, searches still run on company careers pages and CVMind
// recruiters). Pro accounts have no limits. Credits earned by inviting friends add applications
// on top of the monthly one (growth/referrals.js); the monthly one is used first.

export const FREE_APPLIES = 1;
export const APPLY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const FREE_SEARCHES = 10;
export const SEARCH_WINDOW_MS = 24 * 60 * 60 * 1000;
const SEARCH_FEATURE = 'job-finder-search';

const resetAt = (oldest, windowMs) => (oldest ? new Date(new Date(oldest).getTime() + windowMs) : null);

/** The account's plan and what it has left; `applies`/`searches` are null for Pro */
export async function planFor(email, now = Date.now()) {
  const address = String(email || '').toLowerCase();
  if (await isPro(address)) return { pro: true, applies: null, searches: null };
  const [applied, searched, credits] = await Promise.all([
    JobApplyLog.find({ email: address, createdAt: { $gt: new Date(now - APPLY_WINDOW_MS) } }, { createdAt: 1 }).sort({ createdAt: 1 }).lean(),
    FeatureUse.find({ email: address, feature: SEARCH_FEATURE, createdAt: { $gt: new Date(now - SEARCH_WINDOW_MS) } }, { createdAt: 1 }).sort({ createdAt: 1 }).lean(),
    availableCredits(address, new Date(now))
  ]);
  return {
    pro: false,
    applies: {
      used: Math.min(applied.length, FREE_APPLIES),
      limit: FREE_APPLIES + credits,
      credits,
      resetsAt: applied.length >= FREE_APPLIES ? resetAt(applied[0].createdAt, APPLY_WINDOW_MS) : null
    },
    searches: { used: searched.length, limit: FREE_SEARCHES, resetsAt: searched.length >= FREE_SEARCHES ? resetAt(searched[0].createdAt, SEARCH_WINDOW_MS) : null }
  };
}

export const canApply = (plan) => plan.pro || plan.applies.used < plan.applies.limit;
export const canSearchEverywhere = (plan) => plan.pro || plan.searches.used < plan.searches.limit;

export function recordSearch(email) {
  return FeatureUse.create({ email: String(email || '').toLowerCase(), feature: SEARCH_FEATURE });
}

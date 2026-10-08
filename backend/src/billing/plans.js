// CVMind Pro plans, the free allowance and the AI token budget. Prices are in rupees.
// Buying a plan while one is active adds its days on top of the current end date.

export const PLANS = {
  'pass-3d': { label: '3-day pass', price: 39, days: 3 },
  'pass-7d': { label: '7-day pass', price: 79, days: 7 },
  monthly: { label: 'Monthly', price: 189, days: 30 },
  'half-yearly': { label: '6 months', price: 600, days: 182 },
  yearly: { label: 'Yearly', price: 1099, days: 365 }
};

export const PLAN_KEYS = Object.keys(PLANS);

// Launch: the pricing page opens at 11:00 PM IST on 10 Oct 2026 and checkout at midnight, 11 Oct.
// PRICING_OPENS_AT / PAYMENTS_OPEN_AT (ISO dates) override them, e.g. to test or move the launch.
const at = (value, fallback) => {
  const d = new Date(value || fallback);
  return Number.isNaN(d.getTime()) ? new Date(fallback) : d;
};
export const pricingOpensAt = () => at(process.env.PRICING_OPENS_AT, '2026-10-10T23:00:00+05:30');
export const paymentsOpenAt = () => at(process.env.PAYMENTS_OPEN_AT, '2026-10-11T00:00:00+05:30');

// Free accounts get a few uses of these each week (rolling 7 days); Pro is unlimited
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const FREE_WEEKLY = {
  portfolio: { label: 'Portfolio generator', limit: 2 },
  tailor: { label: 'Resume tailor', limit: 2 },
  'cover-letter': { label: 'AI cover letter', limit: 1 },
  'interview-text': { label: 'Interview prep session', limit: 1 },
  'interview-voice': { label: 'Voice interview session', limit: 1 },
  'code-explanation': { label: 'CVMind Code explanation hint', limit: 2 },
  'code-solution': { label: 'CVMind Code full solution', limit: 2 }
};

// AI tokens each account can use in a rolling 3-day window
export const TOKEN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export const TOKEN_LIMITS = { free: 75000, pro: 200000 };
// Admins can give an account extra tokens on top of its limit, for a number of days
export const MAX_BONUS_TOKENS = 10000000;
export const MAX_BONUS_DAYS = 365;

// Resume templates that need Pro (ids from frontend/src/data/cvTemplates.ts)
export const PRO_TEMPLATES = ['cv-stylish', 'cv-hybrid', 'cv-portrait', 'cv-terracotta', 'cv-spotlight', 'cv-studio', 'cv-ledger'];

// Cover letter designs that need Pro (ids from frontend/src/data/coverLetterTemplates.ts)
export const PRO_LETTER_TEMPLATES = ['cl-navy-tan', 'cl-dots', 'cl-hex', 'cl-clean', 'cl-serif-center'];

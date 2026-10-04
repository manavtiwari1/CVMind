import disposableList from '../data/disposableDomains.js';

// Accounts at or above this score must solve a captcha to sign up and can't contact support until an admin clears them
export const RISK_HIGH = 50;

const RISK_POINTS = {
  disposable_email: 60,
  signup_velocity: 20
};

let domains = null;
const disposableDomains = () => {
  if (!domains) domains = new Set(disposableList.split('\n').map((d) => d.trim().toLowerCase()).filter(Boolean));
  return domains;
};

// Matches the domain and its parents, so mail.tempdomain.com is caught by tempdomain.com
export function isDisposableEmail(email) {
  const domain = String(email || '').trim().toLowerCase().split('@')[1] || '';
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    if (disposableDomains().has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

// { score, flags } for a new sign-up. ipSignupCount is how many sign-ups this IP made in the current hour.
export function assessSignupRisk(email, { ipSignupCount = 0 } = {}) {
  const flags = [];
  if (isDisposableEmail(email)) flags.push('disposable_email');
  if (ipSignupCount > 2) flags.push('signup_velocity');
  return { score: flags.reduce((sum, f) => sum + RISK_POINTS[f], 0), flags };
}

export const isHighRisk = (user) => Number(user?.riskScore || 0) >= RISK_HIGH;

export const SENIORITY_LADDER = ['intern', 'junior', 'mid', 'senior', 'staff', 'principal'];

const MIN_YEAR = 1950;

// "YYYY-MM" / "YYYY" -> absolute month index; a year-only end date counts through December
export function monthIndex(value, { end = false } = {}) {
  const text = String(value ?? '').trim();
  let match = text.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    const month = Number(match[2]);
    if (month < 1 || month > 12 || Number(match[1]) < MIN_YEAR) return null;
    return Number(match[1]) * 12 + month - 1;
  }
  match = text.match(/^(\d{4})$/);
  if (match && Number(match[1]) >= MIN_YEAR) return Number(match[1]) * 12 + (end ? 11 : 0);
  return null;
}

const isOngoing = (role) => Boolean(role.current) || /present|current|now/i.test(String(role.endDate ?? ''));

// Overlapping roles count once per month; internships count half. Computed here, never trusted from the LLM
export function totalYearsExperience(experience = [], { now = new Date() } = {}) {
  const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const monthWeights = new Map();

  for (const role of experience) {
    const start = monthIndex(role.startDate);
    if (start === null) continue;
    const end = isOngoing(role) ? nowIndex : monthIndex(role.endDate, { end: true });
    if (end === null || end < start) continue;

    const weight = role.employmentType === 'internship' ? 0.5 : 1;
    for (let month = start; month <= Math.min(end, nowIndex); month++) {
      monthWeights.set(month, Math.max(monthWeights.get(month) || 0, weight));
    }
  }

  let months = 0;
  for (const weight of monthWeights.values()) months += weight;
  return Math.round((months / 12) * 10) / 10;
}

// Most recent role: ongoing roles first, then latest end date
export function latestRole(experience = []) {
  let best = null;
  let bestKey = -Infinity;
  for (const role of experience) {
    const key = isOngoing(role) ? Infinity : (monthIndex(role.endDate, { end: true }) ?? monthIndex(role.startDate) ?? -Infinity);
    if (key > bestKey || best === null) {
      best = role;
      bestKey = key;
    }
  }
  return best;
}

export function inferSeniority(years = 0, title = '') {
  const t = String(title).toLowerCase();
  if (/\b(intern|internship|trainee)\b/.test(t)) return 'intern';
  if (/\b(principal|distinguished|fellow)\b/.test(t)) return 'principal';
  if (/\b(staff|lead|architect|head|director|manager)\b/.test(t)) return 'staff';
  if (/\b(senior|sr)\b/.test(t)) return 'senior';
  if (/\b(junior|jr|graduate|entry)\b/.test(t)) return 'junior';
  if (years < 2) return 'junior';
  if (years < 5) return 'mid';
  if (years < 9) return 'senior';
  return 'staff';
}

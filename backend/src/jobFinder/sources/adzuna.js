import { monthKey, dayKey, takeCall, returnCall, callsMade } from './quota.js';
import { cachedJobs, storeJobs } from './searchCache.js';

// Adzuna's job search API (https://developer.adzuna.com): listings gathered from job sites and
// company pages, across every field. The free plan allows about 250 calls a day and 2,500 a month,
// so searches are cached for an hour and both caps are kept here. Adzuna's terms ask that results
// credit them; the app shows "Jobs by Adzuna" next to these listings.

const BASE = 'https://api.adzuna.com/v1/api/jobs';
const COUNTRY = () => (process.env.ADZUNA_COUNTRY || 'in').toLowerCase();
export const ADZUNA_MONTHLY_CAP = () => Math.max(0, parseInt(process.env.ADZUNA_MONTHLY_CAP, 10) || 2400);
export const ADZUNA_DAILY_CAP = () => Math.max(0, parseInt(process.env.ADZUNA_DAILY_CAP, 10) || 240);
export const adzunaConfigured = () => Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);

const stripTags = (text) => String(text || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const isRemote = (text) => /\bremote\b|work from home|\bwfh\b/i.test(text || '');

/** Calls made this month and today against the caps, for Admin → AI Job Finder */
export async function adzunaUsage(now = new Date()) {
  const [month, today] = await Promise.all([callsMade(monthKey('adzuna', now)), callsMade(dayKey('adzuna', now))]);
  return { used: month, cap: ADZUNA_MONTHLY_CAP(), today, dailyCap: ADZUNA_DAILY_CAP(), configured: adzunaConfigured() };
}

export function normalizeAdzunaJob(j) {
  const title = stripTags(j.title);
  const description = stripTags(j.description);
  return {
    jobKey: `az:${String(j.id).replace(/[^\w-]/g, '')}`,
    source: 'adzuna',
    title,
    // Some listings (often agencies) don't name the employer
    company: stripTags(j.company?.display_name) || 'Company not named',
    companyDomain: '',
    companyLogo: '',
    location: stripTags(j.location?.display_name),
    remote: isRemote(`${title} ${description}`),
    employmentType: j.contract_type === 'contract' ? 'Contract' : j.contract_time === 'part_time' ? 'Part-time' : j.contract_time === 'full_time' ? 'Full-time' : '',
    postedAt: j.created ? new Date(j.created) : null,
    applyUrl: /^https?:\/\//.test(j.redirect_url || '') ? j.redirect_url : '',
    publisher: 'Adzuna',
    description: description.slice(0, 20000)
  };
}

const cacheKey = ({ query, location, days, employmentType, anyOf }) =>
  ['adzuna', anyOf ? 'any' : 'all', COUNTRY(), query.toLowerCase().replace(/\s+/g, ' ').trim(), (location || '').toLowerCase().trim(), days || 'any', employmentType || 'any'].join('|');

// Both the day and the month allowance must have room; a refused day gives the month call back
async function takeAdzunaCall() {
  const month = monthKey('adzuna');
  if (!(await takeCall(month, ADZUNA_MONTHLY_CAP()))) return false;
  if (await takeCall(dayKey('adzuna'), ADZUNA_DAILY_CAP())) return true;
  await returnCall(month).catch(() => {});
  return false;
}

/**
 * Jobs for a search, from the hour-long cache or one Adzuna call. Returns [] when Adzuna isn't
 * configured, a cap is used up, or the call fails, so the feed still works from the other sources.
 * @param {{ query: string, location?: string, days?: number, employmentType?: string, anyOf?: boolean }} search
 *   anyOf: match jobs naming any of the query's words (a list of skills) instead of all of them
 */
export async function searchAdzuna(search, { fetchImpl = fetch } = {}) {
  if (!adzunaConfigured() || !search.query) return { jobs: [], cached: false, capped: false };
  const key = cacheKey(search);
  const hit = await cachedJobs(key);
  if (hit) return { jobs: hit, cached: true, capped: false };

  if (!(await takeAdzunaCall())) return { jobs: [], cached: false, capped: true };

  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID,
    app_key: process.env.ADZUNA_APP_KEY,
    results_per_page: '50',
    [search.anyOf ? 'what_or' : 'what']: search.query,
    'content-type': 'application/json'
  });
  if (search.location) params.set('where', search.location);
  if (search.days) params.set('max_days_old', String(search.days));
  if (search.employmentType === 'full_time') params.set('full_time', '1');
  if (search.employmentType === 'part_time') params.set('part_time', '1');
  if (search.employmentType === 'contract') params.set('contract', '1');

  let data;
  try {
    const res = await fetchImpl(`${BASE}/${COUNTRY()}/search/1?${params}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error('[jobFinder] Adzuna failed:', err.message);
    return { jobs: [], cached: false, capped: false };
  }

  const jobs = (Array.isArray(data?.results) ? data.results : [])
    .map(normalizeAdzunaJob)
    .filter((j) => j.title && j.applyUrl);
  await storeJobs(key, jobs);
  return { jobs, cached: false, capped: false };
}

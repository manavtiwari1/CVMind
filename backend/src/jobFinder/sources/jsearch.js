import crypto from 'crypto';
import { monthKey, takeCall, callsMade } from './quota.js';
import { cachedJobs, storeJobs } from './searchCache.js';

// JSearch (Google for Jobs listings: LinkedIn, Indeed, Naukri, company sites…) through RapidAPI.
// Every call is billed, so searches are cached for an hour and a monthly cap stops calls before
// the plan's quota (paid plans bill each request past it).

const HOST = () => process.env.JSEARCH_HOST || 'jsearch.p.rapidapi.com';
const COUNTRY = () => (process.env.JSEARCH_COUNTRY || 'in').toLowerCase();
export const MONTHLY_CAP = () => Math.max(0, parseInt(process.env.JSEARCH_MONTHLY_CAP, 10) || 9000);
export const jsearchConfigured = () => Boolean(process.env.JSEARCH_API_KEY);

const DATE_POSTED = { 1: 'today', 3: '3days', 7: 'week', 30: 'month' };
const EMPLOYMENT = { full_time: 'FULLTIME', internship: 'INTERN', part_time: 'PARTTIME', contract: 'CONTRACTOR' };
const EMPLOYMENT_LABEL = { FULLTIME: 'Full-time', INTERN: 'Internship', PARTTIME: 'Part-time', CONTRACTOR: 'Contract' };

export const jsearchKey = (jobId) => `js:${crypto.createHash('sha1').update(String(jobId)).digest('hex').slice(0, 24)}`;

const domainOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
};

/** Calls made this month and the cap, for Admin → AI Job Finder */
export async function jsearchUsage(now = new Date()) {
  return { used: await callsMade(monthKey('jsearch', now)), cap: MONTHLY_CAP(), configured: jsearchConfigured() };
}

export function normalizeJsearchJob(j) {
  const location = j.job_location || [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ');
  return {
    jobKey: jsearchKey(j.job_id),
    source: 'jsearch',
    title: String(j.job_title || '').trim(),
    company: String(j.employer_name || '').trim(),
    companyDomain: domainOf(j.employer_website),
    companyLogo: /^https:\/\//.test(j.employer_logo || '') ? j.employer_logo : '',
    location: j.job_is_remote && !location ? 'Remote' : location,
    remote: Boolean(j.job_is_remote),
    employmentType: EMPLOYMENT_LABEL[j.job_employment_type] || '',
    postedAt: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc) : null,
    applyUrl: /^https?:\/\//.test(j.job_apply_link || '') ? j.job_apply_link : '',
    publisher: String(j.job_publisher || ''),
    description: String(j.job_description || '').slice(0, 20000)
  };
}

const cacheKey = ({ query, days, remote, employmentType }) =>
  ['jsearch', COUNTRY(), query.toLowerCase().replace(/\s+/g, ' ').trim(), days || 'any', remote ? 'remote' : 'all', employmentType || 'any'].join('|');

/**
 * Jobs for a search, from the hour-long cache or one JSearch call. Returns [] when JSearch isn't
 * configured, the monthly cap is used up, or the call fails, so the feed still works from the free sources.
 * @param {{ query: string, days?: number, remote?: boolean, employmentType?: string }} search
 */
export async function searchJsearch(search, { fetchImpl = fetch } = {}) {
  if (!jsearchConfigured() || !search.query) return { jobs: [], cached: false, capped: false };
  const key = cacheKey(search);

  const hit = await cachedJobs(key);
  if (hit) return { jobs: hit, cached: true, capped: false };

  if (!(await takeCall(monthKey('jsearch'), MONTHLY_CAP()))) return { jobs: [], cached: false, capped: true };

  const params = new URLSearchParams({ query: search.query, page: '1', num_pages: '1', country: COUNTRY() });
  if (DATE_POSTED[search.days]) params.set('date_posted', DATE_POSTED[search.days]);
  if (search.remote) params.set('remote_jobs_only', 'true');
  if (EMPLOYMENT[search.employmentType]) params.set('employment_types', EMPLOYMENT[search.employmentType]);

  let data;
  try {
    const res = await fetchImpl(`https://${HOST()}/search?${params}`, {
      headers: { 'X-RapidAPI-Key': process.env.JSEARCH_API_KEY, 'X-RapidAPI-Host': HOST() },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error('[jobFinder] JSearch failed:', err.message);
    return { jobs: [], cached: false, capped: false };
  }

  const jobs = (Array.isArray(data?.data) ? data.data : [])
    .map(normalizeJsearchJob)
    .filter((j) => j.title && j.applyUrl);
  await storeJobs(key, jobs);
  return { jobs, cached: false, capped: false };
}

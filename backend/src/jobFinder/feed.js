import { searchJsearch } from './sources/jsearch.js';
import { searchAdzuna } from './sources/adzuna.js';
import { searchBoards, searchRecruiterJobs } from './sources/boards.js';
import { normalizeSkill } from '@cvmind/auto-apply-agent/scoring/normalizeSkill.js';
import { candidateFrom, matchJob, jobSeniority } from './match.js';
import { JobApplyLog } from './models.js';

// The Job Finder feed: one search across every source, duplicates dropped, filtered and ranked by
// how well each job fits the user.

const DAY_MS = 24 * 60 * 60 * 1000;
// When the same job comes from several sources, keep the most direct one
const SOURCE_RANK = { cvmind: 0, greenhouse: 1, lever: 1, ashby: 1, smartrecruiters: 1, workable: 1, jsearch: 2, adzuna: 3 };
// Levels each experience filter leaves out (jobs that don't state a level stay in)
const LEVEL_EXCLUDES = {
  fresher: ['mid', 'senior', 'staff', 'principal'],
  junior: ['senior', 'staff', 'principal'],
  mid: ['intern', 'staff', 'principal'],
  senior: ['intern', 'junior']
};
export const LEVEL_FILTERS = Object.keys(LEVEL_EXCLUDES);

const dedupeKey = (j) => [j.company, j.title, j.location].map((v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()).join('|');

export function mergeJobs(lists) {
  const byKey = new Map();
  for (const job of lists.flat()) {
    const key = dedupeKey(job);
    const current = byKey.get(key);
    if (!current || SOURCE_RANK[job.source] < SOURCE_RANK[current.source]) byKey.set(key, job);
  }
  return [...byKey.values()];
}

// Words that don't tell one employer from another: "Infosys BPM Limited" is Infosys
const COMPANY_NOISE = new Set(['pvt', 'private', 'ltd', 'limited', 'llp', 'inc', 'llc', 'india', 'technologies', 'technology', 'tech', 'solutions', 'services', 'group', 'corp', 'corporation', 'co', 'company', 'the', 'and', 'global', 'international']);
// Short names people type for employers that list under their full name
const COMPANY_ALIASES = { tcs: 'tata consultancy', pw: 'physicswallah', hcl: 'hcltech', lti: 'ltimindtree', mmt: 'makemytrip', jio: 'reliance jio' };
const companyWords = (name) => String(name || '').toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter((w) => w && !COMPANY_NOISE.has(w));

/** Whether a job's employer is the company the user typed (not just a job mentioning it) */
export function sameCompany(jobCompany, wanted) {
  const typed = String(wanted).toLowerCase().trim();
  // The name as typed, and its full form when it's a known short name ("TCS" lists as both)
  return [typed, COMPANY_ALIASES[typed]].filter(Boolean).some((name) => companyMatches(companyWords(jobCompany), companyWords(name)));
}

function companyMatches(have, want) {
  if (!want.length || !have.length) return false;
  // The typed words appear together in the employer's name: "Infosys" in "Infosys BPM"
  for (let i = 0; i + want.length <= have.length; i++) {
    if (want.every((w, k) => have[i + k] === w)) return true;
  }
  // Written together or apart: "HCLTech" and "HCL Technologies", "Physics Wallah" and "PhysicsWallah".
  // What's left over must be a filler word, so "Meta" isn't "Metasys"
  const a = want.join('');
  const b = have.join('');
  const [long, short] = a.length >= b.length ? [a, b] : [b, a];
  const rest = long.slice(short.length);
  return short.length >= 3 && long.startsWith(short) && (!rest || COMPANY_NOISE.has(rest));
}

export function applyFilters(jobs, { days, remote, level, company, now = Date.now() } = {}) {
  return jobs.filter((j) => {
    if (company && !sameCompany(j.company, company)) return false;
    if (remote && !j.remote) return false;
    if (days && j.postedAt && now - new Date(j.postedAt).getTime() > days * DAY_MS) return false;
    if (level && LEVEL_EXCLUDES[level]?.includes(jobSeniority(j.title))) return false;
    return true;
  });
}

const snippet = (text) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, 240);

/** The fields the app shows for a job; descriptions only travel with the detail view */
export function toClientJob(job, match, appliedAt = null) {
  return {
    jobKey: job.jobKey,
    source: job.source,
    title: job.title,
    company: job.company,
    companyDomain: job.companyDomain || '',
    companyLogo: job.companyLogo || '',
    location: job.location || '',
    remote: Boolean(job.remote),
    employmentType: job.employmentType || '',
    postedAt: job.postedAt || null,
    publisher: job.publisher || '',
    // Opened by the browser on the Apply click itself, so popup blockers allow the new tab
    applyUrl: job.applyUrl || '',
    appliesInCvmind: job.source === 'cvmind',
    snippet: snippet(job.description),
    match: match ? { score: match.score, matchedSkills: match.matchedSkills.slice(0, 8), missingSkills: match.missingSkills.slice(0, 8) } : null,
    appliedAt
  };
}

/** Jobs this account already applied to, by jobKey */
export async function appliedDates(email, jobKeys) {
  if (!email || !jobKeys.length) return new Map();
  const rows = await JobApplyLog.find({ email, jobKey: { $in: jobKeys } }, { jobKey: 1, createdAt: 1 }).lean();
  return new Map(rows.map((r) => [r.jobKey, r.createdAt]));
}

// Skills searched at once in the "For your skills" view
export const MAX_SEARCH_SKILLS = 3;

/**
 * @param {object} o
 * @param {object|null} o.profile ResumeProfile (lean) or null
 * @param {object} o.preferences agent preferences
 * @param {object} o.filters { q, location, days, remote, level, employmentType, mode, skills }
 *   mode 'skills' searches by the resume's skills (the `skills` picked, else its first few) instead of a role
 * @param {string} o.email signed-in account
 */
export async function buildFeed({ profile, preferences = {}, filters = {}, email, sources = {} }) {
  const candidate = candidateFrom(profile, preferences);
  const bySkills = filters.mode === 'skills';
  const location = String(filters.location || (filters.remote ? '' : preferences.locations?.[0] || '')).trim();

  let skills = [];
  if (bySkills) {
    const picked = (filters.skills || []).map(normalizeSkill).filter((s) => candidate.skills.includes(s));
    skills = (picked.length ? picked : candidate.skills).slice(0, MAX_SEARCH_SKILLS);
    if (!skills.length) return { jobs: [], query: '', mode: 'skills', skills: [], needsSkills: true, meta: {} };
  }
  const company = String(filters.company || '').trim();
  // With a company and no typed role, every job at that company is shown
  const role = bySkills ? skills.join(' ') : String(filters.q || (company ? '' : candidate.titles[0]) || '').trim();
  if (!role && !company) return { jobs: [], query: '', needsRole: true, meta: {} };
  const query = [role, company].filter(Boolean).join(' ');

  const jsearchQuery = `${filters.remote ? 'remote ' : ''}${role ? `${role} ` : ''}jobs${company ? ` at ${company}` : ''}${location ? ` in ${location}` : ''}`;
  const paid = (name, run) => run.catch((err) => { console.error(`[jobFinder] ${name} source failed:`, err.message); return { jobs: [] }; });
  const searchBoardsFor = sources.boards || searchBoards;
  const [jsearch, adzuna, boards, recruiters] = await Promise.all([
    paid('jsearch', (sources.jsearch || searchJsearch)({ query: jsearchQuery, days: filters.days, remote: filters.remote, employmentType: filters.employmentType })),
    paid('adzuna', (sources.adzuna || searchAdzuna)({ query: filters.remote ? `${query} remote` : query, location, days: filters.days, employmentType: filters.employmentType, anyOf: bySkills })),
    // Board search matches job titles, so each skill is its own search ("Python" finds "Python Developer")
    Promise.all((bySkills ? skills.map((s) => [s, company].filter(Boolean).join(' ')) : [query]).map((q) => searchBoardsFor({ query: q, location }).catch(() => []))).then((lists) => lists.flat()),
    (sources.recruiters || searchRecruiterJobs)({ query }).catch(() => [])
  ]);

  // By skills, the role the user wants doesn't count, and a job must ask for at least one picked skill
  const scoringAs = bySkills ? { ...candidate, titles: [] } : candidate;
  const jobs = applyFilters(mergeJobs([recruiters, boards, jsearch.jobs, adzuna.jobs]), filters);
  const scored = jobs
    .map((job) => ({ job, match: matchJob(job, scoringAs) }))
    .filter(({ match }) => !bySkills || match.matchedSkills.some((s) => skills.includes(s)));
  scored.sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1)
    || new Date(b.job.postedAt || 0) - new Date(a.job.postedAt || 0));

  const applied = await appliedDates(email, scored.map((s) => s.job.jobKey));
  return {
    query: bySkills ? skills.join(', ') : role,
    company,
    mode: bySkills ? 'skills' : 'role',
    skills,
    location,
    jobs: scored.slice(0, 60).map(({ job, match }) => toClientJob(job, match, applied.get(job.jobKey) || null)),
    meta: {
      counts: { jsearch: jsearch.jobs.length, adzuna: adzuna.jobs.length, boards: boards.length, recruiters: recruiters.length },
      jsearchCapped: Boolean(jsearch.capped),
      adzunaCapped: Boolean(adzuna.capped)
    }
  };
}

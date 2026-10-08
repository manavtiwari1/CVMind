// Live job search for the resume builder's "What job do you want next?" step.
//
// Sources are the companies' own public job boards (Greenhouse and Lever), which are published for
// exactly this kind of listing. Everything is cached in memory so a search never hits those APIs
// directly, and results are ranked by how well they match the query (no unrelated filler results).
import { htmlToStructuredText } from './parser.js';
import { fetchGreenhouseJob } from '@cvmind/auto-apply-agent/jobs/fetchers/greenhouse.js';

const GREENHOUSE = [
  ['stripe', 'Stripe', 'stripe.com'], ['mongodb', 'MongoDB', 'mongodb.com'], ['figma', 'Figma', 'figma.com'],
  ['datadog', 'Datadog', 'datadoghq.com'], ['reddit', 'Reddit', 'reddit.com'], ['elastic', 'Elastic', 'elastic.co'],
  ['cloudflare', 'Cloudflare', 'cloudflare.com'], ['airbnb', 'Airbnb', 'airbnb.com'], ['coinbase', 'Coinbase', 'coinbase.com'],
  ['gitlab', 'GitLab', 'gitlab.com'], ['pinterest', 'Pinterest', 'pinterest.com'], ['instacart', 'Instacart', 'instacart.com'],
  ['databricks', 'Databricks', 'databricks.com'], ['robinhood', 'Robinhood', 'robinhood.com'], ['discord', 'Discord', 'discord.com'],
  ['dropbox', 'Dropbox', 'dropbox.com'], ['twilio', 'Twilio', 'twilio.com'], ['asana', 'Asana', 'asana.com'],
  ['duolingo', 'Duolingo', 'duolingo.com'], ['lyft', 'Lyft', 'lyft.com'], ['inmobi', 'InMobi', 'inmobi.com'], ['groww', 'Groww', 'groww.in'],
];
const LEVER = [
  ['cred', 'CRED', 'cred.club'], ['paytm', 'Paytm', 'paytm.com'], ['meesho', 'Meesho', 'meesho.com'],
  ['freshworks', 'Freshworks', 'freshworks.com'], ['spotify', 'Spotify', 'spotify.com'],
];

const INDEX_TTL_MS = 30 * 60 * 1000;      // company boards
const DETAIL_TTL_MS = 60 * 60 * 1000;

let boardIndex = { at: 0, jobs: [], loading: null };
const detailCache = new Map();

const getJson = async (url) => {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'CVMindJobSearch/1.0 (+https://cvmind.in)' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const tidyTitle = (t) => { const s = String(t || '').trim(); return s && s === s.toLowerCase() ? s.replace(/(^|[\s(/-])([a-z])/g, (m, p, c) => p + c.toUpperCase()) : s; };
const isRemote = (text) => /\bremote\b|anywhere|worldwide/i.test(text || '');

async function loadGreenhouse([board, company, domain]) {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`);
  return (data.jobs || []).map((j) => ({
    id: `gh:${board}:${j.id}`, source: 'greenhouse', title: tidyTitle(j.title), company, domain, logo: null,
    location: j.location?.name || '', remote: isRemote(j.location?.name), team: '', type: '',
    postedAt: j.updated_at || j.first_published || null, url: j.absolute_url || '',
  }));
}

async function loadLever([slug, company, domain]) {
  const data = await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  return (Array.isArray(data) ? data : []).map((j) => {
    const lists = (j.lists || []).map((l) => `${l.text}\n${htmlToStructuredText(l.content)}`).join('\n\n');
    const description = [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join('\n\n').trim();
    const location = j.categories?.location || (j.categories?.allLocations || []).join(', ');
    return {
      id: `lv:${slug}:${j.id}`, source: 'lever', title: tidyTitle(j.text), company, domain, logo: null,
      location, remote: isRemote(location) || j.workplaceType === 'remote', team: j.categories?.team || '', type: j.categories?.commitment || '',
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null, url: j.hostedUrl || '', description,
    };
  });
}

/** Runs loaders with a small concurrency limit; a failing board is skipped, not fatal. */
async function settleAll(items, loader, limit = 6) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const item = items[i++];
      try { out.push(...await loader(item)); } catch (err) { console.warn(`[jobSearch] ${item[0]} skipped: ${err.message}`); }
    }
  }));
  return out;
}

async function ensure(index, ttl, build) {
  const fresh = Date.now() - index.at < ttl && index.jobs.length;
  if (fresh) return index.jobs;
  if (!index.loading) {
    index.loading = build()
      .then((jobs) => { if (jobs.length) { index.jobs = jobs; index.at = Date.now(); } return index.jobs; })
      .finally(() => { index.loading = null; });
  }
  // Serve stale data while refreshing, if we have any.
  return index.jobs.length ? index.jobs : index.loading;
}

const getBoards = () => ensure(boardIndex, INDEX_TTL_MS, async () => [
  ...await settleAll(GREENHOUSE, loadGreenhouse),
  ...await settleAll(LEVER, loadLever),
]);

const STOP = new Set(['job', 'jobs', 'role', 'roles', 'opening', 'openings', 'hiring', 'position', 'positions', 'in', 'at', 'for', 'the', 'a', 'an', 'and', 'of', 'to', 'near', 'me', 'vacancy', 'vacancies']);
const LEVEL_WORDS = { entry: ['intern', 'junior', 'associate', 'graduate', 'new grad', 'entry', 'trainee', 'early career'], fresher: ['intern', 'junior', 'associate', 'graduate', 'new grad', 'trainee'], senior: ['senior', 'sr.', 'staff', 'lead', 'principal'] };
const ALIASES = { developer: 'engineer', engineer: 'developer', frontend: 'front end', backend: 'back end', swe: 'software engineer', sde: 'software engineer', pm: 'product manager', ml: 'machine learning', ai: 'ai', ui: 'designer', ux: 'designer', bengaluru: 'bangalore', bangalore: 'bengaluru', gurgaon: 'gurugram', gurugram: 'gurgaon' };

const INDIA = /india|bengaluru|bangalore|gurugram|gurgaon|mumbai|pune|hyderabad|delhi|noida|chennai/;
const LOCATION_WORDS = /^(india|bengaluru|bangalore|gurugram|gurgaon|mumbai|pune|hyderabad|delhi|noida|chennai|kolkata|remote|usa|us|uk|london|canada|toronto|singapore|dublin|paris|berlin|sydney|tokyo|amsterdam|seattle|york|francisco)$/;
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function score(job, tokens, levels) {
  const title = job.title.toLowerCase();
  const role = title.split(/\s[-–|,(]|,|\(/)[0];       // "Marketing Associate" in "Marketing Associate - EMEA"
  const company = job.company.toLowerCase();
  const location = job.location.toLowerCase();
  const team = `${job.team} ${job.type}`.toLowerCase();
  let s = 0;
  let strong = false;
  let titleHits = 0;
  const roleTokens = tokens.filter((t) => !LOCATION_WORDS.test(t));
  for (const t of tokens) {
    const alt = ALIASES[t];
    const hit = (field) => field.includes(t) || (alt && field.includes(alt));
    if (company === t || company.split(/\s+/).includes(t)) { s += 6; strong = true; continue; }
    if (LOCATION_WORDS.test(t)) {
      // a location the user asked for is a hard preference
      if (hit(location) || (t === 'remote' && job.remote) || (t === 'india' && INDIA.test(location))) s += 3; else s -= 4;
      continue;
    }
    if (hit(title)) {
      titleHits += 1;
      s += new RegExp(`\\b${esc(t)}\\b`).test(title) ? 4 : 2;
      if (role.includes(t) || (alt && role.includes(alt))) s += 2;
      strong = true;
      continue;
    }
    if (hit(team)) { s += 1; continue; }
    s -= 2; // a word in the query that this job doesn't match at all
  }
  if (roleTokens.length > 1 && titleHits === roleTokens.length) s += 3;   // every role word is in the title
  if (levels.length && levels.some((l) => title.includes(l))) s += 3;
  if (!tokens.some((t) => LOCATION_WORDS.test(t)) && INDIA.test(location)) s += 0.5; // most users are in India
  return strong ? s : 0;
}

/** Searches cached live jobs. Returns at most `limit` jobs that actually match the query. */
export async function searchJobs(query, { limit = 24 } = {}) {
  const q = String(query || '').toLowerCase().replace(/[^a-z0-9+#./\s-]/g, ' ').trim();
  const words = q.split(/\s+/).filter(Boolean);
  const levels = words.flatMap((w) => LEVEL_WORDS[w] || []);
  const tokens = words.filter((w) => !STOP.has(w) && !LEVEL_WORDS[w] && w !== 'level');
  if (!tokens.length && !levels.length) return { jobs: [], total: 0 };

  const boards = await getBoards().catch(() => []);
  const ranked = boards
    .map((job) => ({ job, s: tokens.length ? score(job, tokens, levels) : (levels.some((l) => job.title.toLowerCase().includes(l)) ? 1 : 0) }))
    .filter((r) => r.s > 0)
    // When the user named a place, only show jobs there (as long as there are a few).
    .filter((r, _i, all) => {
      const places = tokens.filter((t) => LOCATION_WORDS.test(t));
      if (!places.length) return true;
      const inPlace = (job) => places.some((t) => job.location.toLowerCase().includes(t) || (ALIASES[t] && job.location.toLowerCase().includes(ALIASES[t])) || (t === 'remote' && job.remote) || (t === 'india' && INDIA.test(job.location.toLowerCase())));
      return all.filter((x) => inPlace(x.job)).length < 3 || inPlace(r.job);
    })
    .sort((a, b) => b.s - a.s || new Date(b.job.postedAt || 0) - new Date(a.job.postedAt || 0));

  const jobs = ranked.slice(0, limit).map(({ job }) => {
    // eslint-disable-next-line no-unused-vars
    const { description, ...summary } = job;
    return summary;
  });
  return { jobs, total: ranked.length };
}

/** Full description for one job (fetched on demand for Greenhouse, cached for the others). */
export async function getJobDetail(id) {
  const cached = detailCache.get(id);
  if (cached && Date.now() - cached.at < DETAIL_TTL_MS) return cached.data;

  let data = null;
  if (id.startsWith('gh:')) {
    const [, board, jobId] = id.split(':');
    if (!GREENHOUSE.some(([b]) => b === board) || !/^\d+$/.test(jobId)) return null;
    const job = await fetchGreenhouseJob({ boardToken: board, jobId });
    data = { description: job.descriptionText || '' };
  } else {
    const job = boardIndex.jobs.find((j) => j.id === id);
    if (job) data = { description: job.description || '' };
  }
  if (data) detailCache.set(id, { at: Date.now(), data });
  return data;
}

/** Warm the caches in the background so the first search is fast. */
export function warmJobSearch() {
  getBoards().catch(() => {});
}

/** Company names we search, for the "no results" hint. */
export const JOB_SEARCH_COMPANIES = [...GREENHOUSE, ...LEVER].map(([, name]) => name);

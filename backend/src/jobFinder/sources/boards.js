import mongoose from 'mongoose';
import { searchJobs, getJobDetail } from '../../services/jobSearch.js';
import { FinderJob } from '../models.js';

// Free sources: companies' own job boards (Greenhouse, Lever, Ashby, SmartRecruiters and Workable,
// read by services/jobSearch.js) and jobs recruiters posted on the CVMind Company Portal.

const JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Applicant tracking systems whose public boards services/jobSearch.js reads
export const BOARD_SOURCES = ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable'];
const PUBLISHER = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', smartrecruiters: 'SmartRecruiters', workable: 'Workable' };

async function remember(jobs) {
  if (!jobs.length) return;
  const expiresAt = new Date(Date.now() + JOB_TTL_MS);
  await FinderJob.bulkWrite(jobs.map((j) => ({
    // A Greenhouse description is fetched later on demand; don't wipe one already stored
    updateOne: { filter: { jobKey: j.jobKey }, update: { $set: { ...j, expiresAt } }, upsert: true }
  })));
}

/** Company-board jobs matching the search, best first */
export async function searchBoards({ query, location = '' }) {
  if (!query) return [];
  const { jobs } = await searchJobs(`${query} ${location}`.trim(), { limit: 60 }).catch(() => ({ jobs: [] }));
  const normalized = jobs.map((j) => ({
    jobKey: j.id,
    source: j.source,
    title: j.title,
    company: j.company,
    companyDomain: j.domain || '',
    location: j.location || (j.remote ? 'Remote' : ''),
    remote: Boolean(j.remote),
    employmentType: j.type || '',
    postedAt: j.postedAt ? new Date(j.postedAt) : null,
    applyUrl: j.url || '',
    publisher: PUBLISHER[j.source] || ''
  })).filter((j) => j.applyUrl);
  await remember(normalized);
  return normalized;
}

/** Full description for a board job, stored on our copy the first time it's opened */
export async function boardDescription(job) {
  if (job.description) return job.description;
  const detail = await getJobDetail(job.jobKey).catch(() => null);
  const description = detail?.description || '';
  if (description) await FinderJob.updateOne({ jobKey: job.jobKey }, { $set: { description: description.slice(0, 20000) } });
  return description;
}

const words = (text) => String(text || '').toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1);

/** Active Company Portal jobs whose title or skills share a word with the search */
export async function searchRecruiterJobs({ query }) {
  const Job = mongoose.models.Job;
  if (!Job || mongoose.connection.readyState !== 1) return [];
  const wanted = new Set(words(query));
  const rows = await Job.find({ status: 'ACTIVE' }).sort({ postedAt: -1 }).limit(200).lean();
  const matching = rows.filter((r) => !wanted.size || [...words(r.title), ...(r.skills || []).flatMap(words)].some((w) => wanted.has(w)));
  const normalized = matching.slice(0, 20).map((r) => ({
    jobKey: `cv:${r.id}`,
    source: 'cvmind',
    title: r.title,
    company: r.companyName,
    companyDomain: r.domain || '',
    companyLogo: /^https:\/\//.test(r.companyLogo || '') ? r.companyLogo : '',
    location: r.location || '',
    remote: /remote/i.test(`${r.remote} ${r.location}`),
    employmentType: r.jobType || '',
    postedAt: r.postedAt || null,
    applyUrl: '',
    publisher: 'CVMind',
    description: [r.description, r.requirements, (r.skills || []).length ? `Skills: ${r.skills.join(', ')}` : ''].filter(Boolean).join('\n\n').slice(0, 20000),
    cvmindJobId: r.id,
    companyId: r.companyId || ''
  }));
  await remember(normalized);
  return normalized;
}

import { FinderJob, JobSearchCache } from '../models.js';

// Hour-long cache for searches against the paid or rate-limited job APIs: the same search within
// the hour is answered from MongoDB instead of another call.

const JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The cached jobs for a search key, in their original order; null when not cached */
export async function cachedJobs(key) {
  const hit = await JobSearchCache.findOne({ key }).lean();
  if (!hit) return null;
  const docs = await FinderJob.find({ jobKey: { $in: hit.jobKeys } }).lean();
  const byKey = new Map(docs.map((d) => [d.jobKey, d]));
  return hit.jobKeys.map((k) => byKey.get(k)).filter(Boolean);
}

/** Stores a search's jobs (kept a week, for the detail view and apply records) and caches the search */
export async function storeJobs(key, jobs) {
  const expiresAt = new Date(Date.now() + JOB_TTL_MS);
  if (jobs.length) {
    await FinderJob.bulkWrite(jobs.map((j) => ({
      updateOne: { filter: { jobKey: j.jobKey }, update: { $set: { ...j, expiresAt } }, upsert: true }
    })));
  }
  await JobSearchCache.updateOne({ key }, { $set: { jobKeys: jobs.map((j) => j.jobKey), createdAt: new Date() } }, { upsert: true });
}

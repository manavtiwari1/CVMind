import mongoose from 'mongoose';
import AgentApplication from '../models/AgentApplication.js';
import JobPosting from '../models/JobPosting.js';
import ResumeProfile from '../models/ResumeProfile.js';
import { getPreferences } from '../preferences/service.js';
import { normalizeJobUrl, detectAts } from '../jobs/urlNormalize.js';
import { JOB_PARSE_VERSION } from '../jobs/jobData.js';
import { enqueueMatch, enqueueJobParse } from '../pipeline.js';
import { tryConsume } from '../rateLimit.js';
import { logEvent } from '../events.js';
import { sha256 } from '../resume/derive.js';
import { importCvmindWork } from '../resume/intake.js';

export const MIN_DESCRIPTION_CHARS = 150;
export const MAX_DESCRIPTION_CHARS = 60000;
const DAILY_APPLICATION_ADDS = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const fail = (status, code, error) => ({ ok: false, status, code, error });

// Explicit choice, then the preferences default, then the default resume, then the newest ready one
export async function pickResume(userId, requestedId) {
  if (requestedId) {
    if (!mongoose.isValidObjectId(requestedId)) return null;
    return ResumeProfile.findOne({ _id: requestedId, userId }).select('-embeddings').lean();
  }
  const preferences = await getPreferences(userId);
  if (preferences?.defaultResumeProfileId) {
    const preferred = await ResumeProfile.findOne({ _id: preferences.defaultResumeProfileId, userId }).select('-embeddings').lean();
    if (preferred && preferred.status !== 'failed') return preferred;
  }
  return (await ResumeProfile.findOne({ userId, isDefault: true, status: { $ne: 'failed' } }).select('-embeddings').lean())
    || ResumeProfile.findOne({ userId, status: 'ready' }).sort({ updatedAt: -1 }).select('-embeddings').lean();
}

// The query fields are copied into the inserted document, so they are not repeated in $setOnInsert
async function upsertPosting(filter, insert) {
  try {
    return await JobPosting.findOneAndUpdate(filter, { $setOnInsert: insert }, { upsert: true, returnDocument: 'after' }).lean();
  } catch (err) {
    if (err?.code === 11000) return JobPosting.findOne(filter).lean();
    throw err;
  }
}

/**
 * Adds a job for a user: dedupes the posting, creates the application and queues the next step.
 * Shared by the web app (POST /applications) and the extension's "track this job".
 */
// db.js connects to MONGODB_URI on import, so it is loaded lazily (and injectable for tests)
async function defaultLoadLatestResumeWork(userId) {
  const { getUserWorks } = await import('../../db.js');
  const works = await getUserWorks(userId);
  return works.find((work) => work.type === 'resume') || null;
}

// With no agent resume yet, the resume saved in the user's CVMind dashboard (My Works) is used instead
async function importDashboardResume(userId, loadLatestResumeWork) {
  const work = await loadLatestResumeWork(userId);
  if (!work || String(work.userId) !== String(userId)) return null;
  const { profile } = await importCvmindWork({ userId, workId: work._id ?? work.id, work, via: 'dashboard_fallback' });
  return profile.toObject ? profile.toObject() : profile;
}

export async function createApplicationForUser({ userId, url, description, resumeProfileId, loadLatestResumeWork = defaultLoadLatestResumeWork }) {
  const text = typeof description === 'string' ? description.trim() : '';
  if (!url && !text) return fail(400, 'MISSING_JOB', 'Paste a job link or the job description.');

  let normalizedUrl = null;
  if (url) {
    normalizedUrl = normalizeJobUrl(url);
    if (!normalizedUrl) return fail(400, 'INVALID_URL', "That doesn't look like a valid job link.");
  } else if (text.length < MIN_DESCRIPTION_CHARS) {
    return fail(400, 'DESCRIPTION_TOO_SHORT', 'That description is too short to score. Paste the full job posting.');
  } else if (text.length > MAX_DESCRIPTION_CHARS) {
    return fail(400, 'DESCRIPTION_TOO_LONG', 'That description is too long. Paste only the job posting.');
  }

  let resume = await pickResume(userId, resumeProfileId);
  if (!resume && !resumeProfileId) resume = await importDashboardResume(userId, loadLatestResumeWork);
  if (!resume || resume.status === 'failed') {
    return fail(400, 'NO_RESUME', 'Upload a resume in the Resume Checker or here before adding jobs.');
  }

  const quota = await tryConsume(`user:${userId}:applications:add`, { limit: DAILY_APPLICATION_ADDS, windowMs: DAY_MS });
  if (!quota.ok) return fail(429, 'DAILY_LIMIT', 'You have added the maximum number of jobs for today.');

  const posting = normalizedUrl
    ? await upsertPosting({ urlHash: sha256(normalizedUrl) }, (({ ats, ...atsIds }) => ({ source: 'url', url: normalizedUrl, ats, atsIds, status: 'pending' }))(detectAts(normalizedUrl)))
    : await upsertPosting({ contentHash: sha256(text.replace(/\s+/g, ' ').toLowerCase()) }, { source: 'paste', descriptionText: text, ats: 'unknown', status: 'pending' });

  const existing = await AgentApplication.findOne({ userId, jobPostingId: posting._id }).lean();
  if (existing) return { ok: false, status: 409, code: 'ALREADY_ADDED', error: 'You already added this job.', application: existing, posting };

  const jobReady = posting.status === 'ready' && posting.parseVersion === JOB_PARSE_VERSION;
  let application;
  try {
    application = (await AgentApplication.create({
      userId,
      jobPostingId: posting._id,
      resumeProfileId: resume._id,
      status: 'pending',
      progress: { step: jobReady ? 'scoring' : 'parsing_job', updatedAt: new Date() }
    })).toObject();
  } catch (err) {
    if (err?.code !== 11000) throw err;
    const raced = await AgentApplication.findOne({ userId, jobPostingId: posting._id }).lean();
    return { ok: false, status: 409, code: 'ALREADY_ADDED', error: 'You already added this job.', application: raced, posting };
  }

  await logEvent({ applicationId: application._id, userId, type: 'application.created', actor: 'user', data: { source: posting.source, ats: posting.ats } });
  if (jobReady) {
    await enqueueMatch(application);
  } else {
    if (posting.status === 'failed') await JobPosting.updateOne({ _id: posting._id }, { $set: { status: 'pending' }, $unset: { parseError: '' } });
    await enqueueJobParse(posting);
  }
  return { ok: true, status: 202, application, posting };
}

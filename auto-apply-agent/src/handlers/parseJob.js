import JobPosting from '../models/JobPosting.js';
import AgentApplication from '../models/AgentApplication.js';
import { generateStructured } from '../ai/geminiClient.js';
import { JobExtracted } from '../ai/schemas.js';
import { PARSE_JOB_SYSTEM, buildParseJobPrompt } from '../ai/prompts/parseJob.js';
import { buildJobData, embedJob, JOB_PARSE_VERSION } from '../jobs/jobData.js';
import { defaultFetchers } from '../jobs/fetchers/index.js';
import { enqueueMatch, markFailed } from '../pipeline.js';
import { logEvent } from '../events.js';
import { FatalError } from '../errors.js';

const MIN_JOB_TEXT_CHARS = 150;

function readJobSource(posting, fetchers) {
  if (posting.source === 'paste') return { descriptionText: posting.descriptionText || '' };
  if (posting.ats === 'greenhouse' && posting.atsIds?.boardToken) return fetchers.greenhouse(posting.atsIds);
  if (posting.ats === 'lever' && posting.atsIds?.company) return fetchers.lever(posting.atsIds);
  return fetchers.generic(posting.url);
}

async function advanceWaitingApplications(postingId) {
  const applications = await AgentApplication.find({ jobPostingId: postingId, status: 'pending' }).lean();
  for (const application of applications) {
    await AgentApplication.updateOne({ _id: application._id, status: 'pending' }, { $set: { 'progress.step': 'scoring', 'progress.updatedAt': new Date() } });
    await enqueueMatch(application);
  }
  return applications;
}

export function createParseJobHandler({ ai = {}, fetchers = defaultFetchers } = {}) {
  return async function parseJob(job) {
    const posting = await JobPosting.findById(job.payload?.jobPostingId).select('+descriptionText').lean();
    if (!posting) throw new FatalError('Job posting not found.', { code: 'NOT_FOUND' });
    if (posting.status === 'ready' && posting.parseVersion === JOB_PARSE_VERSION) {
      await advanceWaitingApplications(posting._id);
      return;
    }

    const startedAt = Date.now();
    await JobPosting.updateOne({ _id: posting._id }, { $set: { status: 'parsing' }, $unset: { parseError: '' } });

    try {
      const source = await readJobSource(posting, fetchers);
      const text = [
        source.title && `Title: ${source.title}`,
        source.company && `Company: ${source.company}`,
        source.location && `Location: ${source.location}`,
        source.descriptionText
      ].filter(Boolean).join('\n').trim();
      if (text.length < MIN_JOB_TEXT_CHARS) {
        throw new FatalError('Could not find a job description. Paste the description instead.', { code: 'JOB_TOO_SHORT' });
      }

      const extracted = await generateStructured({ schema: JobExtracted, system: PARSE_JOB_SYSTEM, prompt: buildParseJobPrompt(text), client: ai.client });
      const data = buildJobData(extracted, source, posting);
      const embeddings = await embedJob(data, { client: ai.client });

      await JobPosting.updateOne({ _id: posting._id }, {
        $set: {
          ...data,
          descriptionText: source.descriptionText || posting.descriptionText || '',
          applyUrl: source.applyUrl || posting.url || '',
          atsQuestions: source.atsQuestions || [],
          embeddings,
          status: 'ready',
          parseVersion: JOB_PARSE_VERSION,
          fetchedAt: new Date()
        }
      });

      const applications = await advanceWaitingApplications(posting._id);
      for (const application of applications) {
        await logEvent({
          applicationId: application._id,
          userId: application.userId,
          type: 'job.parsed',
          message: `Read the job posting: ${data.title}${data.company.name ? ` at ${data.company.name}` : ''}.`,
          data: {
            ats: posting.ats,
            mustHaveSkills: data.requirements.mustHaveSkills.length,
            niceToHaveSkills: data.requirements.niceToHaveSkills.length,
            responsibilities: data.responsibilities.length
          },
          queueJobId: job._id,
          durationMs: Date.now() - startedAt
        });
      }
    } catch (err) {
      if (err?.retryable === false || job.attempts >= job.maxAttempts) {
        await JobPosting.updateOne({ _id: posting._id }, { $set: { status: 'failed', parseError: err.message } });
        const waiting = await AgentApplication.find({ jobPostingId: posting._id, status: 'pending' }).lean();
        for (const application of waiting) {
          await markFailed(application._id, 'job.parse', err);
          await logEvent({ applicationId: application._id, userId: application.userId, type: 'job.parse_failed', message: err.message, data: { code: err.code || null }, queueJobId: job._id });
        }
      }
      throw err;
    }
  };
}

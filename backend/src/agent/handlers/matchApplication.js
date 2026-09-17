import AgentApplication from '../models/AgentApplication.js';
import JobPosting from '../models/JobPosting.js';
import ResumeProfile from '../models/ResumeProfile.js';
import { getPreferences } from '../preferences/service.js';
import { DEFAULT_PREFERENCES } from '../preferences/schema.js';
import { embedTexts, cosine, getEmbedModel, getEmbedDims } from '../ai/geminiClient.js';
import { embedProfileBullets, vectorFromStored } from '../resume/embeddings.js';
import { computeScore } from '../scoring/score.js';
import { transition, markFailed, setProgress } from '../pipeline.js';
import { logEvent } from '../events.js';
import { FatalError, RetryableError } from '../errors.js';

// Best similarity between the job title and the titles the user wants or recently held
async function titleSimilarity(posting, resume, preferences, client) {
  const sameModel = posting.embeddings?.embedModel === getEmbedModel() && posting.embeddings?.dims === getEmbedDims();
  if (!sameModel || !posting.embeddings?.title) return null;
  const recentTitles = (resume.structured?.experience || []).map((role) => role.title).filter(Boolean).slice(0, 2);
  const titles = [...new Set([...(preferences.targetTitles || []), ...recentTitles])].slice(0, 10);
  if (!titles.length) return null;

  const jobVector = vectorFromStored(posting.embeddings.title);
  const vectors = await embedTexts(titles, { client });
  return Math.max(...vectors.map((vector) => cosine(jobVector, vector)));
}

export function createMatchHandler({ ai = {} } = {}) {
  return async function matchApplication(job) {
    const application = await AgentApplication.findById(job.payload?.applicationId).lean();
    if (!application) throw new FatalError('Application not found.', { code: 'NOT_FOUND' });
    if (!['pending', 'matched'].includes(application.status)) return;

    const startedAt = Date.now();
    try {
      const [posting, resumeDoc, savedPreferences] = await Promise.all([
        JobPosting.findById(application.jobPostingId).lean(),
        ResumeProfile.findById(application.resumeProfileId).lean(),
        getPreferences(application.userId)
      ]);
      if (!posting) throw new FatalError('The job posting no longer exists.', { code: 'JOB_MISSING' });
      if (posting.status === 'failed') throw new FatalError(posting.parseError || 'The job posting could not be read.', { code: 'JOB_FAILED' });
      if (posting.status !== 'ready') throw new RetryableError('The job posting is still being read.', { code: 'JOB_NOT_READY' });
      if (!resumeDoc || resumeDoc.status === 'failed') throw new FatalError('The resume for this application is not available.', { code: 'RESUME_UNAVAILABLE' });
      if (resumeDoc.status !== 'ready') throw new RetryableError('The resume is still being parsed.', { code: 'RESUME_NOT_READY' });

      await setProgress(application._id, 'scoring');

      // A resume edit may still be waiting on its re-embed job; embedding here (cached by text) keeps scores current
      let resume = resumeDoc;
      const { embeddedCount, ...embeddings } = await embedProfileBullets(resume.structured, resume.embeddings, { client: ai.client });
      if (embeddedCount > 0) {
        await ResumeProfile.updateOne({ _id: resume._id }, { $set: { embeddings } });
        resume = { ...resume, embeddings };
      }

      const preferences = savedPreferences ?? structuredClone(DEFAULT_PREFERENCES);
      const similarity = await titleSimilarity(posting, resume, preferences, ai.client);
      const score = computeScore({ resume, job: posting, preferences, titleSimilarity: similarity });

      const updated = await transition(application._id, ['pending', 'matched'], 'matched', {
        score,
        error: null,
        companyKey: posting.company?.key || null,
        'progress.step': 'awaiting_decision'
      });
      if (!updated) return;

      await logEvent({
        applicationId: application._id,
        userId: application.userId,
        type: 'score.computed',
        message: `Fit score ${score.total}/100.`,
        data: {
          total: score.total,
          components: score.components,
          gatesPassed: score.gatesPassed,
          failedGates: score.gates.filter((gate) => gate.result === 'fail').map((gate) => gate.key),
          recommendation: score.recommendation
        },
        queueJobId: job._id,
        durationMs: Date.now() - startedAt
      });
    } catch (err) {
      if (err?.retryable === false || job.attempts >= job.maxAttempts) {
        await markFailed(application._id, 'match', err);
        await logEvent({ applicationId: application._id, userId: application.userId, type: 'score.failed', message: err.message, data: { code: err.code || null }, queueJobId: job._id });
      }
      throw err;
    }
  };
}

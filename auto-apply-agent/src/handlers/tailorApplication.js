import AgentApplication from '../models/AgentApplication.js';
import JobPosting from '../models/JobPosting.js';
import ResumeProfile from '../models/ResumeProfile.js';
import { getPreferences } from '../preferences/service.js';
import { DEFAULT_PREFERENCES } from '../preferences/schema.js';
import { generateStructured } from '../ai/geminiClient.js';
import { TailoredResumeOutput, CoverLetterOutput } from '../ai/schemas.js';
import { TAILOR_SYSTEM, buildTailorPrompt } from '../ai/prompts/tailor.js';
import { COVER_LETTER_SYSTEM, buildCoverLetterPrompt } from '../ai/prompts/coverLetter.js';
import { guardTailoredResume, guardCoverLetter, missingJobSkills } from '../tailoring/guard.js';
import { renderApplicationPdf, storeRenderedPdf, tailoredResumeHash } from '../resume/pdfArtifacts.js';
import { renderPdf } from '../resume/pdf.js';
import { sha256 } from '../resume/derive.js';
import { transition, markFailed, setProgress } from '../pipeline.js';
import { logEvent } from '../events.js';
import { FatalError } from '../errors.js';

export const TAILOR_VERSION = 1;

function countKinds(violations) {
  return violations.reduce((counts, violation) => ({ ...counts, [violation.kind]: (counts[violation.kind] || 0) + 1 }), {});
}

export function createTailorHandler({ ai = {}, render = renderPdf } = {}) {
  return async function tailorApplication(job) {
    const application = await AgentApplication.findById(job.payload?.applicationId).lean();
    if (!application) throw new FatalError('Application not found.', { code: 'NOT_FOUND' });
    if (application.status !== 'tailoring') return;

    const startedAt = Date.now();
    const base = { applicationId: application._id, userId: application.userId, queueJobId: job._id };
    try {
      const [posting, resume, savedPreferences] = await Promise.all([
        JobPosting.findById(application.jobPostingId).lean(),
        ResumeProfile.findById(application.resumeProfileId).lean(),
        getPreferences(application.userId)
      ]);
      if (!posting || posting.status !== 'ready') throw new FatalError('The job posting is not available.', { code: 'JOB_UNAVAILABLE' });
      if (!resume || resume.status !== 'ready') throw new FatalError('The resume for this application is not available.', { code: 'RESUME_UNAVAILABLE' });
      const preferences = savedPreferences ?? structuredClone(DEFAULT_PREFERENCES);

      // A retry after the documents were saved (e.g. a crash while rendering) reuses them instead of regenerating
      const inputHash = sha256(JSON.stringify({ version: TAILOR_VERSION, resume: String(resume.updatedAt), job: String(posting.updatedAt) }));
      let tailored = application.tailored?.resume && application.tailored.inputHash === inputHash ? application.tailored : null;

      if (!tailored) {
        const missingSkills = missingJobSkills(posting, application.score);
        await setProgress(application._id, 'tailoring_resume');
        const output = await generateStructured({
          schema: TailoredResumeOutput,
          system: TAILOR_SYSTEM,
          prompt: buildTailorPrompt({ structured: resume.structured, job: posting, score: application.score, missingSkills }),
          client: ai.client,
          temperature: 0.3
        });
        const { resume: tailoredResume, violations } = guardTailoredResume(output, resume.structured);
        if (violations.length) {
          await logEvent({ ...base, type: 'tailor.guard_violation', message: `Removed ${violations.length} suggested change(s) not supported by your resume.`, data: { kinds: countKinds(violations) } });
        }

        await setProgress(application._id, 'writing_cover_letter');
        const letter = await generateStructured({
          schema: CoverLetterOutput,
          system: COVER_LETTER_SYSTEM,
          prompt: buildCoverLetterPrompt({ resume: tailoredResume, job: posting, preferences, missingSkills }),
          client: ai.client,
          temperature: 0.5
        });

        tailored = {
          resume: tailoredResume,
          coverLetter: guardCoverLetter(letter, { structured: resume.structured, job: posting }),
          changes: output.changes.map((change) => String(change).trim()).filter(Boolean).slice(0, 5),
          violations: violations.length,
          inputHash,
          generatedAt: new Date(),
          userEdited: false,
          pdf: null
        };
        const saved = await AgentApplication.updateOne(
          { _id: application._id, status: 'tailoring' },
          { $set: { tailored, 'progress.step': 'rendering_pdf', 'progress.updatedAt': new Date() } }
        );
        if (saved.matchedCount === 0) return;
        await logEvent({
          ...base,
          type: 'tailor.completed',
          message: 'Tailored your resume and wrote a cover letter.',
          data: { changes: tailored.changes.length, coverLetterNeedsReview: tailored.coverLetter.needsReview },
          durationMs: Date.now() - startedAt
        });
      }

      if (!tailored.pdf || tailored.pdf.sha256 !== tailoredResumeHash(tailored)) {
        try {
          const pdf = await renderApplicationPdf({ application: { ...application, tailored }, posting, render });
          if (await storeRenderedPdf(application._id, tailored.pdf, pdf)) {
            await logEvent({ ...base, type: 'pdf.rendered', message: 'Created the PDF of your tailored resume.', data: { size: pdf.size } });
          }
        } catch (err) {
          // The documents are usable without a PDF; downloading retries the render
          await logEvent({ ...base, type: 'pdf.failed', message: err.message, data: { code: err.code || null } });
        }
      }

      await transition(application._id, ['tailoring'], 'ready_for_review', { 'progress.step': 'awaiting_submission' });
    } catch (err) {
      if (err?.retryable === false || job.attempts >= job.maxAttempts) {
        await markFailed(application._id, 'tailor', err);
        await logEvent({ ...base, type: 'tailor.failed', message: err.message, data: { code: err.code || null } });
      }
      throw err;
    }
  };
}

export function createRenderPdfHandler({ render = renderPdf } = {}) {
  return async function renderTailoredPdf(job) {
    const application = await AgentApplication.findById(job.payload?.applicationId).lean();
    const tailored = application?.tailored;
    if (!tailored?.resume) return;
    if (tailored.pdf?.gridFsId && tailored.pdf.sha256 === tailoredResumeHash(tailored)) return;

    const posting = await JobPosting.findById(application.jobPostingId).lean();
    const pdf = await renderApplicationPdf({ application, posting, render });
    if (await storeRenderedPdf(application._id, tailored.pdf, pdf)) {
      await logEvent({ applicationId: application._id, userId: application.userId, type: 'pdf.rendered', message: 'Updated the PDF of your tailored resume.', data: { size: pdf.size }, queueJobId: job._id });
    }
  };
}

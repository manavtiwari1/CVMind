import AgentApplication from '../models/AgentApplication.js';
import JobPosting from '../models/JobPosting.js';
import ResumeProfile from '../models/ResumeProfile.js';
import { getPreferences } from '../preferences/service.js';
import { DEFAULT_PREFERENCES } from '../preferences/schema.js';
import { buildFillPlan } from '../fill/buildFillPlan.js';
import { pickAdapter, BaseAdapter } from '../adapters/index.js';
import { withContext } from '../browser.js';
import { uploadBuffer, downloadBuffer, BUCKETS } from '../storage/gridfs.js';
import { consumeOrDefer } from '../rateLimit.js';
import { transition, markFailed, setProgress } from '../pipeline.js';
import { logEvent } from '../events.js';
import { FatalError } from '../errors.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

async function loadContext(application) {
  const [posting, resume, preferences] = await Promise.all([
    JobPosting.findById(application.jobPostingId).lean(),
    ResumeProfile.findById(application.resumeProfileId).lean(),
    getPreferences(application.userId)
  ]);
  if (!posting || posting.status !== 'ready') throw new FatalError('The job posting is not available.', { code: 'JOB_UNAVAILABLE' });
  if (!resume || resume.status !== 'ready') throw new FatalError('The resume for this application is not available.', { code: 'RESUME_UNAVAILABLE' });
  return { posting, resume, preferences: preferences ?? structuredClone(DEFAULT_PREFERENCES) };
}

async function resumeFileFor(application) {
  const pdf = application.tailored?.pdf;
  if (!pdf?.gridFsId) return null;
  return { name: pdf.filename, mimeType: 'application/pdf', buffer: await downloadBuffer(BUCKETS.agentArtifacts, pdf.gridFsId) };
}

const storeScreenshot = (application, buffer, label) => uploadBuffer(BUCKETS.agentArtifacts, buffer, {
  filename: `${label}.png`,
  contentType: 'image/png',
  metadata: { userId: application.userId, applicationId: String(application._id), kind: 'screenshot' }
});

// Anything the server cannot finish safely goes back to the user's own browser.
// The whole `fill` object is written rather than dotted paths: `fill` is Mixed and often null,
// so fill.* writes would not create the parent and the reason was silently lost.
async function handOff(application, reason, extra = {}) {
  await AgentApplication.updateOne({ _id: application._id }, {
    $set: {
      fill: { ...(application.fill || {}), handoff: 'extension', blockedReason: reason, handedOffAt: new Date() },
      'progress.step': 'awaiting_submission',
      'progress.updatedAt': new Date(),
      ...extra
    }
  });
  await logEvent({
    applicationId: application._id,
    userId: application.userId,
    type: 'fill.handoff',
    message: 'CVMind could not finish this form on the server, so fill it with the browser extension instead.',
    data: { reason }
  });
}

/**
 * Fills the application in a server browser and stops. It never submits: the user reviews a
 * screenshot and the values first, and submitting is a separate, explicitly approved job.
 */
export function createApplyFillHandler({ buildPlan = buildFillPlan, runInContext = withContext } = {}) {
  return async function applyFill(job) {
    const application = await AgentApplication.findById(job.payload?.applicationId).lean();
    if (!application) throw new FatalError('Application not found.', { code: 'NOT_FOUND' });
    if (application.status !== 'ready_for_review' || application.submission) return;

    const base = { applicationId: application._id, userId: application.userId, queueJobId: job._id };
    try {
      const { posting, resume, preferences } = await loadContext(application);
      const { AdapterClass, enabled, reason } = pickAdapter(posting.applyUrl || posting.url);
      if (!enabled || !AdapterClass.canServerSubmit) {
        // A known-but-unfillable ATS (Workday) explains itself; otherwise fall back to the picker's reason
        await handOff(application, AdapterClass.handoffReason || reason || 'unsupported_site');
        return;
      }

      // One application per company per day, and a gentle cap per ATS host across all users
      await consumeOrDefer(`user:${application.userId}:company:${application.companyKey || posting.company?.key || 'unknown'}`, { limit: 1, windowMs: DAY_MS });
      await consumeOrDefer(`ats:${AdapterClass.id}`, { limit: 6, windowMs: MINUTE_MS });

      await setProgress(application._id, 'filling');
      const resumeFile = await resumeFileFor(application);

      const outcome = await runInContext(async (context) => {
        await BaseAdapter.prepare(context);
        const page = await context.newPage();
        const adapter = new AdapterClass({ page, job: posting });
        await adapter.open();

        const blockers = await adapter.detectBlockers();
        if (blockers.blocked) return { blockers };

        const descriptors = await adapter.scan();
        const plan = await buildPlan(descriptors, {
          profile: resume.structured,
          derived: resume.derived,
          preferences,
          tailored: application.tailored,
          job: posting
        }, {});

        const filled = await adapter.fill(plan, { resumeFile });
        const mismatches = await adapter.verify(plan);
        const screenshot = await adapter.screenshot();
        return { plan, filled, mismatches, screenshot, fingerprint: BaseAdapter.fingerprint(descriptors), adapterId: AdapterClass.id };
      }, { viewport: { width: 1280, height: 1600 } });

      if (outcome.blockers) {
        await handOff(application, outcome.blockers.captcha ? 'captcha' : 'login_required');
        return;
      }

      const screenshotId = await storeScreenshot(application, outcome.screenshot, 'filled-form');
      await AgentApplication.updateOne({ _id: application._id, status: 'ready_for_review' }, {
        $set: {
          fill: {
            adapter: outcome.adapterId,
            plan: outcome.plan,
            planHash: outcome.plan.planHash,
            fingerprint: outcome.fingerprint,
            screenshotId,
            filled: outcome.filled.filled,
            needsReview: outcome.plan.stats.needsReview,
            unmappedRequired: outcome.plan.unmappedRequired,
            mismatches: outcome.mismatches,
            handoff: null,
            filledAt: new Date()
          },
          'progress.step': 'awaiting_submit',
          'progress.updatedAt': new Date()
        }
      });
      await logEvent({
        ...base,
        type: 'fill.completed',
        message: `Filled ${outcome.filled.filled} fields on the ${outcome.adapterId} form. Review it before submitting.`,
        data: { adapter: outcome.adapterId, filled: outcome.filled.filled, needsReview: outcome.plan.stats.needsReview, unmappedRequired: outcome.plan.unmappedRequired.length, mismatches: outcome.mismatches.length }
      });
    } catch (err) {
      if (err?.code === 'BROWSER_UNAVAILABLE') {
        await handOff(application, 'browser_unavailable');
        return;
      }
      if (err?.retryable === false || job.attempts >= job.maxAttempts) {
        await markFailed(application._id, 'apply.fill', err);
        await logEvent({ ...base, type: 'fill.failed', message: err.message, data: { code: err.code || null } });
      }
      throw err;
    }
  };
}

/**
 * Submits a plan the user approved. Runs once (maxAttempts 1) and refuses if the form changed
 * since it was filled, so an approved set of answers can never land in a different form.
 */
export function createApplySubmitHandler({ runInContext = withContext } = {}) {
  return async function applySubmit(job) {
    const application = await AgentApplication.findById(job.payload?.applicationId).lean();
    if (!application) throw new FatalError('Application not found.', { code: 'NOT_FOUND' });
    if (application.status !== 'ready_for_review' || application.submission) return;
    if (!application.fill?.plan) throw new FatalError('This application has not been filled yet.', { code: 'NOT_FILLED' });
    if (application.fill.approvedPlanHash !== application.fill.planHash) {
      throw new FatalError('The approved answers no longer match the filled form.', { code: 'PLAN_NOT_APPROVED' });
    }

    const base = { applicationId: application._id, userId: application.userId, queueJobId: job._id };
    try {
      const { posting } = await loadContext(application);
      const { AdapterClass, enabled } = pickAdapter(posting.applyUrl || posting.url);
      if (!enabled || !AdapterClass.canServerSubmit) {
        await handOff(application, AdapterClass.handoffReason || 'unsupported_site');
        return;
      }

      await setProgress(application._id, 'submitting');
      const resumeFile = await resumeFileFor(application);

      const outcome = await runInContext(async (context) => {
        await BaseAdapter.prepare(context);
        const page = await context.newPage();
        const adapter = new AdapterClass({ page, job: posting });
        await adapter.open();

        const blockers = await adapter.detectBlockers();
        if (blockers.blocked) return { blockers };

        const descriptors = await adapter.scan();
        if (BaseAdapter.fingerprint(descriptors) !== application.fill.fingerprint) return { drift: true };

        await adapter.fill(application.fill.plan, { resumeFile });
        const mismatches = await adapter.verify(application.fill.plan);
        if (mismatches.length) return { mismatches };

        const submitted = await adapter.submit();
        const screenshot = await adapter.screenshot();
        return { submitted, screenshot };
      }, { viewport: { width: 1280, height: 1600 } });

      if (outcome.blockers || outcome.drift || outcome.mismatches) {
        const reason = outcome.drift ? 'form_changed' : outcome.mismatches ? 'values_not_applied' : 'blocked';
        await handOff(application, reason);
        await logEvent({ ...base, type: 'submit.aborted', message: 'Stopped before submitting because the form did not match what you approved.', data: { reason } });
        return;
      }

      const screenshotId = await storeScreenshot(application, outcome.screenshot, 'after-submit');
      if (!outcome.submitted.confirmed) {
        // Never retried: a second attempt could submit the same application twice
        await AgentApplication.updateOne({ _id: application._id }, {
          $set: {
            status: 'failed',
            error: { stage: 'apply.submit', code: 'SUBMIT_UNCONFIRMED', message: 'The site did not confirm the submission. Check the job site before applying again.' },
            'fill.screenshotAfterSubmit': screenshotId,
            'progress.updatedAt': new Date()
          }
        });
        await logEvent({ ...base, type: 'submit.unconfirmed', message: 'Submitted, but the site did not confirm it. Check the job site before trying again.', data: { reason: outcome.submitted.reason } });
        return;
      }

      await transition(application._id, ['ready_for_review'], 'submitted', {
        submission: { via: 'server', submittedAt: new Date(), confirmationText: outcome.submitted.text?.slice(0, 200) || '', screenshotId },
        'progress.step': 'submitted'
      });
      await logEvent({ ...base, type: 'application.submitted', message: 'CVMind submitted this application after your approval.', data: { via: 'server', adapter: AdapterClass.id } });
    } catch (err) {
      if (err?.code === 'BROWSER_UNAVAILABLE') {
        await handOff(application, 'browser_unavailable');
        return;
      }
      await markFailed(application._id, 'apply.submit', err);
      await logEvent({ ...base, type: 'submit.failed', message: err.message, data: { code: err.code || null } });
      throw err;
    }
  };
}

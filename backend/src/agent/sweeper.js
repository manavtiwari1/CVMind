import AgentApplication from './models/AgentApplication.js';
import JobPosting from './models/JobPosting.js';
import QueueJob from './models/QueueJob.js';
import { JOB_PARSE_VERSION } from './jobs/jobData.js';
import { enqueueMatch, enqueueJobParse, enqueueTailor, enqueueServerFill } from './pipeline.js';
import { logEvent } from './events.js';

const STUCK_AFTER_MS = 10 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;
const LIVE = ['queued', 'running'];
const BATCH = 50;

/**
 * Re-queues applications that are mid-pipeline but have no live queue job.
 * This happens when a worker dies between changing an application's status and enqueueing the
 * next step — without this they would sit in "tailoring" forever.
 *
 * Deliberately never resumes a submission: re-running apply.submit could file the same
 * application twice, so a stuck submit is left for the user to decide about.
 */
export async function sweepStuckApplications({ now = new Date(), stuckAfterMs = STUCK_AFTER_MS, logger = console } = {}) {
  const cutoff = new Date(now.getTime() - stuckAfterMs);
  const stuck = await AgentApplication.find({
    $or: [
      { status: { $in: ['pending', 'tailoring'] } },
      { status: 'ready_for_review', 'progress.step': 'filling' }
    ],
    'progress.updatedAt': { $lt: cutoff },
    submission: null
  }).limit(BATCH).lean();

  const resumed = [];
  for (const application of stuck) {
    // A job.parse job belongs to the posting, not the application, so check both
    const hasOwnJob = await QueueJob.exists({ applicationId: application._id, status: { $in: LIVE } });
    if (hasOwnJob) continue;

    try {
      let step;
      if (application.status === 'pending') {
        const posting = await JobPosting.findById(application.jobPostingId).select('status parseVersion').lean();
        if (!posting) continue;
        if (posting.status === 'ready' && posting.parseVersion === JOB_PARSE_VERSION) {
          await enqueueMatch(application);
          step = 'app.match';
        } else {
          const parsing = await QueueJob.exists({ 'payload.jobPostingId': String(posting._id), status: { $in: LIVE } });
          if (parsing) continue;
          await enqueueJobParse(posting);
          step = 'job.parse';
        }
      } else if (application.status === 'tailoring') {
        await enqueueTailor(application);
        step = 'app.tailor';
      } else {
        await enqueueServerFill(application);
        step = 'apply.fill';
      }

      resumed.push({ applicationId: String(application._id), step });
      await logEvent({
        applicationId: application._id,
        userId: application.userId,
        type: 'queue.resumed',
        actor: 'system',
        message: 'Picked this up again after it stalled.',
        data: { step, status: application.status }
      });
    } catch (err) {
      logger.warn(`[sweeper] could not resume ${application._id}: ${err.message}`);
    }
  }

  return resumed;
}

export function startSweeper({ intervalMs = SWEEP_INTERVAL_MS, logger = console } = {}) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const resumed = await sweepStuckApplications({ logger });
      if (resumed.length) logger.log(`[sweeper] resumed ${resumed.length} stalled application(s)`);
    } catch (err) {
      logger.error('[sweeper] sweep failed:', err.message);
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref?.();
  return { stop: () => clearInterval(timer) };
}

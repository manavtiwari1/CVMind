import AgentApplication from './models/AgentApplication.js';
import { enqueue } from './queue/queue.js';

// Atomic status change: only applies when the application is still in one of the expected states
export function transition(applicationId, fromStatuses, toStatus, set = {}) {
  return AgentApplication.findOneAndUpdate(
    { _id: applicationId, status: { $in: fromStatuses } },
    { $set: { status: toStatus, 'progress.updatedAt': new Date(), ...set } },
    { returnDocument: 'after' }
  ).lean();
}

export function setProgress(applicationId, step) {
  return AgentApplication.updateOne({ _id: applicationId }, { $set: { 'progress.step': step, 'progress.updatedAt': new Date() } });
}

export function markFailed(applicationId, stage, err) {
  return AgentApplication.updateOne(
    { _id: applicationId, status: { $ne: 'submitted' } },
    {
      $set: {
        status: 'failed',
        error: { stage, code: err?.code ? String(err.code) : null, message: String(err?.message || err).slice(0, 500) },
        'progress.updatedAt': new Date()
      }
    }
  );
}

export function enqueueMatch(application) {
  return enqueue({
    queue: 'match',
    type: 'app.match',
    payload: { applicationId: String(application._id) },
    userId: application.userId,
    applicationId: application._id,
    dedupeKey: `app.match:${application._id}`
  });
}

export function enqueueTailor(application) {
  return enqueue({
    queue: 'tailor',
    type: 'app.tailor',
    payload: { applicationId: String(application._id) },
    userId: application.userId,
    applicationId: application._id,
    dedupeKey: `app.tailor:${application._id}`
  });
}

// Keyed by content hash so a new edit queues a new render even while an older one is running
export function enqueueRenderPdf(application, contentHash) {
  return enqueue({
    queue: 'tailor',
    type: 'app.render_pdf',
    payload: { applicationId: String(application._id) },
    userId: application.userId,
    applicationId: application._id,
    maxAttempts: 3,
    dedupeKey: `app.render_pdf:${application._id}:${contentHash}`
  });
}

export function enqueueServerFill(application) {
  return enqueue({
    queue: 'apply',
    type: 'apply.fill',
    payload: { applicationId: String(application._id) },
    userId: application.userId,
    applicationId: application._id,
    dedupeKey: `apply.fill:${application._id}`
  });
}

// Submitting runs once: a retry could file the same application twice
export function enqueueServerSubmit(application, planHash) {
  return enqueue({
    queue: 'apply',
    type: 'apply.submit',
    payload: { applicationId: String(application._id), planHash },
    userId: application.userId,
    applicationId: application._id,
    maxAttempts: 1,
    dedupeKey: `apply.submit:${application._id}`
  });
}

// One parse per posting; the handler advances every application waiting on it
export function enqueueJobParse(posting) {
  return enqueue({
    queue: 'parse',
    type: 'job.parse',
    payload: { jobPostingId: String(posting._id) },
    dedupeKey: `job.parse:${posting._id}`
  });
}

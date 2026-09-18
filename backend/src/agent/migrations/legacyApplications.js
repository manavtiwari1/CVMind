import AgentApplication from '../models/AgentApplication.js';
import JobPosting from '../models/JobPosting.js';
import ApplicationEvent from '../models/ApplicationEvent.js';
import { companyKeyFor } from '../jobs/jobData.js';
import { sha256 } from '../resume/derive.js';

// Moves applications from backend/data/auto_apply_applications.json into MongoDB. Safe to re-run: legacyId is unique
export async function migrateLegacyApplications(legacyApps, { dryRun = true, userExists = async () => true } = {}) {
  const report = { total: legacyApps.length, migrated: 0, skippedExisting: 0, skippedUnknownUser: 0, invalid: 0 };

  for (const legacy of legacyApps) {
    if (!legacy?.id || !legacy.userId || !legacy.job) {
      report.invalid++;
      continue;
    }
    if (await AgentApplication.exists({ legacyId: String(legacy.id) })) {
      report.skippedExisting++;
      continue;
    }
    if (!(await userExists(String(legacy.userId)))) {
      report.skippedUnknownUser++;
      continue;
    }
    if (dryRun) {
      report.migrated++;
      continue;
    }

    const job = legacy.job;
    const companyName = String(job.company || '');
    const contentHash = sha256(`legacy:${job.id}:${companyName}:${job.title}`);
    const posting = await JobPosting.findOneAndUpdate(
      { contentHash },
      {
        $setOnInsert: {
          source: 'paste',
          ats: 'unknown',
          status: 'ready',
          parseVersion: 0,
          title: job.title || 'Untitled role',
          company: { name: companyName, key: companyKeyFor({}, companyName) },
          location: job.location || '',
          descriptionText: '',
          responsibilities: []
        }
      },
      { upsert: true, returnDocument: 'after' }
    ).lean();

    const submittedAt = legacy.appliedAt ? new Date(legacy.appliedAt) : new Date();
    let application;
    try {
      application = await AgentApplication.create({
        userId: String(legacy.userId),
        jobPostingId: posting._id,
        status: 'submitted',
        progress: { step: 'submitted', updatedAt: submittedAt },
        decision: { state: 'approved', mode: 'manual', at: submittedAt },
        score: typeof legacy.matchScore === 'number' ? { total: legacy.matchScore, scoringVersion: 'legacy' } : null,
        tailored: legacy.coverLetter || legacy.tailoredResume
          ? { coverLetter: legacy.coverLetter || null, resumeText: legacy.tailoredResume || null, legacy: true }
          : null,
        submission: { via: 'manual', submittedAt, legacyStatus: legacy.status || 'Applied' },
        notes: legacy.notes || '',
        companyKey: posting.company?.key || null,
        legacyId: String(legacy.id)
      });
    } catch (err) {
      // Same legacy job applied to twice by one user collapses into the first application
      if (err?.code === 11000) {
        report.skippedExisting++;
        continue;
      }
      throw err;
    }

    // Inserted directly so the original timestamps are kept
    const events = (legacy.events || []).map((event) => ({
      applicationId: application._id,
      resumeProfileId: null,
      userId: String(legacy.userId),
      type: 'legacy.event',
      actor: event.actor === 'Candidate' ? 'user' : 'system',
      message: [event.title, event.description].filter(Boolean).join(' — '),
      data: {},
      queueJobId: null,
      createdAt: event.timestamp ? new Date(event.timestamp) : submittedAt
    }));
    if (events.length) await ApplicationEvent.collection.insertMany(events);
    report.migrated++;
  }

  return report;
}

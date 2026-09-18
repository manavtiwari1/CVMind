import ResumeProfile from '../models/ResumeProfile.js';
import { enqueue } from '../queue/queue.js';
import { logEvent } from '../events.js';
import { sha256 } from './derive.js';
import { uploadBuffer, BUCKETS } from '../storage/gridfs.js';

export const RESUME_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export function enqueueParse(profile, { force = false } = {}) {
  return enqueue({
    queue: 'parse',
    type: 'resume.parse',
    payload: { resumeProfileId: String(profile._id), force },
    userId: profile.userId,
    dedupeKey: `resume.parse:${profile._id}`
  });
}

async function setDefault(profile) {
  await ResumeProfile.updateMany({ userId: profile.userId, _id: { $ne: profile._id } }, { $set: { isDefault: false } });
  if (!profile.isDefault) {
    profile.isDefault = true;
    await profile.save();
  }
}

// Imports (or re-syncs) a resume the user saved in their CVMind dashboard (My Works). The caller checks ownership.
// An unchanged resume is reused as-is; a changed one is re-parsed, which replaces earlier edits.
export async function importCvmindWork({ userId, workId, work, via = 'agent' }) {
  userId = String(userId);
  workId = String(workId);
  const sourceHash = sha256(String(work.htmlContent || ''));
  const existing = await ResumeProfile.findOne({ userId, source: 'cvmind', 'originalFileRef.workId': workId });
  if (existing && existing.sourceHash === sourceHash && existing.status !== 'failed') {
    return { profile: existing, deduped: true };
  }

  let profile = existing;
  if (profile) {
    profile.set({ sourceHash, status: 'queued', parseError: undefined, label: work.title || profile.label });
    await profile.save();
  } else {
    const isFirst = (await ResumeProfile.countDocuments({ userId })) === 0;
    profile = await ResumeProfile.create({
      userId,
      label: String(work.title || 'CVMind resume').slice(0, 120),
      isDefault: isFirst,
      source: 'cvmind',
      sourceHash,
      originalFileRef: { workId, workUpdatedAt: work.updatedAt }
    });
  }
  await enqueueParse(profile, { force: Boolean(existing) });
  await logEvent({ resumeProfileId: profile._id, userId, type: existing ? 'resume.resynced' : 'resume.imported', actor: 'user', data: { workId, via } });
  return { profile, deduped: false };
}

// Stores an uploaded resume file for the agent and queues parsing; identical bytes reuse the existing profile.
// `via` records where the upload came from (the agent tab, or the Resume Checker on the home page).
export async function importUploadedResume({ userId, file, label, via = 'agent', makeDefault = false }) {
  userId = String(userId);
  const sourceHash = sha256(file.buffer);

  const existing = await ResumeProfile.findOne({ userId, source: 'upload', sourceHash });
  if (existing) {
    if (makeDefault) await setDefault(existing);
    return { profile: existing, deduped: true };
  }

  const gridFsId = await uploadBuffer(BUCKETS.resumeFiles, file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
    metadata: { userId }
  });
  const isFirst = (await ResumeProfile.countDocuments({ userId })) === 0;
  const profile = await ResumeProfile.create({
    userId,
    label: String(label || file.originalname).slice(0, 120),
    isDefault: isFirst,
    source: 'upload',
    sourceHash,
    originalFileRef: { gridFsId, filename: file.originalname, mimeType: file.mimetype, size: file.size }
  });
  if (makeDefault) await setDefault(profile);
  await enqueueParse(profile);
  await logEvent({ resumeProfileId: profile._id, userId, type: 'resume.uploaded', actor: 'user', data: { mimeType: file.mimetype, size: file.size, via } });
  return { profile, deduped: false };
}

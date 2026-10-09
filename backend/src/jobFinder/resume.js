import mongoose from 'mongoose';
import { pickResume } from '@cvmind/auto-apply-agent/applications/create.js';
import { parsePdf, parseDocx, parseTxt, htmlToStructuredText } from '@cvmind/auto-apply-agent/text/parser.js';
import { downloadBuffer, BUCKETS } from '@cvmind/auto-apply-agent/storage/gridfs.js';
import { extractSkills } from './skills.js';

// The resume Job Finder matches against. The agent's worker reads resumes with AI, but that can
// take a while (or not run at all), so until it's done the skills are read straight from the
// file's text. That needs no AI call and is cached per version of the file.

const quickSkillsSchema = new mongoose.Schema({
  resumeProfileId: { type: String, required: true },
  sourceHash: { type: String, default: '' },
  skills: [String],
  readable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 }
});
quickSkillsSchema.index({ resumeProfileId: 1, sourceHash: 1 }, { unique: true });
export const ResumeQuickSkills = mongoose.models.ResumeQuickSkills || mongoose.model('ResumeQuickSkills', quickSkillsSchema);

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function defaultLoadWork(workId) {
  const { getWorkById } = await import('../db.js');
  return getWorkById(workId);
}

async function readText(profile, loadWork) {
  if (profile.source === 'cvmind') {
    const work = await loadWork(profile.originalFileRef?.workId);
    if (!work || String(work.userId) !== String(profile.userId)) return '';
    return htmlToStructuredText(work.htmlContent || '');
  }
  const { gridFsId, mimeType } = profile.originalFileRef || {};
  if (!gridFsId) return '';
  const buffer = await downloadBuffer(BUCKETS.resumeFiles, gridFsId);
  if (mimeType === PDF_MIME) return parsePdf(buffer);
  if (mimeType === DOCX_MIME) return parseDocx(buffer);
  return parseTxt(buffer);
}

/** The resume's plain text: the worker's copy when it has read the file, else read from the file now */
export async function resumeText(profile, { loadWork = defaultLoadWork } = {}) {
  const ResumeProfile = mongoose.model('ResumeProfile');
  const stored = await ResumeProfile.findById(profile._id).select('+rawText').lean();
  if (stored?.rawText) return stored.rawText;
  try {
    return String(await readText(profile, loadWork) || '');
  } catch {
    return '';
  }
}

/** Skills read from the resume file's text, cached; [] when the file has no readable text */
export async function quickSkills(profile, { loadWork = defaultLoadWork } = {}) {
  const key = { resumeProfileId: String(profile._id), sourceHash: profile.sourceHash || '' };
  const cached = await ResumeQuickSkills.findOne(key).lean();
  if (cached) return cached.skills;

  let text = '';
  try {
    text = String(await readText(profile, loadWork) || '');
  } catch (err) {
    console.warn('[jobFinder] could not read resume text:', err.message);
  }
  const skills = text.trim().length >= 50 ? extractSkills(text) : [];
  await ResumeQuickSkills.updateOne(key, { $setOnInsert: { skills, readable: skills.length > 0 } }, { upsert: true }).catch(() => {});
  return skills;
}

/**
 * The user's chosen resume, ready to match against. A resume the worker hasn't read yet gets the
 * skills found in its text, so scores work right away.
 * @returns {Promise<object|null>} a ResumeProfile (lean); `quick: true` when the skills came from the text
 */
export async function resumeForMatching(userId, options = {}) {
  const profile = await pickResume(userId);
  if (!profile) return null;
  if (profile.status === 'ready' && profile.derived?.normalizedSkillSet?.length) return profile;
  const skills = await quickSkills(profile, options);
  return { ...profile, derived: { ...(profile.derived || {}), normalizedSkillSet: skills }, quick: true };
}

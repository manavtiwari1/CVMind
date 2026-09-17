import ResumeProfile from '../models/ResumeProfile.js';
import { parsePdf, parseDocx, parseTxt, htmlToStructuredText } from '../../services/parser.js';
import { generateStructured } from '../ai/geminiClient.js';
import { ResumeStructured } from '../ai/schemas.js';
import { PARSE_RESUME_SYSTEM, buildParseResumePrompt } from '../ai/prompts/parseResume.js';
import { buildProfileData, PARSE_VERSION } from '../resume/derive.js';
import { embedProfileBullets } from '../resume/embeddings.js';
import { downloadBuffer, BUCKETS } from '../storage/gridfs.js';
import { logEvent } from '../events.js';
import { FatalError } from '../errors.js';

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
// Below this, a PDF is likely scanned/image-only, so Gemini reads the file itself
const MIN_TEXT_LAYER_CHARS = 200;

// db.js connects to MONGODB_URI on import, so load it lazily and only in the real worker
async function defaultLoadWork(workId) {
  const { getWorkById } = await import('../../db.js');
  return getWorkById(workId);
}

async function readSource(profile, loadWork) {
  if (profile.source === 'cvmind') {
    const work = await loadWork(profile.originalFileRef?.workId);
    if (!work || String(work.userId) !== String(profile.userId)) {
      throw new FatalError('The CVMind resume this profile was built from no longer exists.', { code: 'WORK_NOT_FOUND' });
    }
    return { text: htmlToStructuredText(work.htmlContent), workUpdatedAt: work.updatedAt };
  }

  const { gridFsId, mimeType } = profile.originalFileRef || {};
  const buffer = await downloadBuffer(BUCKETS.resumeFiles, gridFsId);
  try {
    if (mimeType === PDF_MIME) return { text: await parsePdf(buffer), pdfBuffer: buffer };
    if (mimeType === DOCX_MIME) return { text: await parseDocx(buffer) };
    return { text: parseTxt(buffer) };
  } catch (err) {
    // A corrupt file fails the same way every time, so don't retry
    throw new FatalError(err.message, { cause: err, code: 'UNREADABLE_FILE' });
  }
}

export function createParseResumeHandler({ ai = {}, loadWork = defaultLoadWork } = {}) {
  return async function parseResume(job) {
    const { resumeProfileId, force = false } = job.payload || {};
    const profile = await ResumeProfile.findById(resumeProfileId).lean();
    if (!profile) throw new FatalError('Resume profile not found.', { code: 'NOT_FOUND' });
    if (profile.userEdited && !force) return;

    const startedAt = Date.now();
    await ResumeProfile.updateOne({ _id: profile._id }, { $set: { status: 'parsing' }, $unset: { parseError: '' } });

    try {
      const { text: rawText, pdfBuffer, workUpdatedAt } = await readSource(profile, loadWork);
      const text = String(rawText || '').trim();
      const useInlinePdf = Boolean(pdfBuffer) && text.length < MIN_TEXT_LAYER_CHARS;
      if (!useInlinePdf && text.length < 50) {
        throw new FatalError('Could not read any text from this resume.', { code: 'EMPTY_RESUME' });
      }

      const request = useInlinePdf
        ? { contents: [{ role: 'user', parts: [{ inlineData: { mimeType: PDF_MIME, data: pdfBuffer.toString('base64') } }, { text: buildParseResumePrompt('(see the attached PDF)') }] }] }
        : { prompt: buildParseResumePrompt(text) };
      const extracted = await generateStructured({ schema: ResumeStructured, system: PARSE_RESUME_SYSTEM, client: ai.client, ...request });

      const { structured, derived } = buildProfileData(extracted);
      const { embeddedCount, ...embeddings } = await embedProfileBullets(structured, profile.embeddings, { client: ai.client });

      await ResumeProfile.updateOne({ _id: profile._id }, {
        $set: {
          rawText: text,
          structured,
          derived,
          embeddings,
          status: 'ready',
          parseVersion: PARSE_VERSION,
          userEdited: false,
          ...(workUpdatedAt ? { 'originalFileRef.workUpdatedAt': workUpdatedAt } : {})
        }
      });
      await logEvent({
        resumeProfileId: profile._id,
        userId: profile.userId,
        type: 'resume.parsed',
        message: 'Resume parsed into a structured profile.',
        data: {
          experienceCount: structured.experience.length,
          skillCount: derived.normalizedSkillSet.length,
          bulletCount: embeddings.bullets.length,
          embeddedCount,
          totalYearsExperience: derived.totalYearsExperience,
          inlinePdf: useInlinePdf
        },
        queueJobId: job._id,
        durationMs: Date.now() - startedAt
      });
    } catch (err) {
      // Retryable errors keep the profile in "parsing" until the queue gives up
      if (err?.retryable === false || job.attempts >= job.maxAttempts) {
        await ResumeProfile.updateOne({ _id: profile._id }, { $set: { status: 'failed', parseError: err.message } });
        await logEvent({
          resumeProfileId: profile._id,
          userId: profile.userId,
          type: 'resume.parse_failed',
          message: err.message,
          data: { code: err.code || null },
          queueJobId: job._id
        });
      }
      throw err;
    }
  };
}

// After a user edit, re-embed only the bullets whose text changed
export function createEmbedResumeHandler({ ai = {} } = {}) {
  return async function embedResume(job) {
    const profile = await ResumeProfile.findById(job.payload?.resumeProfileId).lean();
    if (!profile?.structured) return;

    const { embeddedCount, ...embeddings } = await embedProfileBullets(profile.structured, profile.embeddings, { client: ai.client });
    await ResumeProfile.updateOne({ _id: profile._id }, { $set: { embeddings } });
    await logEvent({
      resumeProfileId: profile._id,
      userId: profile.userId,
      type: 'resume.embedded',
      data: { bulletCount: embeddings.bullets.length, embeddedCount },
      queueJobId: job._id
    });
  };
}

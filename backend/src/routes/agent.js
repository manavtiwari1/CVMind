import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { requireUser } from '../services/authToken.js';
import { requireMongo } from '../agent/auth.js';
import { getModel, getEmbedModel, getEmbedDims } from '../agent/ai/geminiClient.js';
import { ResumeStructured } from '../agent/ai/schemas.js';
import ResumeProfile from '../agent/models/ResumeProfile.js';
import { PreferencesInput, DEFAULT_PREFERENCES } from '../agent/preferences/schema.js';
import { getPreferences, savePreferences } from '../agent/preferences/service.js';
import AgentApplication, { APPLICATION_STATUSES } from '../agent/models/AgentApplication.js';
import JobPosting from '../agent/models/JobPosting.js';
import { JOB_PARSE_VERSION } from '../agent/jobs/jobData.js';
import { enqueueMatch, enqueueJobParse, enqueueTailor, enqueueRenderPdf, enqueueServerFill, enqueueServerSubmit, transition } from '../agent/pipeline.js';
import { pickAdapter } from '../agent/adapters/index.js';
import { planHashOf } from '../agent/fill/buildFillPlan.js';
import { TailoredEdit, applyTailoredEdits } from '../agent/tailoring/edits.js';
import { tailoredResumeHash } from '../agent/resume/pdfArtifacts.js';
import { tryConsume } from '../agent/rateLimit.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function toClientTailored(tailored) {
  return {
    resume: tailored.resume,
    coverLetter: tailored.coverLetter,
    changes: tailored.changes || [],
    violations: tailored.violations || 0,
    userEdited: Boolean(tailored.userEdited),
    generatedAt: tailored.generatedAt,
    pdf: tailored.pdf ? { filename: tailored.pdf.filename, size: tailored.pdf.size, renderedAt: tailored.pdf.renderedAt } : null
  };
}

function toClientApplication(application, posting) {
  return {
    id: String(application._id),
    status: application.status,
    progress: application.progress || null,
    decision: application.decision || { state: 'undecided' },
    score: application.score || null,
    error: application.error || null,
    resumeProfileId: application.resumeProfileId ? String(application.resumeProfileId) : null,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    tailored: application.tailored?.resume ? {
      generatedAt: application.tailored.generatedAt,
      userEdited: Boolean(application.tailored.userEdited),
      hasPdf: Boolean(application.tailored.pdf?.gridFsId),
      changes: application.tailored.changes || []
    } : null,
    submission: application.submission || null,
    fill: application.fill ? {
      adapter: application.fill.adapter || null,
      planHash: application.fill.planHash || null,
      approved: Boolean(application.fill.approvedPlanHash && application.fill.approvedPlanHash === application.fill.planHash),
      filled: application.fill.filled ?? 0,
      needsReview: application.fill.needsReview ?? 0,
      unmappedRequired: application.fill.unmappedRequired?.length ?? 0,
      mismatches: application.fill.mismatches?.length ?? 0,
      hasScreenshot: Boolean(application.fill.screenshotId),
      handoff: application.fill.handoff || null,
      blockedReason: application.fill.blockedReason || null,
      filledAt: application.fill.filledAt || null
    } : null,
    job: posting ? {
      id: String(posting._id),
      title: posting.title || '',
      company: posting.company?.name || '',
      location: posting.location || '',
      workMode: posting.workMode || 'unknown',
      employmentType: posting.employmentType || 'unknown',
      seniority: posting.seniority || 'unknown',
      industry: posting.industry || '',
      url: posting.url || null,
      applyUrl: posting.applyUrl || posting.url || null,
      ats: posting.ats,
      source: posting.source,
      status: posting.status,
      parseError: posting.parseError || null,
      salary: posting.salary || null,
      requirements: posting.requirements ? {
        mustHaveSkills: posting.requirements.mustHaveSkills || [],
        niceToHaveSkills: posting.requirements.niceToHaveSkills || [],
        minYearsExperience: posting.requirements.minYearsExperience ?? null,
        educationLevel: posting.requirements.educationLevel ?? null
      } : null,
      responsibilities: posting.responsibilities || []
    } : null
  };
}

function findOwnedApplication(id, userId) {
  if (!mongoose.isValidObjectId(id)) return null;
  return AgentApplication.findOne({ _id: id, userId: String(userId) }).lean();
}

const loadPosting = (id) => JobPosting.findById(id).select('-embeddings').lean();

import { enqueue } from '../agent/queue/queue.js';
import { logEvent, listEvents } from '../agent/events.js';
import { buildProfileData } from '../agent/resume/derive.js';
import { createApplicationForUser, pickResume } from '../agent/applications/create.js';
import { createExtensionRouter } from './agentExtension.js';
import { deleteFile, openDownloadStream, BUCKETS } from '../agent/storage/gridfs.js';
import { importUploadedResume, importCvmindWork, enqueueParse, RESUME_MIME_TYPES } from '../agent/resume/intake.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, RESUME_MIME_TYPES.includes(file.mimetype))
});

// db.js connects to MONGODB_URI on import, so it is loaded lazily (and injectable for tests)
async function defaultLoadWork(workId) {
  const { getWorkById } = await import('../db.js');
  return getWorkById(workId);
}

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function toClient(doc) {
  const profile = doc?.toObject ? doc.toObject() : doc;
  const { rawText, embeddings, __v, ...rest } = profile;
  return { ...rest, id: String(profile._id), embeddedBullets: embeddings?.bullets?.length || 0 };
}

function findOwnedResume(id, userId) {
  if (!mongoose.isValidObjectId(id)) return null;
  return ResumeProfile.findOne({ _id: id, userId: String(userId) });
}

// Autonomous apply agent API (resumes, preferences, applications); endpoints land milestone by milestone
export function createAgentRouter({ loadWork = defaultLoadWork, loadLatestResumeWork, buildPlan } = {}) {
  const router = express.Router();
  // Extension routes authenticate with their own device token, so they mount before the user-only guard
  router.use('/extension', createExtensionRouter({ ...(buildPlan ? { buildPlan } : {}), ...(loadLatestResumeWork ? { loadLatestResumeWork } : {}) }));
  router.use(requireUser, requireMongo());

  router.get('/health', (req, res) => {
    return res.json({
      success: true,
      data: {
        db: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable',
        aiConfigured: Boolean(process.env.GEMINI_API_KEY),
        models: { generate: getModel(), embed: getEmbedModel(), embedDims: getEmbedDims() }
      }
    });
  });

  // ── Resumes (Stage 1) ───────────────────────────────────────────────────────
  router.post('/resumes/upload', (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? 'Resume file must be 5MB or smaller.' : err.message });
      next();
    });
  }, asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'Upload a PDF, DOCX or TXT resume file.' });
    const { profile, deduped } = await importUploadedResume({ userId: req.auth.sub, file: req.file, label: req.body?.label });
    if (deduped) return res.json({ success: true, deduped: true, data: toClient(profile) });
    return res.status(202).json({ success: true, data: toClient(profile) });
  }));

  router.post('/resumes/from-work', asyncRoute(async (req, res) => {
    const userId = req.auth.sub;
    const workId = String(req.body?.workId || '').trim();
    const work = workId ? await loadWork(workId) : null;
    if (!work || String(work.userId) !== String(userId)) return res.status(404).json({ success: false, error: 'CVMind resume not found.' });
    if (work.type && work.type !== 'resume') return res.status(400).json({ success: false, error: 'Only resumes can be used for auto-apply.' });

    // Re-syncing a changed CVMind resume is an explicit request, so it replaces earlier edits
    const { profile, deduped } = await importCvmindWork({ userId, workId, work });
    if (deduped) return res.json({ success: true, deduped: true, data: toClient(profile) });
    return res.status(202).json({ success: true, data: toClient(profile) });
  }));

  router.get('/resumes', asyncRoute(async (req, res) => {
    const profiles = await ResumeProfile.find({ userId: req.auth.sub }).sort({ updatedAt: -1 });
    const data = await Promise.all(profiles.map(async (profile) => {
      const item = toClient(profile);
      if (profile.source === 'cvmind' && profile.originalFileRef?.workId) {
        const work = await loadWork(profile.originalFileRef.workId).catch(() => null);
        const syncedAt = profile.originalFileRef.workUpdatedAt;
        item.outOfDate = Boolean(work?.updatedAt && syncedAt && new Date(work.updatedAt) > new Date(syncedAt));
        item.sourceMissing = !work;
      }
      return item;
    }));
    return res.json({ success: true, data });
  }));

  router.get('/resumes/:id', asyncRoute(async (req, res) => {
    const profile = await findOwnedResume(req.params.id, req.auth.sub);
    if (!profile) return res.status(404).json({ success: false, error: 'Resume not found.' });
    return res.json({ success: true, data: toClient(profile) });
  }));

  router.patch('/resumes/:id', asyncRoute(async (req, res) => {
    const profile = await findOwnedResume(req.params.id, req.auth.sub);
    if (!profile) return res.status(404).json({ success: false, error: 'Resume not found.' });

    const { label, structured } = req.body || {};
    if (label !== undefined) profile.label = String(label).slice(0, 120);

    let editedStructure = false;
    if (structured !== undefined) {
      if (profile.status !== 'ready') return res.status(409).json({ success: false, code: 'NOT_READY', error: 'Wait for parsing to finish before editing.' });
      const parsed = ResumeStructured.safeParse(structured);
      if (!parsed.success) return res.status(400).json({ success: false, code: 'INVALID_RESUME', error: 'Resume data is invalid.', issues: parsed.error.issues.slice(0, 20) });
      const data = buildProfileData(parsed.data);
      profile.set({ structured: data.structured, derived: data.derived, userEdited: true, editedAt: new Date() });
      editedStructure = true;
    }

    await profile.save();
    if (editedStructure) {
      await enqueue({
        queue: 'parse',
        type: 'resume.embed',
        payload: { resumeProfileId: String(profile._id) },
        userId: profile.userId,
        dedupeKey: `resume.embed:${profile._id}`
      });
      await logEvent({ resumeProfileId: profile._id, userId: profile.userId, type: 'resume.edited', actor: 'user', data: { bulletCount: profile.structured.experience.reduce((n, role) => n + role.bullets.length, 0) } });
    }
    return res.json({ success: true, data: toClient(profile) });
  }));

  router.post('/resumes/:id/reparse', asyncRoute(async (req, res) => {
    const profile = await findOwnedResume(req.params.id, req.auth.sub);
    if (!profile) return res.status(404).json({ success: false, error: 'Resume not found.' });
    const force = Boolean(req.body?.force);
    if (profile.userEdited && !force) {
      return res.status(409).json({ success: false, code: 'USER_EDITED', error: 'Re-parsing will discard your edits. Confirm to continue.' });
    }
    profile.set({ status: 'queued', parseError: undefined });
    await profile.save();
    await enqueueParse(profile, { force: true });
    return res.status(202).json({ success: true, data: toClient(profile) });
  }));

  router.post('/resumes/:id/default', asyncRoute(async (req, res) => {
    const profile = await findOwnedResume(req.params.id, req.auth.sub);
    if (!profile) return res.status(404).json({ success: false, error: 'Resume not found.' });
    await ResumeProfile.updateMany({ userId: profile.userId, _id: { $ne: profile._id } }, { $set: { isDefault: false } });
    profile.isDefault = true;
    await profile.save();
    return res.json({ success: true, data: toClient(profile) });
  }));

  router.get('/resumes/:id/file', asyncRoute(async (req, res) => {
    const profile = await findOwnedResume(req.params.id, req.auth.sub);
    const ref = profile?.originalFileRef;
    if (!profile || profile.source !== 'upload' || !ref?.gridFsId) return res.status(404).json({ success: false, error: 'Original file not found.' });

    res.setHeader('Content-Type', ref.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(ref.filename || 'resume')}"`);
    openDownloadStream(BUCKETS.resumeFiles, ref.gridFsId)
      .on('error', () => { if (!res.headersSent) res.status(404).json({ success: false, error: 'Original file not found.' }); else res.end(); })
      .pipe(res);
  }));

  router.delete('/resumes/:id', asyncRoute(async (req, res) => {
    const profile = await findOwnedResume(req.params.id, req.auth.sub);
    if (!profile) return res.status(404).json({ success: false, error: 'Resume not found.' });

    if (profile.originalFileRef?.gridFsId) await deleteFile(BUCKETS.resumeFiles, profile.originalFileRef.gridFsId);
    await profile.deleteOne();
    if (profile.isDefault) {
      const next = await ResumeProfile.findOne({ userId: profile.userId }).sort({ updatedAt: -1 });
      if (next) await ResumeProfile.updateOne({ _id: next._id }, { $set: { isDefault: true } });
    }
    await logEvent({ resumeProfileId: profile._id, userId: profile.userId, type: 'resume.deleted', actor: 'user' });
    return res.json({ success: true });
  }));

  // ── Preferences (Stage 2) ───────────────────────────────────────────────────
  router.get('/preferences', asyncRoute(async (req, res) => {
    const preferences = await getPreferences(req.auth.sub);
    return res.json({ success: true, exists: Boolean(preferences), data: preferences ?? structuredClone(DEFAULT_PREFERENCES) });
  }));

  router.put('/preferences', asyncRoute(async (req, res) => {
    const parsed = PreferencesInput.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, code: 'INVALID_PREFERENCES', error: 'Some preferences are invalid.', issues: parsed.error.issues.slice(0, 20) });
    }
    const userId = req.auth.sub;
    const update = parsed.data;

    if (update.defaultResumeProfileId) {
      const owned = mongoose.isValidObjectId(update.defaultResumeProfileId)
        && await ResumeProfile.exists({ _id: update.defaultResumeProfileId, userId });
      if (!owned) return res.status(400).json({ success: false, code: 'INVALID_RESUME', error: 'Choose one of your own resumes.' });
    }

    if (Object.keys(update).length === 0) {
      const current = await getPreferences(userId);
      return res.json({ success: true, exists: Boolean(current), data: current ?? structuredClone(DEFAULT_PREFERENCES) });
    }

    const preferences = await savePreferences(userId, update);
    await logEvent({ userId, type: 'preferences.updated', actor: 'user', data: { fields: Object.keys(update) } });
    return res.json({ success: true, exists: true, data: preferences });
  }));

  // ── Applications (Stage 3: parse job, score, decide) ─────────────────────────
  router.post('/applications', asyncRoute(async (req, res) => {
    const { url, description, resumeProfileId } = req.body || {};
    const result = await createApplicationForUser({ userId: req.auth.sub, url, description, resumeProfileId, loadLatestResumeWork });
    if (!result.ok && !result.application) {
      return res.status(result.status).json({ success: false, code: result.code, error: result.error });
    }
    const data = toClientApplication(result.application, await loadPosting(result.posting._id));
    if (!result.ok) return res.status(result.status).json({ success: false, code: result.code, error: result.error, data });
    return res.status(result.status).json({ success: true, data });
  }));

  router.get('/applications', asyncRoute(async (req, res) => {
    const filter = { userId: req.auth.sub };
    if (APPLICATION_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    const applications = await AgentApplication.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
    const postings = await JobPosting.find({ _id: { $in: applications.map((a) => a.jobPostingId) } }).select('-embeddings').lean();
    const byId = new Map(postings.map((p) => [String(p._id), p]));
    return res.json({ success: true, data: applications.map((a) => toClientApplication(a, byId.get(String(a.jobPostingId)))) });
  }));

  router.get('/applications/:id', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    return res.json({ success: true, data: toClientApplication(application, await loadPosting(application.jobPostingId)) });
  }));

  router.get('/applications/:id/events', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    const events = await listEvents({ applicationId: application._id, userId: req.auth.sub });
    return res.json({
      success: true,
      data: events.map((e) => ({ id: String(e._id), type: e.type, actor: e.actor, message: e.message || '', createdAt: e.createdAt }))
    });
  }));

  router.post('/applications/:id/decision', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });

    const { action, overrideGates = false, mode } = req.body || {};
    if (!['approve', 'skip'].includes(action)) return res.status(400).json({ success: false, code: 'INVALID_ACTION', error: 'Choose approve or skip.' });
    if (application.status !== 'matched') return res.status(409).json({ success: false, code: 'NOT_SCORED', error: 'Wait until this job has been scored.' });

    const gatesFailed = application.score?.gatesPassed === false;
    if (action === 'approve' && gatesFailed && overrideGates !== true) {
      return res.status(409).json({ success: false, code: 'GATES_FAILED', error: 'This job fails a hard requirement. Confirm to approve it anyway.' });
    }

    const decision = {
      state: action === 'approve' ? 'approved' : 'skipped',
      mode: action === 'approve' && ['extension', 'server'].includes(mode) ? mode : null,
      overrideGates: action === 'approve' && gatesFailed,
      at: new Date()
    };
    if (action === 'approve') {
      const preferences = (await getPreferences(application.userId)) ?? DEFAULT_PREFERENCES;
      const quota = await tryConsume(`user:${application.userId}:approvals`, { limit: preferences.dailyApplyCap, windowMs: DAY_MS });
      if (!quota.ok) {
        return res.status(429).json({ success: false, code: 'DAILY_CAP', error: `You've reached your daily limit of ${preferences.dailyApplyCap} approved jobs. Raise it in Job Preferences or try again tomorrow.` });
      }
    }

    // Approving starts tailoring straight away; skipping keeps the scored job so it can be approved later
    const set = action === 'approve'
      ? { decision, status: 'tailoring', 'progress.step': 'tailoring_resume', 'progress.updatedAt': new Date() }
      : { decision };
    const updated = await AgentApplication.findOneAndUpdate({ _id: application._id, status: 'matched' }, { $set: set }, { returnDocument: 'after' }).lean();
    if (!updated) return res.status(409).json({ success: false, code: 'NOT_SCORED', error: 'Wait until this job has been scored.' });
    if (action === 'approve') await enqueueTailor(updated);

    const type = action === 'skip' ? 'decision.skipped' : decision.overrideGates ? 'decision.gate_override' : 'decision.approved';
    await logEvent({ applicationId: application._id, userId: application.userId, type, actor: 'user', data: { total: application.score?.total ?? null, mode: decision.mode } });
    return res.json({ success: true, data: toClientApplication(updated, await loadPosting(updated.jobPostingId)) });
  }));

  router.post('/applications/:id/rescore', asyncRoute(async (req, res) => {
    const userId = req.auth.sub;
    const application = await findOwnedApplication(req.params.id, userId);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (!['matched', 'failed'].includes(application.status)) {
      return res.status(409).json({ success: false, code: 'IN_PROGRESS', error: 'This application is still being processed.' });
    }

    const posting = await JobPosting.findById(application.jobPostingId).lean();
    if (!posting) return res.status(409).json({ success: false, code: 'JOB_MISSING', error: 'The job posting no longer exists.' });

    const set = { error: null, decision: { state: 'undecided' }, 'progress.updatedAt': new Date() };
    if (req.body?.resumeProfileId) {
      const resume = await pickResume(userId, req.body.resumeProfileId);
      if (!resume || resume.status === 'failed') return res.status(400).json({ success: false, code: 'NO_RESUME', error: 'Choose one of your own resumes.' });
      set.resumeProfileId = resume._id;
    }

    const jobReady = posting.status === 'ready' && posting.parseVersion === JOB_PARSE_VERSION;
    set['progress.step'] = jobReady ? 'scoring' : 'parsing_job';
    if (application.status === 'failed' || !jobReady) set.status = 'pending';

    const updated = await AgentApplication.findOneAndUpdate({ _id: application._id, status: application.status }, { $set: set }, { returnDocument: 'after' }).lean();
    if (!updated) return res.status(409).json({ success: false, code: 'IN_PROGRESS', error: 'This application is still being processed.' });

    if (jobReady) {
      await enqueueMatch(updated);
    } else {
      if (posting.status === 'failed') await JobPosting.updateOne({ _id: posting._id }, { $set: { status: 'pending' }, $unset: { parseError: '' } });
      await enqueueJobParse(posting);
    }
    await logEvent({ applicationId: application._id, userId, type: 'application.rescore_requested', actor: 'user' });
    return res.status(202).json({ success: true, data: toClientApplication(updated, await loadPosting(posting._id)) });
  }));

  router.delete('/applications/:id', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    await AgentApplication.deleteOne({ _id: application._id });
    await logEvent({ applicationId: application._id, userId: application.userId, type: 'application.deleted', actor: 'user' });
    return res.json({ success: true });
  }));

  // ── Tailored documents & submission (Stage 3b) ───────────────────────────────
  router.get('/applications/:id/tailored', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (!application.tailored?.resume) return res.status(404).json({ success: false, code: 'NOT_TAILORED', error: 'Tailored documents are not ready yet.' });
    return res.json({ success: true, data: toClientTailored(application.tailored) });
  }));

  router.patch('/applications/:id/tailored', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (!application.tailored?.resume) return res.status(404).json({ success: false, code: 'NOT_TAILORED', error: 'Tailored documents are not ready yet.' });
    if (application.status !== 'ready_for_review') {
      return res.status(409).json({ success: false, code: 'NOT_EDITABLE', error: 'Tailored documents can only be edited before the application is submitted.' });
    }

    const parsed = TailoredEdit.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, code: 'INVALID_EDIT', error: 'Some of your edits are invalid.', issues: parsed.error.issues.slice(0, 20) });
    }

    const tailored = applyTailoredEdits(application.tailored, parsed.data);
    const updated = await AgentApplication.findOneAndUpdate({ _id: application._id, status: 'ready_for_review' }, { $set: { tailored } }, { returnDocument: 'after' }).lean();
    if (!updated) return res.status(409).json({ success: false, code: 'NOT_EDITABLE', error: 'Tailored documents can only be edited before the application is submitted.' });

    const hash = tailoredResumeHash(tailored);
    if (tailored.pdf?.sha256 !== hash) await enqueueRenderPdf(updated, hash);
    await logEvent({ applicationId: application._id, userId: application.userId, type: 'tailor.edited', actor: 'user', data: { fields: Object.keys(parsed.data) } });
    return res.json({ success: true, data: toClientTailored(updated.tailored) });
  }));

  router.get('/applications/:id/resume.pdf', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    const tailored = application?.tailored;
    if (!tailored?.resume) return res.status(404).json({ success: false, error: 'Tailored resume not found.' });

    // Never serve a PDF that no longer matches the (possibly edited) tailored resume
    const hash = tailoredResumeHash(tailored);
    if (!tailored.pdf?.gridFsId || tailored.pdf.sha256 !== hash) {
      await enqueueRenderPdf(application, hash);
      return res.status(202).json({ success: false, code: 'PDF_RENDERING', error: 'Your PDF is being generated. Try again in a few seconds.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(tailored.pdf.filename)}"`);
    openDownloadStream(BUCKETS.agentArtifacts, tailored.pdf.gridFsId)
      .on('error', () => { if (!res.headersSent) res.status(404).json({ success: false, error: 'Tailored resume not found.' }); else res.end(); })
      .pipe(res);
  }));

  router.post('/applications/:id/mark-submitted', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (application.status !== 'ready_for_review') {
      return res.status(409).json({ success: false, code: 'NOT_READY', error: 'Only applications that are ready for review can be marked as submitted.' });
    }

    const updated = await transition(application._id, ['ready_for_review'], 'submitted', {
      submission: { via: 'manual', submittedAt: new Date() },
      'progress.step': 'submitted'
    });
    if (!updated) return res.status(409).json({ success: false, code: 'NOT_READY', error: 'Only applications that are ready for review can be marked as submitted.' });

    await logEvent({ applicationId: application._id, userId: application.userId, type: 'application.submitted', actor: 'user', message: 'You marked this application as submitted.', data: { via: 'manual' } });
    return res.json({ success: true, data: toClientApplication(updated, await loadPosting(updated.jobPostingId)) });
  }));

  // ── Server-side filling with review before submit (Stage 3d) ────────────────
  router.post('/applications/:id/server-fill', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (application.submission) return res.status(409).json({ success: false, code: 'ALREADY_SUBMITTED', error: 'This application is already submitted.' });
    if (application.status !== 'ready_for_review') return res.status(409).json({ success: false, code: 'NOT_READY', error: 'Tailor this application before filling it.' });
    if (application.decision?.state !== 'approved') return res.status(409).json({ success: false, code: 'NOT_APPROVED', error: 'Approve this job first.' });

    const posting = await loadPosting(application.jobPostingId);
    const { AdapterClass, enabled, reason } = pickAdapter(posting?.applyUrl || posting?.url);
    if (!enabled || !AdapterClass.canServerSubmit) {
      return res.status(409).json({ success: false, code: 'UNSUPPORTED_SITE', error: 'CVMind cannot fill this site for you. Use the browser extension instead.', data: { reason } });
    }

    await enqueueServerFill(application);
    await logEvent({ applicationId: application._id, userId: application.userId, type: 'fill.requested', actor: 'user', data: { adapter: AdapterClass.id } });
    return res.status(202).json({ success: true, data: toClientApplication({ ...application, progress: { step: 'filling', updatedAt: new Date() } }, posting) });
  }));

  router.get('/applications/:id/review', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    const fill = application.fill;
    if (!fill?.plan) return res.status(404).json({ success: false, code: 'NOT_FILLED', error: 'This application has not been filled on the server yet.' });

    return res.json({
      success: true,
      data: {
        adapter: fill.adapter,
        planHash: fill.planHash,
        approved: Boolean(fill.approvedPlanHash && fill.approvedPlanHash === fill.planHash),
        items: fill.plan.items || [],
        unmappedRequired: fill.unmappedRequired || [],
        mismatches: fill.mismatches || [],
        handoff: fill.handoff || null,
        blockedReason: fill.blockedReason || null,
        filledAt: fill.filledAt || null,
        screenshotUrl: fill.screenshotId ? `/api/agent/applications/${application._id}/artifacts/${fill.screenshotId}` : null
      }
    });
  }));

  // Editing an answer produces a new plan hash, so any earlier approval no longer counts
  router.patch('/applications/:id/fill-plan', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (!application.fill?.plan) return res.status(404).json({ success: false, code: 'NOT_FILLED', error: 'This application has not been filled on the server yet.' });
    if (application.status !== 'ready_for_review' || application.submission) {
      return res.status(409).json({ success: false, code: 'NOT_EDITABLE', error: 'The filled form can only be edited before it is submitted.' });
    }

    const edits = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!edits) return res.status(400).json({ success: false, code: 'INVALID_EDIT', error: 'Send the fields you changed.' });

    const byselector = new Map(edits.filter((item) => item?.selector).map((item) => [item.selector, String(item.value ?? '').slice(0, 5000)]));
    const items = (application.fill.plan.items || []).map((item) => (
      byselector.has(item.selector) ? { ...item, value: byselector.get(item.selector), valueSource: 'user', requiresReview: false } : item
    ));
    const planHash = planHashOf(items);

    const updated = await AgentApplication.findOneAndUpdate(
      { _id: application._id, status: 'ready_for_review' },
      { $set: { 'fill.plan.items': items, 'fill.planHash': planHash, 'fill.approvedPlanHash': null } },
      { returnDocument: 'after' }
    ).lean();
    if (!updated) return res.status(409).json({ success: false, code: 'NOT_EDITABLE', error: 'The filled form can only be edited before it is submitted.' });

    await logEvent({ applicationId: application._id, userId: application.userId, type: 'fill.edited', actor: 'user', data: { changed: byselector.size } });
    return res.json({ success: true, data: { planHash, items } });
  }));

  router.post('/applications/:id/submit', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (application.submission) return res.status(409).json({ success: false, code: 'ALREADY_SUBMITTED', error: 'This application is already submitted.' });
    if (!application.fill?.plan) return res.status(409).json({ success: false, code: 'NOT_FILLED', error: 'Fill this application before submitting it.' });
    if (application.fill.handoff) return res.status(409).json({ success: false, code: 'HANDOFF', error: 'This form needs the browser extension. CVMind cannot submit it for you.' });

    // Approval is tied to the exact answers the user saw
    if (req.body?.planHash !== application.fill.planHash) {
      return res.status(409).json({ success: false, code: 'PLAN_CHANGED', error: 'These answers changed since you reviewed them. Check them again.' });
    }

    await AgentApplication.updateOne({ _id: application._id }, { $set: { 'fill.approvedPlanHash': application.fill.planHash, 'progress.step': 'submitting', 'progress.updatedAt': new Date() } });
    await enqueueServerSubmit(application, application.fill.planHash);
    await logEvent({ applicationId: application._id, userId: application.userId, type: 'submit.requested', actor: 'user', message: 'You approved the filled form for submission.', data: { adapter: application.fill.adapter } });
    return res.status(202).json({ success: true });
  }));

  router.get('/applications/:id/artifacts/:fileId', asyncRoute(async (req, res) => {
    const application = await findOwnedApplication(req.params.id, req.auth.sub);
    if (!application) return res.status(404).json({ success: false, error: 'Not found.' });

    // Only files this application actually produced can be read through it
    const allowed = [application.fill?.screenshotId, application.fill?.screenshotAfterSubmit, application.submission?.screenshotId]
      .filter(Boolean)
      .map(String);
    if (!allowed.includes(String(req.params.fileId))) return res.status(404).json({ success: false, error: 'Not found.' });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    openDownloadStream(BUCKETS.agentArtifacts, req.params.fileId)
      .on('error', () => { if (!res.headersSent) res.status(404).json({ success: false, error: 'Not found.' }); else res.end(); })
      .pipe(res);
  }));

  return router;
}

export default createAgentRouter();

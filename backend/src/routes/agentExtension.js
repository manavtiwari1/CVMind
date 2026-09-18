import express from 'express';
import mongoose from 'mongoose';
import { requireUser } from '../services/authToken.js';
import { requireMongo, requireExtension } from '../agent/auth.js';
import AgentApplication from '../agent/models/AgentApplication.js';
import JobPosting from '../agent/models/JobPosting.js';
import ResumeProfile from '../agent/models/ResumeProfile.js';
import { getPreferences } from '../agent/preferences/service.js';
import { DEFAULT_PREFERENCES } from '../agent/preferences/schema.js';
import { createPairCode, redeemPairCode, refreshDeviceToken, listDevices, revokeDevice } from '../agent/extension/devices.js';
import { buildFillPlan } from '../agent/fill/buildFillPlan.js';
import { createApplicationForUser, pickResume } from '../agent/applications/create.js';
import { normalizeJobUrl } from '../agent/jobs/urlNormalize.js';
import { tailoredResumeHash } from '../agent/resume/pdfArtifacts.js';
import { openDownloadStream, BUCKETS } from '../agent/storage/gridfs.js';
import { transition } from '../agent/pipeline.js';
import { tryConsume } from '../agent/rateLimit.js';
import { logEvent } from '../agent/events.js';
import { sha256 } from '../agent/resume/derive.js';

const HOUR_MS = 60 * 60 * 1000;
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const deviceSummary = (device) => ({
  id: String(device._id),
  name: device.name,
  createdAt: device.createdAt,
  lastSeenAt: device.lastSeenAt || null
});

async function findApplicationForPage({ userId, applicationId, url }) {
  if (applicationId && mongoose.isValidObjectId(applicationId)) {
    return AgentApplication.findOne({ _id: applicationId, userId }).lean();
  }
  const normalized = normalizeJobUrl(url);
  if (!normalized) return null;
  const posting = await JobPosting.findOne({ urlHash: sha256(normalized) }).select('_id').lean();
  return posting ? AgentApplication.findOne({ userId, jobPostingId: posting._id }).lean() : null;
}

/**
 * Endpoints used by the browser extension. Mounted before the user-only middleware because
 * pairing is public and the rest authenticate with a revocable device token.
 */
export function createExtensionRouter({ buildPlan = buildFillPlan, loadLatestResumeWork } = {}) {
  const router = express.Router();
  router.use(requireMongo());

  // ── Pairing (web app, signed in) ────────────────────────────────────────────
  router.post('/pair-codes', requireUser, asyncRoute(async (req, res) => {
    const { code, expiresAt } = await createPairCode({ userId: req.auth.sub, email: req.auth.email });
    return res.json({ success: true, data: { code, expiresAt } });
  }));

  router.get('/devices', requireUser, asyncRoute(async (req, res) => {
    const devices = await listDevices(req.auth.sub);
    return res.json({ success: true, data: devices.map(deviceSummary) });
  }));

  router.delete('/devices/:id', requireUser, asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, error: 'Device not found.' });
    const result = await revokeDevice(req.auth.sub, req.params.id);
    if (result.matchedCount === 0) return res.status(404).json({ success: false, error: 'Device not found.' });
    return res.json({ success: true });
  }));

  // ── Pairing (extension, public: the code is the secret) ─────────────────────
  router.post('/pair', asyncRoute(async (req, res) => {
    const attempts = await tryConsume(`pair:${req.ip}`, { limit: 10, windowMs: 10 * 60 * 1000 });
    if (!attempts.ok) return res.status(429).json({ success: false, code: 'TOO_MANY_ATTEMPTS', error: 'Too many pairing attempts. Try again in a few minutes.' });

    const result = await redeemPairCode(req.body?.code, req.body?.deviceName);
    if (!result.ok) return res.status(400).json({ success: false, code: 'INVALID_CODE', error: result.error });
    return res.json({ success: true, data: { token: result.token, expiresAt: result.expiresAt, device: deviceSummary(result.device) } });
  }));

  router.post('/refresh', asyncRoute(requireExtension), asyncRoute(async (req, res) => {
    const { token, expiresAt } = await refreshDeviceToken(req.auth, req.device);
    return res.json({ success: true, data: { token, expiresAt } });
  }));

  // ── Page context ────────────────────────────────────────────────────────────
  router.get('/context', asyncRoute(requireExtension), asyncRoute(async (req, res) => {
    const userId = req.auth.sub;
    const application = await findApplicationForPage({ userId, url: req.query.url });
    const posting = application ? await JobPosting.findById(application.jobPostingId).select('-embeddings').lean() : null;
    const resume = await pickResume(userId, null);

    return res.json({
      success: true,
      data: {
        email: req.auth.email,
        resumeReady: Boolean(resume && resume.status === 'ready'),
        canTrack: !application,
        application: application ? {
          id: String(application._id),
          status: application.status,
          score: application.score?.total ?? null,
          decision: application.decision?.state ?? 'undecided',
          hasTailored: Boolean(application.tailored?.resume),
          hasPdf: Boolean(application.tailored?.pdf?.gridFsId),
          title: posting?.title || '',
          company: posting?.company?.name || ''
        } : null
      }
    });
  }));

  // ── Fill plan ───────────────────────────────────────────────────────────────
  router.post('/fill-plan', asyncRoute(requireExtension), asyncRoute(async (req, res) => {
    const userId = req.auth.sub;
    const { url, descriptors, applicationId } = req.body || {};
    if (!Array.isArray(descriptors) || !descriptors.length) {
      return res.status(400).json({ success: false, code: 'NO_FIELDS', error: 'No form fields were found on this page.' });
    }
    if (descriptors.length > 300) {
      return res.status(400).json({ success: false, code: 'TOO_MANY_FIELDS', error: 'This page has too many fields to map.' });
    }

    const quota = await tryConsume(`user:${userId}:fillplan`, { limit: 60, windowMs: HOUR_MS });
    if (!quota.ok) return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many autofill requests. Try again shortly.' });

    const application = await findApplicationForPage({ userId, applicationId, url });
    if (applicationId && !application) return res.status(404).json({ success: false, error: 'Application not found.' });

    const resume = application?.resumeProfileId
      ? await ResumeProfile.findOne({ _id: application.resumeProfileId, userId }).select('-embeddings').lean()
      : await pickResume(userId, null);
    if (!resume || resume.status !== 'ready') {
      return res.status(400).json({ success: false, code: 'NO_RESUME', error: 'Add and parse a resume in CVMind before autofilling.' });
    }

    const posting = application ? await JobPosting.findById(application.jobPostingId).select('-embeddings').lean() : null;
    const plan = await buildPlan(descriptors, {
      profile: resume.structured,
      derived: resume.derived,
      preferences: (await getPreferences(userId)) ?? structuredClone(DEFAULT_PREFERENCES),
      tailored: application?.tailored || null,
      job: posting
    }, {});

    if (application) {
      await logEvent({
        applicationId: application._id,
        userId,
        type: 'extension.fill_plan',
        actor: 'extension',
        message: `Prepared ${plan.stats.filled} of ${plan.stats.total} fields.`,
        data: { ...plan.stats, planHash: plan.planHash, unmappedRequired: plan.unmappedRequired.length }
      });
    }

    return res.json({
      success: true,
      data: {
        ...plan,
        applicationId: application ? String(application._id) : null,
        resumeFile: application?.tailored?.pdf?.gridFsId
          ? { filename: application.tailored.pdf.filename, url: `/api/agent/extension/resume.pdf?applicationId=${application._id}` }
          : null
      }
    });
  }));

  // The extension holds a device token, so it cannot use the user-authenticated PDF route
  router.get('/resume.pdf', asyncRoute(requireExtension), asyncRoute(async (req, res) => {
    const application = await findApplicationForPage({ userId: req.auth.sub, applicationId: req.query.applicationId, url: req.query.url });
    const tailored = application?.tailored;
    if (!tailored?.pdf?.gridFsId || tailored.pdf.sha256 !== tailoredResumeHash(tailored)) {
      return res.status(404).json({ success: false, code: 'PDF_NOT_READY', error: 'The tailored PDF is not ready yet.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(tailored.pdf.filename)}"`);
    openDownloadStream(BUCKETS.agentArtifacts, tailored.pdf.gridFsId)
      .on('error', () => { if (!res.headersSent) res.status(404).json({ success: false, error: 'Tailored resume not found.' }); else res.end(); })
      .pipe(res);
  }));

  // ── Tracking & submission ───────────────────────────────────────────────────
  router.post('/track', asyncRoute(requireExtension), asyncRoute(async (req, res) => {
    const result = await createApplicationForUser({ userId: req.auth.sub, url: req.body?.url, loadLatestResumeWork });
    if (!result.ok && result.code !== 'ALREADY_ADDED') {
      return res.status(result.status).json({ success: false, code: result.code, error: result.error });
    }
    return res.status(result.ok ? 202 : 200).json({
      success: true,
      data: { applicationId: String(result.application._id), status: result.application.status, alreadyAdded: !result.ok }
    });
  }));

  router.post('/confirm-submitted', asyncRoute(requireExtension), asyncRoute(async (req, res) => {
    const userId = req.auth.sub;
    const application = await findApplicationForPage({ userId, applicationId: req.body?.applicationId, url: req.body?.url });
    if (!application) return res.status(404).json({ success: false, error: 'Application not found.' });

    const updated = await transition(application._id, ['ready_for_review', 'matched', 'tailoring'], 'submitted', {
      submission: { via: 'extension', submittedAt: new Date() },
      'progress.step': 'submitted'
    });
    if (!updated) {
      return res.status(409).json({ success: false, code: 'ALREADY_SUBMITTED', error: 'This application is already submitted.' });
    }
    await logEvent({
      applicationId: application._id,
      userId,
      type: 'application.submitted',
      actor: 'extension',
      message: 'You submitted this application from the browser extension.',
      data: { via: 'extension' }
    });
    return res.json({ success: true, data: { status: updated.status } });
  }));

  return router;
}

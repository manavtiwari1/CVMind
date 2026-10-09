import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { requireUser } from '../services/authToken.js';
import ResumeProfile from '@cvmind/auto-apply-agent/models/ResumeProfile.js';
import { PreferencesInput } from '@cvmind/auto-apply-agent/preferences/schema.js';
import { getPreferences, savePreferences } from '@cvmind/auto-apply-agent/preferences/service.js';
import { pickResume } from '@cvmind/auto-apply-agent/applications/create.js';
import { importUploadedResume, importCvmindWork, RESUME_MIME_TYPES } from '@cvmind/auto-apply-agent/resume/intake.js';
import { buildFeed, toClientJob, appliedDates, LEVEL_FILTERS, MAX_SEARCH_SKILLS } from '../jobFinder/feed.js';
import { candidateFrom, matchJob } from '../jobFinder/match.js';
import { boardDescription, BOARD_SOURCES } from '../jobFinder/sources/boards.js';
import { resumeForMatching, resumeText } from '../jobFinder/resume.js';
import { FinderJob, JobApplyLog } from '../jobFinder/models.js';
import { planFor, canApply, canSearchEverywhere, recordSearch } from '../jobFinder/allowance.js';

// AI Job Finder (app.cvmind.in/job-finder). Jobs come from JSearch, Adzuna, company job boards and
// the CVMind Company Portal; the user applies on the company's site and we remember which jobs they
// applied to, so the same job later says "you applied on …". Free accounts get one application a
// month and a few full searches a day (see jobFinder/allowance.js); Pro has no limits.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, RESUME_MIME_TYPES.includes(file.mimetype))
});

// The preference fields Job Finder edits; the rest belong to Auto Apply
const ProfileInput = PreferencesInput.pick({ targetTitles: true, locations: true, workModes: true, seniority: true, employmentTypes: true, defaultResumeProfileId: true });
const JOB_KEY = /^(js|az|gh|lv|ab|sr|wk|cv):[\w:.-]{1,160}$/;
const DAY_OPTIONS = [1, 3, 7, 30];
const TYPES = ['full_time', 'internship', 'part_time', 'contract'];

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function defaultLoadWork(workId) {
  const { getWorkById } = await import('../db.js');
  return getWorkById(workId);
}

function toClientResume(profile) {
  return {
    id: String(profile._id),
    label: profile.label,
    source: profile.source,
    status: profile.status,
    parseError: profile.parseError || null,
    isDefault: Boolean(profile.isDefault),
    skills: (profile.derived?.normalizedSkillSet || []).slice(0, 30),
    // Skills read from the file's text while the full read is still waiting
    skillsFromText: Boolean(profile.quick),
    seniority: profile.derived?.seniority || null,
    updatedAt: profile.updatedAt
  };
}

const PROFILE_FIELDS = ['targetTitles', 'locations', 'workModes', 'seniority', 'employmentTypes'];
const pickProfile = (prefs) => Object.fromEntries(PROFILE_FIELDS.map((k) => [k, prefs?.[k] || []]));

async function profilePayload(auth, loadWork) {
  const userId = auth.sub;
  const [profiles, prefs, chosen, plan] = await Promise.all([
    ResumeProfile.find({ userId }).sort({ updatedAt: -1 }).select('-embeddings').lean(),
    getPreferences(userId),
    resumeForMatching(userId, { loadWork }),
    planFor(auth.email)
  ]);
  return {
    plan,
    resumes: profiles.map((p) => toClientResume(chosen && String(p._id) === String(chosen._id) ? chosen : p)),
    resumeId: chosen ? String(chosen._id) : null,
    preferences: pickProfile(prefs),
    onboarded: Boolean(prefs?.targetTitles?.length)
  };
}

function feedFilters(query) {
  const days = Number(query.days);
  const level = String(query.level || '');
  const type = String(query.type || '');
  return {
    q: String(query.q || '').slice(0, 100).trim(),
    location: String(query.location || '').slice(0, 80).trim(),
    days: DAY_OPTIONS.includes(days) ? days : null,
    remote: query.remote === 'true',
    level: LEVEL_FILTERS.includes(level) ? level : null,
    employmentType: TYPES.includes(type) ? type : null,
    company: String(query.company || '').slice(0, 60).trim(),
    mode: query.mode === 'skills' ? 'skills' : 'role',
    skills: String(query.skills || '').split(',').map((x) => x.trim().slice(0, 40)).filter(Boolean).slice(0, MAX_SEARCH_SKILLS)
  };
}

// Sends the user's resume to a recruiter's CVMind Company Portal job
async function applyInCvmind(job, req, match, loadWork) {
  const { saveCentralApplication } = await import('../db.js');
  const [user, resume] = await Promise.all([
    mongoose.models.User?.findOne({ email: req.auth.email }, { name: 1, phone: 1 }).lean(),
    pickResume(req.auth.sub)
  ]);
  const text = resume ? await resumeText(resume, { loadWork }) : '';
  await saveCentralApplication({
    jobId: job.cvmindJobId,
    companyId: job.companyId,
    candidateId: String(req.auth.sub),
    candidateName: user?.name || req.auth.email.split('@')[0],
    candidateEmail: req.auth.email,
    candidatePhone: user?.phone || '',
    resumeText: text.slice(0, 30000),
    matchScore: match?.score ?? 0,
    matchReasoning: match?.matchedSkills?.length ? `Skills that match: ${match.matchedSkills.slice(0, 8).join(', ')}` : '',
    mode: 'Job Finder'
  });
}

export function createJobFinderRouter({ loadWork = defaultLoadWork, sources = {} } = {}) {
  const router = express.Router();
  router.use(requireUser);

  // ── Resume and preferences ───────────────────────────────────────────────
  router.get('/profile', asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await profilePayload(req.auth, loadWork)) });
  }));

  router.put('/profile', asyncRoute(async (req, res) => {
    const parsed = ProfileInput.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Check your preferences and try again.' });
    const update = parsed.data;
    if (update.defaultResumeProfileId) {
      if (!mongoose.isValidObjectId(update.defaultResumeProfileId)
        || !(await ResumeProfile.exists({ _id: update.defaultResumeProfileId, userId: req.auth.sub }))) {
        return res.status(404).json({ success: false, error: 'Resume not found.' });
      }
    }
    await savePreferences(req.auth.sub, update);
    res.json({ success: true, ...(await profilePayload(req.auth, loadWork)) });
  }));

  router.post('/resumes/upload', (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? 'Resume file must be 5MB or smaller.' : err.message });
      next();
    });
  }, asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'Upload a PDF, DOCX or TXT resume file.' });
    const { profile } = await importUploadedResume({ userId: req.auth.sub, file: req.file, label: req.body?.label, via: 'job-finder' });
    await savePreferences(req.auth.sub, { defaultResumeProfileId: String(profile._id) });
    res.json({ success: true, ...(await profilePayload(req.auth, loadWork)) });
  }));

  router.post('/resumes/from-work', asyncRoute(async (req, res) => {
    const workId = String(req.body?.workId || '').trim();
    const work = workId ? await loadWork(workId) : null;
    if (!work || String(work.userId) !== String(req.auth.sub)) return res.status(404).json({ success: false, error: 'Resume not found in My Documents.' });
    if (work.type && work.type !== 'resume') return res.status(400).json({ success: false, error: 'Pick a resume, not another kind of document.' });
    const { profile } = await importCvmindWork({ userId: req.auth.sub, workId, work, via: 'job-finder' });
    await savePreferences(req.auth.sub, { defaultResumeProfileId: String(profile._id) });
    res.json({ success: true, ...(await profilePayload(req.auth, loadWork)) });
  }));

  // ── Jobs ─────────────────────────────────────────────────────────────────
  // Past a free account's daily searches, the paid job APIs are left out and the rest still run
  const nothing = async () => ({ jobs: [] });
  router.get('/feed', asyncRoute(async (req, res) => {
    const [profile, preferences, plan] = await Promise.all([resumeForMatching(req.auth.sub, { loadWork }), getPreferences(req.auth.sub), planFor(req.auth.email)]);
    const everywhere = canSearchEverywhere(plan);
    const feed = await buildFeed({
      profile,
      preferences: preferences || {},
      filters: feedFilters(req.query),
      email: req.auth.email,
      sources: everywhere ? sources : { ...sources, jsearch: nothing, adzuna: nothing }
    });
    if (!plan.pro && everywhere && !feed.needsRole && !feed.needsSkills) {
      await recordSearch(req.auth.email);
      plan.searches.used += 1;
    }
    res.json({ success: true, ...feed, plan, limitedSources: !everywhere });
  }));

  router.get('/jobs/:jobKey', asyncRoute(async (req, res) => {
    const { jobKey } = req.params;
    if (!JOB_KEY.test(jobKey)) return res.status(400).json({ success: false, error: 'Invalid job.' });
    const job = await FinderJob.findOne({ jobKey }).lean();
    if (!job) return res.status(404).json({ success: false, error: 'This job is no longer listed. Search again for fresh jobs.' });
    if (BOARD_SOURCES.includes(job.source)) job.description = await boardDescription(job);

    const [profile, preferences] = await Promise.all([resumeForMatching(req.auth.sub, { loadWork }), getPreferences(req.auth.sub)]);
    const match = matchJob(job, candidateFrom(profile, preferences || {}));
    const applied = await appliedDates(req.auth.email, [jobKey]);
    res.json({
      success: true,
      job: { ...toClientJob(job, match, applied.get(jobKey) || null), description: job.description || '' },
      match: { score: match.score, matchedSkills: match.matchedSkills, missingSkills: match.missingSkills, components: match.components }
    });
  }));

  // Saves a job the user says they applied to (the app asks after opening the company's page).
  // For a CVMind Company Portal job this is the application itself, sent once.
  router.post('/apply', asyncRoute(async (req, res) => {
    const jobKey = String(req.body?.jobKey || '');
    if (!JOB_KEY.test(jobKey)) return res.status(400).json({ success: false, error: 'Invalid job.' });
    const job = await FinderJob.findOne({ jobKey }).lean();
    if (!job) return res.status(404).json({ success: false, error: 'This job is no longer listed. Search again for fresh jobs.' });

    const email = req.auth.email.toLowerCase();
    const now = new Date();
    const existing = await JobApplyLog.findOneAndUpdate(
      { email, jobKey },
      { $set: { lastOpenedAt: now }, $inc: { openCount: 1 } },
      { returnDocument: 'after' }
    ).lean();
    if (existing) return res.json({ success: true, alreadyApplied: true, appliedAt: existing.createdAt, applyUrl: job.applyUrl });

    const plan = await planFor(email);
    if (!canApply(plan)) {
      return res.status(402).json({
        success: false,
        code: 'JOB_APPLY_LIMIT',
        resetsAt: plan.applies.resetsAt,
        error: 'Free accounts can apply to 1 job a month in AI Job Finder. Upgrade to CVMind Pro to apply to as many as you like.'
      });
    }

    const [profile, preferences] = await Promise.all([resumeForMatching(req.auth.sub, { loadWork }), getPreferences(req.auth.sub)]);
    const match = matchJob(job, candidateFrom(profile, preferences || {}));
    try {
      await JobApplyLog.create({
        email,
        userId: String(req.auth.sub),
        jobKey,
        source: job.source,
        title: job.title,
        company: job.company,
        location: job.location,
        applyUrl: job.applyUrl,
        matchScore: match.score,
        createdAt: now,
        lastOpenedAt: now
      });
    } catch (err) {
      // Two clicks at once: the other request recorded it first
      if (err.code !== 11000) throw err;
      const first = await JobApplyLog.findOne({ email, jobKey }).lean();
      return res.json({ success: true, alreadyApplied: true, appliedAt: first.createdAt, applyUrl: job.applyUrl });
    }
    if (job.source === 'cvmind') {
      try {
        await applyInCvmind(job, req, match, loadWork);
      } catch (err) {
        await JobApplyLog.deleteOne({ email, jobKey });
        throw err;
      }
    }
    if (!plan.pro) plan.applies.used += 1;
    res.json({ success: true, alreadyApplied: false, appliedAt: now, applyUrl: job.applyUrl, plan });
  }));

  router.use((err, req, res, next) => {
    console.error('[jobFinder]', err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ success: false, error: err.status ? err.message : 'Something went wrong. Please try again.' });
  });

  return router;
}

export default createJobFinderRouter();

import { AppSetting } from './models.js';
import { dbReady } from './auth.js';

// Each feature switch blocks these API path prefixes when it's turned off
export const FEATURES = {
  'resume-check': { label: 'Resume checker', description: 'ATS scan and AI fixes', paths: ['/api/analyze', '/api/optimize'] },
  'resume-builder': { label: 'Resume builder', description: 'AI resume generation, import and PDF export', paths: ['/api/resume/generate', '/api/resume/parse-data', '/api/resume/import-linkedin', '/api/resume/pdf', '/api/resume/email-pdf'] },
  tailor: { label: 'Resume tailor', description: 'Tailor a resume to a job description', paths: ['/api/tailor'] },
  'cover-letter': { label: 'Cover letter', description: 'AI cover letter refinement', paths: ['/api/cover-letter'] },
  proofread: { label: 'Proofreading', description: 'AI proofreading', paths: ['/api/ai/proofread'] },
  interview: { label: 'Interview prep', description: 'Interview coach and question practice', paths: ['/api/prep', '/api/interview'] },
  'voice-prep': { label: 'Voice prep', description: 'Voice mock interviews', paths: ['/api/voice-prep'] },
  linkedin: { label: 'LinkedIn tools', description: 'Profile audit, bio, outreach and posts', paths: ['/api/linkedin'] },
  career: { label: 'Career tools', description: 'Courses, elevator pitch and roadmap', paths: ['/api/career'] },
  portfolio: { label: 'Portfolio generator', description: 'AI portfolio sites', paths: ['/api/portfolio/generate-site'] },
  'job-finder': { label: 'Job finder', description: 'AI job matching', paths: ['/api/job-finder'] },
  chat: { label: 'AI assistant', description: 'Site chat assistant', paths: ['/api/chat'] },
  code: { label: 'CVMind Code', description: 'Coding practice and judge', paths: ['/api/code'] },
  'auto-apply': { label: 'Auto Apply', description: 'Auto Apply agent and extension', paths: ['/api/auto-apply', '/api/agent'] },
  'company-portal': { label: 'Company portal', description: 'Recruiter sign-up and job posting', paths: ['/api/company'] },
  signups: { label: 'New sign-ups', description: 'New accounts by email or social login', paths: ['/api/auth/signup'] }
};

export const VERSION_CLIENTS = {
  android: { label: 'Android app' },
  extension: { label: 'Chrome extension' }
};

// Email verification switch and abuse limits. Every limit is a count per window, e.g. sign-ups per IP per hour.
export const SECURITY_LIMITS = {
  signupPerIpHour: { label: 'Sign-ups per IP per hour', default: 5 },
  resendPerAccountHour: { label: 'Verification emails per account per hour', default: 3 },
  resendPerIpHour: { label: 'Verification emails per IP per hour', default: 10 },
  ticketsPerAccountDay: { label: 'Support messages per account per day', default: 5 },
  ticketsPerIpDay: { label: 'Support messages per IP per day', default: 10 },
  anonAnalyzePerIpDay: { label: 'Signed-out ATS checks per IP per day', default: 5 },
  passwordResetPerIpHour: { label: 'Password reset emails per IP per hour', default: 5 }
};

const DEFAULTS = {
  features: Object.fromEntries(Object.keys(FEATURES).map((key) => [key, true])),
  security: {
    requireEmailVerification: true,
    ...Object.fromEntries(Object.entries(SECURITY_LIMITS).map(([key, limit]) => [key, limit.default]))
  },
  maintenance: { enabled: false, message: 'CVMind is down for scheduled maintenance. We will be back shortly.' },
  versions: Object.fromEntries(Object.keys(VERSION_CLIENTS).map((key) => [key, { minVersion: '', latestVersion: '', message: '', updateUrl: '' }]))
};

export const SETTING_KEYS = Object.keys(DEFAULTS);

let cache = null;
let cacheAt = 0;
const CACHE_MS = 30 * 1000;

export function invalidateSettings() {
  cache = null;
}

// Settings merged over defaults. Falls back to defaults when the database is unavailable,
// so a database outage never switches features off.
export async function getSettings() {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const merged = structuredClone(DEFAULTS);
  try {
    if (await dbReady(2000)) {
      const rows = await AppSetting.find({ key: { $in: SETTING_KEYS } }).lean();
      for (const row of rows) {
        if (row.value && typeof row.value === 'object') {
          if (row.key === 'versions') {
            for (const client of Object.keys(merged.versions)) {
              merged.versions[client] = { ...merged.versions[client], ...(row.value[client] || {}) };
            }
          } else {
            merged[row.key] = { ...merged[row.key], ...row.value };
          }
        }
      }
    }
  } catch (err) {
    console.error('[settings] load failed, using defaults:', err.message);
  }
  cache = merged;
  cacheAt = Date.now();
  return merged;
}

const cleanText = (value, max) => String(value ?? '').trim().slice(0, max);
const VERSION_RE = /^\d+(\.\d+){0,3}$/;

// Validates and stores one settings group. Unknown keys are dropped.
export async function saveSettingGroup(key, input, updatedBy) {
  if (!SETTING_KEYS.includes(key)) throw Object.assign(new Error('Unknown settings group.'), { status: 400 });
  const current = (await getSettings())[key];
  let value;

  if (key === 'features') {
    value = { ...current };
    for (const feature of Object.keys(FEATURES)) {
      if (typeof input?.[feature] === 'boolean') value[feature] = input[feature];
    }
  } else if (key === 'security') {
    value = { ...current };
    if (typeof input?.requireEmailVerification === 'boolean') value.requireEmailVerification = input.requireEmailVerification;
    for (const [field, limit] of Object.entries(SECURITY_LIMITS)) {
      if (input?.[field] === undefined) continue;
      const n = Number(input[field]);
      if (!Number.isInteger(n) || n < 1 || n > 10000) throw Object.assign(new Error(`${limit.label} must be a whole number from 1 to 10000.`), { status: 400 });
      value[field] = n;
    }
  } else if (key === 'maintenance') {
    value = {
      enabled: typeof input?.enabled === 'boolean' ? input.enabled : current.enabled,
      message: input?.message !== undefined ? cleanText(input.message, 300) : current.message
    };
  } else {
    value = { ...current };
    for (const client of Object.keys(VERSION_CLIENTS)) {
      const next = input?.[client];
      if (!next) continue;
      const entry = { ...current[client] };
      for (const field of ['minVersion', 'latestVersion']) {
        if (next[field] === undefined) continue;
        const v = cleanText(next[field], 20);
        if (v && !VERSION_RE.test(v)) throw Object.assign(new Error(`${VERSION_CLIENTS[client].label}: "${v}" is not a version number like 1.2.0.`), { status: 400 });
        entry[field] = v;
      }
      if (entry.minVersion && entry.latestVersion && compareVersions(entry.minVersion, entry.latestVersion) > 0) {
        throw Object.assign(new Error(`${VERSION_CLIENTS[client].label}: the minimum version can't be newer than the latest version.`), { status: 400 });
      }
      if (next.message !== undefined) entry.message = cleanText(next.message, 300);
      if (next.updateUrl !== undefined) {
        const url = cleanText(next.updateUrl, 500);
        if (url && !/^https:\/\//i.test(url)) throw Object.assign(new Error('The update link must start with https://'), { status: 400 });
        entry.updateUrl = url;
      }
      value[client] = entry;
    }
  }

  await AppSetting.findOneAndUpdate({ key }, { value, updatedBy }, { upsert: true });
  invalidateSettings();
  return { before: current, after: value };
}

export function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

// What a client should do for its installed version: 'ok', 'recommended' or 'required'
export function versionVerdict(entry, installed) {
  const v = String(installed || '').trim();
  if (!entry || !VERSION_RE.test(v)) return 'ok';
  if (entry.minVersion && compareVersions(v, entry.minVersion) < 0) return 'required';
  if (entry.latestVersion && compareVersions(v, entry.latestVersion) < 0) return 'recommended';
  return 'ok';
}

// Strips the Vercel '/_/backend' mount so one path list works for both mounts
const normalizePath = (path) => path.replace(/^\/_\/backend/, '');

const ALWAYS_OPEN = ['/api/admin', '/api/config', '/api/content'];

// Blocks switched-off features and, in maintenance mode, everything except the admin panel
export async function featureGate(req, res, next) {
  const path = normalizePath(req.path);
  if (!path.startsWith('/api/') || ALWAYS_OPEN.some((p) => path.startsWith(p))) return next();
  if (req.method === 'OPTIONS') return next();

  const settings = await getSettings();
  if (settings.maintenance.enabled) {
    return res.status(503).json({ success: false, code: 'MAINTENANCE', error: settings.maintenance.message });
  }
  for (const [key, feature] of Object.entries(FEATURES)) {
    if (settings.features[key] === false && feature.paths.some((p) => path === p || path.startsWith(`${p}/`))) {
      return res.status(503).json({ success: false, code: 'FEATURE_DISABLED', feature: key, error: `${feature.label} is turned off for now. Please try again later.` });
    }
  }
  next();
}

// New accounts from social login aren't covered by the /api/auth/signup path, so the auth code asks directly
export async function signupsEnabled() {
  return (await getSettings()).features.signups !== false;
}

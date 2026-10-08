import { readUserSession } from '../services/authToken.js';
import { dbReady } from '../admin/auth.js';
import { FREE_WEEKLY } from './plans.js';
import { isPro, tokenStatus, recordTokens, featureAllowance, recordFeatureUse } from './service.js';
import { runWithAiContext } from './aiContext.js';

// Routes that call an AI model. Signed-in accounts spend from their 3-day token budget here;
// signed-out visitors (the free resume check on the home page) are limited per IP elsewhere.
export const AI_PATHS = [
  '/api/chat', '/api/analyze', '/api/optimize', '/api/tailor', '/api/prep', '/api/interview',
  '/api/cover-letter/refine', '/api/cover-letter/generate',
  '/api/resume/generate', '/api/resume/parse-data', '/api/resume/import-linkedin',
  '/api/linkedin', '/api/career', '/api/voice-prep', '/api/portfolio/generate-site',
  '/api/job-finder', '/api/ai', '/api/code/ai'
];

const normalizePath = (path) => path.replace(/^\/_\/backend/, '');
const isAiPath = (path) => AI_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

const formatReset = (date) => (date
  ? new Date(date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  : null);

export async function aiBudgetGate(req, res, next) {
  if (req.method === 'OPTIONS' || req.method === 'GET') return next();
  const path = normalizePath(req.path);
  if (!isAiPath(path)) return next();
  const session = await readUserSession(req);
  if (!session?.ok || !session.payload.email || !(await dbReady(2000))) return next();

  const email = session.payload.email;
  try {
    const pro = await isPro(email);
    const status = await tokenStatus(email, pro);
    if (status.used >= status.limit) {
      const when = formatReset(status.resetsAt);
      return res.status(429).json({
        success: false,
        code: 'TOKEN_LIMIT',
        pro,
        used: status.used,
        limit: status.limit,
        resetsAt: status.resetsAt,
        error: pro
          ? `You've used your ${status.limit.toLocaleString('en-IN')} AI tokens for these 3 days.${when ? ` More free up on ${when}.` : ''}`
          : `You've used your ${status.limit.toLocaleString('en-IN')} free AI tokens for these 3 days. Upgrade to CVMind Pro for ${(25000).toLocaleString('en-IN')}${when ? `, or wait until ${when}` : ''}.`
      });
    }
  } catch (err) {
    console.error('[billing] budget check failed, allowing request:', err.message);
  }

  req.aiContext = { email, charge: (tokens) => recordTokens(email, tokens, path) };
  return runWithAiContext(req.aiContext, () => next());
}

// Route middleware for features free accounts get a few times a week. `feature` is a key of
// FREE_WEEKLY, or a function of the request returning one (or null when the request isn't limited).
// Place it after the upload middleware so the request body is available.
export function requireFreeUse(feature) {
  return async (req, res, next) => {
    const key = typeof feature === 'function' ? feature(req) : feature;
    if (!key || !FREE_WEEKLY[key]) return next();
    const session = await readUserSession(req);
    if (!session) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in to use this feature.' });
    if (!session.ok) return res.status(401).json({ success: false, code: 'SESSION_REVOKED', error: session.error });
    if (!(await dbReady(2000))) return next();

    const email = session.payload.email;
    try {
      if (await isPro(email)) return next();
      const allowance = await featureAllowance(email, key);
      if (allowance.used >= allowance.limit) {
        const { label, limit } = FREE_WEEKLY[key];
        const when = formatReset(allowance.resetsAt);
        return res.status(402).json({
          success: false,
          code: 'UPGRADE_REQUIRED',
          feature: key,
          limit,
          resetsAt: allowance.resetsAt,
          error: `You've used your ${limit} free ${label.toLowerCase()}${limit === 1 ? '' : 's'} this week. Upgrade to CVMind Pro for unlimited use${when ? `, or wait until ${when}` : ''}.`
        });
      }
    } catch (err) {
      console.error('[billing] free-use check failed, allowing request:', err.message);
      return next();
    }
    // Count the use only when the feature actually worked
    res.on('finish', () => {
      if (res.statusCode < 400) recordFeatureUse(email, key).catch((err) => console.error('[billing] free-use record failed:', err.message));
    });
    next();
  };
}

// Code hints: concept, approach, algorithm and pseudocode stay free; the explanation (5) and
// the full solution (6) are limited
export const codeHintFeature = (req) => {
  const level = Number(req.body?.requestedLevel || 1);
  return level === 5 ? 'code-explanation' : level === 6 ? 'code-solution' : null;
};

export const interviewFeature = (req) => (String(req.body?.mode || 'text') === 'voice' ? 'interview-voice' : 'interview-text');

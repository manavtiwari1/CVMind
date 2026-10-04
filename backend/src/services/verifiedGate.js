import { readUserSession } from './authToken.js';
import { getSettings } from '../admin/settings.js';
import { findUserById } from '../db.js';
import { hitLimit, clientIp, DAY_MS } from './limiter.js';
import { logAuthEvent } from './authEvents.js';
import { VERIFY_MESSAGES } from './emailVerification.js';

// Server-side email verification. The frontend hides these features too, but this is what enforces it.

// Signed-in, verified accounts only. A missing method list means every method.
const VERIFIED_ONLY = [
  { path: '/api/optimize' },
  { path: '/api/tailor' },
  { path: '/api/prep' },
  { path: '/api/interview' },
  { path: '/api/voice-prep' },
  { path: '/api/cover-letter' },
  { path: '/api/resume/generate' },
  { path: '/api/resume/parse-data' },
  { path: '/api/resume/import-linkedin' },
  { path: '/api/resume/pdf' },
  { path: '/api/resume/email-pdf' },
  { path: '/api/linkedin' },
  { path: '/api/career' },
  { path: '/api/portfolio/generate-site' },
  { path: '/api/job-finder' },
  { path: '/api/chat' },
  { path: '/api/ai' },
  { path: '/api/code/ai' },
  { path: '/api/user/work', methods: ['POST'] },
  { path: '/api/contact', methods: ['POST'], message: VERIFY_MESSAGES.NOT_VERIFIED }
];

// Exceptions inside the paths above: no AI and nothing saved, so anyone can use them
// (the Cover Letter Generator reads the uploaded resume before asking the visitor to sign in)
const ALWAYS_OPEN = ['/api/cover-letter/read-resume'];

// Open to signed-out visitors (or other token kinds, e.g. the extension), but closed to signed-in unverified accounts
const UNVERIFIED_BLOCKED = [
  { path: '/api/analyze', methods: ['POST'], anonymousLimit: 'anonAnalyzePerIpDay' },
  { path: '/api/auto-apply' },
  { path: '/api/agent' }
];

const normalizePath = (path) => path.replace(/^\/_\/backend/, '');

const matches = (rule, req, path) =>
  (path === rule.path || path.startsWith(`${rule.path}/`)) && (!rule.methods || rule.methods.includes(req.method));

// MongoDB sessions report the flag; the JSON-file fallback needs a lookup
async function isVerified(payload) {
  if (typeof payload.emailVerified === 'boolean') return payload.emailVerified;
  try {
    const user = await findUserById(payload.sub);
    return user ? !!user.emailVerified : false;
  } catch (err) {
    console.error('[verified gate] user lookup failed, allowing request:', err.message);
    return true;
  }
}

export async function verifiedGate(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const path = normalizePath(req.path);
  if (ALWAYS_OPEN.includes(path)) return next();
  const strict = VERIFIED_ONLY.find((rule) => matches(rule, req, path));
  const soft = !strict && UNVERIFIED_BLOCKED.find((rule) => matches(rule, req, path));
  if (!strict && !soft) return next();

  const { security } = await getSettings();
  const session = await readUserSession(req);

  if (!session) {
    if (soft) {
      if (soft.anonymousLimit) {
        const limit = await hitLimit(`${soft.path}:ip:${clientIp(req)}`, security[soft.anonymousLimit], DAY_MS);
        if (!limit.ok) {
          logAuthEvent(req, 'RATE_LIMIT_TRIGGERED', { metadata: { limit: soft.anonymousLimit } });
          return res.status(429).json({ success: false, code: 'SIGN_IN_FOR_MORE', retryAfter: limit.retryAfter, error: "You've used today's free checks. Sign in and verify your email to keep going." });
        }
      }
      return next();
    }
    // Before verification was required, these routes also served signed-out visitors
    if (!security.requireEmailVerification && !strict.message) return next();
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please sign in to use this feature.' });
  }
  if (!session.ok) return res.status(401).json({ success: false, code: 'SESSION_REVOKED', error: session.error });
  if (!security.requireEmailVerification) return next();

  if (!(await isVerified(session.payload))) {
    const rule = strict || soft;
    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      error: rule.message || 'Please verify your email address to use this feature.'
    });
  }
  next();
}

import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import autoApplyRouter from './routes/autoApply.js';
import agentRouter from './routes/agent.js';
import { startWorkers } from './agent/queue/workers.js';
import companyRouter from './routes/company.js';
import codeRouter from './routes/code.js';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { parsePdf, parseDocx, parseTxt, fetchResumeFromUrl } from './services/parser.js';
import { analyzeResumeWithGemini, chatWithCVMind, optimizeResumeWithGemini, tailorResumeWithGemini, generatePrepQuestionsWithGemini, refineCoverLetterWithGemini, generateCoverLetterWithAI, analyzeLinkedInProfileWithGemini, evaluatePrepAnswerWithGemini, generateLinkedinBioWithGemini, generateLinkedinOutreachWithGemini, generateCareerCoursesWithGemini, generateElevatorPitchWithGemini, generateCareerRoadmapWithGemini, findJobsWithGemini, generateResumeWithGemini, extractResumeDataWithAI, generateProofreadingWithDeepSeek, generateInterviewPlan, evaluateInterviewAnswer, generateInterviewReport } from './services/gemini.js';
import { getPublicStats, saveContactMessage, saveScan, saveFix, saveTailorLog, savePrepLog, findUserByEmail, createUser, saveLoginLog, saveWork, getUserWorks, deleteUserWork, deleteAccount, updateUserProfile, updateUserPassword, findUserById, saveUserResetToken, findUserByResetToken, updateUserFields, saveLinkedinLog, saveLinkedinBioLog, saveLinkedinOutreachLog, saveCareerCoursesLog, saveElevatorPitchLog, saveCareerRoadmapLog, saveVoicePrepLog, savePortfolioGenLog, saveLinkedinPostLog, getWorkById, saveJobFinderLog, saveProofreadLog, savePaymentLog, checkJobFinderAccess, getUserUsageToday, FREE_DAILY_LIMITS, isUserPaid, hasAutoApplyAccess } from './db.js';
import adminRouter from './admin/router.js';
import adminPublicRoutes from './admin/publicRoutes.js';
import { featureGate, signupsEnabled, getSettings } from './admin/settings.js';
import { metricsMiddleware } from './admin/metrics.js';
import { installSessionValidator, newSessionId, recordSession, revokeAllSessions, invalidateSessionCache } from './admin/sessions.js';
import { ticketFromContact } from './admin/tickets.js';
import { startInboxPolling } from './admin/inbox.js';
import { evaluateCoupon, redeemCoupon } from './admin/coupons.js';
import { signToken, verifyToken, assertAuthConfigured, requireUser, requireSelf, optionalUser, userSessionStatus } from './services/authToken.js';
import { verifiedGate } from './services/verifiedGate.js';
import { productGate } from './services/productGate.js';
import billingRouter from './billing/routes.js';
import { aiBudgetGate, requireFreeUse, interviewFeature } from './billing/gate.js';
import { chargeAiUsage, keepAiContext } from './billing/aiContext.js';
import { issueVerification, verifyEmailToken, resendCooldown, hashToken, frontendUrl, markEmailVerified, verifyThroughProvider, VERIFY_MESSAGES } from './services/emailVerification.js';
import { assessSignupRisk, isHighRisk, RISK_HIGH } from './services/emailRisk.js';
import { hitLimit, checkLimit, clientIp, HOUR_MS, DAY_MS } from './services/limiter.js';
import { logAuthEvent } from './services/authEvents.js';
import { CaptchaChallenge, OAuthHandoff } from './admin/models.js';
import { sendEmail, emailConfigured } from './admin/mailer.js';
import { welcomeEmail, passwordResetEmail, resumePdfEmail } from './services/emailTemplates.js';
import { dbReady } from './admin/auth.js';
import mongoose from 'mongoose';
import { importUploadedResume, RESUME_MIME_TYPES } from './agent/resume/intake.js';
import { renderResumePdf } from './agent/resume/pdf.js';
import { searchJobs, getJobDetail, warmJobSearch, JOB_SEARCH_COMPANIES } from './services/jobSearch.js';

const app = express();
// Render/Vercel sit behind one proxy; trust it so rate limiting sees the real client IP
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Refuse to boot in production without a token signing secret
assertAuthConfigured();

// Revoked sessions and blocked accounts are rejected on every signed-in request
installSessionValidator();

// Attach a signed session token to a user payload returned by a real sign-in.
// Each token gets its own session id, so it shows up (and can be signed out) in the admin panel and Account page.
// Pass currentJti when re-issuing a token for a session that already exists (e.g. after a profile edit).
const withSessionToken = (payload, req, provider = '', currentJti = '') => {
  const jti = currentJti || newSessionId();
  if (!currentJti) recordSession({ jti, userId: payload.id, email: payload.email, provider, req });
  return {
    ...payload,
    token: signToken({ sub: payload.id, kind: 'user', email: payload.email, jti })
  };
};

// Save a generated result to the signed-in user's My Works. A failed save must never throw away
// an AI result the user already waited for, so errors are logged and the response goes out anyway.
async function safeSaveWork(args) {
  try {
    return await saveWork(args);
  } catch (err) {
    console.error('[works] could not save result:', err.message);
    return null;
  }
}

// Saves a feature result as My Works JSON; no-op for signed-out visitors
function saveFeatureWork(userId, { title, type, templateId, payload }) {
  if (!userId) return Promise.resolve(null);
  return safeSaveWork({
    userId,
    title: String(title || 'Untitled').slice(0, 120),
    type,
    templateId,
    htmlContent: JSON.stringify(payload)
  });
}

// Initialize Resend Client
// Welcome email for new social-login accounts (email sign-ups get the verification email instead)
const sendWelcomeEmail = async (email, name) => {
  if (!emailConfigured()) {
    console.warn('[WELCOME EMAIL] Skipping send - RESEND_API_KEY is not configured.');
    return;
  }
  try {
    await sendEmail({ to: email, ...welcomeEmail({ name }) });
  } catch (err) {
    console.error('[WELCOME EMAIL] Send failed:', err.message);
  }
};

// Enable CORS for all requests, allow credentials and specific headers
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gemini-key']
}));

// Saved resumes / portfolios carry full HTML (often with an embedded photo); the 100kb default
// body limit made those saves fail with a 413 and the work never reached MongoDB.
// The Cashfree webhook signature covers the raw body, so that one route keeps it
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => { if (req.originalUrl.endsWith('/api/billing/webhook')) req.rawBody = buf.toString('utf8'); }
}));

// Request timing for the admin System Health page
app.use(metricsMiddleware);
// Feature switches and maintenance mode set in the admin panel
app.use(featureGate);
// Email verification for the AI tools, saving, downloads and support (see services/verifiedGate.js)
app.use(verifiedGate);
// Locked products: only accounts given access in the admin panel
app.use(productGate);
// AI token budget for signed-in accounts (3-day window) and token accounting (see billing/)
app.use(aiBudgetGate);

// Public routes that call an AI model: limit each IP so scripted requests can't burn AI credits.
// Signed-in-only AI routes (auto-apply, agent, company parse-job) are not included.
const AI_ROUTE_PATHS = [
  '/api/chat',
  '/api/analyze',
  '/api/optimize',
  '/api/tailor',
  '/api/prep',
  '/api/interview',
  '/api/cover-letter/refine',
  '/api/cover-letter/generate',
  '/api/cover-letter/read-resume',
  '/api/resume/generate',
  '/api/resume/parse-data',
  '/api/resume/import-linkedin',
  '/api/resume/pdf',
  '/api/resume/email-pdf',
  '/api/linkedin',
  '/api/career',
  '/api/voice-prep',
  '/api/portfolio/generate-site',
  '/api/job-finder',
  '/api/ai',
  '/api/code/ai',
];
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ success: false, error: 'Too many requests. Please wait a minute and try again.' });
  },
});
app.use([...AI_ROUTE_PATHS, ...AI_ROUTE_PATHS.map((p) => `/_/backend${p}`)], aiRateLimiter);

const apiRouter = express.Router();

// In-memory file upload configuration
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are supported.'));
    }
  }
});
// Multer loses the request's async context; keep it so AI calls after an upload are charged to the account
const upload = { single: (field) => keepAiContext(multerUpload.single(field)) };

// Root Health Check Route
apiRouter.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'CV Mind Backend API is running smoothly.',
    timestamp: new Date()
  });
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 429 for an abuse limit, logged for the admin panel
function rateLimited(req, res, { limit, retryAfter, error, userId = '', email = '' }) {
  logAuthEvent(req, 'RATE_LIMIT_TRIGGERED', { userId, email, metadata: { limit } });
  return res.status(429).json({ success: false, code: 'RATE_LIMITED', retryAfter, error });
}

// User Sign Up Route
apiRouter.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, captchaId, captchaAnswer } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  const cleanName = String(name).trim().slice(0, 100);
  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanName) return res.status(400).json({ error: 'Please enter your full name.' });
  if (cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long.' });

  try {
    const { security } = await getSettings();
    const ipLimit = await hitLimit(`signup:ip:${clientIp(req)}`, security.signupPerIpHour, HOUR_MS);
    if (!ipLimit.ok) {
      return rateLimited(req, res, { limit: 'signupPerIpHour', retryAfter: ipLimit.retryAfter, email: cleanEmail, error: 'Too many accounts were created from this network. Please try again later.' });
    }

    // Disposable addresses and fast repeat sign-ups aren't refused, but must pass a captcha
    const risk = assessSignupRisk(cleanEmail, { ipSignupCount: ipLimit.count });
    if (risk.score >= RISK_HIGH && !(await verifyCaptcha(captchaId, captchaAnswer))) {
      return res.status(400).json({
        code: 'CAPTCHA_REQUIRED',
        captchaRequired: true,
        error: captchaId ? 'Captcha verification failed. Please try the new code.' : 'Please complete the captcha to create your account.'
      });
    }

    const existingUser = await findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered. Please sign in.' });
    }

    // Hash the password securely with 10 salt rounds
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await createUser({
      email: cleanEmail,
      name: cleanName,
      password: hashedPassword,
      isGoogleUser: false,
      riskScore: risk.score,
      riskFlags: risk.flags
    });

    await saveLoginLog({ email: newUser.email, name: newUser.name, provider: 'signup' });
    logAuthEvent(req, 'USER_REGISTERED', { userId: newUser.id || newUser._id, email: newUser.email, metadata: risk.flags.length ? { riskFlags: risk.flags } : null });

    // The verification email doubles as the welcome email
    const { sent } = await issueVerification(newUser);
    if (sent) logAuthEvent(req, 'VERIFICATION_EMAIL_SENT', { userId: newUser.id || newUser._id, email: newUser.email });

    const isPaid = await isUserPaid(newUser);
    const userPayload = {
      id: newUser.id || newUser._id,
      name: newUser.name,
      email: newUser.email,
      isGoogleUser: newUser.isGoogleUser || false,
      emailVerified: false
    };
    if (isPaid) {
      userPayload.plan = 'pro';
      userPayload.isPro = true;
      userPayload.isPaid = true;
    }

    return res.json({
      success: true,
      message: 'Account created successfully!',
      verificationEmailSent: sent,
      user: withSessionToken(userPayload, req, 'password')
    });
  } catch (err) {
    console.error('Sign Up Error:', err);
    return res.status(500).json({ error: err.message || 'An error occurred during account creation.' });
  }
});

// ── Public Stats (homepage banner) ────────────────────────────────────────────
// Short cache keeps DB load low; new scans invalidate it so counts update live.
let publicStatsCache = { data: null, at: 0 };
const invalidatePublicStats = () => { publicStatsCache = { data: null, at: 0 }; };
apiRouter.get('/api/stats/public', async (req, res) => {
  try {
    if (!publicStatsCache.data || Date.now() - publicStatsCache.at > 60 * 1000) {
      publicStatsCache = { data: await getPublicStats(), at: Date.now() };
    }
    res.json({ success: true, data: publicStatsCache.data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Login Captcha ─────────────────────────────────────────────────────────────
// Self-hosted SVG captcha for sign-in and risky sign-ups. Challenges are single-use and expire.
// They live in MongoDB so the server that checks the answer needn't be the one that drew it;
// without a database they stay in this process's memory.
const captchaStore = new Map(); // id -> { answer, expires }
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid ambiguity

function generateCaptchaSvg(code) {
  const width = 200, height = 64;
  const colors = ['#1d4ed8', '#7c3aed', '#0f766e', '#b91c1c', '#a16207'];
  const rand = (min, max) => min + Math.random() * (max - min);
  let parts = [`<rect width="${width}" height="${height}" fill="#f4f4f7" rx="10"/>`];
  for (let i = 0; i < 4; i++) {
    parts.push(`<line x1="${rand(0, width)}" y1="${rand(0, height)}" x2="${rand(0, width)}" y2="${rand(0, height)}" stroke="${colors[Math.floor(rand(0, colors.length))]}" stroke-width="1.2" opacity="0.35"/>`);
  }
  code.split('').forEach((ch, i) => {
    const x = 25 + i * 32 + rand(-4, 4);
    const y = rand(38, 48);
    parts.push(`<text x="${x}" y="${y}" font-family="Georgia, serif" font-size="${rand(28, 34)}" font-weight="bold" fill="${colors[Math.floor(rand(0, colors.length))]}" transform="rotate(${rand(-22, 22)} ${x} ${y})">${ch}</text>`);
  });
  for (let i = 0; i < 25; i++) {
    parts.push(`<circle cx="${rand(0, width)}" cy="${rand(0, height)}" r="${rand(0.5, 1.5)}" fill="${colors[Math.floor(rand(0, colors.length))]}" opacity="0.3"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}

apiRouter.get('/api/auth/captcha', async (req, res) => {
  let code = '';
  for (let i = 0; i < 5; i++) code += CAPTCHA_CHARS[crypto.randomInt(CAPTCHA_CHARS.length)];
  const captchaId = crypto.randomUUID();
  const expires = Date.now() + CAPTCHA_TTL_MS;
  try {
    if (await dbReady(2000)) {
      await CaptchaChallenge.create({ _id: captchaId, answer: code, expiresAt: new Date(expires) });
    } else {
      for (const [id, entry] of captchaStore) {
        if (Date.now() > entry.expires) captchaStore.delete(id);
      }
      captchaStore.set(captchaId, { answer: code, expires });
    }
  } catch (err) {
    console.error('[captcha] could not store challenge:', err.message);
    return res.status(500).json({ error: 'Could not create a captcha. Please try again.' });
  }
  res.json({ captchaId, svg: generateCaptchaSvg(code) });
});

async function verifyCaptcha(captchaId, answer) {
  if (!captchaId || typeof captchaId !== 'string') return false;
  let entry = null;
  if (await dbReady(0)) {
    // single-use: consumed on any attempt
    const row = await CaptchaChallenge.findOneAndDelete({ _id: captchaId }).lean().catch(() => null);
    if (row) entry = { answer: row.answer, expires: new Date(row.expiresAt).getTime() };
  } else {
    entry = captchaStore.get(captchaId) || null;
    captchaStore.delete(captchaId);
  }
  if (!entry || Date.now() > entry.expires) return false;
  return String(answer || '').trim().toUpperCase() === entry.answer;
}

// Blocked-account messages shown when a moderated user attempts to sign in
const ACCOUNT_STATUS_MESSAGES = {
  suspended: 'Your account has been temporarily suspended. Please contact support for assistance.',
  banned: 'Your account has been banned for violating our terms of service. Contact support if you believe this is a mistake.'
};

function getAccountBlockError(user) {
  const status = user?.status;
  if (status && status !== 'active') {
    return { error: ACCOUNT_STATUS_MESSAGES[status] || 'Your account access has been restricted.', accountStatus: status };
  }
  return null;
}

// Password guessing: every attempt counts against the network, wrong passwords against the account
const LOGIN_ATTEMPTS_PER_IP = 30;
const LOGIN_IP_WINDOW_MS = 15 * 60 * 1000;
// Wrong passwords count per account and network (stops guessing), and per account overall with a much
// higher limit (stops spreading guesses across networks) so one person can't easily lock someone else out
const LOGIN_FAILURES_PER_ACCOUNT_IP_HOUR = 10;
const LOGIN_FAILURES_PER_ACCOUNT_HOUR = 50;
const loginFailureLimits = (email, req) => [
  [`login-fail:${email}:ip:${clientIp(req)}`, LOGIN_FAILURES_PER_ACCOUNT_IP_HOUR],
  [`login-fail:${email}`, LOGIN_FAILURES_PER_ACCOUNT_HOUR]
];
const countLoginFailure = (email, req) => Promise.all(loginFailureLimits(email, req).map(([key, limit]) => hitLimit(key, limit, HOUR_MS)));

// User Sign In Route
apiRouter.post('/api/auth/login', async (req, res) => {
  const { email, password, captchaId, captchaAnswer } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const ipLimit = await hitLimit(`login:ip:${clientIp(req)}`, LOGIN_ATTEMPTS_PER_IP, LOGIN_IP_WINDOW_MS);
  if (!ipLimit.ok) {
    return rateLimited(req, res, { limit: 'loginPerIp', retryAfter: ipLimit.retryAfter, error: 'Too many sign-in attempts from this network. Please wait a few minutes and try again.' });
  }

  if (!(await verifyCaptcha(captchaId, captchaAnswer))) {
    return res.status(400).json({ error: 'Captcha verification failed. Please try the new code.', captchaFailed: true });
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  for (const [key, limit] of loginFailureLimits(cleanEmail, req)) {
    const accountLimit = await checkLimit(key, limit, HOUR_MS);
    if (!accountLimit.ok) {
      return rateLimited(req, res, { limit: 'loginFailures', retryAfter: accountLimit.retryAfter, email: cleanEmail, error: 'Too many wrong passwords for this account. Please wait and try again, or reset your password.' });
    }
  }
  let WHITELISTED_USERS = {};
  let WHITELISTED_NAMES = {};
  try {
    if (process.env.WHITELISTED_USERS) {
      WHITELISTED_USERS = JSON.parse(process.env.WHITELISTED_USERS);
    }
    if (process.env.WHITELISTED_NAMES) {
      WHITELISTED_NAMES = JSON.parse(process.env.WHITELISTED_NAMES);
    }
  } catch (err) {
    console.error('Error parsing whitelisted credentials:', err);
  }

  if (WHITELISTED_USERS[cleanEmail] && password === WHITELISTED_USERS[cleanEmail]) {
    try {
      let user = await findUserByEmail(cleanEmail);
      const displayName = WHITELISTED_NAMES[cleanEmail] || 'Authorized User';
      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await createUser({
          email: cleanEmail,
          name: displayName,
          password: hashedPassword,
          isGoogleUser: false
        });

        // Send welcome email asynchronously for whitelisted user creation
        sendWelcomeEmail(user.email, user.name);
      } else {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          await updateUserPassword(user.id || user._id, hashedPassword);
        }
      }
    } catch (err) {
      console.error('Whitelisted user sync error:', err);
    }
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      // Counted like a wrong password, so the limit doesn't reveal which addresses have accounts
      await countLoginFailure(cleanEmail, req);
      logAuthEvent(req, 'LOGIN_FAILED', { email: cleanEmail, metadata: { reason: 'unknown_email' } });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare bcrypt hashes
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await countLoginFailure(cleanEmail, req);
      logAuthEvent(req, 'LOGIN_FAILED', { userId: user.id || user._id, email: user.email, metadata: { reason: 'wrong_password' } });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const blockError = getAccountBlockError(user);
    if (blockError) {
      logAuthEvent(req, 'LOGIN_FAILED', { userId: user.id || user._id, email: user.email, metadata: { reason: `account_${user.status}` } });
      return res.status(403).json(blockError);
    }

    await saveLoginLog({ email: user.email, name: user.name, provider: 'password' });
    logAuthEvent(req, 'LOGIN_SUCCESS', { userId: user.id || user._id, email: user.email, metadata: { provider: 'password' } });

    const isPaid = await isUserPaid(user);
    const userPayload = {
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      isGoogleUser: user.isGoogleUser || false,
      emailVerified: !!user.emailVerified
    };
    if (isPaid) {
      userPayload.plan = 'pro';
      userPayload.isPro = true;
      userPayload.isPaid = true;
    }

    return res.json({
      success: true,
      message: 'Sign in successful!',
      user: withSessionToken(userPayload, req, 'password')
    });
  } catch (err) {
    console.error('Sign In Error:', err);
    return res.status(500).json({ error: err.message || 'An error occurred during sign in.' });
  }
});

// User Forgot Password Route
apiRouter.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  try {
    const { security } = await getSettings();
    const ipLimit = await hitLimit(`password-reset:ip:${clientIp(req)}`, security.passwordResetPerIpHour, HOUR_MS);
    if (!ipLimit.ok) {
      return rateLimited(req, res, { limit: 'passwordResetPerIpHour', retryAfter: ipLimit.retryAfter, error: 'Too many password reset requests. Please try again later.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      // Industry-standard secure response to prevent user enumeration attacks
      return res.json({
        success: true,
        message: 'A secure password reset link has been dispatched to your email address.'
      });
    }

    // 1. Generate cryptographically secure recovery token. Only its hash is stored, and the link
    // always points at our own site rather than the request's Origin header.
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetLink = `${frontendUrl()}/?resetToken=${resetToken}&email=${encodeURIComponent(user.email)}`;

    // Save reset token in DB with 1 hour expiration
    await saveUserResetToken(user.email, hashToken(resetToken), Date.now() + 3600000);

    // 2. Email the link
    try {
      await sendEmail({ to: user.email, ...passwordResetEmail({ name: user.name, link: resetLink }) });
    } catch (err) {
      console.error('Password reset email failed:', err.message);
      return res.status(500).json({ error: 'Failed to send secure reset email. Please contact support.' });
    }

    return res.json({
      success: true,
      message: 'A secure password reset link has been dispatched to your email address.'
    });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    return res.status(500).json({ error: err.message || 'An error occurred while requesting password reset.' });
  }
});

// User Password Reset via Token Route
apiRouter.post('/api/auth/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body || {};

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, token, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const user = await findUserByResetToken(hashToken(token));
    if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
    }

    // Hash the new password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Save the new password and clear the reset token fields
    await updateUserPassword(user.id || user._id, hashedPassword);
    // Clear the reset token by setting it to empty string and expiry to a past date
    await saveUserResetToken(user.email, '', Date.now() - 1);

    // Save password-reset audit log to backend database
    await saveLoginLog({ email: user.email, name: user.name, provider: 'password-reset' });

    // The link reached this inbox, so the address is proven; and anyone signed in with the old password is signed out
    if (!user.emailVerified) {
      await markEmailVerified(user);
      logAuthEvent(req, 'EMAIL_VERIFIED', { userId: user.id || user._id, email: user.email, metadata: { via: 'password_reset' } });
    }
    if (await dbReady(0)) await revokeAllSessions(user.id || user._id, 'password-reset').catch(() => {});

    return res.json({
      success: true,
      message: 'Password reset successful! You can now sign in with your new password.'
    });
  } catch (err) {
    console.error('Reset Password API Error:', err);
    return res.status(500).json({ error: err.message || 'An error occurred while resetting password.' });
  }
});

// A social login whose provider has confirmed the address proves ownership of it, so an account
// that signed up with a password and never clicked the link becomes verified too. Returns the flag.
async function verifyByProvider(req, user, providerVerified, provider) {
  if (user.emailVerified) return true;
  if (!providerVerified) return false;
  // Clears a password someone else may have set on this address before handing the account over
  const { passwordCleared } = await verifyThroughProvider(user);
  logAuthEvent(req, 'EMAIL_VERIFIED', { userId: user.id || user._id, email: user.email, metadata: { via: provider, passwordCleared } });
  return true;
}

// Google Auth Verification Route
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

apiRouter.post('/api/auth/google', async (req, res) => {
  const { token } = req.body || {};

  if (!token) {
    return res.status(400).json({ error: 'OAuth ID token is required.' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: 'Invalid Google token payload.' });
    }
    
    const { email, name, picture } = payload;
    // Google says whether it has confirmed the address; only then does it count as verified here
    const googleVerified = payload.email_verified === true;

    let user = await findUserByEmail(email);
    // Google hasn't confirmed this address belongs to whoever signed in, so it can't open an existing account
    if (user && !googleVerified) {
      logAuthEvent(req, 'LOGIN_FAILED', { userId: user.id || user._id, email: user.email, metadata: { reason: 'provider_email_unverified', provider: 'google' } });
      return res.status(403).json({ error: 'Google has not confirmed this email address yet. Confirm it with Google, or sign in another way.' });
    }
    if (!user && !(await signupsEnabled())) {
      return res.status(503).json({ error: 'New sign-ups are paused right now. Please try again later.' });
    }
    if (!user) {
      // Auto-create Google user with dynamic unique mock password hash
      const salt = await bcrypt.genSalt(10);
      const mockPasswordHash = await bcrypt.hash('oauth-google-' + Math.random().toString(36), salt);
      user = await createUser({
        email,
        name: name || email.split('@')[0],
        password: mockPasswordHash,
        isGoogleUser: true,
        emailVerified: googleVerified
      });
      logAuthEvent(req, 'USER_REGISTERED', { userId: user.id || user._id, email: user.email, metadata: { provider: 'google' } });

      // Send welcome email asynchronously for Google signup
      sendWelcomeEmail(user.email, user.name);
    }

    const blockError = getAccountBlockError(user);
    if (blockError) {
      logAuthEvent(req, 'LOGIN_FAILED', { userId: user.id || user._id, email: user.email, metadata: { reason: `account_${user.status}`, provider: 'google' } });
      return res.status(403).json(blockError);
    }

    const emailVerified = await verifyByProvider(req, user, googleVerified, 'google');
    await saveLoginLog({ email: user.email, name: user.name, provider: 'google' });
    logAuthEvent(req, 'LOGIN_SUCCESS', { userId: user.id || user._id, email: user.email, metadata: { provider: 'google' } });

    const isPaid = await isUserPaid(user);
    const userPayload = {
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      avatar: picture || '',
      isGoogleUser: user.isGoogleUser || false,
      emailVerified
    };
    if (isPaid) {
      userPayload.plan = 'pro';
      userPayload.isPro = true;
      userPayload.isPaid = true;
    }

    return res.json({
      success: true,
      message: 'Sign in with Google successful!',
      user: withSessionToken(userPayload, req, 'google')
    });
  } catch (err) {
    console.error('Google Sign In Error:', err);
    return res.status(400).json({ error: 'Google authentication failed. Please try again.' });
  }
});

// Lightweight session validity check — lets the SPA kick out banned/suspended
// (or deleted) users who still hold a localStorage session from before.
// Only answers about the account in the caller's own token (the ?email= the site still sends is ignored),
// so it can't be used to find out whether an address is registered, suspended or banned.
apiRouter.get('/api/auth/account-status', async (req, res) => {
  const payload = verifyToken((req.headers.authorization || '').replace(/^Bearer /, ''));
  if (!payload || payload.kind !== 'user') {
    return res.status(401).json({ status: 'signed-out', active: false, message: 'Your session has expired. Please sign in again.' });
  }
  try {
    const user = await findUserById(payload.sub);
    if (!user) {
      return res.json({ status: 'deleted', active: false, message: 'This account no longer exists.' });
    }
    const blockError = getAccountBlockError(user);
    if (blockError) {
      return res.json({ status: user.status, active: false, message: blockError.error });
    }
    // A session signed out from the admin panel or another device
    const session = await userSessionStatus(req);
    if (session && !session.ok) {
      return res.json({ status: 'signed-out', active: false, message: session.error });
    }
    return res.json({ status: 'active', active: true, emailVerified: !!user.emailVerified, isPro: await isUserPaid(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Status check failed.' });
  }
});

// ── Email verification ───────────────────────────────────────────────────────
const VERIFY_ATTEMPTS_PER_IP_HOUR = 30;

// The link from the verification email. Works without being signed in, e.g. on another device.
apiRouter.post('/api/auth/verify-email', async (req, res) => {
  try {
    const ipLimit = await hitLimit(`verify:ip:${clientIp(req)}`, VERIFY_ATTEMPTS_PER_IP_HOUR, HOUR_MS);
    if (!ipLimit.ok) {
      logAuthEvent(req, 'RATE_LIMIT_TRIGGERED', { metadata: { limit: 'verifyAttemptsPerIpHour' } });
      return res.status(429).json({ success: false, code: 'TOO_MANY', retryAfter: ipLimit.retryAfter, error: VERIFY_MESSAGES.TOO_MANY });
    }

    const result = await verifyEmailToken(req.body?.token);
    const who = result.user ? { userId: result.user.id || result.user._id, email: result.user.email } : {};
    if (result.ok) {
      logAuthEvent(req, 'EMAIL_VERIFIED', { ...who, metadata: { via: 'link' } });
      return res.json({ success: true, code: 'VERIFIED', email: result.user.email });
    }
    if (result.code === 'ALREADY_VERIFIED') {
      return res.json({ success: true, code: 'ALREADY_VERIFIED', email: result.user.email, message: VERIFY_MESSAGES.ALREADY_VERIFIED });
    }
    logAuthEvent(req, result.code === 'EXPIRED' ? 'VERIFICATION_EXPIRED' : 'VERIFICATION_FAILED', who);
    return res.status(400).json({ success: false, code: result.code, error: VERIFY_MESSAGES[result.code] });
  } catch (err) {
    console.error('Verify Email Error:', err);
    return res.status(500).json({ error: 'Email verification failed. Please try again.' });
  }
});

// A fresh link for the signed-in account; the previous link stops working
apiRouter.post('/api/auth/resend-verification', requireUser, async (req, res) => {
  try {
    const user = await findUserById(req.auth.sub);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.emailVerified) {
      return res.json({ success: true, code: 'ALREADY_VERIFIED', emailVerified: true, message: VERIFY_MESSAGES.ALREADY_VERIFIED });
    }
    const who = { userId: req.auth.sub, email: user.email };

    const cooldown = resendCooldown(user);
    if (cooldown > 0) {
      return res.status(429).json({ success: false, code: 'COOLDOWN', retryAfter: cooldown, error: `Resend available in ${cooldown} seconds.` });
    }
    const { security } = await getSettings();
    for (const [key, limit] of [[`resend:user:${req.auth.sub}`, 'resendPerAccountHour'], [`resend:ip:${clientIp(req)}`, 'resendPerIpHour']]) {
      const hit = await hitLimit(key, security[limit], HOUR_MS);
      if (!hit.ok) return rateLimited(req, res, { limit, retryAfter: hit.retryAfter, ...who, error: VERIFY_MESSAGES.RESEND_LIMIT });
    }

    const { sent } = await issueVerification(user);
    if (!sent) return res.status(503).json({ success: false, code: 'SEND_FAILED', retryAfter: 60, error: VERIFY_MESSAGES.SEND_FAILED });
    logAuthEvent(req, 'VERIFICATION_EMAIL_RESENT', who);
    return res.json({ success: true, retryAfter: 60, message: `We've sent a new verification link to ${user.email}.` });
  } catch (err) {
    console.error('Resend Verification Error:', err);
    return res.status(500).json({ error: VERIFY_MESSAGES.SEND_FAILED });
  }
});

// Fixes a mistyped address before it's verified, then sends the link there
apiRouter.post('/api/auth/change-email', requireUser, async (req, res) => {
  const newEmail = String(req.body?.email || '').trim().toLowerCase();
  if (newEmail.length > 254 || !EMAIL_RE.test(newEmail)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  try {
    const user = await findUserById(req.auth.sub);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.emailVerified) return res.status(400).json({ error: 'Your email address is already verified. Change it from your account settings.' });
    if (newEmail === user.email) return res.status(400).json({ error: 'That is already your email address.' });
    const owner = await findUserByEmail(newEmail);
    if (owner) return res.status(409).json({ error: 'That email is already used by another account.' });

    const { security } = await getSettings();
    const hit = await hitLimit(`resend:user:${req.auth.sub}`, security.resendPerAccountHour, HOUR_MS);
    if (!hit.ok) return rateLimited(req, res, { limit: 'resendPerAccountHour', retryAfter: hit.retryAfter, userId: req.auth.sub, email: user.email, error: VERIFY_MESSAGES.RESEND_LIMIT });

    // A changed address may be disposable even if the first one wasn't
    const risk = assessSignupRisk(newEmail);
    const riskFlags = [...new Set([...(user.riskFlags || []), ...risk.flags])];
    const updated = await updateUserFields(req.auth.sub, {
      email: newEmail,
      riskFlags,
      riskScore: Math.max(Number(user.riskScore || 0), risk.score)
    });
    logAuthEvent(req, 'VERIFICATION_EMAIL_RESENT', { userId: req.auth.sub, email: newEmail, metadata: { changedFrom: user.email } });
    const { sent } = await issueVerification(updated);

    const userPayload = {
      id: updated.id || updated._id,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar || '',
      isGoogleUser: updated.isGoogleUser || false,
      emailVerified: false
    };
    if (await isUserPaid(updated)) {
      userPayload.plan = 'pro';
      userPayload.isPro = true;
      userPayload.isPaid = true;
    }
    return res.json({
      success: true,
      verificationEmailSent: sent,
      retryAfter: 60,
      // Fresh token so its email matches the new address
      user: withSessionToken(userPayload, req, '', req.auth.jti)
    });
  } catch (err) {
    console.error('Change Email Error:', err);
    return res.status(500).json({ error: err.message || 'Could not change your email address.' });
  }
});

// ── GitHub & LinkedIn OAuth (server-side code exchange) ──────────────────────
const ALLOWED_OAUTH_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://www.cvmind.in',
  'https://cvmind.in',
  'https://www.cvmind.online',
  'https://cvmind.online'
];

function isAllowedOAuthOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  if (ALLOWED_OAUTH_ORIGINS.includes(origin)) return true;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host === 'cvmind.in' || host.endsWith('.cvmind.in')) return true;
    if (host === 'cvmind.online' || host.endsWith('.cvmind.online')) return true;
    return false;
  } catch {
    return false;
  }
}

// The OAuth state is signed rather than kept in memory, so the callback works on whichever server
// instance it reaches (serverless hosts run many). It carries the origin to return to and expires in 10 minutes.
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

// The site keeps a random nonce in the tab that starts the sign-in; it rides along in the state and the
// sign-in code only works together with it, so a code from someone else's sign-in can't be planted on a victim
const OAUTH_NONCE_RE = /^[A-Za-z0-9_-]{16,128}$/;
const readOAuthNonce = (req) => {
  const nonce = String(req.query.nonce || '');
  return OAUTH_NONCE_RE.test(nonce) ? nonce : null;
};

function createOAuthState(origin, nonce) {
  return signToken({ sub: origin, kind: 'oauth-state', ttlMs: OAUTH_STATE_TTL_MS, jti: nonce });
}

function consumeOAuthState(state) {
  const payload = verifyToken(String(state || ''));
  if (!payload || payload.kind !== 'oauth-state' || !OAUTH_NONCE_RE.test(payload.jti || '')) return null;
  return { origin: payload.sub, nonce: payload.jti };
}

// The finished sign-in goes back to the site as a single-use code, never as the session token itself
// (an address bar ends up in history, logs and referrers). The site exchanges the code with a POST.
const OAUTH_HANDOFF_TTL_MS = 2 * 60 * 1000;
const oauthHandoffMemory = new Map(); // without MongoDB: hash -> { user, expires }

async function createOAuthHandoff(user, nonce) {
  const code = crypto.randomBytes(32).toString('base64url');
  const id = hashToken(code);
  const nonceHash = hashToken(nonce);
  const expires = Date.now() + OAUTH_HANDOFF_TTL_MS;
  if (await dbReady(2000)) {
    await OAuthHandoff.create({ _id: id, user, nonceHash, expiresAt: new Date(expires) });
  } else {
    for (const [key, entry] of oauthHandoffMemory) if (Date.now() > entry.expires) oauthHandoffMemory.delete(key);
    oauthHandoffMemory.set(id, { user, nonceHash, expires });
  }
  return code;
}

// Used up on the first try, right or wrong, so a code can't be retried with guessed nonces
async function takeOAuthHandoff(code, nonce) {
  const clean = String(code || '');
  if (!clean || clean.length > 100) return null;
  const id = hashToken(clean);
  let entry = null;
  if (await dbReady(0)) {
    const row = await OAuthHandoff.findOneAndDelete({ _id: id }).lean();
    if (row) entry = { user: row.user, nonceHash: row.nonceHash, expires: new Date(row.expiresAt).getTime() };
  } else {
    entry = oauthHandoffMemory.get(id) || null;
    oauthHandoffMemory.delete(id);
  }
  if (!entry || Date.now() > entry.expires) return null;
  if (!OAUTH_NONCE_RE.test(String(nonce || '')) || hashToken(nonce) !== entry.nonceHash) return null;
  return entry.user;
}

function resolveOAuthOrigin(req) {
  const requested = String(req.query.origin || '');
  if (isAllowedOAuthOrigin(requested)) return requested;
  return process.env.FRONTEND_URL || 'https://www.cvmind.in';
}

function getBackendBaseUrl(req) {
  return process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
}

function redirectWithAuthError(res, origin, message) {
  return res.redirect(`${origin}/?authError=${encodeURIComponent(message)}`);
}

// Shared: find/create the user, enforce moderation status, log the login,
// then hand the session payload back to the SPA via a query param.
async function completeOAuthLogin(req, res, origin, { email, name, avatar, provider, emailVerified: providerVerified = false, nonce }) {
  if (!email) {
    return redirectWithAuthError(res, origin, `Your ${provider} account has no verified email address.`);
  }

  let user = await findUserByEmail(email);
  // The provider hasn't confirmed this address belongs to whoever signed in, so it can't open an existing account
  if (user && !providerVerified) {
    logAuthEvent(req, 'LOGIN_FAILED', { userId: user.id || user._id, email: user.email, metadata: { reason: 'provider_email_unverified', provider } });
    return redirectWithAuthError(res, origin, `Your ${provider} account has not confirmed this email address. Confirm it there, or sign in another way.`);
  }
  if (!user && !(await signupsEnabled())) {
    return redirectWithAuthError(res, origin, 'New sign-ups are paused right now. Please try again later.');
  }
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const mockPasswordHash = await bcrypt.hash(`oauth-${provider}-` + Math.random().toString(36), salt);
    user = await createUser({
      email,
      name: name || email.split('@')[0],
      password: mockPasswordHash,
      isGoogleUser: true, // OAuth account — no usable password
      provider,
      emailVerified: providerVerified
    });
    logAuthEvent(req, 'USER_REGISTERED', { userId: user.id || user._id, email: user.email, metadata: { provider } });
    sendWelcomeEmail(user.email, user.name);
  }

  const blockError = getAccountBlockError(user);
  if (blockError) {
    logAuthEvent(req, 'LOGIN_FAILED', { userId: user.id || user._id, email: user.email, metadata: { reason: `account_${user.status}`, provider } });
    return redirectWithAuthError(res, origin, blockError.error);
  }

  const emailVerified = await verifyByProvider(req, user, providerVerified, provider);
  await saveLoginLog({ email: user.email, name: user.name, provider });
  logAuthEvent(req, 'LOGIN_SUCCESS', { userId: user.id || user._id, email: user.email, metadata: { provider } });

  const isPaid = await isUserPaid(user);
  const userPayload = {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    avatar: avatar || '',
    isGoogleUser: user.isGoogleUser || false,
    emailVerified
  };
  if (isPaid) {
    userPayload.plan = 'pro';
    userPayload.isPro = true;
    userPayload.isPaid = true;
  }

  const code = await createOAuthHandoff(withSessionToken(userPayload, req, provider), nonce);
  return res.redirect(`${origin}/?oauthCode=${encodeURIComponent(code)}`);
}

// Step 3 (GitHub & LinkedIn): the site swaps the single-use code from the redirect for the signed-in user
apiRouter.post('/api/auth/oauth/exchange', async (req, res) => {
  try {
    const ipLimit = await hitLimit(`oauth-exchange:ip:${clientIp(req)}`, 30, HOUR_MS);
    if (!ipLimit.ok) return rateLimited(req, res, { limit: 'oauthExchangePerIp', retryAfter: ipLimit.retryAfter, error: 'Too many sign-in attempts. Please try again later.' });
    const user = await takeOAuthHandoff(req.body?.code, req.body?.nonce);
    if (!user) return res.status(400).json({ error: 'This sign-in link has expired or was already used. Please sign in again.' });
    return res.json({ success: true, user });
  } catch (err) {
    console.error('OAuth exchange error:', err);
    return res.status(500).json({ error: 'Sign-in failed. Please try again.' });
  }
});

// Step 1 (GitHub): send the user to GitHub's consent screen
apiRouter.get('/api/auth/github', (req, res) => {
  const origin = resolveOAuthOrigin(req);
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return redirectWithAuthError(res, origin, 'GitHub login is not configured yet.');
  }
  const nonce = readOAuthNonce(req);
  if (!nonce) return redirectWithAuthError(res, origin, 'Please reload the page and try signing in with GitHub again.');
  const state = createOAuthState(origin, nonce);
  const redirectUri = `${getBackendBaseUrl(req)}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('read:user user:email')}&state=${state}`;
  return res.redirect(url);
});

// Step 2 (GitHub): exchange the code, fetch the profile, sign the user in
apiRouter.get('/api/auth/github/callback', async (req, res) => {
  const stateEntry = consumeOAuthState(req.query.state);
  const origin = (stateEntry && isAllowedOAuthOrigin(stateEntry.origin))
    ? stateEntry.origin
    : (process.env.FRONTEND_URL || 'https://www.cvmind.in');
  if (!stateEntry) return redirectWithAuthError(res, origin, 'GitHub sign-in session expired. Please try again.');
  if (!req.query.code) return redirectWithAuthError(res, origin, 'GitHub sign-in was cancelled.');

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: req.query.code
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(tokenData.error_description || 'Token exchange failed');

    const ghHeaders = { 'Authorization': `Bearer ${tokenData.access_token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'CVMind' };
    const profileRes = await fetch('https://api.github.com/user', { headers: ghHeaders });
    const profile = await profileRes.json();

    // The public profile email may be unverified; GitHub's email list says which ones it has confirmed
    let email = '';
    const emailsRes = await fetch('https://api.github.com/user/emails', { headers: ghHeaders });
    const emails = await emailsRes.json();
    if (Array.isArray(emails)) {
      const primary = emails.find(e => e.primary && e.verified) || emails.find(e => e.verified);
      email = primary?.email || '';
    }

    return await completeOAuthLogin(req, res, origin, {
      email,
      name: profile.name || profile.login,
      avatar: profile.avatar_url || '',
      provider: 'github',
      emailVerified: !!email,
      nonce: stateEntry.nonce
    });
  } catch (err) {
    console.error('GitHub OAuth Error:', err);
    return redirectWithAuthError(res, origin, 'GitHub authentication failed. Please try again.');
  }
});

// Step 1 (LinkedIn): send the user to LinkedIn's consent screen (OpenID Connect)
apiRouter.get('/api/auth/linkedin', (req, res) => {
  const origin = resolveOAuthOrigin(req);
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId || !process.env.LINKEDIN_CLIENT_SECRET) {
    return redirectWithAuthError(res, origin, 'LinkedIn login is not configured yet.');
  }
  const nonce = readOAuthNonce(req);
  if (!nonce) return redirectWithAuthError(res, origin, 'Please reload the page and try signing in with LinkedIn again.');
  const state = createOAuthState(origin, nonce);
  const redirectUri = `${getBackendBaseUrl(req)}/api/auth/linkedin/callback`;
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('openid profile email')}&state=${state}`;
  return res.redirect(url);
});

// Step 2 (LinkedIn): exchange the code, fetch userinfo, sign the user in
apiRouter.get('/api/auth/linkedin/callback', async (req, res) => {
  const stateEntry = consumeOAuthState(req.query.state);
  const origin = (stateEntry && isAllowedOAuthOrigin(stateEntry.origin))
    ? stateEntry.origin
    : (process.env.FRONTEND_URL || 'https://www.cvmind.in');
  if (!stateEntry) return redirectWithAuthError(res, origin, 'LinkedIn sign-in session expired. Please try again.');
  if (!req.query.code) return redirectWithAuthError(res, origin, 'LinkedIn sign-in was cancelled.');

  try {
    const redirectUri = `${getBackendBaseUrl(req)}/api/auth/linkedin/callback`;
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(req.query.code),
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: redirectUri
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(tokenData.error_description || 'Token exchange failed');

    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();

    return await completeOAuthLogin(req, res, origin, {
      email: profile.email || '',
      name: profile.name || '',
      avatar: profile.picture || '',
      provider: 'linkedin',
      emailVerified: profile.email_verified === true,
      nonce: stateEntry.nonce
    });
  } catch (err) {
    console.error('LinkedIn OAuth Error:', err);
    return redirectWithAuthError(res, origin, 'LinkedIn authentication failed. Please try again.');
  }
});

apiRouter.get('/api/auto-apply/check-access', async (req, res) => {
  const email = req.query.email || '';
  if (!email) return res.json({ hasAccess: false });
  // A failed lookup is not a "no": the page offers a retry instead of showing Coming Soon to an allowed user
  try { res.json({ hasAccess: await hasAutoApplyAccess(email) }); } catch { res.status(503).json({ hasAccess: false, error: 'Could not check access right now.' }); }
});

// Support messages come from signed-in, verified accounts only (verifiedGate checks the email).
// The name and email are the account's, never what the form sends.
apiRouter.post('/api/contact', requireUser, async (req, res) => {
  const { subject } = req.body || {};
  const message = String(req.body?.message || '').trim().slice(0, 5000);

  if (!message) {
    return res.status(400).json({ error: 'Please write a message.' });
  }

  try {
    const user = await findUserById(req.auth.sub);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const name = user.name;
    const email = user.email;
    const who = { userId: req.auth.sub, email };

    if (isHighRisk(user)) {
      logAuthEvent(req, 'RATE_LIMIT_TRIGGERED', { ...who, metadata: { limit: 'supportRiskHold', riskFlags: user.riskFlags || [] } });
      return res.status(403).json({ code: 'SUPPORT_RESTRICTED', error: 'Support messages from this account are paused while our team reviews it.' });
    }
    const { security } = await getSettings();
    for (const [key, limit] of [[`tickets:user:${req.auth.sub}`, 'ticketsPerAccountDay'], [`tickets:ip:${clientIp(req)}`, 'ticketsPerIpDay']]) {
      const hit = await hitLimit(key, security[limit], DAY_MS);
      if (!hit.ok) return rateLimited(req, res, { limit, retryAfter: hit.retryAfter, ...who, error: "You've sent several messages today. Our team will reply to those first. Please try again tomorrow." });
    }

    const contact = await saveContactMessage({
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject || '').trim().slice(0, 200),
      message
    });
    // Every contact message is also a support ticket in the admin panel (MongoDB only)
    if (contact?.id && mongoose.connection.readyState === 1) {
      await ticketFromContact({
        _id: contact.id,
        name: String(name).trim(),
        email: String(email).trim(),
        subject: String(subject || '').trim().slice(0, 200) || 'General inquiry',
        message,
        createdAt: contact.createdAt
      }).catch((err) => console.error('[tickets] could not create ticket:', err.message));
    }
    logAuthEvent(req, 'SUPPORT_TICKET_CREATED', { ...who, metadata: { contactId: String(contact?.id || contact?._id || '') } });

    return res.json({
      success: true,
      data: {
        id: contact?.id || contact?._id || null,
        createdAt: contact?.createdAt || new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Contact Save Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to save contact message.' });
  }
});

apiRouter.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;
    const reply = await chatWithCVMind(message, history, customApiKey);

    return res.json({
      success: true,
      data: {
        reply
      }
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(400).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// Shared helper: extract text from an uploaded file or a URL
async function extractResumeText(file, resumeUrl) {
  let buffer, mimetype;
  if (file) {
    buffer = file.buffer;
    mimetype = file.mimetype;
  } else if (resumeUrl) {
    ({ buffer, mimetype } = await fetchResumeFromUrl(resumeUrl));
  } else {
    throw Object.assign(new Error('No resume file uploaded and no link provided. Please upload a PDF, DOCX, or TXT file, or paste a shareable link.'), { status: 400 });
  }

  if (mimetype === 'application/pdf') return await parsePdf(buffer);
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return await parseDocx(buffer);
  if (mimetype === 'text/plain') return parseTxt(buffer);
  throw Object.assign(new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.'), { status: 400 });
}

// Resume Analysis Endpoint
// Signed-in users' Resume Checker uploads become their default auto-apply resume, so the agent is ready
// without a second upload. Best-effort: the analysis response never fails because of it.
async function importCheckerResumeForAgent(req, file) {
  const header = req.headers.authorization || '';
  const auth = header.startsWith('Bearer ') ? verifyToken(header.slice(7).trim()) : null;
  if (auth?.kind !== 'user' || !file || !RESUME_MIME_TYPES.includes(file.mimetype)) return null;
  if (!process.env.MONGODB_URI || mongoose.connection.readyState !== 1) return null;

  try {
    const { profile, deduped } = await importUploadedResume({
      userId: auth.sub,
      file,
      label: `Resume Checker – ${file.originalname}`,
      via: 'resume_checker',
      makeDefault: true
    });
    return { id: String(profile._id), status: profile.status, deduped };
  } catch (err) {
    console.error('[agent] could not import Resume Checker upload:', err.message);
    return null;
  }
}

apiRouter.post('/api/analyze', optionalUser, upload.single('resume'), async (req, res) => {
  try {
    const { file } = req;
    const resumeUrl = req.body?.resumeUrl || '';

    // Check if file was uploaded or URL provided
    if (!file && !resumeUrl) {
      return res.status(400).json({
        error: 'No resume file uploaded. Please upload a PDF, DOCX, or TXT file.'
      });
    }

    // Extract custom API key from custom header if present
    const customApiKey = req.headers['x-gemini-key'] || null;

    let extractedText = '';

    try {
      extractedText = await extractResumeText(file, resumeUrl);
    } catch (parseErr) {
      return res.status(parseErr.status || 400).json({ error: parseErr.message });
    }

    // Verify extracted text is not empty or too short
    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({
        error: 'Resume text extraction returned empty or insufficient text. Please verify the document has readable text.'
      });
    }

    // Analyze with Gemini
    const evaluation = await analyzeResumeWithGemini(extractedText, customApiKey);

    // Persist admin analytics after successful parsing.
    const userId = req.auth?.sub || '';
    const fileName = file ? file.originalname : 'Link Upload';
    let savedWork = null;
    if (evaluation && evaluation.score) {
      await saveScan({
        fileName,
        fileType: file ? file.mimetype : 'link',
        fileSize: file ? file.size : 0,
        evaluation,
        userId
      });
      invalidatePublicStats();
      savedWork = await saveFeatureWork(userId, {
        title: `Resume Check - ${fileName}`,
        type: 'resume-check',
        templateId: 'resume-checker',
        payload: { fileName, resumeText: extractedText, evaluation }
      });
    }

    const agentResume = await importCheckerResumeForAgent(req, file);

    // Return the detailed analysis + original text (needed for AI optimizer)
    return res.json({
      success: true,
      data: evaluation,
      resumeText: extractedText,
      agentResume,
      work: savedWork
    });

  } catch (error) {
    console.error('API Error during analysis:', error);
    
    // Handle Multer limits or file type errors specifically
    if (error.message && (error.message.includes('Limit') || error.message.includes('file type'))) {
      return res.status(400).json({ error: error.message });
    }

    // Handle generic errors
    return res.status(500).json({ 
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// AI Resume Optimizer Endpoint
apiRouter.post('/api/optimize', optionalUser, async (req, res) => {
  try {
    const { resumeText, analysisResult } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 50) {
      return res.status(400).json({ error: 'Resume text is required and must be at least 50 characters.' });
    }

    if (!analysisResult || typeof analysisResult !== 'object') {
      return res.status(400).json({ error: 'Analysis result is required.' });
    }

    const optimizedResume = await optimizeResumeWithGemini(resumeText, analysisResult, customApiKey);

    // Record the optimization fix safely in admin diagnostics
    const userId = req.auth?.sub || '';
    const fileName = req.body.fileName || analysisResult.fileName || 'Unknown Resume';
    const priorScore = Number(analysisResult.score || 0);
    await saveFix({ fileName, priorScore, userId });
    const savedWork = await saveFeatureWork(userId, {
      title: `Optimized Resume - ${fileName}`,
      type: 'resume-optimized',
      templateId: 'resume-optimizer',
      payload: { fileName, priorScore, optimizedResume }
    });

    return res.json({
      success: true,
      data: { optimizedResume },
      work: savedWork
    });
  } catch (error) {
    console.error('Optimize API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// AI Resume Tailoring Endpoint
apiRouter.post('/api/tailor', optionalUser, upload.single('resume'), requireFreeUse('tailor'), async (req, res) => {
  try {
    const { file } = req;
    const { jobDescription, resumeUrl, templateHtml, templateId, resumeText } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;
    // Re-runs (new JD or a reopened saved tailor) send the text read on the first run instead of the file.
    const priorText = typeof resumeText === 'string' && resumeText.trim().length >= 50 ? resumeText.slice(0, 20000) : '';

    if (!file && !resumeUrl && !priorText) {
      return res.status(400).json({ error: 'No resume file uploaded. Please upload a PDF, DOCX, or TXT file.' });
    }

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 15) {
      return res.status(400).json({ error: 'Job Description is required and must be at least 15 characters.' });
    }

    let extractedText = priorText;
    if (!extractedText) {
      try {
        extractedText = await extractResumeText(file, resumeUrl);
      } catch (parseErr) {
        return res.status(parseErr.status || 400).json({ error: parseErr.message });
      }
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({ error: 'Unable to extract text from the uploaded resume.' });
    }

    const result = await tailorResumeWithGemini(extractedText, jobDescription, customApiKey);
    const data = result.tailoredData || {};
    if (!data.personalInfo?.fullName && !data.workExperiences?.length && !data.summary) {
      return res.status(502).json({ error: 'The AI returned an incomplete resume. Please try again.' });
    }

    // Fill the chosen CVMind template (sent without its locked footer; the client re-attaches it).
    let generatedHtml = '';
    if (typeof templateHtml === 'string' && templateHtml.trim()) {
      const formData = {
        personalInfo: data.personalInfo || {},
        jobTitle: data.personalInfo?.jobTitle || '',
        summary: data.summary || '',
        education: data.educations || [],
        workExperiences: data.workExperiences || [],
        skills: data.skills || [],
        courses: data.courses || [],
        languages: data.languages || [],
        achievements: data.achievements || [],
        timeBreakdown: []
      };
      generatedHtml = String(await generateResumeWithGemini({ templateHtml, formData, customApiKey, keepFacts: true }))
        .replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    const tailorTemplateId = typeof templateId === 'string' ? templateId.slice(0, 60) : '';

    // Record the tailoring event in MongoDB / Local DB
    const userId = req.auth?.sub || '';
    const tailorFileName = file ? file.originalname : resumeUrl ? 'Link Upload' : 'Saved Resume';
    await saveTailorLog({
      fileName: tailorFileName,
      fileSize: file ? file.size : 0,
      score: result.matchScore,
      jobDescription: jobDescription,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkillsRecommended,
      userId
    });
    const savedWork = await saveFeatureWork(userId, {
      title: `Tailored Resume - ${tailorFileName}`,
      type: 'resume-tailor',
      templateId: 'resume-tailorer',
      payload: { fileName: tailorFileName, jobDescription, resumeText: extractedText, result, generatedHtml, templateId: tailorTemplateId }
    });

    return res.json({
      success: true,
      data: { ...result, generatedHtml, templateId: tailorTemplateId, resumeText: extractedText },
      work: savedWork
    });
  } catch (error) {
    console.error('Tailor API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// AI Interview Prep Endpoint
apiRouter.post('/api/prep', optionalUser, upload.single('resume'), async (req, res) => {
  try {
    const { file } = req;
    const { resumeText, resumeUrl } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    let textToAnalyze = '';
    let fileName = 'Direct Input';
    let fileSize = 0;

    if (file || resumeUrl) {
      if (file) { fileName = file.originalname; fileSize = file.size; }
      else { fileName = 'Link Upload'; }
      try {
        textToAnalyze = await extractResumeText(file, resumeUrl);
      } catch (parseErr) {
        return res.status(parseErr.status || 400).json({ error: parseErr.message });
      }
    } else if (resumeText && typeof resumeText === 'string' && resumeText.trim().length >= 50) {
      textToAnalyze = resumeText;
      fileName = req.body.fileName || 'Cached Resume';
      fileSize = Number(req.body.fileSize || resumeText.length);
    } else {
      return res.status(400).json({ error: 'No resume file uploaded or text provided. Please upload a PDF, DOCX, or TXT file, or provide your parsed resume text.' });
    }

    if (!textToAnalyze || textToAnalyze.trim().length < 50) {
      return res.status(400).json({ error: 'Unable to extract text from the resume. Please check if the file contains readable text.' });
    }

    const result = await generatePrepQuestionsWithGemini(textToAnalyze, customApiKey);

    // Save logs to MongoDB / Local DB
    if (result && result.questions) {
      await savePrepLog({
        fileName: fileName,
        fileSize: fileSize,
        questionsCount: result.questions.length,
        userId: req.auth?.sub || ''
      });
    }

    return res.json({
      success: true,
      data: result,
      resumeText: textToAnalyze
    });
  } catch (error) {
    console.error('Prep API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// AI Prep Evaluate Answer Endpoint
apiRouter.post('/api/prep/evaluate', async (req, res) => {
  try {
    const { question, userAnswer, resumeText } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!question || !userAnswer) {
      return res.status(400).json({ error: 'Question and User Answer are required.' });
    }

    const result = await evaluatePrepAnswerWithGemini({
      question,
      userAnswer,
      resumeText,
      customApiKey
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Prep Evaluate API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});


// AI Cover Letter Refine Endpoint
apiRouter.post('/api/cover-letter/refine', async (req, res) => {
  try {
    const { coverLetterText, jobTitle, companyName, instructions } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!coverLetterText || typeof coverLetterText !== 'string' || coverLetterText.trim().length < 5) {
      return res.status(400).json({ error: 'Document content is required and must be valid.' });
    }

    const refinedLetter = await refineCoverLetterWithGemini(
      coverLetterText,
      jobTitle || 'Professional',
      companyName || 'Target Company',
      customApiKey,
      instructions
    );

    return res.json({
      success: true,
      data: { refinedLetter }
    });
  } catch (error) {
    console.error('Cover Letter Refine API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// AI Resume Generation Endpoint
apiRouter.post('/api/resume/generate', async (req, res) => {
  try {
    const { templateHtml, formData, keepFacts } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!templateHtml || typeof templateHtml !== 'string') {
      return res.status(400).json({ error: 'Template HTML is required.' });
    }
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({ error: 'Form data is required.' });
    }

    const generatedHtml = await generateResumeWithGemini({
      templateHtml,
      formData,
      customApiKey,
      keepFacts: keepFacts === true
    });

    return res.json({
      success: true,
      data: { generatedHtml }
    });
  } catch (error) {
    console.error('Resume Generation API Error:', error);
    return res.status(500).json({
      error: error.message || 'AI Resume generation failed. Please try again.'
    });
  }
});

// AI Resume Data Extraction Endpoint (Parses uploaded resume into wizard JSON structure)
apiRouter.post('/api/resume/parse-data', upload.single('resume'), async (req, res) => {
  try {
    const { file } = req;
    const resumeUrl = req.body?.resumeUrl || '';
    let resumeText = req.body?.resumeText || '';
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!resumeText && (file || resumeUrl)) {
      try {
        resumeText = await extractResumeText(file, resumeUrl);
      } catch (parseErr) {
        return res.status(parseErr.status || 400).json({ error: parseErr.message });
      }
    }

    if (!resumeText || resumeText.trim().length < 30) {
      return res.status(400).json({
        error: 'Unable to extract text from the resume. Please ensure the document has readable text.'
      });
    }

    const exact = req.body?.exact === true || req.body?.exact === 'true';
    const structuredData = await extractResumeDataWithAI(resumeText, customApiKey, exact);

    return res.json({
      success: true,
      data: structuredData,
      rawText: resumeText
    });
  } catch (error) {
    console.error('Resume Parse API Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to extract resume data. Please try again.'
    });
  }
});

// ── Live job search (resume builder step 1) ───────────────────────────────────
apiRouter.get('/api/jobs/search', async (req, res) => {
  const q = String(req.query.q || '').slice(0, 120);
  try {
    const result = await searchJobs(q);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({ success: true, ...result, companies: JOB_SEARCH_COMPANIES });
  } catch (err) {
    console.error('Job search error:', err);
    return res.status(502).json({ error: 'Job search is unavailable right now. Please try again shortly.' });
  }
});

apiRouter.get('/api/jobs/detail', async (req, res) => {
  const id = String(req.query.id || '');
  if (!/^(gh|lv):[\w-]+:[\w-]+$/.test(id)) return res.status(400).json({ error: 'Invalid job id.' });
  try {
    const data = await getJobDetail(id);
    if (!data) return res.status(404).json({ error: 'This job is no longer available.' });
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('Job detail error:', err);
    return res.status(502).json({ error: 'Could not load this job description.' });
  }
});

// ── Resume export: PDF download and "send PDF to my email" ─────────────────────
const EXPORT_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Rubik:wght@300;400;500;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;500;600&family=Open+Sans:wght@400;600;700;800&family=Raleway:wght@300;400;600&family=EB+Garamond:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800&display=swap';

const cleanFileName = (name) => (String(name || '').replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 80) || 'Resume');

function readExportBody(req, res) {
  const { html, fileName, paper } = req.body || {};
  if (!html || typeof html !== 'string' || html.trim().length < 20) {
    res.status(400).json({ error: 'There is no resume content to export.' });
    return null;
  }
  return { html, fileName: cleanFileName(fileName), format: paper === 'letter' ? 'Letter' : 'A4' };
}

async function buildResumePdf(body) {
  try {
    return await renderResumePdf(body.html, { format: body.format, fontsHref: EXPORT_FONTS_HREF });
  } catch (err) {
    if (err?.code === 'BROWSER_UNAVAILABLE') {
      // Keep Playwright's error as the cause so the server log shows the missing browser path
      const e = new Error('PDF export is not available on this server right now.', { cause: err.cause || err });
      e.status = 503;
      throw e;
    }
    throw err;
  }
}

apiRouter.post('/api/resume/pdf', requireUser, async (req, res) => {
  const body = readExportBody(req, res);
  if (!body) return;
  try {
    const pdf = await buildResumePdf(body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${body.fileName}.pdf"`);
    return res.send(Buffer.from(pdf));
  } catch (err) {
    console.error('Resume PDF export error:', err);
    return res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not create the PDF. Please try again.' });
  }
});

// Sends the PDF to the signed-in user's own address only (never an address from the request).
apiRouter.post('/api/resume/email-pdf', requireUser, async (req, res) => {
  const body = readExportBody(req, res);
  if (!body) return;
  if (!emailConfigured()) return res.status(503).json({ error: 'Email is not configured on this server.' });
  try {
    const user = await findUserById(req.auth.sub);
    if (!user?.email) return res.status(404).json({ error: 'We could not find the email address for your account.' });
    const pdf = await buildResumePdf(body);
    await sendEmail({
      to: user.email,
      ...resumePdfEmail({ name: user.name, fileName: body.fileName }),
      attachments: [{ filename: `${body.fileName}.pdf`, content: Buffer.from(pdf).toString('base64') }],
    });
    return res.json({ success: true, email: user.email });
  } catch (err) {
    console.error('Resume email export error:', err);
    return res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not send the email. Please try again.' });
  }
});

// Import resume data from a public LinkedIn profile URL.
// LinkedIn often serves an auth wall to server-side requests; in that case we say so
// and the client falls back to a "Save to PDF" upload via /api/resume/parse-data.
const decodeEntities = (t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function parseLinkedInProfileUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  // Strict host/path allow-list so this can't be used to fetch arbitrary URLs.
  if (!/^([a-z]{2,3}\.)?linkedin\.com$/i.test(u.hostname) && u.hostname.toLowerCase() !== 'www.linkedin.com') return null;
  if (!/^\/in\/[^/]+/i.test(u.pathname)) return null;
  return `https://www.linkedin.com${u.pathname.replace(/\/+$/, '')}/`;
}

function profileTextFromHtml(html) {
  const parts = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { parts.push(JSON.stringify(JSON.parse(m[1]))); } catch { /* ignore malformed block */ }
  }
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)="(?:og:title|og:description|description)"[^>]+content="([^"]*)"/gi)) {
    parts.push(decodeEntities(m[1]));
  }
  return parts.join('\n');
}

apiRouter.post('/api/resume/import-linkedin', async (req, res) => {
  const profileUrl = parseLinkedInProfileUrl(String(req.body?.url || '').trim());
  if (!profileUrl) {
    return res.status(400).json({ error: 'Please enter a valid LinkedIn profile link, like https://linkedin.com/in/your-name' });
  }
  const walled = { error: "LinkedIn didn't share this profile publicly. On LinkedIn open your profile → More → Save to PDF, then upload that PDF instead.", code: 'LINKEDIN_PRIVATE' };
  try {
    const page = await fetch(profileUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'Mozilla/5.0 (compatible; CVMindImport/1.0)' },
    });
    if (page.status !== 200) return res.status(422).json(walled);
    const profileText = profileTextFromHtml((await page.text()).slice(0, 500000));
    if (profileText.trim().length < 80) return res.status(422).json(walled);

    const data = await extractResumeDataWithAI(profileText, req.headers['x-gemini-key'] || null);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('LinkedIn import error:', error);
    return res.status(422).json(walled);
  }
});

// Career tools take the CV as a file ('resume'), a link (resumeUrl) or text (resumeText).
// The web app sends multipart form data; the mobile app and extension still send JSON.
async function careerResumeText(req) {
  const resumeUrl = String(req.body?.resumeUrl || '').trim();
  if (req.file || resumeUrl) {
    try {
      return (await extractResumeText(req.file || null, resumeUrl || null)).trim();
    } catch (err) {
      throw Object.assign(err, { status: err.status || 400 });
    }
  }
  return String(req.body?.resumeText || '').trim();
}

// Short free-text fields from the request body, trimmed and capped
const careerField = (req, name, max = 200) => String(req.body?.[name] || '').trim().slice(0, max);

// Sends a CV read error (bad file, unreadable link) as a 4xx, anything else as a 500
function careerError(res, error, label) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error(`${label} API Error:`, error);
  return res.status(500).json({ error: error.message || 'AI Generation failed. Please try again later.' });
}

// LinkedIn Profile Optimizer Endpoint
apiRouter.post('/api/linkedin/analyze', optionalUser, upload.single('linkedinPdf'), async (req, res) => {
  try {
    const { file } = req;
    const { email } = req.body || {};
    // Save to My Works only for the signed-in user (never a userId from the request body)
    const userId = req.auth?.sub;
    const customApiKey = req.headers['x-gemini-key'] || null;
    // Optional; sent by the web app
    const targetRole = careerField(req, 'targetRole', 120);

    if (!file) {
      return res.status(400).json({ error: 'No LinkedIn PDF file uploaded. Please upload a PDF file.' });
    }

    let extractedText = '';
    if (file.mimetype === 'application/pdf') {
      extractedText = await parsePdf(file.buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload a PDF exported from LinkedIn.' });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({ error: 'Unable to extract text from the uploaded PDF. Please make sure the PDF has readable text.' });
    }

    const evaluation = await analyzeLinkedInProfileWithGemini(extractedText, customApiKey, targetRole);

    // Save logs to MongoDB / Local JSON DB
    if (evaluation && evaluation.score !== undefined) {
      await saveLinkedinLog({ email: req.auth?.email || email || '', userId: userId || '', score: evaluation.score });
    }

    const savedWork = await saveFeatureWork(userId, {
      title: `LinkedIn Audit - ${targetRole || new Date().toLocaleDateString()}`,
      type: 'linkedin',
      templateId: 'linkedin-opt',
      payload: { profileText: extractedText, targetRole, fileName: file.originalname || '', evaluation }
    });

    return res.json({
      success: true,
      data: evaluation,
      work: savedWork
    });
  } catch (error) {
    console.error('LinkedIn Optimize API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// LinkedIn Profile Bio & Banner Generator Endpoint
apiRouter.post('/api/linkedin/bio', optionalUser, upload.single('resume'), async (req, res) => {
  try {
    const jobTitle = careerField(req, 'jobTitle', 120);
    const skills = careerField(req, 'skills', 600);
    const tone = careerField(req, 'tone', 40);
    // Save to My Works only for the signed-in user (never a userId from the request body)
    const userId = req.auth?.sub;
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!jobTitle) {
      return res.status(400).json({ error: 'Job Title is required.' });
    }

    const resumeText = await careerResumeText(req);
    const result = await generateLinkedinBioWithGemini({ skills, jobTitle, resumeText, tone, customApiKey });

    await saveLinkedinBioLog({ email: req.auth?.email || req.body?.email || '', userId: userId || '', jobTitle });

    const savedWork = await saveFeatureWork(userId, {
      title: `LinkedIn Bio - ${jobTitle}`,
      type: 'linkedin-bio',
      templateId: 'linkedin-bio-gen',
      payload: { skills, jobTitle, tone, resumeText, result }
    });

    return res.json({ success: true, data: result, work: savedWork });
  } catch (error) {
    return careerError(res, error, 'LinkedIn Bio Generator');
  }
});

// LinkedIn Outreach & DM Writer Endpoint
apiRouter.post('/api/linkedin/outreach', optionalUser, upload.single('resume'), async (req, res) => {
  try {
    const jobTitle = careerField(req, 'jobTitle', 120);
    const companyName = careerField(req, 'companyName', 120);
    const targetName = careerField(req, 'targetName', 80);
    const context = careerField(req, 'context', 1000);
    const tone = careerField(req, 'tone', 40);
    // Save to My Works only for the signed-in user (never a userId from the request body)
    const userId = req.auth?.sub;
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!jobTitle) {
      return res.status(400).json({ error: 'Job Title is required.' });
    }

    const resumeText = await careerResumeText(req);
    const result = await generateLinkedinOutreachWithGemini({ jobTitle, companyName, context, targetName, resumeText, tone, customApiKey });

    await saveLinkedinOutreachLog({ email: req.auth?.email || req.body?.email || '', userId: userId || '', jobTitle });

    const savedWork = await saveFeatureWork(userId, {
      title: `LinkedIn Outreach - ${jobTitle} (${companyName || 'General'})`,
      type: 'linkedin-outreach',
      templateId: 'linkedin-outreach-gen',
      payload: { jobTitle, companyName, context, targetName, tone, result }
    });

    return res.json({ success: true, data: result, work: savedWork });
  } catch (error) {
    return careerError(res, error, 'LinkedIn Outreach');
  }
});

// Skill Gap & Course Recommendation Endpoint
apiRouter.post('/api/career/courses', optionalUser, upload.single('resume'), async (req, res) => {
  try {
    const targetJob = careerField(req, 'targetJob', 120);
    const skills = careerField(req, 'skills', 600);
    const level = careerField(req, 'level', 40);
    // Save to My Works only for the signed-in user (never a userId from the request body)
    const userId = req.auth?.sub;
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!targetJob) {
      return res.status(400).json({ error: 'Target Job is required.' });
    }

    const resumeText = await careerResumeText(req);
    const result = await generateCareerCoursesWithGemini({ targetJob, skills, resumeText, level, customApiKey });

    await saveCareerCoursesLog({ email: req.auth?.email || req.body?.email || '', userId: userId || '', jobTitle: targetJob });

    const savedWork = await saveFeatureWork(userId, {
      title: `Skill Gaps - ${targetJob}`,
      type: 'career-courses',
      templateId: 'career-courses-gen',
      payload: { targetJob, skills, level, resumeText, result }
    });

    return res.json({ success: true, data: result, work: savedWork });
  } catch (error) {
    return careerError(res, error, 'Career Courses');
  }
});

// Cover Letter Generator step 1: reads the uploaded resume's text (no AI), so the page can show real upload progress
apiRouter.post('/api/cover-letter/read-resume', optionalUser, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a PDF or DOCX resume to upload.' });
    const resumeText = await careerResumeText(req);
    if (resumeText.length < 50) {
      return res.status(400).json({ error: 'We could not read text from this file. Try a PDF or DOCX with selectable text.' });
    }
    return res.json({ success: true, data: { resumeText: resumeText.slice(0, 20000), fileName: req.file.originalname } });
  } catch (error) {
    return careerError(res, error, 'Cover Letter Read Resume');
  }
});

// Cover Letter Generator: resume + job description -> structured letter (the page lays it out)
apiRouter.post('/api/cover-letter/generate', optionalUser, upload.single('resume'), requireFreeUse('cover-letter'), async (req, res) => {
  try {
    const jobDescription = careerField(req, 'jobDescription', 10000);
    const tone = careerField(req, 'tone', 30) || 'professional';
    const length = careerField(req, 'length', 30) || 'standard';
    const company = careerField(req, 'company', 120);
    const hiringManager = careerField(req, 'hiringManager', 120);
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (jobDescription.length < 40) {
      return res.status(400).json({ error: 'Paste the job description (at least a few lines) so the letter can match it.' });
    }

    const resumeText = await careerResumeText(req);
    if (resumeText.length < 50) {
      return res.status(400).json({ error: 'We could not read enough text from your resume. Try a PDF or DOCX with selectable text.' });
    }

    const result = await generateCoverLetterWithAI({ resumeText, jobDescription, tone, length, company, hiringManager, customApiKey });
    return res.json({ success: true, data: result });
  } catch (error) {
    return careerError(res, error, 'Cover Letter Generate');
  }
});

// Elevator Pitch Builder Endpoint
apiRouter.post('/api/career/pitch', optionalUser, upload.single('resume'), async (req, res) => {
  try {
    const jobTitle = careerField(req, 'jobTitle', 120);
    const details = careerField(req, 'details', 1500);
    const setting = careerField(req, 'setting', 60);
    // Save to My Works only for the signed-in user (never a userId from the request body)
    const userId = req.auth?.sub;
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!jobTitle) {
      return res.status(400).json({ error: 'Job Title is required.' });
    }

    const resumeText = await careerResumeText(req);
    const result = await generateElevatorPitchWithGemini({ jobTitle, details, resumeText, setting, customApiKey });

    await saveElevatorPitchLog({ email: req.auth?.email || req.body?.email || '', userId: userId || '', jobTitle });

    const savedWork = await saveFeatureWork(userId, {
      title: `Elevator Pitch - ${jobTitle}`,
      type: 'elevator-pitch',
      templateId: 'elevator-pitch-gen',
      payload: { jobTitle, details, setting, resumeText, result }
    });

    return res.json({ success: true, data: result, work: savedWork });
  } catch (error) {
    return careerError(res, error, 'Elevator Pitch');
  }
});

// Career Roadmap Endpoint
apiRouter.post('/api/career/roadmap', optionalUser, upload.single('resume'), async (req, res) => {
  try {
    const currentRole = careerField(req, 'currentRole', 120);
    const targetRole = careerField(req, 'targetRole', 120);
    const years = careerField(req, 'years', 40);
    const hoursPerWeek = careerField(req, 'hoursPerWeek', 40);
    // Save to My Works only for the signed-in user (never a userId from the request body)
    const userId = req.auth?.sub;
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!targetRole) {
      return res.status(400).json({ error: 'Target Role is required.' });
    }

    const resumeText = await careerResumeText(req);
    const result = await generateCareerRoadmapWithGemini({ currentRole, targetRole, years, resumeText, hoursPerWeek, customApiKey });

    await saveCareerRoadmapLog({ email: req.auth?.email || req.body?.email || '', userId: userId || '' });

    const savedWork = await saveFeatureWork(userId, {
      title: `Career Roadmap - ${targetRole}`,
      type: 'career-roadmap',
      templateId: 'career-roadmap-gen',
      payload: { currentRole, targetRole, years, hoursPerWeek, resumeText, result }
    });

    return res.json({ success: true, data: result, work: savedWork });
  } catch (error) {
    return careerError(res, error, 'Career Roadmap');
  }
});

// Public Shareable Resume Portfolio Endpoint
apiRouter.get('/api/portfolio/:workId', async (req, res) => {
  const { workId } = req.params;
  try {
    const work = await getWorkById(workId);
    // Hidden by a moderator: the public link stops working
    if (!work || work.hidden) {
      return res.status(404).json({ error: 'Portfolio resume not found.' });
    }
    return res.json({
      success: true,
      data: {
        title: work.title,
        type: work.type,
        templateId: work.templateId,
        htmlContent: work.htmlContent,
        updatedAt: work.updatedAt || work.createdAt
      }
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch portfolio.' });
  }
});



// ─── USER WORK & PROFILE ENDPOINTS ───────────────────────────────────────────
// LinkedIn Post Generator Endpoint
apiRouter.post('/api/linkedin/post', optionalUser, async (req, res) => {
  try {
    const { topic, jobTitle, tone, resumeText } = req.body || {};
    // Save to My Works only for the signed-in user (never a userId from the request body)
    const userId = req.auth?.sub;
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!topic || !jobTitle) {
      return res.status(400).json({ error: 'Topic and Job Title are required.' });
    }

    const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DeepSeek API key is not configured.');

    const prompt = `You are a LinkedIn content strategist. Generate 3 high-engagement LinkedIn posts for a ${jobTitle} professional.

Topic/Achievement: "${topic}"
Tone Preference: ${tone || 'Professional'}
${resumeText ? `Resume Context: ${resumeText.substring(0, 800)}` : ''}

Generate exactly 3 LinkedIn posts in this JSON format:
{
  "posts": [
    {
      "style": "Professional & Data-Driven",
      "content": "Full post text with line breaks, emojis, numbers. 150-250 words.",
      "hook": "Opening line that grabs attention",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    },
    {
      "style": "Storytelling & Personal",
      "content": "Full post text with narrative arc. 150-250 words.",
      "hook": "Opening line",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    },
    {
      "style": "Bold & Punchy Hook",
      "content": "Short, punchy post with strong CTA. 80-130 words.",
      "hook": "Opening line",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    }
  ],
  "bestTimeToPost": "Tuesday-Thursday, 8-10 AM or 5-6 PM",
  "engagementTip": "One quick tip to boost this post's engagement"
}

Return ONLY valid JSON.`;

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.5, max_tokens: 2000 })
    });
    if (!dsRes.ok) throw new Error(`DeepSeek error: ${dsRes.status}`);
    const dsJson = await dsRes.json();
    chargeAiUsage(dsJson.usage);
    let text = dsJson.choices[0].message.content.trim();
    if (text.startsWith('```')) text = text.replace(/```json\n?|```\n?/g, '').trim();
    const data = JSON.parse(text);

    let savedWork = null;
    if (userId) {
      savedWork = await safeSaveWork({
        userId,
        title: `LinkedIn Post - ${topic.substring(0, 40)}`,
        type: 'linkedin-post',
        templateId: 'linkedin-post-gen',
        htmlContent: JSON.stringify({ topic, jobTitle, tone, result: data })
      });
      const user = await findUserById(userId);
      if (user) {
        await saveLinkedinPostLog({ email: user.email, userId, topic });
      }
    }

    return res.json({ success: true, data, work: savedWork });
  } catch (error) {
    console.error('LinkedIn Post API Error:', error);
    return res.status(500).json({ error: error.message || 'AI generation failed.' });
  }
});

// ── Interview Prep AI / Voice Prep AI: Leo's mock interview ──
// The older /api/prep and /api/voice-prep routes stay for the mobile app and extension.
const INTERVIEW_LEVELS = ['Fresher', 'Mid-level', 'Senior', 'Lead / Manager'];
const INTERVIEW_ROUNDS = ['Mixed', 'HR', 'Behavioural', 'Technical'];
const pickFrom = (list, value, fallback) => (list.includes(value) ? value : fallback);
const cleanText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const strList = (value, maxItems, maxLen) => (Array.isArray(value) ? value.filter(v => typeof v === 'string').slice(0, maxItems).map(v => v.slice(0, maxLen)) : []);
const cleanMetrics = (m) => (m && typeof m === 'object' ? {
  seconds: Math.max(0, Math.round(Number(m.seconds) || 0)),
  words: Math.max(0, Math.round(Number(m.words) || 0)),
  wpm: Math.max(0, Math.round(Number(m.wpm) || 0)),
  fillerCount: Math.max(0, Math.round(Number(m.fillerCount) || 0)),
  fillers: strList(m.fillers, 10, 30),
} : null);

// Prepares the questions. The CV is optional: a file, a link, or text read earlier.
apiRouter.post('/api/interview/plan', optionalUser, upload.single('resume'), requireFreeUse(interviewFeature), async (req, res) => {
  try {
    const { file } = req;
    const body = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;
    const role = cleanText(body.role, 120);
    const jobDescription = cleanText(body.jobDescription, 12000);
    const mode = body.mode === 'voice' ? 'voice' : 'text';
    const count = Math.min(10, Math.max(3, parseInt(body.count, 10) || 5));
    if (!role) return res.status(400).json({ error: 'Please tell Leo which role you are interviewing for.' });

    let resumeText = cleanText(body.resumeText, 20000);
    let fileName = resumeText ? 'Saved resume' : '';
    if (file || body.resumeUrl) {
      try {
        resumeText = (await extractResumeText(file, body.resumeUrl)).slice(0, 20000);
        fileName = file ? file.originalname : 'Linked CV';
      } catch (parseErr) {
        return res.status(parseErr.status || 400).json({ error: parseErr.message });
      }
      if (resumeText.trim().length < 50) {
        return res.status(400).json({ error: 'I could not read any text in that CV. Please try a different file, or skip the CV.' });
      }
    }

    const data = await generateInterviewPlan({
      resumeText,
      role,
      jobDescription,
      level: pickFrom(INTERVIEW_LEVELS, body.level, 'Mid-level'),
      round: pickFrom(INTERVIEW_ROUNDS, body.round, 'Mixed'),
      count,
      mode,
      customApiKey,
    });
    data.questions = data.questions.map((q, i) => ({ ...q, id: `q${i + 1}` }));

    if (mode === 'text') {
      await savePrepLog({ fileName: fileName || 'No CV', fileSize: file?.size || resumeText.length, questionsCount: data.questions.length, userId: req.auth?.sub || '' });
    }
    return res.json({ success: true, data, resumeText, fileName });
  } catch (error) {
    console.error('Interview Plan API Error:', error);
    return res.status(500).json({ error: error.message || 'Could not prepare your interview. Please try again.' });
  }
});

// Scores one answer
apiRouter.post('/api/interview/evaluate', async (req, res) => {
  try {
    const body = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;
    const question = cleanText(body.question, 600);
    const answer = cleanText(body.answer, 6000);
    if (!question || !answer) return res.status(400).json({ error: 'Please answer the question first.' });
    const mode = body.mode === 'voice' ? 'voice' : 'text';

    const data = await evaluateInterviewAnswer({
      question,
      answer,
      keyPoints: strList(body.keyPoints, 5, 200),
      role: cleanText(body.role, 120),
      jobDescription: cleanText(body.jobDescription, 6000),
      resumeText: cleanText(body.resumeText, 8000),
      mode,
      metrics: mode === 'voice' ? cleanMetrics(body.metrics) : null,
      customApiKey,
    });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Interview Evaluate API Error:', error);
    return res.status(500).json({ error: error.message || 'Could not score your answer. Please try again.' });
  }
});

// Writes the debrief and saves the whole interview to My Documents
apiRouter.post('/api/interview/report', optionalUser, async (req, res) => {
  try {
    const body = req.body || {};
    const userId = req.auth?.sub;
    const customApiKey = req.headers['x-gemini-key'] || null;
    const mode = body.mode === 'voice' ? 'voice' : 'text';
    const settings = body.settings && typeof body.settings === 'object' ? body.settings : {};
    const role = cleanText(settings.role, 120);
    const questions = Array.isArray(body.questions) ? body.questions.slice(0, 10) : [];
    const turns = Array.isArray(body.turns) ? body.turns.slice(0, 10) : [];

    // One line per question, paired with its answer and score
    const rows = questions.map(q => {
      const turn = turns.find(t => t && t.questionId === q?.id) || {};
      const fb = turn.feedback && typeof turn.feedback === 'object' ? turn.feedback : null;
      return {
        question: cleanText(q?.question, 600),
        answer: cleanText(turn.answer, 3000),
        score: fb && Number.isFinite(Number(fb.score)) ? Math.max(0, Math.min(10, Number(fb.score))) : null,
        missing: fb ? strList(fb.missing, 3, 200) : [],
        metrics: mode === 'voice' ? cleanMetrics(turn.metrics) : null,
      };
    }).filter(r => r.question);

    const scored = rows.filter(r => r.score !== null);
    if (!scored.length) return res.status(400).json({ error: 'Answer at least one question to get your report.' });

    const ai = await generateInterviewReport({ role, level: cleanText(settings.level, 40), mode, turns: rows, customApiKey });
    const overallScore = Math.round((scored.reduce((sum, r) => sum + r.score, 0) / scored.length) * 10);
    const report = {
      overallScore,
      answered: scored.length,
      summary: cleanText(ai.summary, 1200),
      strengths: strList(ai.strengths, 5, 300),
      weakAreas: strList(ai.weakAreas, 5, 300),
      practiceNext: strList(ai.practiceNext, 5, 300),
    };

    const work = await saveFeatureWork(userId, {
      title: `${mode === 'voice' ? 'Voice Prep' : 'Interview Prep'} - ${role || 'Mock interview'}`,
      type: mode === 'voice' ? 'voice-prep' : 'prep',
      templateId: mode === 'voice' ? 'voice-practice' : 'interview-prep',
      payload: {
        version: 2,
        mode,
        settings,
        fileName: cleanText(body.fileName, 200),
        jobDescription: cleanText(body.jobDescription, 12000),
        resumeText: cleanText(body.resumeText, 20000),
        questions,
        turns,
        report,
      },
    });

    if (mode === 'voice' && userId) {
      const user = await findUserById(userId);
      if (user) await saveVoicePrepLog({ email: user.email, userId, jobTitle: role || 'General', score: overallScore / 10 });
    }

    return res.json({ success: true, data: report, work });
  } catch (error) {
    console.error('Interview Report API Error:', error);
    return res.status(500).json({ error: error.message || 'Could not write your report. Please try again.' });
  }
});

// Voice Prep — Generate Interview Question
apiRouter.post('/api/voice-prep/question', async (req, res) => {
  try {
    const { jobTitle, level, category, resumeText } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!jobTitle) return res.status(400).json({ error: 'Job Title is required.' });

    const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DeepSeek API key is not configured.');

    const prompt = `Generate ONE realistic interview question for a ${level || 'Mid-level'} ${jobTitle} role.
Category: ${category || 'Behavioral'}
${resumeText ? `Candidate resume snippet: ${resumeText.substring(0, 500)}` : ''}

Return ONLY this JSON:
{
  "question": "The interview question here",
  "category": "${category || 'Behavioral'}",
  "difficulty": "Medium",
  "what_interviewer_wants": "2 sentence explanation of what a good answer should cover"
}`;

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.4, max_tokens: 400 })
    });
    if (!dsRes.ok) throw new Error(`DeepSeek error: ${dsRes.status}`);
    const dsJson = await dsRes.json();
    chargeAiUsage(dsJson.usage);
    let text = dsJson.choices[0].message.content.trim();
    if (text.startsWith('```')) text = text.replace(/```json\n?|```\n?/g, '').trim();
    const data = JSON.parse(text);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Voice Prep Question API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate question.' });
  }
});

// Voice Prep — Analyze User Answer
apiRouter.post('/api/voice-prep/analyze', optionalUser, async (req, res) => {
  try {
    const { question, transcript, jobTitle } = req.body || {};
    // Save to My Works only for the signed-in user (never a userId from the request body)
    const userId = req.auth?.sub;
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!question || !transcript) return res.status(400).json({ error: 'Question and transcript are required.' });

    const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DeepSeek API key is not configured.');

    const prompt = `You are a senior interviewer. Analyze this interview answer:

Question: "${question}"
Candidate's Answer: "${transcript}"
Role: ${jobTitle || 'Professional'}

Return ONLY this JSON:
{
  "overallScore": 7.5,
  "scores": {
    "content": 8,
    "clarity": 7,
    "confidence": 7,
    "structure": 8
  },
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "fillerWords": ["um", "uh", "like"],
  "fillerWordCount": 3,
  "improvedAnswer": "A better version of the answer in 3-4 sentences",
  "starMethod": {
    "situation": "What situation to mention",
    "task": "What task to describe",
    "action": "What actions to highlight",
    "result": "What result to quantify"
  },
  "verdict": "Good"
}`;

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.3, max_tokens: 1000 })
    });
    if (!dsRes.ok) throw new Error(`DeepSeek error: ${dsRes.status}`);
    const dsJson = await dsRes.json();
    chargeAiUsage(dsJson.usage);
    let text = dsJson.choices[0].message.content.trim();
    if (text.startsWith('```')) text = text.replace(/```json\n?|```\n?/g, '').trim();
    const data = JSON.parse(text);

    let savedWork = null;
    if (userId) {
      savedWork = await safeSaveWork({
        userId,
        title: `Voice Practice - ${jobTitle || 'General'}`,
        type: 'voice-prep',
        templateId: 'voice-practice',
        htmlContent: JSON.stringify({ question, transcript, jobTitle, result: data })
      });
      const user = await findUserById(userId);
      if (user) {
        await saveVoicePrepLog({ email: user.email, userId, jobTitle: jobTitle || 'General', score: data.overallScore || 0 });
      }
    }

    return res.json({ success: true, data, work: savedWork });
  } catch (error) {
    console.error('Voice Prep Analyze API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze answer.' });
  }
});

// Portfolio Website Generator Endpoint
apiRouter.post('/api/portfolio/generate-site', optionalUser, requireFreeUse('portfolio'), async (req, res) => {
  try {
    const { resumeText, colorTheme, style } = req.body || {};
    // Save to My Works only for the signed-in user (never a userId from the request body)
    const userId = req.auth?.sub;
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ error: 'Resume text is required (minimum 50 characters).' });
    }

    const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DeepSeek API key is not configured.');

    const themeColors = {
      'dark-pro': { bg: '#0a0a0f', card: '#12121a', accent: '#6366f1', text: '#e2e8f0', secondary: '#94a3b8' },
      'ocean': { bg: '#0c1a2e', card: '#0f2744', accent: '#0ea5e9', text: '#e0f2fe', secondary: '#7dd3fc' },
      'emerald': { bg: '#0a1a0f', card: '#0f2a1a', accent: '#10b981', text: '#d1fae5', secondary: '#6ee7b7' },
      'purple': { bg: '#0f0a1e', card: '#1a1030', accent: '#a855f7', text: '#ede9fe', secondary: '#c4b5fd' },
      'minimal': { bg: '#ffffff', card: '#f8fafc', accent: '#2997ff', text: '#0f172a', secondary: '#475569' }
    };
    const colors = themeColors[colorTheme] || themeColors['dark-pro'];

    const prompt = `Extract structured data from this resume and return ONLY JSON:

Resume:
${resumeText.substring(0, 2000)}

Return this exact JSON structure:
{
  "name": "Full Name",
  "title": "Professional Title",
  "summary": "2-3 sentence professional summary",
  "email": "email if found else empty string",
  "phone": "phone if found else empty string",
  "location": "city, country if found else empty string",
  "linkedin": "linkedin url if found else empty string",
  "github": "github url if found else empty string",
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2022 - Present",
      "points": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "2020"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Short description",
      "tech": ["tech1", "tech2"]
    }
  ]
}`;

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 2000 })
    });
    if (!dsRes.ok) throw new Error(`DeepSeek error: ${dsRes.status}`);
    const dsJson = await dsRes.json();
    chargeAiUsage(dsJson.usage);
    let text = dsJson.choices[0].message.content.trim();
    if (text.startsWith('```')) text = text.replace(/```json\n?|```\n?/g, '').trim();
    const portfolioData = JSON.parse(text);

    // Generate the actual HTML portfolio
    const portfolioHTML = generatePortfolioHTML(portfolioData, colors, style || 'dark-pro');

    let savedWork = null;
    if (userId) {
      savedWork = await safeSaveWork({
        userId,
        title: `Portfolio - ${portfolioData.name || 'My Portfolio'}`,
        type: 'portfolio-gen',
        templateId: `portfolio-${colorTheme || 'dark-pro'}`,
        htmlContent: JSON.stringify({ portfolioData, colorTheme, style, portfolioHTML })
      });
      const user = await findUserById(userId);
      if (user) {
        await savePortfolioGenLog({ email: user.email, userId, theme: colorTheme || 'dark-pro' });
      }
    }

    return res.json({ success: true, data: { portfolioData, portfolioHTML }, work: savedWork });
  } catch (error) {
    console.error('Portfolio Generator API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate portfolio.' });
  }
});

function generatePortfolioHTML(data, colors, style) {
  const { name, title, summary, email, phone, location, linkedin, github, skills = [], experience = [], education = [], projects = [] } = data;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${name || 'My Portfolio'} — Portfolio</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:${colors.bg};--card:${colors.card};--accent:${colors.accent};--text:${colors.text};--secondary:${colors.secondary}}
  body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}
  a{color:var(--accent);text-decoration:none}
  .hero{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:4rem 2rem;background:radial-gradient(ellipse at 50% 0%,${colors.accent}22 0%,transparent 70%)}
  .hero-inner{max-width:700px}
  .avatar{width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,${colors.accent},${colors.secondary});display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:800;color:#fff;margin:0 auto 1.5rem;border:3px solid ${colors.accent}44;box-shadow:0 0 40px ${colors.accent}33}
  h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;letter-spacing:-0.03em;margin-bottom:0.5rem}
  .hero-title{font-size:1.1rem;color:var(--accent);font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:1.25rem}
  .hero-summary{font-size:1rem;color:var(--secondary);max-width:560px;margin:0 auto 2rem;line-height:1.8}
  .contact-links{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:2rem}
  .contact-link{display:inline-flex;align-items:center;gap:0.4rem;background:${colors.card};border:1px solid ${colors.accent}33;color:var(--text);padding:0.5rem 1rem;border-radius:99px;font-size:0.82rem;font-weight:500;transition:all 0.2s}
  .contact-link:hover{background:${colors.accent};color:#fff;border-color:${colors.accent}}
  section{padding:5rem 2rem;max-width:1000px;margin:0 auto}
  .section-label{font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);margin-bottom:0.5rem}
  h2{font-size:2rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:2.5rem}
  .divider{height:1px;background:${colors.accent}22;margin-bottom:3rem}
  .skills-grid{display:flex;flex-wrap:wrap;gap:0.65rem}
  .skill-tag{background:${colors.card};border:1px solid ${colors.accent}33;color:var(--secondary);padding:0.45rem 1rem;border-radius:99px;font-size:0.82rem;font-weight:500;transition:all 0.2s;cursor:default}
  .skill-tag:hover{background:${colors.accent}22;color:var(--text);border-color:${colors.accent}}
  .exp-card{background:${colors.card};border:1px solid ${colors.accent}22;border-radius:12px;padding:1.75rem;margin-bottom:1.25rem;position:relative;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s}
  .exp-card::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:var(--accent);border-radius:3px 0 0 3px}
  .exp-card:hover{transform:translateY(-2px);box-shadow:0 8px 30px ${colors.accent}22}
  .exp-top{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:0.75rem;flex-wrap:wrap}
  .exp-title{font-size:1.05rem;font-weight:700;color:var(--text)}
  .exp-company{font-size:0.88rem;color:var(--accent);font-weight:600;margin-top:0.15rem}
  .exp-duration{font-size:0.78rem;color:var(--secondary);white-space:nowrap;background:${colors.accent}15;padding:0.25rem 0.75rem;border-radius:99px;border:1px solid ${colors.accent}22}
  .exp-points{list-style:none;margin-top:0.75rem}
  .exp-points li{font-size:0.87rem;color:var(--secondary);padding:0.25rem 0 0.25rem 1.2rem;position:relative}
  .exp-points li::before{content:'▸';position:absolute;left:0;color:var(--accent);font-size:0.75rem;top:0.3rem}
  .edu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem}
  .edu-card{background:${colors.card};border:1px solid ${colors.accent}22;border-radius:12px;padding:1.5rem;transition:all 0.2s}
  .edu-card:hover{border-color:${colors.accent}55;transform:translateY(-2px)}
  .edu-degree{font-size:1rem;font-weight:700;margin-bottom:0.35rem}
  .edu-inst{font-size:0.85rem;color:var(--accent);font-weight:600}
  .edu-year{font-size:0.78rem;color:var(--secondary);margin-top:0.25rem}
  .proj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem}
  .proj-card{background:${colors.card};border:1px solid ${colors.accent}22;border-radius:12px;padding:1.5rem;transition:all 0.2s;display:flex;flex-direction:column}
  .proj-card:hover{border-color:${colors.accent}55;transform:translateY(-3px);box-shadow:0 10px 30px ${colors.accent}18}
  .proj-name{font-size:1rem;font-weight:700;margin-bottom:0.5rem}
  .proj-desc{font-size:0.85rem;color:var(--secondary);line-height:1.6;flex:1;margin-bottom:1rem}
  .proj-tech{display:flex;flex-wrap:wrap;gap:0.4rem}
  .tech-tag{background:${colors.accent}15;color:var(--accent);padding:0.2rem 0.65rem;border-radius:99px;font-size:0.72rem;font-weight:600;border:1px solid ${colors.accent}33}
  footer{text-align:center;padding:3rem 2rem;color:var(--secondary);font-size:0.82rem;border-top:1px solid ${colors.accent}15}
  .footer-name{color:var(--accent);font-weight:700}
  @media(max-width:600px){.exp-top{flex-direction:column}.edu-grid,.proj-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<section class="hero">
  <div class="hero-inner">
    <div class="avatar">${(name||'U').charAt(0).toUpperCase()}</div>
    <h1>${name || 'Your Name'}</h1>
    <div class="hero-title">${title || 'Professional'}</div>
    <p class="hero-summary">${summary || ''}</p>
    <div class="contact-links">
      ${email ? `<a href="mailto:${email}" class="contact-link">✉ ${email}</a>` : ''}
      ${phone ? `<a href="tel:${phone}" class="contact-link">📞 ${phone}</a>` : ''}
      ${location ? `<span class="contact-link">📍 ${location}</span>` : ''}
      ${linkedin ? `<a href="${linkedin}" target="_blank" class="contact-link">💼 LinkedIn</a>` : ''}
      ${github ? `<a href="${github}" target="_blank" class="contact-link">🐙 GitHub</a>` : ''}
    </div>
  </div>
</section>

${skills.length > 0 ? `
<div class="divider" style="max-width:1000px;margin:0 auto 0"></div>
<section>
  <div class="section-label">Tech Stack</div>
  <h2>Skills & Expertise</h2>
  <div class="skills-grid">
    ${skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
  </div>
</section>` : ''}

${experience.length > 0 ? `
<div class="divider" style="max-width:1000px;margin:0 auto 0"></div>
<section>
  <div class="section-label">Career Journey</div>
  <h2>Work Experience</h2>
  ${experience.map(e => `
  <div class="exp-card">
    <div class="exp-top">
      <div>
        <div class="exp-title">${e.title || ''}</div>
        <div class="exp-company">${e.company || ''}</div>
      </div>
      <span class="exp-duration">${e.duration || ''}</span>
    </div>
    ${e.points && e.points.length > 0 ? `<ul class="exp-points">${e.points.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
  </div>`).join('')}
</section>` : ''}

${projects.length > 0 ? `
<div class="divider" style="max-width:1000px;margin:0 auto 0"></div>
<section>
  <div class="section-label">What I've Built</div>
  <h2>Projects</h2>
  <div class="proj-grid">
    ${projects.map(p => `
    <div class="proj-card">
      <div class="proj-name">${p.name || ''}</div>
      <div class="proj-desc">${p.description || ''}</div>
      <div class="proj-tech">${(p.tech || []).map(t => `<span class="tech-tag">${t}</span>`).join('')}</div>
    </div>`).join('')}
  </div>
</section>` : ''}

${education.length > 0 ? `
<div class="divider" style="max-width:1000px;margin:0 auto 0"></div>
<section>
  <div class="section-label">Academic Background</div>
  <h2>Education</h2>
  <div class="edu-grid">
    ${education.map(e => `
    <div class="edu-card">
      <div class="edu-degree">${e.degree || ''}</div>
      <div class="edu-inst">${e.institution || ''}</div>
      <div class="edu-year">${e.year || ''}</div>
    </div>`).join('')}
  </div>
</section>` : ''}

<footer>
  <p>Made with ❤️ by <span class="footer-name">${name || 'Me'}</span> · Generated by <span class="footer-name">CV Mind</span></p>
</footer>
</body>
</html>`;
}

apiRouter.post('/api/user/work', requireUser, async (req, res) => {

  const { title, type, templateId, htmlContent, workId, source } = req.body || {};
  const userId = req.auth.sub;
  if (!userId || !title || !type || !templateId || !htmlContent) {
    return res.status(400).json({ error: 'Missing required work fields.' });
  }
  // Only known sources are stored (the editor uses it to hide tools that don't fit that resume)
  const cleanSource = source === 'resume-tailor' ? source : '';
  try {
    const saved = await saveWork({ userId, title, type, templateId, htmlContent, workId, source: cleanSource });
    return res.json({ success: true, data: saved });
  } catch (error) {
    console.error('Save work error:', error);
    return res.status(500).json({ error: error.message || 'Failed to save work.' });
  }
});

apiRouter.get('/api/user/work/:userId', requireSelf(), async (req, res) => {
  const { userId } = req.params;
  try {
    const works = await getUserWorks(userId);
    return res.json({ success: true, data: works });
  } catch (error) {
    console.error('Get user works error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch works.' });
  }
});

apiRouter.delete('/api/user/work/:userId/:workId', requireSelf(), async (req, res) => {
  const { userId, workId } = req.params;
  try {
    await deleteUserWork(workId, userId);
    return res.json({ success: true, message: 'Work deleted successfully.' });
  } catch (error) {
    console.error('Delete work error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete work.' });
  }
});

apiRouter.delete('/api/user/:userId', requireSelf(), async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'User ID is required.' });
  try {
    await deleteAccount(userId);
    return res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete account.' });
  }
});

apiRouter.post('/api/user/profile', requireUser, async (req, res) => {
  const { name, email, address, avatar } = req.body || {};
  const userId = req.auth.sub;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  try {
    // Don't let one account take over another account's email
    const emailOwner = await findUserByEmail(String(email).trim().toLowerCase());
    if (emailOwner && String(emailOwner.id || emailOwner._id) !== userId) {
      return res.status(409).json({ error: 'That email is already used by another account.' });
    }

    const before = await findUserById(userId);
    let updated = await updateUserProfile({ userId, name, email, address, avatar });
    // A new address has to be verified again before the account gets full access back
    const emailChanged = before && String(before.email).toLowerCase() !== String(updated.email).toLowerCase();
    if (emailChanged) {
      updated = await updateUserFields(userId, { emailVerified: false, emailVerifiedAt: null }) || updated;
      invalidateSessionCache(userId);
      const { sent } = await issueVerification(updated);
      if (sent) logAuthEvent(req, 'VERIFICATION_EMAIL_SENT', { userId, email: updated.email, metadata: { changedFrom: before.email } });
    }
    const isPaid = await isUserPaid(updated);
    const userPayload = {
      id: updated.id || updated._id,
      name: updated.name,
      email: updated.email,
      address: updated.address || '',
      avatar: updated.avatar || '',
      isGoogleUser: updated.isGoogleUser || false,
      emailVerified: !!updated.emailVerified
    };
    if (isPaid) {
      userPayload.plan = 'pro';
      userPayload.isPro = true;
      userPayload.isPaid = true;
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      // Fresh token so its email matches the (possibly changed) account email
      user: withSessionToken(userPayload, req, '', req.auth.jti)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update profile.' });
  }
});

apiRouter.post('/api/user/password', requireUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const userId = req.auth.sub;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  try {
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Check if user is a Google OAuth user (their hashed password was generated from
    // 'oauth-google-' + random, but since it's bcrypt-hashed we can't do startsWith.
    // Instead, try comparing currentPassword — if it fails AND the hash is a bcrypt hash
    // of an oauth-google- string, we allow them to set a new password by trying a known sentinel.
    // The reliable approach: attempt bcrypt compare; if it fails, check if they might be a Google user
    // by trying to verify with a fallback sentinel pattern.
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      // Allow Google OAuth users who have never set a password to create one.
      // Guard is enforced server-side via the isGoogleUser flag in the database,
      // so a client sending the sentinel for a non-Google account is rejected.
      if (currentPassword === 'google-oauth-bypass' && user.isGoogleUser === true) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await updateUserPassword(userId, hashedPassword);
        return res.json({ success: true, message: 'Password set successfully!' });
      }
      return res.status(401).json({ error: 'Incorrect current password.' });
    }
    
    // Hash and update
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await updateUserPassword(userId, hashedPassword);
    
    return res.json({ success: true, message: 'Password reset successfully!' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reset password.' });
  }
});

// AI Job Finder Endpoint
apiRouter.post('/api/job-finder', optionalUser, upload.single('resume'), async (req, res) => {
  try {
    const { file } = req;
    const { jobDescription, jobType } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!file) {
      return res.status(400).json({ error: 'No resume file uploaded. Please upload a PDF, DOCX, or TXT file.' });
    }

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 10) {
      return res.status(400).json({ error: 'Please describe your target role or paste a job description (min 10 characters).' });
    }

    let extractedText = '';
    if (file.mimetype === 'application/pdf') {
      extractedText = await parsePdf(file.buffer);
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extractedText = await parseDocx(file.buffer);
    } else if (file.mimetype === 'text/plain') {
      extractedText = parseTxt(file.buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload PDF, DOCX, or TXT.' });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({ error: 'Unable to extract text from the uploaded resume. Please ensure the document has readable text.' });
    }

    const preferredJobType = jobType || 'All';
    const result = await findJobsWithGemini(extractedText, jobDescription.trim(), preferredJobType, customApiKey);

    const userId = req.auth?.sub || '';
    await saveJobFinderLog({
      email: req.auth?.email || req.body.email || '',
      userId,
      jobsCount: result?.jobs?.length || 0,
      jobDescription: jobDescription.trim().substring(0, 200),
      jobType: preferredJobType
    });
    const savedWork = await saveFeatureWork(userId, {
      title: `Job Search - ${jobDescription.trim().substring(0, 50)}`,
      type: 'job-finder',
      templateId: 'ai-job-finder',
      payload: { jobDescription: jobDescription.trim(), jobType: preferredJobType, result }
    });

    return res.json({
      success: true,
      data: result,
      resumeText: extractedText,
      work: savedWork
    });
  } catch (error) {
    console.error('Job Finder API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// Checkout simulated payment route. An optional coupon from the admin panel lowers the price.
// There is no payment provider yet: this records a payment without charging anyone. It stays off unless
// PAYMENTS_MOCK=true (local testing), so nobody can log fake payments or use up coupons in production.
apiRouter.post('/api/payments/checkout', async (req, res, next) => {
  if (process.env.PAYMENTS_MOCK !== 'true') {
    return res.status(503).json({ error: 'Online payments are not available yet.' });
  }
  return requireUser(req, res, next);
}, async (req, res) => {
  const { amount, paymentMethod, couponCode, plan } = req.body || {};
  // Always the signed-in account's address, never one from the request
  const email = req.auth.email;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required to process payment.' });
  }

  // Generate a mock transaction ID
  const prefix = paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'paypal' ? 'PAY' : 'TXN';
  const transactionId = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-4)}`;
  const listPrice = Number(amount || 200);

  try {
    let coupon = null;
    let discount = 0;
    if (couponCode) {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Coupons are unavailable right now. Please try without one.' });
      }
      const check = await evaluateCoupon(couponCode, { email, amount: listPrice });
      if (!check.ok) return res.status(400).json({ error: check.error });
      coupon = check.coupon;
      discount = check.discount;
      if (!(await redeemCoupon(coupon, { email, amount: listPrice, discount, transactionId }))) {
        return res.status(400).json({ error: 'That coupon has just been fully used.' });
      }
    }
    const charged = Math.round((listPrice - discount) * 100) / 100;

    // Save successful log
    await savePaymentLog({
      email,
      amount: charged,
      paymentMethod: paymentMethod || 'card',
      transactionId,
      status: 'success',
      plan: String(plan || '').slice(0, 40),
      couponCode: coupon?.code || '',
      discount
    });

    return res.json({
      success: true,
      message: `Payment of ₹${charged} processed successfully!`,
      transactionId,
      amount: charged,
      discount
    });
  } catch (error) {
    console.error('Payment Checkout API Error:', error);
    return res.status(500).json({ error: 'Failed to process payment. Please try again.' });
  }
});

// Check payment access status
apiRouter.get('/api/payments/check-access/:email', async (req, res) => {
  const email = String(req.params.email || '').trim().toLowerCase();
  if (!email) {
    return res.json({ success: true, hasAccess: false });
  }
  try {
    const hasAccess = await checkJobFinderAccess(email);
    return res.json({ success: true, hasAccess });
  } catch (error) {
    console.error('Check access error:', error);
    return res.json({ success: false, hasAccess: false, error: error.message });
  }
});

// AI Proofreading Endpoint
apiRouter.post('/api/ai/proofread', optionalUser, upload.single('resume'), async (req, res) => {
  try {
    const customApiKey = req.headers['x-gemini-key'] || null;
    const industry = req.body?.industry || 'General';
    // Optional; sent by the web app's Leo flow (older clients leave it out)
    const documentType = String(req.body?.documentType || '').trim().slice(0, 40);

    const usageInfo = null;

    let text = req.body?.text || '';
    const resumeUrl = req.body?.resumeUrl || '';

    // If a file or URL was provided, extract text from it
    if (req.file || resumeUrl) {
      try {
        text = await extractResumeText(req.file || null, resumeUrl || null);
      } catch (parseErr) {
        return res.status(parseErr.status || 400).json({ error: parseErr.message });
      }
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Please provide text or upload a file to proofread.' });
    }

    if (text.trim().length < 20) {
      return res.status(400).json({ error: 'Please provide at least 20 characters of text.' });
    }

    const result = await generateProofreadingWithDeepSeek({
      text: text.trim(),
      industry,
      documentType,
      customApiKey
    });

    const userId = req.auth?.sub || '';
    const issues = Array.isArray(result?.changes) ? result.changes : [];
    await saveProofreadLog({
      email: req.auth?.email || '',
      userId,
      industry,
      charCount: text.trim().length,
      issuesCount: issues.length
    });
    const savedWork = await saveFeatureWork(userId, {
      title: `Proofread - ${documentType ? `${documentType} - ` : ''}${text.trim().substring(0, 40)}`,
      type: 'proofread',
      templateId: 'ai-proofreader',
      payload: { industry, documentType, fileName: req.file?.originalname || '', originalText: text.trim(), result }
    });

    return res.json({ success: true, data: result, extractedText: (req.file || resumeUrl) ? text.trim() : undefined, usage: usageInfo, work: savedWork });
  } catch (error) {
    console.error('Proofreading API Error:', error);
    return res.status(500).json({
      error: error.message || 'AI Proofreading failed. Please try again later.'
    });
  }
});

// User daily usage endpoint
apiRouter.get('/api/user/usage/:userId', requireSelf(), async (req, res) => {
  try {
    const userId = String(req.params.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const usage = await getUserUsageToday(userId);
    return res.json({ success: true, usage, limits: FREE_DAILY_LIMITS });
  } catch (error) {
    console.error('Usage fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch usage.' });
  }
});

app.use('/api/admin', adminRouter);
app.use('/_/backend/api/admin', adminRouter);
app.use('/_/backend', adminPublicRoutes);
app.use('/', adminPublicRoutes);
app.use('/_/backend', billingRouter);
app.use('/', billingRouter);
app.use('/_/backend', apiRouter);
app.use('/', apiRouter);
app.use('/api/auto-apply', autoApplyRouter);
app.use('/_/backend/api/auto-apply', autoApplyRouter);
app.use('/api/agent', agentRouter);
app.use('/_/backend/api/agent', agentRouter);
app.use('/api/company', companyRouter);
app.use('/_/backend/api/company', companyRouter);
app.use('/api/code', codeRouter);
app.use('/_/backend/api/code', codeRouter);

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error.'
  });
});

// Tests import the app and listen on their own port
if (process.env.NODE_ENV !== 'test') app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  // Fill the live job-search cache so the first search in the resume builder is quick.
  if (!process.env.VERCEL) warmJobSearch();
  // Local dev convenience: run agent queue workers in the API process (production uses src/worker.js)
  // Pull the support inbox into tickets every 2 minutes (serverless hosts sync when Support is opened)
  if (!process.env.VERCEL) startInboxPolling();
  if (process.env.INLINE_WORKERS === 'true' && !process.env.VERCEL) {
    startWorkers().catch((err) => console.error('[agent] failed to start inline workers:', err.message));
  } else if (!process.env.VERCEL) {
    // Without a worker, agent jobs (resume parsing, scoring, tailoring) queue up and never run
    console.log('[agent] queue workers are not running in this process; start them with "npm run worker" (or INLINE_WORKERS=true for local dev)');
  }
});

export default app;

import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
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
import { analyzeResumeWithGemini, chatWithCVMind, optimizeResumeWithGemini, tailorResumeWithGemini, generatePrepQuestionsWithGemini, refineCoverLetterWithGemini, analyzeLinkedInProfileWithGemini, evaluatePrepAnswerWithGemini, generateLinkedinBioWithGemini, generateLinkedinOutreachWithGemini, generateCareerCoursesWithGemini, generateElevatorPitchWithGemini, generateCareerRoadmapWithGemini, findJobsWithGemini, generateResumeWithGemini, generateProofreadingWithDeepSeek } from './services/gemini.js';
import { getPublicStats, getAdminStats, saveContactMessage, saveScan, saveFix, saveTailorLog, savePrepLog, findUserByEmail, createUser, saveLoginLog, saveWork, getUserWorks, deleteUserWork, deleteAccount, updateUserProfile, updateUserPassword, findUserById, saveUserResetToken, findUserByResetToken, saveLinkedinLog, saveLinkedinBioLog, saveLinkedinOutreachLog, saveCareerCoursesLog, saveElevatorPitchLog, saveCareerRoadmapLog, saveVoicePrepLog, savePortfolioGenLog, saveLinkedinPostLog, getWorkById, saveJobFinderLog, savePaymentLog, checkJobFinderAccess, getUserUsageToday, FREE_DAILY_LIMITS, isUserPaid, getWhitelistedEmails, addWhitelistedEmail, deleteWhitelistedEmail, getAutoApplyAccessList, grantAutoApplyAccess, revokeAutoApplyAccess, hasAutoApplyAccess, getCareerCopilotAccessList, grantCareerCopilotAccess, revokeCareerCopilotAccess, hasCareerCopilotAccess, getAllUsersForAdmin, setUserStatus } from './db.js';
import { Resend } from 'resend';
import { signToken, verifyToken, assertAuthConfigured, requireUser, requireSelf } from './services/authToken.js';
import mongoose from 'mongoose';
import { importUploadedResume, RESUME_MIME_TYPES } from './agent/resume/intake.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Refuse to boot in production without a token signing secret
assertAuthConfigured();

// Attach a signed session token to a user payload returned by a real sign-in
const withSessionToken = (payload) => ({
  ...payload,
  token: signToken({ sub: payload.id, kind: 'user', email: payload.email })
});

// Initialize Resend Client
const resend = new Resend(process.env.RESEND_API_KEY || '');

// Helper to send Welcome Email upon sign-up
const sendWelcomeEmail = async (email, name, origin) => {
  if (!resend || !process.env.RESEND_API_KEY) {
    console.warn('[WELCOME EMAIL] Skipping send - RESEND_API_KEY is not configured.');
    return;
  }

  const isLocal = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
  const host = isLocal ? origin : 'https://www.cvmind.online';
  const createResumeLink = `${host}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'CV Mind <no-reply@manavtiwari.in>',
      to: [email],
      subject: 'Welcome to CV Mind! ✨',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #2997ff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">CV Mind</h2>
            <span style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Your AI-Powered Career Partner</span>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Hi <strong>${name}</strong>,</p>
          
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Welcome to <strong>CV Mind</strong>! We are absolutely thrilled to have you join us. 
            CV Mind is a state-of-the-art career suite designed to empower job seekers like you with advanced AI intelligence and ATS optimization tools.
          </p>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #f1f5f9;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Here is how CV Mind accelerates your job search:</h3>
            <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.8; color: #334155;">
              <li><strong>ATS Resume Scanner & Scorecard:</strong> Get instant recruiter-grade scores, structural audits, and missing keyword analyses.</li>
              <li><strong>AI-Powered Optimizer:</strong> Rewrite weak bullet points and enhance your resume's metrics with one click.</li>
              <li><strong>Job Tailoring:</strong> Instantly match and adapt your profile to target job descriptions to beat the resume filters.</li>
              <li><strong>SmartPrep Mock Interviews:</strong> Practice with dynamic AI-generated interview questions and receive instant evaluations.</li>
              <li><strong>LinkedIn Optimizer:</strong> Elevate your profile, create compelling bios, and write high-impact outreach messages.</li>
            </ul>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 30px; text-align: center;">
            Ready to take the next step in your career? Create a standout resume that lands interviews today!
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${createResumeLink}" style="background: linear-gradient(135deg, #2997ff 0%, #bf5af2 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(41, 151, 255, 0.3); font-size: 16px;">Create Beautiful Resume Now</a>
          </div>
          
          <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-top: 25px;">
            If you ever have any questions, feedback, or need help with your career tools, simply reply to this email. We're here to help you succeed!
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />
          
          <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; margin: 0;">
            Designed & engineered by Manav Tiwari.<br />
            © ${new Date().getFullYear()} CV Mind. Secure applicant tracking systems and resume optimization.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('[WELCOME EMAIL] Resend Dispatch Error:', error);
    } else {
      console.log(`[WELCOME EMAIL] Sent successfully to: ${email}, ID: ${data?.id}`);
    }
  } catch (err) {
    console.error('[WELCOME EMAIL] Exception during dispatch:', err);
  }
};

// Enable CORS for all requests, allow credentials and specific headers
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gemini-key', 'x-admin-secret']
}));

app.use(express.json());

const apiRouter = express.Router();

// In-memory file upload configuration
const upload = multer({
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

// Root Health Check Route
apiRouter.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'CV Mind Backend API is running smoothly.',
    timestamp: new Date()
  });
});

// Admin Authentication Login Route
apiRouter.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const targetUsername = process.env.ADMIN_USERNAME;
  const targetPassword = process.env.ADMIN_PASSWORD;
  const configuredSecret = process.env.ADMIN_SECRET;

  if (targetUsername && targetPassword && username === targetUsername && password === targetPassword) {
    return res.json({
      success: true,
      message: 'Login successful.',
      secret: configuredSecret || ''
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid username or password.'
  });
});

// User Sign Up Route
apiRouter.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered. Please sign in.' });
    }

    // Hash the password securely with 10 salt rounds
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await createUser({
      email,
      name,
      password: hashedPassword,
      isGoogleUser: false
    });

    await saveLoginLog({ email: newUser.email, name: newUser.name, provider: 'signup' });

    // Send welcome email asynchronously
    sendWelcomeEmail(newUser.email, newUser.name, req.headers.origin);

    const isPaid = await isUserPaid(newUser);
    const userPayload = {
      id: newUser.id || newUser._id,
      name: newUser.name,
      email: newUser.email,
      isGoogleUser: newUser.isGoogleUser || false
    };
    if (isPaid) {
      userPayload.plan = 'pro';
      userPayload.isPro = true;
      userPayload.isPaid = true;
    }

    return res.json({
      success: true,
      message: 'Account created successfully!',
      user: withSessionToken(userPayload)
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
// Self-hosted SVG captcha: challenges live in memory, are single-use, and expire.
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

apiRouter.get('/api/auth/captcha', (req, res) => {
  for (const [id, entry] of captchaStore) {
    if (Date.now() > entry.expires) captchaStore.delete(id);
  }
  let code = '';
  for (let i = 0; i < 5; i++) code += CAPTCHA_CHARS[crypto.randomInt(CAPTCHA_CHARS.length)];
  const captchaId = crypto.randomUUID();
  captchaStore.set(captchaId, { answer: code, expires: Date.now() + CAPTCHA_TTL_MS });
  res.json({ captchaId, svg: generateCaptchaSvg(code) });
});

function verifyCaptcha(captchaId, answer) {
  const entry = captchaStore.get(captchaId);
  if (!entry) return false;
  captchaStore.delete(captchaId); // single-use: consumed on any attempt
  if (Date.now() > entry.expires) return false;
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

// User Sign In Route
apiRouter.post('/api/auth/login', async (req, res) => {
  const { email, password, captchaId, captchaAnswer } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!verifyCaptcha(captchaId, captchaAnswer)) {
    return res.status(400).json({ error: 'Captcha verification failed. Please try the new code.', captchaFailed: true });
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
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
        sendWelcomeEmail(user.email, user.name, req.headers.origin);
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
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare bcrypt hashes
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const blockError = getAccountBlockError(user);
    if (blockError) {
      return res.status(403).json(blockError);
    }

    await saveLoginLog({ email: user.email, name: user.name, provider: 'password' });

    const isPaid = await isUserPaid(user);
    const userPayload = {
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      isGoogleUser: user.isGoogleUser || false
    };
    if (isPaid) {
      userPayload.plan = 'pro';
      userPayload.isPro = true;
      userPayload.isPaid = true;
    }

    return res.json({
      success: true,
      message: 'Sign in successful!',
      user: withSessionToken(userPayload)
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
    const user = await findUserByEmail(email);
    if (!user) {
      // Industry-standard secure response to prevent user enumeration attacks
      return res.json({
        success: true,
        message: 'A secure password reset link has been dispatched to your email address.'
      });
    }

    // 1. Generate cryptographically secure recovery token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const host = req.headers.origin || 'http://localhost:5173';
    const resetLink = `${host}/?resetToken=${resetToken}&email=${encodeURIComponent(user.email)}`;

    // Save reset token in DB with 1 hour expiration
    await saveUserResetToken(user.email, resetToken, Date.now() + 3600000);

    // 2. Dispatch email using Resend and user's verified manavtiwari.in domain
    const { data, error } = await resend.emails.send({
      from: 'CV Mind <no-reply@manavtiwari.in>',
      to: [email],
      subject: 'Reset your CV Mind Password',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2997ff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">CV Mind</h2>
            <span style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Password Recovery Portal</span>
          </div>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">Hi <strong>${user.name}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 20px;">We received a secure request to reset your CV Mind account password. Click the button below to set a new password. This link is valid for **1 hour**:</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #2997ff 0%, #bf5af2 100%); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(41, 151, 255, 0.25);">Reset My Password</a>
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-top: 25px;">If you did not make this request, you can safely ignore this email. Your account credentials remain completely secure.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; margin: 0;">
            Designed & engineered by Manav Tiwari.<br />
            © ${new Date().getFullYear()} CV Mind. Secure applicant tracking systems and resume optimization.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Resend API Dispatch Error:', error);
      return res.status(500).json({ error: 'Failed to send secure reset email. Please contact support.' });
    }

    console.log(`[PASSWORD RESET] Live email sent using Resend. ID: ${data?.id} for user: ${user.name}`);

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
    const user = await findUserByResetToken(token);
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

    return res.json({
      success: true,
      message: 'Password reset successful! You can now sign in with your new password.'
    });
  } catch (err) {
    console.error('Reset Password API Error:', err);
    return res.status(500).json({ error: err.message || 'An error occurred while resetting password.' });
  }
});

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

    let user = await findUserByEmail(email);
    if (!user) {
      // Auto-create Google user with dynamic unique mock password hash
      const salt = await bcrypt.genSalt(10);
      const mockPasswordHash = await bcrypt.hash('oauth-google-' + Math.random().toString(36), salt);
      user = await createUser({
        email,
        name: name || email.split('@')[0],
        password: mockPasswordHash,
        isGoogleUser: true
      });

      // Send welcome email asynchronously for Google signup
      sendWelcomeEmail(user.email, user.name, req.headers.origin);
    }

    const blockError = getAccountBlockError(user);
    if (blockError) {
      return res.status(403).json(blockError);
    }

    await saveLoginLog({ email: user.email, name: user.name, provider: 'google' });

    const isPaid = await isUserPaid(user);
    const userPayload = {
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      avatar: picture || '',
      isGoogleUser: user.isGoogleUser || false
    };
    if (isPaid) {
      userPayload.plan = 'pro';
      userPayload.isPro = true;
      userPayload.isPaid = true;
    }

    return res.json({
      success: true,
      message: 'Sign in with Google successful!',
      user: withSessionToken(userPayload)
    });
  } catch (err) {
    console.error('Google Sign In Error:', err);
    return res.status(400).json({ error: 'Google authentication failed. Please try again.' });
  }
});

// Lightweight session validity check — lets the SPA kick out banned/suspended
// (or deleted) users who still hold a localStorage session from before.
apiRouter.get('/api/auth/account-status', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.json({ status: 'deleted', active: false, message: 'This account no longer exists.' });
    }
    const blockError = getAccountBlockError(user);
    if (blockError) {
      return res.json({ status: user.status, active: false, message: blockError.error });
    }
    return res.json({ status: 'active', active: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Status check failed.' });
  }
});

// ── GitHub & LinkedIn OAuth (server-side code exchange) ──────────────────────
const ALLOWED_OAUTH_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://www.cvmind.online',
  'https://cvmind.online'
];

// Short-lived anti-CSRF state store: state -> { origin, expires }
const oauthStateStore = new Map();

function createOAuthState(origin) {
  // Purge expired states opportunistically
  for (const [key, entry] of oauthStateStore) {
    if (Date.now() > entry.expires) oauthStateStore.delete(key);
  }
  const state = crypto.randomBytes(24).toString('hex');
  oauthStateStore.set(state, { origin, expires: Date.now() + 10 * 60 * 1000 });
  return state;
}

function consumeOAuthState(state) {
  const entry = oauthStateStore.get(state || '');
  if (!entry) return null;
  oauthStateStore.delete(state);
  if (Date.now() > entry.expires) return null;
  return entry;
}

function resolveOAuthOrigin(req) {
  const requested = String(req.query.origin || '');
  if (ALLOWED_OAUTH_ORIGINS.includes(requested)) return requested;
  return process.env.FRONTEND_URL || 'https://www.cvmind.online';
}

function getBackendBaseUrl(req) {
  return process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
}

function redirectWithAuthError(res, origin, message) {
  return res.redirect(`${origin}/?authError=${encodeURIComponent(message)}`);
}

// Shared: find/create the user, enforce moderation status, log the login,
// then hand the session payload back to the SPA via a query param.
async function completeOAuthLogin(req, res, origin, { email, name, avatar, provider }) {
  if (!email) {
    return redirectWithAuthError(res, origin, `Your ${provider} account has no verified email address.`);
  }

  let user = await findUserByEmail(email);
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const mockPasswordHash = await bcrypt.hash(`oauth-${provider}-` + Math.random().toString(36), salt);
    user = await createUser({
      email,
      name: name || email.split('@')[0],
      password: mockPasswordHash,
      isGoogleUser: true, // OAuth account — no usable password
      provider
    });
    sendWelcomeEmail(user.email, user.name, origin);
  }

  const blockError = getAccountBlockError(user);
  if (blockError) {
    return redirectWithAuthError(res, origin, blockError.error);
  }

  await saveLoginLog({ email: user.email, name: user.name, provider });

  const isPaid = await isUserPaid(user);
  const userPayload = {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    avatar: avatar || '',
    isGoogleUser: user.isGoogleUser || false
  };
  if (isPaid) {
    userPayload.plan = 'pro';
    userPayload.isPro = true;
    userPayload.isPaid = true;
  }

  const encoded = Buffer.from(JSON.stringify(withSessionToken(userPayload))).toString('base64url');
  return res.redirect(`${origin}/?oauthUser=${encoded}`);
}

// Step 1 (GitHub): send the user to GitHub's consent screen
apiRouter.get('/api/auth/github', (req, res) => {
  const origin = resolveOAuthOrigin(req);
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return redirectWithAuthError(res, origin, 'GitHub login is not configured yet.');
  }
  const state = createOAuthState(origin);
  const redirectUri = `${getBackendBaseUrl(req)}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('read:user user:email')}&state=${state}`;
  return res.redirect(url);
});

// Step 2 (GitHub): exchange the code, fetch the profile, sign the user in
apiRouter.get('/api/auth/github/callback', async (req, res) => {
  const stateEntry = consumeOAuthState(req.query.state);
  const origin = stateEntry?.origin || process.env.FRONTEND_URL || 'https://www.cvmind.online';
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

    let email = profile.email || '';
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', { headers: ghHeaders });
      const emails = await emailsRes.json();
      if (Array.isArray(emails)) {
        const primary = emails.find(e => e.primary && e.verified) || emails.find(e => e.verified);
        email = primary?.email || '';
      }
    }

    return await completeOAuthLogin(req, res, origin, {
      email,
      name: profile.name || profile.login,
      avatar: profile.avatar_url || '',
      provider: 'github'
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
  const state = createOAuthState(origin);
  const redirectUri = `${getBackendBaseUrl(req)}/api/auth/linkedin/callback`;
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('openid profile email')}&state=${state}`;
  return res.redirect(url);
});

// Step 2 (LinkedIn): exchange the code, fetch userinfo, sign the user in
apiRouter.get('/api/auth/linkedin/callback', async (req, res) => {
  const stateEntry = consumeOAuthState(req.query.state);
  const origin = stateEntry?.origin || process.env.FRONTEND_URL || 'https://www.cvmind.online';
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
      provider: 'linkedin'
    });
  } catch (err) {
    console.error('LinkedIn OAuth Error:', err);
    return redirectWithAuthError(res, origin, 'LinkedIn authentication failed. Please try again.');
  }
});

// Admin Analytics Stats Secure Route
apiRouter.post('/api/admin/stats', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'] || req.body.secret || null;
  const configuredSecret = process.env.ADMIN_SECRET;

  if (!configuredSecret || !adminSecret || adminSecret !== configuredSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin secret key.' });
  }

  try {
    const statsData = await getAdminStats();
    return res.json({
      success: true,
      data: statsData
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Stats query failed.' });
  }
});

// Get whitelisted emails
apiRouter.get('/api/admin/whitelist', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'] || null;
  const configuredSecret = process.env.ADMIN_SECRET;

  if (!configuredSecret || !adminSecret || adminSecret !== configuredSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin secret key.' });
  }

  try {
    const list = await getWhitelistedEmails();
    return res.json({ success: true, emails: list });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Whitelist query failed.' });
  }
});

// Add whitelisted email
apiRouter.post('/api/admin/whitelist', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'] || req.body.secret || null;
  const configuredSecret = process.env.ADMIN_SECRET;

  if (!configuredSecret || !adminSecret || adminSecret !== configuredSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin secret key.' });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  try {
    const entry = await addWhitelistedEmail(email);
    return res.json({ success: true, data: entry });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to add whitelisted email.' });
  }
});

// Delete whitelisted email
apiRouter.delete('/api/admin/whitelist/:email', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'] || null;
  const configuredSecret = process.env.ADMIN_SECRET;

  if (!configuredSecret || !adminSecret || adminSecret !== configuredSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin secret key.' });
  }

  const email = req.params.email;
  if (!email) {
    return res.status(400).json({ error: 'Email address parameter is required.' });
  }

  try {
    await deleteWhitelistedEmail(email);
    return res.json({ success: true, message: 'Email removed from whitelist.' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to delete whitelisted email.' });
  }
});

// ── Auto Apply Access (Admin) ──────────────────────────────────────────────────
apiRouter.get('/api/admin/auto-apply-access', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try { res.json({ success: true, data: await getAutoApplyAccessList() }); } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/api/admin/auto-apply-access', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try { await grantAutoApplyAccess(email); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.delete('/api/admin/auto-apply-access/:email', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try { await revokeAutoApplyAccess(req.params.email); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/api/auto-apply/check-access', async (req, res) => {
  const email = req.query.email || '';
  if (!email) return res.json({ hasAccess: false });
  try { res.json({ hasAccess: await hasAutoApplyAccess(email) }); } catch { res.json({ hasAccess: false }); }
});

// ── Career Copilot Access (Admin) ─────────────────────────────────────────────
apiRouter.get('/api/admin/career-copilot-access', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try { res.json({ success: true, data: await getCareerCopilotAccessList() }); } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/api/admin/career-copilot-access', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try { await grantCareerCopilotAccess(email); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.delete('/api/admin/career-copilot-access/:email', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try { await revokeCareerCopilotAccess(req.params.email); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Career Copilot is unlocked for all users — always grant access.
apiRouter.get('/api/career-copilot/check-access', async (req, res) => {
  res.json({ hasAccess: true });
});

// ── User Moderation (Admin) ───────────────────────────────────────────────────
// List all registered accounts with status + login activity
apiRouter.get('/api/admin/users', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try { res.json({ success: true, data: await getAllUsersForAdmin() }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Change account status: active | suspended | banned
apiRouter.post('/api/admin/users/:id/status', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { status, reason } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Status is required.' });
  try {
    const result = await setUserStatus(req.params.id, status, reason);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(e.message === 'User not found' ? 404 : 400).json({ error: e.message });
  }
});

// Permanently delete an account and its data
apiRouter.delete('/api/admin/users/:id', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try { await deleteAccount(req.params.id); res.json({ success: true, message: 'User account deleted.' }); } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailLooksValid) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const contact = await saveContactMessage({
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject || '').trim(),
      message: String(message).trim()
    });

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

apiRouter.post('/api/analyze', upload.single('resume'), async (req, res) => {
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
    if (evaluation && evaluation.score) {
      saveScan({
        fileName: file ? file.originalname : 'Link Upload',
        fileType: file ? file.mimetype : 'link',
        fileSize: file ? file.size : 0,
        evaluation
      });
      invalidatePublicStats();
    }

    const agentResume = await importCheckerResumeForAgent(req, file);

    // Return the detailed analysis + original text (needed for AI optimizer)
    return res.json({
      success: true,
      data: evaluation,
      resumeText: extractedText,
      agentResume
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
apiRouter.post('/api/optimize', async (req, res) => {
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
    try {
      const fileName = req.body.fileName || analysisResult.fileName || 'Unknown Resume';
      const priorScore = Number(analysisResult.score || 0);
      await saveFix({ fileName, priorScore });
    } catch (dbErr) {
      console.error('Error saving optimization fix log:', dbErr);
    }

    return res.json({
      success: true,
      data: { optimizedResume }
    });
  } catch (error) {
    console.error('Optimize API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// AI Resume Tailoring Endpoint
apiRouter.post('/api/tailor', upload.single('resume'), async (req, res) => {
  try {
    const { file } = req;
    const { jobDescription, resumeUrl } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!file && !resumeUrl) {
      return res.status(400).json({ error: 'No resume file uploaded. Please upload a PDF, DOCX, or TXT file.' });
    }

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 15) {
      return res.status(400).json({ error: 'Job Description is required and must be at least 15 characters.' });
    }

    let extractedText = '';
    try {
      extractedText = await extractResumeText(file, resumeUrl);
    } catch (parseErr) {
      return res.status(parseErr.status || 400).json({ error: parseErr.message });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({ error: 'Unable to extract text from the uploaded resume.' });
    }

    const result = await tailorResumeWithGemini(extractedText, jobDescription, customApiKey);

    // Record the tailoring event in MongoDB / Local DB
    saveTailorLog({
      fileName: file ? file.originalname : 'Link Upload',
      fileSize: file ? file.size : 0,
      score: result.matchScore,
      jobDescription: jobDescription,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkillsRecommended
    }).catch(err => console.error('Error logging tailoring scan:', err));

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Tailor API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// AI Interview Prep Endpoint
apiRouter.post('/api/prep', upload.single('resume'), async (req, res) => {
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
      savePrepLog({
        fileName: fileName,
        fileSize: fileSize,
        questionsCount: result.questions.length
      }).catch(err => console.error('Error logging prep action:', err));
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
    const { templateHtml, formData } = req.body || {};
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
      customApiKey
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

// LinkedIn Profile Optimizer Endpoint
apiRouter.post('/api/linkedin/analyze', upload.single('linkedinPdf'), async (req, res) => {
  try {
    const { file } = req;
    const { email, userId } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

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

    const evaluation = await analyzeLinkedInProfileWithGemini(extractedText, customApiKey);

    // Save logs to MongoDB / Local JSON DB
    if (evaluation && evaluation.score !== undefined) {
      await saveLinkedinLog({ email: email || '', score: evaluation.score });
    }

    let savedWork = null;
    if (userId) {
      const payload = {
        profileText: extractedText,
        evaluation
      };
      savedWork = await saveWork({
        userId,
        title: `LinkedIn Optimizer - ${new Date().toLocaleDateString()}`,
        type: 'linkedin',
        templateId: 'linkedin-opt',
        htmlContent: JSON.stringify(payload)
      });
    }

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
apiRouter.post('/api/linkedin/bio', async (req, res) => {
  try {
    const { skills, jobTitle, resumeText, email, userId } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!jobTitle) {
      return res.status(400).json({ error: 'Job Title is required.' });
    }

    const result = await generateLinkedinBioWithGemini({
      skills,
      jobTitle,
      resumeText,
      customApiKey
    });

    // Save log
    await saveLinkedinBioLog({
      email: email || '',
      jobTitle: jobTitle
    });

    let savedWork = null;
    if (userId) {
      savedWork = await saveWork({
        userId,
        title: `LinkedIn Assets - ${jobTitle}`,
        type: 'linkedin-bio',
        templateId: 'linkedin-bio-gen',
        htmlContent: JSON.stringify({
          skills,
          jobTitle,
          resumeText,
          result
        })
      });
    }

    return res.json({
      success: true,
      data: result,
      work: savedWork
    });
  } catch (error) {
    console.error('LinkedIn Bio Generator API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// LinkedIn Outreach & DM Writer Endpoint
apiRouter.post('/api/linkedin/outreach', async (req, res) => {
  try {
    const { jobTitle, companyName, context, targetName, email, userId } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!jobTitle) {
      return res.status(400).json({ error: 'Job Title is required.' });
    }

    const result = await generateLinkedinOutreachWithGemini({
      jobTitle,
      companyName,
      context,
      targetName,
      customApiKey
    });

    await saveLinkedinOutreachLog({
      email: email || '',
      jobTitle: jobTitle
    });

    let savedWork = null;
    if (userId) {
      savedWork = await saveWork({
        userId,
        title: `LinkedIn Outreach - ${jobTitle} (${companyName || 'General'})`,
        type: 'linkedin-outreach',
        templateId: 'linkedin-outreach-gen',
        htmlContent: JSON.stringify({
          jobTitle,
          companyName,
          context,
          targetName,
          result
        })
      });
    }

    return res.json({
      success: true,
      data: result,
      work: savedWork
    });
  } catch (error) {
    console.error('LinkedIn Outreach API Error:', error);
    return res.status(500).json({
      error: error.message || 'AI Generation failed. Please try again later.'
    });
  }
});

// Skill Gap & Course Recommendation Endpoint
apiRouter.post('/api/career/courses', async (req, res) => {
  try {
    const { targetJob, skills, resumeText, email, userId } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!targetJob) {
      return res.status(400).json({ error: 'Target Job is required.' });
    }

    const result = await generateCareerCoursesWithGemini({
      targetJob,
      skills,
      resumeText,
      customApiKey
    });

    await saveCareerCoursesLog({
      email: email || '',
      jobTitle: targetJob
    });

    let savedWork = null;
    if (userId) {
      savedWork = await saveWork({
        userId,
        title: `Career Courses - ${targetJob}`,
        type: 'career-courses',
        templateId: 'career-courses-gen',
        htmlContent: JSON.stringify({
          targetJob,
          skills,
          resumeText,
          result
        })
      });
    }

    return res.json({
      success: true,
      data: result,
      work: savedWork
    });
  } catch (error) {
    console.error('Career Courses API Error:', error);
    return res.status(500).json({
      error: error.message || 'AI Generation failed. Please try again later.'
    });
  }
});

// Elevator Pitch Builder Endpoint
apiRouter.post('/api/career/pitch', async (req, res) => {
  try {
    const { jobTitle, details, resumeText, email, userId } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!jobTitle) {
      return res.status(400).json({ error: 'Job Title is required.' });
    }

    const result = await generateElevatorPitchWithGemini({
      jobTitle,
      details,
      resumeText,
      customApiKey
    });

    await saveElevatorPitchLog({
      email: email || '',
      jobTitle: jobTitle
    });

    let savedWork = null;
    if (userId) {
      savedWork = await saveWork({
        userId,
        title: `Elevator Pitch - ${jobTitle}`,
        type: 'elevator-pitch',
        templateId: 'elevator-pitch-gen',
        htmlContent: JSON.stringify({
          jobTitle,
          details,
          resumeText,
          result
        })
      });
    }

    return res.json({
      success: true,
      data: result,
      work: savedWork
    });
  } catch (error) {
    console.error('Elevator Pitch API Error:', error);
    return res.status(500).json({
      error: error.message || 'AI Generation failed. Please try again later.'
    });
  }
});

// Career Roadmap Endpoint
apiRouter.post('/api/career/roadmap', async (req, res) => {
  try {
    const { currentRole, targetRole, years, resumeText, email, userId } = req.body || {};
    const customApiKey = req.headers['x-gemini-key'] || null;

    if (!targetRole) {
      return res.status(400).json({ error: 'Target Role is required.' });
    }

    const result = await generateCareerRoadmapWithGemini({
      currentRole,
      targetRole,
      years,
      resumeText,
      customApiKey
    });

    await saveCareerRoadmapLog({
      email: email || ''
    });

    let savedWork = null;
    if (userId) {
      savedWork = await saveWork({
        userId,
        title: `Career Roadmap - ${targetRole}`,
        type: 'career-roadmap',
        templateId: 'career-roadmap-gen',
        htmlContent: JSON.stringify({
          currentRole,
          targetRole,
          years,
          resumeText,
          result
        })
      });
    }

    return res.json({
      success: true,
      data: result,
      work: savedWork
    });
  } catch (error) {
    console.error('Career Roadmap API Error:', error);
    return res.status(500).json({
      error: error.message || 'AI Generation failed. Please try again later.'
    });
  }
});

// Public Shareable Resume Portfolio Endpoint
apiRouter.get('/api/portfolio/:workId', async (req, res) => {
  const { workId } = req.params;
  try {
    const work = await getWorkById(workId);
    if (!work) {
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
apiRouter.post('/api/linkedin/post', async (req, res) => {
  try {
    const { topic, jobTitle, tone, resumeText, userId } = req.body || {};
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
    let text = dsJson.choices[0].message.content.trim();
    if (text.startsWith('```')) text = text.replace(/```json\n?|```\n?/g, '').trim();
    const data = JSON.parse(text);

    let savedWork = null;
    if (userId) {
      savedWork = await saveWork({
        userId,
        title: `LinkedIn Post - ${topic.substring(0, 40)}`,
        type: 'linkedin-post',
        templateId: 'linkedin-post-gen',
        htmlContent: JSON.stringify({ topic, jobTitle, tone, result: data })
      });
      const user = await findUserById(userId);
      if (user) {
        await saveLinkedinPostLog({ email: user.email, topic });
      }
    }

    return res.json({ success: true, data, work: savedWork });
  } catch (error) {
    console.error('LinkedIn Post API Error:', error);
    return res.status(500).json({ error: error.message || 'AI generation failed.' });
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
apiRouter.post('/api/voice-prep/analyze', async (req, res) => {
  try {
    const { question, transcript, jobTitle, userId } = req.body || {};
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
    let text = dsJson.choices[0].message.content.trim();
    if (text.startsWith('```')) text = text.replace(/```json\n?|```\n?/g, '').trim();
    const data = JSON.parse(text);

    let savedWork = null;
    if (userId) {
      savedWork = await saveWork({
        userId,
        title: `Voice Practice - ${jobTitle || 'General'}`,
        type: 'voice-prep',
        templateId: 'voice-practice',
        htmlContent: JSON.stringify({ question, transcript, jobTitle, result: data })
      });
      const user = await findUserById(userId);
      if (user) {
        await saveVoicePrepLog({ email: user.email, jobTitle: jobTitle || 'General', score: data.overallScore || 0 });
      }
    }

    return res.json({ success: true, data, work: savedWork });
  } catch (error) {
    console.error('Voice Prep Analyze API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze answer.' });
  }
});

// Portfolio Website Generator Endpoint
apiRouter.post('/api/portfolio/generate-site', async (req, res) => {
  try {
    const { resumeText, colorTheme, style, userId } = req.body || {};
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
    let text = dsJson.choices[0].message.content.trim();
    if (text.startsWith('```')) text = text.replace(/```json\n?|```\n?/g, '').trim();
    const portfolioData = JSON.parse(text);

    // Generate the actual HTML portfolio
    const portfolioHTML = generatePortfolioHTML(portfolioData, colors, style || 'dark-pro');

    let savedWork = null;
    if (userId) {
      savedWork = await saveWork({
        userId,
        title: `Portfolio - ${portfolioData.name || 'My Portfolio'}`,
        type: 'portfolio-gen',
        templateId: `portfolio-${colorTheme || 'dark-pro'}`,
        htmlContent: JSON.stringify({ portfolioData, colorTheme, style, portfolioHTML })
      });
      const user = await findUserById(userId);
      if (user) {
        await savePortfolioGenLog({ email: user.email, theme: colorTheme || 'dark-pro' });
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

  const { title, type, templateId, htmlContent, workId } = req.body || {};
  const userId = req.auth.sub;
  if (!userId || !title || !type || !templateId || !htmlContent) {
    return res.status(400).json({ error: 'Missing required work fields.' });
  }
  try {
    const saved = await saveWork({ userId, title, type, templateId, htmlContent, workId });
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

    const updated = await updateUserProfile({ userId, name, email, address, avatar });
    const isPaid = await isUserPaid(updated);
    const userPayload = {
      id: updated.id || updated._id,
      name: updated.name,
      email: updated.email,
      address: updated.address || '',
      avatar: updated.avatar || '',
      isGoogleUser: updated.isGoogleUser || false
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
      user: withSessionToken(userPayload)
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
apiRouter.post('/api/job-finder', upload.single('resume'), async (req, res) => {
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

    // Log the usage asynchronously
    saveJobFinderLog({
      email: req.body.email || '',
      jobsCount: result?.jobs?.length || 0,
      jobDescription: jobDescription.trim().substring(0, 200),
      jobType: preferredJobType
    }).catch(err => console.error('Error logging job finder usage:', err));

    return res.json({
      success: true,
      data: result,
      resumeText: extractedText
    });
  } catch (error) {
    console.error('Job Finder API Error:', error);
    return res.status(500).json({
      error: error.message || 'try again after sometime or mail to contact@manavtiwari.in for this error'
    });
  }
});

// Checkout simulated payment route
apiRouter.post('/api/payments/checkout', async (req, res) => {
  const { email, amount, paymentMethod } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email address is required to process payment.' });
  }

  // Generate a mock transaction ID
  const prefix = paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'paypal' ? 'PAY' : 'TXN';
  const transactionId = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-4)}`;

  try {
    // Save successful log
    await savePaymentLog({
      email,
      amount: Number(amount || 200),
      paymentMethod: paymentMethod || 'card',
      transactionId,
      status: 'success'
    });

    return res.json({
      success: true,
      message: 'Payment of ₹200 processed successfully!',
      transactionId
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
apiRouter.post('/api/ai/proofread', upload.single('resume'), async (req, res) => {
  try {
    const customApiKey = req.headers['x-gemini-key'] || null;
    const industry = req.body?.industry || 'General';

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
      customApiKey
    });

    return res.json({ success: true, data: result, extractedText: (req.file || resumeUrl) ? text.trim() : undefined, usage: usageInfo });
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

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  // Local dev convenience: run agent queue workers in the API process (production uses src/worker.js)
  if (process.env.INLINE_WORKERS === 'true' && !process.env.VERCEL) {
    startWorkers().catch((err) => console.error('[agent] failed to start inline workers:', err.message));
  }
});

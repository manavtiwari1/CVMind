import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { rateLimit } from 'express-rate-limit';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { AdminUser } from '../models.js';
import {
  requireAdmin,
  requireDb,
  verifyMfaToken,
  issueAdminSession,
  endOtherSessions,
  renewCurrentToken,
  invalidateAdminCache
} from '../auth.js';
import { signToken, verifyToken } from '../../services/authToken.js';
import { audit } from '../audit.js';
import { sendEmail, emailConfigured, renderEmail } from '../mailer.js';
import {
  isTrioAdmin,
  findTrioMemberByIdentifier,
  maskEmail,
  encryptSecret,
  decryptSecret
} from '../trio.js';
import { clean, handle, httpError } from '../util.js';

const router = express.Router();
router.use(requireDb);

const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, error: 'Too many verification attempts. Please wait 15 minutes.' })
});

const emailOtpStore = new Map();

function pruneExpired(store) {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (!v || v.expiresAt <= now) store.delete(k);
  }
}

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function requestOrigin(req) {
  const originHeader = String(req.headers.origin || '').trim();
  if (originHeader) return originHeader;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
  return `${proto}://${host}`;
}

async function resolveMfaOrAdmin(req) {
  const mfaToken = String(req.body?.mfaToken || '').trim();
  if (mfaToken) {
    const admin = await verifyMfaToken(mfaToken);
    if (!admin) throw httpError(401, 'Your verification session expired. Please sign in again.');
    return { admin, viaMfaToken: true };
  }
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const payload = bearer ? verifyToken(bearer) : null;
  if (payload && payload.kind === 'admin') {
    const admin = await AdminUser.findById(payload.sub);
    if (admin && isTrioAdmin(admin) && payload.jti === `v${admin.tokenVersion || 0}`) {
      return { admin, viaMfaToken: false };
    }
  }
  throw httpError(401, 'Authentication required.');
}

function generateBackupCodes(count = 8) {
  const plain = [];
  const hashed = [];
  for (let i = 0; i < count; i++) {
    const code = `${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    plain.push(code);
    hashed.push({ hash: hashToken(code.replace(/-/g, '')), used: false, usedAt: null });
  }
  return { plain, hashed };
}

// ── TOTP 2FA Setup & Verification ───────────────────────────────────────────

router.post('/mfa/setup-init', mfaLimiter, handle(async (req, res) => {
  const { admin } = await resolveMfaOrAdmin(req);
  const secret = generateSecret();
  admin.twoFactorSecret = encryptSecret(secret);
  admin.twoFactorVerified = false;
  await admin.save();

  const uri = generateURI({
    issuer: 'CVMind Admin',
    label: `${admin.username}@cvmind.in`,
    secret
  });
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 220, margin: 1 });
  res.json({ success: true, qrDataUrl, manualKey: secret });
}));

router.post('/mfa/setup-confirm', mfaLimiter, handle(async (req, res) => {
  const { admin, viaMfaToken } = await resolveMfaOrAdmin(req);
  const code = String(req.body?.code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) throw httpError(400, 'Enter the 6-digit code from your authenticator app.');

  const secret = decryptSecret(admin.twoFactorSecret);
  if (!secret) throw httpError(400, '2FA setup has not been started. Generate a QR code first.');

  const check = verifySync({ secret, token: code });
  if (!check?.valid) throw httpError(400, 'Invalid authenticator code. Check your device clock and try again.');

  const { plain, hashed } = generateBackupCodes(8);
  admin.twoFactorEnabled = true;
  admin.twoFactorVerified = true;
  admin.twoFactorBackupCodes = hashed;
  await admin.save();
  invalidateAdminCache(String(admin._id));

  req.admin = { id: String(admin._id), name: admin.name, role: admin.role };
  await audit(req, 'admin.mfa_enabled', { targetType: 'admin', targetId: admin._id, targetLabel: admin.username });

  if (viaMfaToken) {
    const session = await issueAdminSession(admin, { ip: req.ip });
    return res.json({ success: true, backupCodes: plain, ...session });
  }
  res.json({ success: true, backupCodes: plain });
}));

router.post('/mfa/verify', mfaLimiter, handle(async (req, res) => {
  const mfaToken = String(req.body?.mfaToken || '').trim();
  const code = String(req.body?.code || '').trim().toUpperCase();
  const admin = await verifyMfaToken(mfaToken);
  if (!admin) throw httpError(401, 'Your verification session expired. Please sign in again.');
  if (!admin.twoFactorVerified || !admin.twoFactorSecret) {
    throw httpError(400, '2FA is not configured yet. Complete setup first.');
  }

  let verified = false;
  let usedBackup = false;

  if (/^\d{6}$/.test(code)) {
    const secret = decryptSecret(admin.twoFactorSecret);
    const check = secret ? verifySync({ secret, token: code }) : null;
    verified = !!check?.valid;
  } else {
    const cleanBackup = code.replace(/[^A-Z0-9]/g, '');
    if (cleanBackup.length >= 6) {
      const targetHash = hashToken(cleanBackup);
      const entry = (admin.twoFactorBackupCodes || []).find((b) => !b.used && b.hash === targetHash);
      if (entry) {
        entry.used = true;
        entry.usedAt = new Date();
        verified = true;
        usedBackup = true;
      }
    }
  }

  if (!verified) {
    req.admin = { id: String(admin._id), name: admin.name, role: admin.role };
    await audit(req, 'admin.mfa_failed', { targetType: 'admin', targetId: admin._id, targetLabel: admin.username });
    throw httpError(400, 'Invalid 2FA code or recovery code.');
  }

  const session = await issueAdminSession(admin, { ip: req.ip });
  req.admin = session.admin;
  await audit(req, 'admin.login', { targetType: 'admin', targetId: admin._id, targetLabel: admin.username, details: { method: usedBackup ? 'backup_code' : 'totp' } });
  res.json({ success: true, ...session });
}));

// ── Email OTP Backup ─────────────────────────────────────────────────────────

router.post('/mfa/email-otp/send', mfaLimiter, handle(async (req, res) => {
  const admin = await verifyMfaToken(String(req.body?.mfaToken || '').trim());
  if (!admin) throw httpError(401, 'Your verification session expired. Please sign in again.');
  if (!admin.email) throw httpError(400, 'No email address is configured on this account.');

  pruneExpired(emailOtpStore);
  const otp = String(crypto.randomInt(100000, 999999));
  emailOtpStore.set(String(admin._id), {
    hash: hashToken(otp),
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0
  });

  if (emailConfigured()) {
    await sendEmail({
      to: admin.email,
      subject: `${otp} is your CVMind Admin verification code`,
      html: renderEmail({
        preheader: `Your one-time admin verification code is ${otp}`,
        eyebrow: 'Admin Panel v3 Security',
        title: 'Two-factor verification code',
        greetingName: admin.name || admin.username,
        body: `Use this 6-digit code to finish signing in to the CVMind Admin Panel:\n\n${otp}`,
        note: 'This code expires in 5 minutes. If you did not try to sign in, rotate your password immediately.',
        footerReason: 'Mandatory 2FA verification for CVMind Admin Panel.'
      })
    });
  }

  res.json({
    success: true,
    maskedEmail: maskEmail(admin.email),
    ...(process.env.NODE_ENV !== 'production' && !emailConfigured() ? { devOtp: otp } : {})
  });
}));

router.post('/mfa/email-otp/verify', mfaLimiter, handle(async (req, res) => {
  const admin = await verifyMfaToken(String(req.body?.mfaToken || '').trim());
  if (!admin) throw httpError(401, 'Your verification session expired. Please sign in again.');
  const otp = String(req.body?.otp || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(otp)) throw httpError(400, 'Enter the 6-digit code sent to your email.');

  const key = String(admin._id);
  const entry = emailOtpStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    emailOtpStore.delete(key);
    throw httpError(400, 'That email code has expired. Request a new one.');
  }

  entry.attempts += 1;
  if (entry.attempts > 3) {
    emailOtpStore.delete(key);
    throw httpError(400, 'Too many wrong attempts. Request a new email code.');
  }

  const a = Buffer.from(entry.hash);
  const b = Buffer.from(hashToken(otp));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw httpError(400, 'Invalid email verification code.');
  }

  emailOtpStore.delete(key);
  const session = await issueAdminSession(admin, { ip: req.ip });
  req.admin = session.admin;
  await audit(req, 'admin.login', { targetType: 'admin', targetId: admin._id, targetLabel: admin.username, details: { method: 'email_otp' } });
  res.json({ success: true, ...session });
}));

// ── Email-Based Password Reset ("change it from mail") ───────────────────────

router.post('/forgot-password', mfaLimiter, handle(async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim().toLowerCase();
  const genericOk = { success: true, message: 'If this account is authorized, a password reset link has been sent to its registered email.' };
  const trioMatch = findTrioMemberByIdentifier(identifier);
  if (!trioMatch) return res.json(genericOk);

  const admin = await AdminUser.findOne({ email: trioMatch.email.toLowerCase() });
  if (!admin || !isTrioAdmin(admin)) return res.json(genericOk);

  const resetToken = signToken({
    sub: String(admin._id),
    kind: 'admin_pw_reset',
    email: admin.email,
    ttlMs: 15 * 60 * 1000,
    jti: `v${admin.tokenVersion || 0}`
  });

  const origin = requestOrigin(req);
  const resetUrl = `${origin.replace(/\/$/, '')}/admin?resetToken=${encodeURIComponent(resetToken)}`;

  if (emailConfigured()) {
    await sendEmail({
      to: admin.email,
      subject: 'Reset your CVMind Admin Panel password',
      html: renderEmail({
        preheader: 'Use this secure link to change your CVMind Admin password.',
        eyebrow: 'Admin Security',
        title: 'Reset your admin password',
        greetingName: admin.name || admin.username,
        body: `We received a request to change the password for your CVMind Admin account (${admin.username}).`,
        ctaLabel: 'Change Admin Password',
        ctaUrl: resetUrl,
        note: 'This link expires in 15 minutes and signs you out of all other devices once used.',
        footerReason: 'Requested for an authorized CVMind Admin account.'
      })
    });
  }

  req.admin = { id: String(admin._id), name: admin.name, role: admin.role };
  await audit(req, 'admin.password_reset_requested', { targetType: 'admin', targetId: admin._id, targetLabel: admin.username });

  res.json({
    ...genericOk,
    ...(process.env.NODE_ENV !== 'production' && !emailConfigured() ? { devResetToken: resetToken } : {})
  });
}));

router.post('/reset-password', mfaLimiter, handle(async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword || '');
  if (newPassword.length < 14) throw httpError(400, 'Use at least 14 characters for your new admin password.');

  const payload = verifyToken(token);
  if (!payload || payload.kind !== 'admin_pw_reset') {
    throw httpError(400, 'This password reset link is invalid or has expired.');
  }

  const admin = await AdminUser.findById(payload.sub);
  if (!admin || !isTrioAdmin(admin) || payload.jti !== `v${admin.tokenVersion || 0}`) {
    throw httpError(400, 'This password reset link is no longer valid.');
  }

  admin.passwordHash = await bcrypt.hash(newPassword, 12);
  admin.mustChangePassword = false;
  admin.failedLoginAttempts = 0;
  admin.lockUntil = null;
  endOtherSessions(admin);
  await admin.save();
  invalidateAdminCache(String(admin._id));

  req.admin = { id: String(admin._id), name: admin.name, role: admin.role };
  await audit(req, 'admin.password_changed_via_email', { targetType: 'admin', targetId: admin._id, targetLabel: admin.username });
  res.json({ success: true, message: 'Password updated. Please sign in with your new password and 2FA.' });
}));

// ── Session Revocation ───────────────────────────────────────────────────────

router.post('/me/revoke-sessions', requireAdmin(), handle(async (req, res) => {
  const admin = await AdminUser.findById(req.admin.id);
  if (!admin) throw httpError(404, 'Admin not found.');
  endOtherSessions(admin);
  await admin.save();
  invalidateAdminCache(String(admin._id));
  await audit(req, 'admin.sessions_revoked', { targetType: 'admin', targetId: admin._id, targetLabel: admin.username });
  res.json({ success: true, token: renewCurrentToken(admin, req) });
}));

export default router;

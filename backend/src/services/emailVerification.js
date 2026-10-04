import crypto from 'crypto';
import { updateUserFields, findUserByVerificationHash } from '../db.js';
import { emailConfigured, sendEmail } from '../admin/mailer.js';
import { verificationEmail } from './emailTemplates.js';
import { invalidateSessionCache } from '../admin/sessions.js';

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;

export const VERIFY_MESSAGES = {
  EXPIRED: 'This verification link has expired. Please request a new verification email.',
  INVALID: 'This verification link is invalid or has already been used.',
  ALREADY_VERIFIED: 'Your email address is already verified.',
  TOO_MANY: 'Too many verification attempts. Please try again later.',
  SEND_FAILED: "We couldn't send the verification email right now. Please try again later.",
  RESEND_LIMIT: "You've requested too many verification emails. Please try again later.",
  NOT_VERIFIED: 'Please verify your email before contacting CVMind Support.'
};

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const userId = (user) => String(user.id || user._id);

// Links always point at our own site, never at the request's Origin header
export function frontendUrl() {
  return (process.env.FRONTEND_URL || 'https://www.cvmind.in').replace(/\/$/, '');
}

// Issues a new single-use link (the previous one stops working) and emails it.
// Returns { sent }; a failed send never throws, so sign-up still completes.
export async function issueVerification(user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  await updateUserFields(userId(user), {
    emailVerificationTokenHash: hashToken(token),
    emailVerificationExpires: new Date(now.getTime() + VERIFICATION_TTL_MS),
    lastVerificationSentAt: now
  });

  const link = `${frontendUrl()}/verify-email?token=${token}`;
  if (!emailConfigured()) {
    // Local development without Resend: the link is in the server log instead
    if (process.env.NODE_ENV !== 'production') console.warn(`[verify email] RESEND_API_KEY not set. Link for ${user.email}: ${link}`);
    return { sent: false };
  }
  try {
    await sendEmail({ to: user.email, ...verificationEmail({ name: user.name, link }) });
    return { sent: true };
  } catch (err) {
    console.error('[verify email] send failed:', err.message);
    // Local development with a broken key: the link is in the server log so testing can go on
    if (process.env.NODE_ENV !== 'production') console.warn(`[verify email] Link for ${user.email}: ${link}`);
    return { sent: false };
  }
}

// Seconds until another verification email may be sent, from the per-account cooldown
export function resendCooldown(user) {
  const last = user.lastVerificationSentAt ? new Date(user.lastVerificationSentAt).getTime() : 0;
  return Math.max(0, Math.ceil((last + RESEND_COOLDOWN_MS - Date.now()) / 1000));
}

export async function markEmailVerified(user) {
  await updateUserFields(userId(user), {
    emailVerified: true,
    emailVerifiedAt: new Date(),
    emailVerificationTokenHash: '',
    emailVerificationExpires: null,
    verificationFailures: 0
  });
  invalidateSessionCache(userId(user));
}

// Checks a link token: { ok: true, user } or { ok: false, code, user? }
export async function verifyEmailToken(token) {
  const clean = String(token || '').trim();
  if (!clean || clean.length > 200) return { ok: false, code: 'INVALID' };
  const user = await findUserByVerificationHash(hashToken(clean));
  if (!user) return { ok: false, code: 'INVALID' };
  if (user.emailVerified) {
    await updateUserFields(userId(user), { emailVerificationTokenHash: '', emailVerificationExpires: null });
    return { ok: false, code: 'ALREADY_VERIFIED', user };
  }
  const expires = user.emailVerificationExpires ? new Date(user.emailVerificationExpires).getTime() : 0;
  if (expires <= Date.now()) {
    await updateUserFields(userId(user), { verificationFailures: Number(user.verificationFailures || 0) + 1 });
    return { ok: false, code: 'EXPIRED', user };
  }
  await markEmailVerified(user);
  return { ok: true, user };
}

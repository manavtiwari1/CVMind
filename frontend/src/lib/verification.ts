import { API_BASE } from './apiBase';
import { authFetch } from './authFetch';
import { readUser, saveUser } from './currentUser';
import type { StoredUser } from '../types/api';

// Client side of email verification (backend: /api/auth/verify-email, resend-verification, change-email)

export interface VerifyResult {
  ok: boolean;
  code: 'VERIFIED' | 'ALREADY_VERIFIED' | 'EXPIRED' | 'INVALID' | 'TOO_MANY' | 'ERROR';
  message: string;
  email?: string;
}

interface ApiReply {
  success?: boolean;
  code?: string;
  error?: string;
  message?: string;
  email?: string;
  retryAfter?: number;
  user?: StoredUser;
  emailVerified?: boolean;
  verificationEmailSent?: boolean;
}

async function post(path: string, body?: unknown, signedIn = true): Promise<{ res: Response; data: ApiReply }> {
  const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined };
  const res = signedIn ? await authFetch(`${API_BASE}${path}`, init) : await fetch(`${API_BASE}${path}`, init);
  const data: ApiReply = await res.json().catch(() => ({}));
  return { res, data };
}

export const needsVerification = (user: StoredUser | null) => Boolean(user && user.emailVerified === false);

// Marks the stored session verified when the account it belongs to was the one verified
export function markSessionVerified(email?: string) {
  const user = readUser();
  if (user && (!email || user.email?.toLowerCase() === email.toLowerCase()) && user.emailVerified !== true) {
    saveUser({ ...user, emailVerified: true });
  }
}

export async function verifyEmail(token: string): Promise<VerifyResult> {
  try {
    const { res, data } = await post('/api/auth/verify-email', { token }, false);
    if (res.ok) {
      markSessionVerified(data.email);
      return { ok: true, code: (data.code as VerifyResult['code']) || 'VERIFIED', message: data.message || '', email: data.email };
    }
    return { ok: false, code: (data.code as VerifyResult['code']) || 'ERROR', message: data.error || 'Email verification failed. Please try again.' };
  } catch {
    return { ok: false, code: 'ERROR', message: 'We could not reach CVMind. Check your connection and try again.' };
  }
}

// { ok, message, retryAfter } where retryAfter is the seconds until the next resend is allowed
export async function resendVerification(): Promise<{ ok: boolean; message: string; retryAfter: number; alreadyVerified?: boolean; cooldown?: boolean }> {
  try {
    const { res, data } = await post('/api/auth/resend-verification');
    if (data.code === 'ALREADY_VERIFIED') {
      markSessionVerified();
      return { ok: true, message: data.message || '', retryAfter: 0, alreadyVerified: true };
    }
    return { ok: res.ok, message: (res.ok ? data.message : data.error) || '', retryAfter: data.retryAfter || 0, cooldown: data.code === 'COOLDOWN' };
  } catch {
    return { ok: false, message: "We couldn't send the verification email right now. Please try again later.", retryAfter: 0 };
  }
}

export async function changeEmail(email: string): Promise<{ ok: boolean; message: string; retryAfter: number }> {
  try {
    const { res, data } = await post('/api/auth/change-email', { email });
    if (!res.ok) return { ok: false, message: data.error || 'Could not change your email address.', retryAfter: data.retryAfter || 0 };
    if (data.user) {
      const current = readUser();
      saveUser({ ...current, ...data.user });
    }
    return { ok: true, message: `We've sent a verification link to ${data.user?.email || email}.`, retryAfter: data.retryAfter || 60 };
  } catch {
    return { ok: false, message: 'We could not reach CVMind. Check your connection and try again.', retryAfter: 0 };
  }
}

// Asks the server whether the signed-in account is verified yet (e.g. the link was opened on a phone).
// Updates the stored session and returns the flag, or null when it couldn't tell.
export async function refreshVerification(): Promise<boolean | null> {
  const user = readUser();
  if (!user?.email || !user.token) return null;
  try {
    const res = await authFetch(`${API_BASE}/api/auth/account-status?email=${encodeURIComponent(user.email)}`);
    const data: { emailVerified?: boolean } = await res.json();
    if (typeof data.emailVerified !== 'boolean') return null;
    if (data.emailVerified !== user.emailVerified) saveUser({ ...user, emailVerified: data.emailVerified });
    return data.emailVerified;
  } catch {
    return null;
  }
}

// The webmail inbox for common providers, otherwise the mail app
export function inboxLink(email = ''): string {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (['gmail.com', 'googlemail.com'].includes(domain)) return 'https://mail.google.com/mail/u/0/#inbox';
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) return 'https://outlook.live.com/mail/0/';
  if (domain.startsWith('yahoo.')) return 'https://mail.yahoo.com/';
  if (['icloud.com', 'me.com', 'mac.com'].includes(domain)) return 'https://www.icloud.com/mail';
  if (['proton.me', 'protonmail.com'].includes(domain)) return 'https://mail.proton.me/';
  return 'mailto:';
}

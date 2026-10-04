import { AuthEvent } from '../admin/models.js';
import { dbReady } from '../admin/auth.js';

export const AUTH_EVENTS = [
  'USER_REGISTERED',
  'VERIFICATION_EMAIL_SENT',
  'VERIFICATION_EMAIL_RESENT',
  'EMAIL_VERIFIED',
  'VERIFICATION_FAILED',
  'VERIFICATION_EXPIRED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'SUPPORT_TICKET_CREATED',
  'RATE_LIMIT_TRIGGERED',
  'ACCOUNT_SUSPENDED'
];

// Records a security event for the admin panel. Fire-and-forget: a failed write is logged, never thrown.
// metadata must not carry passwords, tokens or message contents.
export function logAuthEvent(req, event, { userId = '', email = '', metadata = null } = {}) {
  (async () => {
    if (!(await dbReady(0))) return;
    await AuthEvent.create({
      userId: String(userId || ''),
      email: String(email || '').trim().toLowerCase(),
      event,
      ip: String(req?.ip || ''),
      userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 300),
      metadata
    });
  })().catch((err) => console.error('[auth events] write failed:', err.message));
}

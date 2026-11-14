import mongoose from 'mongoose';
import { dbReady } from '../admin/auth.js';
import { AppSetting, Coupon } from '../admin/models.js';
import { sendEmailBatch, emailConfigured } from '../admin/mailer.js';
import { Subscription } from '../billing/models.js';
import { blackFridayEmail, BLACK_FRIDAY_EMAIL } from './emailTemplates.js';
import { optOutFields, withoutOptedOut } from './emailOptOut.js';

// Black Friday week 2026: 19 Nov, 12:00 am IST → 30 Nov, 11:59 pm IST (IST = UTC+5:30).
// The site banners use the same dates (frontend/src/lib/festive.ts).
export const SALE_START = new Date(Date.UTC(2026, 10, 18, 18, 30));
export const SALE_END = new Date(Date.UTC(2026, 10, 30, 18, 30));
const HOUR = 60 * 60 * 1000;
export const MAIL_EVERY = 48 * HOUR;

// ── The coupon ──────────────────────────────────────────────────────────────
// Created once if it isn't in the database yet; an admin can still edit or switch it off in the
// admin panel (Coupons), and this never overwrites those changes.
export async function ensureBlackFridayCoupon() {
  if (!(await dbReady(5000))) return null;
  const existing = await Coupon.findOne({ code: BLACK_FRIDAY_EMAIL.code }).lean();
  if (existing) return existing;
  try {
    const coupon = await Coupon.create({
      code: BLACK_FRIDAY_EMAIL.code,
      description: 'Black Friday week 2026: 50% off any Pro plan, 19–30 Nov IST',
      type: 'percent',
      value: 50,
      perUserLimit: 1,
      validFrom: SALE_START,
      validTo: SALE_END,
      active: true,
      createdBy: 'system (Black Friday)'
    });
    console.log('[black friday] created the BLACKFRIDAY coupon');
    return coupon;
  } catch (err) {
    // Another server instance made it first
    return Coupon.findOne({ code: BLACK_FRIDAY_EMAIL.code }).lean();
  }
}

// ── The emails ──────────────────────────────────────────────────────────────
// One email every 48 hours from the start of the sale: 19, 21, 23, 25, 27 and 29 Nov at midnight IST
// (or the first check after it). Each round is claimed in AppSetting before sending, so a restart or a
// second server can't send the same round twice. A round that was missed entirely is skipped, not
// sent late in a pile.

/** Which round is due now, or -1 outside the sale. */
export function currentRound(now = Date.now()) {
  if (now < SALE_START.getTime() || now >= SALE_END.getTime()) return -1;
  return Math.floor((now - SALE_START.getTime()) / MAIL_EVERY);
}

const roundKey = (round) => `black-friday-2026-mail-${round}`;

// Verified, active accounts that still want offers and don't already have Pro
async function recipients() {
  const User = mongoose.model('User');
  const users = await User.find({ emailVerified: true, status: { $nin: ['suspended', 'banned'] } }).select('name email').lean();
  const pro = new Set((await Subscription.find({ status: 'active', expiresAt: { $gt: new Date() } }).select('email').lean())
    .map((s) => String(s.email || '').toLowerCase()));
  return withoutOptedOut(users.filter((u) => u.email && !pro.has(String(u.email).toLowerCase())));
}

export async function runBlackFridayMail({ now = Date.now(), send = sendEmailBatch } = {}) {
  const round = currentRound(now);
  if (round < 0) return { skipped: 'outside the sale' };
  if (!emailConfigured() && send === sendEmailBatch) return { skipped: 'email is not configured (RESEND_API_KEY)' };
  if (!(await dbReady(5000))) return { skipped: 'database not ready' };

  const key = roundKey(round);
  if (await AppSetting.findOne({ key }).lean()) return { skipped: `round ${round} already sent` };
  try {
    await AppSetting.create({ key, value: { status: 'sending', startedAt: new Date(now).toISOString() }, updatedBy: 'black-friday' });
  } catch {
    return { skipped: `round ${round} claimed by another server` };
  }

  const users = await recipients();
  const messages = users.map((user) => {
    const { url, headers } = optOutFields(user.email);
    return { to: user.email, headers, ...blackFridayEmail({ name: user.name, round, unsubscribeUrl: url }) };
  });
  const result = messages.length ? await send(messages) : { sent: 0, failed: 0, errors: [] };
  for (const e of result.errors || []) console.error('[black friday] email failed for', (e.to || []).join(', '), e.message);
  await AppSetting.updateOne({ key }, { value: { status: 'sent', round, sent: result.sent, failed: result.failed, at: new Date().toISOString() } });
  console.log(`[black friday] round ${round}: sent ${result.sent}, failed ${result.failed}`);
  return { round, sent: result.sent, failed: result.failed };
}

let timer = null;

// Checks every 10 minutes while the server runs. Serverless hosts call /api/cron/black-friday instead.
export function startBlackFriday() {
  if (timer || Date.now() >= SALE_END.getTime()) return;
  ensureBlackFridayCoupon().catch((err) => console.error('[black friday] coupon setup failed:', err.message));
  const tick = () => runBlackFridayMail()
    .catch((err) => console.error('[black friday] mail run failed:', err.message));
  timer = setInterval(tick, 10 * 60 * 1000);
  timer.unref?.();
  setTimeout(tick, 60 * 1000).unref?.();
}

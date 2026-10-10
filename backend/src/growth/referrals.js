import crypto from 'crypto';
import mongoose from 'mongoose';
import { RISK_HIGH } from '../services/emailRisk.js';
import { ReferralCode, Referral, ApplyCredit } from './models.js';

// Invite friends, earn applies. Each account has a code (cvmind.in/?ref=CODE). A friend who signs up
// with it and verifies their email earns both people one extra AI Job Finder application.
// Rewards need a verified, non-disposable, low-risk friend account, and are capped per month.

export const MAX_REWARDS_PER_MONTH = 5;
export const CREDIT_DAYS = 60;
// A code only counts for an account created recently, so an old account can't claim one later
const CLAIM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
// No 0/O or 1/I/L, so codes read cleanly when shared out loud
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^[A-Z0-9]{4,12}$/;

const User = () => mongoose.model('User');

function randomCode(length = 7) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export async function codeFor(userId, email) {
  const existing = await ReferralCode.findOne({ userId: String(userId) }).lean();
  if (existing) return existing.code;
  for (let i = 0; i < 6; i++) {
    try {
      const row = await ReferralCode.create({ userId: String(userId), email: String(email).toLowerCase(), code: randomCode() });
      return row.code;
    } catch (err) {
      if (err.code !== 11000) throw err;
      const mine = await ReferralCode.findOne({ userId: String(userId) }).lean();
      if (mine) return mine.code;
    }
  }
  throw new Error('Could not create an invite code. Please try again.');
}

const mask = (email) => {
  const [name, domain] = String(email).split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(name.length - 2, 1))}@${domain || ''}`;
};

/** The invite page: code, rewards and the people invited */
export async function referralSummary(userId, email) {
  const code = await codeFor(userId, email);
  const [rows, credits] = await Promise.all([
    Referral.find({ referrerId: String(userId) }).sort({ createdAt: -1 }).limit(50).lean(),
    ApplyCredit.find({ email: String(email).toLowerCase() }).lean()
  ]);
  const now = Date.now();
  return {
    code,
    rewardsThisMonth: rows.filter((r) => r.status === 'qualified' && r.qualifiedAt && now - new Date(r.qualifiedAt).getTime() < MONTH_MS).length,
    maxRewardsPerMonth: MAX_REWARDS_PER_MONTH,
    credits: {
      available: credits.filter((c) => !c.usedAt && new Date(c.expiresAt).getTime() > now).length,
      used: credits.filter((c) => c.usedAt).length,
      nextExpiry: credits.filter((c) => !c.usedAt && new Date(c.expiresAt).getTime() > now).map((c) => c.expiresAt).sort()[0] || null
    },
    invites: rows.map((r) => ({ email: mask(r.friendEmail), status: r.status, reason: r.status === 'rejected' ? r.reason : '', createdAt: r.createdAt, qualifiedAt: r.qualifiedAt }))
  };
}

/**
 * Called by a new account once it is signed in, with the code it arrived with. Records who
 * invited it; the reward waits for the friend's email to be verified (qualify below).
 */
export async function claimReferral(friend, rawCode, now = new Date()) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return { ok: false, reason: 'invalid-code' };
  const owner = await ReferralCode.findOne({ code }).lean();
  if (!owner) return { ok: false, reason: 'invalid-code' };
  const friendId = String(friend._id ?? friend.id);
  if (owner.userId === friendId || owner.email === String(friend.email).toLowerCase()) return { ok: false, reason: 'own-code' };
  if (now - new Date(friend.createdAt).getTime() > CLAIM_WINDOW_MS) return { ok: false, reason: 'not-new' };
  if (await Referral.exists({ friendUserId: friendId })) return { ok: false, reason: 'already-claimed' };
  try {
    await Referral.create({ referrerId: owner.userId, referrerEmail: owner.email, friendUserId: friendId, friendEmail: String(friend.email).toLowerCase(), code, createdAt: now });
  } catch (err) {
    if (err.code === 11000) return { ok: false, reason: 'already-claimed' };
    throw err;
  }
  // Google/GitHub/LinkedIn accounts are verified at sign-up, so they can qualify straight away
  const qualified = friend.emailVerified ? await qualifyReferral(friendId, now) : null;
  return { ok: true, status: qualified?.status || 'signed_up' };
}

const credit = (email, userId, referralId, now) => ({
  email: String(email).toLowerCase(),
  userId: String(userId),
  source: 'referral',
  referralId: String(referralId),
  expiresAt: new Date(now.getTime() + CREDIT_DAYS * 24 * 60 * 60 * 1000),
  createdAt: now
});

/** Gives both people their credit once the friend's email is verified. Safe to call more than once. */
export async function qualifyReferral(friendUserId, now = new Date()) {
  if (mongoose.connection.readyState !== 1) return null;
  const referral = await Referral.findOne({ friendUserId: String(friendUserId), status: 'signed_up' }).lean();
  if (!referral) return null;
  const friend = await User().findById(friendUserId, { email: 1, emailVerified: 1, riskScore: 1, riskFlags: 1, status: 1 }).lean();
  if (!friend?.emailVerified) return { status: 'signed_up' };

  const reject = async (reason) => {
    await Referral.updateOne({ _id: referral._id, status: 'signed_up' }, { $set: { status: 'rejected', reason } });
    return { status: 'rejected', reason };
  };
  if (friend.status !== 'active') return reject('Account not active');
  if ((friend.riskFlags || []).includes('disposable_email') || Number(friend.riskScore || 0) >= RISK_HIGH) return reject('Email address not accepted for rewards');
  const recent = await Referral.countDocuments({ referrerId: referral.referrerId, status: 'qualified', qualifiedAt: { $gt: new Date(now.getTime() - MONTH_MS) } });
  if (recent >= MAX_REWARDS_PER_MONTH) return reject(`Monthly limit of ${MAX_REWARDS_PER_MONTH} rewards reached`);

  const won = await Referral.updateOne({ _id: referral._id, status: 'signed_up' }, { $set: { status: 'qualified', qualifiedAt: now } });
  if (!won.modifiedCount) return { status: 'qualified' };
  await ApplyCredit.insertMany([
    credit(referral.referrerEmail, referral.referrerId, referral._id, now),
    credit(friend.email, friendUserId, referral._id, now)
  ]);
  return { status: 'qualified' };
}

/** Unused, unexpired credits for an email */
export function availableCredits(email, now = new Date()) {
  return ApplyCredit.countDocuments({ email: String(email).toLowerCase(), usedAt: null, expiresAt: { $gt: now } });
}

/** Uses the credit that expires first; false when there is none */
export async function useCredit(email, now = new Date()) {
  const row = await ApplyCredit.findOneAndUpdate(
    { email: String(email).toLowerCase(), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { sort: { expiresAt: 1 }, returnDocument: 'after' }
  ).lean();
  return Boolean(row);
}

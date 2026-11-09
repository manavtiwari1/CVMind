// Unsubscribing from CVMind's updates and offers. Only those emails: password resets, invoices,
// support replies and other account messages still arrive. Job alerts have their own switch.
// A link is the address plus a signature, so it needs no sign-in and can't be made for someone else.

import crypto from 'node:crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

const optOutSchema = new Schema({
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
export const EmailOptOut = mongoose.models.EmailOptOut || mongoose.model('EmailOptOut', optOutSchema);

const BACKEND = () => (process.env.BACKEND_PUBLIC_URL || 'https://cvmindai-backend.onrender.com').replace(/\/$/, '');
const norm = (email) => String(email || '').trim().toLowerCase();

function signature(email) {
  const secret = process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'cvmind-dev-only-secret-change-me');
  if (!secret) throw new Error('AUTH_SECRET must be set in production.');
  return crypto.createHmac('sha256', secret).update(`email-opt-out:${email}`).digest('base64url').slice(0, 32);
}

export function unsubscribeToken(email) {
  const clean = norm(email);
  return `${Buffer.from(clean).toString('base64url')}.${signature(clean)}`;
}

/** The address a link belongs to, or null when the link has been altered. */
export function emailFromToken(token) {
  const [encoded, given = ''] = String(token || '').slice(0, 500).split('.');
  if (!encoded) return null;
  const email = norm(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!email.includes('@')) return null;
  const a = Buffer.from(given);
  const b = Buffer.from(signature(email));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? email : null;
}

export const optOutUrl = (email) => `${BACKEND()}/api/email/unsubscribe/${unsubscribeToken(email)}`;

// The link for the email's footer and the headers mail apps use for their own Unsubscribe button
export function optOutFields(email) {
  const url = optOutUrl(email);
  return { url, headers: { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
}

export const optOut = (email) => EmailOptOut.updateOne({ email: norm(email) }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
export const optIn = (email) => EmailOptOut.deleteOne({ email: norm(email) });
export const isOptedOut = async (email) => Boolean(await EmailOptOut.exists({ email: norm(email) }));

export const optedOutEmails = async () => (await EmailOptOut.find({}, { email: 1 }).lean()).map((row) => row.email);

/** The users who still want updates and offers. */
export async function withoutOptedOut(users) {
  const out = new Set(await optedOutEmails());
  return users.filter((user) => !out.has(norm(user.email)));
}

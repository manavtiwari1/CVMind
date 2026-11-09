// Reminders the user asked Leo for, such as "remind me the day before my interview". Each one is a
// single email to the user's own address, and a Cancel button is its off switch.

import { LeoReminder } from './models.js';
import { emailConfigured, sendEmail } from '../admin/mailer.js';
import { leoReminderEmail } from '../services/emailTemplates.js';
import { clip } from './toolHelpers.js';

const MAX_OPEN = 10;
const MAX_AHEAD_MS = 180 * 24 * 60 * 60 * 1000;

const toClient = (r) => ({ id: String(r._id), text: r.text, dueAt: r.dueAt });

export const openReminders = async (userId) => (await LeoReminder.find({ userId, sentAt: null, cancelledAt: null }).sort({ dueAt: 1 }).limit(MAX_OPEN).lean()).map(toClient);

// Returns the saved reminder, or { problem } with what to tell the user
export async function createReminder({ userId, email, name, text, when, now = new Date() }) {
  const clean = clip(text, 300);
  const dueAt = new Date(when);
  if (!clean) return { problem: 'What should I remind them about?' };
  if (Number.isNaN(dueAt.getTime()) || dueAt <= now) return { problem: 'The time must be in the future.' };
  if (dueAt.getTime() - now.getTime() > MAX_AHEAD_MS) return { problem: 'Reminders can be at most 6 months ahead.' };
  if (await LeoReminder.countDocuments({ userId, sentAt: null, cancelledAt: null }) >= MAX_OPEN) return { problem: `They already have ${MAX_OPEN} reminders set. Ask them to cancel one first.` };
  return { reminder: toClient(await LeoReminder.create({ userId, email, name: clip(name, 80), text: clean, dueAt })) };
}

export async function cancelReminder(userId, id) {
  const result = await LeoReminder.updateOne({ _id: id, userId, sentAt: null, cancelledAt: null }, { $set: { cancelledAt: new Date() } });
  return result.matchedCount > 0;
}

/** Sends what is due. Each reminder is claimed first, so two servers never send it twice. */
export async function sendDueReminders({ now = new Date(), send = sendEmail, limit = 100 } = {}) {
  if (send === sendEmail && !emailConfigured()) return 0;
  const due = await LeoReminder.find({ dueAt: { $lte: now }, sentAt: null, cancelledAt: null }).sort({ dueAt: 1 }).limit(limit).lean();
  let sent = 0;
  for (const reminder of due) {
    const claimed = await LeoReminder.updateOne({ _id: reminder._id, sentAt: null, cancelledAt: null }, { $set: { sentAt: now } });
    if (!claimed.modifiedCount) continue;
    try {
      await send({ to: reminder.email, ...leoReminderEmail({ name: reminder.name, text: reminder.text }) });
      sent += 1;
    } catch (err) {
      // Put it back, so the next pass tries again
      await LeoReminder.updateOne({ _id: reminder._id }, { $set: { sentAt: null } });
      console.error('[leo] reminder email failed:', err.message);
    }
  }
  return sent;
}

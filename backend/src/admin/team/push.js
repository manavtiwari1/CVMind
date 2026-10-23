import webpush from 'web-push';
import { AdminUser } from '../models.js';
import { TeamPushSubscription } from './models.js';

// Browser push (Web Push with VAPID keys). Without the keys push is off and everything else works.
// Generate keys once with `npx web-push generate-vapid-keys`.
const env = () => ({
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: process.env.VAPID_SUBJECT || 'mailto:support@cvmind.in'
});

export const pushConfigured = () => !!(env().publicKey && env().privateKey);
export const pushPublicKey = () => (pushConfigured() ? env().publicKey : '');

// Tests swap in a fake sender
let sender = (subscription, body) => {
  const { publicKey, privateKey, subject } = env();
  return webpush.sendNotification(subscription, body, { vapidDetails: { subject, publicKey, privateKey }, TTL: 24 * 60 * 60, urgency: 'high' });
};
export const setPushSender = (fn) => { sender = fn; };

// Sends one message to every device of each person who has push on. Devices the push service
// says are gone (404/410) are forgotten.
export async function sendPush(messages) {
  if (!pushConfigured() || !messages.length) return { sent: 0 };
  const ids = [...new Set(messages.map((m) => String(m.adminId)))];
  const [people, subs] = await Promise.all([
    AdminUser.find({ _id: { $in: ids }, notifyPush: { $ne: false }, active: true, chatAccess: { $ne: false } }, { _id: 1 }).lean(),
    TeamPushSubscription.find({ adminId: { $in: ids } }).lean()
  ]);
  const wants = new Set(people.map((p) => String(p._id)));
  let sent = 0;
  await Promise.all(messages.filter((m) => wants.has(String(m.adminId))).flatMap((m) =>
    subs.filter((s) => String(s.adminId) === String(m.adminId)).map(async (s) => {
      try {
        await sender({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(m.payload));
        sent += 1;
        await TeamPushSubscription.updateOne({ _id: s._id }, { lastUsedAt: new Date() });
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) await TeamPushSubscription.deleteOne({ _id: s._id });
        else console.error('[team] push failed:', err?.statusCode || '', err?.message);
      }
    })
  ));
  return { sent };
}

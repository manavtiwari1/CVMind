import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { Notification } from '../models.js';
import { renderEmail, sendEmail, emailConfigured } from '../mailer.js';
import { FEATURE_LOGS } from './analytics.js';
import { model, clean, handle, httpError, paging, isEmail } from '../util.js';

const router = express.Router();
router.use(requireDb);

// Emails go out one by one through Resend, so a single send is capped
const MAX_EMAIL_RECIPIENTS = 500;

// Segment → Mongo filter on User. An empty segment means everyone.
async function segmentFilter(segment = {}) {
  const filter = {};
  const and = [];
  if (['active', 'suspended', 'banned'].includes(segment.status)) {
    and.push(segment.status === 'active' ? { status: { $in: ['active', null] } } : { status: segment.status });
  }
  if (segment.provider) {
    and.push(segment.provider === 'google'
      ? { $or: [{ provider: 'google' }, { provider: { $in: ['', null] }, isGoogleUser: true }] }
      : segment.provider === 'password'
        ? { $or: [{ provider: 'password' }, { provider: { $in: ['', null] }, isGoogleUser: { $ne: true } }] }
        : { provider: clean(segment.provider, 20) });
  }
  const created = {};
  if (segment.signedUpFrom) created.$gte = new Date(segment.signedUpFrom);
  if (segment.signedUpTo) created.$lte = new Date(`${segment.signedUpTo}T23:59:59.999Z`);
  if (Object.keys(created).length) and.push({ createdAt: created });
  if (segment.usedFeature) {
    const feature = FEATURE_LOGS.find((f) => f.key === segment.usedFeature);
    if (!feature) throw httpError(400, 'Unknown feature.');
    const ids = (await model(feature.model).distinct('userId', { userId: { $gt: '' } })).filter((id) => /^[a-f0-9]{24}$/i.test(id));
    and.push({ _id: { $in: ids } });
  }
  if (Array.isArray(segment.emails) && segment.emails.length) {
    const emails = segment.emails.map((e) => clean(e, 120).toLowerCase()).filter(isEmail).slice(0, 1000);
    and.push({ email: { $in: emails } });
  }
  if (and.length) filter.$and = and;
  return filter;
}

const isEmptySegment = (segment) => !segment || Object.values(segment).every((v) => !v || (Array.isArray(v) && !v.length));

router.post('/preview', requireAdmin('notifications.send'), handle(async (req, res) => {
  const filter = await segmentFilter(req.body?.segment);
  const User = model('User');
  const [count, sample] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1 }).limit(5).select('name email').lean()
  ]);
  res.json({ success: true, data: { count, sample: sample.map((u) => ({ name: u.name, email: u.email })), emailConfigured: emailConfigured(), maxEmailRecipients: MAX_EMAIL_RECIPIENTS } });
}));

router.post('/', requireAdmin('notifications.send'), handle(async (req, res) => {
  const title = clean(req.body?.title, 120);
  const body = String(req.body?.body || '').trim().slice(0, 2000);
  const link = clean(req.body?.link, 500);
  const channels = (Array.isArray(req.body?.channels) ? req.body.channels : []).filter((c) => ['in-app', 'email'].includes(c));
  const segment = req.body?.segment || {};
  if (!title) throw httpError(400, 'Add a title.');
  if (!channels.length) throw httpError(400, 'Pick at least one channel.');
  if (link && !/^(https:\/\/|\/)/i.test(link)) throw httpError(400, 'The link must start with https:// or /');
  if (channels.includes('email') && !emailConfigured()) throw httpError(503, 'Email is not configured on this server (RESEND_API_KEY).');

  const everyone = isEmptySegment(segment);
  const filter = await segmentFilter(segment);
  const users = await model('User').find(filter).select('name email').lean();
  if (!users.length) throw httpError(400, 'No users match this audience.');
  if (channels.includes('email') && users.length > MAX_EMAIL_RECIPIENTS) {
    throw httpError(400, `Email can go to at most ${MAX_EMAIL_RECIPIENTS} people at a time. Narrow the audience or send in-app only.`);
  }

  const notification = await Notification.create({
    title,
    body,
    link,
    audience: everyone ? 'all' : 'segment',
    segment: everyone ? null : segment,
    userIds: everyone ? [] : users.map((u) => String(u._id)),
    channels,
    recipientCount: users.length,
    createdBy: req.admin.name
  });

  if (channels.includes('email')) {
    const ctaUrl = link.startsWith('/') ? `${(process.env.FRONTEND_URL || 'https://www.cvmind.in').replace(/\/$/, '')}${link}` : link;
    let sent = 0;
    let failed = 0;
    for (const user of users) {
      try {
        await sendEmail({ to: user.email, subject: title, html: renderEmail({ greetingName: user.name, body: body || title, ctaLabel: link ? 'Open CV Mind' : '', ctaUrl }) });
        sent++;
      } catch (err) {
        failed++;
        console.error('[notifications] email failed for', user.email, err.message);
      }
    }
    notification.emailSent = sent;
    notification.emailFailed = failed;
    await notification.save();
  }

  await audit(req, 'notification.sent', {
    targetType: 'notification', targetId: notification._id, targetLabel: title,
    details: { channels, audience: notification.audience, recipients: users.length, emailSent: notification.emailSent, emailFailed: notification.emailFailed }
  });
  res.json({ success: true, data: toNotification(notification.toObject()) });
}));

const toNotification = (n) => ({
  id: String(n._id),
  title: n.title,
  body: n.body,
  link: n.link,
  audience: n.audience,
  segment: n.segment,
  channels: n.channels,
  recipientCount: n.recipientCount,
  readCount: (n.readBy || []).length,
  emailSent: n.emailSent,
  emailFailed: n.emailFailed,
  createdBy: n.createdBy,
  createdAt: n.createdAt
});

router.get('/', requireAdmin('notifications.send'), handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const [rows, total] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit).select('-userIds').lean(),
    Notification.countDocuments()
  ]);
  res.json({ success: true, total, page, limit, data: rows.map(toNotification), features: FEATURE_LOGS.map(({ key, label }) => ({ key, label })) });
}));

router.delete('/:id', requireAdmin('notifications.send'), handle(async (req, res) => {
  const n = await Notification.findByIdAndDelete(req.params.id).lean();
  if (!n) throw httpError(404, 'Notification not found.');
  await audit(req, 'notification.withdrawn', { targetType: 'notification', targetId: n._id, targetLabel: n.title });
  res.json({ success: true });
}));

export default router;

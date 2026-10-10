import crypto from 'crypto';
import mongoose from 'mongoose';
import { getPreferences } from '@cvmind/auto-apply-agent/preferences/service.js';
import { buildFeed } from '../jobFinder/feed.js';
import { resumeForMatching } from '../jobFinder/resume.js';
import { isPro } from '../billing/service.js';
import { getSettings } from '../admin/settings.js';
import { hasProductAccess } from '../services/productGate.js';
import { sendEmailBatch, emailConfigured } from '../admin/mailer.js';
import { jobAlertEmail } from '../services/emailTemplates.js';
import { JobAlert, JobAlertSent } from './models.js';

// Job alert emails: new Job Finder jobs that match the user's resume, weekly (or daily for Pro).
// Alerts search the company job boards and CVMind recruiters only, so they never spend the paid
// JSearch/Adzuna quota that interactive searches need.

export const MAX_JOBS_PER_EMAIL = 10;
export const DEFAULT_MIN_SCORE = 60;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Due a little early, so an hourly runner doesn't drift a whole hour later every week
const INTERVAL = { weekly: 7 * DAY - HOUR, daily: DAY - HOUR };

const SITE = () => (process.env.FRONTEND_URL || 'https://www.cvmind.in').replace(/\/$/, '');
const BACKEND = () => (process.env.BACKEND_PUBLIC_URL || 'https://cvmindai-backend.onrender.com').replace(/\/$/, '');
export const unsubscribeUrl = (token) => `${BACKEND()}/api/unsubscribe/${token}`;
const jobUrl = (jobKey) => `${SITE()}/job-finder?job=${encodeURIComponent(jobKey)}&from=alert`;

const newToken = () => crypto.randomBytes(24).toString('base64url');

function toClient(alert, pro) {
  return {
    enabled: Boolean(alert?.enabled),
    frequency: alert?.frequency || 'weekly',
    minScore: alert?.minScore ?? DEFAULT_MIN_SCORE,
    lastSentAt: alert?.lastSentAt || null,
    canDaily: pro
  };
}

export async function getAlertSettings(userId, email) {
  const [alert, pro] = await Promise.all([JobAlert.findOne({ userId: String(userId) }).lean(), isPro(email)]);
  return toClient(alert, pro);
}

/** Turns alerts on or off and saves the options. Daily alerts are for Pro accounts. */
export async function saveAlertSettings(userId, email, input = {}) {
  const pro = await isPro(email);
  const update = { email: String(email).toLowerCase() };
  if (input.enabled !== undefined) update.enabled = Boolean(input.enabled);
  if (input.frequency !== undefined) {
    if (!['weekly', 'daily'].includes(input.frequency)) throw Object.assign(new Error('Choose weekly or daily.'), { status: 400 });
    if (input.frequency === 'daily' && !pro) throw Object.assign(new Error('Daily alerts are part of CVMind Pro. Free accounts get a weekly alert.'), { status: 402 });
    update.frequency = input.frequency;
  }
  if (input.minScore !== undefined) {
    const score = Number(input.minScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) throw Object.assign(new Error('Minimum match must be between 0 and 100.'), { status: 400 });
    update.minScore = Math.round(score);
  }
  const alert = await JobAlert.findOneAndUpdate(
    { userId: String(userId) },
    { $set: update, $setOnInsert: { unsubscribeToken: newToken() } },
    { upsert: true, returnDocument: 'after' }
  ).lean();
  return toClient(alert, pro);
}

export async function unsubscribe(token) {
  const clean = String(token || '').trim();
  if (!clean || clean.length > 100) return false;
  const res = await JobAlert.updateOne({ unsubscribeToken: clean }, { $set: { enabled: false } });
  return res.matchedCount > 0;
}

const nothing = async () => ({ jobs: [] });

// The jobs one alert would send now: new since the last run, at or above the minimum match,
// not applied to and never sent before
export async function jobsForAlert(alert, { sources = {}, loadWork } = {}) {
  const [profile, preferences] = await Promise.all([
    resumeForMatching(alert.userId, { loadWork }),
    getPreferences(alert.userId)
  ]);
  if (!profile) return { jobs: [], reason: 'no-resume' };
  const days = alert.frequency === 'daily' ? 1 : 7;
  const feed = await buildFeed({
    profile,
    preferences: preferences || {},
    filters: { days },
    email: alert.email,
    sources: { ...sources, jsearch: nothing, adzuna: nothing }
  });
  if (feed.needsRole || feed.needsSkills) return { jobs: [], reason: 'no-role' };

  const candidates = feed.jobs.filter((j) => !j.appliedAt && j.match?.score != null && j.match.score >= alert.minScore);
  if (!candidates.length) return { jobs: [], query: feed.query, location: feed.location };
  const sent = new Set((await JobAlertSent.find({ userId: alert.userId, jobKey: { $in: candidates.map((j) => j.jobKey) } }, { jobKey: 1 }).lean()).map((r) => r.jobKey));
  const jobs = candidates.filter((j) => !sent.has(j.jobKey)).slice(0, MAX_JOBS_PER_EMAIL);
  return { jobs, query: feed.query, location: feed.location };
}

async function jobFinderOpenFor(email) {
  const { locked } = (await getSettings()).productAccess;
  return !locked.includes('job-finder') || hasProductAccess(email, 'job-finder');
}

/**
 * Sends every alert that is due. Safe to call often (an hourly timer or a cron request): an alert
 * runs at most once per period. Returns counts for logging.
 */
export async function runJobAlerts({ now = new Date(), sources = {}, loadWork, send = sendEmailBatch, limit = 200 } = {}) {
  if (!emailConfigured() && send === sendEmailBatch) return { due: 0, sent: 0, skipped: 0, reason: 'email-not-configured' };
  const User = mongoose.model('User');
  const dueBefore = (freq) => new Date(now.getTime() - INTERVAL[freq]);
  const due = await JobAlert.find({
    enabled: true,
    $or: [
      { lastRunAt: null },
      { frequency: 'weekly', lastRunAt: { $lte: dueBefore('weekly') } },
      { frequency: 'daily', lastRunAt: { $lte: dueBefore('daily') } }
    ]
  }).sort({ lastRunAt: 1 }).limit(limit).lean();

  const messages = [];
  const delivered = [];
  let skipped = 0;
  for (const alert of due) {
    // Claim the run first, so two runners at once don't both send it
    const claimed = await JobAlert.updateOne({ _id: alert._id, lastRunAt: alert.lastRunAt }, { $set: { lastRunAt: now } });
    if (!claimed.modifiedCount) continue;
    try {
      const user = await User.findById(alert.userId, { name: 1, email: 1, status: 1, emailVerified: 1 }).lean();
      if (!user || user.status !== 'active' || !user.emailVerified || !(await jobFinderOpenFor(user.email))) { skipped++; continue; }
      // Daily is a Pro option; a lapsed plan falls back to weekly
      if (alert.frequency === 'daily' && !(await isPro(user.email))) {
        await JobAlert.updateOne({ _id: alert._id }, { $set: { frequency: 'weekly' } });
        alert.frequency = 'weekly';
      }
      const { jobs, query, location } = await jobsForAlert({ ...alert, email: user.email }, { sources, loadWork });
      if (!jobs.length) { skipped++; continue; }
      const email = jobAlertEmail({
        name: user.name,
        role: query,
        location,
        frequency: alert.frequency,
        jobs: jobs.map((j) => ({ title: j.title, company: j.company, location: j.location, remote: j.remote, score: j.match?.score, url: jobUrl(j.jobKey) })),
        manageUrl: `${SITE()}/job-finder?from=alert`,
        unsubscribeUrl: unsubscribeUrl(alert.unsubscribeToken)
      });
      messages.push({
        to: user.email,
        ...email,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl(alert.unsubscribeToken)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      });
      delivered.push({ alert, jobKeys: jobs.map((j) => j.jobKey), to: user.email });
    } catch (err) {
      skipped++;
      console.error('[job alerts] could not prepare alert for', alert.userId, err.message);
    }
  }

  if (!messages.length) return { due: due.length, sent: 0, skipped };
  const result = await send(messages);
  const failedTo = new Set((result.errors || []).flatMap((e) => e.to || []));
  for (const d of delivered) {
    if (failedTo.has(d.to)) continue;
    await JobAlertSent.insertMany(d.jobKeys.map((jobKey) => ({ userId: d.alert.userId, jobKey, sentAt: now })), { ordered: false }).catch(() => {});
    await JobAlert.updateOne({ _id: d.alert._id }, { $set: { lastSentAt: now }, $inc: { sentCount: 1 } });
  }
  return { due: due.length, sent: result.sent ?? messages.length, failed: result.failed || 0, skipped };
}

let timer = null;
/** Checks for due alerts every hour (servers that stay running; on Vercel a cron calls the endpoint). */
export function startJobAlerts({ loadWork } = {}) {
  if (timer) return;
  const tick = () => runJobAlerts({ loadWork })
    .then((r) => { if (r.sent || r.failed) console.log('[job alerts]', r); })
    .catch((err) => console.error('[job alerts] run failed:', err.message));
  timer = setInterval(tick, HOUR);
  timer.unref?.();
  setTimeout(tick, 60 * 1000).unref?.();
}

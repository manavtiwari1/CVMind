import crypto from 'crypto';
import mongoose from 'mongoose';
import { ShareLink, ResumeView } from './models.js';

// Readable public links for resumes (cvmind.in/r/manav-tiwari) that the owner can switch off,
// with a view count. Views are counted without storing who viewed: a visitor is a hash of IP and
// browser with a salt that changes daily, kept only to count each visitor once per 30 minutes.

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set(['admin', 'api', 'app', 'login', 'signin', 'sign-in', 'signup', 'sign-up', 'cvmind', 'support', 'help', 'www', 'pricing', 'account', 'settings', 'r', 'portfolio', 'null', 'undefined']);
const VIEW_WINDOW_MS = 30 * 60 * 1000;
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|linkedinbot|embedly|headless|lighthouse|curl|wget|python-requests|axios|node-fetch/i;

const Work = () => mongoose.model('Work');

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

export function slugProblem(slug) {
  if (!SLUG_RE.test(slug)) return 'Use 3 to 40 lowercase letters, numbers and hyphens, starting and ending with a letter or number.';
  if (RESERVED.has(slug)) return 'That link name is reserved. Try another one.';
  return null;
}

async function freeSlug(base) {
  const root = slugProblem(base) ? `resume-${crypto.randomBytes(3).toString('hex')}` : base;
  if (!(await ShareLink.exists({ slug: root }))) return root;
  for (let i = 0; i < 5; i++) {
    const candidate = `${root.slice(0, 33)}-${crypto.randomBytes(3).toString('hex')}`;
    if (!(await ShareLink.exists({ slug: candidate }))) return candidate;
  }
  return `resume-${crypto.randomBytes(6).toString('hex')}`;
}

async function ownedResume(workId, userId) {
  if (!mongoose.isValidObjectId(workId)) return null;
  return Work().findOne({ _id: workId, userId: String(userId) }, { title: 1, type: 1, hidden: 1 }).lean();
}

const toClient = (link) => (link
  ? { slug: link.slug, enabled: link.enabled, viewCount: link.viewCount || 0, lastViewedAt: link.lastViewedAt || null, createdAt: link.createdAt }
  : null);

/** The link for a resume, without creating one */
export async function getShareLink(workId, userId) {
  const work = await ownedResume(workId, userId);
  if (!work) return { error: 'Resume not found.', status: 404 };
  const link = await ShareLink.findOne({ workId: String(workId) }).lean();
  return { link: toClient(link), suggestedSlug: link ? null : slugify(work.title.replace(/^resume\s*-\s*/i, '')) };
}

/**
 * Creates or updates a resume's link. `slug` renames it (custom names are a Pro option);
 * `enabled` switches it on or off.
 */
export async function saveShareLink(workId, userId, { slug, enabled, displayName = '', pro = false } = {}) {
  const work = await ownedResume(workId, userId);
  if (!work) return { error: 'Resume not found.', status: 404 };
  if (work.type !== 'resume') return { error: 'Only resumes can have a share link.', status: 400 };

  let link = await ShareLink.findOne({ workId: String(workId) });
  if (slug !== undefined && slug !== null && slug !== '' && (!link || slug !== link.slug)) {
    if (!pro) return { error: 'Choosing your own link name is part of CVMind Pro.', status: 402, code: 'UPGRADE_REQUIRED' };
    const clean = String(slug).trim().toLowerCase();
    const problem = slugProblem(clean);
    if (problem) return { error: problem, status: 400 };
    if (await ShareLink.exists({ slug: clean, workId: { $ne: String(workId) } })) return { error: 'That link name is taken. Try another one.', status: 409 };
    if (link) link.slug = clean;
    else link = new ShareLink({ workId: String(workId), userId: String(userId), slug: clean });
  }
  if (!link) {
    link = new ShareLink({ workId: String(workId), userId: String(userId), slug: await freeSlug(slugify(displayName) || slugify(work.title)) });
  }
  if (enabled !== undefined) link.enabled = Boolean(enabled);
  try {
    await link.save();
  } catch (err) {
    if (err.code === 11000) return { error: 'That link name is taken. Try another one.', status: 409 };
    throw err;
  }
  return { link: toClient(link.toObject()) };
}

const dailySalt = (now) => `${process.env.AUTH_SECRET || 'cvmind-views'}:${now.toISOString().slice(0, 10)}`;

function referrerDomain(referer, ownHost) {
  try {
    const host = new URL(referer).hostname.replace(/^www\./, '');
    return host && host !== ownHost ? host.slice(0, 80) : '';
  } catch {
    return '';
  }
}

/**
 * The public page for a link. Counts the view unless it is the owner, a bot, or the same visitor
 * again within 30 minutes. Returns null when the link doesn't exist, { off: true } when it is off.
 */
export async function openShareLink(slug, { ip = '', userAgent = '', referer = '', country = '', viewerId = '', now = new Date() } = {}) {
  const clean = String(slug || '').toLowerCase();
  if (!SLUG_RE.test(clean)) return null;
  const link = await ShareLink.findOne({ slug: clean }).lean();
  if (!link) return null;
  if (!link.enabled) return { off: true };
  const work = await Work().findById(link.workId).lean();
  if (!work || work.hidden) return null;

  const isOwner = viewerId && String(viewerId) === String(link.userId);
  if (!isOwner && !BOT_RE.test(userAgent)) {
    const visitor = crypto.createHash('sha256').update(`${dailySalt(now)}|${ip}|${userAgent}`).digest('hex').slice(0, 32);
    const recent = await ResumeView.exists({ shareId: String(link._id), visitor, at: { $gt: new Date(now.getTime() - VIEW_WINDOW_MS) } });
    if (!recent) {
      await ResumeView.create({ shareId: String(link._id), visitor, refDomain: referrerDomain(referer, ''), country: String(country || '').slice(0, 2).toUpperCase(), at: now });
      await ShareLink.updateOne({ _id: link._id }, { $inc: { viewCount: 1 }, $set: { lastViewedAt: now } });
    }
  }
  return {
    work: {
      title: work.title,
      type: work.type,
      templateId: work.templateId,
      htmlContent: work.htmlContent,
      updatedAt: work.updatedAt || work.createdAt
    },
    ownerId: link.userId
  };
}

/** Views by day for the last 30 days, and where they came from (Pro shows these) */
export async function shareStats(workId, userId, now = new Date()) {
  const link = await ShareLink.findOne({ workId: String(workId), userId: String(userId) }).lean();
  if (!link) return { link: null, days: [], referrers: [], countries: [] };
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const match = { shareId: String(link._id), at: { $gte: since } };
  const [days, referrers, countries] = await Promise.all([
    ResumeView.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: 'Asia/Kolkata' } }, views: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ResumeView.aggregate([{ $match: { ...match, refDomain: { $ne: '' } } }, { $group: { _id: '$refDomain', views: { $sum: 1 } } }, { $sort: { views: -1 } }, { $limit: 8 }]),
    ResumeView.aggregate([{ $match: { ...match, country: { $ne: '' } } }, { $group: { _id: '$country', views: { $sum: 1 } } }, { $sort: { views: -1 } }, { $limit: 8 }])
  ]);
  return {
    link: toClient(link),
    days: days.map((d) => ({ day: d._id, views: d.views })),
    referrers: referrers.map((r) => ({ domain: r._id, views: r.views })),
    countries: countries.map((c) => ({ country: c._id, views: c.views }))
  };
}

/** Links for all of a user's resumes, for the documents table */
export async function shareLinksFor(userId) {
  const rows = await ShareLink.find({ userId: String(userId) }).lean();
  return Object.fromEntries(rows.map((r) => [r.workId, toClient(r)]));
}

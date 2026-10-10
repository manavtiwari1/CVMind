import crypto from 'crypto';
import express from 'express';
import { requireUser, optionalUser } from '../services/authToken.js';
import { requireFreeUse } from '../billing/gate.js';
import { isPro } from '../billing/service.js';
import { clientIp } from '../services/limiter.js';
import { escapeHtml } from '../admin/mailer.js';
import { generateOfferNegotiationWithGemini } from '../services/gemini.js';
import { planProgress, setPlanHidden } from '../growth/progress.js';
import { listScans } from '../growth/scans.js';
import { unsubscribe, runJobAlerts } from '../growth/alerts.js';
import { getShareLink, saveShareLink, openShareLink, shareStats, shareLinksFor } from '../growth/shareLinks.js';
import { referralSummary, claimReferral } from '../growth/referrals.js';
import { NegotiationLog } from '../growth/models.js';

// Routes for the growth features: the "Your plan" checklist, ATS score history, job alert
// unsubscribe and runner, offer negotiation, resume share links and invite-a-friend.
// Job alert settings and referral requests live in the Job Finder router (routes/jobFinder.js).

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function defaultLoadWork(workId) {
  const { getWorkById } = await import('../db.js');
  return getWorkById(workId);
}

async function defaultFindUser(userId) {
  const { findUserById } = await import('../db.js');
  return findUserById(userId);
}

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

function unsubscribePage(done) {
  const title = done ? 'You are unsubscribed' : 'This link has expired';
  const text = done
    ? "You won't get job alert emails from CVMind any more. You can turn them back on any time in Job Finder."
    : 'We could not find these alerts. They may already be turned off. You can manage alerts in Job Finder.';
  const site = (process.env.FRONTEND_URL || 'https://www.cvmind.in').replace(/\/$/, '');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · CVMind</title>
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f5f9;color:#0f172a;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
main{max-width:440px;background:#fff;border:1px solid #e4e8ef;border-radius:14px;padding:32px 28px;text-align:center}
h1{font-size:22px;margin:0 0 10px}p{color:#475569;line-height:1.6;margin:0 0 20px}
a{display:inline-block;padding:11px 20px;border-radius:10px;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:700}</style></head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p><a href="${escapeHtml(site)}/job-finder">Open Job Finder</a></main></body></html>`;
}

// Cron requests carry the secret as "Authorization: Bearer <CRON_SECRET>" (Vercel Cron) or x-cron-secret
function cronAllowed(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = String(req.get('x-cron-secret') || req.get('authorization')?.replace(/^Bearer\s+/i, '') || '');
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createGrowthRouter({ loadWork = defaultLoadWork, findUser = defaultFindUser, sources = {}, negotiate = generateOfferNegotiationWithGemini } = {}) {
  const router = express.Router();

  // ── "Your plan" checklist ────────────────────────────────────────────────
  router.get('/api/user/progress', requireUser, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await planProgress(req.auth.sub, req.auth.email)) });
  }));

  router.post('/api/user/progress/hide', requireUser, asyncRoute(async (req, res) => {
    await setPlanHidden(req.auth.sub, req.body?.hidden !== false);
    res.json({ success: true, ...(await planProgress(req.auth.sub, req.auth.email)) });
  }));

  // ── ATS score history ────────────────────────────────────────────────────
  router.get('/api/user/scans', requireUser, asyncRoute(async (req, res) => {
    res.json({ success: true, scans: await listScans(req.auth.sub, req.query.limit) });
  }));

  // ── Job alerts: one-click unsubscribe (no sign-in) and the runner ────────
  router.get('/api/unsubscribe/:token', asyncRoute(async (req, res) => {
    const done = await unsubscribe(req.params.token);
    res.status(done ? 200 : 404).type('html').send(unsubscribePage(done));
  }));
  // Mail apps send this for the List-Unsubscribe-Post header
  router.post('/api/unsubscribe/:token', asyncRoute(async (req, res) => {
    const done = await unsubscribe(req.params.token);
    res.status(done ? 200 : 404).json({ success: done });
  }));

  const runAlerts = asyncRoute(async (req, res) => {
    if (!cronAllowed(req)) return res.status(401).json({ success: false, error: 'Not allowed.' });
    res.json({ success: true, ...(await runJobAlerts({ loadWork, sources })) });
  });
  router.get('/api/cron/job-alerts', runAlerts);
  router.post('/api/cron/job-alerts', runAlerts);

  // ── Offer negotiation ────────────────────────────────────────────────────
  router.post('/api/negotiation', requireUser, requireFreeUse('negotiation'), asyncRoute(async (req, res) => {
    const body = req.body || {};
    const offer = {
      company: clip(body.offer?.company, 120),
      role: clip(body.offer?.role, 120),
      location: clip(body.offer?.location, 80),
      fixed: clip(body.offer?.fixed, 80),
      variable: clip(body.offer?.variable, 80),
      joiningBonus: clip(body.offer?.joiningBonus, 80),
      notice: clip(body.offer?.notice, 120),
      other: clip(body.offer?.other, 500)
    };
    const position = {
      current: clip(body.position?.current, 80),
      competing: clip(body.position?.competing, 300),
      target: clip(body.position?.target, 200),
      priorities: (Array.isArray(body.position?.priorities) ? body.position.priorities : []).map((p) => clip(p, 40)).filter(Boolean).slice(0, 6),
      notes: clip(body.position?.notes, 600)
    };
    const tone = clip(body.tone, 40);
    if (!offer.company || !offer.role) return res.status(400).json({ success: false, error: 'Add the company and the role you were offered.' });
    if (!offer.fixed) return res.status(400).json({ success: false, error: 'Add the pay you were offered, e.g. "18 LPA fixed".' });

    let resumeText = '';
    if (body.resumeWorkId) {
      const work = await loadWork(String(body.resumeWorkId)).catch(() => null);
      if (work && String(work.userId) === String(req.auth.sub)) resumeText = clip(work.htmlContent, 12000);
    }

    const result = await negotiate({ offer, position, tone, resumeText, customApiKey: req.get('x-gemini-key') || null });
    const { saveWork } = await import('../db.js');
    let work = null;
    try {
      work = await saveWork({
        userId: req.auth.sub,
        title: `Offer Negotiation - ${offer.company}`.slice(0, 120),
        type: 'offer-negotiation',
        templateId: 'offer-negotiation',
        htmlContent: JSON.stringify({ offer, position, tone, result })
      });
    } catch (err) {
      console.error('[negotiation] could not save result:', err.message);
    }
    await NegotiationLog.create({ userId: req.auth.sub, email: req.auth.email, company: offer.company, role: offer.role, tone }).catch(() => {});
    res.json({ success: true, data: result, work });
  }));

  // ── Resume share links ───────────────────────────────────────────────────
  router.get('/api/r/:slug', optionalUser, asyncRoute(async (req, res) => {
    const page = await openShareLink(req.params.slug, {
      ip: clientIp(req),
      userAgent: String(req.get('user-agent') || ''),
      // The page's document.referrer, sent by the share page (the API request's own Referer is our site)
      referer: String(req.query.from || '').slice(0, 300),
      country: String(req.get('x-vercel-ip-country') || req.get('cf-ipcountry') || ''),
      viewerId: req.auth?.sub || ''
    });
    if (!page) return res.status(404).json({ success: false, error: 'This resume link does not exist.' });
    if (page.off) return res.status(410).json({ success: false, code: 'LINK_OFF', error: 'The owner has turned this link off.' });
    res.json({ success: true, data: page.work });
  }));

  router.get('/api/user/share', requireUser, asyncRoute(async (req, res) => {
    res.json({ success: true, links: await shareLinksFor(req.auth.sub) });
  }));

  router.get('/api/user/share/:workId', requireUser, asyncRoute(async (req, res) => {
    const result = await getShareLink(req.params.workId, req.auth.sub);
    if (result.error) return res.status(result.status).json({ success: false, error: result.error });
    const pro = await isPro(req.auth.email);
    const stats = result.link && pro ? await shareStats(req.params.workId, req.auth.sub) : null;
    res.json({ success: true, pro, link: result.link, suggestedSlug: result.suggestedSlug, stats });
  }));

  router.put('/api/user/share/:workId', requireUser, asyncRoute(async (req, res) => {
    const [pro, user] = await Promise.all([isPro(req.auth.email), findUser(req.auth.sub).catch(() => null)]);
    const result = await saveShareLink(req.params.workId, req.auth.sub, {
      slug: req.body?.slug,
      enabled: req.body?.enabled,
      displayName: user?.name || '',
      pro
    });
    if (result.error) return res.status(result.status).json({ success: false, code: result.code, error: result.error });
    res.json({ success: true, pro, link: result.link });
  }));

  // ── Invite friends ───────────────────────────────────────────────────────
  router.get('/api/user/referral', requireUser, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await referralSummary(req.auth.sub, req.auth.email)) });
  }));

  router.post('/api/referral/claim', requireUser, asyncRoute(async (req, res) => {
    const user = await findUser(req.auth.sub);
    if (!user) return res.status(404).json({ success: false, error: 'Account not found.' });
    const result = await claimReferral(user, req.body?.code);
    res.json({ success: true, ...result });
  }));

  router.use((err, req, res, next) => {
    console.error('[growth]', err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ success: false, error: err.status ? err.message : 'Something went wrong. Please try again.' });
  });

  return router;
}

export default createGrowthRouter();

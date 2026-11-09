import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireUser } from '../services/authToken.js';
import { getSite, checkUsername, publishSite, unpublishSite } from '../portfolio/sites.js';
import { getLatestUserWork } from '../db.js';

// Publishing a generated portfolio to username.portfolio.cvmind.in. Mounted before the main API
// router so these paths aren't read as GET /api/portfolio/:workId.

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const perUser = (limit) => rateLimit({
  windowMs: 60 * 1000,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.auth.sub),
  handler: (req, res) => res.status(429).json({ success: false, error: 'Too many requests. Please wait a minute and try again.' })
});

export function createPortfolioSiteRouter({ ready = async () => {} } = {}) {
  const router = express.Router();
  const connected = asyncRoute(async (req, res, next) => { await ready(); next(); });

  router.get('/api/portfolio/site', requireUser, connected, asyncRoute(async (req, res) => {
    res.json({ success: true, site: await getSite(req.auth.sub) });
  }));

  // The newest generated portfolio, so the builder can reopen it after a refresh
  router.get('/api/portfolio/latest', requireUser, connected, asyncRoute(async (req, res) => {
    res.json({ success: true, work: await getLatestUserWork(req.auth.sub, 'portfolio-gen') });
  }));

  router.get('/api/portfolio/username-check', requireUser, perUser(60), connected, asyncRoute(async (req, res) => {
    res.json({ success: true, ...(await checkUsername(req.query.name, req.auth.sub)) });
  }));

  router.post('/api/portfolio/publish', requireUser, perUser(10), connected, asyncRoute(async (req, res) => {
    const { workId, username } = req.body || {};
    const result = await publishSite({ userId: req.auth.sub, workId, username });
    if (result.error) return res.status(result.status).json({ success: false, error: result.error });
    res.json({ success: true, site: result.site });
  }));

  router.delete('/api/portfolio/publish', requireUser, perUser(10), connected, asyncRoute(async (req, res) => {
    res.json({ success: true, site: await unpublishSite(req.auth.sub) });
  }));

  return router;
}

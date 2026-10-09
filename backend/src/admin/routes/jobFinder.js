import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { model, clean, handle, paging, escapeRegex, dateRange } from '../util.js';
import { JobApplyLog } from '../../jobFinder/models.js';
import { jsearchUsage } from '../../jobFinder/sources/jsearch.js';
import { adzunaUsage } from '../../jobFinder/sources/adzuna.js';

// AI Job Finder: which accounts applied to which jobs, and how much of the JSearch and Adzuna quotas is used
const router = express.Router();
router.use(requireDb);

const SOURCES = ['jsearch', 'adzuna', 'greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable', 'cvmind'];
const TZ_OFFSET_MS = 5.5 * 60 * 60 * 1000;
// Midnight in India, as a Date
const startOfIstDay = (offsetDays = 0) => {
  const ist = new Date(Date.now() + TZ_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - TZ_OFFSET_MS + offsetDays * 24 * 60 * 60 * 1000);
};

router.get('/', requireAdmin('users.view'), handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = { ...dateRange(req.query) };
  if (req.query.q) filter.email = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
  if (req.query.company) filter.company = new RegExp(escapeRegex(clean(req.query.company, 80)), 'i');
  if (SOURCES.includes(req.query.source)) filter.source = req.query.source;

  const [rows, total] = await Promise.all([
    JobApplyLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    JobApplyLog.countDocuments(filter)
  ]);
  const users = await model('User').find({ email: { $in: [...new Set(rows.map((r) => r.email))] } }, { email: 1, name: 1 }).lean();
  const nameOf = new Map(users.map((u) => [u.email.toLowerCase(), u.name]));

  res.json({
    success: true,
    page,
    limit,
    total,
    data: rows.map((r) => ({
      id: String(r._id),
      email: r.email,
      name: nameOf.get(r.email) || null,
      title: r.title,
      company: r.company,
      location: r.location,
      source: r.source,
      applyUrl: r.applyUrl,
      matchScore: r.matchScore,
      appliedAt: r.createdAt,
      lastOpenedAt: r.lastOpenedAt,
      openCount: r.openCount
    }))
  });
}));

router.get('/summary', requireAdmin('users.view'), handle(async (req, res) => {
  const today = startOfIstDay();
  const weekAgo = startOfIstDay(-6);
  const [appliesToday, appliesWeek, total, usersWeek, topCompanies, bySource, usage, adzuna] = await Promise.all([
    JobApplyLog.countDocuments({ createdAt: { $gte: today } }),
    JobApplyLog.countDocuments({ createdAt: { $gte: weekAgo } }),
    JobApplyLog.estimatedDocumentCount(),
    JobApplyLog.distinct('email', { createdAt: { $gte: weekAgo } }),
    JobApplyLog.aggregate([
      { $match: { createdAt: { $gte: weekAgo }, company: { $gt: '' } } },
      { $group: { _id: '$company', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    JobApplyLog.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]),
    jsearchUsage(),
    adzunaUsage()
  ]);
  res.json({
    success: true,
    data: {
      appliesToday,
      appliesWeek,
      total,
      usersWeek: usersWeek.length,
      topCompanies: topCompanies.map((c) => ({ company: c._id, count: c.count })),
      bySource: Object.fromEntries(bySource.map((s) => [s._id || 'unknown', s.count])),
      jsearch: usage,
      adzuna
    }
  });
}));

export default router;

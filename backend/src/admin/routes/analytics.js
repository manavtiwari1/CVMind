import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { Ticket, UserSession } from '../models.js';
import { model, handle, paging, clean, escapeRegex } from '../util.js';
import { AiUsage } from '../../billing/models.js';
// Registers JobApplyLog, which FEATURE_LOGS reads by name
import '../../jobFinder/models.js';

const router = express.Router();
const TZ = 'Asia/Kolkata';
const DAY = 24 * 60 * 60 * 1000;

// Every AI feature log. `detail` picks the fields shown in the activity table.
export const FEATURE_LOGS = [
  { key: 'scan', label: 'Resume scans', model: 'Scan', detail: ['fileName', 'score'] },
  { key: 'fix', label: 'AI fixes', model: 'Fix', detail: ['fileName', 'priorScore'] },
  { key: 'tailor', label: 'Resume tailoring', model: 'TailorLog', detail: ['fileName', 'score'] },
  { key: 'prep', label: 'Interview prep', model: 'PrepLog', detail: ['fileName', 'questionsCount'] },
  { key: 'voice-prep', label: 'Voice prep', model: 'VoicePrepLog', detail: ['email', 'jobTitle', 'score'] },
  { key: 'proofread', label: 'Proofreading', model: 'ProofreadLog', detail: ['email', 'industry', 'issuesCount'] },
  { key: 'linkedin', label: 'LinkedIn audit', model: 'LinkedinLog', detail: ['email', 'score'] },
  { key: 'linkedin-bio', label: 'LinkedIn bio', model: 'LinkedinBioLog', detail: ['email', 'jobTitle'] },
  { key: 'linkedin-outreach', label: 'LinkedIn outreach', model: 'LinkedinOutreachLog', detail: ['email', 'jobTitle'] },
  { key: 'linkedin-post', label: 'LinkedIn posts', model: 'LinkedinPostLog', detail: ['email', 'topic'] },
  { key: 'career-courses', label: 'Career courses', model: 'CareerCoursesLog', detail: ['email', 'jobTitle'] },
  { key: 'elevator-pitch', label: 'Elevator pitch', model: 'ElevatorPitchLog', detail: ['email', 'jobTitle'] },
  { key: 'career-roadmap', label: 'Career roadmap', model: 'CareerRoadmapLog', detail: ['email'] },
  { key: 'portfolio', label: 'Portfolio generator', model: 'PortfolioGenLog', detail: ['email', 'theme'] },
  { key: 'job-finder', label: 'AI Job Finder applies', model: 'JobApplyLog', detail: ['email', 'company', 'title'] }
];

const startOfDay = (offsetDays = 0) => {
  // Midnight IST, as a UTC Date
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  now.setUTCHours(0, 0, 0, 0);
  return new Date(now.getTime() - 5.5 * 60 * 60 * 1000 - offsetDays * DAY);
};

const between = (from, to) => ({ $gte: from, $lt: to });

async function countAll(filterFor) {
  const counts = await Promise.all(FEATURE_LOGS.map((f) => model(f.model).countDocuments(filterFor(f))));
  return counts.reduce((a, b) => a + b, 0);
}

async function revenueSum(match) {
  const [row] = await model('PaymentLog').aggregate([
    { $match: { status: 'success', ...match } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);
  return { total: row?.total || 0, count: row?.count || 0 };
}

// AI tokens charged to signed-in accounts, and how many accounts spent them
async function tokenSum(match) {
  const [row] = await AiUsage.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$tokens' }, emails: { $addToSet: '$email' } } }
  ]);
  return { total: row?.total || 0, accounts: row?.emails.length || 0 };
}

async function dailySeries(Model, from, { match = {}, sumField = null, field = 'createdAt' } = {}) {
  const rows = await Model.aggregate([
    { $match: { [field]: { $gte: from }, ...match } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: TZ } }, value: sumField ? { $sum: `$${sumField}` } : { $sum: 1 } } }
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.value]));
}

async function activeUserCount(from, to) {
  const ids = new Set();
  const [sessionIds, ...logIds] = await Promise.all([
    UserSession.distinct('userId', { lastSeenAt: between(from, to) }),
    ...FEATURE_LOGS.map((f) => model(f.model).distinct('userId', { createdAt: between(from, to), userId: { $gt: '' } }))
  ]);
  for (const id of sessionIds) ids.add(String(id));
  for (const list of logIds) for (const id of list) ids.add(String(id));
  return ids.size;
}

router.get('/overview', requireAdmin('dashboard.view'), requireDb, handle(async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.range)) ? Number(req.query.range) : 30;
  const User = model('User');
  const Scan = model('Scan');
  const today = startOfDay(0);
  const yesterday = startOfDay(1);
  const tomorrow = new Date(today.getTime() + DAY);
  const rangeFrom = startOfDay(days - 1);
  const prevFrom = new Date(rangeFrom.getTime() - days * DAY);

  const [
    totalUsers, signupsToday, signupsYesterday, signupsRange, signupsPrev,
    aiToday, aiYesterday, aiRange, aiPrev,
    revToday, revYesterday, revRange, revPrev,
    activeToday, activeRange, activePrev,
    openTickets, statusCounts,
    tokensToday, tokensRange, tokensPrev
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: between(today, tomorrow) }),
    User.countDocuments({ createdAt: between(yesterday, today) }),
    User.countDocuments({ createdAt: between(rangeFrom, tomorrow) }),
    User.countDocuments({ createdAt: between(prevFrom, rangeFrom) }),
    countAll(() => ({ createdAt: between(today, tomorrow) })),
    countAll(() => ({ createdAt: between(yesterday, today) })),
    countAll(() => ({ createdAt: between(rangeFrom, tomorrow) })),
    countAll(() => ({ createdAt: between(prevFrom, rangeFrom) })),
    revenueSum({ createdAt: between(today, tomorrow) }),
    revenueSum({ createdAt: between(yesterday, today) }),
    revenueSum({ createdAt: between(rangeFrom, tomorrow) }),
    revenueSum({ createdAt: between(prevFrom, rangeFrom) }),
    activeUserCount(today, tomorrow),
    activeUserCount(rangeFrom, tomorrow),
    activeUserCount(prevFrom, rangeFrom),
    Ticket.countDocuments({ status: { $ne: 'resolved' } }),
    User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    tokenSum({ createdAt: between(today, tomorrow) }),
    tokenSum({ createdAt: between(rangeFrom, tomorrow) }),
    tokenSum({ createdAt: between(prevFrom, rangeFrom) })
  ]);

  // Day-by-day series for the chart
  const [signupSeries, loginSeries, revenueSeries, ...aiSeriesList] = await Promise.all([
    dailySeries(User, rangeFrom),
    dailySeries(model('LoginLog'), rangeFrom),
    dailySeries(model('PaymentLog'), rangeFrom, { match: { status: 'success' }, sumField: 'amount' }),
    ...FEATURE_LOGS.map((f) => dailySeries(model(f.model), rangeFrom))
  ]);
  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(rangeFrom.getTime() + i * DAY + 5.5 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    series.push({
      date: key,
      signups: signupSeries[key] || 0,
      logins: loginSeries[key] || 0,
      revenue: revenueSeries[key] || 0,
      aiRequests: aiSeriesList.reduce((sum, s) => sum + (s[key] || 0), 0)
    });
  }

  const featureUsage = (await Promise.all(FEATURE_LOGS.map(async (f) => ({
    key: f.key,
    label: f.label,
    count: await model(f.model).countDocuments({ createdAt: between(rangeFrom, tomorrow) }),
    total: await model(f.model).estimatedDocumentCount()
  })))).sort((a, b) => b.count - a.count);

  const [scoreStats] = await Scan.aggregate([
    { $match: { createdAt: between(rangeFrom, tomorrow) } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$score' },
        count: { $sum: 1 },
        high: { $sum: { $cond: [{ $gte: ['$score', 80] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $and: [{ $gte: ['$score', 60] }, { $lt: ['$score', 80] }] }, 1, 0] } },
        low: { $sum: { $cond: [{ $lt: ['$score', 60] }, 1, 0] } }
      }
    }
  ]);
  const keywordTrends = await Scan.aggregate([
    { $match: { createdAt: between(rangeFrom, tomorrow) } },
    { $unwind: '$missingKeywords' },
    { $group: { _id: { $toLower: { $trim: { input: '$missingKeywords' } } }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, keyword: '$_id', count: 1 } }
  ]);

  const providerSplit = await User.aggregate([
    { $group: { _id: { $ifNull: ['$provider', ''] }, google: { $max: '$isGoogleUser' }, count: { $sum: 1 } } }
  ]);

  const [recentSignups, recentPayments, recentTickets] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(6).select('name email provider isGoogleUser createdAt').lean(),
    model('PaymentLog').find().sort({ createdAt: -1 }).limit(6).lean(),
    Ticket.find().sort({ createdAt: -1 }).limit(6).select('number name email subject status createdAt').lean()
  ]);

  res.json({
    success: true,
    data: {
      range: days,
      generatedAt: new Date(),
      kpis: {
        totalUsers,
        signups: { today: signupsToday, yesterday: signupsYesterday, range: signupsRange, prev: signupsPrev },
        activeUsers: { today: activeToday, range: activeRange, prev: activePrev },
        aiRequests: { today: aiToday, yesterday: aiYesterday, range: aiRange, prev: aiPrev },
        revenue: { today: revToday.total, yesterday: revYesterday.total, range: revRange.total, prev: revPrev.total, payments: revRange.count },
        aiTokens: { today: tokensToday.total, range: tokensRange.total, prev: tokensPrev.total, accounts: tokensRange.accounts },
        openTickets
      },
      userStatus: Object.fromEntries(statusCounts.map((s) => [s._id || 'active', s.count])),
      series,
      featureUsage,
      scores: scoreStats
        ? { average: Number(scoreStats.avg.toFixed(1)), count: scoreStats.count, high: scoreStats.high, medium: scoreStats.medium, low: scoreStats.low }
        : { average: 0, count: 0, high: 0, medium: 0, low: 0 },
      keywordTrends,
      providers: providerSplit.map((p) => ({ provider: p._id || (p.google ? 'google' : 'password'), count: p.count })),
      recent: {
        signups: recentSignups.map((u) => ({ id: String(u._id), name: u.name, email: u.email, provider: u.provider || (u.isGoogleUser ? 'google' : 'password'), createdAt: u.createdAt })),
        payments: recentPayments.map((p) => ({ id: String(p._id), email: p.email, amount: p.amount, currency: p.currency, status: p.status, createdAt: p.createdAt })),
        tickets: recentTickets.map((t) => ({ id: String(t._id), number: t.number, name: t.name, email: t.email, subject: t.subject, status: t.status, createdAt: t.createdAt }))
      }
    }
  });
}));

// Raw AI activity log for one feature, newest first
router.get('/activity', requireAdmin('dashboard.view'), requireDb, handle(async (req, res) => {
  const feature = FEATURE_LOGS.find((f) => f.key === req.query.feature) || FEATURE_LOGS[0];
  const { page, limit, skip } = paging(req.query);
  const Model = model(feature.model);
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
    filter.$or = feature.detail.filter((f) => ['email', 'fileName', 'jobTitle', 'topic', 'industry', 'theme', 'company', 'title'].includes(f)).map((f) => ({ [f]: rx }));
    if (!filter.$or.length) delete filter.$or;
  }
  const [rows, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter)
  ]);

  // Show who ran it when the log only has a user id
  const userIds = [...new Set(rows.map((r) => r.userId).filter((id) => id && /^[a-f0-9]{24}$/i.test(id)))];
  const users = userIds.length ? await model('User').find({ _id: { $in: userIds } }).select('name email').lean() : [];
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  res.json({
    success: true,
    features: FEATURE_LOGS.map(({ key, label }) => ({ key, label })),
    feature: { key: feature.key, label: feature.label, columns: feature.detail },
    total,
    page,
    limit,
    data: rows.map((r) => ({
      id: String(r._id),
      createdAt: r.createdAt,
      userId: r.userId || '',
      user: userMap.get(r.userId) ? { name: userMap.get(r.userId).name, email: userMap.get(r.userId).email } : null,
      ...Object.fromEntries(feature.detail.map((f) => [f, r[f] ?? '']))
    }))
  });
}));

export default router;

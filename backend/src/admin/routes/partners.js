import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { model, clean, handle, httpError, paging, escapeRegex } from '../util.js';

const router = express.Router();
router.use(requireDb);

// Partners are the recruiter companies on the Company Portal
router.get('/', requireAdmin('partners.view'), handle(async (req, res) => {
  const Company = model('Company');
  const { page, limit, skip } = paging(req.query);
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { website: rx }];
  }
  if (req.query.verified === 'true') filter.verified = true;
  if (req.query.verified === 'false') filter.verified = { $ne: true };
  if (req.query.status === 'suspended') filter.status = 'suspended';
  if (req.query.status === 'active') filter.status = { $ne: 'suspended' };

  const [rows, total] = await Promise.all([
    Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-logo').lean(),
    Company.countDocuments(filter)
  ]);
  const ids = rows.map((c) => c.id);
  const [jobStats, appStats] = await Promise.all([
    model('Job').aggregate([{ $match: { companyId: { $in: ids } } }, { $group: { _id: '$companyId', jobs: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } } } }]),
    model('Application').aggregate([
      { $match: { companyId: { $in: ids } } },
      { $group: { _id: '$companyId', applications: { $sum: 1 }, hires: { $sum: { $cond: [{ $eq: ['$status', 'Hired'] }, 1, 0] } }, interviews: { $sum: { $cond: [{ $eq: ['$status', 'Interview'] }, 1, 0] } } } }
    ])
  ]);
  const jobMap = new Map(jobStats.map((j) => [j._id, j]));
  const appMap = new Map(appStats.map((a) => [a._id, a]));

  res.json({
    success: true,
    total,
    page,
    limit,
    data: rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      website: c.website,
      industry: c.industry,
      companySize: c.companySize,
      location: c.location,
      verified: !!c.verified,
      status: c.status || 'active',
      statusReason: c.statusReason || '',
      createdAt: c.createdAt,
      jobs: jobMap.get(c.id)?.jobs || 0,
      activeJobs: jobMap.get(c.id)?.active || 0,
      applications: appMap.get(c.id)?.applications || 0,
      interviews: appMap.get(c.id)?.interviews || 0,
      hires: appMap.get(c.id)?.hires || 0
    }))
  });
}));

router.get('/:id', requireAdmin('partners.view'), handle(async (req, res) => {
  const company = await model('Company').findOne({ id: req.params.id }).lean();
  if (!company) throw httpError(404, 'Company not found.');
  const jobs = await model('Job').find({ companyId: company.id }).sort({ postedAt: -1 }).select('id title status location jobType postedAt maxApplications').lean();
  const appCounts = await model('Application').aggregate([{ $match: { jobId: { $in: jobs.map((j) => j.id) } } }, { $group: { _id: '$jobId', count: { $sum: 1 } } }]);
  const countMap = new Map(appCounts.map((a) => [a._id, a.count]));
  res.json({
    success: true,
    data: {
      ...company,
      logo: undefined,
      status: company.status || 'active',
      jobs: jobs.map((j) => ({ id: j.id, title: j.title, status: j.status, location: j.location, jobType: j.jobType, postedAt: j.postedAt, applications: countMap.get(j.id) || 0 }))
    }
  });
}));

router.post('/:id/verify', requireAdmin('partners.manage'), handle(async (req, res) => {
  const verified = req.body?.verified !== false;
  const company = await model('Company').findOneAndUpdate({ id: req.params.id }, { verified }, { returnDocument: 'after' }).lean();
  if (!company) throw httpError(404, 'Company not found.');
  await audit(req, verified ? 'partner.verified' : 'partner.unverified', { targetType: 'company', targetId: company.id, targetLabel: company.name });
  res.json({ success: true });
}));

router.post('/:id/status', requireAdmin('partners.manage'), handle(async (req, res) => {
  const status = req.body?.status === 'suspended' ? 'suspended' : 'active';
  const reason = clean(req.body?.reason, 300);
  if (status === 'suspended' && !reason) throw httpError(400, 'Add a reason for suspending this company.');
  const company = await model('Company').findOneAndUpdate({ id: req.params.id }, { status, statusReason: status === 'suspended' ? reason : '' }, { returnDocument: 'after' }).lean();
  if (!company) throw httpError(404, 'Company not found.');
  // A suspended company's open jobs are paused; reactivating doesn't reopen them automatically
  if (status === 'suspended') await model('Job').updateMany({ companyId: company.id, status: 'ACTIVE' }, { status: 'PAUSED' });
  await audit(req, status === 'suspended' ? 'partner.suspended' : 'partner.reactivated', { targetType: 'company', targetId: company.id, targetLabel: company.name, details: { reason } });
  res.json({ success: true });
}));

router.post('/:id/jobs/:jobId/status', requireAdmin('partners.manage'), handle(async (req, res) => {
  const status = clean(req.body?.status, 20).toUpperCase();
  if (!['ACTIVE', 'PAUSED', 'CLOSED'].includes(status)) throw httpError(400, 'Invalid job status.');
  const job = await model('Job').findOneAndUpdate({ id: req.params.jobId, companyId: req.params.id }, { status }, { returnDocument: 'after' }).lean();
  if (!job) throw httpError(404, 'Job not found.');
  await audit(req, 'partner.job_status', { targetType: 'job', targetId: job.id, targetLabel: `${job.title} · ${job.companyName}`, details: { status } });
  res.json({ success: true });
}));

export default router;

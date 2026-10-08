import express from 'express';
import mongoose from 'mongoose';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { model, clean, handle, httpError, isId, paging, escapeRegex } from '../util.js';
import { updateApplicationStatus } from '../../db.js';
import { APPLICATION_STATUSES } from '@cvmind/auto-apply-agent/models/AgentApplication.js';
import '@cvmind/auto-apply-agent/models/JobPosting.js';
import '@cvmind/auto-apply-agent/models/QueueJob.js';
import '@cvmind/auto-apply-agent/models/ExtensionDevice.js';

const router = express.Router();
router.use(requireDb);

// The agent models register themselves on import (above)
const agentModel = (name) => mongoose.models[name] || null;

// A queued job this far past its run time, or a running job past its lease, counts as stuck
const STUCK_QUEUED_MS = 30 * 60 * 1000;

// ── Auto Apply applications ──────────────────────────────────────────────────
router.get('/auto-apply', requireAdmin('orders.view'), handle(async (req, res) => {
  const AgentApplication = agentModel('AgentApplication');
  const JobPosting = agentModel('JobPosting');
  const QueueJob = agentModel('QueueJob');
  if (!AgentApplication) return res.json({ success: true, total: 0, data: [], counts: {}, queue: {}, statuses: APPLICATION_STATUSES });

  const { page, limit, skip } = paging(req.query);
  const filter = {};
  if (APPLICATION_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
    const users = await model('User').find({ $or: [{ email: rx }, { name: rx }] }).select('_id').limit(200).lean();
    filter.userId = { $in: users.map((u) => String(u._id)) };
  }

  const [rows, total, counts, queueCounts, stuckQueued, stuckRunning] = await Promise.all([
    AgentApplication.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    AgentApplication.countDocuments(filter),
    AgentApplication.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    QueueJob ? QueueJob.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]) : [],
    QueueJob ? QueueJob.countDocuments({ status: 'queued', runAt: { $lt: new Date(Date.now() - STUCK_QUEUED_MS) } }) : 0,
    QueueJob ? QueueJob.countDocuments({ status: 'running', lockedUntil: { $lt: new Date() } }) : 0
  ]);

  const postings = JobPosting ? await JobPosting.find({ _id: { $in: rows.map((r) => r.jobPostingId) } }).select('title company location ats applyUrl url').lean() : [];
  const postingMap = new Map(postings.map((p) => [String(p._id), p]));
  const userIds = [...new Set(rows.map((r) => r.userId).filter(isId))];
  const users = await model('User').find({ _id: { $in: userIds } }).select('name email').lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const jobs = QueueJob ? await QueueJob.find({ applicationId: { $in: rows.map((r) => r._id) }, status: { $in: ['queued', 'running', 'dead'] } }).sort({ updatedAt: -1 }).lean() : [];

  res.json({
    success: true,
    total,
    page,
    limit,
    statuses: APPLICATION_STATUSES,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
    queue: { ...Object.fromEntries(queueCounts.map((c) => [c._id, c.count])), stuckQueued, stuckRunning },
    data: rows.map((r) => {
      const posting = postingMap.get(String(r.jobPostingId));
      const user = userMap.get(r.userId);
      const appJobs = jobs.filter((j) => String(j.applicationId) === String(r._id));
      return {
        id: String(r._id),
        status: r.status,
        step: r.progress?.step || '',
        decision: r.decision?.state || 'undecided',
        score: typeof r.score?.total === 'number' ? r.score.total : (typeof r.score?.overall === 'number' ? r.score.overall : null),
        error: r.error ? (r.error.message || String(r.error)) : '',
        user: user ? { id: String(user._id), name: user.name, email: user.email } : { id: r.userId, name: '', email: '' },
        job: posting ? { title: posting.title || 'Untitled role', company: posting.company?.name || '', location: posting.location || '', ats: posting.ats, url: posting.applyUrl || posting.url || '' } : null,
        queueJobs: appJobs.map((j) => ({
          id: String(j._id), queue: j.queue, status: j.status, attempts: j.attempts, maxAttempts: j.maxAttempts,
          lastError: j.lastError?.message || '', runAt: j.runAt,
          stuck: (j.status === 'queued' && new Date(j.runAt).getTime() < Date.now() - STUCK_QUEUED_MS) || (j.status === 'running' && j.lockedUntil && new Date(j.lockedUntil).getTime() < Date.now())
        })),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    })
  });
}));

router.post('/auto-apply/:id/status', requireAdmin('orders.manage'), handle(async (req, res) => {
  const AgentApplication = agentModel('AgentApplication');
  if (!AgentApplication || !isId(req.params.id)) throw httpError(404, 'Application not found.');
  const status = clean(req.body?.status, 30);
  if (!APPLICATION_STATUSES.includes(status)) throw httpError(400, 'Invalid status.');
  const note = clean(req.body?.note, 300);
  const app = await AgentApplication.findById(req.params.id);
  if (!app) throw httpError(404, 'Application not found.');
  const from = app.status;
  app.status = status;
  app.progress = { step: `Set to ${status} by support`, updatedAt: new Date() };
  if (note) app.notes = [app.notes, `[Support] ${note}`].filter(Boolean).join('\n');
  await app.save();
  await audit(req, 'order.status_overridden', { targetType: 'auto-apply', targetId: app._id, targetLabel: `Application ${app._id}`, details: { from, to: status, note } });
  res.json({ success: true });
}));

// Retry a dead or stuck queue job, or cancel a queued one
router.post('/queue-jobs/:id/:action', requireAdmin('orders.manage'), handle(async (req, res) => {
  const QueueJob = agentModel('QueueJob');
  if (!QueueJob || !isId(req.params.id)) throw httpError(404, 'Job not found.');
  const job = await QueueJob.findById(req.params.id);
  if (!job) throw httpError(404, 'Job not found.');
  const action = req.params.action;
  if (action === 'retry') {
    if (!['dead', 'queued', 'running'].includes(job.status)) throw httpError(400, 'Only failed or stuck jobs can be retried.');
    job.status = 'queued';
    job.attempts = 0;
    job.runAt = new Date();
    job.lockedBy = undefined;
    job.lockedUntil = undefined;
    job.finishedAt = undefined;
    job.activeDedupeKey = job.dedupeKey || undefined;
  } else if (action === 'cancel') {
    if (!['queued', 'running'].includes(job.status)) throw httpError(400, 'Only queued or running jobs can be cancelled.');
    job.status = 'dead';
    job.lastError = { message: 'Cancelled by support', code: 'ADMIN_CANCELLED', at: new Date() };
    job.finishedAt = new Date();
    job.activeDedupeKey = undefined;
  } else {
    throw httpError(404, 'Unknown action.');
  }
  try {
    await job.save();
  } catch (err) {
    if (err?.code === 11000) throw httpError(409, 'The same job is already queued, so this one was not retried.');
    throw err;
  }
  await audit(req, `order.job_${action === 'retry' ? 'retried' : 'cancelled'}`, { targetType: 'queue-job', targetId: job._id, targetLabel: `${job.queue}/${job.type}`, details: { applicationId: job.applicationId ? String(job.applicationId) : '' } });
  res.json({ success: true });
}));

// ── Company portal applications ──────────────────────────────────────────────
export const COMPANY_APPLICATION_STATUSES = ['Applied', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected'];

router.get('/company-applications', requireAdmin('orders.view'), handle(async (req, res) => {
  const Application = model('Application');
  const { page, limit, skip } = paging(req.query);
  const filter = {};
  if (req.query.status) filter.status = clean(req.query.status, 30);
  if (req.query.companyId) filter.companyId = clean(req.query.companyId, 80);
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
    filter.$or = [{ candidateName: rx }, { candidateEmail: rx }];
  }
  const [rows, total, counts] = await Promise.all([
    Application.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select('-resumeText -coverLetter').lean(),
    Application.countDocuments(filter),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);
  const jobs = await model('Job').find({ id: { $in: rows.map((r) => r.jobId) } }).select('id title companyName').lean();
  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  res.json({
    success: true,
    total,
    page,
    limit,
    statuses: COMPANY_APPLICATION_STATUSES,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
    data: rows.map((r) => ({
      id: r.id,
      status: r.status,
      mode: r.mode,
      matchScore: r.matchScore,
      candidate: { name: r.candidateName, email: r.candidateEmail },
      job: jobMap.get(r.jobId) ? { id: r.jobId, title: jobMap.get(r.jobId).title, company: jobMap.get(r.jobId).companyName } : { id: r.jobId, title: '(deleted job)', company: '' },
      events: (r.events || []).slice(-5),
      appliedAt: r.appliedAt,
      updatedAt: r.updatedAt
    }))
  });
}));

router.post('/company-applications/:id/status', requireAdmin('orders.manage'), handle(async (req, res) => {
  const status = clean(req.body?.status, 30);
  if (!COMPANY_APPLICATION_STATUSES.includes(status)) throw httpError(400, 'Invalid status.');
  const app = await updateApplicationStatus(req.params.id, status, `CVMind support (${req.admin.name})`);
  if (!app) throw httpError(404, 'Application not found.');
  await audit(req, 'order.company_application_status', { targetType: 'company-application', targetId: req.params.id, targetLabel: `${app.candidateName} → ${status}`, details: { status } });
  res.json({ success: true });
}));

export default router;

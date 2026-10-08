import express from 'express';
import mongoose from 'mongoose';
import { requireAdmin, requireDb, dbReady } from '../auth.js';
import { audit } from '../audit.js';
import { metricsSnapshot } from '../metrics.js';
import { FEATURES, VERSION_CLIENTS, SECURITY_LIMITS, getSettings, saveSettingGroup, SETTING_KEYS } from '../settings.js';
import { handle, httpError } from '../util.js';
import { emailConfigured } from '../mailer.js';
import { workerStatus } from '@cvmind/auto-apply-agent/queue/heartbeat.js';

const router = express.Router();
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

router.get('/health', requireAdmin('system.view'), handle(async (req, res) => {
  const ready = await dbReady(1000);
  let database = { state: DB_STATES[mongoose.connection.readyState] || 'unknown', configured: !!process.env.MONGODB_URI };
  let queue = null;
  let worker = null;

  if (ready) {
    const started = Date.now();
    try {
      await mongoose.connection.db.admin().ping();
      database.pingMs = Date.now() - started;
    } catch {
      database.pingMs = null;
    }
    try {
      const stats = await mongoose.connection.db.stats();
      database = { ...database, name: mongoose.connection.name, collections: stats.collections, objects: stats.objects, dataSizeMb: Math.round((stats.dataSize / 1024 / 1024) * 10) / 10, storageSizeMb: Math.round((stats.storageSize / 1024 / 1024) * 10) / 10 };
    } catch {
      database.name = mongoose.connection.name;
    }
    const QueueJob = mongoose.models.QueueJob;
    if (QueueJob) {
      const rows = await QueueJob.aggregate([{ $group: { _id: { queue: '$queue', status: '$status' }, count: { $sum: 1 } } }]);
      queue = {};
      for (const r of rows) {
        queue[r._id.queue] = queue[r._id.queue] || {};
        queue[r._id.queue][r._id.status] = r.count;
      }
    }
    try {
      worker = await workerStatus();
    } catch (err) {
      console.error('[admin] worker status failed:', err.message);
    }
  }

  const mem = process.memoryUsage();
  res.json({
    success: true,
    data: {
      server: {
        uptimeSec: Math.round(process.uptime()),
        node: process.version,
        platform: process.env.VERCEL ? 'Vercel' : process.env.RENDER ? 'Render' : process.platform,
        memoryMb: { rss: Math.round(mem.rss / 1024 / 1024), heapUsed: Math.round(mem.heapUsed / 1024 / 1024), heapTotal: Math.round(mem.heapTotal / 1024 / 1024) },
        inlineWorkers: process.env.INLINE_WORKERS === 'true'
      },
      database,
      queue,
      worker,
      metrics: metricsSnapshot(),
      // Only whether each key is set, never the value
      integrations: [
        { key: 'MONGODB_URI', label: 'MongoDB', configured: !!process.env.MONGODB_URI },
        { key: 'AUTH_SECRET', label: 'Session signing secret', configured: !!process.env.AUTH_SECRET },
        { key: 'GEMINI_API_KEY', label: 'Google Gemini', configured: !!process.env.GEMINI_API_KEY },
        { key: 'DEEPSEEK_API_KEY', label: 'DeepSeek', configured: !!process.env.DEEPSEEK_API_KEY },
        { key: 'RESEND_API_KEY', label: 'Resend email', configured: emailConfigured() },
        { key: 'GOOGLE_CLIENT_ID', label: 'Google sign-in', configured: !!process.env.GOOGLE_CLIENT_ID },
        { key: 'GITHUB_CLIENT_ID', label: 'GitHub sign-in', configured: !!process.env.GITHUB_CLIENT_ID },
        { key: 'LINKEDIN_CLIENT_ID', label: 'LinkedIn sign-in', configured: !!process.env.LINKEDIN_CLIENT_ID },
        { key: 'RAPIDAPI_KEY', label: 'Live job listings (RapidAPI)', configured: !!process.env.RAPIDAPI_KEY }
      ]
    }
  });
}));

// ── Feature flags, maintenance, versions ─────────────────────────────────────
router.get('/settings', requireAdmin('settings.view'), handle(async (req, res) => {
  const settings = await getSettings();
  res.json({
    success: true,
    data: settings,
    features: Object.entries(FEATURES).map(([key, f]) => ({ key, label: f.label, description: f.description })),
    clients: Object.entries(VERSION_CLIENTS).map(([key, c]) => ({ key, label: c.label })),
    securityLimits: Object.entries(SECURITY_LIMITS).map(([key, l]) => ({ key, label: l.label })),
    canSave: await dbReady(0)
  });
}));

router.put('/settings/:group', requireAdmin('settings.manage'), requireDb, handle(async (req, res) => {
  const group = req.params.group;
  if (!SETTING_KEYS.includes(group)) throw httpError(404, 'Unknown settings group.');
  const { before, after } = await saveSettingGroup(group, req.body || {}, req.admin.name);

  // Log only what changed
  const changed = {};
  for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) changed[key] = { from: before?.[key], to: after?.[key] };
  }
  if (Object.keys(changed).length) {
    await audit(req, `settings.${group}_updated`, { targetType: 'settings', targetId: group, targetLabel: group, details: changed });
  }
  res.json({ success: true, data: await getSettings() });
}));

export default router;

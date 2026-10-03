// In-memory request metrics for System Health. Per server process, reset on restart.

const BUCKET_MS = 60 * 1000;
const KEEP_BUCKETS = 24 * 60; // 24 hours of 1-minute buckets
const buckets = new Map(); // minute → { requests, errors, totalMs }
const routeStats = new Map(); // "METHOD /path" → { count, errors, totalMs }
const recentErrors = [];
const startedAt = Date.now();

// Collapses ids so /api/admin/users/64f… and /api/admin/users/65a… count as one route
function routeKey(req) {
  const path = (req.baseUrl || '') + (req.route?.path || req.path || '');
  return `${req.method} ${path.replace(/^\/_\/backend/, '').replace(/[a-f0-9]{24}/gi, ':id').replace(/\/\d+(?=\/|$)/g, '/:n')}`;
}

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const minute = Math.floor(Date.now() / BUCKET_MS);
    const bucket = buckets.get(minute) || { requests: 0, errors: 0, totalMs: 0 };
    bucket.requests++;
    bucket.totalMs += ms;
    const isError = res.statusCode >= 500;
    if (isError) bucket.errors++;
    buckets.set(minute, bucket);
    if (buckets.size > KEEP_BUCKETS) {
      for (const key of buckets.keys()) {
        if (key < minute - KEEP_BUCKETS) buckets.delete(key);
      }
    }

    if (req.path.startsWith('/api/') || req.path.startsWith('/_/backend/api/')) {
      const key = routeKey(req);
      const stat = routeStats.get(key) || { count: 0, errors: 0, totalMs: 0, maxMs: 0 };
      stat.count++;
      stat.totalMs += ms;
      stat.maxMs = Math.max(stat.maxMs, ms);
      if (isError) stat.errors++;
      routeStats.set(key, stat);
      if (isError) {
        recentErrors.unshift({ route: key, status: res.statusCode, at: new Date() });
        recentErrors.length = Math.min(recentErrors.length, 25);
      }
    }
  });
  next();
}

function sumSince(ms) {
  const from = Math.floor((Date.now() - ms) / BUCKET_MS);
  let requests = 0;
  let errors = 0;
  let totalMs = 0;
  for (const [minute, b] of buckets) {
    if (minute >= from) {
      requests += b.requests;
      errors += b.errors;
      totalMs += b.totalMs;
    }
  }
  return { requests, errors, avgMs: requests ? Math.round(totalMs / requests) : 0 };
}

export function metricsSnapshot() {
  const now = Math.floor(Date.now() / BUCKET_MS);
  const perMinute = [];
  for (let i = 59; i >= 0; i--) {
    const b = buckets.get(now - i);
    perMinute.push({ minute: new Date((now - i) * BUCKET_MS).toISOString(), requests: b?.requests || 0, errors: b?.errors || 0, avgMs: b?.requests ? Math.round(b.totalMs / b.requests) : 0 });
  }
  const routes = [...routeStats.entries()]
    .map(([route, s]) => ({ route, count: s.count, errors: s.errors, avgMs: Math.round(s.totalMs / s.count), maxMs: Math.round(s.maxMs) }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 15);
  return {
    since: new Date(startedAt),
    lastHour: sumSince(60 * 60 * 1000),
    last24h: sumSince(24 * 60 * 60 * 1000),
    perMinute,
    slowestRoutes: routes,
    recentErrors: [...recentErrors]
  };
}

import mongoose from 'mongoose';

// Loads a db.js model by name. db.js registers them on import; the admin router imports db.js first.
export const model = (name) => mongoose.model(name);

export const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ?page=&limit= → { page, limit, skip } with sane bounds
export function paging(query, { defaultLimit = 25, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

// ?from=YYYY-MM-DD&to=YYYY-MM-DD → a createdAt filter. `to` is inclusive of the whole day.
export function dateRange(query, field = 'createdAt') {
  const range = {};
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if (from && !isNaN(from)) range.$gte = from;
  if (to && !isNaN(to)) {
    to.setUTCHours(23, 59, 59, 999);
    range.$lte = to;
  }
  return Object.keys(range).length ? { [field]: range } : {};
}

export const isId = (id) => mongoose.isValidObjectId(id);

// Wraps an async route so a thrown error becomes a JSON response instead of a hung request
export function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      // A streamed response (CSV export) can fail after the headers went out
      if (res.headersSent) {
        console.error('[admin]', req.method, req.path, err);
        return res.end();
      }
      const status = err.status || (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500);
      if (status >= 500) console.error('[admin]', req.method, req.path, err);
      res.status(status).json({ success: false, error: status >= 500 ? 'Something went wrong. Please try again.' : err.message });
    }
  };
}

export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export { isEmail };

import ApplicationEvent from './models/ApplicationEvent.js';

// Event data is for debugging and the user's timeline; personal values must never land in it
const SENSITIVE_KEY = /value|answer|email|phone|password|token|secret|resume_?text|cover_?letter|salary|address|dob|ssn/i;

export function redact(data, depth = 0) {
  if (data === null || typeof data !== 'object') return data;
  if (depth > 5) return '[truncated]';
  if (Array.isArray(data)) return data.map((item) => redact(item, depth + 1));
  return Object.fromEntries(Object.entries(data).map(([key, val]) => [
    key,
    SENSITIVE_KEY.test(key) ? '[redacted]' : redact(val, depth + 1)
  ]));
}

// Logging must never break the pipeline, so failures are swallowed and reported to the console
export async function logEvent({ applicationId = null, resumeProfileId = null, userId, type, actor = 'agent', message, data = {}, queueJobId = null, durationMs }) {
  // String(undefined) would pass the required check and orphan the event under user "undefined"
  if (userId === undefined || userId === null || userId === '') {
    console.warn(`[agent] dropped event ${type}: missing userId`);
    return null;
  }
  try {
    return await ApplicationEvent.create({
      applicationId, resumeProfileId, userId: String(userId), type, actor, message,
      data: redact(data), queueJobId, durationMs
    });
  } catch (err) {
    console.warn(`[agent] failed to log event ${type}:`, err.message);
    return null;
  }
}

export function listEvents({ applicationId, userId, limit = 200 }) {
  return ApplicationEvent.find({ applicationId, userId: String(userId) }).sort({ createdAt: 1, _id: 1 }).limit(limit).lean();
}

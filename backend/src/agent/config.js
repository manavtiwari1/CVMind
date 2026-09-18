const envInt = (name, fallback) => Number.parseInt(process.env[name], 10) || fallback;

// One runner per pipeline stage; apply is slow (browser) so it gets long leases and low concurrency
export const QUEUE_CONFIG = {
  parse: { concurrency: envInt('AGENT_PARSE_CONCURRENCY', 2), leaseMs: 2 * 60 * 1000 },
  match: { concurrency: envInt('AGENT_MATCH_CONCURRENCY', 4), leaseMs: 2 * 60 * 1000 },
  tailor: { concurrency: envInt('AGENT_TAILOR_CONCURRENCY', 2), leaseMs: 3 * 60 * 1000 },
  apply: { concurrency: envInt('AGENT_APPLY_CONCURRENCY', 1), leaseMs: 5 * 60 * 1000 }
};

export const RETRY_POLICY = {
  baseMs: 5000,
  capMs: 15 * 60 * 1000,
  jitter: 0.2,
  defaultMaxAttempts: 5
};

export const POLL_INTERVAL = { minMs: 500, maxMs: 5000 };

// Fit score: 40% skills, 40% semantic experience match, 20% title/seniority/preferences; null components are dropped
export const SCORING = {
  version: '1',
  weights: { skills: 0.4, semantic: 0.4, title: 0.08, seniority: 0.06, preferences: 0.06 },
  // Embedding cosine for unrelated text sits around 0.5, so raw similarity is stretched over this band
  semanticCalibration: { lo: 0.55, hi: 0.85 },
  titleCalibration: { lo: 0.6, hi: 0.9 },
  impliedCredit: 0.6,
  niceToHaveWeight: 0.5,
  coreResponsibilityWeight: 1.5,
  yearsTolerance: 0.5,
  strongThreshold: 75
};

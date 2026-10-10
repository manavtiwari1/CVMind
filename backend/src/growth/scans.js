import mongoose from 'mongoose';
import { resumeKeyFor } from '../db.js';

// The user's own ATS checks, for the score history on My Documents
const Scan = () => mongoose.model('Scan');

// A score change smaller than this is shown as "about the same": the AI can score the same
// resume a few points apart on different runs
export const SCORE_NOISE = 3;

const toClient = (s) => ({
  id: String(s._id),
  fileName: s.fileName,
  resumeKey: s.resumeKey || resumeKeyFor(s.fileName),
  score: s.score,
  keywordsScore: s.keywordsScore ?? null,
  contentScore: s.contentScore ?? null,
  formattingScore: s.formattingScore ?? null,
  workId: s.workId || '',
  createdAt: s.createdAt
});

export async function listScans(userId, limit = 50) {
  const rows = await Scan().find({ userId: String(userId) })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
  return rows.map(toClient);
}

// The last check of the same resume before this one, to say how much the score moved
export async function previousScan(userId, fileName) {
  if (!userId) return null;
  const key = resumeKeyFor(fileName);
  if (!key) return null;
  const row = await Scan().findOne({ userId: String(userId), resumeKey: key }).sort({ createdAt: -1 }).lean();
  return row ? toClient(row) : null;
}

export function scoreChange(previous, score) {
  if (!previous || !Number.isFinite(Number(score))) return null;
  const delta = Math.round(Number(score) - Number(previous.score));
  return {
    previousScore: previous.score,
    previousAt: previous.createdAt,
    delta,
    trend: Math.abs(delta) < SCORE_NOISE ? 'same' : delta > 0 ? 'up' : 'down'
  };
}

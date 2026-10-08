import { cosine } from '../ai/geminiClient.js';
import { vectorFromStored } from '../resume/embeddings.js';
import { monthIndex } from './experience.js';

const round3 = (value) => Math.round(value * 1000) / 1000;

export function calibrate(value, { lo, hi }) {
  return Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
}

// Recent experience counts fully; bullets from roles that ended long ago count a little less
export function recencyWeight(role, now = new Date()) {
  if (role.current || /present|current|now/i.test(String(role.endDate ?? ''))) return 1;
  const end = monthIndex(role.endDate, { end: true }) ?? monthIndex(role.startDate);
  if (end === null) return 1;
  const yearsAgo = (now.getUTCFullYear() * 12 + now.getUTCMonth() - end) / 12;
  if (yearsAgo <= 3) return 1;
  if (yearsAgo <= 6) return 0.9;
  return 0.8;
}

export function resumeUnits(resume, now = new Date()) {
  const vectors = new Map((resume.embeddings?.bullets || []).filter((b) => b.vector).map((b) => [b.bulletId, b.vector]));
  const units = [];
  const add = (bulletId, text, recency) => {
    const stored = vectors.get(bulletId);
    if (stored && text) units.push({ bulletId, text, recency, vector: vectorFromStored(stored) });
  };
  const structured = resume.structured || {};
  add('summary', structured.summary, 1);
  for (const role of structured.experience || []) {
    const recency = recencyWeight(role, now);
    for (const bullet of role.bullets || []) add(bullet.id, bullet.text, recency);
  }
  for (const project of structured.projects || []) {
    for (const bullet of project.bullets || []) add(bullet.id, bullet.text, 1);
  }
  return units;
}

export function jobUnits(job) {
  const vectors = new Map((job.embeddings?.responsibilities || []).map((e) => [e.idx, e.vector]));
  return (job.responsibilities || [])
    .map((item, idx) => ({ text: item.text, core: Boolean(item.core), stored: vectors.get(idx) }))
    .filter((item) => item.stored)
    .map(({ stored, ...item }) => ({ ...item, vector: vectorFromStored(stored) }));
}

// For each responsibility take the best-matching resume bullet, then average (core duties weigh more)
export function scoreSemantic({ responsibilities, units }, cfg) {
  if (!responsibilities.length || !units.length) return { value: null, raw: null, topMatches: [] };

  let weightedSum = 0;
  let weightTotal = 0;
  const topMatches = [];
  for (const responsibility of responsibilities) {
    let best = -Infinity;
    let bestUnit = null;
    for (const unit of units) {
      const similarity = cosine(responsibility.vector, unit.vector) * unit.recency;
      if (similarity > best) {
        best = similarity;
        bestUnit = unit;
      }
    }
    const weight = responsibility.core ? cfg.coreResponsibilityWeight : 1;
    weightedSum += weight * best;
    weightTotal += weight;
    topMatches.push({ responsibility: responsibility.text, bulletId: bestUnit.bulletId, bulletText: bestUnit.text, similarity: round3(best) });
  }

  const raw = weightedSum / weightTotal;
  return {
    value: round3(calibrate(raw, cfg.semanticCalibration)),
    raw: round3(raw),
    topMatches: topMatches.sort((a, b) => b.similarity - a.similarity).slice(0, 8)
  };
}

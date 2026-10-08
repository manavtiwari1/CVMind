import { SCORING } from '../config.js';
import { scoreSkills } from './skills.js';
import { scoreSemantic, resumeUnits, jobUnits } from './semantic.js';
import { scoreFit } from './fit.js';
import { evaluateGates } from './gates.js';

const round3 = (value) => (value === null ? null : Math.round(value * 1000) / 1000);

// Pure fit score for one resume against one parsed job; no I/O so it is easy to test and re-run
export function computeScore({ resume, job, preferences, titleSimilarity = null, now = new Date() }, cfg = SCORING) {
  const skills = scoreSkills({
    candidateSkills: resume.derived?.normalizedSkillSet || [],
    mustHave: job.requirements?.normalizedMust || [],
    niceToHave: job.requirements?.normalizedNice || []
  }, cfg);

  // Vectors from different embedding models or sizes are not comparable
  const compatible = Boolean(resume.embeddings?.embedModel)
    && resume.embeddings.embedModel === job.embeddings?.embedModel
    && resume.embeddings.dims === job.embeddings?.dims;
  const semantic = compatible
    ? scoreSemantic({ responsibilities: jobUnits(job), units: resumeUnits(resume, now) }, cfg)
    : { value: null, raw: null, topMatches: [] };

  const fit = scoreFit({ resume, job, preferences, titleSimilarity }, cfg);
  const components = {
    skills: round3(skills.value),
    semantic: round3(semantic.value),
    title: round3(fit.title),
    seniority: round3(fit.seniority),
    preferences: round3(fit.preferences)
  };

  let weighted = 0;
  let weightTotal = 0;
  const weightsUsed = {};
  for (const [key, value] of Object.entries(components)) {
    if (value === null) continue;
    weighted += cfg.weights[key] * value;
    weightTotal += cfg.weights[key];
    weightsUsed[key] = cfg.weights[key];
  }
  const total = weightTotal ? Math.round((100 * weighted) / weightTotal) : 0;

  const { gates, gatesPassed } = evaluateGates({ resume, job, preferences }, cfg);
  const suggestAt = preferences.minScoreToSuggest ?? 60;
  const recommendation = !gatesPassed ? 'not_recommended' : total >= cfg.strongThreshold ? 'strong' : total >= suggestAt ? 'good' : 'weak';

  return {
    total,
    components,
    weightsUsed,
    gates,
    gatesPassed,
    recommendation,
    matchedSkills: skills.matched,
    impliedSkills: skills.implied,
    missingSkills: skills.missing,
    missingMustHave: skills.missingMustHave,
    topMatches: semantic.topMatches,
    semanticRaw: semantic.raw,
    scoringVersion: cfg.version,
    computedAt: now.toISOString()
  };
}

import { impliedSkillSet } from './normalizeSkill.js';

// Weighted share of the job's skills the candidate has: exact 1.0, implied partial credit, must-haves count double
export function scoreSkills({ candidateSkills = [], mustHave = [], niceToHave = [] }, cfg) {
  const have = new Set(candidateSkills);
  const implied = impliedSkillSet(have);
  const items = [
    ...mustHave.map((skill) => ({ skill, weight: 1, must: true })),
    ...niceToHave.map((skill) => ({ skill, weight: cfg.niceToHaveWeight, must: false }))
  ];
  if (!items.length) return { value: null, matched: [], implied: [], missing: [], missingMustHave: [] };

  let earned = 0;
  let total = 0;
  const matched = [];
  const impliedMatches = [];
  const missing = [];
  const missingMustHave = [];
  for (const item of items) {
    total += item.weight;
    if (have.has(item.skill)) {
      earned += item.weight;
      matched.push(item.skill);
    } else if (implied.has(item.skill)) {
      earned += item.weight * cfg.impliedCredit;
      impliedMatches.push(item.skill);
    } else {
      missing.push(item.skill);
      if (item.must) missingMustHave.push(item.skill);
    }
  }
  return { value: earned / total, matched, implied: impliedMatches, missing, missingMustHave };
}

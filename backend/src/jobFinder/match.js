import { scoreSkills } from '@cvmind/auto-apply-agent/scoring/skills.js';
import { normalizeSkillList } from '@cvmind/auto-apply-agent/scoring/normalizeSkill.js';
import { SENIORITY_LADDER, latestRole } from '@cvmind/auto-apply-agent/scoring/experience.js';
import { SCORING } from '@cvmind/auto-apply-agent/config.js';
import { extractSkills } from './skills.js';

// How well one job fits the user's resume and preferences, without an AI call: skills named in the
// job against the resume's skills, the job title against the roles they want, seniority and place.

const WEIGHTS = { skills: 0.55, title: 0.25, seniority: 0.1, location: 0.1 };
const TITLE_STOP = new Set(['and', 'or', 'of', 'the', 'a', 'an', 'in', 'for', 'to', 'with', 'i', 'ii', 'iii', 'iv', 'sr', 'jr', 'senior', 'junior', 'lead', 'staff', 'principal', 'intern', 'remote']);
const TITLE_SAME = { developer: 'engineer', programmer: 'engineer', swe: 'engineer', sde: 'engineer', frontend: 'front', backend: 'back', fullstack: 'full' };

const titleWords = (title) => String(title || '').toLowerCase()
  .replace(/front[\s-]?end/g, 'frontend').replace(/back[\s-]?end/g, 'backend').replace(/full[\s-]?stack/g, 'fullstack')
  .split(/[^a-z0-9+#.]+/)
  .filter((w) => w && !TITLE_STOP.has(w))
  .map((w) => TITLE_SAME[w] || w);

/** Seniority a job title states, or null when it doesn't say */
export function jobSeniority(title) {
  const t = String(title || '').toLowerCase();
  if (/\b(intern|internship|trainee|apprentice)\b/.test(t)) return 'intern';
  if (/\b(principal|distinguished|fellow)\b/.test(t)) return 'principal';
  if (/\b(staff|lead|architect|head|director)\b/.test(t)) return 'staff';
  if (/\b(senior|sr)\b/.test(t)) return 'senior';
  if (/\b(junior|jr|graduate|entry|fresher|associate)\b/.test(t)) return 'junior';
  return null;
}

/** What the candidate brings: skills, the roles they want and their level */
export function candidateFrom(profile, preferences = {}) {
  const structured = profile?.structured || {};
  const skills = profile?.derived?.normalizedSkillSet?.length
    ? profile.derived.normalizedSkillSet
    : normalizeSkillList((structured.skills || []).map((s) => s.normalized || s.name));
  const latest = latestRole(structured.experience || []);
  const titles = (preferences.targetTitles || []).filter(Boolean);
  return {
    skills,
    titles: titles.length ? titles : [latest?.title, structured.headline].filter(Boolean).slice(0, 1),
    levels: (preferences.seniority?.length ? preferences.seniority : [profile?.derived?.seniority]).filter(Boolean),
    locations: (preferences.locations || []).map((l) => l.toLowerCase().trim()).filter(Boolean),
    workModes: preferences.workModes || []
  };
}

function titleFit(jobTitle, wanted) {
  const have = new Set(titleWords(jobTitle));
  let best = null;
  for (const title of wanted) {
    const words = titleWords(title);
    if (!words.length) continue;
    const share = words.filter((w) => have.has(w)).length / words.length;
    best = Math.max(best ?? 0, share);
  }
  return best;
}

function seniorityFit(jobTitle, levels) {
  const job = SENIORITY_LADDER.indexOf(jobSeniority(jobTitle));
  const wanted = levels.map((l) => SENIORITY_LADDER.indexOf(l)).filter((i) => i >= 0);
  if (job < 0 || !wanted.length) return null;
  const distance = Math.min(...wanted.map((w) => Math.abs(w - job)));
  return distance === 0 ? 1 : distance === 1 ? 0.5 : 0;
}

function locationFit(job, { locations, workModes }) {
  if (!locations.length && !workModes.length) return null;
  if (job.remote) return workModes.length && !workModes.includes('remote') && !locations.length ? 0.5 : 1;
  const place = String(job.location || '').toLowerCase();
  if (!place) return null;
  if (workModes.length === 1 && workModes[0] === 'remote') return 0;
  if (!locations.length) return null;
  return locations.some((l) => place.includes(l) || l.includes(place)) ? 1 : 0;
}

/**
 * @param {object} job normalized Job Finder job (title, location, remote, description?)
 * @param {object} candidate from candidateFrom()
 * @returns {{ score: number|null, matchedSkills: string[], missingSkills: string[], components: object }}
 */
export function matchJob(job, candidate) {
  const jobSkills = extractSkills(`${job.title}\n${job.description || ''}`, candidate.skills);
  const skills = jobSkills.length && candidate.skills.length
    ? scoreSkills({ candidateSkills: candidate.skills, mustHave: jobSkills }, SCORING)
    : { value: null, matched: [], implied: [], missing: jobSkills };

  const components = {
    skills: skills.value,
    title: candidate.titles.length ? titleFit(job.title, candidate.titles) : null,
    seniority: seniorityFit(job.title, candidate.levels),
    location: locationFit(job, candidate)
  };
  let weighted = 0;
  let total = 0;
  for (const [key, value] of Object.entries(components)) {
    if (value === null || value === undefined) continue;
    weighted += WEIGHTS[key] * value;
    total += WEIGHTS[key];
  }
  // Below this much evidence a percentage would mislead, so no score is shown
  const score = total >= WEIGHTS.title ? Math.round((100 * weighted) / total) : null;
  return {
    score,
    matchedSkills: [...skills.matched, ...skills.implied],
    missingSkills: skills.missing,
    components
  };
}

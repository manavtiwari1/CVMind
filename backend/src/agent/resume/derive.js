import crypto from 'crypto';
import { normalizeSkill, normalizeSkillList } from '../scoring/normalizeSkill.js';
import { totalYearsExperience, latestRole, inferSeniority } from '../scoring/experience.js';

export const PARSE_VERSION = 1;

const clean = (value) => String(value ?? '').trim();
const cleanList = (list) => (list || []).map(clean).filter(Boolean);

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function textHash(text) {
  return sha256(clean(text)).slice(0, 16);
}

// Bullets may arrive as strings (LLM output, editor) or {id, text} (stored); ids are positional
function buildBullets(list, prefix) {
  return (list || [])
    .map((bullet) => clean(typeof bullet === 'string' ? bullet : bullet?.text))
    .filter(Boolean)
    .map((text, j) => ({ id: `${prefix}-b${j}`, text }));
}

// Turns LLM/editor resume data into the stored canonical shape plus server-computed fields
export function buildProfileData(input, { now = new Date() } = {}) {
  const contact = input.contact || {};
  const experience = (input.experience || []).map((role, i) => ({
    id: `exp${i}`,
    company: clean(role.company),
    title: clean(role.title),
    employmentType: role.employmentType || 'other',
    startDate: clean(role.startDate),
    endDate: role.current ? '' : clean(role.endDate),
    current: Boolean(role.current),
    location: clean(role.location),
    skills: cleanList(role.skills),
    bullets: buildBullets(role.bullets, `exp${i}`)
  }));
  const projects = (input.projects || []).map((project, i) => ({
    id: `proj${i}`,
    name: clean(project.name),
    skills: cleanList(project.skills),
    bullets: buildBullets(project.bullets, `proj${i}`)
  }));

  const seen = new Set();
  const skills = [];
  for (const skill of input.skills || []) {
    const name = clean(skill?.name ?? skill);
    const normalized = normalizeSkill(name);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    skills.push({ name, normalized, category: skill?.category || 'other' });
  }

  const structured = {
    contact: Object.fromEntries(['name', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio'].map((key) => [key, clean(contact[key])])),
    headline: clean(input.headline),
    summary: clean(input.summary),
    experience,
    education: (input.education || []).map((edu) => ({
      institution: clean(edu.institution),
      degree: clean(edu.degree),
      degreeLevel: edu.degreeLevel || 'none',
      field: clean(edu.field),
      endYear: clean(edu.endYear),
      gpa: clean(edu.gpa)
    })),
    skills,
    projects,
    certifications: (input.certifications || []).map((cert) => ({ name: clean(cert.name), issuer: clean(cert.issuer), year: clean(cert.year) })).filter((cert) => cert.name),
    languages: cleanList(input.languages)
  };

  const years = totalYearsExperience(experience, { now });
  const latestTitle = latestRole(experience)?.title || structured.headline;
  return {
    structured,
    derived: {
      totalYearsExperience: years,
      seniority: inferSeniority(years, latestTitle),
      normalizedSkillSet: normalizeSkillList([
        ...skills.map((skill) => skill.name),
        ...experience.flatMap((role) => role.skills),
        ...projects.flatMap((project) => project.skills)
      ])
    }
  };
}

// Units compared against job responsibilities: summary plus every experience and project bullet
export function collectBullets(structured) {
  const units = [];
  if (clean(structured?.summary)) units.push({ bulletId: 'summary', text: clean(structured.summary) });
  for (const role of structured?.experience || []) for (const bullet of role.bullets || []) units.push({ bulletId: bullet.id, text: bullet.text });
  for (const project of structured?.projects || []) for (const bullet of project.bullets || []) units.push({ bulletId: bullet.id, text: bullet.text });
  return units;
}

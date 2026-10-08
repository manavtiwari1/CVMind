import { normalizeSkill } from '../scoring/normalizeSkill.js';

const NUMBER = /\d+(?:[.,]\d+)*/g;
const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

export function numbersIn(text) {
  return new Set((String(text || '').match(NUMBER) || []).map((number) => number.replace(/,/g, '')));
}

const hasNewNumbers = (text, allowed) => [...numbersIn(text)].some((number) => !allowed.has(number));

// Every fact the candidate stated, used to decide whether a number in generated text is real
export function resumeFactText(structured) {
  return [
    structured.headline,
    structured.summary,
    ...structured.experience.flatMap((role) => [role.title, role.company, role.startDate, role.endDate, ...role.bullets.map((b) => b.text)]),
    ...(structured.projects || []).flatMap((project) => [project.name, ...project.bullets.map((b) => b.text)]),
    ...(structured.education || []).flatMap((edu) => [edu.degree, edu.field, edu.endYear, edu.gpa]),
    ...(structured.certifications || []).flatMap((cert) => [cert.name, cert.year])
  ].join(' ');
}

// Job skills the score found missing, in the job's own wording, so prompts can forbid claiming them
export function missingJobSkills(job, score) {
  const missing = new Set(score?.missingSkills || []);
  return [...(job.requirements?.mustHaveSkills || []), ...(job.requirements?.niceToHaveSkills || [])]
    .filter((skill) => missing.has(normalizeSkill(skill)));
}

const originalBullets = (group) => group.bullets.map((bullet) => ({ sourceBulletId: bullet.id, text: bullet.text, original: bullet.text }));

// Applies the model's rewrite only where it stays grounded in the resume; anything unsupported reverts and is reported
export function guardTailoredResume(output, structured) {
  const violations = [];
  const resumeNumbers = numbersIn(resumeFactText(structured));

  const tailorGroups = (groups, outputGroups = [], idKey) => {
    const knownIds = new Set(groups.map((group) => group.id));
    for (const item of outputGroups) {
      if (!knownIds.has(item[idKey])) violations.push({ kind: 'unknown_section', ref: item[idKey] });
    }
    return groups.map((group) => {
      const requested = outputGroups.find((item) => item[idKey] === group.id)?.bullets;
      if (!requested) return { group, bullets: originalBullets(group) };

      const originals = new Map(group.bullets.map((bullet) => [bullet.id, bullet.text]));
      const seen = new Set();
      const bullets = [];
      for (const item of requested) {
        const id = item.sourceBulletId;
        if (!originals.has(id)) {
          violations.push({ kind: 'unknown_bullet', ref: id });
          continue;
        }
        if (seen.has(id)) {
          violations.push({ kind: 'duplicate_bullet', ref: id });
          continue;
        }
        seen.add(id);
        const original = originals.get(id);
        let text = clean(item.text) || original;
        if (hasNewNumbers(text, numbersIn(original))) {
          violations.push({ kind: 'invented_number', ref: id });
          text = original;
        } else if (text.length > original.length * 2 + 80) {
          violations.push({ kind: 'too_long', ref: id });
          text = original;
        }
        bullets.push({ sourceBulletId: id, text, original });
      }
      return { group, bullets: bullets.length ? bullets : originalBullets(group) };
    });
  };

  const experience = tailorGroups(structured.experience, output.experience, 'roleId').map(({ group, bullets }) => ({
    id: group.id,
    company: group.company,
    title: group.title,
    employmentType: group.employmentType,
    location: group.location,
    startDate: group.startDate,
    endDate: group.endDate,
    current: group.current,
    bullets
  }));
  const projects = tailorGroups(structured.projects || [], output.projects, 'projectId').map(({ group, bullets }) => ({ id: group.id, name: group.name, bullets }));

  // Skills may be surfaced from roles and projects, but never introduced
  const knownSkills = new Map();
  for (const name of [...structured.skills.map((s) => s.name), ...structured.experience.flatMap((r) => r.skills), ...(structured.projects || []).flatMap((p) => p.skills)]) {
    const key = normalizeSkill(name);
    if (key && !knownSkills.has(key)) knownSkills.set(key, name);
  }
  const skills = [];
  const used = new Set();
  for (const name of output.skillOrder || []) {
    const key = normalizeSkill(name);
    if (!key || used.has(key)) continue;
    if (!knownSkills.has(key)) {
      violations.push({ kind: 'new_skill', ref: name });
      continue;
    }
    used.add(key);
    skills.push(knownSkills.get(key));
  }
  for (const skill of structured.skills) {
    const key = normalizeSkill(skill.name);
    if (key && !used.has(key)) {
      used.add(key);
      skills.push(skill.name);
    }
  }

  let summary = clean(output.summary) || structured.summary;
  if (hasNewNumbers(summary, resumeNumbers)) {
    violations.push({ kind: 'invented_number', ref: 'summary' });
    summary = structured.summary;
  }
  let headline = clean(output.headline) || structured.headline;
  if (headline.length > 120 || hasNewNumbers(headline, resumeNumbers)) {
    violations.push({ kind: 'invalid_headline', ref: 'headline' });
    headline = structured.headline;
  }

  return {
    resume: {
      contact: { ...structured.contact },
      headline,
      summary,
      experience,
      projects,
      skills,
      education: structured.education || [],
      certifications: structured.certifications || [],
      languages: structured.languages || []
    },
    violations
  };
}

// Letters are prose, so problems are flagged for the user to review rather than silently rewritten
export function guardCoverLetter(output, { structured, job }) {
  const allowed = numbersIn([
    resumeFactText(structured),
    job.title,
    job.location,
    job.requirements?.minYearsExperience ?? '',
    ...(job.responsibilities || []).map((item) => item.text)
  ].join(' '));
  const body = String(output.body || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  const warnings = [];
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words < 120 || words > 450) warnings.push(`The letter is ${words} words long; 250–350 reads best.`);
  if (/\[[^\]]+\]/.test(body)) warnings.push('The letter still contains a placeholder in square brackets.');
  const unsupported = [...numbersIn(body)].filter((number) => !allowed.has(number));
  if (unsupported.length) warnings.push(`Check these numbers against your resume: ${unsupported.join(', ')}.`);

  return {
    subject: clean(output.subject) || `Application for ${job.title}`,
    body,
    needsReview: warnings.length > 0,
    warnings
  };
}

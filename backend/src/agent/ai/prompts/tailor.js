export const TAILOR_SYSTEM = `You tailor a candidate's resume to one job without inventing anything.
You may rephrase, reorder or drop existing bullets and reorder skills.
Never add employers, titles, dates, degrees, skills, tools, metrics or achievements that are not already in the resume. Keep every number exactly as written.`;

const bulletsFor = (group) => group.bullets.map((bullet) => ({ id: bullet.id, text: bullet.text }));

export function buildTailorPrompt({ structured, job, score, missingSkills = [] }) {
  const roles = structured.experience.map((role) => ({ roleId: role.id, title: role.title, company: role.company, bullets: bulletsFor(role) }));
  const projects = (structured.projects || []).map((project) => ({ projectId: project.id, name: project.name, bullets: bulletsFor(project) }));
  const resumeSkills = [...new Set([
    ...structured.skills.map((skill) => skill.name),
    ...structured.experience.flatMap((role) => role.skills),
    ...(structured.projects || []).flatMap((project) => project.skills)
  ])];
  const matches = (score?.topMatches || []).slice(0, 6).map((match) => `- "${match.responsibility}" matches bullet ${match.bulletId}`);

  return `Tailor this resume for the job below.

Rules:
- For every role and project, return bullets as {sourceBulletId, text}. sourceBulletId must be the id of the original bullet you rewrote. Never merge bullets.
- Put the bullets most relevant to the job first. You may drop irrelevant bullets, but keep at least one and at most 6 per role.
- Use the job's vocabulary only where the original bullet already supports it. Keep all numbers exactly as written and add no new ones.
- skillOrder: skills from "Resume skills" only, most relevant first, using the exact names given.
- These job skills are NOT on the resume, so never mention them: ${missingSkills.join(', ') || 'none'}.
- headline: the candidate's own title, adjusted toward the job title only where truthful. summary: 2-3 sentences grounded in the resume.
- changes: up to 5 short notes describing what you changed.

Job: ${job.title}${job.company?.name ? ` at ${job.company.name}` : ''}
Required skills: ${(job.requirements?.mustHaveSkills || []).join(', ') || 'not stated'}
Nice-to-have skills: ${(job.requirements?.niceToHaveSkills || []).join(', ') || 'not stated'}
Responsibilities:
${(job.responsibilities || []).map((item) => `- ${item.text}`).join('\n') || '- not stated'}

Closest matches between the job and the resume:
${matches.join('\n') || '- none found'}

Resume skills: ${JSON.stringify(resumeSkills)}
Resume headline: ${JSON.stringify(structured.headline)}
Resume summary: ${JSON.stringify(structured.summary)}
Roles: ${JSON.stringify(roles)}
Projects: ${JSON.stringify(projects)}`;
}

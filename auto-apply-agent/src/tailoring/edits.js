import { z } from 'zod';

const bulletText = z.string().max(600);
const sectionEdit = z.array(z.object({ id: z.string(), bullets: z.array(bulletText).max(20) })).max(40);

// User edits to tailored documents; the user may write anything, since it's their own resume
export const TailoredEdit = z.strictObject({
  headline: z.string().trim().max(160),
  summary: z.string().trim().max(2000),
  experience: sectionEdit,
  projects: sectionEdit,
  skills: z.array(z.string().max(80)).max(100),
  coverLetter: z.object({
    subject: z.string().trim().max(200),
    body: z.string().trim().min(1).max(8000)
  })
}).partial();

// Keeps each bullet's link to its source (exact text match first, then position) so the diff view stays meaningful
function editBullets(group, texts) {
  if (!texts) return group;
  const lines = texts.map((text) => text.trim()).filter(Boolean);
  return {
    ...group,
    bullets: lines.map((text, i) => {
      const prior = group.bullets.find((bullet) => bullet.text === text) ?? group.bullets[i];
      return { sourceBulletId: prior?.sourceBulletId ?? null, text, original: prior?.original ?? null };
    })
  };
}

export function applyTailoredEdits(tailored, edit) {
  const resume = structuredClone(tailored.resume);
  if (edit.headline !== undefined) resume.headline = edit.headline;
  if (edit.summary !== undefined) resume.summary = edit.summary;
  if (edit.experience) {
    const byId = new Map(edit.experience.map((item) => [item.id, item.bullets]));
    resume.experience = resume.experience.map((role) => editBullets(role, byId.get(role.id)));
  }
  if (edit.projects) {
    const byId = new Map(edit.projects.map((item) => [item.id, item.bullets]));
    resume.projects = resume.projects.map((project) => editBullets(project, byId.get(project.id)));
  }
  if (edit.skills) resume.skills = [...new Set(edit.skills.map((skill) => skill.trim()).filter(Boolean))];

  const coverLetter = edit.coverLetter
    ? { subject: edit.coverLetter.subject || tailored.coverLetter?.subject || '', body: edit.coverLetter.body, needsReview: false, warnings: [] }
    : tailored.coverLetter;

  return { ...tailored, resume, coverLetter, userEdited: true, editedAt: new Date() };
}

export const PARSE_RESUME_SYSTEM = `You extract structured data from resumes.
Copy facts exactly as written. Never invent employers, dates, degrees, skills, metrics or links.
Use "" for unknown text fields and [] for missing lists.`;

const MAX_RESUME_CHARS = 30000;

export function buildParseResumePrompt(resumeText) {
  return `Extract this resume into the required JSON.

Rules:
- Dates: "YYYY-MM" when the month is known, "YYYY" when only the year is known, "" when unknown.
- A role that is ongoing ("Present", "Current") has current=true and endDate "".
- employmentType is "internship" for intern/trainee roles.
- bullets: one entry per achievement or responsibility, copied from the resume (fix whitespace only).
- degreeLevel: B.Tech/B.E./BSc/BA/BS -> bachelor; M.Tech/MS/MSc/MBA/MA -> master; PhD -> phd; diploma/associate -> associate; 10th/12th/high school -> high_school.
- skills: every distinct skill, tool, framework or technology listed anywhere in the resume.
- headline: the current or most recent job title.

Resume:
"""
${String(resumeText).slice(0, MAX_RESUME_CHARS)}
"""`;
}

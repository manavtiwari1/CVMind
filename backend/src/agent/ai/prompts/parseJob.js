export const PARSE_JOB_SYSTEM = `You extract structured requirements from job postings.
Only use information stated in the posting. Never invent skills, years, degrees or salary.
Use "" for unknown text, [] for missing lists, -1 for an unstated minimum of years and 0 for unstated salary numbers.`;

const MAX_JOB_CHARS = 30000;

export function buildParseJobPrompt(jobText) {
  return `Extract this job posting into the required JSON.

Rules:
- mustHaveSkills: skills, tools or technologies the posting requires ("must", "required", "you have"). Short names only, e.g. "Python", "Kubernetes".
- niceToHaveSkills: skills described as preferred, a plus or a bonus. Never repeat a must-have.
- minYearsExperience: the smallest number of years required ("3-5 years" -> 3), or -1 when not stated.
- educationLevel: the minimum degree required; "unknown" when not stated; "none" when the posting says no degree is needed.
- equivalentExperienceAccepted: true when "or equivalent experience" (or similar) is stated.
- sponsorshipAvailable: "no" only when the posting says it cannot sponsor visas, "yes" when it says it can, otherwise "unknown".
- responsibilities: what the person will do, one entry each, copied closely from the posting; core=true for the 3-5 most central duties.
- workMode: remote, hybrid or onsite when stated, else unknown. seniority: from the title and requirements, else unknown.
- salary: numbers as stated, with the currency's 3-letter code and the pay period; 0 and "unknown" when absent.

Job posting:
"""
${String(jobText).slice(0, MAX_JOB_CHARS)}
"""`;
}

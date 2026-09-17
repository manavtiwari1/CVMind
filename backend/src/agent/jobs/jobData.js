import { embedTexts, getEmbedModel, getEmbedDims } from '../ai/geminiClient.js';
import { vectorToBuffer } from '../resume/embeddings.js';
import { normalizeSkill, normalizeSkillList } from '../scoring/normalizeSkill.js';

export const JOB_PARSE_VERSION = 1;
const MAX_RESPONSIBILITIES = 40;

const clean = (value) => String(value ?? '').trim();
const cleanList = (list) => [...new Set((list || []).map(clean).filter(Boolean))];

// Stable per-company key used for per-company rate limits
export function companyKeyFor(posting = {}, companyName = '') {
  if (posting.ats === 'greenhouse' && posting.atsIds?.boardToken) return `greenhouse:${posting.atsIds.boardToken.toLowerCase()}`;
  if (posting.ats === 'lever' && posting.atsIds?.company) return `lever:${posting.atsIds.company.toLowerCase()}`;
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (slug) return `company:${slug}`;
  try {
    return `host:${new URL(posting.url).hostname}`;
  } catch {
    return null;
  }
}

// ATS API fields (title, company, salary) are more reliable than the LLM's reading, so they win when present
export function buildJobData(extracted, source = {}, posting = {}) {
  const mustHaveSkills = cleanList(extracted.mustHaveSkills);
  const normalizedMust = normalizeSkillList(mustHaveSkills);
  const mustSet = new Set(normalizedMust);
  const niceToHaveSkills = cleanList(extracted.niceToHaveSkills).filter((skill) => !mustSet.has(normalizeSkill(skill)));
  const companyName = clean(source.company) || clean(extracted.company);

  const salary = extracted.salary;
  const extractedSalary = salary && (salary.min > 0 || salary.max > 0) && /^[A-Z]{3}$/i.test(salary.currency) && salary.period !== 'unknown'
    ? { min: salary.min, max: salary.max, currency: salary.currency.toUpperCase(), period: salary.period }
    : null;

  return {
    title: clean(source.title) || clean(extracted.title) || 'Untitled role',
    company: { name: companyName, key: companyKeyFor(posting, companyName) },
    location: clean(source.location) || clean(extracted.location),
    workMode: source.workMode || extracted.workMode,
    employmentType: extracted.employmentType,
    seniority: extracted.seniority,
    industry: clean(extracted.industry),
    salary: source.salary || extractedSalary,
    responsibilities: (extracted.responsibilities || [])
      .map((item) => ({ text: clean(item.text), core: Boolean(item.core) }))
      .filter((item) => item.text)
      .slice(0, MAX_RESPONSIBILITIES),
    requirements: {
      mustHaveSkills,
      niceToHaveSkills,
      normalizedMust,
      normalizedNice: normalizeSkillList(niceToHaveSkills),
      minYearsExperience: extracted.minYearsExperience >= 0 ? extracted.minYearsExperience : null,
      educationLevel: ['unknown', 'none'].includes(extracted.educationLevel) ? null : extracted.educationLevel,
      educationFields: cleanList(extracted.educationFields),
      equivalentExperienceAccepted: Boolean(extracted.equivalentExperienceAccepted),
      sponsorshipAvailable: extracted.sponsorshipAvailable
    }
  };
}

export async function embedJob({ title, responsibilities }, { client, embed = embedTexts } = {}) {
  const vectors = await embed([title || 'Untitled role', ...responsibilities.map((item) => item.text)], { client });
  return {
    embedModel: getEmbedModel(),
    dims: getEmbedDims(),
    title: vectorToBuffer(vectors[0]),
    responsibilities: responsibilities.map((item, idx) => ({ idx, vector: vectorToBuffer(vectors[idx + 1]) }))
  };
}

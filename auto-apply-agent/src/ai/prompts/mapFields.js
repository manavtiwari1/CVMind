import { CANONICAL_FIELDS } from '../../fill/canonicalFields.js';

export const MAP_FIELDS_SYSTEM = `You map job application form fields to a candidate's profile fields.
Only answer questions using facts given to you about the candidate. Never invent experience, skills or numbers.`;

const KEY_LIST = Object.entries(CANONICAL_FIELDS)
  .map(([key, meta]) => `- ${key}: ${meta.label}`)
  .join('\n');

export function buildMapFieldsPrompt({ fields, candidate, job }) {
  return `Match each form field to one profile key, or to "unknown" when nothing fits.

Profile keys:
${KEY_LIST}
- unknown: nothing above fits this field

Rules:
- Use "open_question" for free-text questions the candidate must answer in prose, and write that answer in "answer" (2-4 sentences, first person, only facts from the candidate below).
- For every other field leave "answer" as "".
- Never map two fields to the same key unless the form clearly repeats it.

Candidate: ${candidate.name || 'the candidate'}${candidate.headline ? `, ${candidate.headline}` : ''}
Experience: ${candidate.years || 'unknown'} years
Skills: ${(candidate.skills || []).join(', ') || 'not listed'}
Recent achievements:
${(candidate.achievements || []).map((item) => `- ${item}`).join('\n') || '- none given'}
Applying for: ${job?.title || 'this role'}${job?.company ? ` at ${job.company}` : ''}

Form fields:
${JSON.stringify(fields, null, 1)}`;
}

import { generateStructured } from '../ai/geminiClient.js';
import { FieldMappingResult } from '../ai/schemas.js';
import { MAP_FIELDS_SYSTEM, buildMapFieldsPrompt } from '../ai/prompts/mapFields.js';
import { CANONICAL_FIELDS } from './canonicalFields.js';

const MAX_AI_FIELDS = 25;

// Asks the model only about fields the keyword rules could not place
export async function mapFieldsWithAi(descriptors, context, { client } = {}) {
  if (!descriptors.length) return new Map();

  const fields = descriptors.slice(0, MAX_AI_FIELDS).map((descriptor) => ({
    fieldId: descriptor.id,
    label: descriptor.label || '',
    name: descriptor.name || '',
    type: descriptor.type || 'text',
    placeholder: descriptor.placeholder || '',
    required: Boolean(descriptor.required),
    options: (descriptor.options || []).map((option) => option.text).slice(0, 12)
  }));

  const profile = context.profile || {};
  const result = await generateStructured({
    schema: FieldMappingResult,
    system: MAP_FIELDS_SYSTEM,
    prompt: buildMapFieldsPrompt({
      fields,
      candidate: {
        name: profile.contact?.name,
        headline: profile.headline,
        years: context.derived?.totalYearsExperience,
        skills: (profile.skills || []).map((skill) => skill.name).slice(0, 15),
        achievements: (context.tailored?.resume?.experience || profile.experience || [])
          .flatMap((role) => (role.bullets || []).map((bullet) => bullet.text))
          .slice(0, 6)
      },
      job: { title: context.job?.title, company: context.job?.company?.name }
    }),
    client,
    temperature: 0.2
  });

  const byId = new Map();
  for (const mapping of result.mappings) {
    const key = mapping.canonicalKey;
    if (!key || key === 'unknown' || !CANONICAL_FIELDS[key]) continue;
    byId.set(mapping.fieldId, { canonicalKey: key, answer: mapping.answer || '' });
  }
  return byId;
}

// Keyword rules ported from the old /api/auto-apply/map-fields endpoint, now producing canonical keys.
// Order matters: the first matching rule wins, so specific patterns come before general ones.
const RULES = [
  { key: 'first_name', test: (t, d) => /first\s*name|given\s*name/.test(t) || ['firstname', 'fname', 'first_name'].includes(d.name) },
  { key: 'last_name', test: (t, d) => /last\s*name|surname|family\s*name/.test(t) || ['lastname', 'lname', 'last_name'].includes(d.name) },
  { key: 'full_name', test: (t, d) => /full\s*name|candidate\s*name|your\s*name/.test(t) || d.name === 'name' },
  { key: 'email', test: (t, d) => /e-?mail/.test(t) || d.type === 'email' },
  { key: 'phone', test: (t, d) => /phone|mobile|contact\s*number|telephone/.test(t) || d.type === 'tel' },
  { key: 'linkedin', test: (t) => /linked\s*in/.test(t) },
  { key: 'github', test: (t) => /git\s*hub/.test(t) },
  { key: 'portfolio', test: (t) => /portfolio|personal\s*(site|website)|website|other\s*url/.test(t) },
  { key: 'resume_file', test: (t, d) => d.type === 'file' && !/cover/.test(t) },
  { key: 'cover_letter_text', test: (t, d) => /cover\s*letter/.test(t) && d.type !== 'file' },
  { key: 'years_experience', test: (t) => /years?\s*(of)?\s*experience|total\s*experience|exp\s*in\s*years/.test(t) },
  { key: 'current_company', test: (t) => /current\s*(company|employer)|present\s*employer|^company$|organisation|organization/.test(t) },
  { key: 'current_title', test: (t) => /current\s*(title|role|position)|designation|job\s*title/.test(t) },
  { key: 'school', test: (t) => /school|college|university|institution|alma\s*mater/.test(t) },
  { key: 'degree', test: (t) => /degree|qualification/.test(t) },
  { key: 'field_of_study', test: (t) => /field\s*of\s*study|major|discipline|specialis|specializ/.test(t) },
  { key: 'graduation_year', test: (t) => /graduation|passing\s*year|year\s*of\s*(graduation|completion)|end\s*year/.test(t) },
  { key: 'gpa', test: (t) => /gpa|cgpa|percentage|marks/.test(t) },
  { key: 'notice_period', test: (t) => /notice\s*period/.test(t) },
  { key: 'start_date', test: (t) => /start\s*date|available\s*from|earliest\s*(start|joining)|joining\s*date/.test(t) },
  { key: 'salary_expectation', test: (t) => /salary|compensation|ctc|expected\s*pay|rate/.test(t) },
  { key: 'sponsorship', test: (t) => /sponsor|visa/.test(t) },
  { key: 'work_authorization', test: (t) => /authoriz|authoris|work\s*permit|legally\s*(able|entitled)|right\s*to\s*work/.test(t) },
  { key: 'relocation', test: (t) => /relocat/.test(t) },
  { key: 'eeo_gender', test: (t) => /gender|sex\b/.test(t) },
  { key: 'eeo_race', test: (t) => /race|ethnic/.test(t) },
  { key: 'eeo_veteran', test: (t) => /veteran|military/.test(t) },
  { key: 'eeo_disability', test: (t) => /disability|disabled/.test(t) },
  { key: 'pronouns', test: (t) => /pronoun/.test(t) },
  { key: 'how_heard', test: (t) => /how\s*did\s*you\s*hear|hear\s*about\s*us|source|referr/.test(t) },
  { key: 'city', test: (t) => /\bcity\b|town/.test(t) },
  { key: 'country', test: (t) => /country/.test(t) },
  { key: 'location', test: (t) => /location|address|where\s*are\s*you\s*based/.test(t) }
];

const OPEN_QUESTION = /why|describe|tell\s*us|what\s*(makes|interests)|about\s*yourself|motivat|explain|share/;

const normalize = (text) => String(text || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Text a field is matched against. The field's own label, name and placeholder come first;
 * surrounding text is only consulted when those say nothing, because a neighbour's words
 * ("First Name" sitting beside "Last Name") would otherwise hijack the match.
 */
export function describeField(descriptor) {
  const own = normalize(`${descriptor.label || ''} ${descriptor.name || ''} ${descriptor.elementId || ''} ${descriptor.placeholder || ''} ${descriptor.ariaLabel || ''}`);
  return own || normalize(descriptor.nearbyText);
}

// Returns {canonicalKey, confidence} or null when no rule matches
export function mapFieldByRules(descriptor) {
  const text = describeField(descriptor);
  const name = String(descriptor.name || '').toLowerCase();
  if (!text && !name) return null;

  for (const rule of RULES) {
    if (rule.test(text, { ...descriptor, name, type: String(descriptor.type || '').toLowerCase() })) {
      return { canonicalKey: rule.key, confidence: 0.9 };
    }
  }

  // Long free-text prompts are questions for the model to answer, not profile fields
  if ((descriptor.type === 'textarea' || String(descriptor.label || '').length > 25) && OPEN_QUESTION.test(text)) {
    return { canonicalKey: 'open_question', confidence: 0.5 };
  }
  return null;
}

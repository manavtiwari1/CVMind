const clean = (value) => (value === null || value === undefined ? '' : String(value).trim());

const splitName = (name) => {
  const parts = clean(name).split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
};

const formatSalary = (minSalary) => {
  if (!minSalary?.amount) return '';
  return `${minSalary.currency} ${minSalary.amount.toLocaleString('en-US')} per ${minSalary.period}`;
};

// Work authorization is answered for the country the job is in, never guessed from another entry
function authorizationFor(preferences, job) {
  const location = String(job?.location || '').toLowerCase();
  const entries = preferences.workAuthorization || [];
  return entries.find((entry) => entry.country && location.includes(entry.country.toLowerCase())) || (entries.length === 1 ? entries[0] : null);
}

const yesNo = (value) => (value ? 'Yes' : 'No');

// canonical key -> { value, source } using the resume profile, preferences and tailored documents
export function resolveValue(canonicalKey, context) {
  const { profile = {}, derived = {}, preferences = {}, tailored = null, job = null, answer = '' } = context;
  const contact = profile.contact || {};
  const latestRole = (profile.experience || [])[0] || {};
  const education = (profile.education || [])[0] || {};
  const { first, last } = splitName(contact.name);

  switch (canonicalKey) {
    case 'first_name': return { value: first, source: 'profile' };
    case 'last_name': return { value: last, source: 'profile' };
    case 'full_name': return { value: clean(contact.name), source: 'profile' };
    case 'email': return { value: clean(contact.email), source: 'profile' };
    case 'phone': return { value: clean(contact.phone), source: 'profile' };
    case 'location': return { value: clean(contact.location), source: 'profile' };
    case 'city': return { value: clean(contact.location).split(',')[0] || '', source: 'profile' };
    case 'country': return { value: clean(contact.location).split(',').slice(-1)[0]?.trim() || '', source: 'profile' };
    case 'linkedin': return { value: clean(contact.linkedin), source: 'profile' };
    case 'github': return { value: clean(contact.github), source: 'profile' };
    case 'portfolio': return { value: clean(contact.portfolio) || clean(contact.github), source: 'profile' };
    case 'current_company': return { value: clean(latestRole.company), source: 'profile' };
    case 'current_title': return { value: clean(latestRole.title) || clean(profile.headline), source: 'profile' };
    case 'years_experience': return { value: derived.totalYearsExperience ? String(derived.totalYearsExperience) : '', source: 'profile' };
    case 'school': return { value: clean(education.institution), source: 'profile' };
    case 'degree': return { value: clean(education.degree), source: 'profile' };
    case 'field_of_study': return { value: clean(education.field), source: 'profile' };
    case 'graduation_year': return { value: clean(education.endYear), source: 'profile' };
    case 'gpa': return { value: clean(education.gpa), source: 'profile' };
    case 'cover_letter_text': return { value: clean(tailored?.coverLetter?.body), source: 'cover_letter' };
    case 'resume_file': return { value: tailored?.pdf?.filename || '', source: 'tailored_resume' };
    case 'notice_period': return { value: clean(preferences.noticePeriod), source: 'preferences' };
    case 'salary_expectation': return { value: formatSalary(preferences.minSalary), source: 'preferences' };
    case 'relocation': return { value: preferences.willingToRelocate === undefined ? '' : yesNo(preferences.willingToRelocate), source: 'preferences' };
    case 'work_authorization': {
      const entry = authorizationFor(preferences, job);
      return { value: entry ? yesNo(entry.authorized) : '', source: 'preferences' };
    }
    case 'sponsorship': {
      const entry = authorizationFor(preferences, job);
      return { value: entry ? yesNo(entry.needsSponsorship) : '', source: 'preferences' };
    }
    case 'eeo_gender': return { value: clean(preferences.eeo?.gender), source: 'preferences' };
    case 'eeo_race': return { value: clean(preferences.eeo?.race), source: 'preferences' };
    case 'eeo_veteran': return { value: clean(preferences.eeo?.veteran), source: 'preferences' };
    case 'eeo_disability': return { value: clean(preferences.eeo?.disability), source: 'preferences' };
    case 'open_question': return { value: clean(answer), source: 'ai_answer' };
    // start_date and how_heard have no stored answer; the user fills them in
    default: return { value: '', source: 'none' };
  }
}

// Saved answers matching the question text are preferred over anything the model writes
export function standardAnswerFor(descriptor, preferences) {
  const text = `${descriptor.label || ''} ${descriptor.placeholder || ''}`.toLowerCase();
  if (!text.trim()) return '';
  const match = (preferences.standardAnswers || []).find((item) => {
    const question = String(item.question || '').toLowerCase().trim();
    return question && item.answer && (text.includes(question) || question.includes(text.trim()));
  });
  return match ? String(match.answer) : '';
}

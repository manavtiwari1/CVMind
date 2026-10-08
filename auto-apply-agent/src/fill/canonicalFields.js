// The fields the agent knows how to fill. "sensitive" items always need a human look before submitting.
export const CANONICAL_FIELDS = {
  first_name: { label: 'First name' },
  last_name: { label: 'Last name' },
  full_name: { label: 'Full name' },
  email: { label: 'Email' },
  phone: { label: 'Phone' },
  location: { label: 'Location' },
  city: { label: 'City' },
  country: { label: 'Country' },
  linkedin: { label: 'LinkedIn URL' },
  github: { label: 'GitHub URL' },
  portfolio: { label: 'Portfolio or website' },
  current_company: { label: 'Current company' },
  current_title: { label: 'Current job title' },
  years_experience: { label: 'Years of experience' },
  school: { label: 'School or university' },
  degree: { label: 'Degree' },
  field_of_study: { label: 'Field of study' },
  graduation_year: { label: 'Graduation year' },
  gpa: { label: 'GPA' },
  resume_file: { label: 'Resume upload', action: 'upload' },
  cover_letter_text: { label: 'Cover letter' },
  notice_period: { label: 'Notice period', sensitive: true },
  salary_expectation: { label: 'Salary expectation', sensitive: true },
  work_authorization: { label: 'Work authorization', sensitive: true },
  sponsorship: { label: 'Visa sponsorship', sensitive: true },
  relocation: { label: 'Willing to relocate', sensitive: true },
  start_date: { label: 'Earliest start date', sensitive: true },
  eeo_gender: { label: 'Gender', sensitive: true },
  eeo_race: { label: 'Race or ethnicity', sensitive: true },
  eeo_veteran: { label: 'Veteran status', sensitive: true },
  eeo_disability: { label: 'Disability status', sensitive: true },
  how_heard: { label: 'How did you hear about us' },
  pronouns: { label: 'Pronouns' },
  open_question: { label: 'Open question', action: 'answer' }
};

export const CANONICAL_KEYS = Object.keys(CANONICAL_FIELDS);

export const isSensitiveKey = (key) => Boolean(CANONICAL_FIELDS[key]?.sensitive);
export const actionForKey = (key) => CANONICAL_FIELDS[key]?.action || 'fill';
export const labelForKey = (key) => CANONICAL_FIELDS[key]?.label || key;

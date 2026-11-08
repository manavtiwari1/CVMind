// Resume Builder as a guided flow in the Leo chat (PRD: Leo Guided Flows, phase 1).
// The server owns the draft: what is filled, what is still missing and what to ask next.
// The model only phrases the questions and pulls answers out of the user's messages.

const clip = (value, max) => String(value ?? '').trim().slice(0, max);
const obj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const arr = (value) => (Array.isArray(value) ? value : []);

export const PRODUCT = 'resume';
export const LABEL = 'Resume Builder';

// List fields, how each entry is cleaned, and the key that makes two entries "the same"
const LISTS = {
  education: {
    max: 4,
    clean: (e) => ({ degree: clip(e.degree, 120), university: clip(e.university || e.college, 140), gradYear: clip(e.gradYear || e.year, 30), cgpa: clip(e.cgpa || e.score, 30) }),
    keep: (e) => e.degree || e.university,
    key: (e) => `${e.degree}|${e.university}`.toLowerCase()
  },
  experience: {
    max: 6,
    clean: (e) => ({ jobTitle: clip(e.jobTitle || e.role, 120), company: clip(e.company, 120), location: clip(e.location, 80), startDate: clip(e.startDate, 30), endDate: clip(e.endDate, 30), description: clip(e.description, 1500) }),
    keep: (e) => e.jobTitle || e.company,
    key: (e) => `${e.jobTitle}|${e.company}`.toLowerCase()
  },
  projects: {
    max: 6,
    clean: (e) => ({ name: clip(e.name || e.title, 120), tech: clip(e.tech, 200), description: clip(e.description, 1500), link: /^https?:\/\//i.test(e.link || '') ? clip(e.link, 300) : '' }),
    keep: (e) => e.name,
    key: (e) => e.name.toLowerCase()
  },
  achievements: {
    max: 6,
    clean: (e) => (typeof e === 'string' ? { title: clip(e, 200), description: '' } : { title: clip(e.title, 200), description: clip(e.description, 600) }),
    keep: (e) => e.title,
    key: (e) => e.title.toLowerCase()
  }
};

const SCALARS = {
  level: (v) => (['fresher', 'experienced'].includes(String(v).toLowerCase()) ? String(v).toLowerCase() : ''),
  targetRole: (v) => clip(v, 100),
  fullName: (v) => clip(v, 100),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()) ? clip(v, 160).toLowerCase() : ''),
  phone: (v) => (String(v || '').replace(/\D/g, '').length >= 7 ? clip(v, 30) : ''),
  location: (v) => clip(v, 100),
  linkedin: (v) => clip(v, 200),
  summary: (v) => clip(v, 1200)
};

// Optional fields Leo asks about once, together, then moves on
const EXTRAS = ['achievements', 'linkedin', 'location'];
export const SKIPPABLE = [...EXTRAS, 'experience', 'projects'];

export const emptyDraft = () => ({
  level: '', targetRole: '', fullName: '', email: '', phone: '', location: '', linkedin: '', summary: '',
  education: [], experience: [], projects: [], skills: [], achievements: []
});

const cleanSkills = (value) => {
  const items = typeof value === 'string' ? value.split(/[,;\n]/) : arr(value);
  return items.map((s) => clip(s, 60)).filter(Boolean);
};

const uniqueBy = (items, key) => {
  const seen = new Set();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// A clean draft from anything (a guest's browser copy, a stored one, an old version)
export function normalizeDraft(input) {
  const raw = obj(input);
  const draft = emptyDraft();
  for (const [field, clean] of Object.entries(SCALARS)) draft[field] = clean(raw[field]);
  for (const [field, spec] of Object.entries(LISTS)) {
    draft[field] = uniqueBy(arr(raw[field]).map((e) => spec.clean(typeof e === 'string' && field === 'achievements' ? e : obj(e))).filter(spec.keep), spec.key).slice(0, spec.max);
  }
  draft.skills = uniqueBy(cleanSkills(raw.skills), (s) => s.toLowerCase()).slice(0, 30);
  return draft;
}

/**
 * Merges answers the model pulled from a message. Scalars overwrite; list entries are added
 * (an entry matching an existing one updates it) unless the field is named in `replace`.
 * Returns the names of the fields that changed.
 */
export function mergeDraft(draft, fields, replace = []) {
  const input = obj(fields);
  const changed = [];
  for (const [field, clean] of Object.entries(SCALARS)) {
    if (input[field] === undefined) continue;
    const value = clean(input[field]);
    if (value && value !== draft[field]) {
      draft[field] = value;
      changed.push(field);
    }
  }
  for (const [field, spec] of Object.entries(LISTS)) {
    if (input[field] === undefined) continue;
    const incoming = (Array.isArray(input[field]) ? input[field] : [input[field]])
      .map((e) => spec.clean(typeof e === 'string' && field === 'achievements' ? e : obj(e))).filter(spec.keep);
    const base = replace.includes(field) ? [] : draft[field];
    const merged = [...base];
    for (const entry of incoming) {
      const at = merged.findIndex((e) => spec.key(e) === spec.key(entry));
      if (at >= 0) merged[at] = { ...merged[at], ...Object.fromEntries(Object.entries(entry).filter(([, v]) => v)) };
      else merged.push(entry);
    }
    const next = merged.slice(0, spec.max);
    if (JSON.stringify(next) !== JSON.stringify(draft[field])) {
      draft[field] = next;
      changed.push(field);
    }
  }
  if (input.skills !== undefined) {
    const incoming = cleanSkills(input.skills);
    const next = uniqueBy([...(replace.includes('skills') ? [] : draft.skills), ...incoming], (s) => s.toLowerCase()).slice(0, 30);
    if (JSON.stringify(next) !== JSON.stringify(draft.skills)) {
      draft.skills = next;
      changed.push('skills');
    }
  }
  return changed;
}

// Required fields still empty, in the order Leo asks for them
export function missingFields(draft, skipped = []) {
  const missing = [];
  if (!draft.level) missing.push('level');
  for (const f of ['fullName', 'email', 'phone']) if (!draft[f]) missing.push(f);
  if (!draft.targetRole) missing.push('targetRole');
  if (!draft.education.length) missing.push('education');
  if (draft.level === 'experienced') {
    if (!draft.experience.length && !skipped.includes('experience')) missing.push('experience');
  } else if (!draft.projects.length && !draft.experience.length && !skipped.includes('projects')) {
    // Freshers need something to show: a project or an internship
    missing.push('projects');
  }
  if (!draft.skills.length) missing.push('skills');
  return missing;
}

const extrasOpen = (draft, skipped) => EXTRAS.filter((f) => !skipped.includes(f) && (Array.isArray(draft[f]) ? !draft[f].length : !draft[f]));

// What Leo should ask about next: a group of fields and a hint for the model
export function nextQuestion(flow) {
  const missing = missingFields(flow.data, flow.skipped);
  const has = (f) => missing.includes(f);
  if (has('level')) return { group: 'level', fields: ['level'], hint: 'Ask if they are a fresher or experienced. Call show_choices with field "level" and options Fresher, Experienced, and "I have an old resume" (that one asks them to attach it with the paperclip).' };
  if (has('fullName') || has('email') || has('phone')) return { group: 'contact', fields: ['fullName', 'email', 'phone'].filter(has), hint: 'Ask for the missing contact details (full name, email, phone) in one message.' };
  if (has('targetRole')) return { group: 'role', fields: ['targetRole'], hint: 'Ask which role or job title the resume is for, e.g. "Frontend Developer intern".' };
  if (has('education')) return { group: 'education', fields: ['education'], hint: 'Ask for their education: degree, college, graduation year and CGPA/percentage.' };
  if (has('experience')) return { group: 'experience', fields: ['experience'], hint: 'Ask about their work experience: role, company, dates and what they did (results and numbers if any). One job at a time is fine.' };
  if (has('projects')) return { group: 'projects', fields: ['projects'], hint: 'Ask about their projects or internships: name, tech used and what it does or achieved. They can say they have none (then skip "projects").' };
  if (has('skills')) return { group: 'skills', fields: ['skills'], hint: 'Ask for their skills (languages, tools, frameworks).' };
  if (!flow.extrasAsked && extrasOpen(flow.data, flow.skipped).length) {
    return { group: 'extras', fields: extrasOpen(flow.data, flow.skipped), hint: `Ask once, in one short message, for any of these they want to add, and say they can skip: ${extrasOpen(flow.data, flow.skipped).map((f) => ({ achievements: 'achievements or certifications', linkedin: 'LinkedIn URL', location: 'city' }[f])).join(', ')}.` };
  }
  return null;
}

export const isComplete = (flow) => !nextQuestion(flow);

const line = (...parts) => parts.filter(Boolean).join(' · ');

// The summary card the user confirms before building
export function summaryCard(flow) {
  const d = flow.data;
  const sections = [
    { title: 'Contact', lines: [d.fullName, line(d.email, d.phone), line(d.location, d.linkedin)].filter(Boolean) },
    { title: 'Target role', lines: [line(d.targetRole, d.level === 'fresher' ? 'Fresher' : d.level === 'experienced' ? 'Experienced' : '')] },
    { title: 'Education', lines: d.education.map((e) => line(e.degree, e.university, e.gradYear, e.cgpa)) },
    { title: 'Experience', lines: d.experience.map((e) => line(e.jobTitle, e.company, [e.startDate, e.endDate].filter(Boolean).join('–'))) },
    { title: 'Projects', lines: d.projects.map((p) => line(p.name, p.tech)) },
    { title: 'Skills', lines: d.skills.length ? [d.skills.join(', ')] : [] },
    { title: 'Achievements', lines: d.achievements.map((a) => a.title) }
  ].filter((s) => s.lines.some(Boolean));
  return { type: 'summary_confirm', product: PRODUCT, title: 'Your resume details', sections };
}

// Short text of what is filled, for the model and the tool summaries
export function describe(flow) {
  const d = flow.data;
  const filled = [];
  for (const f of Object.keys(SCALARS)) if (d[f]) filled.push(f);
  for (const f of [...Object.keys(LISTS), 'skills']) if (d[f].length) filled.push(`${f} (${d[f].length})`);
  const next = nextQuestion(flow);
  return `Filled: ${filled.join(', ') || 'nothing yet'}. ${next ? `Still needed: ${next.fields.join(', ')}.` : 'Everything needed is collected.'}`;
}

// The structured resume the templates are filled from (frontend ExtractedResume)
export function toResumeData(draft) {
  const projects = draft.projects.map((p) => ({
    jobTitle: p.name,
    company: p.tech ? `Project · ${p.tech}` : 'Project',
    location: '',
    startDate: '',
    endDate: '',
    description: [p.description, p.link].filter(Boolean).join('\n')
  }));
  return {
    personalInfo: { fullName: draft.fullName, email: draft.email, phone: draft.phone, location: draft.location, linkedin: draft.linkedin, jobTitle: draft.targetRole },
    summary: draft.summary,
    educations: draft.education.map((e) => ({ university: e.university, degree: e.degree, gradYear: e.gradYear, cgpa: e.cgpa })),
    workExperiences: [...draft.experience, ...projects],
    skills: draft.skills,
    achievements: draft.achievements,
    courses: [],
    languages: []
  };
}

// A draft from a parsed resume (services/gemini extractResumeDataWithAI)
export function draftFromParsed(parsed) {
  const p = obj(parsed);
  const info = obj(p.personalInfo);
  const draft = normalizeDraft({
    fullName: info.fullName,
    email: info.email,
    phone: info.phone,
    location: info.location,
    linkedin: info.linkedin,
    targetRole: info.jobTitle,
    summary: p.summary,
    education: arr(p.educations),
    experience: arr(p.workExperiences),
    skills: p.skills,
    achievements: arr(p.achievements)
  });
  draft.level = draft.experience.length ? 'experienced' : 'fresher';
  return draft;
}

// Field names the model may send in update_draft (OpenAI function schema)
const s = (description) => ({ type: 'string', description });
export const DRAFT_PROPERTIES = {
  level: { type: 'string', enum: ['fresher', 'experienced'] },
  targetRole: s('Role the resume is for, e.g. "Data Analyst".'),
  fullName: s('Full name.'),
  email: s('Email address.'),
  phone: s('Phone number with country code if given.'),
  location: s('City, e.g. "Pune".'),
  linkedin: s('LinkedIn profile URL.'),
  summary: s('Only if the user wrote their own summary.'),
  education: { type: 'array', items: { type: 'object', properties: { degree: s('e.g. "B.Tech CSE"'), university: s('College or university'), gradYear: s('e.g. "2026"'), cgpa: s('e.g. "8.4 CGPA" or "82%"') } } },
  experience: { type: 'array', description: 'Jobs and internships.', items: { type: 'object', properties: { jobTitle: s('Role'), company: s('Company'), location: s('City'), startDate: s('e.g. "Jun 2025"'), endDate: s('e.g. "Aug 2025" or "Present"'), description: s('What they did, in their words, one point per line') } } },
  projects: { type: 'array', items: { type: 'object', properties: { name: s('Project name'), tech: s('Tech used, comma separated'), description: s('What it does or achieved, in their words'), link: s('https link if given') } } },
  skills: { type: 'array', items: { type: 'string' } },
  achievements: { type: 'array', items: { type: 'object', properties: { title: s('e.g. "Winner, Smart India Hackathon 2025"'), description: s('Optional detail') } } }
};

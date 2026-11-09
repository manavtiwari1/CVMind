// Reading the Career Profile. Kept apart from careerProfile.js, which pulls in the AI services, so
// the extension routes can use it without loading them (or db.js, which connects when imported).

import { CareerProfile } from './models.js';
import { emptyDraft, normalizeDraft } from './flows/resume.js';

const FIELDS = Object.keys(emptyDraft());
const filled = (value) => (Array.isArray(value) ? value.length > 0 : !!value);

export const getProfile = (userId) => CareerProfile.findOne({ userId }).lean();

export function publicProfile(profile) {
  const data = normalizeDraft(profile?.data);
  return {
    data,
    sources: profile?.sources || {},
    resumeName: profile?.masterResumeName || '',
    hasData: FIELDS.some((f) => filled(data[f])),
    updatedAt: profile?.updatedAt || null
  };
}

/** The Career Profile in the shape the extension's autofill reads, or null when it is empty. */
export function autofillProfile(profile) {
  const { data, hasData } = publicProfile(profile);
  if (!hasData) return null;
  return {
    contact: { name: data.fullName, email: data.email, phone: data.phone, location: data.location, linkedin: data.linkedin },
    headline: data.targetRole,
    experience: data.experience.map((e) => ({ company: e.company, title: e.jobTitle })),
    education: data.education.map((e) => ({ institution: e.university, degree: e.degree, endYear: e.gradYear, gpa: e.cgpa })),
    skills: data.skills.map((name) => ({ name, normalized: name.toLowerCase() }))
  };
}

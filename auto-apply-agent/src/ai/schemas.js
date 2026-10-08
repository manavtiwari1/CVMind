import { z } from 'zod';
import { SENIORITY_LADDER } from '../scoring/experience.js';

// LLM output schemas use "" / [] for unknowns instead of null so Gemini's schema enforcement stays simple

export const DEGREE_LEVELS = ['none', 'high_school', 'associate', 'bachelor', 'master', 'phd'];
export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship', 'freelance', 'other'];
export const SKILL_CATEGORIES = ['technical', 'tool', 'soft', 'language', 'domain', 'other'];

const yearMonth = z.string().describe('"YYYY-MM" when the month is known, "YYYY" when only the year is known, "" when unknown');

export const ResumeStructured = z.object({
  contact: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string(),
    github: z.string(),
    portfolio: z.string()
  }),
  headline: z.string().describe('Current or most recent professional title'),
  summary: z.string(),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    startDate: yearMonth,
    endDate: yearMonth,
    current: z.boolean(),
    location: z.string(),
    skills: z.array(z.string()),
    bullets: z.array(z.string())
  })),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    degreeLevel: z.enum(DEGREE_LEVELS),
    field: z.string(),
    endYear: z.string(),
    gpa: z.string()
  })),
  skills: z.array(z.object({
    name: z.string(),
    category: z.enum(SKILL_CATEGORIES)
  })),
  projects: z.array(z.object({
    name: z.string(),
    skills: z.array(z.string()),
    bullets: z.array(z.string())
  })),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    year: z.string()
  })),
  languages: z.array(z.string())
});

const tailoredBullets = z.array(z.object({
  sourceBulletId: z.string().describe('id of the original resume bullet this text rewrites'),
  text: z.string()
}));

export const TailoredResumeOutput = z.object({
  headline: z.string(),
  summary: z.string(),
  experience: z.array(z.object({ roleId: z.string(), bullets: tailoredBullets })),
  projects: z.array(z.object({ projectId: z.string(), bullets: tailoredBullets })),
  skillOrder: z.array(z.string()),
  changes: z.array(z.string())
});

export const FieldMappingResult = z.object({
  mappings: z.array(z.object({
    fieldId: z.string(),
    canonicalKey: z.string().describe('a profile key from the list, or "unknown"'),
    answer: z.string().describe('the written answer for open_question fields, otherwise ""')
  }))
});

export const CoverLetterOutput = z.object({
  subject: z.string(),
  body: z.string()
});

export const JobExtracted = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  workMode: z.enum(['remote', 'hybrid', 'onsite', 'unknown']),
  employmentType: z.enum([...EMPLOYMENT_TYPES, 'unknown']),
  seniority: z.enum([...SENIORITY_LADDER, 'unknown']),
  industry: z.string(),
  salary: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string().describe('3-letter currency code, "" when not stated'),
    period: z.enum(['year', 'month', 'hour', 'unknown'])
  }),
  mustHaveSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  minYearsExperience: z.number().describe('-1 when not stated'),
  educationLevel: z.enum([...DEGREE_LEVELS, 'unknown']),
  educationFields: z.array(z.string()),
  equivalentExperienceAccepted: z.boolean(),
  sponsorshipAvailable: z.enum(['yes', 'no', 'unknown']),
  responsibilities: z.array(z.object({ text: z.string(), core: z.boolean() }))
});

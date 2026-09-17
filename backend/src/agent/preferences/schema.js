import { z } from 'zod';
import { EMPLOYMENT_TYPES } from '../ai/schemas.js';
import { SENIORITY_LADDER } from '../scoring/experience.js';

export const WORK_MODES = ['remote', 'hybrid', 'onsite'];
export const APPLY_MODES = ['extension', 'server', 'ask'];
export const SALARY_PERIODS = ['year', 'month', 'hour'];

export const DEFAULT_PREFERENCES = {
  targetTitles: [],
  seniority: [],
  locations: [],
  workModes: [],
  employmentTypes: ['full_time'],
  minSalary: null,
  includeIndustries: [],
  excludeIndustries: [],
  excludedCompanies: [],
  workAuthorization: [],
  willingToRelocate: false,
  noticePeriod: '',
  defaultResumeProfileId: null,
  applyMode: 'ask',
  minScoreToSuggest: 60,
  dailyApplyCap: 25,
  // EEO answers default to declining; the agent never infers these
  eeo: { gender: 'decline', race: 'decline', veteran: 'decline', disability: 'decline' },
  standardAnswers: []
};

const shortText = z.string().trim().max(120);
// Trimmed, de-duplicated, empty entries dropped (editors send raw comma-split text)
const textList = (max) => z.array(shortText).max(max).transform((list) => [...new Set(list.filter(Boolean))]);
const eeoAnswer = z.string().trim().max(80);

// PUT body: any subset of fields; unknown keys are rejected so typos don't silently vanish
export const PreferencesInput = z.strictObject({
  targetTitles: textList(20),
  seniority: z.array(z.enum(SENIORITY_LADDER)).max(SENIORITY_LADDER.length),
  locations: textList(20),
  workModes: z.array(z.enum(WORK_MODES)).max(WORK_MODES.length),
  employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)).max(EMPLOYMENT_TYPES.length),
  minSalary: z.object({
    amount: z.number().min(0).max(1e9),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code like INR or USD'),
    period: z.enum(SALARY_PERIODS)
  }).nullable(),
  includeIndustries: textList(30),
  excludeIndustries: textList(30),
  excludedCompanies: textList(100),
  workAuthorization: z.array(z.object({
    country: z.string().trim().min(1).max(80),
    authorized: z.boolean(),
    needsSponsorship: z.boolean()
  })).max(20),
  willingToRelocate: z.boolean(),
  noticePeriod: shortText,
  defaultResumeProfileId: z.string().nullable().transform((id) => id || null),
  applyMode: z.enum(APPLY_MODES),
  minScoreToSuggest: z.number().int().min(0).max(100),
  dailyApplyCap: z.number().int().min(1).max(100),
  eeo: z.object({ gender: eeoAnswer, race: eeoAnswer, veteran: eeoAnswer, disability: eeoAnswer }),
  standardAnswers: z.array(z.object({
    key: z.string().trim().max(60),
    question: z.string().trim().min(1).max(300),
    answer: z.string().trim().max(2000)
  })).max(50)
}).partial();

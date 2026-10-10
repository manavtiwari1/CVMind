import { authFetch } from '../../lib/authFetch';
import { API_BASE } from '../../lib/apiBase';

// Client for /api/job-finder (backend/src/routes/jobFinder.js)
const BASE = `${API_BASE}/api/job-finder`;

export class JobFinderError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'JobFinderError';
    this.status = status;
    this.code = code;
  }
}

export type Seniority = 'intern' | 'junior' | 'mid' | 'senior' | 'staff' | 'principal';
export type WorkMode = 'remote' | 'hybrid' | 'onsite';

export interface FinderResume {
  id: string;
  label: string;
  source: 'cvmind' | 'upload';
  status: 'queued' | 'parsing' | 'ready' | 'failed';
  parseError: string | null;
  isDefault: boolean;
  skills: string[];
  skillsFromText: boolean;
  seniority: string | null;
  updatedAt: string;
}

export interface FinderPreferences {
  targetTitles: string[];
  locations: string[];
  workModes: WorkMode[];
  seniority: Seniority[];
  employmentTypes: string[];
}

export interface Allowance { used: number; limit: number; resetsAt: string | null; credits?: number }

// Pro, or what a free account has left: one application a month and a few full searches a day
export interface FinderPlan {
  pro: boolean;
  applies: Allowance | null;
  searches: Allowance | null;
}

export interface FinderProfile {
  plan: FinderPlan;
  resumes: FinderResume[];
  resumeId: string | null;
  preferences: FinderPreferences;
  onboarded: boolean;
}

export interface JobMatch {
  score: number | null;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface FinderJob {
  jobKey: string;
  source: 'jsearch' | 'adzuna' | 'greenhouse' | 'lever' | 'ashby' | 'smartrecruiters' | 'workable' | 'cvmind';
  title: string;
  company: string;
  companyDomain: string;
  companyLogo: string;
  location: string;
  remote: boolean;
  employmentType: string;
  postedAt: string | null;
  publisher: string;
  applyUrl: string;
  appliesInCvmind: boolean;
  snippet: string;
  match: JobMatch | null;
  appliedAt: string | null;
}

export interface Feed {
  query: string;
  mode?: 'role' | 'skills';
  company?: string;
  // The skills searched in the skills view
  skills?: string[];
  location?: string;
  needsRole?: boolean;
  needsSkills?: boolean;
  jobs: FinderJob[];
  meta: { counts?: { jsearch: number; adzuna: number; boards: number; recruiters: number }; jsearchCapped?: boolean; adzunaCapped?: boolean };
  plan?: FinderPlan;
  // Free account past today's full searches: only careers pages and CVMind recruiters were searched
  limitedSources?: boolean;
}

export interface FeedFilters {
  q?: string;
  location?: string;
  days?: number | null;
  remote?: boolean;
  level?: 'fresher' | 'junior' | 'mid' | 'senior' | null;
  type?: 'full_time' | 'internship' | null;
  // Only jobs at this employer
  company?: string;
  // 'skills' searches by resume skills instead of a role
  mode?: 'role' | 'skills';
  skills?: string[];
}

export interface ApplyResult {
  alreadyApplied: boolean;
  appliedAt: string;
  applyUrl: string;
  plan?: FinderPlan;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(`${BASE}${path}`, init);
  } catch {
    throw new JobFinderError('Could not reach CVMind. Check your connection and try again.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) throw new JobFinderError(body.error || `Request failed (${res.status}).`, res.status, body.code);
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

export const getProfile = () => request<FinderProfile>('/profile');

export const saveProfile = (update: Partial<FinderPreferences> & { defaultResumeProfileId?: string | null }) =>
  request<FinderProfile>('/profile', json('PUT', update));

export function uploadResume(file: File) {
  const form = new FormData();
  form.append('resume', file);
  return request<FinderProfile>('/resumes/upload', { method: 'POST', body: form });
}

export const importCvmindResume = (workId: string) => request<FinderProfile>('/resumes/from-work', json('POST', { workId }));

export function getFeed(filters: FeedFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.location) params.set('location', filters.location);
  if (filters.company) params.set('company', filters.company);
  if (filters.days) params.set('days', String(filters.days));
  if (filters.remote) params.set('remote', 'true');
  if (filters.level) params.set('level', filters.level);
  if (filters.type) params.set('type', filters.type);
  if (filters.mode === 'skills') params.set('mode', 'skills');
  if (filters.mode === 'skills' && filters.skills?.length) params.set('skills', filters.skills.join(','));
  return request<Feed>(`/feed?${params}`);
}

export const getJob = (jobKey: string) =>
  request<{ job: FinderJob & { description: string }; match: JobMatch }>(`/jobs/${encodeURIComponent(jobKey)}`);

export const recordApply = (jobKey: string) => request<ApplyResult>('/apply', json('POST', { jobKey }));

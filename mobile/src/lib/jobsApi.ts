import { api } from './api';
import type { PickedFile } from './resume';

// AI Job Finder (/api/job-finder), the same API and limits as the website
// (frontend/src/pages/jobFinder/jobFinderApi.ts).

export interface FinderResume {
  id: string;
  label: string;
  source: 'cvmind' | 'upload';
  status: 'queued' | 'parsing' | 'ready' | 'failed';
  isDefault: boolean;
  skills: string[];
}
export interface FinderPreferences { targetTitles: string[]; locations: string[]; workModes: string[]; seniority: string[]; employmentTypes: string[] }
export interface Allowance { used: number; limit: number; resetsAt: string | null; credits?: number }
export interface FinderPlan { pro: boolean; applies: Allowance | null; searches: Allowance | null }
export interface FinderProfile { plan: FinderPlan; resumes: FinderResume[]; resumeId: string | null; preferences: FinderPreferences; onboarded: boolean }
export interface JobMatch { score: number | null; matchedSkills: string[]; missingSkills: string[] }
export interface FinderJob {
  jobKey: string;
  source: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  remote: boolean;
  employmentType: string;
  postedAt: string | null;
  publisher: string;
  applyUrl: string;
  snippet: string;
  match: JobMatch | null;
  appliedAt: string | null;
}
export interface Feed { query: string; needsRole?: boolean; needsSkills?: boolean; jobs: FinderJob[]; plan?: FinderPlan; limitedSources?: boolean }
export interface FeedFilters { q?: string; location?: string; days?: number | null; remote?: boolean; level?: 'fresher' | null; type?: 'internship' | null }

const BASE = '/api/job-finder';

export const getProfile = () => api<FinderProfile>(`${BASE}/profile`);
export const saveProfile = (update: Partial<FinderPreferences> & { defaultResumeProfileId?: string | null }) =>
  api<FinderProfile>(`${BASE}/profile`, { method: 'PUT', body: update });

export function uploadFinderResume(file: PickedFile) {
  const form = new FormData();
  form.append('resume', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
  return api<FinderProfile>(`${BASE}/resumes/upload`, { method: 'POST', form });
}
export const resumeFromWork = (workId: string) => api<FinderProfile>(`${BASE}/resumes/from-work`, { method: 'POST', body: { workId } });

export function getFeed(f: FeedFilters) {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.location) p.set('location', f.location);
  if (f.days) p.set('days', String(f.days));
  if (f.remote) p.set('remote', 'true');
  if (f.level) p.set('level', f.level);
  if (f.type) p.set('type', f.type);
  return api<Feed>(`${BASE}/feed?${p}`);
}

export const getJob = (jobKey: string) => api<{ job: FinderJob & { description: string }; match: JobMatch }>(`${BASE}/jobs/${encodeURIComponent(jobKey)}`);
export const recordApply = (jobKey: string) => api<{ alreadyApplied: boolean; appliedAt: string; applyUrl: string; plan?: FinderPlan }>(`${BASE}/apply`, { method: 'POST', body: { jobKey } });

export function postedAgo(iso: string | null) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

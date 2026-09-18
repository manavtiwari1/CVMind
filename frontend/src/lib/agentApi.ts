import { authFetch } from './authFetch';
import type {
  ResumeProfile, ResumeStructured, ResumeEditable, JobPreferences, AgentApplication,
  ApplicationEventItem, TailoredDocuments, TailoredEditPayload, ExtensionDevice, PairCode,
  ReviewData, FillPlanItem
} from '../types/agent';

const API = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
const AGENT = `${API}/api/agent`;

export class ApiError extends Error {
  status: number;
  code?: string;
  // Some errors carry the relevant record, e.g. the existing application on ALREADY_ADDED
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface Envelope<T> {
  success: true;
  data: T;
  deduped?: boolean;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(url.startsWith('http') ? url : `${AGENT}${url}`, init);
  } catch {
    throw new ApiError('Could not reach CVMind. Check your connection and try again.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error || `Request failed (${res.status}).`, res.status, body.code, body.data);
  }
  return body as T;
}

const jsonInit = (method: string, data?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: data === undefined ? undefined : JSON.stringify(data)
});

// ── Resumes ───────────────────────────────────────────────────────────────────
export const RESUME_FILE_TYPES = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

export async function listResumes() {
  return (await request<Envelope<ResumeProfile[]>>('/resumes')).data;
}

export function uploadResume(file: File, label?: string) {
  const form = new FormData();
  form.append('resume', file);
  if (label) form.append('label', label);
  return request<Envelope<ResumeProfile>>('/resumes/upload', { method: 'POST', body: form });
}

export function importFromWork(workId: string) {
  return request<Envelope<ResumeProfile>>('/resumes/from-work', jsonInit('POST', { workId }));
}

export async function updateResume(id: string, patch: { label?: string; structured?: ResumeEditable }) {
  return (await request<Envelope<ResumeProfile>>(`/resumes/${id}`, jsonInit('PATCH', patch))).data;
}

export async function reparseResume(id: string, force = false) {
  return (await request<Envelope<ResumeProfile>>(`/resumes/${id}/reparse`, jsonInit('POST', { force }))).data;
}

export async function setDefaultResume(id: string) {
  return (await request<Envelope<ResumeProfile>>(`/resumes/${id}/default`, jsonInit('POST'))).data;
}

export async function deleteResume(id: string) {
  await request<{ success: true }>(`/resumes/${id}`, { method: 'DELETE' });
}

export async function downloadResumeFile(id: string): Promise<Blob> {
  const res = await authFetch(`${AGENT}/resumes/${id}/file`);
  if (!res.ok) throw new ApiError('Could not download the original file.', res.status);
  return res.blob();
}

// ── Preferences ───────────────────────────────────────────────────────────────
// The server rejects unknown keys, so only these fields are sent (not createdAt/updatedAt)
const PREFERENCE_KEYS: (keyof JobPreferences)[] = [
  'targetTitles', 'seniority', 'locations', 'workModes', 'employmentTypes', 'minSalary', 'includeIndustries',
  'excludeIndustries', 'excludedCompanies', 'workAuthorization', 'willingToRelocate', 'noticePeriod',
  'defaultResumeProfileId', 'applyMode', 'minScoreToSuggest', 'dailyApplyCap', 'eeo', 'standardAnswers'
];

export async function getPreferences() {
  const body = await request<Envelope<JobPreferences> & { exists: boolean }>('/preferences');
  return { preferences: body.data, exists: body.exists };
}

export async function savePreferences(preferences: JobPreferences) {
  const payload = Object.fromEntries(PREFERENCE_KEYS.map(key => [key, preferences[key]]));
  return (await request<Envelope<JobPreferences>>('/preferences', jsonInit('PUT', payload))).data;
}

// ── Applications ──────────────────────────────────────────────────────────────
export async function createApplication(input: { url?: string; description?: string; resumeProfileId?: string }) {
  return (await request<Envelope<AgentApplication>>('/applications', jsonInit('POST', input))).data;
}

export async function listApplications() {
  return (await request<Envelope<AgentApplication[]>>('/applications')).data;
}

export async function listApplicationEvents(id: string) {
  return (await request<Envelope<ApplicationEventItem[]>>(`/applications/${id}/events`)).data;
}

export async function decideApplication(id: string, body: { action: 'approve' | 'skip'; overrideGates?: boolean; mode?: 'extension' | 'server' }) {
  return (await request<Envelope<AgentApplication>>(`/applications/${id}/decision`, jsonInit('POST', body))).data;
}

export async function rescoreApplication(id: string, resumeProfileId?: string) {
  return (await request<Envelope<AgentApplication>>(`/applications/${id}/rescore`, jsonInit('POST', resumeProfileId ? { resumeProfileId } : {}))).data;
}

export async function deleteApplication(id: string) {
  await request<{ success: true }>(`/applications/${id}`, { method: 'DELETE' });
}

// ── Tailored documents ────────────────────────────────────────────────────────
export async function getTailored(id: string) {
  return (await request<Envelope<TailoredDocuments>>(`/applications/${id}/tailored`)).data;
}

export async function updateTailored(id: string, patch: TailoredEditPayload) {
  return (await request<Envelope<TailoredDocuments>>(`/applications/${id}/tailored`, jsonInit('PATCH', patch))).data;
}

// The PDF is rendered by the worker, so a fresh edit answers 202 until the new one is ready
export async function downloadTailoredPdf(id: string): Promise<Blob> {
  const res = await authFetch(`${AGENT}/applications/${id}/resume.pdf`);
  if (res.status === 202) throw new ApiError('Your PDF is still being generated. Try again in a few seconds.', 202, 'PDF_RENDERING');
  if (!res.ok) throw new ApiError('Could not download the PDF.', res.status);
  return res.blob();
}

export async function markApplicationSubmitted(id: string) {
  return (await request<Envelope<AgentApplication>>(`/applications/${id}/mark-submitted`, jsonInit('POST'))).data;
}

// ── Server-side filling with review before submit ─────────────────────────────
export async function startServerFill(id: string) {
  return (await request<Envelope<AgentApplication>>(`/applications/${id}/server-fill`, jsonInit('POST'))).data;
}

export async function getReview(id: string) {
  return (await request<Envelope<ReviewData>>(`/applications/${id}/review`)).data;
}

export async function updateFillPlan(id: string, items: { selector: string; value: string }[]) {
  return (await request<Envelope<{ planHash: string; items: FillPlanItem[] }>>(`/applications/${id}/fill-plan`, jsonInit('PATCH', { items }))).data;
}

export async function submitApplication(id: string, planHash: string) {
  await request<{ success: true }>(`/applications/${id}/submit`, jsonInit('POST', { planHash }));
}

// Screenshots need the session token, so they are fetched as a blob rather than used as a plain <img src>
export async function fetchArtifact(pathOrUrl: string): Promise<Blob> {
  const res = await authFetch(pathOrUrl.startsWith('http') ? pathOrUrl : `${API}${pathOrUrl}`);
  if (!res.ok) throw new ApiError('Could not load the screenshot.', res.status);
  return res.blob();
}

// ── Browser extension pairing ─────────────────────────────────────────────────
export async function createPairCode() {
  return (await request<Envelope<PairCode>>('/extension/pair-codes', jsonInit('POST'))).data;
}

export async function listExtensionDevices() {
  return (await request<Envelope<ExtensionDevice[]>>('/extension/devices')).data;
}

export async function revokeExtensionDevice(id: string) {
  await request<{ success: true }>(`/extension/devices/${id}`, { method: 'DELETE' });
}

// ── CVMind builder resumes (existing /api/user/work endpoint) ────────────────
export interface CvmindResume {
  id: string;
  title: string;
  updatedAt: string;
}

export async function listCvmindResumes(): Promise<CvmindResume[]> {
  let userId = '';
  try {
    userId = JSON.parse(localStorage.getItem('cvmind_user') || '{}').id || '';
  } catch { /* treated as signed out below */ }
  if (!userId) throw new ApiError('Sign in to import your CVMind resumes.', 401);

  const body = await request<Envelope<{ _id?: string; id?: string; title?: string; type?: string; updatedAt: string }[]>>(
    `${API}/api/user/work/${encodeURIComponent(userId)}`
  );
  return body.data
    .filter(work => (work.type || 'resume') === 'resume')
    .map(work => ({ id: String(work._id ?? work.id), title: work.title || 'Untitled resume', updatedAt: work.updatedAt }));
}

// Stored profile -> editor payload accepted by PATCH /resumes/:id
export function toEditable(structured: ResumeStructured): ResumeEditable {
  return {
    contact: { ...structured.contact },
    headline: structured.headline || '',
    summary: structured.summary || '',
    experience: structured.experience.map(role => ({
      company: role.company,
      title: role.title,
      employmentType: role.employmentType,
      startDate: role.startDate,
      endDate: role.endDate,
      current: role.current,
      location: role.location,
      skills: [...role.skills],
      bullets: role.bullets.map(b => b.text)
    })),
    education: structured.education.map(edu => ({ ...edu })),
    skills: structured.skills.map(({ name, category }) => ({ name, category })),
    projects: structured.projects.map(project => ({ name: project.name, skills: [...project.skills], bullets: project.bullets.map(b => b.text) })),
    certifications: structured.certifications.map(cert => ({ ...cert })),
    languages: [...structured.languages]
  };
}

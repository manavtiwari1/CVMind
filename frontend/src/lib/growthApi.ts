import { API_BASE } from './apiBase';
import { authFetch } from './authFetch';

// Client for the growth features: "Your plan", score history, job alerts, referral requests,
// offer negotiation, resume share links and invites. Every call throws an Error with the
// server's message when the request fails.

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status, code: data.code });
  }
  return data as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

/* ── "Your plan" ────────────────────────────────────────────── */
export type PlanStepId = 'resume' | 'ats' | 'tailor' | 'practise' | 'apply';
export interface PlanStep { id: PlanStepId; page: string; done: boolean; doneAt: string | null }
export interface PlanProgress { steps: PlanStep[]; doneCount: number; complete: boolean; completedAt: string | null; hidden: boolean }

export const getPlan = () => request<PlanProgress>('/api/user/progress');
export const setPlanHidden = (hidden: boolean) => request<PlanProgress>('/api/user/progress/hide', json('POST', { hidden }));

/* ── Score history ──────────────────────────────────────────── */
export interface ScanRow {
  id: string;
  fileName: string;
  resumeKey: string;
  score: number;
  keywordsScore: number | null;
  contentScore: number | null;
  formattingScore: number | null;
  workId: string;
  createdAt: string;
}
export interface ScoreChange { previousScore: number; previousAt: string; delta: number; trend: 'up' | 'down' | 'same' }

export const getScans = () => request<{ scans: ScanRow[] }>('/api/user/scans').then(d => d.scans);

/* ── Job alerts ─────────────────────────────────────────────── */
export interface AlertSettings { enabled: boolean; frequency: 'weekly' | 'daily'; minScore: number; lastSentAt: string | null; canDaily: boolean }

export const getAlerts = () => request<{ alerts: AlertSettings }>('/api/job-finder/alerts').then(d => d.alerts);
export const saveAlerts = (input: Partial<Pick<AlertSettings, 'enabled' | 'frequency' | 'minScore'>>) =>
  request<{ alerts: AlertSettings }>('/api/job-finder/alerts', json('PUT', input)).then(d => d.alerts);

/* ── Find a referral ────────────────────────────────────────── */
export interface ReferralMessages { connectionRequest: string; referralPitch: string; recruiterDM: string; inMailSubject: string; followUp: string }
export interface ReferralResult { messages: ReferralMessages; links: { people: string; company: string }; workId: string }

export const getReferralAsk = (jobKey: string) =>
  request<{ ask: { workId: string; sentAt: string | null; createdAt: string } | null }>(`/api/job-finder/referral/${encodeURIComponent(jobKey)}`).then(d => d.ask);
export const writeReferral = (input: { jobKey: string; targetName?: string; relation?: string; tone?: string }) =>
  request<ReferralResult>('/api/job-finder/referral', json('POST', input));
export const markReferralSent = (jobKey: string) => request<{ sentAt: string }>('/api/job-finder/referral-sent', json('POST', { jobKey }));

/* ── Offer negotiation ──────────────────────────────────────── */
export interface OfferInput { company: string; role: string; location?: string; fixed: string; variable?: string; joiningBonus?: string; notice?: string; other?: string }
export interface PositionInput { current?: string; competing?: string; target?: string; priorities?: string[]; notes?: string }
export interface NegotiationResult {
  email: { subject: string; body: string };
  callScript: string[];
  talkingPoints: string[];
  avoid: string[];
  warnings: string[];
}

export const negotiateOffer = (input: { offer: OfferInput; position: PositionInput; tone: string; resumeWorkId?: string }) =>
  request<{ data: NegotiationResult; work: { _id?: string; id?: string } | null }>('/api/negotiation', json('POST', input));

/* ── Share links ────────────────────────────────────────────── */
export interface ShareLink { slug: string; enabled: boolean; viewCount: number; lastViewedAt: string | null; createdAt: string }
export interface ShareStats { days: { day: string; views: number }[]; referrers: { domain: string; views: number }[]; countries: { country: string; views: number }[] }

export const getShareLinks = () => request<{ links: Record<string, ShareLink> }>('/api/user/share').then(d => d.links);
export const getShareLink = (workId: string) =>
  request<{ pro: boolean; link: ShareLink | null; suggestedSlug: string | null; stats: ShareStats | null }>(`/api/user/share/${workId}`);
export const saveShareLink = (workId: string, input: { enabled?: boolean; slug?: string }) =>
  request<{ pro: boolean; link: ShareLink }>(`/api/user/share/${workId}`, json('PUT', input));

/* ── Invite friends ─────────────────────────────────────────── */
export interface ReferralSummary {
  code: string;
  rewardsThisMonth: number;
  maxRewardsPerMonth: number;
  credits: { available: number; used: number; nextExpiry: string | null };
  invites: { email: string; status: 'signed_up' | 'qualified' | 'rejected'; reason: string; createdAt: string; qualifiedAt: string | null }[];
}

export const getReferral = () => request<ReferralSummary>('/api/user/referral');
export const claimReferral = (code: string) => request<{ ok: boolean; status?: string; reason?: string }>('/api/referral/claim', json('POST', { code }));

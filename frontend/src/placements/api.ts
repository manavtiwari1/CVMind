import { API_BASE } from '../lib/apiBase';

// The placements portal (placements.cvmind.in) for colleges. Its token only opens /api/college.

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface College {
  id: string;
  name: string;
  slug: string;
  logo: string;
  status: 'active' | 'suspended';
  access: 'active' | 'readonly' | 'closed';
  contract: { seats: number; startsAt: string | null; endsAt: string | null };
  settings: { minAtsScore: number; minLinkedinScore: number; requireCollegeFormat: boolean };
}

export interface Session {
  token: string;
  staff: Staff;
  college: College;
}

export type ReviewStatus = 'approved' | 'changes_requested' | 'stale' | 'not_reviewed';
export type StudentStatus = 'invited' | 'joined' | 'declined' | 'removed' | 'left';

export interface StudentStats {
  atsScore: number | null;
  linkedinScore: number | null;
  resumeCount: number;
  reviewStatus: ReviewStatus;
  approvedWorkId: string | null;
  eligible: boolean;
}

export interface StudentRow {
  id: string;
  email: string;
  name: string;
  rollNo: string;
  branch: string;
  batch: string;
  status: StudentStatus;
  invitedAt: string | null;
  joinedAt: string | null;
  inviteError: string;
  stats?: StudentStats;
}

export interface Review {
  state: ReviewStatus;
  status: 'approved' | 'changes_requested' | null;
  reviewerName?: string;
  reviewedAt?: string;
  comments: Array<{ byName: string; fromStudent: boolean; text: string; at: string }>;
}

export interface WorkSummary {
  id: string;
  title: string;
  type: 'resume' | 'resume-check' | 'linkedin';
  templateId: string;
  collegeFormat: boolean;
  createdAt: string;
  updatedAt: string;
  review: Review | null;
}

export interface StudentDetail {
  student: StudentRow;
  works: WorkSummary[];
  scans: Array<{ score: number; keywordsScore: number | null; contentScore: number | null; formattingScore: number | null; fileName: string; createdAt: string }>;
  linkedin: Array<{ score: number; createdAt: string }>;
}

export interface Overview {
  seats: number;
  seatsUsed: number;
  joined: number;
  invited: number;
  declined: number;
  approved: number;
  changesRequested: number;
  notReviewed: number;
  eligible: number;
  noScore: number;
  scoreBuckets: Array<{ from: number; to: number; students: number }>;
  byBranch: Array<{ name: string; students: number; eligible: number; avgAts: number | null }>;
  byBatch: Array<{ name: string; students: number; eligible: number; avgAts: number | null }>;
}

export interface RowError { row: number; email: string; error: string }
export interface ImportRow { email: string; name?: string; rollNo?: string; branch?: string; batch?: string }

const SESSION_KEY = 'cvmind_placements_session';
let memorySession: Session | null = null;

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : memorySession;
  } catch {
    return memorySession;
  }
}

const remembered = () => {
  try {
    return !!localStorage.getItem(SESSION_KEY);
  } catch {
    return false;
  }
};

// "Keep me signed in" keeps the session in localStorage; otherwise it ends with the tab
export function saveSession(session: Session, remember = remembered()) {
  clearSession();
  memorySession = session;
  try {
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage blocked: the session lives in memory only */
  }
}

export function clearSession() {
  memorySession = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

let onAuthError: ((code: string, message: string) => void) | null = null;
export function setAuthErrorHandler(fn: ((code: string, message: string) => void) | null) {
  onAuthError = fn;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function qs(query?: Query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

const AUTH_CODES = ['COLLEGE_AUTH', 'COLLEGE_CLOSED', 'COLLEGE_SET_PASSWORD'];

async function request(path: string, options: { method?: string; body?: unknown; query?: Query }) {
  const headers: Record<string, string> = {};
  const token = loadSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    return await fetch(`${API_BASE}/api/college${path}${qs(options.query)}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new ApiError('Could not reach CVMind. Check your connection and try again.', 0);
  }
}

async function fail(path: string, res: Response): Promise<never> {
  let data: { error?: string; code?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  const error = new ApiError(data.error || `Request failed (${res.status}).`, res.status, data.code);
  if (path !== '/login' && (res.status === 401 || AUTH_CODES.includes(data.code || ''))) onAuthError?.(data.code || 'COLLEGE_AUTH', error.message);
  throw error;
}

export async function api<T = Record<string, unknown>>(path: string, options: { method?: string; body?: unknown; query?: Query } = {}): Promise<T> {
  const res = await request(path, options);
  if (!res.ok) return fail(path, res);
  return (await res.json()) as T;
}

// Fetches a file (PDF, ZIP, CSV) with the session and saves it under the server's file name
export async function download(path: string, options: { method?: string; body?: unknown; query?: Query } = {}, fallbackName = 'download') {
  const res = await request(path, options);
  if (!res.ok) return fail(path, res);
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

import { API_BASE } from '../../lib/apiBase';

export interface AdminSession {
  token: string;
  admin: AdminAccount;
}

export interface AdminAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  permissions: string[];
}

const SESSION_KEY = 'cvmind_admin_session';

export function loadSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// "Keep me signed in" uses localStorage; otherwise the session ends with the tab
export function saveSession(session: AdminSession, remember: boolean) {
  try {
    clearSession();
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
    // The old shared-secret login stored this; it no longer works anywhere
    localStorage.removeItem('cvmind_admin_secret');
  } catch {
    /* storage blocked: the session lives in memory only */
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
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

export function qs(query?: Query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const session = loadSession();
  const headers = new Headers(init.headers);
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/admin${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }
  if (res.status === 401 && path !== '/login') {
    onUnauthorized?.();
  }
  return res;
}

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown; query?: Query } = {}): Promise<T> {
  const res = await request(`${path}${qs(options.query)}`, {
    method: options.method || 'GET',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  let data: { error?: string; code?: string } & Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status}).`, res.status, data.code);
  return data as T;
}

// Streams an export from the server and saves it with the filename the server picked
// Saves a file the server sends (e.g. an invoice PDF), using its Content-Disposition name
export async function downloadFile(path: string, fallbackName: string) {
  const res = await request(path);
  if (!res.ok) {
    let message = `Download failed (${res.status}).`;
    try {
      message = (await res.json()).error || message;
    } catch {
      /* not JSON */
    }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const filename = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadExport(type: string, query: Query = {}) {
  const res = await request(`/export/${type}${qs(query)}`);
  if (!res.ok) {
    let message = `Export failed (${res.status}).`;
    try {
      message = (await res.json()).error || message;
    } catch {
      /* not JSON */
    }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || `cvmind-${type}.${query.format === 'json' ? 'json' : 'csv'}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface Paged<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

import { API_BASE } from './config';
import { emit } from './events';

// The app's one way to call the CVMind backend. It sends the session token as a Bearer header, the
// same token the website keeps in cvmind_user, and turns the backend's refusal codes into app events.

let sessionToken: string | null = null;
export const setApiToken = (token: string | null) => {
  sessionToken = token;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = typeof data.code === 'string' ? data.code : undefined;
    this.data = data;
  }
}

const OFFLINE_MESSAGE = "Can't reach CVMind. Check your internet and try again.";

function announceRefusal(status: number, data: Record<string, unknown>) {
  if (![401, 402, 403, 429].includes(status)) return;
  const code = data.code;
  const message = typeof data.error === 'string' ? data.error : undefined;
  if (code === 'EMAIL_NOT_VERIFIED') emit({ type: 'verify-required' });
  else if (code === 'AUTH_REQUIRED') emit({ type: 'auth-required', message });
  else if (code === 'COMING_SOON') emit({ type: 'coming-soon', product: String(data.product || '') });
  else if (code === 'UPGRADE_REQUIRED' || code === 'TOKEN_LIMIT') {
    const reason = code === 'TOKEN_LIMIT' ? 'tokens' : data.feature === 'learn-leo' ? 'learn-leo' : 'limit';
    emit({ type: 'upgrade-required', reason, message });
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
  /** Leave out the session token (sign-in, sign-up). */
  anonymous?: boolean;
};

export async function api<T = Record<string, unknown>>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (!opts.anonymous && sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: opts.method ?? (body ? 'POST' : 'GET'), headers, body, signal: opts.signal });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new ApiError(OFFLINE_MESSAGE, 0, { code: 'OFFLINE' });
  }

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    announceRefusal(res.status, data);
    const message = typeof data.error === 'string' ? data.error : typeof data.message === 'string' ? data.message : 'Something went wrong. Please try again.';
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

export const errorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.') =>
  err instanceof Error && err.message ? err.message : fallback;

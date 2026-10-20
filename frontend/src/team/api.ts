import { API_BASE } from '../lib/apiBase';

// CVMind Team talks to the Render backend directly: it holds the Socket.IO connection, which
// Vercel's serverless functions can't.
export const TEAM_API = import.meta.env.VITE_TEAM_API_URL || (import.meta.env.DEV ? API_BASE : 'https://cvmindai-backend.onrender.com');

export interface TeamAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  permissions: string[];
  // Interns and other team-only roles: no admin panel, and they can't create tasks
  teamOnly: boolean;
  chatAccess: boolean;
  mustChangePassword: boolean;
  notifyEmail: boolean;
  statusText: string;
  avatarFileId: string | null;
}

export interface Session {
  token: string;
  admin: TeamAccount;
}

export interface Person {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  roleLabel: string;
  manager: boolean;
  active: boolean;
  statusText: string;
  avatarFileId: string | null;
  presence: 'online' | 'away' | 'offline';
  lastSeenAt: string | null;
}

export interface TeamFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  uploadedBy: string;
  scope: string;
  scopeId: string | null;
  attachedTo: { type: string; id: string } | null;
  createdAt: string;
  parentId?: string | null;
  version?: number | null;
}

export interface Reaction { emoji: string; adminIds: string[] }

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  kind: 'user' | 'system';
  parentId: string | null;
  replyCount: number;
  lastReplyAt: string | null;
  mentions: string[];
  reactions: Reaction[];
  files: TeamFile[];
  taskId: string | null;
  pinnedAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  kind: 'public' | 'private' | 'dm';
  createdBy: string | null;
  lastMessageAt: string | null;
  archivedAt: string | null;
  joined?: boolean;
  muted?: boolean;
  lastReadAt?: string | null;
  unread?: number;
  memberIds?: string[] | null;
  reads?: Array<{ adminId: string; lastReadAt: string }> | null;
}

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'submitted' | 'changes_requested' | 'approved';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeIds: string[];
  createdBy: string;
  dueAt: string | null;
  sourceMessageId: string | null;
  sourceChannelId: string | null;
  files: TeamFile[];
  blockedReason: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  taskId: string;
  authorId: string;
  version: number;
  note: string;
  files: TeamFile[];
  late: boolean;
  review: { status: 'pending' | 'approved' | 'changes_requested'; by: string | null; comment: string; at: string | null };
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  mentions: string[];
  files: TeamFile[];
  createdAt: string;
}

export interface Activity { id: string; actorId: string; type: string; from: unknown; to: unknown; createdAt: string }

export interface Announcement {
  id: string;
  title: string;
  body: string;
  important: boolean;
  pinned: boolean;
  files: TeamFile[];
  createdBy: string;
  ackCount: number;
  acked: boolean;
  reactions: Reaction[];
  editedAt: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  actorId: string | null;
  refType: string;
  refId: string | null;
  channelId: string | null;
  taskId: string | null;
  preview: string;
  readAt: string | null;
  createdAt: string;
}

const SESSION_KEY = 'cvmind_team_session';

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
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
  try {
    clearSession();
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage blocked: the session lives in memory only */
  }
  memorySession = session;
}

let memorySession: Session | null = null;

export function clearSession() {
  memorySession = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

const currentToken = () => (loadSession() || memorySession)?.token;

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

export async function api<T = Record<string, unknown>>(path: string, options: { method?: string; body?: unknown; query?: Query } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = currentToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${TEAM_API}/api/admin/team${path}${qs(options.query)}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new ApiError('Could not reach CVMind Team. Check your connection and try again.', 0);
  }
  let data: { error?: string; code?: string } & Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const error = new ApiError(data.error || `Request failed (${res.status}).`, res.status, data.code);
    if (path !== '/login' && (res.status === 401 || data.code === 'TEAM_NO_ACCESS' || data.code === 'TEAM_SET_PASSWORD')) onAuthError?.(data.code || 'TEAM_AUTH', error.message);
    throw error;
  }
  return data as T;
}

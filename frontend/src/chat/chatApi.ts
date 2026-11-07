import { API_BASE } from '../lib/apiBase';
import { authFetch } from '../lib/authFetch';

// Client for /api/leo-chat (backend/src/routes/leoChat.js)

export interface AtsCard {
  type: 'ats';
  score: number;
  summary: string;
  sections: { keywords: number; impact: number; formatting: number };
  matched: string[];
  missing: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  rewrites: { original: string; improved: string }[];
}
export interface TailorCard {
  type: 'tailor';
  matchScore: number;
  insights: string[];
  matched: string[];
  missing: string[];
  summary: string;
  bullets: { role: string; points: string[] }[];
}
export interface CoverLetterCard {
  type: 'cover_letter';
  name: string;
  jobTitle: string;
  company: string;
  greeting: string;
  paragraphs: string[];
  closing: string;
}
export interface InterviewCard {
  type: 'interview';
  role: string;
  level: string;
  questions: { question: string; category: string; difficulty: string; wants: string; keyPoints: string[] }[];
}
export interface RoadmapCard {
  type: 'roadmap';
  targetRole: string;
  summary: string;
  skills: string[];
  steps: { name: string; timeframe: string; focus: string; actions: string[]; milestone: string }[];
  risks: string[];
}
export interface JobsCard {
  type: 'jobs';
  query: string;
  total: number;
  // No job title had the specific words asked for; these are related openings
  loose?: boolean;
  jobs: { id: string; title: string; company: string; location: string; remote: boolean; url: string; postedAt: string | null }[];
}
export interface LinkCard { type: 'link'; page: string; label: string; reason: string }
export interface LockedCard { type: 'locked'; action: 'attach' | 'signin' | 'upgrade' | 'info'; message: string }
export interface ErrorCard { type: 'error'; message: string }

export type Card = AtsCard | TailorCard | CoverLetterCard | InterviewCard | RoadmapCard | JobsCard | LinkCard | LockedCard | ErrorCard;

export interface ToolRun { id: string; label: string; done: boolean }

export interface ChatMessage {
  id: string;
  role: 'user' | 'leo';
  // Leo's words before its first tool ran, shown above the tool's card
  lead?: string;
  text: string;
  cards: Card[];
  tools: ToolRun[];
  attachment?: string;
  turnId?: string | null;
  feedback?: 'up' | 'down' | null;
  error?: string;
  streaming?: boolean;
}

export interface Resume { name: string; text: string }

export class ChatError extends Error {
  code: string;
  constructor(message: string, code = '') {
    super(message);
    this.code = code;
  }
}

async function failure(res: Response): Promise<ChatError> {
  const body = await res.json().catch(() => ({}));
  return new ChatError(body.error || 'Leo is not available right now.', body.code || `HTTP_${res.status}`);
}

export interface StreamHandlers {
  onMeta: (meta: { conversationId: string | null; guest: boolean; remaining: number }) => void;
  onDelta: (text: string) => void;
  onTool: (tool: { id: string; name: string; label: string }) => void;
  onCard: (result: { id: string; card: Card }) => void;
  onDone: (done: { turnId: string | null; stopReason: string }) => void;
}

export interface ChatRequest {
  message: string;
  conversationId?: string | null;
  // Guests only: the chat so far, kept in the browser
  history?: { role: 'user' | 'assistant'; content: string }[];
  // A newly attached resume, or null when the user removed it; left out to keep the saved one
  resume?: Resume | null;
}

// Sends one message and streams Leo's reply. Rejects with a ChatError (LEO_SIGNIN, LEO_LIMIT, TOKEN_LIMIT, ...).
export async function streamChat(body: ChatRequest, handlers: StreamHandlers, signal?: AbortSignal) {
  const res = await authFetch(`${API_BASE}/api/leo-chat/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw await failure(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = '';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!event || !data) continue; // heartbeat comments
      const payload = JSON.parse(data);
      if (event === 'meta') handlers.onMeta(payload);
      else if (event === 'delta') handlers.onDelta(payload.text);
      else if (event === 'tool') handlers.onTool(payload);
      else if (event === 'card') handlers.onCard(payload);
      else if (event === 'done') handlers.onDone(payload);
      else if (event === 'error') throw new ChatError(payload.error, payload.code);
    }
  }
}

// Reads a PDF, DOCX or TXT resume to text on the server
export async function attachResume(file: File): Promise<Resume> {
  const form = new FormData();
  form.append('resume', file);
  const res = await authFetch(`${API_BASE}/api/leo-chat/attach`, { method: 'POST', body: form });
  if (!res.ok) throw await failure(res);
  const body = await res.json();
  return { name: body.name, text: body.text };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(`${API_BASE}/api/leo-chat${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export interface ChatSummary { id: string; title: string; updatedAt: string }
export interface SavedChat {
  id: string;
  title: string;
  resumeName: string;
  turns: { id: string; prompt: string; reply: string; cards: Card[]; feedback: 'up' | 'down' | null }[];
}

export const listChats = () => call<{ data: ChatSummary[] }>('/conversations').then((r) => r.data);
export const getChat = (id: string) => call<{ data: SavedChat }>(`/conversations/${id}`).then((r) => r.data);
export const deleteChat = (id: string) => call(`/conversations/${id}`, { method: 'DELETE' });
export const sendFeedback = (turnId: string, value: 'up' | 'down' | null) =>
  call(`/turns/${turnId}/feedback`, { method: 'POST', body: JSON.stringify({ value }) });

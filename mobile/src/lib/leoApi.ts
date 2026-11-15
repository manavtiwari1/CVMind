import { api } from './api';
import { streamEvents } from './sse';

// Client for /api/leo-chat (backend/src/routes/leoChat.js), the same API the website's Leo chat
// uses (frontend/src/chat/chatApi.ts). Chats are saved to the account, so they show on both.

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
export interface TailorCard { type: 'tailor'; matchScore: number; insights: string[]; matched: string[]; missing: string[]; summary: string; bullets: { role: string; points: string[] }[] }
export interface CoverLetterCard { type: 'cover_letter'; name: string; jobTitle: string; company: string; greeting: string; paragraphs: string[]; closing: string }
export interface InterviewCard { type: 'interview'; role: string; level: string; questions: { question: string; category: string; difficulty: string; wants: string; keyPoints: string[] }[] }
export interface RoadmapCard { type: 'roadmap'; targetRole: string; summary: string; skills: string[]; steps: { name: string; timeframe: string; focus: string; actions: string[]; milestone: string }[]; risks: string[] }
export interface JobsCard { type: 'jobs'; query: string; total: number; loose?: boolean; jobs: { id: string; title: string; company: string; location: string; remote: boolean; url: string; postedAt: string | null }[] }
export interface LinkCard { type: 'link'; page: string; label: string; reason: string }
export interface LockedCard { type: 'locked'; action: 'attach' | 'signin' | 'upgrade' | 'info'; message: string }
export interface ErrorCard { type: 'error'; message: string }
export interface ChoicesCard { type: 'choices'; id: string; question: string; field: string; options: string[] }
export interface SummaryCard { type: 'summary_confirm'; product: string; title: string; sections: { title: string; lines: string[] }[] }
export interface ProfileNoteCard { type: 'profile_note'; message: string; page?: string }
export interface WritingCard { type: 'writing'; kicker: string; title: string; score?: number; blocks: { title: string; text: string; copy?: boolean }[] }
export interface PortfolioLooksCard { type: 'portfolio_looks'; looks: { id: string; label: string; bg: string; accent: string; text: string }[] }
/** Any card the app doesn't draw yet: shown as a link to the same chat on cvmind.in */
export interface OtherCard { type: string; title?: string }

export type Card =
  | AtsCard | TailorCard | CoverLetterCard | InterviewCard | RoadmapCard | JobsCard | LinkCard | LockedCard | ErrorCard
  | ChoicesCard | SummaryCard | ProfileNoteCard | WritingCard | PortfolioLooksCard | OtherCard;

export interface ToolRun { id: string; name?: string; label: string; done: boolean; live?: string }

export interface ChatMessage {
  id: string;
  role: 'user' | 'leo';
  /** Leo's words before its first tool ran, shown above the tool's card */
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
export type LeoFlow = Record<string, unknown> | null;

export interface StreamHandlers {
  onMeta: (meta: { conversationId: string | null; guest: boolean; remaining: number }) => void;
  onDelta: (text: string) => void;
  onTool: (tool: { id: string; name: string; label: string }) => void;
  onProgress: (progress: { id: string; text?: string; reset?: boolean }) => void;
  onCard: (result: { id: string; card: Card }) => void;
  onFlow: (flow: LeoFlow) => void;
  onDone: (done: { turnId: string | null }) => void;
}

export interface ChatRequest {
  conversationId?: string | null;
  /** A newly attached resume, or null when removed; left out to keep the saved one */
  resume?: Resume | null;
}

function dispatch(handlers: StreamHandlers) {
  return (event: string, payload: Record<string, unknown>) => {
    if (event === 'meta') handlers.onMeta(payload as never);
    else if (event === 'delta') handlers.onDelta(String(payload.text ?? ''));
    else if (event === 'tool') handlers.onTool(payload as never);
    else if (event === 'progress') handlers.onProgress(payload as never);
    else if (event === 'card') handlers.onCard(payload as never);
    else if (event === 'flow') handlers.onFlow((payload.flow as LeoFlow) ?? null);
    else if (event === 'done') handlers.onDone(payload as never);
  };
}

export const streamChat = (body: ChatRequest & { message: string }, handlers: StreamHandlers, signal?: AbortSignal) =>
  streamEvents('/api/leo-chat/chat', { body, signal }, dispatch(handlers));

/** A tap on a guided-flow card (a choice, "Looks good"), streamed like a message */
export const streamAction = (
  body: ChatRequest & { action: 'choose' | 'confirm' | 'template'; value?: Record<string, string> },
  handlers: StreamHandlers,
  signal?: AbortSignal,
) => streamEvents('/api/leo-chat/action', { body, signal }, dispatch(handlers));

/** Reads a PDF, DOCX or TXT resume to text on the server */
export async function attachResume(file: { uri: string; name: string; mimeType?: string | null }): Promise<Resume> {
  const form = new FormData();
  form.append('resume', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
  const data = await api<{ name: string; text: string }>('/api/leo-chat/attach', { method: 'POST', form });
  return { name: data.name, text: data.text };
}

export interface ChatSummary { id: string; title: string; updatedAt: string }
export interface SavedChat {
  id: string;
  title: string;
  resumeName: string;
  turns: { id: string; prompt: string; reply: string; cards: Card[]; feedback: 'up' | 'down' | null }[];
}

export const listChats = () => api<{ data: ChatSummary[] }>('/api/leo-chat/conversations').then((r) => r.data);
export const getChat = (id: string) => api<{ data: SavedChat }>(`/api/leo-chat/conversations/${id}`).then((r) => r.data);
export const deleteChat = (id: string) => api(`/api/leo-chat/conversations/${id}`, { method: 'DELETE' });
export const sendFeedback = (turnId: string, value: 'up' | 'down' | null) =>
  api(`/api/leo-chat/turns/${turnId}/feedback`, { method: 'POST', body: { value } });

/** A saved chat turned into the thread the screen shows */
export function toMessages(chat: SavedChat): ChatMessage[] {
  return chat.turns.flatMap((t) => [
    { id: `${t.id}-q`, role: 'user' as const, text: t.prompt, cards: [], tools: [] },
    { id: `${t.id}-a`, role: 'leo' as const, text: t.reply, cards: t.cards || [], tools: [], turnId: t.id, feedback: t.feedback },
  ]);
}

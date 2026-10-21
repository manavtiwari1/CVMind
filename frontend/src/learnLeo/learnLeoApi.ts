import { API_BASE } from '../lib/apiBase';
import { authFetch, getSessionToken } from '../lib/authFetch';

// Learn with Leo API (backend routes/learnLeo.js). Lessons stream beat by beat over SSE; the
// stream is read with fetch because EventSource can't send the Bearer token.

export type LeoLanguage = 'hinglish' | 'english';
export type LeoLevel = 'beginner' | 'intermediate' | 'advanced';

export interface PlanStep { title: string; goal: string }

interface Cued { cue?: string; wordIndex?: number }
export type BoardElement =
  | ({ type: 'heading' | 'callout'; content: string } & Cued)
  | ({ type: 'bullet'; items: string[] } & Cued)
  | ({ type: 'code'; language: string; content: string } & Cued)
  | ({ type: 'formula'; content: string } & Cued)
  | ({ type: 'diagram'; format: 'mermaid'; content: string } & Cued)
  | ({ type: 'table'; headers: string[]; rows: string[][] } & Cued)
  | ({ type: 'checkpoint'; format: 'mcq' | 'true_false'; question: string; options: string[] } & Cued);

export interface CheckpointAnswer { beatOrder: number; chosen: number; correct: boolean; answer?: number; explanation?: string }

export interface Beat {
  order: number;
  kind: 'main' | 'reexplain' | 'approach';
  title: string;
  narration: string;
  elements: BoardElement[];
  audioUrl: string | null;
  wordTimings: { word: string; startMs: number }[] | null;
  durationMs: number;
  answered?: CheckpointAnswer;
}

export interface Lesson {
  id: string;
  topic: string;
  language: LeoLanguage;
  level: LeoLevel;
  role: string;
  plan: PlanStep[];
  planEdited: boolean;
  status: 'planning' | 'streaming' | 'ready' | 'failed';
  source: 'skill_gap' | 'dsa_problem' | 'manual';
  problemId: string | null;
  summary: string;
  beatCount: number;
  checkpointBeats: number[];
  cached: boolean;
  failReason: string;
  createdAt: string;
  startedAt: string | null;
}

export interface LessonProgress {
  lastBeat: number;
  checkpointAnswers: CheckpointAnswer[];
  completedAt: string | null;
  prepClickedAt: string | null;
}

export interface FailingTest { input: unknown; expected: unknown; actual: unknown; error?: string | null }

export interface PlanRequest {
  topic?: string;
  language: LeoLanguage;
  level: LeoLevel;
  role?: string;
  skills?: string[];
  source?: 'skill_gap' | 'manual';
  skillGapId?: string;
  problemId?: string;
  code?: string;
  codeLanguage?: string;
  failingTest?: FailingTest | null;
}

// Handed over by the CVMind Code workspace's "Stuck? Learn with Leo" button (sessionStorage)
export const PROBLEM_HANDOFF_KEY = 'cvmind_leo_problem';
export interface ProblemHandoff {
  problemId: string;
  title: string;
  code: string;
  codeLanguage: string;
  failingTest: FailingTest | null;
}

export class LeoApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const url = (path: string) => `${API_BASE}/api/leo${path}`;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(url(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new LeoApiError(data.error || 'Something went wrong. Please try again.', res.status, data.code);
  }
  return data as T;
}

const post = <T>(path: string, body: unknown = {}) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const leoApi = {
  plan: (body: PlanRequest) => post<{ lesson: Lesson; message: string }>('/plan', body),
  revisePlan: (id: string, body: { shorter?: boolean; edits?: string }) => post<{ lesson: Lesson; message: string }>(`/lessons/${id}/plan`, body),
  start: (id: string) => post<{ lesson: Lesson }>(`/lessons/${id}/start`),
  checkpoint: (id: string, beatOrder: number, chosen: number) =>
    post<{ correct: boolean; answer: number; explanation: string; reply: string; reexplain?: Beat | null }>(`/lessons/${id}/checkpoint`, { beatOrder, chosen }),
  fullApproach: (id: string) => post<{ beat: Beat }>(`/lessons/${id}/full-approach`),
  progress: (id: string, body: { lastBeat?: number; completed?: boolean; prepClicked?: boolean }) =>
    post<{ progress: LessonProgress }>(`/lessons/${id}/progress`, body),
  report: (id: string, order: number, note: string) => post<{ reported: boolean }>(`/lessons/${id}/beats/${order}/report`, { note }),
  list: () => request<{ lessons: (Lesson & { progress: LessonProgress })[] }>('/lessons'),
  get: (id: string) => request<{ lesson: Lesson; beats: Beat[]; reexplains: Beat[]; approach: Beat | null; progress: LessonProgress }>(`/lessons/${id}`)
};

export interface StreamHandlers {
  onMeta?: (lesson: Lesson) => void;
  onBeat: (beat: Beat) => void;
  onDone: (lesson: Lesson) => void;
  onError: (message: string, code?: string) => void;
}

/**
 * Streams a lesson's beats from `from`. A dropped connection reconnects from the next missing beat
 * (up to 3 times in a row); the server sends saved beats straight away and writes the rest.
 * Returns a function that stops the stream.
 */
export function streamLesson(id: string, from: number, handlers: StreamHandlers): () => void {
  const controller = new AbortController();
  let next = from;
  let retries = 0;
  let finished = false;

  const run = async (): Promise<void> => {
    let res: Response;
    try {
      const token = getSessionToken();
      res = await fetch(url(`/lessons/${id}/stream?from=${next}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal
      });
    } catch {
      if (!controller.signal.aborted) return retry();
      return;
    }
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      finished = true;
      handlers.onError(data.error || 'Leo could not open this lesson.', data.code);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let cut: number;
        while ((cut = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          const event = /^event: (.+)$/m.exec(chunk)?.[1];
          const data = /^data: (.+)$/m.exec(chunk)?.[1];
          if (!event || !data) continue;
          const payload = JSON.parse(data);
          if (event === 'meta') handlers.onMeta?.(payload.lesson);
          else if (event === 'beat') {
            retries = 0;
            next = Math.max(next, payload.order + 1);
            handlers.onBeat(payload);
          } else if (event === 'done') {
            finished = true;
            handlers.onDone(payload.lesson);
          } else if (event === 'error') {
            finished = true;
            handlers.onError(payload.error, payload.code);
          }
        }
      }
    } catch {
      /* connection dropped */
    }
    if (!finished && !controller.signal.aborted) return retry();
  };

  const retry = async () => {
    retries += 1;
    if (retries > 3) {
      handlers.onError('The connection to Leo dropped. Check your internet and try again.', 'NETWORK');
      return;
    }
    await new Promise((r) => setTimeout(r, 800 * retries));
    if (!controller.signal.aborted) await run();
  };

  void run();
  return () => controller.abort();
}

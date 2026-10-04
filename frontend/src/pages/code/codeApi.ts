import { authFetch } from '../../lib/authFetch';

export type Language = 'javascript' | 'python' | 'cpp';

export const LANGUAGES: { id: Language; label: string; monaco: string; judged: boolean }[] = [
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript', judged: true },
  { id: 'python', label: 'Python 3', monaco: 'python', judged: true },
  { id: 'cpp', label: 'C++', monaco: 'cpp', judged: true },
];

export interface TestCaseResult {
  testCaseIndex: number;
  passed: boolean;
  input: unknown;
  expected: unknown;
  actual: unknown;
  error?: string;
  runtimeMs?: number;
}

/** Shape of /api/code/run (data.result) and /api/code/submit (data). */
export interface JudgeResult {
  verdict: string;
  error?: string | null;
  runtimeMs?: number;
  memoryMb?: number;
  results?: TestCaseResult[];
  passedTests?: number;
  totalTests?: number;
  /** true when the server did not really execute the code (for example C++): never treat as a real verdict */
  simulated?: boolean;
}

export interface AiHint { level?: number; title?: string; hint: string; keyInsight?: string }
export interface AiReview {
  verdict: string;
  timeComplexity: string;
  spaceComplexity: string;
  qualityScore: number;
  strengths?: string[];
  optimizations?: string[];
}
export interface AiDebug { summary: string; probableCause: string; suggestedFix: string; edgeCaseToTest: string }

export function apiBase(): string {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com')
  );
}

async function postJson<T>(path: string, body: unknown, opts: { auth?: boolean; geminiKey?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.geminiKey) headers['x-gemini-key'] = opts.geminiKey;
  const init = { method: 'POST', headers, body: JSON.stringify(body) };
  const res = opts.auth ? await authFetch(`${apiBase()}${path}`, init) : await fetch(`${apiBase()}${path}`, init);
  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  const d = data as { error?: string } | null;
  if (!res.ok) throw new Error(d?.error || `Request failed (${res.status})`);
  return data as T;
}

export async function runCode(args: { problemId: string; code: string; language: Language; customInput?: unknown }): Promise<JudgeResult> {
  const customTestCases = args.customInput !== undefined ? [{ input: args.customInput, expected: null }] : undefined;
  const data = await postJson<{ result: JudgeResult }>('/api/code/run', { problemId: args.problemId, code: args.code, language: args.language, customTestCases }, { auth: true });
  return data.result;
}

export async function submitCode(args: { problemId: string; code: string; language: Language }): Promise<JudgeResult> {
  return postJson<JudgeResult>('/api/code/submit', args, { auth: true });
}

interface AiEnvelope<T> { success: boolean; data?: T; error?: string }

async function ai<T>(path: string, body: unknown, geminiKey?: string): Promise<T> {
  // AI help needs a verified account, so the session token goes along
  const data = await postJson<AiEnvelope<T>>(path, body, { geminiKey, auth: true });
  if (!data.success || !data.data) throw new Error(data.error || 'The AI assistant did not return a result.');
  return data.data;
}

export const requestHint = (body: { problemTitle: string; problemDescription: string; userCode: string; language: Language; requestedLevel: number }, key?: string) =>
  ai<AiHint>('/api/code/ai/hint', body, key);

export const requestReview = (body: { problemTitle: string; problemDescription: string; userCode: string; language: Language }, key?: string) =>
  ai<AiReview>('/api/code/ai/review', body, key);

export const requestDebug = (body: { problemTitle: string; userCode: string; language: Language; failedTestInfo: unknown }, key?: string) =>
  ai<AiDebug>('/api/code/ai/debug', body, key);

export async function generateProblem(body: { topic: string; difficulty: string; company: string; customPrompt: string }, key?: string) {
  const data = await postJson<{ success: boolean; problem?: unknown; error?: string }>('/api/code/ai/generate-problem', body, { geminiKey: key, auth: true });
  if (!data.success || !data.problem) throw new Error(data.error || 'Could not generate a problem.');
  return data.problem;
}

export function formatValue(v: unknown): string {
  if (v === undefined) return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

import { useSyncExternalStore } from 'react';
import type { CodingProblem } from '../../data/codingProblems';

/**
 * Local-first progress store for CVMind Code.
 * Everything here comes from what the user actually ran and submitted on this device:
 * there are no seeded or placeholder values.
 */

export interface SubmissionRecord {
  id: string;
  problemId: string;
  problemTitle: string;
  verdict: string;
  language: string;
  passedTests?: number;
  totalTests?: number;
  runtimeMs?: number;
  at: number;
  /** Kept only for the most recent submissions, so the store stays small. */
  code?: string;
}

export interface SolvedInfo {
  at: number;
  language: string;
}

export interface ProgressState {
  version: 1;
  solved: Record<string, SolvedInfo>;
  /** problemId -> number of submissions */
  attempted: Record<string, number>;
  submissions: SubmissionRecord[];
  /** local day (YYYY-MM-DD) -> number of submissions */
  activity: Record<string, number>;
  lastProblemId?: string;
}

const KEY = 'cvmind_code_progress_v1';
const MAX_SUBMISSIONS = 400;
const MAX_WITH_CODE = 40;

const empty = (): ProgressState => ({ version: 1, solved: {}, attempted: {}, submissions: [], activity: {} });

export function dayKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProgressState;
      if (parsed && parsed.version === 1) return { ...empty(), ...parsed };
    }
    // One-time import of the older list of solved ids. The old app pre-seeded ['two-sum'] for everyone,
    // so a list that is exactly that seed is ignored rather than shown as real progress.
    const legacy = localStorage.getItem('cvmind_solved_problems');
    if (legacy) {
      const ids = JSON.parse(legacy) as string[];
      const isSeedOnly = ids.length === 1 && ids[0] === 'two-sum';
      if (Array.isArray(ids) && !isSeedOnly) {
        const state = empty();
        ids.forEach((id) => { state.solved[id] = { at: 0, language: 'javascript' }; });
        return state;
      }
    }
  } catch {
    // corrupt or unavailable storage: start clean
  }
  return empty();
}

let state: ProgressState = load();
const listeners = new Set<() => void>();

function commit(next: ProgressState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked: progress still works for this session
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

/** Subscribe a component to the progress store. */
export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export interface NewSubmission {
  problemId: string;
  problemTitle: string;
  verdict: string;
  language: string;
  passedTests?: number;
  totalTests?: number;
  runtimeMs?: number;
  code?: string;
  /** false when the result came from a preview that was not really judged; such results never count as solved */
  verified: boolean;
}

export function recordSubmission(sub: NewSubmission): SubmissionRecord {
  const at = Date.now();
  const record: SubmissionRecord = {
    id: `sub_${at}_${Math.random().toString(36).slice(2, 7)}`,
    problemId: sub.problemId,
    problemTitle: sub.problemTitle,
    verdict: sub.verified ? sub.verdict : `${sub.verdict} (unverified)`,
    language: sub.language,
    passedTests: sub.passedTests,
    totalTests: sub.totalTests,
    runtimeMs: sub.runtimeMs,
    at,
    code: sub.code,
  };

  const submissions = [record, ...state.submissions].slice(0, MAX_SUBMISSIONS).map((s, i) =>
    i < MAX_WITH_CODE ? s : { ...s, code: undefined },
  );
  const solved = { ...state.solved };
  if (sub.verified && sub.verdict === 'Accepted' && !solved[sub.problemId]) {
    solved[sub.problemId] = { at, language: sub.language };
  }
  const day = dayKey(at);
  commit({
    ...state,
    solved,
    submissions,
    attempted: { ...state.attempted, [sub.problemId]: (state.attempted[sub.problemId] || 0) + 1 },
    activity: { ...state.activity, [day]: (state.activity[day] || 0) + 1 },
  });
  return record;
}

export function setLastProblem(problemId: string) {
  if (state.lastProblemId !== problemId) commit({ ...state, lastProblemId: problemId });
}

export function resetProgress() {
  commit(empty());
}

// ── Drafts: the code you were typing survives reloads, per problem and language ──
const draftKey = (problemId: string, language: string) => `cvmind_code_draft:${problemId}:${language}`;

export function loadDraft(problemId: string, language: string): string | null {
  try { return localStorage.getItem(draftKey(problemId, language)); } catch { return null; }
}

export function saveDraft(problemId: string, language: string, code: string) {
  try { localStorage.setItem(draftKey(problemId, language), code); } catch { /* ignore */ }
}

export function clearDraft(problemId: string, language: string) {
  try { localStorage.removeItem(draftKey(problemId, language)); } catch { /* ignore */ }
}

// ── Derived numbers ─────────────────────────────────────────────

export type Status = 'solved' | 'attempted' | 'todo';

export function statusOf(p: ProgressState, problemId: string): Status {
  if (p.solved[problemId]) return 'solved';
  if (p.attempted[problemId]) return 'attempted';
  return 'todo';
}

export interface StreakInfo {
  current: number;
  longest: number;
  activeDays: number;
}

export function computeStreak(activity: Record<string, number>, now = Date.now()): StreakInfo {
  const days = Object.keys(activity).filter((k) => activity[k] > 0).sort();
  if (!days.length) return { current: 0, longest: 0, activeDays: 0 };

  const toDate = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const diffDays = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = diffDays(toDate(days[i - 1]), toDate(days[i])) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // The current streak is alive if the last active day is today or yesterday.
  const last = toDate(days[days.length - 1]);
  const gap = diffDays(last, toDate(dayKey(now)));
  let current = 0;
  if (gap <= 1) {
    current = 1;
    for (let i = days.length - 1; i > 0; i--) {
      if (diffDays(toDate(days[i - 1]), toDate(days[i])) === 1) current++;
      else break;
    }
  }
  return { current, longest, activeDays: days.length };
}

export interface DifficultyCount { solved: number; total: number }

export interface Summary {
  solved: number;
  total: number;
  byDifficulty: Record<'Easy' | 'Medium' | 'Hard', DifficultyCount>;
  byTopic: { topic: string; solved: number; total: number }[];
}

export function summarize(problems: CodingProblem[], p: ProgressState): Summary {
  const byDifficulty = {
    Easy: { solved: 0, total: 0 },
    Medium: { solved: 0, total: 0 },
    Hard: { solved: 0, total: 0 },
  };
  const topics = new Map<string, { solved: number; total: number }>();
  let solved = 0;
  for (const pr of problems) {
    const isSolved = !!p.solved[pr.id];
    byDifficulty[pr.difficulty].total++;
    const t = topics.get(pr.category) || { solved: 0, total: 0 };
    t.total++;
    if (isSolved) { solved++; byDifficulty[pr.difficulty].solved++; t.solved++; }
    topics.set(pr.category, t);
  }
  return {
    solved,
    total: problems.length,
    byDifficulty,
    byTopic: [...topics.entries()].map(([topic, v]) => ({ topic, ...v })),
  };
}

/** A problem of the day that is the same for everyone on the same calendar day. */
export function dailyProblem(problems: CodingProblem[], now = Date.now()): CodingProblem | undefined {
  const pool = problems.filter((p) => !p.isAiGenerated);
  if (!pool.length) return undefined;
  const key = dayKey(now);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

export function timeAgo(at: number, now = Date.now()): string {
  if (!at) return 'earlier';
  const s = Math.max(1, Math.round((now - at) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(at).toLocaleDateString();
}

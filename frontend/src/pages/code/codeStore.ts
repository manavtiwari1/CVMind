import { useSyncExternalStore } from 'react';
import type { CodingProblem } from '../../data/codingProblems';
import { authFetch, getSessionToken } from '../../lib/authFetch';
import { apiBase } from './codeApi';

/**
 * Progress store for CVMind Code.
 * Everything here comes from what the user actually submitted: there are no seeded or placeholder values.
 * It works offline from localStorage; when signed in, syncProgress() makes the account's MongoDB copy the
 * source of truth so progress and drafts follow the user across devices.
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
  clearLocalDrafts();
  if (getSessionToken()) {
    // the account's copy in MongoDB goes too, otherwise the next sync would bring it back
    void authFetch(`${apiBase()}/api/code/progress`, { method: 'DELETE' }).catch(() => { /* offline: retried never, user can erase again */ });
  }
}

// ── Drafts: the code you were typing survives reloads, per problem and language ──
const DRAFT_PREFIX = 'cvmind_code_draft:';
const DRAFT_TS_PREFIX = 'cvmind_code_draft_ts:';
const draftKey = (problemId: string, language: string) => `${DRAFT_PREFIX}${problemId}:${language}`;
const draftTsKey = (problemId: string, language: string) => `${DRAFT_TS_PREFIX}${problemId}:${language}`;

export function loadDraft(problemId: string, language: string): string | null {
  try { return localStorage.getItem(draftKey(problemId, language)); } catch { return null; }
}

const draftTimers = new Map<string, number>();

function pushDraft(problemId: string, language: string, code: string) {
  if (!getSessionToken()) return;
  void authFetch(`${apiBase()}/api/code/drafts`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problemId, language, code }),
  }).catch(() => { /* offline: the local copy is kept and pushed on the next sync */ });
}

export function saveDraft(problemId: string, language: string, code: string) {
  try {
    localStorage.setItem(draftKey(problemId, language), code);
    localStorage.setItem(draftTsKey(problemId, language), String(Date.now()));
  } catch { /* ignore */ }
  // save to the account a moment after typing stops, not on every keystroke
  const key = draftKey(problemId, language);
  window.clearTimeout(draftTimers.get(key));
  draftTimers.set(key, window.setTimeout(() => { draftTimers.delete(key); pushDraft(problemId, language, code); }, 1500));
}

export function clearDraft(problemId: string, language: string) {
  try {
    localStorage.removeItem(draftKey(problemId, language));
    localStorage.removeItem(draftTsKey(problemId, language));
  } catch { /* ignore */ }
  window.clearTimeout(draftTimers.get(draftKey(problemId, language)));
  if (getSessionToken()) {
    const qs = new URLSearchParams({ problemId, language });
    void authFetch(`${apiBase()}/api/code/drafts?${qs}`, { method: 'DELETE' }).catch(() => { /* ignore */ });
  }
}

function clearLocalDrafts() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(DRAFT_PREFIX) || k.startsWith(DRAFT_TS_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

// ── Account sync: MongoDB is the source of truth once you are signed in ──

interface ServerProgress {
  success: boolean;
  solved: Record<string, SolvedInfo>;
  submissions: SubmissionRecord[];
  drafts: { problemId: string; language: string; code: string; updatedAt: number }[];
}

const SYNC_EVERY_MS = 30000;
let lastSync = 0;
let syncing: Promise<boolean> | null = null;

function applyServerProgress(server: ServerProgress) {
  // Local-only entries (for example a result that was never judged) stay; anything the server has wins.
  const localOnly = state.submissions.filter((l) =>
    !server.submissions.some((s) => s.problemId === l.problemId && s.language === l.language && Math.abs(s.at - l.at) < 15000),
  );
  const submissions = [...server.submissions, ...localOnly]
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_SUBMISSIONS)
    .map((s, i) => (i < MAX_WITH_CODE ? s : { ...s, code: undefined }));

  const attempted: Record<string, number> = {};
  const activity: Record<string, number> = {};
  for (const s of submissions) {
    attempted[s.problemId] = (attempted[s.problemId] || 0) + 1;
    if (s.at) activity[dayKey(s.at)] = (activity[dayKey(s.at)] || 0) + 1;
  }
  commit({ ...state, solved: { ...state.solved, ...server.solved }, submissions, attempted, activity });

  for (const d of server.drafts) {
    try {
      const local = localStorage.getItem(draftKey(d.problemId, d.language));
      const localTs = Number(localStorage.getItem(draftTsKey(d.problemId, d.language)) || 0);
      if (local === null || d.updatedAt > localTs) {
        localStorage.setItem(draftKey(d.problemId, d.language), d.code);
        localStorage.setItem(draftTsKey(d.problemId, d.language), String(d.updatedAt));
      } else if (localTs > d.updatedAt || local !== d.code) {
        pushDraft(d.problemId, d.language, local);
      }
    } catch { /* ignore */ }
  }

  // drafts that only exist on this device go up to the account
  try {
    for (const k of Object.keys(localStorage).filter((x) => x.startsWith(DRAFT_PREFIX))) {
      const rest = k.slice(DRAFT_PREFIX.length);
      const cut = rest.lastIndexOf(':');
      const problemId = rest.slice(0, cut);
      const language = rest.slice(cut + 1);
      if (!server.drafts.some((d) => d.problemId === problemId && d.language === language)) {
        const code = localStorage.getItem(k);
        if (code) pushDraft(problemId, language, code);
      }
    }
  } catch { /* ignore */ }
}

/** Pull this account's progress and drafts from MongoDB. Resolves true when the store was refreshed. */
export function syncProgress(force = false): Promise<boolean> {
  if (!getSessionToken()) return Promise.resolve(false);
  if (syncing) return syncing;
  if (!force && Date.now() - lastSync < SYNC_EVERY_MS) return Promise.resolve(false);
  syncing = (async () => {
    try {
      const res = await authFetch(`${apiBase()}/api/code/progress`);
      if (!res.ok) return false;
      applyServerProgress((await res.json()) as ServerProgress);
      lastSync = Date.now();
      return true;
    } catch {
      return false; // offline or server asleep: the local copy keeps working
    } finally {
      syncing = null;
    }
  })();
  return syncing;
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

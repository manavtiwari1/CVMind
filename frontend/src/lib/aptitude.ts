import { useEffect, useState } from 'react';
import { API_BASE } from './apiBase';
import { authFetch, getSessionToken } from './authFetch';
import { showComingSoon } from './leoAccess';

// Aptitude Tests (coming soon). Only accounts the server allows (backend aptitude/access.js) can open
// them; everyone else sees the coming-soon dialog. Answers are graded on the server.

export type AptitudeTopic = 'quant' | 'reasoning' | 'verbal' | 'mixed';

export interface AptitudeQuestion {
  id: string;
  topic: Exclude<AptitudeTopic, 'mixed'>;
  subtopic: string;
  question: string;
  options: string[];
}

export interface AptitudeTest {
  topic: AptitudeTopic;
  label: string;
  minutes: number;
  questions: AptitudeQuestion[];
}

export interface AptitudeResultRow extends AptitudeQuestion {
  choice: number | null;
  answer: number;
  correct: boolean;
  explanation: string;
}

export interface AptitudeResult {
  score: number;
  total: number;
  skipped: number;
  wrong: number;
  sections: Record<string, { label: string; correct: number; total: number }>;
  results: AptitudeResultRow[];
}

// Shown on the public page and the test picker. Counts match backend aptitude/questions.js.
export const APTITUDE_TESTS: { id: AptitudeTopic; label: string; desc: string; questions: number }[] = [
  { id: 'quant', label: 'Quantitative Aptitude', desc: 'Percentages, profit and loss, time and work, interest, speed and distance', questions: 10 },
  { id: 'reasoning', label: 'Logical Reasoning', desc: 'Series, coding-decoding, blood relations, directions, syllogisms', questions: 10 },
  { id: 'verbal', label: 'Verbal Ability', desc: 'Synonyms, antonyms, grammar, error spotting, idioms', questions: 10 },
  { id: 'mixed', label: 'Mixed Mock Test', desc: 'Quant, reasoning and verbal together, like a placement test', questions: 15 },
];

let cached: { token: string | null; result: Promise<boolean> } | null = null;

export function aptitudeAccess(): Promise<boolean> {
  const token = getSessionToken();
  if (!token) return Promise.resolve(false);
  if (cached?.token !== token) {
    const result = authFetch(`${API_BASE}/api/aptitude/access`)
      .then((res) => (res.ok ? res.json() : { access: false }))
      .then((data: { access?: boolean }) => data.access === true)
      .catch(() => false);
    cached = { token, result };
  }
  return cached.result;
}

/** Runs `go` for accounts with access, otherwise shows the coming-soon dialog. */
export async function openAptitude(go: () => void) {
  if (await aptitudeAccess()) go();
  else showComingSoon('aptitude');
}

export function useAptitudeAccess(): 'checking' | 'open' | 'locked' {
  const [state, setState] = useState<'checking' | 'open' | 'locked'>('checking');
  useEffect(() => {
    let alive = true;
    aptitudeAccess().then((ok) => { if (alive) setState(ok ? 'open' : 'locked'); });
    return () => { alive = false; };
  }, []);
  return state;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await authFetch(`${API_BASE}/api/aptitude/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data as T;
}

export const startAptitudeTest = (topic: AptitudeTopic) => post<AptitudeTest>('start', { topic });

export const checkAptitudeTest = (answers: { id: string; choice: number | null }[]) => post<AptitudeResult>('check', { answers });

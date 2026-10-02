// Shared by the Career tools (LinkedIn and Career Path): running a tool, CV input, the API call and small helpers.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GraduationCap, Map as MapIcon, MessagesSquare, PenLine, Presentation, UserCheck, type LucideIcon,
} from 'lucide-react';
import { authFetch } from '../../lib/authFetch';
import { API_BASE } from '../../lib/apiBase';
import { cvFileError, isLink } from '../../lib/jobInput';
import { getErrorMessage } from '../../utils/errors';

export type CvSource = 'saved' | 'file' | 'link' | 'none';

export interface CvInput {
  source: CvSource;
  file: File | null;
  url: string;
}

export const MIN_RESUME_CHARS = 50;

/** CV state for a tool's form: the resume the app already has, a file, a link, or none. */
export function useCvInput(appResumeText: string) {
  const hasAppResume = appResumeText.trim().length >= MIN_RESUME_CHARS;
  const [cv, setCv] = useState<CvInput>({ source: hasAppResume ? 'saved' : 'file', file: null, url: '' });
  const [fileError, setFileError] = useState<string | null>(null);

  const pickFile = (file: File) => {
    const problem = cvFileError(file);
    setFileError(problem);
    if (!problem) setCv(c => ({ ...c, source: 'file', file }));
  };

  // A CV is optional everywhere; a chosen source just has to be complete
  const ready = cv.source === 'file' ? Boolean(cv.file)
    : cv.source === 'link' ? isLink(cv.url)
      : true;

  return {
    cv,
    hasAppResume,
    appResumeText,
    fileError,
    ready,
    setSource: (source: CvSource) => { setFileError(null); setCv(c => ({ ...c, source })); },
    setUrl: (url: string) => setCv(c => ({ ...c, url })),
    pickFile,
    clearFile: () => setCv(c => ({ ...c, file: null })),
  };
}

export type CvState = ReturnType<typeof useCvInput>;

/** Short name for where the CV came from, for the result header. */
export function cvLabel(state: CvState): string {
  const { cv } = state;
  if (cv.source === 'saved') return 'Your saved resume';
  if (cv.source === 'file') return cv.file?.name || '';
  if (cv.source === 'link') return 'Linked resume';
  return '';
}

/**
 * Posts a Career tool's form (plus the CV) as multipart data and returns the AI result.
 * Throws an Error with a readable message.
 */
export async function postCareer<T>(path: string, fields: Record<string, string>, cvState: CvState | null, customApiKey: string): Promise<T> {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  if (cvState) {
    const { cv, appResumeText } = cvState;
    if (cv.source === 'file' && cv.file) form.append('resume', cv.file);
    else if (cv.source === 'link' && cv.url.trim()) form.append('resumeUrl', cv.url.trim());
    else if (cv.source === 'saved') form.append('resumeText', appResumeText.trim());
  }
  const headers: Record<string, string> = customApiKey ? { 'x-gemini-key': customApiKey } : {};

  let res: Response;
  try {
    res = await authFetch(`${API_BASE}${path}`, { method: 'POST', headers, body: form });
  } catch {
    throw new Error('We could not reach CVMind. Check your connection and try again.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Something went wrong on our side. Please try again in a moment.');
  if (!body.data) throw new Error('The AI did not send anything back. Please try again.');
  return body.data as T;
}

export const errorText = (err: unknown) => getErrorMessage(err) || 'Something went wrong on our side. Please try again in a moment.';

/** Saves text as a .txt download. */
export function downloadText(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'CVMind'}.txt` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/**
 * Ticked items of a result's checklist, remembered in this browser.
 * The key should identify the result, so a new run starts with nothing ticked.
 */
export function useChecklist(key: string) {
  const storageKey = `cvmind_check_${key}`;
  const read = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return new Set<string>(Array.isArray(raw) ? raw : []);
    } catch {
      return new Set<string>();
    }
  };
  const [done, setDone] = useState<Set<string>>(read);
  const [loadedKey, setLoadedKey] = useState(storageKey);
  if (loadedKey !== storageKey) {
    setLoadedKey(storageKey);
    setDone(read());
  }

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...done]));
    } catch {
      // Storage full or blocked: ticks just won't survive a reload
    }
  }, [storageKey, done]);

  const toggle = (id: string) => setDone(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return { done, toggle };
}

/** A short, stable key for a result object, for useChecklist. */
export function resultKey(tool: string, value: unknown): string {
  const text = JSON.stringify(value) || '';
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return `${tool}_${(h >>> 0).toString(36)}`;
}

// The six Career tools, for the "keep going" card and their order in the menu
export const CAREER_TOOLS: { page: string; name: string; desc: string; icon: LucideIcon }[] = [
  { page: 'linkedin', name: 'Profile PDF Audit', desc: 'Score and fix your LinkedIn profile', icon: UserCheck },
  { page: 'linkedin-bio', name: 'Bio & Banner Generator', desc: 'Headline, About and banner', icon: PenLine },
  { page: 'linkedin-outreach', name: 'Outreach & DM Writer', desc: 'Messages recruiters reply to', icon: MessagesSquare },
  { page: 'career-courses', name: 'Skill Gaps & Courses', desc: 'Find what to learn next', icon: GraduationCap },
  { page: 'elevator-pitch', name: 'Elevator Pitch Builder', desc: 'Introduce yourself in 30 seconds', icon: Presentation },
  { page: 'career-roadmap', name: 'Career Roadmap', desc: 'Plan your next moves', icon: MapIcon },
];

export type Stage = 'intro' | 'working' | 'result';

/**
 * Runs a Career tool: intro → working → result. Hides the site header and footer while the
 * work runs and on the result, and makes the page full-bleed like the other guided tools.
 */
export function useCareerRun<T>(onFocusChange?: (mode: false | 'flow') => void, phaseCount = 3) {
  const [stage, setStage] = useState<Stage>('intro');
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);
  const lastTask = useRef<(() => Promise<T>) | null>(null);

  useEffect(() => {
    onFocusChange?.(stage === 'intro' ? false : 'flow');
  }, [stage, onFocusChange]);
  useEffect(() => () => onFocusChange?.(false), [onFocusChange]);

  useEffect(() => {
    const main = document.querySelector('.main-content') as HTMLElement | null;
    if (!main) return;
    main.style.maxWidth = 'none';
    main.style.padding = '0';
    main.style.margin = '0';
    return () => {
      main.style.maxWidth = '';
      main.style.padding = '';
      main.style.margin = '';
    };
  }, []);

  // The phases are paced to how long the AI usually takes; the last one waits for the answer
  useEffect(() => {
    if (stage !== 'working' || error) return;
    const timers = Array.from({ length: phaseCount - 1 }, (_, i) => setTimeout(() => setPhase(i + 1), [3000, 8000, 14000][i] ?? 14000 + i * 5000));
    return () => timers.forEach(clearTimeout);
  }, [stage, error, phaseCount]);

  const run = useCallback(async (task: () => Promise<T>) => {
    lastTask.current = task;
    setStage('working');
    setPhase(0);
    setError(null);
    window.scrollTo({ top: 0 });
    try {
      const data = await task();
      setResult(data);
      setStage('result');
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  const retry = () => { if (lastTask.current) run(lastTask.current); };

  /** Shows a result straight away, e.g. one reopened from My Documents. */
  const show = useCallback((data: T) => {
    setResult(data);
    setError(null);
    setStage('result');
  }, []);

  const toIntro = () => {
    setStage('intro');
    setError(null);
    window.scrollTo({ top: 0 });
  };

  const toResult = () => {
    setStage('result');
    window.scrollTo({ top: 0 });
  };

  return { stage, result, setResult, error, phase, run, retry, show, toIntro, toResult };
}

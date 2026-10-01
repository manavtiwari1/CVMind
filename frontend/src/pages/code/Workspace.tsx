import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, Copy, Maximize2, Minimize2, Play, RotateCcw, Send, Settings2 } from 'lucide-react';
import type { CodingProblem } from '../../data/codingProblems';
import { getErrorMessage } from '../../utils/errors';
import {
  LANGUAGES, requestDebug, requestHint, requestReview, runCode, submitCode,
  type AiDebug, type AiHint, type AiReview, type JudgeResult, type Language,
} from './codeApi';
import { loadDraft, recordSubmission, saveDraft, clearDraft, setLastProblem, useProgress } from './codeStore';
import DescriptionPane, { type LeftTab } from './workspace/DescriptionPane';
import ConsolePane, { type AiState, type ConsoleTab, type ResultState } from './workspace/ConsolePane';
import './code-workspace.css';

interface WorkspaceProps {
  problem: CodingProblem;
  problems: CodingProblem[];
  theme: 'light' | 'dark';
  customApiKey?: string;
  onOpen: (problem: CodingProblem) => void;
  /** Omit to hide the back button (used by timed practice, where the session controls navigation). */
  onBack?: () => void;
  backLabel?: string;
  /** Extra controls in the top bar, for example a countdown. */
  barExtra?: ReactNode;
}

interface EditorPrefs { fontSize: number; wrap: boolean; tabSize: number }
interface LayoutPrefs { left: number; console: number }

const PREFS_KEY = 'cvmind_code_editor';
const LAYOUT_KEY = 'cvmind_code_layout';
const LANG_KEY = 'cvmind_code_lang';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANG_KEY) as Language | null;
    if (saved && LANGUAGES.some((l) => l.id === saved)) return saved;
  } catch { /* ignore */ }
  return 'javascript';
}

/** Parameter names of the solution function, so inputs can be shown as "nums = [...]". */
function paramNamesOf(problem: CodingProblem): string[] {
  if (problem.params?.length) return problem.params;
  // design problems (a class driven by a list of calls) take the operations and their arguments
  if ((problem.starterCode.javascript || '').trimStart().startsWith('class ')) return ['operations', 'arguments'];
  const js = problem.starterCode.javascript || '';
  const m = js.match(/function\s+\w+\s*\(([^)]*)\)/) || js.match(/\(([^)]*)\)\s*=>/);
  if (m) return m[1].split(',').map((s) => s.trim()).filter(Boolean);
  const py = problem.starterCode.python || '';
  const p = py.match(/def\s+\w+\s*\(([^)]*)\)/);
  if (p) return p[1].split(',').map((s) => s.split(':')[0].trim()).filter((s) => s && s !== 'self');
  return [];
}

function formatClock(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const idleAi = <T,>(): AiState<T> => ({ loading: false, data: null, error: '' });

export default function Workspace({ problem, problems, theme, customApiKey = '', onOpen, onBack, backLabel = 'Problems', barExtra }: WorkspaceProps) {
  const progress = useProgress();
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [code, setCode] = useState<string>(() => loadDraft(problem.id, initialLanguage()) ?? problem.starterCode[initialLanguage()] ?? '');

  const [leftTab, setLeftTab] = useState<LeftTab>('description');
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('testcase');
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [selectedCase, setSelectedCase] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState('');

  const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  const [hints, setHints] = useState<Record<number, AiHint>>({});
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null);
  const [hintError, setHintError] = useState('');
  const [debug, setDebug] = useState<AiState<AiDebug>>(idleAi);
  const [review, setReview] = useState<AiState<AiReview>>(idleAi);

  const [prefs, setPrefs] = useState<EditorPrefs>(() => readJson<EditorPrefs>(PREFS_KEY, { fontSize: 14, wrap: true, tabSize: 2 }));
  const [layout, setLayout] = useState<LayoutPrefs>(() => readJson<LayoutPrefs>(LAYOUT_KEY, { left: 44, console: 34 }));
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobilePane, setMobilePane] = useState<'problem' | 'code'>('problem');

  const [clockOn, setClockOn] = useState(false);
  const [clockRunning, setClockRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const index = problems.findIndex((p) => p.id === problem.id);
  const number = index >= 0 ? index + 1 : 0;
  const prev = index > 0 ? problems[index - 1] : undefined;
  const next = index >= 0 && index < problems.length - 1 ? problems[index + 1] : undefined;
  const paramNames = useMemo(() => paramNamesOf(problem), [problem]);
  const solved = !!progress.solved[problem.id];
  const mySubmissions = useMemo(() => progress.submissions.filter((s) => s.problemId === problem.id), [progress.submissions, problem.id]);
  const currentLang = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[0];

  useEffect(() => { setLastProblem(problem.id); }, [problem.id]);

  // keep the draft: write 400ms after the last keystroke
  useEffect(() => {
    const t = window.setTimeout(() => saveDraft(problem.id, language, code), 400);
    return () => window.clearTimeout(t);
  }, [code, language, problem.id]);

  useEffect(() => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } }, [prefs]);
  useEffect(() => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* ignore */ } }, [layout]);

  useEffect(() => {
    if (!clockRunning) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [clockRunning]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const changeLanguage = (next: Language) => {
    if (next === language) return;
    saveDraft(problem.id, language, code);
    setLanguage(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
    setCode(loadDraft(problem.id, next) ?? problem.starterCode[next] ?? '');
    setResult(null);
  };

  const resetCode = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    clearDraft(problem.id, language);
    setCode(problem.starterCode[language] ?? '');
    setConfirmReset(false);
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) rootRef.current?.requestFullscreen().catch(() => undefined);
    else document.exitFullscreen().catch(() => undefined);
  };

  const showResult = () => { setConsoleTab('result'); setConsoleCollapsed(false); };

  // ── Run and submit ──────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (busy) return;
    let customParsed: unknown;
    if (selectedCase === -1 && customInput.trim()) {
      try { customParsed = JSON.parse(customInput); setCustomError(''); }
      catch { setCustomError('That is not valid JSON. Use an array such as [[1, 2, 3], 4].'); setConsoleTab('testcase'); setConsoleCollapsed(false); return; }
    }
    setBusy('run');
    showResult();
    try {
      const data = await runCode({ problemId: problem.id, code, language, customInput: customParsed });
      setResult({ kind: 'run', data });
    } catch (err) {
      setResult({ kind: 'run', data: { verdict: 'Could not run', error: getErrorMessage(err) } });
    } finally {
      setBusy(null);
    }
  }, [busy, selectedCase, customInput, problem.id, code, language]);

  const handleSubmit = useCallback(async () => {
    if (busy) return;
    setBusy('submit');
    showResult();
    try {
      const data: JudgeResult = await submitCode({ problemId: problem.id, code, language });
      setResult({ kind: 'submit', data });
      const verified = !data.simulated;
      recordSubmission({
        problemId: problem.id, problemTitle: problem.title, verdict: data.verdict, language,
        passedTests: data.passedTests, totalTests: data.totalTests, runtimeMs: data.runtimeMs, code, verified,
      });
      if (verified && data.verdict === 'Accepted') confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
    } catch (err) {
      setResult({ kind: 'submit', data: { verdict: 'Could not submit', error: getErrorMessage(err) } });
    } finally {
      setBusy(null);
    }
  }, [busy, problem.id, problem.title, code, language]);

  // Monaco lives outside React's event system, so shortcuts call the latest handlers through refs.
  const runRef = useRef(handleRun);
  const submitRef = useRef(handleSubmit);
  useEffect(() => { runRef.current = handleRun; submitRef.current = handleSubmit; }, [handleRun, handleSubmit]);

  const onMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote, () => { void runRef.current(); });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => { void submitRef.current(); });
  };

  // ── AI helpers ──────────────────────────────────────────────
  const handleHint = async (level: number) => {
    if (hints[level] || loadingLevel) return;
    setLoadingLevel(level);
    setHintError('');
    try {
      const h = await requestHint({ problemTitle: problem.title, problemDescription: problem.description, userCode: code, language, requestedLevel: level }, customApiKey);
      setHints((s) => ({ ...s, [level]: h }));
    } catch (err) {
      setHintError(`Could not get this hint: ${getErrorMessage(err)}`);
    } finally {
      setLoadingLevel(null);
    }
  };

  const handleDebug = async () => {
    setConsoleTab('debug');
    setConsoleCollapsed(false);
    setDebug({ loading: true, data: null, error: '' });
    try {
      const data = await requestDebug({ problemTitle: problem.title, userCode: code, language, failedTestInfo: result?.data ?? null }, customApiKey);
      setDebug({ loading: false, data, error: '' });
    } catch (err) {
      setDebug({ loading: false, data: null, error: `Could not analyze your code: ${getErrorMessage(err)}` });
    }
  };

  const handleReview = async () => {
    setConsoleTab('review');
    setConsoleCollapsed(false);
    setReview({ loading: true, data: null, error: '' });
    try {
      const data = await requestReview({ problemTitle: problem.title, problemDescription: problem.description, userCode: code, language }, customApiKey);
      setReview({ loading: false, data, error: '' });
    } catch (err) {
      setReview({ loading: false, data: null, error: `Could not review your code: ${getErrorMessage(err)}` });
    }
  };

  // ── Resizable panes ─────────────────────────────────────────
  const drag = (axis: 'x' | 'y') => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const box = (axis === 'x' ? bodyRef.current : rightRef.current)?.getBoundingClientRect();
    if (!box) return;
    const previousSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const move = (ev: PointerEvent) => {
      if (axis === 'x') setLayout((l) => ({ ...l, left: clamp(((ev.clientX - box.left) / box.width) * 100, 25, 70) }));
      else setLayout((l) => ({ ...l, console: clamp(((box.bottom - ev.clientY) / box.height) * 100, 14, 70) }));
    };
    const up = () => {
      document.body.style.userSelect = previousSelect;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const nudge = (axis: 'x' | 'y') => (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -2 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 2 : 0;
    if (!step) return;
    e.preventDefault();
    if (axis === 'x') setLayout((l) => ({ ...l, left: clamp(l.left + step, 25, 70) }));
    else setLayout((l) => ({ ...l, console: clamp(l.console - step, 14, 70) }));
  };

  const sampleCases = problem.sampleTestCases ?? [];

  return (
    <div className="cx-ws" ref={rootRef} data-mobile-pane={mobilePane}>
      <div className="cx-ws-bar">
        <div className="cx-ws-bar-left">
          {onBack && (
            <button type="button" className="cx-btn cx-btn--ghost cx-btn--sm" onClick={onBack}><ArrowLeft size={15} /> {backLabel}</button>
          )}
          <button type="button" className="cx-icon-btn" disabled={!prev} onClick={() => prev && onOpen(prev)} aria-label="Previous problem" title={prev ? `Previous: ${prev.title}` : undefined}><ChevronLeft size={18} /></button>
          <button type="button" className="cx-icon-btn" disabled={!next} onClick={() => next && onOpen(next)} aria-label="Next problem" title={next ? `Next: ${next.title}` : undefined}><ChevronRight size={18} /></button>
          <span className="cx-ws-title">{problem.title}</span>
        </div>

        <div className="cx-ws-bar-center">
          <button type="button" className="cx-btn" onClick={() => void handleRun()} disabled={!!busy} title="Run on the sample cases (Ctrl/Cmd + ')">
            <Play size={15} /> {busy === 'run' ? 'Running…' : 'Run'}
          </button>
          <button type="button" className="cx-btn cx-btn--primary" onClick={() => void handleSubmit()} disabled={!!busy} title="Submit for judging (Ctrl/Cmd + Enter)">
            <Send size={15} /> {busy === 'submit' ? 'Judging…' : 'Submit'}
          </button>
        </div>

        <div className="cx-ws-bar-right">
          {barExtra}
          {clockOn ? (
            <button type="button" className="cx-chip cx-clock" onClick={() => setClockRunning((r) => !r)} title="Click to start or pause">
              <Clock size={14} /> {formatClock(seconds)}
              <span
                role="button"
                tabIndex={0}
                className="cx-clock-close"
                onClick={(e) => { e.stopPropagation(); setClockOn(false); setClockRunning(false); setSeconds(0); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setClockOn(false); setClockRunning(false); setSeconds(0); } }}
                aria-label="Hide timer"
              >×</span>
            </button>
          ) : (
            <button type="button" className="cx-icon-btn" onClick={() => { setClockOn(true); setClockRunning(true); }} aria-label="Start a timer" title="Start a timer"><Clock size={17} /></button>
          )}
          <button type="button" className="cx-icon-btn" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>

        <div className="cx-mobile-switch" role="tablist" aria-label="Panel">
          <button type="button" role="tab" aria-selected={mobilePane === 'problem'} className={mobilePane === 'problem' ? 'is-active' : ''} onClick={() => setMobilePane('problem')}>Problem</button>
          <button type="button" role="tab" aria-selected={mobilePane === 'code'} className={mobilePane === 'code' ? 'is-active' : ''} onClick={() => setMobilePane('code')}>Code</button>
        </div>
      </div>

      <div className="cx-ws-body" ref={bodyRef} style={{ '--cx-left': `${layout.left}%` } as React.CSSProperties}>
        <DescriptionPane
          problem={problem}
          number={number}
          solved={solved}
          tab={leftTab}
          onTab={setLeftTab}
          submissions={mySubmissions}
          onRestore={(c, lang) => {
            if (LANGUAGES.some((l) => l.id === lang)) { setLanguage(lang as Language); }
            setCode(c);
            setMobilePane('code');
          }}
          hints={hints}
          loadingLevel={loadingLevel}
          hintError={hintError}
          onRequestHint={(level) => void handleHint(level)}
        />

        <div
          className="cx-splitter cx-splitter--v"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize problem and code panels"
          aria-valuenow={Math.round(layout.left)}
          aria-valuemin={25}
          aria-valuemax={70}
          tabIndex={0}
          onPointerDown={drag('x')}
          onKeyDown={nudge('x')}
          onDoubleClick={() => setLayout((l) => ({ ...l, left: 44 }))}
        />

        <div className="cx-right" ref={rightRef}>
          <div className="cx-pane cx-editor-pane">
            <div className="cx-editor-bar">
              <select className="cx-select cx-select--lang" value={language} onChange={(e) => changeLanguage(e.target.value as Language)} aria-label="Language">
                {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              {!currentLang.judged && <span className="cx-tag cx-tag--warn" title="This language is not executed on the server yet">Not judged</span>}
              <div className="cx-editor-actions">
                <button type="button" className="cx-icon-btn" onClick={() => void copyCode()} aria-label="Copy code" title="Copy code">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button type="button" className={`cx-icon-btn${confirmReset ? ' is-danger' : ''}`} onClick={resetCode} aria-label="Reset code" title={confirmReset ? 'Click again to reset your code' : 'Reset to starter code'}>
                  <RotateCcw size={16} />
                </button>
                <div className="cx-settings">
                  <button type="button" className="cx-icon-btn" onClick={() => setShowSettings((v) => !v)} aria-label="Editor settings" aria-expanded={showSettings}><Settings2 size={16} /></button>
                  {showSettings && (
                    <div className="cx-popover" role="dialog" aria-label="Editor settings">
                      <div className="cx-setting">
                        <span>Font size</span>
                        <div className="cx-stepper">
                          <button type="button" onClick={() => setPrefs((p) => ({ ...p, fontSize: clamp(p.fontSize - 1, 11, 22) }))} aria-label="Smaller">-</button>
                          <b>{prefs.fontSize}</b>
                          <button type="button" onClick={() => setPrefs((p) => ({ ...p, fontSize: clamp(p.fontSize + 1, 11, 22) }))} aria-label="Larger">+</button>
                        </div>
                      </div>
                      <div className="cx-setting">
                        <span>Tab size</span>
                        <div className="cx-stepper">
                          {[2, 4].map((n) => <button key={n} type="button" className={prefs.tabSize === n ? 'is-on' : ''} onClick={() => setPrefs((p) => ({ ...p, tabSize: n }))}>{n}</button>)}
                        </div>
                      </div>
                      <label className="cx-setting">
                        <span>Wrap long lines</span>
                        <input type="checkbox" checked={prefs.wrap} onChange={(e) => setPrefs((p) => ({ ...p, wrap: e.target.checked }))} />
                      </label>
                      <button type="button" className="cx-btn cx-btn--sm" onClick={() => { setLayout({ left: 44, console: 34 }); setShowSettings(false); }}>Reset panel sizes</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="cx-editor-host">
              <Editor
                height="100%"
                language={currentLang.monaco}
                value={code}
                onChange={(v) => setCode(v ?? '')}
                onMount={onMount}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                loading={<div className="cx-editor-loading">Loading editor…</div>}
                options={{
                  fontSize: prefs.fontSize,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: prefs.tabSize,
                  wordWrap: prefs.wrap ? 'on' : 'off',
                  padding: { top: 12, bottom: 12 },
                  lineNumbersMinChars: 3,
                  renderLineHighlight: 'line',
                  smoothScrolling: true,
                }}
              />
            </div>
          </div>

          <div
            className="cx-splitter cx-splitter--h"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize code and console"
            aria-valuenow={Math.round(layout.console)}
            aria-valuemin={14}
            aria-valuemax={70}
            tabIndex={0}
            onPointerDown={drag('y')}
            onKeyDown={nudge('y')}
            onDoubleClick={() => setLayout((l) => ({ ...l, console: 34 }))}
          />

          <div className="cx-console-slot" style={{ height: consoleCollapsed ? 'auto' : `${layout.console}%` }}>
            <ConsolePane
              tab={consoleTab}
              onTab={(t) => { setConsoleTab(t); setConsoleCollapsed(false); }}
              collapsed={consoleCollapsed}
              onToggle={() => setConsoleCollapsed((c) => !c)}
              paramNames={paramNames}
              cases={sampleCases}
              selected={selectedCase}
              onSelect={setSelectedCase}
              customInput={customInput}
              onCustomInput={(v) => { setCustomInput(v); setCustomError(''); }}
              customError={customError}
              busy={busy}
              result={result}
              debug={debug}
              review={review}
              onDebug={() => void handleDebug()}
              onReview={() => void handleReview()}
              onNextProblem={next ? () => onOpen(next) : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

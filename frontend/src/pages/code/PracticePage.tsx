import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock, Play, RotateCcw, Square } from 'lucide-react';
import { TOPICS, type CodingProblem } from '../../data/codingProblems';
import Workspace from './Workspace';
import { useProgress } from './codeStore';
import './code-pages.css';

interface PracticePageProps {
  problems: CodingProblem[];
  theme: 'light' | 'dark';
  customApiKey?: string;
}

interface Session {
  startedAt: number;
  durationSec: number;
  problemIds: string[];
  endedAt?: number;
}

type Difficulty = CodingProblem['difficulty'];

const KEY = 'cvmind_code_session';

const MIXES: { id: string; label: string; plan: (n: number) => Difficulty[] }[] = [
  { id: 'easy', label: 'Warm-up: all Easy', plan: (n) => Array<Difficulty>(n).fill('Easy') },
  { id: 'em', label: 'Easy and Medium', plan: (n) => ['Easy', 'Medium', 'Medium'].slice(0, n) as Difficulty[] },
  { id: 'mm', label: 'Medium', plan: (n) => Array<Difficulty>(n).fill('Medium') },
  { id: 'mh', label: 'Medium and Hard', plan: (n) => ['Medium', 'Medium', 'Hard'].slice(0, n) as Difficulty[] },
];

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

function clock(total: number) {
  const t = Math.max(0, total);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PracticePage({ problems, theme, customApiKey }: PracticePageProps) {
  const progress = useProgress();
  const [session, setSession] = useState<Session | null>(loadSession);
  const [now, setNow] = useState(() => Date.now());
  const [active, setActive] = useState(0);

  const [minutes, setMinutes] = useState(45);
  const [count, setCount] = useState(2);
  const [mix, setMix] = useState('em');
  const [topic, setTopic] = useState('All');
  const [error, setError] = useState('');

  const running = !!session && !session.endedAt;
  const remaining = session ? Math.round((session.startedAt + session.durationSec * 1000 - now) / 1000) : 0;

  // Tick every second while a session runs, and end it when the time is up.
  useEffect(() => {
    if (!session || session.endedAt) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= session.startedAt + session.durationSec * 1000) {
        const ended = { ...session, endedAt: t };
        setSession(ended);
        saveSession(ended);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [session]);

  const sessionProblems = useMemo(
    () => (session ? session.problemIds.map((id) => problems.find((p) => p.id === id)).filter((p): p is CodingProblem => !!p) : []),
    [session, problems],
  );

  const solvedInSession = (id: string) =>
    !!session && progress.submissions.some((s) => s.problemId === id && s.at >= session.startedAt && s.verdict === 'Accepted');

  const start = () => {
    setError('');
    const plan = MIXES.find((m) => m.id === mix)?.plan(count) ?? [];
    const chosen: CodingProblem[] = [];
    for (const diff of plan) {
      const pool = problems.filter((p) => p.difficulty === diff && (topic === 'All' || p.category === topic) && !chosen.includes(p) && !p.isAiGenerated);
      const fresh = pool.filter((p) => !progress.solved[p.id]);
      const from = fresh.length ? fresh : pool;
      if (!from.length) { setError(`There are no ${diff} problems for that topic. Pick a different topic or mix.`); return; }
      chosen.push(from[Math.floor(Math.random() * from.length)]);
    }
    const next: Session = { startedAt: Date.now(), durationSec: minutes * 60, problemIds: chosen.map((p) => p.id) };
    setSession(next);
    saveSession(next);
    setNow(Date.now());
    setActive(0);
  };

  const end = () => {
    if (!session) return;
    const ended = { ...session, endedAt: Date.now() };
    setSession(ended);
    saveSession(ended);
  };

  const reset = () => { setSession(null); saveSession(null); setActive(0); };

  // ── Running session ─────────────────────────────────────────
  if (session && running && sessionProblems.length) {
    const current = sessionProblems[Math.min(active, sessionProblems.length - 1)];
    const solvedCount = sessionProblems.filter((p) => solvedInSession(p.id)).length;
    return (
      <div className="cx-session">
        <div className="cx-session-bar">
          <div className="cx-session-tabs" role="tablist" aria-label="Session problems">
            {sessionProblems.map((p, i) => (
              <button key={p.id} type="button" role="tab" aria-selected={p.id === current.id} className={`cx-session-tab${p.id === current.id ? ' is-active' : ''}`} onClick={() => setActive(i)}>
                {solvedInSession(p.id) ? <CheckCircle2 size={14} /> : <Circle size={14} />} {i + 1}. {p.title}
              </button>
            ))}
          </div>
          <div className="cx-session-right">
            <span className="cx-muted-inline">{solvedCount}/{sessionProblems.length} solved</span>
            <span className={`cx-chip cx-session-clock${remaining <= 300 ? ' is-low' : ''}`}><Clock size={14} /> {clock(remaining)}</span>
            <button type="button" className="cx-btn cx-btn--sm" onClick={end}><Square size={13} /> End session</button>
          </div>
        </div>
        <Workspace
          key={current.id}
          problem={current}
          problems={sessionProblems}
          theme={theme}
          customApiKey={customApiKey}
          onOpen={(p) => setActive(Math.max(0, sessionProblems.findIndex((x) => x.id === p.id)))}
        />
      </div>
    );
  }

  // ── Summary ─────────────────────────────────────────────────
  if (session && session.endedAt) {
    const used = Math.min(session.durationSec, Math.round((session.endedAt - session.startedAt) / 1000));
    const solvedCount = sessionProblems.filter((p) => solvedInSession(p.id)).length;
    return (
      <div className="cx-page">
        <div className="cx-page-head"><div><h1>Session complete</h1><p>Time used: {clock(used)} of {clock(session.durationSec)}.</p></div></div>
        <section className="cx-card cx-panel">
          <h2>{solvedCount} of {sessionProblems.length} solved</h2>
          <ul className="cx-recent cx-summary-list">
            {sessionProblems.map((p) => {
              const ok = solvedInSession(p.id);
              const attempts = progress.submissions.filter((s) => s.problemId === p.id && s.at >= session.startedAt).length;
              return (
                <li key={p.id}>
                  <div className="cx-summary-row">
                    <span className={`cx-sub-verdict ${ok ? 'is-ok' : 'is-bad'}`}>{ok ? 'Solved' : 'Not solved'}</span>
                    <span className="cx-recent-title">{p.title}</span>
                    <span className={`cx-diff cx-diff--${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                    <span className="cx-sub-meta">{attempts} submission{attempts === 1 ? '' : 's'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <button type="button" className="cx-btn cx-btn--primary" onClick={reset}><RotateCcw size={15} /> New session</button>
        </section>
      </div>
    );
  }

  // ── Setup ───────────────────────────────────────────────────
  return (
    <div className="cx-page">
      <div className="cx-page-head">
        <div>
          <h1>Timed practice</h1>
          <p>Simulate an interview round: a fixed set of problems against a countdown. It is practice only, with no proctoring, and results stay on this device.</p>
        </div>
      </div>

      <section className="cx-card cx-panel cx-setup">
        <div className="cx-field">
          <label htmlFor="cx-minutes">Time limit</label>
          <select id="cx-minutes" className="cx-select" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {[20, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </div>
        <div className="cx-field">
          <label htmlFor="cx-count">Problems</label>
          <select id="cx-count" className="cx-select" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="cx-field">
          <label htmlFor="cx-mix">Difficulty</label>
          <select id="cx-mix" className="cx-select" value={mix} onChange={(e) => setMix(e.target.value)}>
            {MIXES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <div className="cx-field">
          <label htmlFor="cx-topic">Topic</label>
          <select id="cx-topic" className="cx-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
            {TOPICS.map((t) => <option key={t} value={t}>{t === 'All' ? 'Any topic' : t}</option>)}
          </select>
        </div>
        {error && <div className="cx-alert cx-alert--error cx-setup-error" role="alert">{error}</div>}
        <button type="button" className="cx-btn cx-btn--primary cx-setup-start" onClick={start}><Play size={15} /> Start session</button>
      </section>
    </div>
  );
}

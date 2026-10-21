import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, BookOpen, Loader2, PlayCircle, RotateCcw, Scissors, Sparkles, Pencil } from 'lucide-react';
import { LeoAvatar } from '../components/ResumeOnboarding';
import { leoApi, LeoApiError, PROBLEM_HANDOFF_KEY, type Beat, type Lesson, type LessonProgress, type LeoLanguage, type LeoLevel, type PlanRequest, type ProblemHandoff } from './learnLeoApi';
import LeoBoard, { type PlayerPrefs } from './LeoBoard';
import { ComingSoonScreen } from './ComingSoonModal';
import { useLeoAccess } from '../lib/leoAccess';
import './LearnLeo.css';

// Learn with Leo: pick a topic (or arrive from Skill Gap / a stuck CVMind Code problem), check
// Leo's plan, then learn on the board. ?lesson=<id> reopens a saved lesson for resume or replay.

// The launch catalogue (backend learnLeo/catalogue.js); these lessons are cached, so they start fastest
const CATALOGUE: { shelf: string; note: string; tone: 'yellow' | 'mint' | 'peach'; topics: string[] }[] = [
  {
    shelf: 'Data structures & algorithms',
    note: 'The coding round',
    tone: 'yellow',
    topics: ['Arrays and two pointers', 'Binary search', 'Recursion', 'Linked lists', 'Stacks and queues', 'Trees and BST', 'Graphs (BFS/DFS)', 'Hashing', 'Sorting']
  },
  { shelf: 'CS fundamentals', note: 'The theory questions', tone: 'mint', topics: ['DBMS normalisation', 'OOP pillars', 'OS processes vs threads'] },
  { shelf: 'Web & tools', note: 'For dev roles', tone: 'peach', topics: ['REST APIs', 'React hooks', 'Git basics'] }
];

const LEVELS: { id: LeoLevel; label: string }[] = [
  { id: 'beginner', label: 'New to it' },
  { id: 'intermediate', label: 'Know the basics' },
  { id: 'advanced', label: 'Go deep' }
];

const PREFS_KEY = 'cvmind_leo_prefs';
interface Prefs extends PlayerPrefs { language: LeoLanguage; level: LeoLevel }
const DEFAULT_PREFS: Prefs = { language: 'english', level: 'beginner', speed: 1, muted: false, captions: true };

// Hinglish lessons are switched off until the voice and prompts are ready; the backend agrees (learnLeo/service.js)
const HINGLISH_READY = false;

function readPrefs(): Prefs {
  let saved: Partial<Prefs> = {};
  try { saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { /* storage blocked */ }
  const prefs = { ...DEFAULT_PREFS, ...saved };
  return HINGLISH_READY ? prefs : { ...prefs, language: 'english' };
}

const params = () => new URLSearchParams(window.location.search);
const setQuery = (query: string) => {
  try {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  } catch { /* history unavailable */ }
};

type View =
  | { name: 'home' }
  | { name: 'planning'; label: string }
  | { name: 'plan'; lesson: Lesson; message: string }
  | { name: 'loading' }
  | { name: 'board'; lesson: Lesson; beats: Beat[]; reexplains: Beat[]; startAt: number; autoPlay: boolean; needsStream: boolean };

type Saved = Lesson & { progress: LessonProgress };

// How the page was opened: a saved lesson, a stuck CVMind Code problem, or a topic from Skill Gap
type Arrival =
  | { kind: 'lesson'; id: string }
  | { kind: 'problem'; body: PlanRequest; label: string }
  | { kind: 'topic'; topic: string; role: string; source: 'manual' | 'skill_gap'; level: LeoLevel | null }
  | null;

function readArrival(): Arrival {
  const q = params();
  const lessonId = q.get('lesson');
  if (lessonId) return { kind: 'lesson', id: lessonId };
  const problemId = q.get('problem');
  if (problemId) {
    let handoff: ProblemHandoff | null = null;
    try { handoff = JSON.parse(sessionStorage.getItem(PROBLEM_HANDOFF_KEY) || 'null'); } catch { /* none */ }
    if (handoff && handoff.problemId === problemId) {
      const p = readPrefs();
      return {
        kind: 'problem',
        label: handoff.title,
        body: { problemId, code: handoff.code, codeLanguage: handoff.codeLanguage, failingTest: handoff.failingTest, language: p.language, level: p.level }
      };
    }
  }
  const topic = q.get('topic');
  if (!topic) return null;
  const level = q.get('level') as LeoLevel | null;
  return {
    kind: 'topic',
    topic: topic.slice(0, 120),
    role: (q.get('role') || '').slice(0, 80),
    source: q.get('source') === 'skill_gap' ? 'skill_gap' : 'manual',
    level: level && LEVELS.some((l) => l.id === level) ? level : null
  };
}

interface Props { setCurrentPage: (page: string) => void }

function LessonApp({ setCurrentPage }: Props) {
  const [arrival] = useState(readArrival);
  const fromTopic = arrival?.kind === 'topic' ? arrival : null;
  const [prefs, setPrefsState] = useState<Prefs>(() => ({ ...readPrefs(), ...(fromTopic?.level ? { level: fromTopic.level } : {}) }));
  const [view, setView] = useState<View>(() => (arrival?.kind === 'lesson'
    ? { name: 'loading' }
    : arrival?.kind === 'problem' ? { name: 'planning', label: arrival.label } : { name: 'home' }));
  const [topic, setTopic] = useState(fromTopic?.topic || '');
  const [role] = useState(fromTopic?.role || '');
  const [source] = useState<'manual' | 'skill_gap'>(fromTopic?.source || 'manual');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState('');
  const [history, setHistory] = useState<Saved[] | null>(null);
  const topicRef = useRef<HTMLInputElement>(null);

  const setPrefs = useCallback((next: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const merged = { ...cur, ...next };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(merged)); } catch { /* storage blocked */ }
      return merged;
    });
  }, []);

  const loadHistory = useCallback(() => {
    leoApi.list().then((r) => setHistory(r.lessons)).catch(() => setHistory([]));
  }, []);

  const fail = (err: unknown) => setError(err instanceof LeoApiError || err instanceof Error ? err.message : 'Something went wrong. Please try again.');

  // The fetchers only set state in their promise callbacks, so the arrival effect can call them
  const fetchPlan = useCallback((body: PlanRequest) => leoApi.plan(body).then(
    ({ lesson, message }) => setView({ name: 'plan', lesson, message }),
    (err) => {
      fail(err);
      setView({ name: 'home' });
    }
  ), []);

  const requestPlan = useCallback((body: PlanRequest, label: string) => {
    setError('');
    setEditing(false);
    setEdits('');
    setView({ name: 'planning', label });
    void fetchPlan(body);
  }, [fetchPlan]);

  const fetchLesson = useCallback((id: string, autoPlay: boolean) => leoApi.get(id).then(
    (saved) => {
      setQuery(`lesson=${id}`);
      if (saved.lesson.status === 'planning') {
        setView({ name: 'plan', lesson: saved.lesson, message: '' });
        return;
      }
      const done = !!saved.progress.completedAt;
      const startAt = done ? 0 : Math.min(saved.progress.lastBeat, Math.max(0, saved.beats.length - 1));
      setView({
        name: 'board',
        lesson: saved.lesson,
        beats: saved.beats,
        reexplains: saved.reexplains,
        startAt,
        autoPlay,
        needsStream: saved.lesson.status === 'streaming'
      });
    },
    (err) => {
      fail(err);
      setQuery('');
      setView({ name: 'home' });
    }
  ), []);

  const openLesson = (id: string, autoPlay: boolean) => {
    setError('');
    setView({ name: 'loading' });
    void fetchLesson(id, autoPlay);
  };

  // Arrival (read once above): load the saved lesson or plan the stuck problem; a Skill Gap topic is just pre-filled
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current) return;
    arrived.current = true;
    if (arrival?.kind === 'lesson') void fetchLesson(arrival.id, false);
    else if (arrival?.kind === 'problem') void fetchPlan(arrival.body);
    else if (arrival?.kind === 'topic') window.setTimeout(() => topicRef.current?.focus(), 50);
  }, [arrival, fetchLesson, fetchPlan]);

  useEffect(() => {
    if (view.name === 'home' && history === null) loadHistory();
  }, [view.name, history, loadHistory]);

  const submitTopic = (t = topic) => {
    const clean = t.trim();
    if (clean.length < 2 || busy) return;
    void requestPlan({ topic: clean, language: prefs.language, level: prefs.level, role: role || undefined, source }, clean);
  };

  const revise = async (lesson: Lesson, body: { shorter?: boolean; edits?: string }) => {
    setBusy(true);
    setError('');
    try {
      const res = await leoApi.revisePlan(lesson.id, body);
      setEditing(false);
      setView({ name: 'plan', lesson: res.lesson, message: res.message });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const start = async (lesson: Lesson) => {
    setBusy(true);
    setError('');
    try {
      const { lesson: started } = await leoApi.start(lesson.id);
      setQuery(`lesson=${started.id}`);
      if (started.status === 'ready') {
        // a saved catalogue lesson: everything is already written
        const saved = await leoApi.get(started.id);
        setView({ name: 'board', lesson: saved.lesson, beats: saved.beats, reexplains: [], startAt: 0, autoPlay: true, needsStream: false });
      } else {
        setView({ name: 'board', lesson: started, beats: [], reexplains: [], startAt: 0, autoPlay: true, needsStream: true });
      }
      setHistory(null);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const backHome = () => {
    setQuery('');
    setError('');
    setView({ name: 'home' });
    setHistory(null);
  };

  const practice = (lesson: Lesson) => {
    leoApi.progress(lesson.id, { prepClicked: true }).catch(() => {});
    setCurrentPage(`prep?${new URLSearchParams({ topic: lesson.topic, from: 'leo' }).toString()}`);
  };

  const backToProblem = (lesson: Lesson) => {
    setCurrentPage(`code-arena?problem=${encodeURIComponent(lesson.problemId || '')}`);
  };

  // ── Views ─────────────────────────────────────────────────────────────────

  const topBar = (
    <header className="ll-top">
      <button
        type="button"
        className="ll-top-back"
        onClick={() => (view.name === 'home' ? setCurrentPage('home') : backHome())}
        aria-label={view.name === 'home' ? 'Back to CVMind' : 'Back to Learn with Leo'}
      >
        <ArrowLeft size={18} />
      </button>
      <LeoAvatar size={30} pose="guide" />
      <span className="ll-top-title">Learn with Leo</span>
      {view.name === 'board' && view.lesson.source === 'dsa_problem' && (
        <button type="button" className="ll-btn ll-btn-sm ll-top-right" onClick={() => backToProblem(view.lesson)}>Back to problem</button>
      )}
    </header>
  );

  let body: ReactNode;

  if (view.name === 'board') {
    body = (
      <LeoBoard
        key={view.lesson.id}
        lesson={view.lesson}
        beats={view.beats}
        reexplains={view.reexplains}
        startAt={view.startAt}
        autoPlay={view.autoPlay}
        needsStream={view.needsStream}
        prefs={prefs}
        onPrefs={(p) => setPrefs(p)}
        onPractice={practice}
        onBackToProblem={backToProblem}
        onNewLesson={backHome}
      />
    );
  } else if (view.name === 'planning' || view.name === 'loading') {
    body = (
      <div className="ll-center" role="status">
        <LeoAvatar size={88} pose="thinking" />
        <p className="ll-center-title">{view.name === 'planning' ? `Leo is planning your lesson on ${view.label}…` : 'Opening your lesson…'}</p>
        <Loader2 size={22} className="ll-spin" aria-hidden="true" />
      </div>
    );
  } else if (view.name === 'plan') {
    const { lesson, message } = view;
    const dsa = lesson.source === 'dsa_problem';
    body = (
      <div className="ll-page">
        <section className="ll-plan" aria-label="Lesson plan">
          <div className="ll-plan-leo">
            <LeoAvatar size={56} pose="checklist" />
            <div className="ll-bubble">
              <p>{message || (lesson.language === 'hinglish' ? `${lesson.topic} ka plan ready hai.` : `Here is the plan for ${lesson.topic}.`)}</p>
            </div>
          </div>
          <h2 className="ll-plan-title">{lesson.topic}</h2>
          <p className="ll-muted">
            {dsa ? 'A short lesson on where your code goes wrong. Hints first, no full solution unless you ask at the end.' : `${lesson.beatCount} short parts, about ${Math.max(4, Math.round(lesson.beatCount * 1.3))} minutes`}
            {lesson.cached ? ' · ready to play' : ''}
          </p>
          <ol className="ll-steps">
            {lesson.plan.map((s, i) => (
              <li key={i}>
                <span className="ll-step-no">{i + 1}</span>
                <div><strong>{s.title}</strong>{s.goal && <p>{s.goal}</p>}</div>
              </li>
            ))}
          </ol>

          <p className="ll-muted">Leo speaks {lesson.language === 'hinglish' ? 'Hinglish' : 'English'} in this lesson.</p>

          {editing && (
            <form className="ll-edit" onSubmit={(e) => { e.preventDefault(); if (edits.trim()) void revise(lesson, { edits }); }}>
              <label htmlFor="ll-edits">What should Leo change?</label>
              <textarea id="ll-edits" value={edits} onChange={(e) => setEdits(e.target.value)} maxLength={500} rows={3} placeholder="e.g. Skip the basics, more on time complexity" autoFocus />
              <div className="ll-row">
                <button type="submit" className="ll-btn ll-btn-primary" disabled={busy || !edits.trim()}>{busy ? <Loader2 size={16} className="ll-spin" /> : <Sparkles size={16} />} Update plan</button>
                <button type="button" className="ll-btn" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          )}

          {error && <p className="ll-error" role="alert">{error}</p>}

          {!editing && (
            <div className="ll-row">
              <button type="button" className="ll-btn ll-btn-primary ll-btn-lg" onClick={() => start(lesson)} disabled={busy}>
                {busy ? <Loader2 size={18} className="ll-spin" /> : <PlayCircle size={18} />} Start lesson
              </button>
              {!lesson.planEdited && (
                <>
                  <button type="button" className="ll-btn" onClick={() => revise(lesson, { shorter: true })} disabled={busy || lesson.plan.length <= 3}>
                    <Scissors size={16} /> Make it shorter
                  </button>
                  <button type="button" className="ll-btn" onClick={() => setEditing(true)} disabled={busy}>
                    <Pencil size={16} /> Change the plan
                  </button>
                </>
              )}
            </div>
          )}
          {lesson.planEdited && <p className="ll-muted">The plan can be changed once, so this is the final version.</p>}
        </section>
      </div>
    );
  } else {
    const inProgress = (history || []).filter((l) => !l.progress.completedAt && l.status !== 'failed');
    const finished = (history || []).filter((l) => l.progress.completedAt || l.status === 'failed');
    const latest = inProgress[0] || null;
    const percent = (l: Saved) => (l.progress.completedAt ? 100 : Math.round(((l.progress.lastBeat + 1) / Math.max(1, l.beatCount)) * 100));
    body = (
      <div className="ll-page ll-home">
        <div className="ll-home-main">
          <section className="ll-desk">
            <form className="ll-paper" onSubmit={(e) => { e.preventDefault(); submitTopic(); }}>
              <span className="ll-paper-date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <h1>What do you want to learn today?</h1>
              <label htmlFor="ll-topic" className="ll-sr">Topic</label>
              <div className="ll-paper-line">
                <input
                  id="ll-topic"
                  ref={topicRef}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Write a topic… binary search, React hooks, DBMS"
                  maxLength={120}
                  autoComplete="off"
                />
                <button type="submit" className="ll-btn ll-btn-primary" disabled={topic.trim().length < 2}>
                  <Sparkles size={17} /> Make my plan
                </button>
              </div>
              {source === 'skill_gap' && role && <p className="ll-from">From your Skill Gap results for {role}.</p>}

              <div className="ll-options">
                <div className="ll-option-group" role="radiogroup" aria-label="Level">
                  <span>I'm</span>
                  {LEVELS.map((l) => (
                    <button key={l.id} type="button" role="radio" aria-checked={prefs.level === l.id} className={`ll-chip${prefs.level === l.id ? ' is-on' : ''}`} onClick={() => setPrefs({ level: l.id })}>
                      {l.label}
                    </button>
                  ))}
                </div>
                <div className="ll-option-group" role="radiogroup" aria-label="Language">
                  <span>Leo speaks</span>
                  <button type="button" role="radio" aria-checked={prefs.language === 'english'} className={`ll-chip${prefs.language === 'english' ? ' is-on' : ''}`} onClick={() => setPrefs({ language: 'english' })}>
                    English
                  </button>
                  {HINGLISH_READY ? (
                    <button type="button" role="radio" aria-checked={prefs.language === 'hinglish'} className={`ll-chip${prefs.language === 'hinglish' ? ' is-on' : ''}`} onClick={() => setPrefs({ language: 'hinglish' })}>
                      Hinglish
                    </button>
                  ) : (
                    <button type="button" role="radio" aria-checked={false} className="ll-chip is-soon" disabled title="Hinglish lessons are coming soon">
                      Hinglish <span className="ll-soon">Soon</span>
                    </button>
                  )}
                </div>
              </div>
              {error && <p className="ll-error" role="alert">{error}</p>}
            </form>

            <div className="ll-desk-leo" aria-hidden="true">
              <p className="ll-desk-bubble">Tell me a topic. I'll plan it, explain it out loud and draw it on the board.</p>
              <LeoAvatar size={150} pose="idea" />
            </div>
          </section>

          {latest && (
            <button type="button" className="ll-continue" onClick={() => openLesson(latest.id, true)}>
              <span className="ll-continue-tag"><BookOpen size={15} /> Pick up where you left off</span>
              <strong>{latest.topic}</strong>
              <span className="ll-progress" aria-hidden="true"><span style={{ width: `${percent(latest)}%` }} /></span>
              <span className="ll-continue-meta">Part {Math.min(latest.progress.lastBeat + 1, latest.beatCount)} of {latest.beatCount}<span>Resume <PlayCircle size={16} /></span></span>
            </button>
          )}

          <section className="ll-shelves" aria-labelledby="ll-popular">
            <h2 id="ll-popular">Placement favourites</h2>
            {CATALOGUE.map((group) => (
              <div key={group.shelf} className="ll-shelf">
                <div className="ll-shelf-label">
                  <strong>{group.shelf}</strong>
                  <span>{group.note}</span>
                </div>
                <div className="ll-notes">
                  {group.topics.map((t, i) => (
                    <button key={t} type="button" className={`ll-note ll-note--${group.tone}`} style={{ '--tilt': `${(i % 3) - 1}deg` } as CSSProperties} onClick={() => { setTopic(t); submitTopic(t); }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        <aside className="ll-home-side" aria-labelledby="ll-mine">
          <div className="ll-side-head">
            <h2 id="ll-mine">My notebook</h2>
            {history && history.length > 0 && <span>{history.length} lesson{history.length === 1 ? '' : 's'}</span>}
          </div>
          {history === null && <p className="ll-muted"><Loader2 size={14} className="ll-spin" /> Loading…</p>}
          {history && history.length === 0 && (
            <div className="ll-side-empty">
              <LeoAvatar size={64} pose="checklist" />
              <p>Lessons you start are kept here. Replays are free and don't count toward your daily lessons.</p>
            </div>
          )}
          {history && history.length > 0 && (
            <ul className="ll-cards">
              {[...inProgress, ...finished].map((l) => (
                <li key={l.id}>
                  <button type="button" className={`ll-card${l.progress.completedAt ? ' is-done' : ''}`} onClick={() => openLesson(l.id, true)}>
                    <span className="ll-card-top">
                      <strong>{l.topic}</strong>
                      <span className="ll-card-action">{l.progress.completedAt ? <><RotateCcw size={14} /> Replay</> : <><PlayCircle size={14} /> Resume</>}</span>
                    </span>
                    <span className="ll-card-meta">
                      {l.source === 'dsa_problem' ? 'Problem help · ' : ''}
                      {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {l.status === 'failed' ? ' · unfinished' : l.progress.completedAt ? ' · done' : ` · part ${Math.min(l.progress.lastBeat + 1, l.beatCount)} of ${l.beatCount}`}
                    </span>
                    <span className="ll-progress" aria-hidden="true"><span style={{ width: `${percent(l)}%` }} /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    );
  }

  return (
    <div className="ll-root">
      {topBar}
      {body}
    </div>
  );
}

// Only accounts with access get the lessons; everyone else sees "coming soon"
export default function LeoLessonPage({ setCurrentPage }: Props) {
  const access = useLeoAccess();
  // Learn with Leo runs full width: lift the site's centred content column while the page is open
  useEffect(() => {
    const main = document.querySelector('.main-content') as HTMLElement | null;
    if (!main) return;
    main.style.maxWidth = 'none';
    main.style.padding = '0';
    main.style.margin = '0';
    main.style.width = '100%';
    return () => {
      main.style.maxWidth = '';
      main.style.padding = '';
      main.style.margin = '';
      main.style.width = '';
    };
  }, []);

  if (access === 'open') return <LessonApp setCurrentPage={setCurrentPage} />;
  return (
    <div className="ll-root">
      {access === 'checking'
        ? <div className="ll-center" role="status"><Loader2 size={24} className="ll-spin" aria-label="Loading" /></div>
        : <ComingSoonScreen setCurrentPage={setCurrentPage} />}
    </div>
  );
}

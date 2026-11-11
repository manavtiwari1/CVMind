import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock, FileText, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { urlForPage } from '../../lib/hosts';
import {
  APTITUDE_TESTS, checkAptitudeTest, getAptitudeHistory, getAptitudeTest, savedFromWork, startAptitudeTest, useAptitudeAccess,
  type AptitudeHistoryItem, type AptitudeResult, type AptitudeResultRow, type AptitudeTest, type AptitudeTopic,
} from '../../lib/aptitude';
import type { LoadedWork } from '../../types/api';
import { ComingSoonScreen } from '../../learnLeo/ComingSoonModal';
import './Aptitude.css';

// The Aptitude Tests app page (app.cvmind.in/aptitude-practice): pick a test, answer against the clock,
// then see the score and every answer worked out. Each checked test is saved to My Documents and
// reopens here. Accounts without access see the coming-soon screen.

// Where a result on screen came from: just taken (saved or not), or reopened from My Documents / history
type ResultSource = { kind: 'new'; saved: boolean } | { kind: 'saved'; takenAt: string | null; seconds: number | null };

const when = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};
const duration = (seconds: number | null) => (seconds === null ? '' : `${Math.floor(seconds / 60)} min ${seconds % 60} s`);

const letter = (i: number) => String.fromCharCode(65 + i);
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const topicFromUrl = (): AptitudeTopic => {
  const t = new URLSearchParams(window.location.search).get('topic');
  return APTITUDE_TESTS.some((x) => x.id === t) ? (t as AptitudeTopic) : 'mixed';
};

// Opens the Leo chat with the question, the options and both answers
function askLeo(row: AptitudeResultRow) {
  const options = row.options.map((o, i) => `${letter(i)}) ${o}`).join('  ');
  const mine = row.choice === null ? 'I skipped it' : `My answer: ${letter(row.choice)}`;
  const prompt = `Explain this aptitude question step by step, and show me a faster way to solve questions like it.\n\n${row.question}\nOptions: ${options}\n${mine}. Correct answer: ${letter(row.answer)}.`;
  window.location.assign(urlForPage('chat', `?q=${encodeURIComponent(prompt.slice(0, 4000))}`));
}

export default function AptitudePractice({ setCurrentPage, loadedWork = null }: { setCurrentPage: (page: string) => void; loadedWork?: LoadedWork | null }) {
  const access = useAptitudeAccess();
  // A test opened from My Documents shows its result straight away
  const [opened] = useState(() => savedFromWork(loadedWork));
  const [topic, setTopic] = useState<AptitudeTopic>(() => opened?.topic || topicFromUrl());
  const [test, setTest] = useState<AptitudeTest | null>(null);
  const [result, setResult] = useState<AptitudeResult | null>(() => opened?.result || null);
  const [source, setSource] = useState<ResultSource>(() => ({ kind: 'saved', takenAt: opened?.takenAt || null, seconds: opened?.seconds ?? null }));
  const [history, setHistory] = useState<AptitudeHistoryItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Recent tests under the picker; fetched again whenever the picker shows
  const picking = access === 'open' && !test && !result;
  useEffect(() => {
    if (!picking) return;
    let alive = true;
    getAptitudeHistory().then((tests) => { if (alive) setHistory(tests); }).catch(() => { if (alive) setHistory([]); });
    return () => { alive = false; };
  }, [picking]);

  const openSaved = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      const saved = await getAptitudeTest(id);
      setTopic(saved.topic);
      setResult(saved.result);
      setSource({ kind: 'saved', takenAt: saved.takenAt || null, seconds: saved.seconds });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const start = async (t: AptitudeTopic) => {
    setBusy(true);
    setError('');
    try {
      setTest(await startAptitudeTest(t));
      setResult(null);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const finish = useCallback(async (answers: { id: string; choice: number | null }[], seconds: number) => {
    if (!test) return;
    setBusy(true);
    setError('');
    try {
      const checked = await checkAptitudeTest(answers, test.topic, seconds);
      setResult(checked);
      setSource({ kind: 'new', saved: !!checked.work });
      setTest(null);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [test]);

  if (access === 'checking') return <div className="apt-center"><Loader2 className="apt-spin" size={26} /></div>;
  if (access === 'locked') return <ComingSoonScreen setCurrentPage={setCurrentPage} product="aptitude" />;

  if (test) return <TestRunner key={test.questions.map((q) => q.id).join()} test={test} busy={busy} error={error} onFinish={finish} />;
  if (result) return <ResultView result={result} topic={topic} source={source} busy={busy} onRetake={() => start(topic)} onPick={() => { setResult(null); setError(''); }} setCurrentPage={setCurrentPage} />;

  return (
    <div className="apt">
      <header className="apt-head">
        <p className="apl-eyebrow">Aptitude Tests <span className="apl-soon">Testing</span></p>
        <h1>Pick a test</h1>
        <p>About a minute a question. Your answers are checked when you submit.</p>
      </header>
      <div className="apt-pick" role="radiogroup" aria-label="Test">
        {APTITUDE_TESTS.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={topic === t.id} className={`apt-pick-card${topic === t.id ? ' is-on' : ''}`} onClick={() => setTopic(t.id)}>
            <strong>{t.label}</strong>
            <span>{t.desc}</span>
            <small><Clock size={13} /> {t.questions} questions · {t.questions} min</small>
          </button>
        ))}
      </div>
      {error && <p className="apt-error" role="alert">{error}</p>}
      <button type="button" className="apt-btn apt-btn--go" disabled={busy} onClick={() => start(topic)}>
        {busy ? <Loader2 className="apt-spin" size={17} /> : null} Start the test <ArrowRight size={17} />
      </button>

      {history && history.length > 0 && (
        <section className="apt-history" aria-labelledby="apt-history-title">
          <div className="apt-history-head">
            <h2 id="apt-history-title">Your recent tests</h2>
            <button type="button" className="apt-link" onClick={() => setCurrentPage('my-documents')}>All in My Documents</button>
          </div>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <button type="button" disabled={busy} onClick={() => openSaved(h.id)}>
                  <span className="apt-history-name"><strong>{h.label}</strong><small>{when(h.createdAt)}</small></span>
                  <span className="apt-history-score">{h.score}/{h.total}</span>
                  <ArrowRight size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TestRunner({ test, busy, error, onFinish }: {
  test: AptitudeTest;
  busy: boolean;
  error: string;
  onFinish: (answers: { id: string; choice: number | null }[], seconds: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [startedAt] = useState(() => Date.now());
  const [deadline] = useState(() => startedAt + test.minutes * 60 * 1000);
  const [now, setNow] = useState(() => Date.now());
  const sent = useRef(false);

  const q = test.questions[index];
  const left = deadline - now;
  const answered = Object.keys(answers).length;

  const submit = useCallback(() => {
    if (sent.current) return;
    sent.current = true;
    const seconds = Math.min(Math.round((Date.now() - startedAt) / 1000), test.minutes * 60);
    onFinish(test.questions.map((x) => ({ id: x.id, choice: answers[x.id] ?? null })), seconds);
  }, [answers, onFinish, startedAt, test.minutes, test.questions]);

  // A failed submit can be sent again
  useEffect(() => { if (error) sent.current = false; }, [error]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Time up: hand in what's answered, once (if that fails, the Submit button tries again)
  const timeUp = useRef(false);
  useEffect(() => {
    if (left > 0 || timeUp.current) return;
    timeUp.current = true;
    submit();
  }, [left, submit]);

  // Leaving mid-test loses the answers, so ask first
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (!sent.current) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const pick = (choice: number) => setAnswers((a) => ({ ...a, [q.id]: choice }));
  const last = index === test.questions.length - 1;

  return (
    <div className="apt apt-run">
      <div className="apt-bar">
        <span className="apt-bar-title">{test.label}</span>
        <span className={`apt-timer${left < 60000 ? ' is-low' : ''}`} aria-live={left < 60000 ? 'polite' : 'off'}><Clock size={15} /> {clock(left)}</span>
      </div>

      <div className="apt-run-grid">
        <section className="apt-question" aria-labelledby="apt-q">
          <div className="apt-q-top">
            <span>Question {index + 1} of {test.questions.length}</span>
            <span className="apl-chip">{q.subtopic}</span>
          </div>
          <p id="apt-q" className="apt-q-text">{q.question}</p>
          <div className="apt-options" role="radiogroup" aria-labelledby="apt-q">
            {q.options.map((o, i) => (
              <button key={o} type="button" role="radio" aria-checked={answers[q.id] === i} className={`apt-option${answers[q.id] === i ? ' is-on' : ''}`} onClick={() => pick(i)}>
                <span className="apl-letter">{letter(i)}</span> {o}
              </button>
            ))}
          </div>
          <div className="apt-nav">
            <button type="button" className="apt-btn" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={16} /> Back</button>
            {last ? (
              <button type="button" className="apt-btn apt-btn--go" disabled={busy} onClick={submit}>
                {busy && <Loader2 className="apt-spin" size={16} />} Submit test
              </button>
            ) : (
              <button type="button" className="apt-btn apt-btn--go" onClick={() => setIndex(index + 1)}>{answers[q.id] === undefined ? 'Skip' : 'Next'} <ArrowRight size={16} /></button>
            )}
          </div>
          {error && <p className="apt-error" role="alert">{error}</p>}
        </section>

        <aside className="apt-grid-box" aria-label="All questions">
          <p>{answered} of {test.questions.length} answered</p>
          <div className="apt-dots">
            {test.questions.map((x, i) => (
              <button key={x.id} type="button" aria-label={`Question ${i + 1}${answers[x.id] !== undefined ? ', answered' : ''}`} aria-current={i === index ? 'step' : undefined} className={`apt-dot${answers[x.id] !== undefined ? ' is-done' : ''}${i === index ? ' is-here' : ''}`} onClick={() => setIndex(i)}>
                {i + 1}
              </button>
            ))}
          </div>
          {!last && <button type="button" className="apt-btn apt-btn--line" disabled={busy} onClick={submit}>Submit now</button>}
        </aside>
      </div>
    </div>
  );
}

function ResultView({ result, topic, source, busy, onRetake, onPick, setCurrentPage }: {
  result: AptitudeResult;
  topic: AptitudeTopic;
  source: ResultSource;
  busy: boolean;
  onRetake: () => void;
  onPick: () => void;
  setCurrentPage: (page: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'wrong'>(result.score < result.total ? 'wrong' : 'all');
  const rows = useMemo(() => (filter === 'all' ? result.results : result.results.filter((r) => !r.correct)), [filter, result.results]);
  const pct = Math.round((result.score / result.total) * 100);
  const label = APTITUDE_TESTS.find((t) => t.id === topic)?.label || 'Aptitude test';

  return (
    <div className="apt">
      <section className="apt-score">
        <div className="apt-score-num" style={{ '--apt-pct': `${pct}%` } as CSSProperties}>
          <strong>{result.score}<small>/{result.total}</small></strong>
        </div>
        <div className="apt-score-copy">
          <p className="apl-eyebrow">{label}</p>
          <h1>{pct >= 80 ? 'Great score.' : pct >= 50 ? 'Good start.' : 'Keep practising.'}</h1>
          <p>{result.score} right · {result.wrong} wrong · {result.skipped} skipped</p>
          {source.kind === 'new' ? (
            source.saved
              ? <p className="apt-saved"><FileText size={14} /> Saved to <button type="button" className="apt-link" onClick={() => setCurrentPage('my-documents')}>My Documents</button></p>
              : <p className="apt-saved apt-saved--off">This result couldn't be saved to My Documents.</p>
          ) : (
            (source.takenAt || source.seconds !== null) && (
              <p className="apt-saved"><FileText size={14} /> Taken {when(source.takenAt)}{source.seconds !== null ? ` · ${duration(source.seconds)}` : ''}</p>
            )
          )}
          <div className="apt-sections">
            {Object.entries(result.sections).map(([key, s]) => (
              <div key={key} className="apt-section">
                <span>{s.label}</span>
                <span className="apt-meter" aria-hidden="true"><i style={{ width: `${(s.correct / s.total) * 100}%` }} /></span>
                <b>{s.correct}/{s.total}</b>
              </div>
            ))}
          </div>
          <div className="apt-score-actions">
            <button type="button" className="apt-btn apt-btn--go" disabled={busy} onClick={onRetake}><RotateCcw size={16} /> New {label.toLowerCase()}</button>
            <button type="button" className="apt-btn" onClick={onPick}>Pick another test</button>
          </div>
        </div>
      </section>

      <section className="apt-review" aria-labelledby="apt-review-title">
        <div className="apt-review-head">
          <h2 id="apt-review-title">Answers</h2>
          <div className="apt-tabs" role="group" aria-label="Show">
            <button type="button" aria-pressed={filter === 'wrong'} className={filter === 'wrong' ? 'is-on' : ''} onClick={() => setFilter('wrong')}>To review ({result.total - result.score})</button>
            <button type="button" aria-pressed={filter === 'all'} className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>All ({result.total})</button>
          </div>
        </div>
        {rows.length === 0 && <p className="apt-empty">Every answer is right. Nothing to review.</p>}
        <ol className="apt-review-list">
          {rows.map((r) => (
            <li key={r.id} className={`apt-review-item${r.correct ? ' is-right' : r.choice === null ? ' is-skip' : ' is-wrong'}`}>
              <div className="apt-q-top">
                <span>{r.correct ? <><Check size={15} /> Right</> : r.choice === null ? 'Skipped' : <><X size={15} /> Wrong</>}</span>
                <span className="apl-chip">{r.subtopic}</span>
              </div>
              <p className="apt-q-text">{r.question}</p>
              <ul className="apl-sample-options">
                {r.options.map((o, i) => (
                  <li key={o} className={i === r.answer ? 'is-right' : i === r.choice ? 'is-wrong' : ''}>
                    <span className="apl-letter">{letter(i)}</span> {o}
                    {i === r.answer && <Check size={16} aria-label="Correct answer" />}
                    {i === r.choice && i !== r.answer && <X size={16} aria-label="Your answer" />}
                  </li>
                ))}
              </ul>
              <p className="apl-sample-why"><strong>How to solve it</strong>{r.explanation}</p>
              {!r.correct && (
                <button type="button" className="apt-btn apt-btn--leo" onClick={() => askLeo(r)}><Sparkles size={15} /> Ask Leo to explain</button>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

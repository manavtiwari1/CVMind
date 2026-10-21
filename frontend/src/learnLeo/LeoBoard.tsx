import { useCallback, useEffect, useRef, useState } from 'react';
import { Flag, Loader2, PenLine } from 'lucide-react';
import { LeoAvatar } from '../components/ResumeOnboarding';
import { leoApi, streamLesson, type Beat, type Lesson } from './learnLeoApi';
import { Narrator, speechSupported, splitWords } from './narrator';
import BoardElement, { type CheckpointResult } from './elements/BoardElement';
import LeoPlayer from './LeoPlayer';
import EndCard from './EndCard';

// Leo's board: plays each beat's narration and reveals its elements when the voice reaches their cue
// word. Beats arrive from the stream while earlier ones play; a checkpoint pauses the lesson until
// it is answered, and a wrong answer plays a short re-explain beat first.

export interface PlayerPrefs { speed: number; muted: boolean; captions: boolean }

interface Props {
  lesson: Lesson;
  beats: Beat[];
  reexplains: Beat[];
  startAt: number;
  autoPlay: boolean;
  needsStream: boolean;
  prefs: PlayerPrefs;
  onPrefs: (prefs: PlayerPrefs) => void;
  onPractice: (lesson: Lesson) => void;
  onBackToProblem: (lesson: Lesson) => void;
  onNewLesson: () => void;
}

type Phase = 'idle' | 'playing' | 'paused' | 'waiting' | 'checkpoint' | 'done';
// what the voice is saying right now: a beat (main/re-explain/approach) or a one-line reply
type Segment = { key: string; text: string } | null;

const FULL = Number.MAX_SAFE_INTEGER;
const keyOf = (b: Beat) => (b.kind === 'main' ? `m${b.order}` : b.kind === 'reexplain' ? `r${b.order}` : 'a');
const hasCheckpoint = (b: Beat) => b.elements.some((e) => e.type === 'checkpoint');

function ReportButton({ lessonId, order }: { lessonId: string; order: number }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  if (state === 'sent') return <span className="ll-report"><span className="ll-report-done">Thanks, we'll check it.</span></span>;
  return (
    <span className="ll-report">
      <button type="button" className="ll-link" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Flag size={13} aria-hidden="true" /> Report a mistake
      </button>
      {open && (
        <form
          className="ll-report-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setState('sending');
            try {
              await leoApi.report(lessonId, order, note);
              setState('sent');
            } catch {
              setState('idle');
            }
          }}
        >
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's wrong? (optional)" maxLength={500} aria-label="What is wrong in this part" />
          <button type="submit" className="ll-btn ll-btn-sm" disabled={state === 'sending'}>Send</button>
        </form>
      )}
    </span>
  );
}

export default function LeoBoard(props: Props) {
  const { prefs, onPrefs } = props;
  const [lesson, setLesson] = useState(props.lesson);
  const [beats, setBeats] = useState<Beat[]>(props.beats);
  const [reexplains, setReexplains] = useState<Beat[]>(() => props.reexplains.filter((r) => r.order < props.startAt));
  // a saved full approach is fetched again (from the server's copy, no AI call) when asked for
  const [approach, setApproach] = useState<Beat | null>(null);
  const [cursor, setCursor] = useState(props.startAt);
  const [phase, setPhase] = useState<Phase>('idle');
  const [segment, setSegment] = useState<Segment>(null);
  const [reached, setReached] = useState<Record<string, number>>(() => {
    const done: Record<string, number> = {};
    props.beats.filter((b) => b.order < props.startAt).forEach((b) => { done[keyOf(b)] = FULL; });
    return done;
  });
  // answers from an earlier visit stay shown for the beats before where the lesson resumes
  const [results, setResults] = useState<Record<number, CheckpointResult>>(() => {
    const out: Record<number, CheckpointResult> = {};
    props.beats.forEach((b) => {
      if (b.answered && b.order < props.startAt) out[b.order] = { chosen: b.answered.chosen, correct: b.answered.correct, answer: b.answered.answer ?? -1, explanation: b.answered.explanation || '' };
    });
    return out;
  });
  const [streamError, setStreamError] = useState('');
  const [streamDone, setStreamDone] = useState(!props.needsStream);
  const [replyLine, setReplyLine] = useState('');

  const [narrator] = useState(() => {
    const n = new Narrator();
    n.rate = prefs.speed;
    n.muted = prefs.muted || !speechSupported;
    return n;
  });
  // Narrator and stream callbacks run outside React's render, so they read the latest values from refs.
  // Each ref is written together with its state.
  const beatsRef = useRef(props.beats);
  const phaseRef = useRef<Phase>('idle');
  const cursorRef = useRef(props.startAt);
  const resultsRef = useRef(results);
  const playBeatRef = useRef<(index: number) => void>(() => {});
  const waitingFor = useRef<number | null>(null);
  const savedBeat = useRef(-1);
  const completedSaved = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const lessonId = lesson.id;
  const total = lesson.beatCount;

  const goPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const goCursor = useCallback((next: number) => {
    cursorRef.current = next;
    setCursor(next);
  }, []);

  useEffect(() => () => narrator.stop(), [narrator]);

  // ── Playback ────────────────────────────────────────────────────────────────

  const finish = useCallback(() => {
    setSegment(null);
    goPhase('done');
    if (!completedSaved.current) {
      completedSaved.current = true;
      leoApi.progress(lessonId, { lastBeat: total - 1, completed: true }).catch(() => {});
    }
  }, [goPhase, lessonId, total]);

  const speak = useCallback((beatOrLine: Beat | string, then: () => void) => {
    const isLine = typeof beatOrLine === 'string';
    const key = isLine ? 'line' : keyOf(beatOrLine);
    const text = isLine ? beatOrLine : beatOrLine.narration;
    setSegment({ key, text });
    setReplyLine(isLine ? beatOrLine : '');
    setReached((r) => ({ ...r, [key]: -1 }));
    goPhase('playing');
    narrator.play(text, {
      onWord: (w) => setReached((r) => ({ ...r, [key]: w })),
      onEnd: () => {
        setReached((r) => ({ ...r, [key]: FULL }));
        then();
      }
    });
  }, [goPhase, narrator]);

  const playBeat = useCallback((index: number) => {
    narrator.stop();
    goCursor(index);
    if (index >= total) {
      finish();
      return;
    }
    const beat = beatsRef.current.find((b) => b.order === index);
    if (!beat) {
      // Leo is still writing it: the stream starts it when it arrives
      waitingFor.current = index;
      setSegment(null);
      goPhase('waiting');
      return;
    }
    waitingFor.current = null;
    if (index > savedBeat.current) {
      savedBeat.current = index;
      leoApi.progress(lessonId, { lastBeat: index }).catch(() => {});
    }
    speak(beat, () => {
      if (hasCheckpoint(beat) && !resultsRef.current[index]) {
        setSegment(null);
        goPhase('checkpoint');
      } else {
        playBeatRef.current(index + 1);
      }
    });
  }, [finish, goCursor, goPhase, lessonId, narrator, speak, total]);
  useEffect(() => {
    playBeatRef.current = playBeat;
  }, [playBeat]);

  // ── Stream ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!props.needsStream) return;
    const from = props.beats.length;
    return streamLesson(lessonId, from, {
      onMeta: (l) => setLesson((cur) => ({ ...cur, ...l })),
      onBeat: (beat) => {
        if (beatsRef.current.some((b) => b.order === beat.order)) return;
        const next = [...beatsRef.current, beat].sort((a, b) => a.order - b.order);
        beatsRef.current = next;
        setBeats(next);
        if (phaseRef.current === 'waiting' && waitingFor.current === beat.order) playBeat(beat.order);
      },
      onDone: (l) => {
        setLesson((cur) => ({ ...cur, ...l }));
        setStreamDone(true);
      },
      onError: (message) => {
        setStreamError(message);
        setStreamDone(true);
      }
    });
    // the stream runs once per lesson
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    if (!props.autoPlay) return;
    // after the first paint, so the board is on screen when Leo starts talking
    const t = window.setTimeout(() => playBeatRef.current(props.startAt), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Checkpoints and the full approach ───────────────────────────────────────

  const answer = useCallback(async (order: number, chosen: number) => {
    const res = await leoApi.checkpoint(lessonId, order, chosen);
    const nextResults = { ...resultsRef.current, [order]: { chosen, correct: res.correct, answer: res.answer, explanation: res.explanation } };
    resultsRef.current = nextResults;
    setResults(nextResults);
    // answering an older checkpoint while another beat plays doesn't move the lesson
    if (phaseRef.current !== 'checkpoint' || cursorRef.current !== order) return;
    const carryOn = () => playBeat(order + 1);
    if (res.correct) {
      speak(res.reply, carryOn);
    } else if (res.reexplain) {
      const again = res.reexplain;
      setReexplains((list) => (list.some((b) => b.order === again.order) ? list : [...list, again]));
      speak(again, carryOn);
    } else {
      speak(`${res.reply} ${res.explanation}`, carryOn);
    }
  }, [lessonId, playBeat, speak]);

  const showApproach = useCallback(async () => {
    const { beat } = await leoApi.fullApproach(lessonId);
    setApproach(beat);
    speak(beat, () => { setSegment(null); goPhase('done'); });
  }, [goPhase, lessonId, speak]);

  // ── Controls ────────────────────────────────────────────────────────────────

  const toggle = useCallback(() => {
    const n = narrator;
    if (phaseRef.current === 'playing') {
      n.pause();
      goPhase('paused');
    } else if (phaseRef.current === 'paused') {
      n.resume();
      goPhase('playing');
    } else if (phaseRef.current === 'idle') {
      playBeat(cursorRef.current);
    } else if (phaseRef.current === 'done') {
      setReached({});
      playBeat(0);
    }
  }, [goPhase, narrator, playBeat]);

  const jump = useCallback((to: number) => {
    const target = Math.max(0, Math.min(to, total - 1));
    setReached((r) => {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(r)) {
        const order = Number(k.slice(1));
        if (k.startsWith('m') && order < target) next[k] = FULL;
        else if (k.startsWith('r') && order < target) next[k] = v;
      }
      for (let i = 0; i < target; i += 1) next[`m${i}`] = FULL;
      return next;
    });
    playBeat(target);
  }, [playBeat, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, button, [contenteditable="true"]')) return;
      if (e.key === ' ') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight') jump(cursorRef.current + 1);
      else if (e.key === 'ArrowLeft') jump(cursorRef.current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, jump]);

  // Follow the newest writing unless the student scrolled up to reread
  useEffect(() => {
    const el = boardRef.current;
    if (el && stickToBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [reached, phase, reexplains.length, approach]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const visibleBeat = (b: Beat) => b.order < cursor || (b.order === cursor && phase !== 'waiting');
  const shown = (b: Beat, i: number) => {
    const el = b.elements[i];
    const r = reached[keyOf(b)] ?? (b.order < cursor ? FULL : -1);
    if (el.type === 'checkpoint') return r >= FULL;
    return (el.wordIndex ?? 0) <= r;
  };

  const renderBeat = (b: Beat) => {
    const key = keyOf(b);
    const current = segment?.key === key;
    return (
      <section key={key} className={`ll-beat ll-beat-${b.kind}${current ? ' is-current' : ''}`} aria-label={b.title || `Part ${b.order + 1}`}>
        <div className="ll-beat-head">
          <span className="ll-beat-no">{b.kind === 'main' ? `${b.order + 1}` : b.kind === 'reexplain' ? 'Once more' : 'Approach'}</span>
        </div>
        {b.kind === 'main' && <ReportButton lessonId={lessonId} order={b.order} />}
        {b.elements.map((el, i) => (shown(b, i) ? (
          <BoardElement
            key={i}
            id={`${key}-${i}`}
            el={el}
            animate={current}
            checkpoint={el.type === 'checkpoint' ? { result: results[b.order] || null, onAnswer: (chosen) => answer(b.order, chosen) } : undefined}
          />
        ) : null))}
      </section>
    );
  };

  const words = segment ? splitWords(segment.text) : [];
  const spokenTo = segment ? reached[segment.key] ?? -1 : -1;
  // Captions show the sentence being spoken, like subtitles
  const sentence = (() => {
    const at = Math.max(0, Math.min(spokenTo, words.length - 1));
    let start = at;
    while (start > 0 && !/[.?!]["')\]]*$/.test(words[start - 1])) start -= 1;
    let end = at;
    while (end < words.length - 1 && !/[.?!]["')\]]*$/.test(words[end])) end += 1;
    return { start, end };
  })();
  const checkpointsDone = lesson.checkpointBeats.every((o) => results[o]);
  const writing = phase === 'waiting' && !streamError;

  return (
    <div className="ll-lesson">
      <div className="ll-board-wrap">
        <div
          className="ll-board"
          ref={boardRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
        >
          <header className="ll-board-title">
            <h2>{lesson.topic}</h2>
            <p>{lesson.language === 'hinglish' ? 'Hinglish' : 'English'} · {lesson.level}{lesson.cached ? ' · saved lesson' : ''}</p>
          </header>

          {beats.filter(visibleBeat).map((b) => (
            <div key={`g${b.order}`}>
              {renderBeat(b)}
              {reexplains.filter((r) => r.order === b.order).map(renderBeat)}
            </div>
          ))}

          {phase === 'idle' && (
            <div className="ll-start">
              <button type="button" className="ll-btn ll-btn-primary ll-btn-lg" onClick={toggle}>
                {cursor > 0 ? `Resume from part ${cursor + 1}` : 'Play lesson'}
              </button>
            </div>
          )}

          {writing && (
            <div className="ll-writing" role="status">
              <LeoAvatar size={34} pose="typing" />
              <span>Leo is writing the next part<span className="ll-dots" aria-hidden="true" /></span>
            </div>
          )}

          {streamError && (
            <div className="ll-stream-error" role="alert">
              <p>{streamError}</p>
              {beats.length > 0 && <p className="ll-muted">Everything up to here is saved in My lessons.</p>}
            </div>
          )}

          {approach && renderBeat(approach)}

          {phase === 'done' && (
            <EndCard
              lesson={lesson}
              checkpointsDone={checkpointsDone}
              approachShown={!!approach}
              onPractice={() => props.onPractice(lesson)}
              onFullApproach={showApproach}
              onBackToProblem={() => props.onBackToProblem(lesson)}
              onNewLesson={props.onNewLesson}
            />
          )}
        </div>
      </div>

      {prefs.captions && (
        <div className="ll-captions" aria-live="off">
          {segment ? (
            <p>
              {words.slice(sentence.start, sentence.end + 1).map((w, i) => (
                <span key={sentence.start + i} className={sentence.start + i <= spokenTo ? 'is-said' : ''}>{w} </span>
              ))}
            </p>
          ) : phase === 'checkpoint' ? (
            <p className="ll-muted"><PenLine size={14} aria-hidden="true" /> Answer the checkpoint to continue.</p>
          ) : replyLine ? <p>{replyLine}</p> : <p className="ll-muted">{writing ? 'Leo is writing…' : ' '}</p>}
          {!streamDone && phase !== 'waiting' && beats.length < total && <Loader2 size={14} className="ll-spin ll-captions-busy" aria-label="Writing ahead" />}
        </div>
      )}

      <LeoPlayer
        playing={phase === 'playing'}
        canPlay={phase !== 'waiting' && phase !== 'checkpoint'}
        beatIndex={cursor}
        beatCount={total}
        speed={prefs.speed}
        muted={prefs.muted || !speechSupported}
        captions={prefs.captions}
        voiceAvailable={speechSupported}
        onToggle={toggle}
        onReplayBeat={() => jump(cursor)}
        onPrev={() => jump(cursor - 1)}
        onNext={() => jump(cursor + 1)}
        onSpeed={(speed) => { narrator.setRate(speed); onPrefs({ ...prefs, speed }); }}
        onMute={(muted) => { narrator.setMuted(muted); onPrefs({ ...prefs, muted }); }}
        onCaptions={(captions) => onPrefs({ ...prefs, captions })}
      />
    </div>
  );
}

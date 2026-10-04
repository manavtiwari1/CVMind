import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Lightbulb, Loader2, Mic, Pause, RefreshCw, SkipForward, Square, Volume2, X,
} from 'lucide-react';
import { Leo } from '../ResumeOnboarding';
import { authFetch } from '../../lib/authFetch';
import { API_BASE } from '../../lib/apiBase';
import { getErrorMessage } from '../../utils/errors';
import { useLeoVoice } from './useLeoVoice';
import { useSpeechRecognition } from './useSpeechRecognition';
import { paceLabel, voiceMetrics } from './voiceMetrics';
import { scoreTone } from './score';
import type { AnswerFeedback, InterviewMode, InterviewQuestion, InterviewSettings, InterviewTurn } from './types';

const SUB_LABELS: Record<string, string> = { content: 'Content', structure: 'Structure', relevance: 'Relevance', clarity: 'Clarity', confidence: 'Confidence' };

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Score, sub-scores and coaching for one answer. Used in the session and in the report. */
export function FeedbackCard({ feedback, turn, mode }: { feedback: AnswerFeedback; turn: InterviewTurn; mode: InterviewMode }) {
  const score = Math.max(0, Math.min(10, Number(feedback.score) || 0));
  const subs = Object.entries(feedback.scores || {}).filter(([, v]) => typeof v === 'number');
  const pace = turn.metrics ? paceLabel(turn.metrics.wpm) : null;
  return (
    <div className={`ivw-feedback ivw-tone--${scoreTone(score)}`}>
      <div className="ivw-fb-head">
        <div className="ivw-fb-score"><b>{Number.isInteger(score) ? score : score.toFixed(1)}</b><small>/10</small></div>
        <div>
          <strong>{feedback.verdict || (score >= 7.5 ? 'Good' : score >= 5 ? 'Average' : 'Needs work')}</strong>
          {subs.length > 0 && (
            <div className="ivw-subs">
              {subs.map(([k, v]) => (
                <div key={k} className="ivw-sub">
                  <span>{SUB_LABELS[k] || k}</span>
                  <i><em style={{ width: `${Math.max(0, Math.min(10, v as number)) * 10}%` }} /></i>
                  <b>{v}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {mode === 'voice' && turn.metrics && (
        <div className="ivw-delivery">
          <span className={`ivw-pill ivw-pill--${pace?.tone}`}>{turn.metrics.wpm} words/min · {pace?.label}</span>
          <span className={`ivw-pill ivw-pill--${turn.metrics.fillerCount > 3 ? 'low' : 'good'}`}>
            {turn.metrics.fillerCount} filler {turn.metrics.fillerCount === 1 ? 'word' : 'words'}{turn.metrics.fillers.length ? ` (${turn.metrics.fillers.join(', ')})` : ''}
          </span>
          <span className="ivw-pill">{formatTime(turn.metrics.seconds)} spoken</span>
          {feedback.deliveryTip && <p>{feedback.deliveryTip}</p>}
        </div>
      )}

      <div className="ivw-fb-cols">
        {feedback.strengths?.length > 0 && (
          <div>
            <h4>What worked</h4>
            <ul className="tlr-list">{feedback.strengths.map(s => <li key={s}><CheckCircle2 size={15} />{s}</li>)}</ul>
          </div>
        )}
        {feedback.missing?.length > 0 && (
          <div>
            <h4>What was missing</h4>
            <ul className="tlr-list ivw-list-miss">{feedback.missing.map(s => <li key={s}><AlertTriangle size={14} />{s}</li>)}</ul>
          </div>
        )}
      </div>

      {feedback.improvedAnswer && (
        <div className="ivw-better">
          <h4>A stronger way to say it</h4>
          <p>{feedback.improvedAnswer}</p>
        </div>
      )}
    </div>
  );
}

interface SessionProps {
  mode: InterviewMode;
  settings: InterviewSettings;
  questions: InterviewQuestion[];
  turns: InterviewTurn[];
  setTurns: (turns: InterviewTurn[]) => void;
  jobDescription: string;
  resumeText: string;
  customApiKey: string;
  /** Voice mode: Leo reads each question aloud */
  leoSpeaks: boolean;
  finishing: boolean;
  finishError: string | null;
  onFinish: (turns: InterviewTurn[]) => void;
  onExit: () => void;
}

export default function InterviewSession({
  mode, settings, questions, turns, setTurns, jobDescription, resumeText, customApiKey, leoSpeaks, finishing, finishError, onFinish, onExit,
}: SessionProps) {
  const firstOpen = Math.max(0, questions.findIndex(q => !turns.some(t => t.questionId === q.id && t.feedback)));
  const [index, setIndex] = useState(firstOpen);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const voice = useLeoVoice();
  const mic = useSpeechRecognition();
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const q = questions[index];
  const turn = turns.find(t => t.questionId === q?.id);
  const isLast = index >= questions.length - 1;
  const answeredCount = turns.filter(t => t.feedback).length;
  const voiceMode = mode === 'voice';
  // In voice mode the box shows the live transcript while the mic is on
  const answer = voiceMode && mic.listening ? mic.transcript : draft;

  // Leo asks each new question out loud
  const { speak: speakQuestion, stop: stopVoice } = voice;
  useEffect(() => {
    if (!voiceMode || !leoSpeaks || !q || turn?.feedback) return;
    const t = setTimeout(() => speakQuestion(q.question), 350);
    return () => { clearTimeout(t); stopVoice(); };
    // Only when the question changes, not when its feedback arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, voiceMode, leoSpeaks]);

  if (!q) return null;

  const goTo = (i: number) => {
    voice.stop();
    mic.reset();
    setIndex(i);
    setDraft('');
    setError(null);
    setShowHint(false);
    window.scrollTo({ top: 0 });
  };

  const startMic = () => {
    voice.stop();
    mic.start(draft);
  };

  const stopMic = () => {
    mic.stop();
    setDraft(mic.transcript.trim());
  };

  const submit = async () => {
    if (mic.listening) mic.stop();
    const text = (voiceMode && mic.listening ? mic.transcript : draft).trim();
    if (voiceMode && mic.listening) setDraft(text);
    if (text.split(/\s+/).length < 3) {
      setError(voiceMode ? 'I didn\'t catch an answer. Tap the mic and answer out loud, or type it.' : 'Please write your answer first (a few sentences is fine).');
      return;
    }
    const metrics = voiceMode && mic.seconds > 0 ? voiceMetrics(text, mic.seconds) : undefined;
    setBusy(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await authFetch(`${API_BASE}/api/interview/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: q.question, answer: text, keyPoints: q.keyPoints, role: settings.role, jobDescription, resumeText, mode, metrics,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.data) throw new Error(body.error || 'Could not score your answer. Please try again.');
      const next: InterviewTurn = { questionId: q.id, answer: text, metrics, feedback: body.data };
      setTurns([...turns.filter(t => t.questionId !== q.id), next]);
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not score your answer. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    setTurns(turns.filter(t => t.questionId !== q.id));
    setDraft(turn?.answer || '');
    mic.reset();
    setError(null);
    setTimeout(() => answerRef.current?.focus(), 0);
  };

  const next = () => {
    if (isLast) onFinish(turns);
    else goTo(index + 1);
  };

  const skip = () => {
    if (isLast) { if (answeredCount) onFinish(turns); }
    else goTo(index + 1);
  };

  return (
    <div className="ivw-session">
      <button type="button" className="tlr-flow-exit" onClick={() => { voice.stop(); mic.stop(); onExit(); }} disabled={finishing} aria-label="Exit the interview">
        Exit <X size={15} />
      </button>

      <div className="ivw-progress" aria-label={`Question ${index + 1} of ${questions.length}`}>
        <span>Question {index + 1} of {questions.length}</span>
        <i><em style={{ width: `${((index + (turn?.feedback ? 1 : 0)) / questions.length) * 100}%` }} /></i>
      </div>

      <div className="ivw-ask">
        <div className="ivw-ask-leo"><Leo pose="support" /></div>
        <div className="ivw-bubble">
          <div className="ivw-q-meta">
            <span className="tlr-tag">{q.category}</span>
            <span className={`ivw-diff ivw-diff--${(q.difficulty || 'Medium').toLowerCase()}`}>{q.difficulty}</span>
            {voiceMode && voice.supported && (
              <button type="button" className="ivw-replay" onClick={() => (voice.speaking ? voice.stop() : voice.speak(q.question))} aria-label={voice.speaking ? 'Stop Leo' : 'Hear the question again'}>
                {voice.speaking ? <><Pause size={14} /> Stop</> : <><Volume2 size={14} /> Hear again</>}
              </button>
            )}
          </div>
          <h1 className={`ivw-question${voice.speaking ? ' is-speaking' : ''}`}>{q.question}</h1>
          {(q.whatInterviewerWants || q.keyPoints?.length > 0) && !turn?.feedback && (
            <div className="ivw-hint">
              <button type="button" onClick={() => setShowHint(!showHint)} aria-expanded={showHint}>
                <Lightbulb size={14} /> {showHint ? 'Hide hint' : 'What are they looking for?'} <ChevronDown size={14} />
              </button>
              {showHint && (
                <div>
                  {q.whatInterviewerWants && <p>{q.whatInterviewerWants}</p>}
                  {q.keyPoints?.length > 0 && <ul>{q.keyPoints.map(p => <li key={p}>{p}</li>)}</ul>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {turn?.feedback ? (
        <div className="ivw-panel">
          <details className="ivw-your-answer">
            <summary>Your answer</summary>
            <p>{turn.answer}</p>
          </details>
          <FeedbackCard feedback={turn.feedback} turn={turn} mode={mode} />
          {finishError && <p className="ro-error"><AlertTriangle size={14} /> {finishError}</p>}
          <div className="ivw-actions">
            <button type="button" className="ro-btn ro-btn--outline" onClick={retry} disabled={finishing}><RefreshCw size={15} /> Try this one again</button>
            <button type="button" className="ro-btn ro-btn--green" onClick={next} disabled={finishing}>
              {finishing ? <><Loader2 size={16} className="ro-spin" /> Writing your report…</> : isLast ? <>Finish and see my report <ArrowRight size={16} /></> : <>Next question <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      ) : (
        <div className="ivw-panel">
          {voiceMode && mic.supported ? (
            <div className="ivw-mic">
              <button
                type="button"
                className={`ivw-mic-btn${mic.listening ? ' is-on' : ''}`}
                onClick={mic.listening ? stopMic : startMic}
                disabled={busy}
                aria-label={mic.listening ? 'Stop answering' : 'Start answering out loud'}
              >
                {mic.listening ? <Square size={26} /> : <Mic size={30} />}
              </button>
              <div className="ivw-mic-copy">
                <strong>{mic.listening ? 'Listening… answer out loud' : draft ? 'Tap to keep talking' : 'Tap the mic and answer out loud'}</strong>
                <small>{mic.listening || mic.seconds ? formatTime(mic.seconds) : 'Speak as you would in the real interview. You can fix the transcript before you submit.'}</small>
              </div>
              {mic.listening && <div className="ivw-wave" aria-hidden="true">{Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.09}s` }} />)}</div>}
            </div>
          ) : voiceMode ? (
            <p className="ivw-note"><AlertTriangle size={14} /> Your browser can't turn speech into text. Use Chrome or Edge to answer out loud, or type your answer below.</p>
          ) : null}

          <textarea
            ref={answerRef}
            className="tlr-textarea ivw-answer"
            placeholder={voiceMode ? 'Your spoken answer appears here' : 'Type your answer as you would say it in the interview'}
            value={answer}
            readOnly={mic.listening}
            onChange={e => { setDraft(e.target.value); setError(null); }}
            aria-label="Your answer"
            autoFocus={!voiceMode}
          />
          <div className="ivw-answer-meta">
            <small>{answer.trim() ? answer.trim().split(/\s+/).length : 0} words</small>
            {!voiceMode && <small>Tip: aim for 1-2 minutes when spoken, about 150-250 words.</small>}
          </div>

          {(error || mic.error) && <p className="ro-error"><AlertTriangle size={14} /> {error || mic.error}</p>}
          {finishError && <p className="ro-error"><AlertTriangle size={14} /> {finishError}</p>}

          <div className="ivw-actions">
            <button type="button" className="ro-link" onClick={skip} disabled={busy || finishing || (isLast && !answeredCount)}>
              <SkipForward size={14} /> {isLast ? 'Skip and finish' : 'Skip this question'}
            </button>
            {answeredCount > 0 && !isLast && (
              <button type="button" className="ro-link" onClick={() => onFinish(turns)} disabled={busy || finishing}>Finish now</button>
            )}
            <button type="button" className="ro-btn ro-btn--green" onClick={submit} disabled={busy || finishing || !answer.trim()}>
              {busy ? <><Loader2 size={16} className="ro-spin" /> Leo is reading your answer…</> : finishing ? <><Loader2 size={16} className="ro-spin" /> Writing your report…</> : <>Submit answer <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

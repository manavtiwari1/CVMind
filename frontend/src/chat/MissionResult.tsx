import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Circle, Loader2, Lock, Trash2, TriangleAlert, UserRound, X } from 'lucide-react';
import ResultCard, { type CardActions } from './cards';
import LiveText from './LiveText';
import { JobPickView } from './AgentCards';
import {
  deleteCareerProfile, getMission, stopMission, streamMission, watchMission,
  type CareerProfileCard, type MissionCardData, type MissionState, type MissionStep, type ProfileNoteCard
} from './chatApi';

// Leo Agent Mode in the chat: the plan a user checks and starts, each step as it runs, and the
// taps a mission waits for. Only these buttons move a mission; typing "yes" never does.

const POLL_MS = 4000;

function StepIcon({ status }: { status: MissionStep['status'] }) {
  if (status === 'done') return <Check size={15} />;
  if (status === 'running') return <Loader2 size={15} className="lx-spin" />;
  if (status === 'locked') return <Lock size={14} />;
  if (status === 'failed' || status === 'blocked') return <TriangleAlert size={14} />;
  return <Circle size={9} fill="currentColor" />;
}

export default function MissionResult({ card, actions, fresh, busy }: { card: MissionCardData; actions: CardActions; fresh: boolean; busy: boolean }) {
  const [mission, setMission] = useState<MissionState>(card.mission);
  const [removed, setRemoved] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string[]>([]);
  // The words the running step has written so far
  const [writing, setWriting] = useState<Record<string, string>>({});
  // The jobs ticked in the job hunt's picker
  const [picks, setPicks] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // A saved card is only the plan as it first looked: the server has the current state
  useEffect(() => {
    if (fresh) return;
    getMission(card.id).then(setMission).catch(() => {});
  }, [card.id, fresh]);

  // Leaving the chat closes the stream; the server finishes the step in hand, then pauses
  useEffect(() => () => abortRef.current?.abort(), []);

  // Running with no stream here (another tab, or just reopened): listen to it, and check again if
  // that connection ends while it still runs
  const running = mission.status === 'running' && !streaming;
  useEffect(() => {
    if (!running) return undefined;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => { timer = setTimeout(() => { getMission(card.id).then(setMission).catch(() => {}); }, POLL_MS); };
    watchMission(card.id, {
      onMission: setMission,
      onStep: (step) => setMission((m) => ({ ...m, steps: m.steps.map((s) => (s.id === step.id ? step : s)) })),
    }, controller.signal).then(refresh, () => { if (!controller.signal.aborted) refresh(); });
    return () => { controller.abort(); clearTimeout(timer); };
  }, [running, card.id]);

  const go = useCallback(async (verb: 'start' | 'continue' | 'approve', body: { removeSteps?: string[]; stepId?: string; picks?: string[] } = {}) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setError('');
    try {
      await streamMission(card.id, verb, body, {
        onMission: setMission,
        onStep: (step) => {
          setMission((m) => ({ ...m, steps: m.steps.map((s) => (s.id === step.id ? step : s)) }));
          if (step.status === 'done') setOpen((ids) => [...new Set([...ids, step.id])]);
        },
        onProgress: ({ stepId, text }) => { if (text) setWriting((all) => ({ ...all, [stepId]: (all[stepId] || '') + text })); },
      }, controller.signal);
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setError((err as Error).message || 'Something went wrong. Please try again.');
        getMission(card.id).then(setMission).catch(() => {});
      }
    } finally {
      setStreaming(false);
      setStopping(false);
    }
  }, [card.id]);

  const stop = async () => {
    setError('');
    setStopping(true);
    try {
      const next = await stopMission(card.id);
      // While a step is running the stream brings the final state
      if (next.status !== 'running') { setMission(next); setStopping(false); }
    } catch (err) {
      setError((err as Error).message);
      setStopping(false);
    }
  };

  const planned = mission.status === 'planned';
  const steps = mission.steps.filter((s) => !removed.includes(s.id));
  const runnable = steps.filter((s) => s.status === 'pending').length;
  const toggle = (id: string) => setOpen((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const canStop = ['running', 'waiting_review', 'paused'].includes(mission.status);
  const waiting = mission.steps.find((s) => s.id === mission.pendingStepId);
  const { quota } = mission;
  const pickingJobs = mission.status === 'waiting_review' && waiting?.tool === 'rank_jobs';
  const togglePick = (jobKey: string) => setPicks((list) => (list.includes(jobKey) ? list.filter((k) => k !== jobKey) : [...list, jobKey]));

  return (
    <div className="lc-card lm-card">
      <div className="lm-head">
        <span className="lm-label">{planned ? "Leo's plan" : mission.status === 'done' ? 'Mission complete' : mission.status === 'stopped' ? 'Mission stopped' : 'Mission'}</span>
        {mission.goal && <strong>{mission.goal}</strong>}
      </div>

      <ol className="lm-steps">
        {steps.map((step) => (
          <li key={step.id} className={`lm-step lm-${step.status}`}>
            <div className="lm-step-row">
              <span className="lm-step-icon" aria-hidden="true"><StepIcon status={step.status} /></span>
              <span className="lm-step-text">
                <span className="lm-step-title">{step.title}</span>
                {step.status === 'locked' && <small>Free limit reached this week. This step won't run.</small>}
                {step.status === 'awaiting_approval' && <small>Waits for your OK</small>}
                {step.status !== 'locked' && step.status !== 'awaiting_approval' && planned && step.detail && <small>{step.detail}</small>}
              </span>
              {planned && step.status === 'pending' && runnable > 1 && (
                <button type="button" className="lm-icon" onClick={() => setRemoved((ids) => [...ids, step.id])} aria-label={`Remove step: ${step.title}`}><X size={15} /></button>
              )}
              {step.card && (
                <button type="button" className="lm-icon" onClick={() => toggle(step.id)} aria-expanded={open.includes(step.id)} aria-label={`${open.includes(step.id) ? 'Hide' : 'Show'} result: ${step.title}`}>
                  <ChevronDown size={16} className={open.includes(step.id) ? 'lm-turned' : undefined} />
                </button>
              )}
            </div>
            {step.status === 'running' && writing[step.id] && <div className="lm-result"><LiveText text={writing[step.id]} /></div>}
            {step.card?.type === 'job_pick' && pickingJobs && step.id === waiting?.id && (
              <div className="lm-result"><JobPickView card={step.card} selected={picks} onToggle={togglePick} /></div>
            )}
            {step.card && open.includes(step.id) && !(pickingJobs && step.id === waiting?.id) && (
              <div className="lm-result">
                <ResultCard card={step.card} actions={{ ...actions, latestPortfolioId: step.card.type === 'portfolio' ? step.card.id : actions.latestPortfolioId }} live={false} fresh={fresh} busy={busy} />
              </div>
            )}
          </li>
        ))}
      </ol>

      {mission.message && <p className="lm-message" role="status">{mission.message}</p>}
      {error && <p className="lm-message lm-bad" role="alert">{error}</p>}
      {mission.status === 'running' && <p className="lm-message" role="status"><Loader2 size={14} className="lx-spin" /> {stopping ? 'Stopping after this step…' : 'Leo is working. You can close this chat and come back.'}</p>}

      {planned && quota && <p className="lm-note">Uses 1 of your {quota.left} mission{quota.left === 1 ? '' : 's'} left this {quota.period}. Nothing runs until you tap Start.</p>}

      <div className="lc-actions lm-actions">
        {planned && (
          <button type="button" className="lc-btn lc-btn-primary" disabled={busy || streaming || runnable === 0} onClick={() => void go('start', { removeSteps: removed })}>Start</button>
        )}
        {pickingJobs && waiting && (
          <button type="button" className="lc-btn lc-btn-primary" disabled={busy || streaming || picks.length === 0} onClick={() => void go('approve', { stepId: waiting.id, picks })}>Prepare {picks.length === 1 ? 'this job' : 'these jobs'}</button>
        )}
        {mission.status === 'waiting_review' && waiting && !pickingJobs && (
          <button type="button" className="lc-btn lc-btn-primary" disabled={busy || streaming} onClick={() => void go('approve', { stepId: waiting.id })}>{waiting.risk === 'external' ? 'Approve this step' : 'Looks good, continue'}</button>
        )}
        {mission.status === 'paused' && mission.pausedReason !== 'cap' && (
          <button type="button" className="lc-btn lc-btn-primary" disabled={busy || streaming} onClick={() => void go('continue')}>Continue</button>
        )}
        {steps.some((s) => s.status === 'locked') && (
          <button type="button" className="lc-btn" onClick={() => actions.go('pricing')}>See CVMind Pro</button>
        )}
        {canStop && <button type="button" className="lc-btn" disabled={stopping} onClick={() => void stop()}>Stop</button>}
      </div>
    </div>
  );
}

// One line saying what Leo just remembered
export function ProfileNote({ card, actions }: { card: ProfileNoteCard; actions: CardActions }) {
  return (
    <div className="lm-note-row">
      <UserRound size={14} aria-hidden="true" />
      <span>{card.message}</span>
      <button type="button" onClick={() => actions.go(card.page || 'account')}>Manage</button>
    </div>
  );
}

// What Leo has saved, with the only way to delete it from the chat
export function CareerProfileView({ card, actions }: { card: CareerProfileCard; actions: CardActions }) {
  const [state, setState] = useState<'shown' | 'deleting' | 'deleted'>('shown');
  const [error, setError] = useState('');

  const remove = async () => {
    if (!window.confirm('Delete your Career Profile? Leo will forget your saved resume and details.')) return;
    setState('deleting');
    setError('');
    try {
      await deleteCareerProfile();
      setState('deleted');
    } catch (err) {
      setError((err as Error).message);
      setState('shown');
    }
  };

  if (state === 'deleted') return <div className="lc-card"><p>Your Career Profile is deleted. Leo no longer has your saved resume or details.</p></div>;
  const empty = !card.resumeName && card.sections.length === 0;
  return (
    <div className="lc-card lm-card">
      <div className="lm-head">
        <span className="lm-label">Career Profile</span>
        {card.resumeName && <strong>Saved resume: {card.resumeName}</strong>}
      </div>
      {empty && <p>Leo hasn't saved anything about you yet.</p>}
      {card.sections.map((section) => (
        <div key={section.title} className="lm-section">
          <span className="lm-section-title">{section.title}</span>
          {section.lines.filter(Boolean).map((line) => <span key={line}>{line}</span>)}
        </div>
      ))}
      {error && <p className="lm-message lm-bad" role="alert">{error}</p>}
      {!empty && (
        <div className="lc-actions lm-actions">
          <button type="button" className="lc-btn lc-btn-primary" onClick={() => actions.go('account')}>Edit</button>
          <button type="button" className="lc-btn" disabled={state === 'deleting'} onClick={() => void remove()}><Trash2 size={14} /> Delete</button>
        </div>
      )}
    </div>
  );
}

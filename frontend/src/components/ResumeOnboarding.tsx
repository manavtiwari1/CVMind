import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, Lock } from 'lucide-react';
import { API_BASE } from '../lib/apiBase';
import { getErrorMessage } from '../utils/errors';
import type { ExtractedResume } from '../types/api';
import JobSearchStep, { type LiveJob } from './JobSearchStep';
import './ResumeOnboarding.css';
import { LEO_POSES, type LeoPose } from '../lib/leoPoses';
import { authFetch } from '../lib/authFetch';

export type ResumeGoal = 'recruiters' | 'ats';

export interface OnboardingResult {
  extracted: ExtractedResume | null;
  jobTitle: string;
  goal: ResumeGoal | null;
}

interface ResumeOnboardingProps {
  customApiKey: string;
  onComplete: (result: OnboardingResult) => void;
}

type Step = 'loading' | 'job' | 'existing' | 'upload' | 'position' | 'goal';


// Which of the 5 progress dots is active for each screen.
const STEP_INDEX: Record<Exclude<Step, 'loading'>, number> = { job: 1, existing: 2, upload: 3, position: 3, goal: 4 };


/** Leo, the CVMind guide, in the pose that fits the moment (see lib/leoPoses.ts). */
export function Leo({ pose = 'hello' }: { pose?: LeoPose }) {
  return (
    <div className="ro-leo" role="img" aria-label="Leo, your CVMind guide">
      <img src={LEO_POSES[pose]} alt="" width={200} height={200} draggable={false} />
    </div>
  );
}

/** Leo in a small circle, for chat messages and other small spots. */
export function LeoAvatar({ size = 32, className, pose = 'hello' }: { size?: number; className?: string; pose?: LeoPose }) {
  return (
    <img
      className={`ro-leo-avatar${className ? ` ${className}` : ''}`}
      src={LEO_POSES[pose]}
      alt="Leo"
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size }}
    />
  );
}

export function Stepper({ active, total = 6 }: { active: number; total?: number }) {
  return (
    <ol className="ro-stepper" aria-label={`Step ${active} of ${total}`}>
      {Array.from({ length: total }, (_, i) => i + 1).map(n => (
        <li key={n} className={`ro-dot${n < active ? ' is-done' : n === active ? ' is-active' : ''}`} aria-current={n === active ? 'step' : undefined}>
          {n < active ? <Check size={13} strokeWidth={3} /> : n}
        </li>
      ))}
    </ol>
  );
}

export default function ResumeOnboarding({ customApiKey, onComplete }: ResumeOnboardingProps) {
  const [step, setStep] = useState<Step>('loading');
  const [targetJob, setTargetJob] = useState<LiveJob | null>(null);
  const [position, setPosition] = useState('');
  const [extracted, setExtracted] = useState<ExtractedResume | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Short intro screen before Leo's first question.
  useEffect(() => {
    if (step !== 'loading') return;
    const t = setTimeout(() => setStep('job'), 1600);
    return () => clearTimeout(t);
  }, [step]);

  const jobTitle = targetJob?.title || position.trim();
  const finish = (goal: ResumeGoal | null, data: ExtractedResume | null = extracted) =>
    onComplete({ extracted: data, jobTitle, goal });

  const handleUpload = async (file: File) => {
    setIsExtracting(true);
    setExtractError('');
    try {
      const fd = new FormData();
      fd.append('resume', file);
      // An uploaded resume is copied as written, never rewritten.
      fd.append('exact', 'true');
      const headers: Record<string, string> = {};
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await authFetch(`${API_BASE}/api/resume/parse-data`, { method: 'POST', headers, body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to extract resume data.');
      setExtracted(body.data);
      setStep('goal');
    } catch (err) {
      setExtractError(getErrorMessage(err) || 'Error extracting resume data. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="ro-page ro-center">
        <Leo pose="typing" />
        <p className="ro-loading-text"><Loader2 size={18} className="ro-spin" /> Leo is getting things ready…</p>
      </div>
    );
  }


  return (
    <div className="ro-page">
      <Stepper active={STEP_INDEX[step]} />

      {step === 'job' && (
        <JobSearchStep onSkip={() => setStep('existing')} onTarget={job => { setTargetJob(job); setStep('existing'); }} />
      )}

      {step === 'existing' && (
        <div className="ro-center ro-stage">
          <Leo pose="thinking" />
          <h1 className="ro-title">Do you have an existing resume to use as a starting point?</h1>
          <div className="ro-actions">
            <button type="button" className="ro-btn ro-btn--green" onClick={() => setStep('upload')}>Yes</button>
            <button type="button" className="ro-btn ro-btn--purple" onClick={() => { setExtracted(null); setStep('position'); }}>No</button>
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="ro-center ro-stage">
          <Leo pose="resume" />
          <h1 className="ro-title">Great. Please upload it for a quick start.</h1>
          <div
            className={`ro-drop${dragOver ? ' is-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f && !isExtracting) handleUpload(f);
            }}
          >
            <p>Drop your resume here or choose a file.</p>
            <p>.pdf and .docx only.</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx"
              hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
            {isExtracting ? (
              <p className="ro-extracting"><Loader2 size={16} className="ro-spin" /> Extracting your details with AI…</p>
            ) : (
              <button type="button" className="ro-btn ro-btn--green" onClick={() => fileRef.current?.click()}>Upload Resume</button>
            )}
            {extractError && <p className="ro-error"><AlertTriangle size={14} /> {extractError}</p>}
          </div>
          <p className="ro-privacy"><Lock size={13} /> We never share your data with 3rd parties or use it for AI model training.</p>
          <button type="button" className="ro-link" onClick={() => setStep('existing')}>← Go back</button>
        </div>
      )}

      {step === 'position' && (
        <div className="ro-center ro-stage">
          <Leo pose="idea" />
          <h1 className="ro-title">Please tell me your position so I can recommend templates.</h1>
          <form className="ro-position" onSubmit={e => { e.preventDefault(); setStep('goal'); }}>
            <input
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="e.g. Marketing Executive"
              aria-label="Your position"
              autoFocus
            />
            <button type="submit" className="ro-btn ro-btn--green" disabled={!position.trim()}>Next</button>
          </form>
          <button type="button" className="ro-link" onClick={() => setStep('goal')}>Skip this step</button>
        </div>
      )}

      {step === 'goal' && (
        <div className="ro-center ro-stage">
          <Leo pose="thinking" />
          <h1 className="ro-title">Are you primarily concerned with impressing recruiters or passing ATS?</h1>
          <div className="ro-actions">
            <button type="button" className="ro-btn ro-btn--green" onClick={() => finish('recruiters')}>Impress Recruiters</button>
            <button type="button" className="ro-btn ro-btn--purple" onClick={() => finish('ats')}>Pass ATS</button>
          </div>
        </div>
      )}
    </div>
  );
}

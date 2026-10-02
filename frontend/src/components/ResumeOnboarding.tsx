import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, CornerDownLeft, Loader2, Lock, MapPin, Search, X } from 'lucide-react';
import { API_BASE } from '../lib/apiBase';
import { getErrorMessage } from '../utils/errors';
import type { ExtractedResume } from '../types/api';
import './ResumeOnboarding.css';

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

interface JobResult {
  id: string;
  title: string;
  company: string;
  location?: string;
  type?: string;
  remote?: string;
  salary?: string;
  exp?: string;
  posted?: string;
  skills?: string[];
  industry?: string;
  logo?: string | null;
  domain?: string;
  apply_url?: string;
}

type Step = 'loading' | 'job' | 'existing' | 'upload' | 'position' | 'goal';


// Which of the 5 progress dots is active for each screen.
const STEP_INDEX: Record<Exclude<Step, 'loading'>, number> = { job: 1, existing: 2, upload: 3, position: 3, goal: 4 };

const initials = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

/** Leo, the CVMind guide — a friendly boy avatar sitting on soft colour blobs. */
export function Leo() {
  return (
    <div className="ro-leo" aria-label="Leo, your CVMind guide" role="img">
      <svg viewBox="0 0 240 200" width="240" height="200" aria-hidden="true">
        <path d="M30 70c10-34 52-44 70-26 14 14 6 46-14 62-24 18-66 8-56-36z" fill="#cfe4f5" />
        <path d="M120 22c26-26 76-10 78 24 2 28-26 36-46 30-30-10-50-30-32-54z" fill="#fde1c4" />
        <path d="M118 120c18-16 52-6 52 24 0 30-34 48-56 34-20-14-18-40 4-58z" fill="#d3f2e3" />
        <clipPath id="ro-leo-clip"><circle cx="112" cy="100" r="60" /></clipPath>
        <circle cx="112" cy="100" r="60" fill="#e9eef5" />
        <g clipPath="url(#ro-leo-clip)">
          {/* hoodie */}
          <path d="M40 176c4-30 30-44 72-44s68 14 72 44z" fill="#2bbf8e" />
          <path d="M92 134l20 22 20-22" fill="#fff" opacity=".9" />
          {/* neck */}
          <rect x="98" y="112" width="28" height="26" rx="10" fill="#e7b48f" />
          {/* head */}
          <ellipse cx="112" cy="92" rx="30" ry="34" fill="#f2c4a0" />
          <ellipse cx="82" cy="96" rx="5" ry="8" fill="#eab08a" />
          <ellipse cx="142" cy="96" rx="5" ry="8" fill="#eab08a" />
          {/* hair */}
          <path d="M80 86c-4-30 16-46 34-46 22 0 38 14 32 46-6-14-14-20-26-22-14 4-30 8-40 22z" fill="#2a2420" />
          <path d="M84 70c6-14 22-22 38-18-14 2-22 8-26 20z" fill="#3b312b" />
          {/* eyes */}
          <ellipse cx="101" cy="94" rx="3.2" ry="4" fill="#2a2420" />
          <ellipse cx="123" cy="94" rx="3.2" ry="4" fill="#2a2420" />
          <circle cx="102" cy="92.6" r="1.1" fill="#fff" />
          <circle cx="124" cy="92.6" r="1.1" fill="#fff" />
          {/* brows */}
          <path d="M94 85q7-4 13 0M117 85q7-4 13 0" stroke="#2a2420" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* smile + cheeks */}
          <path d="M102 108q10 9 20 0" stroke="#a5513f" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <circle cx="94" cy="104" r="4.5" fill="#f19a8a" opacity=".45" />
          <circle cx="130" cy="104" r="4.5" fill="#f19a8a" opacity=".45" />
        </g>
      </svg>
      <span className="ro-leo-name">Leo</span>
    </div>
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
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<JobResult[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [targetJob, setTargetJob] = useState<JobResult | null>(null);
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

  const runSearch = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`${API_BASE}/api/auto-apply/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: [], roles: [q], locations: ['India'] }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Could not load jobs.');
      const all: JobResult[] = body.data?.jobs || [];
      // The API falls back to every job when few match, so rank real matches first.
      const tokens = q.toLowerCase().split(/\s+/).filter(t => t.length > 2 && t !== 'jobs');
      const hit = (j: JobResult) => tokens.some(t => `${j.title} ${j.industry || ''}`.toLowerCase().includes(t));
      const ranked = [...all.filter(hit), ...all.filter(j => !hit(j))].slice(0, 12);
      setJobs(ranked);
      setSelectedId(ranked[0]?.id ?? null);
    } catch (err) {
      setJobs(null);
      setSearchError(getErrorMessage(err) || 'Could not load jobs. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setJobs(null);
    setSelectedId(null);
    setSearchError('');
  };

  const handleUpload = async (file: File) => {
    setIsExtracting(true);
    setExtractError('');
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const headers: Record<string, string> = {};
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await fetch(`${API_BASE}/api/resume/parse-data`, { method: 'POST', headers, body: fd });
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
        <Leo />
        <p className="ro-loading-text"><Loader2 size={18} className="ro-spin" /> Leo is getting things ready…</p>
      </div>
    );
  }

  const selected = jobs?.find(j => j.id === selectedId) || null;

  return (
    <div className="ro-page">
      <Stepper active={STEP_INDEX[step]} />

      {step === 'job' && (
        <div className="ro-job">
          <h1 className="ro-title">What job do you want next?</h1>
          <p className="ro-sub">Search real openings, pick the job you want, and we'll tailor your resume to it.</p>

          <form className="ro-search" onSubmit={e => { e.preventDefault(); runSearch(); }}>
            <Search size={16} className="ro-search-icon" aria-hidden="true" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. Entry Level Marketing jobs"
              aria-label="Search jobs"
              autoFocus
            />
            {query && <button type="button" className="ro-icon-btn" onClick={clearSearch} aria-label="Clear search"><X size={15} /></button>}
            <button type="submit" className="ro-go" disabled={!query.trim() || searching} aria-label="Search">
              {searching ? <Loader2 size={15} className="ro-spin" /> : <CornerDownLeft size={15} />}
            </button>
          </form>

          <div className="ro-actions">
            <button type="button" className="ro-link" onClick={() => setStep('existing')}>Skip this step</button>
            <button
              type="button"
              className="ro-btn ro-btn--green"
              disabled={!selected}
              onClick={() => { setTargetJob(selected); setStep('existing'); }}
            >
              <Search size={15} /> Target this job
            </button>
          </div>

          {searchError && <p className="ro-error"><AlertTriangle size={14} /> {searchError}</p>}

          {jobs && (
            jobs.length === 0 ? (
              <p className="ro-empty">No openings found. Try a different title, or skip this step.</p>
            ) : (
              <div className="ro-jobs">
                <div className="ro-jobs-list" role="listbox" aria-label="Job results">
                  <p className="ro-jobs-count">{jobs.length} jobs found</p>
                  {jobs.map(j => (
                    <button
                      key={j.id}
                      type="button"
                      role="option"
                      aria-selected={j.id === selectedId}
                      className={`ro-job-card${j.id === selectedId ? ' is-selected' : ''}`}
                      onClick={() => setSelectedId(j.id)}
                    >
                      <span className="ro-logo">{initials(j.company)}</span>
                      <span className="ro-job-main">
                        <strong>{j.title}</strong>
                        <span>{j.company}</span>
                        <small>{[j.remote, j.location, j.exp].filter(Boolean).join(' • ')}</small>
                      </span>
                    </button>
                  ))}
                </div>
                {selected && (
                  <article className="ro-jobs-detail">
                    <header>
                      <span className="ro-logo ro-logo--lg">{initials(selected.company)}</span>
                      <div>
                        <h2>{selected.title}</h2>
                        <p>{selected.company}</p>
                        <small>{[selected.remote, selected.location, selected.salary, selected.exp].filter(Boolean).join(' • ')}</small>
                      </div>
                      {selected.posted && <span className="ro-posted">{selected.posted}</span>}
                    </header>
                    {selected.location && <p className="ro-detail-line"><MapPin size={14} /> {selected.location}</p>}
                    {selected.skills && selected.skills.length > 0 && (
                      <>
                        <h3>Key skills</h3>
                        <ul className="ro-skills">{selected.skills.map(s => <li key={s}>{s}</li>)}</ul>
                      </>
                    )}
                    {selected.apply_url && (
                      <a className="ro-link" href={selected.apply_url} target="_blank" rel="noreferrer">
                        View full posting <ArrowRight size={13} />
                      </a>
                    )}
                  </article>
                )}
              </div>
            )
          )}
        </div>
      )}

      {step === 'existing' && (
        <div className="ro-center ro-stage">
          <Leo />
          <h1 className="ro-title">Do you have an existing resume to use as a starting point?</h1>
          <div className="ro-actions">
            <button type="button" className="ro-btn ro-btn--green" onClick={() => setStep('upload')}>Yes</button>
            <button type="button" className="ro-btn ro-btn--purple" onClick={() => { setExtracted(null); setStep('position'); }}>No</button>
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="ro-center ro-stage">
          <Leo />
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
          <Leo />
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
          <Leo />
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

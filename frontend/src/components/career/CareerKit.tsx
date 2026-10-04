// The Career tools' shared screens: the intro page with the form (site header and footer),
// then the working screen and the result, which run full-screen in the app without them.
import { useRef, useState } from 'react';
import type React from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Copy, FileText, Home, Link2,
  Loader2, RefreshCw, Upload, X,
  type LucideIcon,
} from 'lucide-react';
import { CAREER_TOOLS } from './careerApi';
import type { CvSource, CvState } from './careerApi';
import '../../pages/Tailor.css';
import './Career.css';

export interface CareerToolInfo {
  name: string;
  icon: LucideIcon;
}

// ── Intro page ─────────────────────────────────────────────────

export interface IntroCopy {
  title: React.ReactNode;
  checks: string[];
  formTitle: string;
  steps: { icon: LucideIcon; title: string; text: string }[];
  gets: { icon: LucideIcon; title: string; text: string }[];
  faqs: { q: string; a: string }[];
  finalTitle: string;
  finalText: string;
}

interface CareerIntroProps {
  tool: CareerToolInfo;
  copy: IntroCopy;
  setCurrentPage?: (page: string) => void;
  /** Shown above the form when there is a result to go back to */
  resumeResult?: { label: string; onClick: () => void } | null;
  /** The form fields */
  children: React.ReactNode;
  /** Start button */
  submit: { label: string; disabled: boolean; onClick: () => void; hint?: string };
}

export function CareerIntro({ tool, copy, setCurrentPage, resumeResult, children, submit }: CareerIntroProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const formRef = useRef<HTMLFormElement>(null);
  const Icon = tool.icon;

  const toForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    formRef.current?.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true });
  };

  return (
    <div className="tlr crt">
      <section className="tlr-hero crt-hero">
        <div className="tlr-wrap tlr-hero-grid crt-hero-grid">
          <div className="tlr-hero-copy">
            <nav className="tlr-crumb" aria-label="Breadcrumb">
              <button type="button" onClick={() => setCurrentPage?.('home')} aria-label="Home"><Home size={14} /></button>
              <span aria-hidden="true">›</span>
              <span>Career</span>
              <span aria-hidden="true">›</span>
              <span>{tool.name}</span>
            </nav>
            <h1>{copy.title}</h1>
            <ul className="tlr-checks">
              {copy.checks.map(c => <li key={c}><CheckCircle2 size={18} />{c}</li>)}
            </ul>
            <p className="tlr-note">Free to try. No card needed.</p>
          </div>

          <form
            ref={formRef}
            className="tlr-start crt-form"
            onSubmit={e => { e.preventDefault(); if (!submit.disabled) submit.onClick(); }}
            noValidate
          >
            <div className="crt-form-head">
              <span className="crt-tile"><Icon size={20} /></span>
              <h2>{copy.formTitle}</h2>
            </div>
            {resumeResult && (
              <button type="button" className="tlr-btn tlr-btn--outline tlr-btn--block" onClick={resumeResult.onClick}>
                <ArrowRight size={17} /> {resumeResult.label}
              </button>
            )}
            {children}
            <button type="submit" className="tlr-btn tlr-btn--block tlr-btn--big" disabled={submit.disabled}>
              {submit.label} <ArrowRight size={18} />
            </button>
            {submit.hint && <p className="tlr-fine tlr-center crt-form-hint">{submit.hint}</p>}
          </form>
        </div>
      </section>

      <section className="tlr-light">
        <div className="tlr-wrap">
          <p className="tlr-kicker">How it works</p>
          <h2 className="tlr-center">Three steps, about a minute</h2>
          <ol className="tlr-steps">
            {copy.steps.map((s, i) => (
              <li key={s.title}>
                <span className="tlr-step-ico"><s.icon size={20} /></span>
                <small>Step {i + 1}</small>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="tlr-light tlr-light--tint">
        <div className="tlr-wrap">
          <p className="tlr-kicker">What you get</p>
          <h2 className="tlr-center">Ready to use, not just advice</h2>
          <ul className="crt-gets">
            {copy.gets.map(g => (
              <li key={g.title}>
                <g.icon size={20} />
                <div>
                  <h3>{g.title}</h3>
                  <p>{g.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="tlr-light">
        <div className="tlr-wrap tlr-faq">
          <h2 className="tlr-center">Frequently asked questions</h2>
          {copy.faqs.map((f, i) => (
            <div key={f.q} className={`tlr-faq-item${openFaq === i ? ' is-open' : ''}`}>
              <button type="button" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{f.q}</span><ChevronDown size={18} />
              </button>
              {openFaq === i && <p>{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="tlr-final">
        <div className="tlr-wrap tlr-center">
          <h2>{copy.finalTitle}</h2>
          <p>{copy.finalText}</p>
          <button type="button" className="tlr-btn tlr-btn--big" onClick={toForm}>Get started <ArrowRight size={18} /></button>
        </div>
      </section>
    </div>
  );
}

// ── Form fields ────────────────────────────────────────────────

export function Field({ label, optional, hint, children }: { label: string; optional?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="crt-field">
      <span className="crt-label">{label}{optional && <em>Optional</em>}</span>
      {children}
      {hint && <small className="crt-hint">{hint}</small>}
    </label>
  );
}

/** One choice from a short list, as pill buttons. */
export function Chips({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="crt-field crt-chipset">
      <legend className="crt-label">{label}</legend>
      <div className="crt-chips">
        {options.map(o => (
          <button key={o} type="button" className={value === o ? 'is-on' : ''} aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
    </fieldset>
  );
}

const CV_TABS: { id: CvSource; label: string; icon: LucideIcon }[] = [
  { id: 'saved', label: 'My resume', icon: FileText },
  { id: 'file', label: 'Upload', icon: Upload },
  { id: 'link', label: 'Link', icon: Link2 },
  { id: 'none', label: 'Skip', icon: X },
];

/** Where the CV comes from: the resume already added, a file, a link, or none. */
export function CvPicker({ state, why }: { state: CvState; why: string }) {
  const { cv, hasAppResume, appResumeText, fileError } = state;
  const [drag, setDrag] = useState(false);
  const tabs = CV_TABS.filter(t => t.id !== 'saved' || hasAppResume);

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(e.type === 'dragenter' || e.type === 'dragover');
  };

  return (
    <fieldset className="crt-field crt-cv">
      <legend className="crt-label">Your resume<em>Optional</em></legend>
      <div className={`tlr-toggle crt-cv-tabs has-${tabs.length}`} role="tablist" aria-label="How to add your resume">
        {tabs.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={cv.source === t.id} className={cv.source === t.id ? 'is-on' : ''} onClick={() => state.setSource(t.id)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      {cv.source === 'saved' && (
        <div className="tlr-file">
          <FileText size={20} />
          <div><strong>The resume you already added</strong><small>{appResumeText.trim().slice(0, 64)}…</small></div>
        </div>
      )}
      {cv.source === 'file' && (cv.file ? (
        <div className="tlr-file">
          <FileText size={20} />
          <div><strong>{cv.file.name}</strong><small>{(cv.file.size / (1024 * 1024)).toFixed(2)} MB</small></div>
          <button type="button" onClick={state.clearFile} aria-label="Remove file"><X size={16} /></button>
        </div>
      ) : (
        <label className={`tlr-drop crt-drop${drag ? ' is-drag' : ''}`} onDragEnter={onDrag} onDragOver={onDrag} onDragLeave={onDrag} onDrop={e => { onDrag(e); setDrag(false); if (e.dataTransfer.files?.[0]) state.pickFile(e.dataTransfer.files[0]); }}>
          <input type="file" accept=".pdf,.docx,.txt" onChange={e => { if (e.target.files?.[0]) state.pickFile(e.target.files[0]); e.target.value = ''; }} />
          <Upload size={20} />
          <span><b>Choose a file</b> or drag it here</span>
          <small>PDF, DOCX or TXT · up to 5 MB</small>
        </label>
      ))}
      {cv.source === 'link' && (
        <input type="url" className="tlr-input" placeholder="https://drive.google.com/… or a PDF/DOCX link" value={cv.url} onChange={e => state.setUrl(e.target.value)} aria-label="Link to your resume" />
      )}
      {cv.source === 'none' && <p className="crt-hint">No problem. {why.replace(/^./, c => c.toLowerCase())} It will be more general without one.</p>}
      {cv.source !== 'none' && <small className="crt-hint">{why}</small>}
      {fileError && <p className="tlr-error"><AlertTriangle size={15} /> {fileError}</p>}
    </fieldset>
  );
}

// ── Working screen ─────────────────────────────────────────────

interface CareerWorkingProps {
  tool: CareerToolInfo;
  title: string;
  phases: string[];
  phase: number;
  error: string | null;
  onRetry: () => void;
  onEdit: () => void;
}

export function CareerWorking({ tool, title, phases, phase, error, onRetry, onEdit }: CareerWorkingProps) {
  const Icon = tool.icon;
  return (
    <div className="tlr crt crt-working">
      <button type="button" className="crt-exit crt-working-exit" onClick={onEdit} disabled={!error} aria-label={`Exit ${tool.name}`}>
        Exit <X size={15} />
      </button>
      <div className="crt-working-card" role="status" aria-live="polite">
        <span className={`crt-orb${error ? ' is-error' : ''}`}>
          {error ? <AlertTriangle size={28} /> : <Icon size={28} />}
        </span>
        <p className="crt-working-tool">{tool.name}</p>
        {error ? (
          <>
            <h1>That didn't work</h1>
            <p className="tlr-error"><AlertTriangle size={15} /> {error}</p>
            <div className="crt-working-actions">
              <button type="button" className="tlr-btn" onClick={onRetry}><RefreshCw size={16} /> Try again</button>
              <button type="button" className="tlr-btn tlr-btn--outline" onClick={onEdit}><ArrowLeft size={16} /> Change my details</button>
            </div>
          </>
        ) : (
          <>
            <h1>{title}</h1>
            <ul className="tlr-phases crt-phases">
              {phases.map((p, i) => (
                <li key={p} className={i < phase ? 'is-done' : i === phase ? 'is-on' : ''}>
                  {i < phase ? <CheckCircle2 size={17} /> : i === phase ? <Loader2 size={17} className="tlr-spin" /> : <span className="tlr-phase-dot" />}
                  {p}
                </li>
              ))}
            </ul>
            <p className="crt-working-note">This usually takes 10 to 30 seconds. Keep this tab open.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Result view ────────────────────────────────────────────────

interface CareerAppProps {
  tool: CareerToolInfo;
  /** Back to the form, e.g. "New audit" */
  againLabel: string;
  onAgain: () => void;
  onExit: () => void;
  heading: string;
  summary?: string;
  meta?: string;
  actions?: React.ReactNode;
  footnote?: string;
  children: React.ReactNode;
}

export function CareerApp({ tool, againLabel, onAgain, onExit, heading, summary, meta, actions, footnote, children }: CareerAppProps) {
  const Icon = tool.icon;
  return (
    <div className="tlr crt crt-app">
      <div className="tlr-wrap">
        <div className="crt-bar">
          <button type="button" className="tlr-back" onClick={onAgain}><ArrowLeft size={16} /> {againLabel}</button>
          <span className="crt-bar-title"><Icon size={16} /> {tool.name}</span>
          <button type="button" className="crt-exit" onClick={onExit} aria-label={`Exit ${tool.name}`}>Exit <X size={15} /></button>
        </div>

        <section className="crt-head">
          <span className="crt-tile crt-tile--big"><Icon size={26} /></span>
          <div className="crt-head-copy">
            <h1>{heading}</h1>
            {summary && <p>{summary}</p>}
            {meta && <small className="crt-meta">{meta}</small>}
            {actions && <div className="tlr-done-actions">{actions}</div>}
            {footnote && <p className="tlr-fine">{footnote}</p>}
          </div>
        </section>

        {children}
      </div>
    </div>
  );
}

/** A result card with a heading and an optional action on the right. */
export function Panel({ title, icon: Icon, action, className = '', children }: { title: string; icon?: LucideIcon; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={`crt-panel ${className}`}>
      <header className="crt-panel-head">
        <h2>{Icon && <Icon size={18} />}{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function CopyButton({ text, label = 'Copy', small = false }: { text: string; label?: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  };
  return (
    <button type="button" className={small ? 'crt-copy' : 'tlr-btn tlr-btn--outline'} onClick={copy} title={failed ? 'Your browser blocked copying. Select the text and copy it instead.' : undefined}>
      {copied ? <><Check size={small ? 14 : 17} /> Copied</> : <><Copy size={small ? 14 : 17} /> {failed ? 'Copy blocked' : label}</>}
    </button>
  );
}

/** Character count against a limit, e.g. LinkedIn's 220 for a headline. */
export function CharCount({ text, limit }: { text: string; limit: number }) {
  const n = text.length;
  return <small className={`crt-count${n > limit ? ' is-over' : ''}`}>{n} / {limit}</small>;
}

/** Score ring with a label, from Tailor.css. */
export function ScoreCard({ score, title, note }: { score: number; title?: string; note: string }) {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  const band = s >= 80 ? { tone: 'good', label: 'Strong' } : s >= 60 ? { tone: 'ok', label: 'Getting there' } : { tone: 'low', label: 'Needs work' };
  return (
    <section className={`tlr-card tlr-score tlr-score--${band.tone}`}>
      <div className="tlr-ring" style={{ '--p': s } as React.CSSProperties}>
        <b>{s}<small>/100</small></b>
      </div>
      <div>
        <span className="tlr-score-label">{title ? `${title}: ` : ''}{band.label}</span>
        <p>{note}</p>
      </div>
    </section>
  );
}

/** Progress bar for a checklist. */
export function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="crt-progress">
      <div className="crt-progress-top"><span>{label}</span><b>{done} / {total}</b></div>
      <i role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={label}><em style={{ width: `${pct}%` }} /></i>
    </div>
  );
}

/** A tickable checklist row. */
export function CheckItem({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <li>
      <label className={`crt-check${checked ? ' is-done' : ''}`}>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="crt-box" aria-hidden="true">{checked && <Check size={13} strokeWidth={3} />}</span>
        <span>{children}</span>
      </label>
    </li>
  );
}

/** Links to the other Career tools. */
export function CareerNext({ current, setCurrentPage, pick }: { current: string; setCurrentPage?: (page: string) => void; pick: string[] }) {
  if (!setCurrentPage) return null;
  const tools = CAREER_TOOLS.filter(t => t.page !== current && pick.includes(t.page));
  if (!tools.length) return null;
  return (
    <section className="tlr-card crt-next">
      <h3>Keep going</h3>
      <ul>
        {tools.map(t => (
          <li key={t.page}>
            <button type="button" onClick={() => setCurrentPage(t.page)}>
              <span className="crt-tile"><t.icon size={17} /></span>
              <span><strong>{t.name}</strong><small>{t.desc}</small></span>
              <ArrowRight size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

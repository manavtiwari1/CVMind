import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AUTH_REQUIRED_EVENT, authFetch } from '../lib/authFetch';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardList, Copy, Download, FileSearch, FileText,
  LayoutTemplate, ListChecks, Loader2, Lock, PencilLine, PenLine, Plus, Printer, RefreshCw, RotateCcw, Sparkles,
  Target, X, XCircle, Zap,
} from 'lucide-react';
import cvmindIcon from '../assets/cvmind_icon.png';
import SkeletonLoader from '../components/SkeletonLoader';
import TemplatePreview from '../components/TemplatePreview';
import ResumeSheet from '../components/ResumeSheet';
import { RESUME_TEMPLATES } from '../data/resumeTemplates';
import { USER_CHANGE_EVENT, readUser } from '../lib/currentUser';
import { isCrossHost, urlForPage } from '../lib/hosts';
import { downloadWord, fillTemplate, parseResumeText, templateFor, workForEditor } from '../lib/resumeHandoff';
import { workHash } from '../lib/workHandoff';
import type { ExtractedResume, LoadedWork } from '../types/api';
import { downloadResumeAsDocx, downloadResumeAsPdf, downloadResumeAsTxt } from '../utils/generateResumeDocx';
import { getErrorMessage } from '../utils/errors';
import { exportHtml } from '../lib/branding';
import './Dashboard.css';

interface Suggestions {
  original: string;
  improved: string;
}

interface AnalysisData {
  fileName?: string;
  score: number;
  scoreChange?: { previousScore: number; previousAt: string; delta: number; trend: 'up' | 'down' | 'same' } | null;
  summary: string;
  atsKeywords: {
    score: number;
    matched: string[];
    missing: string[];
    feedback: string;
  };
  contentAndImpact: {
    score: number;
    feedback: string;
    suggestions: Suggestions[];
  };
  formattingAndStyle: {
    score: number;
    feedback: string;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface DashboardProps {
  setCurrentPage: (page: string) => void;
  analysisResult: AnalysisData | null;
  resumeText: string;
  resetAnalysis: () => void;
  customApiKey: string;
  isLoggedIn?: boolean;
  setLoadedWork?: (work: LoadedWork | null) => void;
}

type PartId = 'overview' | 'actions' | 'keywords' | 'impact' | 'formatting' | 'autofix' | 'templates';
type Tone = 'good' | 'ok' | 'bad';

const toneOf = (v: number): Tone => (v >= 80 ? 'good' : v >= 60 ? 'ok' : 'bad');
const gradeOf = (v: number) => (v >= 80 ? 'Strong resume' : v >= 60 ? 'Good, with room to grow' : 'Needs work');
const verdictOf = (v: number) => (v >= 80 ? 'Great' : v >= 60 ? 'Fair' : 'Weak');

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts from 0 up to the target once, so the score lands with a little motion. */
function useCountUp(target: number, ms = 900) {
  const [n, setN] = useState(() => (reducedMotion() ? target : 0));
  useEffect(() => {
    if (reducedMotion()) return;
    // a timer rather than requestAnimationFrame, so a tab opened in the background still lands on the real score
    const start = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [target, ms]);
  return n;
}

/** Half-circle gauge for the overall score. */
function Gauge({ value }: { value: number }) {
  const shown = useCountUp(value);
  return (
    <div className={`rpt-gauge tone-${toneOf(value)}`}>
      <svg viewBox="0 0 200 112" aria-hidden="true">
        <path d="M 16 100 A 84 84 0 0 1 184 100" className="rpt-gauge-track" pathLength={100} />
        <path d="M 16 100 A 84 84 0 0 1 184 100" className="rpt-gauge-bar" pathLength={100} style={{ strokeDasharray: `${shown} 100` }} />
      </svg>
      <div className="rpt-gauge-num">
        <b>{shown}</b><span>/100</span>
      </div>
    </div>
  );
}

/**
 * Templates have room for about four achievements. Drop any that only repeat a job bullet, and cap the rest,
 * so a long sidebar cannot crowd out the experience column.
 */
function tidyForTemplate(data: ExtractedResume): ExtractedResume {
  const norm = (t = '') => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const jobText = norm((data.workExperiences || []).map((w) => w.description || '').join(' '));
  const seen = new Set<string>();
  const achievements = (data.achievements || [])
    .filter((a) => {
      const title = norm(a.title);
      if (title && seen.has(title)) return false; // one entry per achievement or project
      seen.add(title);
      const d = norm(a.description);
      return !d || !jobText.includes(d.slice(0, 60));
    })
    .slice(0, 4);
  return { ...data, achievements };
}

/** The page's own top bar (the dashboard shows no site header or footer), with a way out. */
function ReportBar({ onExit, fileName, children }: { onExit: () => void; fileName?: string; children?: ReactNode }) {
  return (
    <header className="rpt-bar no-print">
      <button type="button" className="rpt-brand" onClick={onExit} aria-label="CVMind home">
        <img src={cvmindIcon} alt="" />
        <span>CVMind</span>
      </button>
      <span className="rpt-bar-sep" aria-hidden="true" />
      <span className="rpt-bar-title">Resume report</span>
      {fileName && <span className="rpt-file"><FileText size={13} /> {fileName}</span>}
      <div className="rpt-bar-actions">
        {children}
        <button type="button" className="rpt-btn rpt-btn--ghost rpt-exit" onClick={onExit} aria-label="Exit to the home page" title="Exit">
          <X size={16} /> <span>Exit</span>
        </button>
      </div>
    </header>
  );
}

/** Small ring used for the three sub-scores. */
function Ring({ value, size = 56 }: { value: number; size?: number }) {
  const r = 15.9155; // circumference of 100 so the dash maps straight to the score
  return (
    <svg className={`rpt-ring tone-${toneOf(value)}`} width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r={r} className="rpt-ring-track" />
      <circle cx="18" cy="18" r={r} className="rpt-ring-bar" style={{ strokeDasharray: `${value} 100` }} />
      <text x="18" y="21.5" textAnchor="middle">{value}</text>
    </svg>
  );
}

export default function Dashboard({ setCurrentPage, analysisResult, resumeText, resetAnalysis, customApiKey, isLoggedIn, setLoadedWork }: DashboardProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [part, setPart] = useState<PartId>('overview');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResume, setOptimizedResume] = useState('');
  const [optimizeError, setOptimizeError] = useState('');

  // template step
  const [useImproved, setUseImproved] = useState(true);
  const [parsed, setParsed] = useState<{ text: string; data: ExtractedResume } | null>(null);
  const [design, setDesign] = useState<{ templateId: string; html: string } | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [designBusy, setDesignBusy] = useState(false);
  const [designError, setDesignError] = useState('');
  const [handingOff, setHandingOff] = useState(false);
  const [waitingForSignIn, setWaitingForSignIn] = useState<string | null>(null);

  const fileExt = useMemo(() => (analysisResult?.fileName || '').split('.').pop()?.toLowerCase() || 'docx', [analysisResult?.fileName]);
  const signedIn = isLoggedIn ?? !!readUser();
  const sourceText = useImproved && optimizedResume ? optimizedResume : resumeText;

  const apiHeaders = useCallback((): Record<string, string> => (customApiKey ? { 'x-gemini-key': customApiKey } : {}), [customApiKey]);

  /** Reads the resume text into sections and fills the chosen template with it. */
  const applyTemplate = useCallback(async (templateId: string) => {
    if (designBusy || !sourceText) return;
    setPendingTemplate(templateId);
    setDesignBusy(true);
    setDesignError('');
    try {
      let source = parsed;
      if (!source || source.text !== sourceText) {
        source = { text: sourceText, data: tidyForTemplate(await parseResumeText(sourceText, apiHeaders(), true)) };
        setParsed(source);
      }
      setDesign({ templateId, html: await fillTemplate(source.data, templateId, apiHeaders()) });
    } catch (err) {
      setDesignError(getErrorMessage(err) || 'Could not put your resume in this template. Please try again.');
    } finally {
      setDesignBusy(false);
    }
  }, [designBusy, sourceText, parsed, apiHeaders]);

  const chooseTemplate = (templateId: string) => {
    if (!signedIn) {
      // templates need an account; carry on with this template as soon as the user signs in
      setWaitingForSignIn(templateId);
      window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
      return;
    }
    void applyTemplate(templateId);
  };

  useEffect(() => {
    if (!waitingForSignIn) return;
    const onUser = () => {
      if (!readUser()) return;
      const id = waitingForSignIn;
      setWaitingForSignIn(null);
      void applyTemplate(id);
    };
    window.addEventListener(USER_CHANGE_EVENT, onUser);
    return () => window.removeEventListener(USER_CHANGE_EVENT, onUser);
  }, [waitingForSignIn, applyTemplate]);

  if (!analysisResult) {
    return (
      <div className="rpt rpt-empty-wrap">
        <ReportBar onExit={() => setCurrentPage('home')} />
        <div className="rpt-empty">
          <span className="rpt-empty-icon"><FileSearch size={30} /></span>
          <h2>No resume checked yet</h2>
          <p>Upload your resume on the home page to get your ATS score and a full feedback report.</p>
          <button type="button" className="rpt-btn rpt-btn--primary" onClick={() => setCurrentPage('home')}>
            Check my resume <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  const { score, summary, atsKeywords, contentAndImpact, formattingAndStyle, strengths, weaknesses, recommendations } = analysisResult;
  const totalKeywords = atsKeywords.matched.length + atsKeywords.missing.length;
  const matchPct = totalKeywords ? Math.round((atsKeywords.matched.length / totalKeywords) * 100) : 0;
  const doneCount = recommendations.filter((_, i) => done[i]).length;
  const issueCount = weaknesses.length + atsKeywords.missing.length + contentAndImpact.suggestions.length;

  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    }).catch(() => { /* clipboard blocked */ });
  };

  const handleOptimize = async () => {
    if (!resumeText || optimizing) return;
    setOptimizing(true);
    setOptimizeError('');
    setOptimizedResume('');
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...apiHeaders() };
      const res = await authFetch(`${baseUrl}/api/optimize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ resumeText, analysisResult, fileName: analysisResult.fileName || 'Unknown Resume' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Optimization failed.');
      setOptimizedResume(data.data.optimizedResume);
      setUseImproved(true);
    } catch (err) {
      setOptimizeError(getErrorMessage(err) || 'Something went wrong.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleDownload = () => {
    const baseName = (analysisResult.fileName || 'resume').replace(/\.[^/.]+$/, '');
    if (fileExt === 'pdf') downloadResumeAsPdf(optimizedResume, `${baseName}_optimized.pdf`);
    else if (fileExt === 'txt') downloadResumeAsTxt(optimizedResume, `${baseName}_optimized.txt`);
    else downloadResumeAsDocx(optimizedResume, `${baseName}_optimized.docx`);
  };

  const openInEditor = async () => {
    if (!design?.html || handingOff) return;
    setHandingOff(true);
    const name = parsed?.data.personalInfo?.fullName?.trim();
    const title = (name ? `${name} - Resume` : `Resume - ${templateFor(design.templateId).name}`).slice(0, 120);
    const work = await workForEditor(design.html, design.templateId, title, 'resume-check');
    if (isCrossHost('resume-editor')) {
      window.location.assign(urlForPage('resume-editor') + workHash(work));
      return;
    }
    setLoadedWork?.(work);
    setCurrentPage('resume-editor');
  };

  const PARTS: { id: PartId; label: string; icon: typeof Target; score?: number; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutTemplate },
    { id: 'actions', label: 'Action plan', icon: ListChecks, badge: `${doneCount}/${recommendations.length}` },
    { id: 'keywords', label: 'ATS keywords', icon: Target, score: atsKeywords.score },
    { id: 'impact', label: 'Content & impact', icon: PenLine, score: contentAndImpact.score },
    { id: 'formatting', label: 'Formatting', icon: FileText, score: formattingAndStyle.score },
    { id: 'autofix', label: 'AI auto-fix', icon: Sparkles, badge: optimizedResume ? 'Ready' : undefined },
    { id: 'templates', label: 'Resume templates', icon: PencilLine },
  ];
  const index = PARTS.findIndex((p) => p.id === part);
  const prev = PARTS[index - 1];
  const next = PARTS[index + 1];

  const go = (id: PartId) => {
    setPart(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const partClass = (id: PartId) => `rpt-part${part === id ? ' is-active' : ''}`;

  return (
    <div className="rpt">
      {/* ── App bar (the dashboard has no site header or footer) ── */}
      <ReportBar onExit={() => setCurrentPage('home')} fileName={analysisResult.fileName}>
        <button type="button" className="rpt-btn rpt-btn--ghost" onClick={resetAnalysis}><RotateCcw size={15} /> <span>Check another</span></button>
        <button type="button" className="rpt-btn rpt-btn--ghost" onClick={() => window.print()}><Printer size={15} /> <span>Save report</span></button>
        <button type="button" className="rpt-btn rpt-btn--magic" onClick={() => go('autofix')}><Sparkles size={15} /> <span>Fix with AI</span></button>
      </ReportBar>

      <div className="rpt-layout">
        {/* ── Sidebar: score + parts ── */}
        <aside className="rpt-side">
          <div className="rpt-card rpt-score">
            <Gauge value={score} />
            <b className={`rpt-grade tone-${toneOf(score)}`}>{gradeOf(score)}</b>
            <p className="rpt-score-sub">
              {issueCount > 0 ? <><b>{issueCount}</b> things to improve</> : 'Nothing major to fix'}
            </p>
            {analysisResult.scoreChange && (
              <p className={`rpt-change is-${analysisResult.scoreChange.trend}`}>
                {analysisResult.scoreChange.trend === 'up' && <>Up {analysisResult.scoreChange.delta} since your last check</>}
                {analysisResult.scoreChange.trend === 'down' && <>Down {Math.abs(analysisResult.scoreChange.delta)} since your last check</>}
                {analysisResult.scoreChange.trend === 'same' && <>About the same as your last check ({analysisResult.scoreChange.previousScore})</>}
              </p>
            )}
          </div>

          <nav className="rpt-card rpt-nav no-print" aria-label="Report parts">
            {PARTS.map(({ id, label, icon: Icon, score: s, badge }, i) => (
              <button key={id} type="button" className={`rpt-nav-item${part === id ? ' is-active' : ''}`} onClick={() => go(id)} aria-current={part === id ? 'step' : undefined}>
                <span className="rpt-nav-step">{i + 1}</span>
                <Icon size={16} className="rpt-nav-icon" />
                <span className="rpt-nav-label">{label}</span>
                {s !== undefined && (
                  <span className={`rpt-nav-score tone-${toneOf(s)}`}>
                    <i><em style={{ width: `${s}%` }} /></i>{s}
                  </span>
                )}
                {badge && <span className={`rpt-nav-badge${badge === 'Ready' ? ' is-ready' : ''}`}>{badge}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── One part at a time ── */}
        <main className="rpt-main">
          <div className="rpt-part-head no-print">
            <span>Part {index + 1} of {PARTS.length}</span>
            <div className="rpt-part-dots" aria-hidden="true">
              {PARTS.map((p, i) => <i key={p.id} className={i <= index ? 'is-on' : ''} />)}
            </div>
          </div>

          {/* 1 · Overview */}
          <section className={partClass('overview')} aria-label="Overview">
            <div className="rpt-card rpt-overview">
              <div className="rpt-overview-text">
                <h2>Summary</h2>
                <p>{summary}</p>
              </div>
              <div className="rpt-subscores">
                {[
                  { id: 'keywords' as const, label: 'ATS keywords', value: atsKeywords.score },
                  { id: 'impact' as const, label: 'Content & impact', value: contentAndImpact.score },
                  { id: 'formatting' as const, label: 'Formatting', value: formattingAndStyle.score },
                ].map((s) => (
                  <button key={s.id} type="button" className="rpt-subscore" onClick={() => go(s.id)}>
                    <Ring value={s.value} />
                    <span>
                      <b>{s.label}</b>
                      <small className={`tone-${toneOf(s.value)}`}>{verdictOf(s.value)}</small>
                    </span>
                    <ArrowRight size={15} className="rpt-subscore-go no-print" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rpt-two">
              <div className="rpt-card rpt-list-card is-good">
                <h3><CheckCircle2 size={18} /> What&apos;s working</h3>
                <ul>{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div className="rpt-card rpt-list-card is-bad">
                <h3><XCircle size={18} /> What&apos;s holding it back</h3>
                <ul>{weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            </div>
          </section>

          {/* 2 · Action plan */}
          <section className={partClass('actions')} aria-label="Action plan">
            <div className="rpt-card">
              <div className="rpt-head">
                <div>
                  <h2><ClipboardList size={19} /> Action plan</h2>
                  <p>Work through these in order. Tick each one off as you fix it.</p>
                </div>
                <div className="rpt-progress-pill">
                  <i><em style={{ width: `${recommendations.length ? (doneCount / recommendations.length) * 100 : 0}%` }} /></i>
                  {doneCount}/{recommendations.length} done
                </div>
              </div>
              <ol className="rpt-checklist">
                {recommendations.map((rec, i) => (
                  <li key={i} className={done[i] ? 'is-done' : ''}>
                    <label>
                      <input type="checkbox" checked={!!done[i]} onChange={(e) => setDone((d) => ({ ...d, [i]: e.target.checked }))} />
                      <span className="rpt-check" aria-hidden="true"><Check size={13} /></span>
                      <span className="rpt-check-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="rpt-check-text">{rec}</span>
                    </label>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* 3 · ATS keywords */}
          <section className={partClass('keywords')} aria-label="ATS keywords">
            <div className="rpt-card">
              <div className="rpt-head">
                <div>
                  <h2><Target size={19} /> ATS keywords</h2>
                  <p>{atsKeywords.feedback}</p>
                </div>
                <span className={`rpt-score-chip tone-${toneOf(atsKeywords.score)}`}>{atsKeywords.score}/100</span>
              </div>

              {totalKeywords > 0 && (
                <div className="rpt-match">
                  <div className="rpt-match-top">
                    <span><b>{atsKeywords.matched.length}</b> of {totalKeywords} keywords found</span>
                    <span>{matchPct}% match</span>
                  </div>
                  <div className="rpt-match-bar"><span style={{ width: `${matchPct}%` }} /></div>
                </div>
              )}

              <div className="rpt-kw-cols">
                <div>
                  <h4 className="is-good">Found in your resume</h4>
                  {atsKeywords.matched.length ? (
                    <div className="rpt-chips">
                      {atsKeywords.matched.map((kw, i) => <span key={i} className="rpt-chip is-good"><Check size={12} /> {kw}</span>)}
                    </div>
                  ) : <p className="rpt-muted">No strong industry keywords were found yet.</p>}
                </div>
                <div>
                  <div className="rpt-kw-head">
                    <h4 className="is-bad">Missing, worth adding</h4>
                    {atsKeywords.missing.length > 0 && (
                      <button type="button" className="rpt-link no-print" onClick={() => copy(atsKeywords.missing.join(', '), 'kw')}>
                        {copied === 'kw' ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy all</>}
                      </button>
                    )}
                  </div>
                  {atsKeywords.missing.length ? (
                    <div className="rpt-chips">
                      {atsKeywords.missing.map((kw, i) => <span key={i} className="rpt-chip is-bad"><Plus size={12} /> {kw}</span>)}
                    </div>
                  ) : <p className="rpt-muted">Nothing important is missing.</p>}
                </div>
              </div>
            </div>
          </section>

          {/* 4 · Content & impact */}
          <section className={partClass('impact')} aria-label="Content and impact">
            <div className="rpt-card">
              <div className="rpt-head">
                <div>
                  <h2><PenLine size={19} /> Content &amp; impact</h2>
                  <p>{contentAndImpact.feedback}</p>
                </div>
                <span className={`rpt-score-chip tone-${toneOf(contentAndImpact.score)}`}>{contentAndImpact.score}/100</span>
              </div>

              {contentAndImpact.suggestions.length > 0 ? (
                <div className="rpt-rewrites">
                  {contentAndImpact.suggestions.map((sug, i) => (
                    <div key={i} className="rpt-rewrite">
                      <div className="rpt-rewrite-side is-before">
                        <span className="rpt-tag">Before</span>
                        <p>{sug.original}</p>
                      </div>
                      <div className="rpt-rewrite-side is-after">
                        <div className="rpt-rewrite-top">
                          <span className="rpt-tag">After</span>
                          <button type="button" className="rpt-link no-print" onClick={() => copy(sug.improved, `s${i}`)}>
                            {copied === `s${i}` ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                          </button>
                        </div>
                        <p>{sug.improved}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rpt-empty-note"><CheckCircle2 size={16} /> Your bullets already use strong verbs and numbers. No rewrites needed.</p>
              )}
            </div>
          </section>

          {/* 5 · Formatting */}
          <section className={partClass('formatting')} aria-label="Formatting">
            <div className="rpt-card">
              <div className="rpt-head">
                <div><h2><FileText size={19} /> Formatting &amp; layout</h2></div>
                <span className={`rpt-score-chip tone-${toneOf(formattingAndStyle.score)}`}>{formattingAndStyle.score}/100</span>
              </div>
              <p className="rpt-body">{formattingAndStyle.feedback}</p>
            </div>
          </section>

          {/* 6 · AI auto-fix */}
          <section className={`${partClass('autofix')} no-print`} aria-label="AI auto-fix">
            <div className="rpt-card rpt-fix">
              <div className="rpt-fix-intro">
                <span className="rpt-fix-icon"><Sparkles size={22} /></span>
                <div>
                  <h2>Let AI fix it for you</h2>
                  <p>
                    We rewrite the whole resume using this report: missing keywords go in, weak bullets get action verbs and
                    numbers, and sections are reordered. Then put it into one of our templates in the next step.
                  </p>
                  {atsKeywords.missing.length > 0 && (
                    <div className="rpt-chips rpt-fix-kws">
                      {atsKeywords.missing.slice(0, 8).map((kw, i) => <span key={i} className="rpt-chip is-soft">{kw}</span>)}
                      {atsKeywords.missing.length > 8 && <span className="rpt-chip is-soft">+{atsKeywords.missing.length - 8} more</span>}
                    </div>
                  )}
                </div>
              </div>

              {!optimizedResume && !optimizing && (
                <div className="rpt-fix-cta">
                  {optimizeError && <div className="rpt-error"><AlertTriangle size={16} /> {optimizeError}</div>}
                  {!resumeText && <p className="rpt-muted">The resume text is not available any more. Upload it again to use this.</p>}
                  <button type="button" className="rpt-btn rpt-btn--magic rpt-btn--lg" onClick={() => void handleOptimize()} disabled={!resumeText} id="optimize-generate-btn">
                    <Zap size={17} /> Generate improved resume
                  </button>
                </div>
              )}

              {optimizing && (
                <SkeletonLoader type="sidebar" title="Rewriting your resume…" subtitle="Adding keywords · Strengthening bullets · Reordering sections" card={false} />
              )}

              {optimizedResume && (
                <div className="rpt-fix-result">
                  <div className="rpt-fix-result-top">
                    <span className="rpt-ready"><Check size={14} /> Improved resume ready</span>
                    <div className="rpt-fix-actions">
                      <button type="button" className="rpt-btn" onClick={() => copy(optimizedResume, 'all')} id="optimize-copy-btn">
                        {copied === 'all' ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy all</>}
                      </button>
                      <button type="button" className="rpt-btn" onClick={() => void handleOptimize()}><RotateCcw size={15} /> Regenerate</button>
                      <button type="button" className="rpt-btn" onClick={handleDownload} id="optimize-download-btn">
                        <Download size={15} /> .{fileExt === 'pdf' || fileExt === 'txt' ? fileExt : 'docx'}
                      </button>
                    </div>
                  </div>
                  <div className="rpt-paper"><pre>{optimizedResume}</pre></div>
                  <div className="rpt-fix-next">
                    <div>
                      <b>Make it look great</b>
                      <span>Put this improved version into a designed template and keep editing it.</span>
                    </div>
                    <button type="button" className="rpt-btn rpt-btn--primary" onClick={() => go('templates')}>
                      Choose a template <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 7 · Templates */}
          <section className={`${partClass('templates')} no-print`} aria-label="Resume templates">
            {design || designBusy || designError ? (
              <div className="rpt-card rpt-design">
                <div className="rpt-head">
                  <div>
                    <h2><PencilLine size={19} /> {designBusy ? `Putting your resume into ${templateFor(pendingTemplate ?? undefined).name}…` : designError ? 'That did not work' : `Your resume in ${templateFor(design?.templateId).name}`}</h2>
                    <p>
                      {designBusy ? 'We sort it into sections and keep your facts exactly as they are. This usually takes 20 to 40 seconds.'
                        : designError ? designError
                          : 'Open it in the CVMind resume editor to change anything, download it, or try another design.'}
                    </p>
                  </div>
                  <button type="button" className="rpt-btn" onClick={() => { setDesign(null); setDesignError(''); }} disabled={designBusy}>
                    <ArrowLeft size={15} /> All templates
                  </button>
                </div>

                <div className="rpt-design-body">
                  <div className="rpt-design-sheet">
                    {design?.html ? (
                      <div className={designBusy ? 'is-busy' : undefined}>
                        <ResumeSheet html={design.html} title="Resume preview" />
                        {designBusy && <div className="rpt-sheet-busy"><Loader2 size={22} className="rpt-spin" /> Filling the template…</div>}
                      </div>
                    ) : (
                      <div className="rpt-sheet-empty">
                        {designBusy ? <Loader2 size={28} className="rpt-spin" /> : <FileText size={28} />}
                        <b>{designBusy ? 'Reading your resume' : 'No template yet'}</b>
                        <span>{designBusy ? 'Sorting it into experience, education, skills and more.' : 'Try again, or pick another template.'}</span>
                      </div>
                    )}
                  </div>

                  <aside className="rpt-design-side">
                    {design && !designBusy && (
                      <>
                        <button type="button" className="rpt-btn rpt-btn--primary rpt-btn--lg rpt-btn--block" disabled={handingOff} onClick={() => void openInEditor()}>
                          {handingOff ? <Loader2 size={17} className="rpt-spin" /> : <PencilLine size={17} />} Edit in Resume Editor
                        </button>
                        <button type="button" className="rpt-btn rpt-btn--block" onClick={() => downloadWord(exportHtml(design.html), (parsed?.data.personalInfo?.fullName || 'Resume').replace(/\s+/g, '_'))}>
                          <Download size={15} /> Download Word file
                        </button>
                        <p className="rpt-fine"><Lock size={12} /> It is saved to My Documents when you open the editor.</p>
                      </>
                    )}
                    {designError && !designBusy && pendingTemplate && (
                      <button type="button" className="rpt-btn rpt-btn--block" onClick={() => void applyTemplate(pendingTemplate)}><RefreshCw size={15} /> Try again</button>
                    )}
                    <div className="rpt-mini-head">Try another design</div>
                    <div className="rpt-mini-grid">
                      {RESUME_TEMPLATES.slice(0, 12).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`rpt-mini${(designBusy ? pendingTemplate : design?.templateId) === t.id ? ' is-current' : ''}`}
                          disabled={designBusy}
                          onClick={() => { if (t.id !== design?.templateId) void applyTemplate(t.id); }}
                          title={t.name}
                        >
                          <TemplatePreview html={t.html} name={t.name} />
                        </button>
                      ))}
                    </div>
                  </aside>
                </div>
              </div>
            ) : (
              <div className="rpt-card">
                <div className="rpt-head">
                  <div>
                    <h2><PencilLine size={19} /> Pick a template</h2>
                    <p>We put your resume into the design you pick, then you can edit every line in the CVMind resume editor.</p>
                  </div>
                </div>

                <div className="rpt-source" role="radiogroup" aria-label="Which version to use">
                  <button type="button" role="radio" aria-checked={useImproved && !!optimizedResume} className={useImproved && optimizedResume ? 'is-on' : ''} disabled={!optimizedResume} onClick={() => setUseImproved(true)}>
                    <Sparkles size={15} />
                    <span><b>AI-improved version</b><small>{optimizedResume ? 'From the AI auto-fix step' : 'Generate it in AI auto-fix first'}</small></span>
                  </button>
                  <button type="button" role="radio" aria-checked={!useImproved || !optimizedResume} className={!useImproved || !optimizedResume ? 'is-on' : ''} onClick={() => setUseImproved(false)}>
                    <FileText size={15} />
                    <span><b>My original resume</b><small>As you uploaded it</small></span>
                  </button>
                </div>

                {!optimizedResume && (
                  <button type="button" className="rpt-hint" onClick={() => go('autofix')}>
                    <Sparkles size={15} /> Want the fixes in too? Run <b>AI auto-fix</b> first <ArrowRight size={14} />
                  </button>
                )}

                {!signedIn && (
                  <div className="rpt-signin">
                    <Lock size={16} />
                    <span><b>Sign in to use templates.</b> Your resume is saved to My Documents so you can come back to it.</span>
                    <button type="button" className="rpt-btn rpt-btn--primary" onClick={() => window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))}>Sign in</button>
                  </div>
                )}

                {!sourceText ? (
                  <p className="rpt-muted">The resume text is not available any more. Upload it again to use a template.</p>
                ) : (
                  <div className="rpt-tpl-grid">
                    {RESUME_TEMPLATES.map((t) => (
                      <button key={t.id} type="button" className="rpt-tpl" onClick={() => chooseTemplate(t.id)} aria-label={`Use the ${t.name} template`}>
                        <span className="rpt-tpl-thumb">
                          <TemplatePreview html={t.html} name={t.name} />
                          <span className="rpt-tpl-use">{waitingForSignIn === t.id ? 'Sign in to continue' : 'Use this template'}</span>
                        </span>
                        <span className="rpt-tpl-name">{t.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Part navigation */}
          <div className="rpt-pager no-print">
            {prev ? (
              <button type="button" className="rpt-pager-btn" onClick={() => go(prev.id)}>
                <i className="rpt-pager-arrow"><ArrowLeft size={16} /></i>
                <span><small>Previous</small><b>{prev.label}</b></span>
              </button>
            ) : <span />}
            {next && (
              <button type="button" className="rpt-pager-btn is-next" onClick={() => go(next.id)}>
                <span><small>Next</small><b>{next.label}</b></span>
                <i className="rpt-pager-arrow"><ArrowRight size={16} /></i>
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

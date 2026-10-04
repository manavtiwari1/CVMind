import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, FileText, Home, Link2,
  LayoutTemplate, Loader2, Lock, PenLine, PencilLine, RefreshCw, Sparkles, SpellCheck, Undo2, Upload, X,
} from 'lucide-react';
import { Leo, Stepper } from '../components/ResumeOnboarding';
import ResumeDownload from '../components/ResumeDownload';
import ResumeSheet from '../components/ResumeSheet';
import TemplatePreview from '../components/TemplatePreview';
import { RESUME_TEMPLATES } from '../data/resumeTemplates';
import { authFetch } from '../lib/authFetch';
import { API_BASE } from '../lib/apiBase';
import { readUser } from '../lib/currentUser';
import { cvFileError, isLink } from '../lib/jobInput';
import { DEFAULT_TEMPLATE, downloadWord, fillTemplate, htmlToText, parseResumeText, templateFor, workForEditor } from '../lib/resumeHandoff';
import { parseSavedContent } from '../utils/savedWork';
import { getErrorMessage } from '../utils/errors';
import type { ExtractedResume, LoadedWork } from '../types/api';
import '../components/ResumeOnboarding.css';
import './Tailor.css';
import './Proofreading.css';

interface ProofreadingProps {
  customApiKey: string;
  /** The resume text the app already has (from the Resume Checker or an earlier run) */
  resumeText: string;
  setCurrentPage: (page: string) => void;
  loadedWork: LoadedWork | null;
  setLoadedWork: (work: LoadedWork | null) => void;
  /** Hides the site chrome while Leo's guided flow is open. */
  onFocusChange?: (mode: false | 'flow') => void;
}

// /api/ai/proofread (schema in backend/src/services/gemini.js)
interface ProofreadChange {
  type: string;
  original: string;
  corrected: string;
  explanation: string;
}

interface ProofreadResult {
  correctedText: string;
  score: number;
  summary: string;
  changes: ProofreadChange[];
  stats?: {
    grammarFixes?: number;
    spellingFixes?: number;
    passiveToActive?: number;
    verbUpgrades?: number;
    toneAlignments?: number;
  };
}

// What the server saves for a proofread run (backend/src/index.js /api/ai/proofread)
interface SavedProofread {
  industry?: string;
  documentType?: string;
  fileName?: string;
  originalText?: string;
  result?: ProofreadResult;
}

// Leo's guided steps; null shows the intro page (or the result)
type Flow = null | 'text' | 'setup' | 'working';
const FLOW_DOT: Record<Exclude<Flow, null>, number> = { text: 1, setup: 2, working: 3 };
type Source = 'saved' | 'text' | 'file' | 'link';

const DOC_TYPES = ['Resume', 'Cover letter', 'LinkedIn summary', 'Email', 'Other text'];
const INDUSTRIES = ['General', 'Technology', 'Finance', 'Healthcare', 'Marketing', 'Engineering', 'Education', 'Legal', 'Sales', 'Design'];
const PHASES = ['Reading your text', 'Fixing grammar and spelling', 'Strengthening verbs and tone'];
const MIN_CHARS = 20;
const NO_CHANGES: ProofreadChange[] = [];

// One tone per kind of change; grammar and punctuation share one, as do tone and clarity
const KINDS: Record<string, { label: string; tone: string }> = {
  grammar: { label: 'Grammar', tone: 'blue' },
  punctuation: { label: 'Punctuation', tone: 'blue' },
  spelling: { label: 'Spelling', tone: 'red' },
  passive_voice: { label: 'Active voice', tone: 'purple' },
  weak_verb: { label: 'Stronger verb', tone: 'green' },
  tone: { label: 'Tone', tone: 'amber' },
  clarity: { label: 'Clarity', tone: 'amber' },
};
const kindOf = (type: string) => KINDS[type] ?? { label: type.replace(/_/g, ' '), tone: 'amber' };

const STEPS = [
  { icon: Upload, title: 'Add your text', text: 'Paste it, upload a PDF, DOCX or TXT, or link to it. Your resume works too.' },
  { icon: PenLine, title: 'Tell Leo what it is', text: 'A resume, cover letter, LinkedIn summary or email, and the industry it is for.' },
  { icon: CheckCircle2, title: 'Review every change', text: 'See each fix with the reason. Keep your original wording wherever you prefer it.' },
];

const FIXES = [
  'Grammar, spelling and punctuation',
  'Passive sentences turned active',
  'Weak verbs like "helped" or "worked on" made specific',
  'Tone matched to your industry',
  'Wordy sentences made shorter',
];
const KEPT = [
  'Your facts, names, dates and numbers',
  'What you meant to say',
  'Your structure and line order',
  'The final say: undo any change with one click',
];

const FAQS = [
  { q: 'What can Leo proofread?', a: 'Any professional writing: a resume, cover letter, LinkedIn summary, email or statement. Paste the text, upload a PDF, DOCX or TXT file (up to 5 MB), or paste a Google Drive, Dropbox or OneDrive link.' },
  { q: 'Will it change my facts?', a: 'The AI is told to keep your meaning and not to add numbers or details you never wrote. It can still get things wrong, so every change is listed with the reason, and you can keep your original wording for any of them before you copy or download.' },
  { q: 'What does the score mean?', a: 'It is the AI\'s estimate of how polished your original text was, from 0 to 100. Use it as a rough guide, not a grade a recruiter would give.' },
  { q: 'Is my text saved?', a: 'Your text is sent to our AI provider to proofread it. When you are signed in, the result is saved to My Documents so you can reopen it. We also keep a usage record (industry, length and number of fixes). We don\'t sell your data.' },
];

function scoreBand(score: number) {
  if (score >= 80) return { tone: 'good', label: 'Already polished', text: 'Your original was in good shape. The changes below are mostly finishing touches.' };
  if (score >= 60) return { tone: 'ok', label: 'A few things to fix', text: 'A solid draft with some errors and weak phrasing. Check the changes below before you send it.' };
  return { tone: 'low', label: 'Needed a careful pass', text: 'There was a lot to fix. Read the corrected version through once before you use it.' };
}

/** The corrected text with any changes the user turned down put back to their original wording. */
function applyChoices(corrected: string, changes: ProofreadChange[], kept: Set<number>): string {
  let out = corrected;
  changes.forEach((c, i) => {
    if (kept.has(i) && c.corrected && out.includes(c.corrected)) out = out.replace(c.corrected, c.original);
  });
  return out;
}

type Segment = { text: string; change?: number };

/** Splits the final text into plain runs and the runs each change touched, for highlighting. */
function segmentsFor(text: string, changes: ProofreadChange[], kept: Set<number>): Segment[] {
  const ranges: { start: number; end: number; change: number }[] = [];
  changes.forEach((c, i) => {
    const needle = kept.has(i) ? c.original : c.corrected;
    if (!needle?.trim()) return;
    let from = 0;
    while (from <= text.length) {
      const at = text.indexOf(needle, from);
      if (at < 0) return;
      const end = at + needle.length;
      if (!ranges.some(r => at < r.end && end > r.start)) { ranges.push({ start: at, end, change: i }); return; }
      from = at + 1;
    }
  });
  ranges.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start > pos) out.push({ text: text.slice(pos, r.start) });
    out.push({ text: text.slice(r.start, r.end), change: r.change });
    pos = r.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

/** The CVMind templates one at a time, with arrows and a strip of thumbnails. */
function TemplateSlider({ title, current, busy = false, onUse }: { title: string; current?: string; busy?: boolean; onUse: (id: string) => void }) {
  const count = RESUME_TEMPLATES.length;
  const [index, setIndex] = useState(() => {
    const at = RESUME_TEMPLATES.findIndex(t => t.id === (current || DEFAULT_TEMPLATE));
    return at < 0 ? 0 : at;
  });
  const stripRef = useRef<HTMLDivElement>(null);
  const t = RESUME_TEMPLATES[index];
  const isCurrent = t.id === current;
  const go = (step: number) => setIndex(n => (n + step + count) % count);

  // Keep the chosen thumbnail in view; scrolls the strip only, never the page
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (strip && thumb) strip.scrollTo({ left: thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2, behavior: 'smooth' });
  }, [index]);

  return (
    <section
      id="prf-slider"
      className="tlr-card prf-slider"
      aria-roledescription="carousel"
      aria-label="Resume templates"
      onKeyDown={e => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); }}
    >
      <div className="prf-slider-head">
        <h3>{title}</h3>
        <small>{index + 1} / {count}</small>
      </div>
      <p className="prf-slider-sub">Leo copies your proofread resume, with the fixes you kept, into the one you pick.</p>
      <div className="prf-slide" style={{ '--t': t.accent } as React.CSSProperties}>
        <button type="button" className="prf-slide-nav is-prev" onClick={() => go(-1)} aria-label="Previous template"><ChevronLeft size={20} /></button>
        <div className="prf-slide-art" key={t.id} aria-live="polite">
          <TemplatePreview html={t.html} name={t.name} eager aspect="1 / 1.25" />
        </div>
        <button type="button" className="prf-slide-nav is-next" onClick={() => go(1)} aria-label="Next template"><ChevronRight size={20} /></button>
      </div>
      <div className="prf-slide-name">
        <strong>{t.name}</strong>
        {isCurrent ? <span className="tlr-tag">In use</span> : t.id === DEFAULT_TEMPLATE && <span className="tlr-tag">Recommended</span>}
      </div>
      <div className="prf-strip" ref={stripRef}>
        {RESUME_TEMPLATES.map((x, n) => (
          <button key={x.id} type="button" className={`tlr-mini${n === index ? ' is-on' : ''}`} onClick={() => setIndex(n)} aria-label={x.name} aria-pressed={n === index}>
            <TemplatePreview html={x.html} name={x.name} aspect="1 / 1.2" />
          </button>
        ))}
      </div>
      <button type="button" className="tlr-btn tlr-btn--purple tlr-btn--block" disabled={busy || isCurrent} onClick={() => onUse(t.id)}>
        {busy ? <><Loader2 size={17} className="tlr-spin" /> Filling the template…</> : isCurrent ? <><Check size={17} /> Using {t.name}</> : <><LayoutTemplate size={17} /> Use {t.name}</>}
      </button>
    </section>
  );
}

export default function Proofreading({ customApiKey, resumeText: appResumeText, setCurrentPage, loadedWork, setLoadedWork, onFocusChange }: ProofreadingProps) {
  const hasAppResume = appResumeText.trim().length >= 50;
  const [flow, setFlow] = useState<Flow>(null);
  const [source, setSource] = useState<Source>(hasAppResume ? 'saved' : 'text');
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [docType, setDocType] = useState('Resume');
  const [industry, setIndustry] = useState('General');
  const [phase, setPhase] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ProofreadResult | null>(null);
  const [originalText, setOriginalText] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [kept, setKept] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'corrected' | 'original'>('corrected');
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The proofread resume in a CVMind template, shown after the review
  const [designOpen, setDesignOpen] = useState(false);
  // Exit from the result goes back to the intro; the result stays one click away
  const [atIntro, setAtIntro] = useState(false);
  const [design, setDesign] = useState<{ templateId: string; html: string } | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState('');
  const [designBusy, setDesignBusy] = useState(false);
  const [designError, setDesignError] = useState<string | null>(null);
  const [showDownload, setShowDownload] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  // Structured data read from the final text; read again only when the text changes
  const [parsed, setParsed] = useState<{ text: string; data: ExtractedResume } | null>(null);

  useEffect(() => {
    // Leo's questions and his results run full-screen in the app, without the site header and footer
    onFocusChange?.(flow || (result && !atIntro) ? 'flow' : false);
  }, [flow, result, atIntro, onFocusChange]);
  useEffect(() => () => onFocusChange?.(false), [onFocusChange]);

  // Full-bleed sections, like the Resume Tailorer
  useEffect(() => {
    const main = document.querySelector('.main-content') as HTMLElement | null;
    if (!main) return;
    main.style.maxWidth = 'none';
    main.style.padding = '0';
    main.style.margin = '0';
    return () => {
      main.style.maxWidth = '';
      main.style.padding = '';
      main.style.margin = '';
    };
  }, []);

  useEffect(() => {
    if (flow !== 'working' || errorMsg) return;
    const timers = [setTimeout(() => setPhase(1), 3000), setTimeout(() => setPhase(2), 9000)];
    return () => timers.forEach(clearTimeout);
  }, [flow, errorMsg]);

  const showResult = (data: ProofreadResult, original: string) => {
    setResult({ ...data, changes: Array.isArray(data.changes) ? data.changes : [] });
    setOriginalText(original);
    setKept(new Set());
    setView('corrected');
    setFilter('all');
    setActive(null);
    setDesignOpen(false);
    setDesign(null);
    setDesignError(null);
    setParsed(null);
    setAtIntro(false);
  };

  // Reopen a saved proofread from My Documents. Local state is adjusted during render;
  // clearing the parent's one-shot loadedWork happens in the effect below.
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (!loadedWork.deleted && loadedWork.type === 'proofread') {
      const saved = parseSavedContent<SavedProofread>(loadedWork.htmlContent);
      if (saved?.result?.correctedText) {
        showResult(saved.result, saved.originalText || '');
        setIndustry(saved.industry || 'General');
        setDocType(saved.documentType || '');
        setSourceName(saved.fileName || '');
        setErrorMsg(null);
        setFlow(null);
      }
    }
  }
  useEffect(() => {
    if (loadedWork) setLoadedWork(null);
  }, [loadedWork, setLoadedWork]);

  const validateFile = (file: File) => {
    const problem = cvFileError(file);
    setErrorMsg(problem);
    if (!problem) { setSelectedFile(file); setSource('file'); }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDrag(e);
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateFile(e.dataTransfer.files[0]);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openFlow = (step: Exclude<Flow, null> = 'text') => {
    setErrorMsg(null);
    setFlow(step);
    window.scrollTo({ top: 0 });
  };

  const goToStep = (step: Exclude<Flow, null>) => {
    setErrorMsg(null);
    setFlow(step);
  };

  const pickSource = (s: Source) => {
    setSource(s);
    setErrorMsg(null);
    // Pasted text is more often a cover letter or email; files and links are usually a resume
    if (s !== 'text') setDocType('Resume');
  };

  const textReady = source === 'saved' ? hasAppResume
    : source === 'file' ? Boolean(selectedFile)
      : source === 'link' ? isLink(resumeUrl)
        : inputText.trim().length >= MIN_CHARS;

  const proofread = async () => {
    setFlow('working');
    setPhase(0);
    setErrorMsg(null);

    const form = new FormData();
    if (source === 'file' && selectedFile) form.append('resume', selectedFile);
    else if (source === 'link') form.append('resumeUrl', resumeUrl.trim());
    else form.append('text', source === 'saved' ? appResumeText.trim() : inputText.trim());
    form.append('industry', industry);
    if (docType) form.append('documentType', docType);
    const headers: Record<string, string> = customApiKey ? { 'x-gemini-key': customApiKey } : {};

    try {
      const res = await authFetch(`${API_BASE}/api/ai/proofread`, { method: 'POST', headers, body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Proofreading failed. Please try again.');
      const data: ProofreadResult | undefined = body.data;
      if (!data?.correctedText) throw new Error('Leo could not finish proofreading this. Please try again.');
      const original = typeof body.extractedText === 'string' ? body.extractedText
        : source === 'saved' ? appResumeText.trim() : inputText.trim();
      showResult(data, original);
      setSourceName(source === 'file' ? selectedFile?.name || '' : source === 'link' ? 'Linked file' : source === 'saved' ? 'Your saved resume' : '');
      setFlow(null);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || 'Something went wrong on our side. Please try again in a moment.');
    }
  };

  const reset = () => {
    setResult(null);
    setDesignOpen(false);
    setDesign(null);
    setParsed(null);
    setOriginalText('');
    setInputText('');
    setResumeUrl('');
    setSourceName('');
    removeFile();
    openFlow('text');
  };

  const changes = result?.changes ?? NO_CHANGES;
  const finalText = useMemo(() => (result ? applyChoices(result.correctedText, changes, kept) : ''), [result, changes, kept]);
  const segments = useMemo(() => segmentsFor(finalText, changes, kept), [finalText, changes, kept]);
  // A change can only be undone when its new wording is found in the corrected text
  const undoable = useMemo(() => changes.map(c => Boolean(c.corrected) && Boolean(result?.correctedText.includes(c.corrected))), [changes, result]);

  const toggleKeep = (i: number) => {
    setKept(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(finalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMsg('Your browser blocked copying. Select the text and copy it instead.');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([finalText], { type: 'text/plain;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${docType || 'Text'} - proofread.txt` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const showChange = (i: number) => {
    setActive(i);
    setFilter('all');
    document.getElementById(`prf-change-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const apiHeaders = (): Record<string, string> => (customApiKey ? { 'x-gemini-key': customApiKey } : {});

  /** Reads the proofread resume (with the user's choices) and fills the chosen template with it. */
  const applyTemplate = async (tid: string) => {
    if (designBusy) return;
    setPendingTemplate(tid);
    setDesignOpen(true);
    setDesignBusy(true);
    setDesignError(null);
    window.scrollTo({ top: 0 });
    try {
      let source = parsed;
      if (!source || source.text !== finalText) {
        source = { text: finalText, data: await parseResumeText(finalText, apiHeaders()) };
        setParsed(source);
      }
      setDesign({ templateId: tid, html: await fillTemplate(source.data, tid, apiHeaders()) });
    } catch (err) {
      setDesignError(getErrorMessage(err) || 'Could not put your resume in this template. Please try again.');
    } finally {
      setDesignBusy(false);
    }
  };

  const exitToIntro = () => {
    setAtIntro(true);
    setDesignOpen(false);
    setDesignError(null);
    window.scrollTo({ top: 0 });
  };

  const openInEditor = async () => {
    if (!design?.html || handingOff) return;
    setHandingOff(true);
    const name = parsed?.data.personalInfo?.fullName?.trim();
    const title = (name ? `${name} - Proofread Resume` : `Proofread Resume - ${templateFor(design.templateId).name}`).slice(0, 120);
    setLoadedWork(await workForEditor(design.html, design.templateId, title, 'proofread'));
    setCurrentPage('resume-editor');
  };

  // ── LEO'S GUIDED FLOW ────────────────────────────────────────
  if (flow) {
    return (
      <div className="ro-page tlr tlr-flow prf prf-flow">
        <button type="button" className="tlr-flow-exit" onClick={() => { setFlow(null); setErrorMsg(null); }} disabled={flow === 'working' && !errorMsg} aria-label="Exit AI Proofreading">
          Exit <X size={15} />
        </button>
        <Stepper active={FLOW_DOT[flow]} total={3} />

        {flow === 'text' && (
          <div className="ro-center ro-stage">
            <Leo pose="checklist" />
            <h1 className="ro-title">Hi, I'm Leo. I'll proofread your writing. What should I check?</h1>
            <div className={`tlr-toggle tlr-flow-toggle prf-source${hasAppResume ? ' has-4' : ' has-3'}`} role="tablist" aria-label="How to add your text">
              {hasAppResume && (
                <button type="button" role="tab" aria-selected={source === 'saved'} className={source === 'saved' ? 'is-on' : ''} onClick={() => pickSource('saved')}>
                  <FileText size={14} /> My resume
                </button>
              )}
              <button type="button" role="tab" aria-selected={source === 'text'} className={source === 'text' ? 'is-on' : ''} onClick={() => pickSource('text')}>
                <PenLine size={14} /> Paste text
              </button>
              <button type="button" role="tab" aria-selected={source === 'file'} className={source === 'file' ? 'is-on' : ''} onClick={() => pickSource('file')}>
                <Upload size={14} /> Upload file
              </button>
              <button type="button" role="tab" aria-selected={source === 'link'} className={source === 'link' ? 'is-on' : ''} onClick={() => pickSource('link')}>
                <Link2 size={14} /> Paste link
              </button>
            </div>
            <div className="tlr-flow-box prf-box">
              {source === 'saved' && (
                <div className="tlr-file">
                  <FileText size={22} />
                  <div><strong>The resume you already added</strong><small>{appResumeText.trim().slice(0, 70)}…</small></div>
                </div>
              )}
              {source === 'text' && (
                <>
                  <textarea
                    className="tlr-textarea prf-paste"
                    placeholder="Paste your resume, cover letter, LinkedIn summary, email or any professional text"
                    value={inputText}
                    onChange={e => { setInputText(e.target.value); setErrorMsg(null); }}
                    aria-label="Text to proofread"
                    autoFocus
                  />
                  <small className="prf-count">
                    {inputText.trim().length < MIN_CHARS ? `At least ${MIN_CHARS} characters` : `${inputText.trim().split(/\s+/).length} words`}
                  </small>
                </>
              )}
              {source === 'file' && (selectedFile ? (
                <div className="tlr-file">
                  <FileText size={22} />
                  <div><strong>{selectedFile.name}</strong><small>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</small></div>
                  <button type="button" onClick={removeFile} aria-label="Remove file"><X size={16} /></button>
                </div>
              ) : (
                <label className={`tlr-drop${dragActive ? ' is-drag' : ''}`} onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={e => e.target.files?.[0] && validateFile(e.target.files[0])} />
                  <Upload size={22} />
                  <span><b>Choose a file</b> or drag it here</span>
                  <small>PDF, DOCX or TXT · up to 5 MB</small>
                </label>
              ))}
              {source === 'link' && (
                <input
                  type="url"
                  className="tlr-input"
                  placeholder="https://drive.google.com/… or a direct PDF/DOCX link"
                  value={resumeUrl}
                  onChange={e => setResumeUrl(e.target.value)}
                  aria-label="Link to your file"
                  autoFocus
                />
              )}
            </div>
            {errorMsg && <p className="ro-error"><AlertTriangle size={14} /> {errorMsg}</p>}
            <button type="button" className="ro-btn ro-btn--green" disabled={!textReady} onClick={() => goToStep('setup')}>Next <ArrowRight size={16} /></button>
          </div>
        )}

        {flow === 'setup' && (
          <div className="ro-center ro-stage">
            <Leo pose="thinking" />
            <h1 className="ro-title">What is it, and which industry is it for?</h1>
            <p className="ro-sub">I'll match the tone to what you're writing and who will read it.</p>
            <div className="prf-setup">
              <fieldset>
                <legend>It's a…</legend>
                <div className="prf-chips">
                  {DOC_TYPES.map(d => <button key={d} type="button" className={docType === d ? 'is-on' : ''} aria-pressed={docType === d} onClick={() => setDocType(d)}>{d}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend>Industry</legend>
                <div className="prf-chips">
                  {INDUSTRIES.map(ind => <button key={ind} type="button" className={industry === ind ? 'is-on' : ''} aria-pressed={industry === ind} onClick={() => setIndustry(ind)}>{ind}</button>)}
                </div>
              </fieldset>
            </div>
            <button type="button" className="ro-btn ro-btn--green" onClick={proofread}><SpellCheck size={16} /> Proofread it</button>
            <button type="button" className="ro-link" onClick={() => goToStep('text')}>← Go back</button>
          </div>
        )}

        {flow === 'working' && (
          <div className="ro-center ro-stage">
            <Leo pose={errorMsg ? 'thinking' : 'typing'} />
            {errorMsg ? (
              <>
                <h1 className="ro-title">Something went wrong while proofreading.</h1>
                <p className="ro-error"><AlertTriangle size={14} /> {errorMsg}</p>
                <div className="ro-actions">
                  <button type="button" className="ro-btn ro-btn--green" onClick={proofread}><RefreshCw size={15} /> Try again</button>
                  <button type="button" className="ro-btn ro-btn--purple" onClick={() => goToStep('text')}>Change my text</button>
                </div>
              </>
            ) : (
              <>
                <h1 className="ro-title">I'm reading every sentence…</h1>
                <ul className="tlr-phases" aria-live="polite">
                  {PHASES.map((p, i) => (
                    <li key={p} className={i < phase ? 'is-done' : i === phase ? 'is-on' : ''}>
                      {i < phase ? <CheckCircle2 size={17} /> : i === phase ? <Loader2 size={17} className="ro-spin" /> : <span className="tlr-phase-dot" />}
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="ro-sub">This usually takes 10 to 30 seconds, longer for a full resume.</p>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const appBar = (back: React.ReactNode) => (
    <div className="prf-bar">
      {back}
      <span className="prf-bar-title"><SpellCheck size={16} /> AI Proofreading</span>
      <button type="button" className="prf-exit" onClick={exitToIntro} aria-label="Exit AI Proofreading">Exit <X size={15} /></button>
    </div>
  );

  // ── THE PROOFREAD RESUME IN A TEMPLATE ───────────────────────
  if (result && !atIntro && designOpen) {
    const target = templateFor(designBusy || !design ? pendingTemplate : design.templateId);
    const personName = parsed?.data.personalInfo?.fullName?.trim();
    const ready = Boolean(design?.html) && !designBusy && !designError;
    return (
      <div className="tlr tlr-result prf prf-result prf-app">
        <div className="tlr-wrap">
          {appBar(
            <button type="button" className="tlr-back" onClick={() => { setDesignOpen(false); setDesignError(null); window.scrollTo({ top: 0 }); }}>
              <ArrowLeft size={16} /> Back to the changes
            </button>,
          )}

          <section className="tlr-done">
            <div className="tlr-done-leo"><Leo pose="typing" /></div>
            <div className="tlr-done-copy">
              <h1>
                {designBusy ? `I'm putting your proofread resume into ${target.name}…`
                  : designError ? 'Something went wrong while filling the template.'
                    : `Done! Your proofread resume is in the ${target.name} template.`}
              </h1>
              <p>
                {designBusy ? 'Every fix you kept goes in, and your facts stay as they are. This usually takes 20 to 40 seconds.'
                  : designError ? designError
                    : 'Download it now, or open it in the CVMind resume editor to keep working on it.'}
              </p>
              <div className="tlr-done-actions">
                {ready && (
                  <>
                    <button type="button" className="tlr-btn" onClick={() => setShowDownload(true)}><Download size={17} /> Download</button>
                    <button type="button" className="tlr-btn tlr-btn--purple" disabled={handingOff} onClick={openInEditor}>
                      {handingOff ? <Loader2 size={17} className="tlr-spin" /> : <PencilLine size={17} />} Edit in CVMind Resume Editor
                    </button>
                  </>
                )}
                {designError && !designBusy && (
                  <button type="button" className="tlr-btn" onClick={() => applyTemplate(pendingTemplate)}><RefreshCw size={17} /> Try again</button>
                )}
              </div>
              <p className="tlr-fine"><Lock size={12} /> The cvmind.in · Powered by CVMind footer stays on every page.{readUser() ? '' : ' Sign in to save it to My Documents.'}</p>
            </div>
          </section>

          <div className="prf-layout">
            <div className="tlr-paper">
              {design?.html ? (
                <div className={designBusy ? 'is-busy' : undefined}>
                  <ResumeSheet html={design.html} title="Proofread resume preview" />
                  {designBusy && <div className="tlr-paper-busy"><Loader2 size={22} className="tlr-spin" /> Filling the template…</div>}
                </div>
              ) : (
                <div className="tlr-paper-empty">
                  {designBusy ? <Loader2 size={28} className="tlr-spin" /> : <FileText size={28} />}
                  <h3>{designBusy ? 'Reading your proofread resume' : 'No template yet'}</h3>
                  <p>{designBusy ? 'Leo is sorting it into sections: experience, education, skills and more.' : 'Try again, or pick another template on the right.'}</p>
                </div>
              )}
            </div>

            <aside className="prf-side">
              <TemplateSlider
                title="Try another template"
                current={designBusy ? pendingTemplate : design?.templateId}
                busy={designBusy}
                onUse={id => { if (id !== design?.templateId || !design?.html) applyTemplate(id); }}
              />
              <section className="tlr-card">
                <h3>What goes in</h3>
                <ul className="tlr-list">
                  <li><CheckCircle2 size={15} />{kept.size ? `${changes.length - kept.size} of ${changes.length} fixes, the ones you kept` : `All ${changes.length} fixes from the proofread`}</li>
                  <li><CheckCircle2 size={15} />Your companies, titles, dates and degrees as you wrote them</li>
                  <li><CheckCircle2 size={15} />Laid out in sections, ready to edit line by line</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>

        {showDownload && design?.html && (
          <ResumeDownload
            defaultName={personName ? `${personName} Resume` : 'Proofread Resume'}
            paper="a4"
            getHtml={() => design.html}
            getText={() => htmlToText(design.html)}
            customApiKey={customApiKey}
            onWord={name => downloadWord(design.html, name)}
            onClose={() => setShowDownload(false)}
          />
        )}
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────
  if (result && !atIntro) {
    const score = Math.max(0, Math.min(100, Math.round(result.score || 0)));
    const band = scoreBand(score);
    const used = changes.length - kept.size;
    const kinds = Array.from(new Set(changes.map(c => kindOf(c.type).label)));
    const counts = [
      { label: 'Grammar & punctuation', n: result.stats?.grammarFixes, tone: 'blue' },
      { label: 'Spelling', n: result.stats?.spellingFixes, tone: 'red' },
      { label: 'Active voice', n: result.stats?.passiveToActive, tone: 'purple' },
      { label: 'Stronger verbs', n: result.stats?.verbUpgrades, tone: 'green' },
      { label: 'Tone & clarity', n: result.stats?.toneAlignments, tone: 'amber' },
    ].map(c => ({ ...c, n: Number(c.n) || 0 }));
    const maxCount = Math.max(1, ...counts.map(c => c.n));
    const what = docType ? docType.toLowerCase() : 'text';
    const isResume = docType === 'Resume';
    const listed = changes.map((c, i) => ({ c, i })).filter(({ c }) => filter === 'all' || kindOf(c.type).label === filter);

    return (
      <div className="tlr tlr-result prf prf-result prf-app">
        <div className="tlr-wrap">
          {appBar(<button type="button" className="tlr-back" onClick={reset}><ArrowLeft size={16} /> Proofread something else</button>)}

          <section className="tlr-done">
            <div className="tlr-done-leo"><Leo pose="cheer" /></div>
            <div className="tlr-done-copy">
              <h1>{changes.length ? `Done! I made ${changes.length} ${changes.length === 1 ? 'improvement' : 'improvements'} to your ${what}.` : `Your ${what} already reads well.`}</h1>
              <p>{result.summary || 'Your corrected text and every change are below.'}</p>
              <small className="tlr-done-meta">
                {[docType, industry !== 'General' ? industry : '', sourceName].filter(Boolean).join(' · ')}
              </small>
              <div className="tlr-done-actions">
                <button type="button" className="tlr-btn" onClick={copyText}>{copied ? <><Check size={17} /> Copied</> : <><Copy size={17} /> Copy the corrected text</>}</button>
                <button type="button" className="tlr-btn tlr-btn--outline" onClick={download}><Download size={17} /> Download .txt</button>
                {isResume && (
                  <button type="button" className="tlr-btn tlr-btn--purple prf-to-slider" onClick={() => document.getElementById('prf-slider')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                    <LayoutTemplate size={17} /> Put it in a template
                  </button>
                )}
              </div>
              <p className="tlr-fine">
                {kept.size > 0 ? `Using ${used} of ${changes.length} changes. You kept your original wording for ${kept.size}.` : 'Don\'t like a change? Keep your original wording for it.'}
                {readUser() ? '' : ' Sign in to save it to My Documents.'}
              </p>
            </div>
          </section>

          {errorMsg && <div className="tlr-error" role="alert"><AlertTriangle size={16} /> {errorMsg}</div>}

          <div className="prf-layout">
            <div className="prf-main">
              {changes.length > 0 && (
                <section className="prf-changes">
                  <div className="prf-changes-head">
                    <h2>Leo's changes <span>{changes.length}</span></h2>
                    {kinds.length > 1 && (
                      <div className="prf-filter" role="group" aria-label="Filter changes">
                        {['all', ...kinds].map(k => (
                          <button key={k} type="button" className={filter === k ? 'is-on' : ''} aria-pressed={filter === k} onClick={() => setFilter(k)}>
                            {k === 'all' ? 'All' : k}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="prf-changes-list">
                    {listed.map(({ c, i }) => {
                      const kind = kindOf(c.type);
                      const isKept = kept.has(i);
                      return (
                        <article key={i} id={`prf-change-${i}`} className={`prf-change prf-tone--${kind.tone}${isKept ? ' is-kept' : ''}${active === i ? ' is-active' : ''}`} onMouseEnter={() => setActive(i)}>
                          <div className="prf-change-top">
                            <span className="prf-kind">{kind.label}</span>
                            {undoable[i] && (
                              <button type="button" className="prf-keep" onClick={() => toggleKeep(i)} aria-pressed={isKept}>
                                {isKept ? <><Sparkles size={13} /> Use Leo's version</> : <><Undo2 size={13} /> Keep my original</>}
                              </button>
                            )}
                          </div>
                          <div className="prf-diff">
                            <del>{c.original}</del>
                            <ArrowRight size={15} aria-hidden="true" />
                            <ins>{c.corrected}</ins>
                          </div>
                          <p>{c.explanation}</p>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="prf-doc">
                <header className="prf-doc-head">
                  {originalText ? (
                    <div className="tlr-toggle prf-view" role="tablist" aria-label="Which version to show">
                      <button type="button" role="tab" aria-selected={view === 'corrected'} className={view === 'corrected' ? 'is-on' : ''} onClick={() => setView('corrected')}>Corrected</button>
                      <button type="button" role="tab" aria-selected={view === 'original'} className={view === 'original' ? 'is-on' : ''} onClick={() => setView('original')}>Your original</button>
                    </div>
                  ) : <h2>Corrected text</h2>}
                  {view === 'corrected' && changes.length > 0 && <small>Highlighted words were changed. Click one to see why.</small>}
                </header>
                <div className="prf-doc-body">
                  {view === 'original' ? originalText : segments.map((s, k) => (s.change === undefined ? s.text : (
                    <mark
                      key={k}
                      className={`prf-mark prf-tone--${kindOf(changes[s.change].type).tone}${kept.has(s.change) ? ' is-kept' : ''}${active === s.change ? ' is-active' : ''}`}
                      title={changes[s.change].explanation}
                      onClick={() => showChange(s.change!)}
                    >
                      {s.text}
                    </mark>
                  )))}
                </div>
              </section>
            </div>

            <aside className="prf-side">
              {isResume && <TemplateSlider title="Put it in a template" onUse={applyTemplate} />}

              <section className={`tlr-card tlr-score tlr-score--${band.tone}`}>
                <div className="tlr-ring" style={{ '--p': score } as React.CSSProperties}>
                  <b>{score}<small>/100</small></b>
                </div>
                <div>
                  <span className="tlr-score-label">{band.label}</span>
                  <p>{band.text}</p>
                  <small className="tlr-fine">How your original scored, estimated by AI.</small>
                </div>
              </section>

              {counts.some(c => c.n > 0) && (
                <section className="tlr-card">
                  <h3>What Leo fixed</h3>
                  <ul className="prf-bars">
                    {counts.map(c => (
                      <li key={c.label} className={`prf-tone--${c.tone}`}>
                        <span>{c.label}</span>
                        <i><em style={{ width: `${(c.n / maxCount) * 100}%` }} /></i>
                        <b>{c.n}</b>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {!isResume && (
                <section className="tlr-card">
                  <h3>Before you send it</h3>
                  <ul className="tlr-list">
                    <li><CheckCircle2 size={15} />Read the corrected version once, out loud if you can.</li>
                    <li><CheckCircle2 size={15} />Check names, dates and numbers are still right.</li>
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // ── INTRO ────────────────────────────────────────────────────
  return (
    <div className="tlr prf">
      <section className="tlr-hero">
        <div className="tlr-wrap tlr-hero-grid">
          <div className="tlr-hero-copy">
            <nav className="tlr-crumb" aria-label="Breadcrumb">
              <button type="button" onClick={() => setCurrentPage('home')} aria-label="Home"><Home size={14} /></button>
              <span aria-hidden="true">›</span>
              <span>AI Proofreading</span>
            </nav>
            <h1>Send it <em>without the typos</em></h1>
            <ul className="tlr-checks">
              <li><CheckCircle2 size={18} />Leo fixes grammar, spelling and punctuation in your resume, cover letter or any professional text.</li>
              <li><CheckCircle2 size={18} />Passive sentences become active, weak verbs become specific, and the tone fits your industry.</li>
              <li><CheckCircle2 size={18} />Every change comes with the reason, and you can keep your original wording for any of them.</li>
            </ul>
            <p className="tlr-note">Free to try. No card needed.</p>
          </div>

          <div className="tlr-start">
            <div className="tlr-start-leo"><Leo pose="guide" /></div>
            <h2>Leo will proofread it with you</h2>
            <ol className="tlr-start-steps">
              <li><span>1</span>Paste your text, or add your resume</li>
              <li><span>2</span>Say what it is and the industry</li>
              <li><span>3</span>Review the changes, then copy or download</li>
            </ol>
            <label
              className={`tlr-drop${dragActive ? ' is-drag' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={e => { handleDrop(e); if (e.dataTransfer.files?.[0]) { setDocType('Resume'); openFlow('text'); } }}
            >
              <input type="file" accept=".pdf,.docx,.txt" onChange={e => { if (e.target.files?.[0]) { validateFile(e.target.files[0]); setDocType('Resume'); openFlow('text'); } }} />
              <Upload size={22} />
              <span><b>Drop your resume here</b> to start</span>
              <small>PDF, DOCX or TXT · up to 5 MB</small>
            </label>
            {result && (
              <button type="button" className="tlr-btn tlr-btn--outline tlr-btn--block" onClick={() => { setAtIntro(false); window.scrollTo({ top: 0 }); }}>
                <ArrowRight size={17} /> Back to your proofread ({changes.length} {changes.length === 1 ? 'change' : 'changes'})
              </button>
            )}
            <button type="button" className="tlr-btn tlr-btn--block tlr-btn--big" onClick={() => openFlow('text')}>
              <Sparkles size={18} /> Proofread with Leo
            </button>
          </div>
        </div>
      </section>

      <section className="tlr-light">
        <div className="tlr-wrap">
          <p className="tlr-kicker">How it works</p>
          <h2 className="tlr-center">Clean, confident writing in three steps</h2>
          <ol className="tlr-steps">
            {STEPS.map((s, i) => (
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
        <div className="tlr-wrap tlr-compare">
          <div>
            <span className="tlr-tag">What Leo fixes</span>
            <h2>Mistakes and weak phrasing</h2>
            <ul className="tlr-list">{FIXES.map(c => <li key={c}><CheckCircle2 size={16} />{c}</li>)}</ul>
          </div>
          <div>
            <span className="tlr-tag tlr-tag--kept">What stays yours</span>
            <h2>Your words, your call</h2>
            <ul className="tlr-list tlr-list--kept">{KEPT.map(c => <li key={c}><Lock size={15} />{c}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="tlr-light">
        <div className="tlr-wrap tlr-faq">
          <h2 className="tlr-center">Frequently asked questions</h2>
          {FAQS.map((f, i) => (
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
          <h2>One last read before you hit send</h2>
          <p>Paste your text and Leo will have it proofread in seconds.</p>
          <button type="button" className="tlr-btn tlr-btn--big" onClick={() => openFlow('text')}>Proofread with Leo <ArrowRight size={18} /></button>
        </div>
      </section>
    </div>
  );
}

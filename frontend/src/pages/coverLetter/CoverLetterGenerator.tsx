import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, ArrowLeft, Check, ChevronRight, Copy, Download, FileText, Home, Lock, PenLine, RotateCcw, Settings, X,
} from 'lucide-react';
import { LeoAvatar } from '../../components/ResumeOnboarding';
import ResumeDownload from '../../components/ResumeDownload';
import TemplatePreview from '../../components/TemplatePreview';
import { DesignPanel } from '../../components/ResumeStudioPanels';
import { errorText } from '../../components/career/careerApi';
import { authFetch, getSessionToken } from '../../lib/authFetch';
import { API_BASE } from '../../lib/apiBase';
import { cvFileError, isLink, readJobLink } from '../../lib/jobInput';
import { DEFAULT_DESIGN, type DesignState } from '../../lib/resumeDesign';
import { COVER_LETTER_EXAMPLES } from '../../data/coverLetterExamples';
import {
  LETTER_DESIGNS, completeLetter, downloadLetterDoc, letterText, renderLetter, saveLetterDraft, todayLong, type LetterData,
} from '../../lib/coverLetter';
import CoverLetterFaq from './CoverLetterFaq';
import { GENERATOR_FAQS } from '../../data/coverLetterFaqs';
import './CoverLetterPages.css';

interface CoverLetterGeneratorProps {
  customApiKey: string;
  resumeText: string;
  setCurrentPage: (page: string) => void;
  /** Hides the site header and footer: the generator runs full-screen in the app. */
  onFocusChange?: (mode: false | 'flow' | 'studio') => void;
  /** Where Exit goes (My Documents on the app host). */
  onExit: () => void;
}

type Tone = 'professional' | 'conversational' | 'enthusiastic';
type Length = 'standard' | 'short';

const TONES: { id: Tone; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'conversational', label: 'Conversational' },
  { id: 'enthusiastic', label: 'Enthusiastic' },
];

const SAMPLE = COVER_LETTER_EXAMPLES.find(e => e.slug === 'data-analyst') ?? COVER_LETTER_EXAMPLES[0];

/** Uploads the resume with real progress and returns its text. */
function uploadResume(file: File, onProgress: (pct: number) => void, signal: { xhr?: XMLHttpRequest }): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    signal.xhr = xhr;
    const form = new FormData();
    form.append('resume', file);
    xhr.open('POST', `${API_BASE}/api/cover-letter/read-resume`);
    const token = getSessionToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // Upload is most of the wait; reading the file on the server is the last stretch
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 85)); };
    xhr.onload = () => {
      let body: { data?: { resumeText?: string }; error?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300 && body.data?.resumeText) {
        onProgress(100);
        resolve(body.data.resumeText);
      } else {
        reject(new Error(body.error || 'We could not read your resume. Please try another file.'));
      }
    };
    xhr.onerror = () => reject(new Error('We could not reach CVMind. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('aborted'));
    xhr.send(form);
  });
}

export default function CoverLetterGenerator({ customApiKey, resumeText: savedResume, setCurrentPage, onFocusChange, onExit }: CoverLetterGeneratorProps) {
  // Full-screen in the app: no site header or footer
  useEffect(() => {
    onFocusChange?.('flow');
    return () => onFocusChange?.(false);
  }, [onFocusChange]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [resume, setResume] = useState<{ text: string; name: string } | null>(null);
  const [upload, setUpload] = useState<{ pct: number } | null>(null);
  const uploadRef = useRef<{ xhr?: XMLHttpRequest }>({});
  const [drag, setDrag] = useState(false);
  const [job, setJob] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tone, setTone] = useState<Tone>('professional');
  const [length, setLength] = useState<Length>('standard');
  const [company, setCompany] = useState('');
  const [manager, setManager] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [letter, setLetter] = useState<LetterData | null>(null);
  const [design, setDesign] = useState('cl-clean');
  const [showDownload, setShowDownload] = useState(false);
  const [copied, setCopied] = useState(false);
  // Live "Design & Font" demo in the section below the tool
  const [demoDesign, setDemoDesign] = useState<DesignState>(DEFAULT_DESIGN);
  const [demoColor, setDemoColor] = useState(LETTER_DESIGNS[1].color);

  useEffect(() => () => uploadRef.current.xhr?.abort(), []);

  const hasSaved = savedResume.trim().length >= 50;
  const jobReady = isLink(job) || job.trim().length >= 40;
  const html = letter ? renderLetter(design, letter) : '';
  const fileName = letter ? `${letter.name} Cover Letter${letter.company ? ` ${letter.company}` : ''}`.replace(/[^A-Za-z0-9 ]/g, '') : 'Cover Letter';

  // The popup counts 1 → 100 one step at a time; it never runs ahead of the real upload (capped at 90 until the server answers)
  const uploadGoal = useRef({ target: 0, done: false });
  const uploading = upload !== null;
  useEffect(() => {
    if (!uploading) return;
    const t = setInterval(() => {
      setUpload(u => {
        if (!u) return u;
        const { target, done } = uploadGoal.current;
        const limit = done ? 100 : Math.min(90, Math.max(target, u.pct < 30 ? 30 : u.pct));
        return u.pct < limit ? { pct: u.pct + 1 } : u;
      });
    }, 22);
    return () => clearInterval(t);
  }, [uploading]);
  useEffect(() => {
    if (upload?.pct === 100 && uploadGoal.current.done) {
      const t = setTimeout(() => { setUpload(null); setStep(2); }, 300);
      return () => clearTimeout(t);
    }
  }, [upload]);

  const pickFile = async (file: File) => {
    const problem = cvFileError(file);
    setError(problem || '');
    if (problem) return;
    uploadGoal.current = { target: 0, done: false };
    setUpload({ pct: 1 });
    try {
      const text = await uploadResume(file, pct => { uploadGoal.current.target = pct; }, uploadRef.current);
      setResume({ text, name: file.name });
      uploadGoal.current = { target: 100, done: true };
    } catch (err) {
      setUpload(null);
      if ((err as Error).message !== 'aborted') setError(errorText(err));
    }
  };

  const generate = async () => {
    if (!resume || !jobReady || busy) return;
    setStep(3);
    setBusy(true);
    setError('');
    setLetter(null);
    try {
      let jobDescription = job.trim();
      const keyHeader: Record<string, string> = customApiKey ? { 'x-gemini-key': customApiKey } : {};
      if (isLink(jobDescription)) jobDescription = (await readJobLink(jobDescription, keyHeader)).text;
      const res = await authFetch(`${API_BASE}/api/cover-letter/generate`, {
        method: 'POST',
        headers: { ...keyHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: resume.text, jobDescription, tone, length, company: company.trim(), hiringManager: manager.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.data) throw new Error(body.error || 'The AI did not write a letter this time. Please try again.');
      setLetter(completeLetter({ ...body.data, company: body.data.company || company.trim() }));
    } catch (err) {
      setError(errorText(err));
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const edit = () => {
    if (!letter) return;
    saveLetterDraft({ html, templateId: design, title: `Cover Letter${letter.company ? ` - ${letter.company}` : ''}` });
    setCurrentPage('cover-letter-editor');
  };

  const copy = () => {
    navigator.clipboard.writeText(letterText(html).trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(e.type === 'dragenter' || e.type === 'dragover');
  };

  const settings = (
    <>
      <button type="button" className="clx-settings-row" aria-expanded={showSettings} disabled={busy} onClick={() => setShowSettings(s => !s)}>
        <Settings size={16} /> SETTINGS
      </button>
      {showSettings && !busy && (
        <div className="clx-settings">
          <div>
            <span className="clx-label">Tone</span>
            <div className="clx-chips" role="radiogroup" aria-label="Tone">
              {TONES.map(t => (
                <button key={t.id} type="button" role="radio" aria-checked={tone === t.id} className={tone === t.id ? 'is-on' : ''} onClick={() => setTone(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="clx-label">Length</span>
            <div className="clx-chips" role="radiogroup" aria-label="Length">
              <button type="button" role="radio" aria-checked={length === 'standard'} className={length === 'standard' ? 'is-on' : ''} onClick={() => setLength('standard')}>Standard (250–380 words)</button>
              <button type="button" role="radio" aria-checked={length === 'short'} className={length === 'short' ? 'is-on' : ''} onClick={() => setLength('short')}>Short (under 250)</button>
            </div>
          </div>
          <div className="clx-row">
            <label><span className="clx-label">Company name</span><input className="clx-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional" maxLength={120} /></label>
            <label><span className="clx-label">Hiring manager</span><input className="clx-input" value={manager} onChange={e => setManager(e.target.value)} placeholder="Optional" maxLength={120} /></label>
          </div>
        </div>
      )}
    </>
  );

  const demoHtml = renderLetter(LETTER_DESIGNS[1].id, { ...SAMPLE.letter, date: todayLong() }).split(LETTER_DESIGNS[1].color).join(demoColor);

  return (
    <div className="clx clx-gen">
      <button type="button" className="focus-exit" onClick={onExit} aria-label="Exit cover letter generator">Exit ✕</button>
      <section className="clx-gen-top">
        <span className="clx-ring clx-ring--a" aria-hidden="true" />
        <span className="clx-ring clx-ring--b" aria-hidden="true" />
        <p className="clx-kicker">Write as many cover letters as you need</p>
        <nav className="clx-crumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => setCurrentPage('home')} aria-label="Home"><Home size={15} /></button>
          <ChevronRight size={14} /> Cover Letter Generator
        </nav>

        <div className={`clx-tool-card${letter ? ' is-wide' : ''}`}>
          <ol className="clx-stepper" aria-label={`Step ${letter ? 3 : step} of 3`}>
            {[1, 2, 3].map(n => {
              const done = n < step || Boolean(letter);
              return <li key={n} className={done ? 'is-done' : n === step ? 'is-on' : ''}>{done ? <Check size={14} strokeWidth={3} /> : n}</li>;
            })}
          </ol>
          <h1>AI Cover Letter Generator</h1>

          {step === 1 && (
            <>
              <p className="clx-instr"><LeoAvatar size={34} pose="resume" /> <span>First, <b>upload your resume</b> so Leo can write a letter that is really about you.</span></p>
              <label
                className={`clx-drop${drag ? ' is-drag' : ''}`}
                onDragEnter={onDrag} onDragOver={onDrag} onDragLeave={onDrag}
                onDrop={e => { onDrag(e); setDrag(false); if (e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]); }}
              >
                <input type="file" accept=".pdf,.docx,.txt" onChange={e => { if (e.target.files?.[0]) pickFile(e.target.files[0]); e.target.value = ''; }} />
                <span>Drop your resume here or choose a file.<br />PDF &amp; DOCX only. Max 5MB file size.</span>
                <span className="clx-btn">Upload Your Resume</span>
                <small><Lock size={13} /> Your resume is only used to write this letter. We don't sell your data.</small>
              </label>
              {hasSaved && (
                <button type="button" className="clx-link" onClick={() => { setResume({ text: savedResume, name: 'Your saved resume' }); setStep(2); }}>
                  Or use the resume you already added
                </button>
              )}
              {error && <p className="clx-error"><AlertTriangle size={15} /> {error}</p>}
            </>
          )}

          {(step === 2 || (step === 3 && !letter)) && (
            <>
              <p className="clx-instr">
                {step === 2 ? <span>Now, paste the <b>job description</b> or the entire job ad for the job you are applying for.</span> : <span>Leo is writing your cover letter. This usually takes 10 to 30 seconds.</span>}
              </p>
              <div className="clx-jd">
                {step === 3 ? (
                  <div className="clx-writing" role="status" aria-label="Writing your cover letter"><span className="clx-spinner" /></div>
                ) : (
                  <textarea value={job} onChange={e => setJob(e.target.value)} placeholder="Paste here..." maxLength={10000} aria-label="Job description or link to the job ad" autoFocus />
                )}
                {settings}
              </div>
              {error && <p className="clx-error"><AlertTriangle size={15} /> {error}</p>}
              <div className="clx-tool-foot">
                <span className="clx-file-chip">
                  <FileText size={15} /> <span>{resume?.name}</span>
                  <button type="button" disabled={busy} onClick={() => { setResume(null); setError(''); setStep(1); }} aria-label="Remove resume"><X size={15} /></button>
                </span>
                <div className="clx-tool-btns">
                  <button type="button" className="clx-btn clx-btn--outline" disabled={busy} onClick={() => { setError(''); setStep(1); }}><ArrowLeft size={16} /> Back</button>
                  <button type="button" className="clx-btn" disabled={!jobReady || busy} onClick={generate}>Generate</button>
                </div>
              </div>
            </>
          )}

          {letter && (
            <div className="clx-result">
              <div className="clx-result-page">
                <TemplatePreview key={design} html={html} name="Your cover letter" eager />
              </div>
              <div className="clx-result-side">
                <h2>Your cover letter is ready</h2>
                <p className="clx-muted">{letter.jobTitle ? `${letter.jobTitle}${letter.company ? ` at ${letter.company}` : ''} · ` : ''}{letterText(html).trim().split(/\s+/).length} words</p>
                <span className="clx-label">Design</span>
                <div className="clx-designs" role="radiogroup" aria-label="Design">
                  {LETTER_DESIGNS.map(d => (
                    <button key={d.id} type="button" role="radio" aria-checked={design === d.id} className={design === d.id ? 'is-on' : ''} onClick={() => setDesign(d.id)}>
                      <i style={{ background: d.color }} aria-hidden="true" /> {d.name}
                    </button>
                  ))}
                </div>
                <p className="clx-ask">Do you want to edit it or download it?</p>
                <div className="clx-choice">
                  <button type="button" className="clx-btn" onClick={edit}><PenLine size={16} /> Edit</button>
                  <button type="button" className="clx-btn clx-btn--outline" onClick={() => setShowDownload(true)}><Download size={16} /> Download</button>
                </div>
                <div className="clx-minor">
                  <button type="button" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy text'}</button>
                  <button type="button" onClick={() => { setLetter(null); setStep(2); }}><RotateCcw size={14} /> Write another</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="clx-gen-info">
        <h2>Generate a free cover letter for every job you apply to</h2>
        <p>Upload your resume once, paste a job ad, and get a letter written for that role. Edit it in the cover letter editor or download it straight away.</p>
      </section>

      <section className="clx-split">
        <div className="clx-split-text">
          <h2>A format proven time and again</h2>
          <p>Every generated letter follows the three-part structure hiring managers expect: an opening that names the role and company, a middle that maps two or three of your results to the job's requirements, and a close that asks for a conversation. It stays on one page, around 250 to 400 words.</p>
          <p>Open it in the editor to change the font, colours, margins and spacing, or copy the text into Google Docs or Word.</p>
        </div>
        <div className="clx-split-art clx-art-design">
          <div className="clx-art-panel">
            <DesignPanel
              design={demoDesign}
              accentFrom={demoColor}
              accentAvailable
              onChange={next => { setDemoDesign(d => ({ ...d, ...next })); if (next.accent) setDemoColor(next.accent); }}
              onClose={() => setDemoDesign(DEFAULT_DESIGN)}
            />
          </div>
          <div className="clx-art-page"><TemplatePreview html={demoHtml} name="Sample cover letter" aspect="1 / 1.05" /></div>
        </div>
      </section>

      <section className="clx-split clx-split--flip">
        <div className="clx-split-text">
          <h2>AI takes care of the first draft</h2>
          <p>The generator reads your resume and the job ad, then controls four things: tone (professional, conversational or enthusiastic), content (taken from your resume, never invented), structure (the three-part format) and tailoring (the job's keywords mapped to your real experience).</p>
          <p>Add your own specifics before you send it: names, projects and why this company.</p>
        </div>
        <div className="clx-split-art clx-art-ai">
          <span className="clx-tag clx-tag--job">Job ad</span>
          <span className="clx-tag clx-tag--kw">Keywords</span>
          <span className="clx-tag clx-tag--sk">Skills</span>
          <span className="clx-bot"><LeoAvatar size={88} pose="typing" /></span>
          <div className="clx-art-page"><TemplatePreview html={renderLetter('cl-serif-center', { ...SAMPLE.letter, date: todayLong() })} name="Sample cover letter" aspect="1 / 0.95" /></div>
        </div>
      </section>

      <CoverLetterFaq items={GENERATOR_FAQS} />

      {/* Portalled: an ancestor's transform would otherwise centre it on the whole page instead of the window */}
      {upload && createPortal(
        <div className="clx clx-modal-back" role="dialog" aria-modal="true" aria-label="Uploading resume">
          <div className="clx-modal">
            <div className="clx-modal-head">
              <strong>Uploading resume...</strong>
              <span>({upload.pct}% complete)</span>
              <button type="button" onClick={() => { uploadRef.current.xhr?.abort(); setUpload(null); }} aria-label="Cancel upload"><X size={18} /></button>
            </div>
            <div className="clx-bar-track"><div className="clx-bar-fill" style={{ width: `${upload.pct}%` }} /></div>
          </div>
        </div>,
        document.body,
      )}

      {showDownload && letter && (
        <ResumeDownload
          docLabel="Cover Letter"
          defaultName={fileName}
          paper="a4"
          getHtml={() => html}
          getText={() => letterText(html)}
          customApiKey={customApiKey}
          onWord={name => downloadLetterDoc(html, name)}
          onClose={() => setShowDownload(false)}
        />
      )}
    </div>
  );
}

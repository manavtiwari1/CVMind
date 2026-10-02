import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowUpDown, CheckCircle2, ChevronDown, Download, FileText, Home,
  LayoutTemplate, Link2, Loader2, Lock, Palette, PencilLine, RefreshCw, Share2, Sparkles, Target, Upload, Wand2, X,
} from 'lucide-react';
import TemplatePreview from '../components/TemplatePreview';
import ResumeDownload from '../components/ResumeDownload';
import { Leo, Stepper } from '../components/ResumeOnboarding';
import '../components/ResumeOnboarding.css';
import { RESUME_TEMPLATES, TEMPLATES, type Template } from '../data/resumeTemplates';
import { authFetch } from '../lib/authFetch';
import { API_BASE } from '../lib/apiBase';
import { readUser } from '../lib/currentUser';
import { GOOGLE_FONTS_HREF } from '../lib/resumeDesign';
import { splitFooter, withFooter } from '../lib/resumeFooter';
import { sanitizeResumeHtml } from '../lib/sanitizeHtml';
import { parseSavedContent } from '../utils/savedWork';
import { getErrorMessage } from '../utils/errors';
import type { ExtractedResume, LoadedWork, SavedWork, WizardFormData } from '../types/api';
import './Tailor.css';

interface TailorProps {
  customApiKey: string;
  setCurrentPage: (page: string) => void;
  loadedWork: LoadedWork | null;
  setLoadedWork: (work: LoadedWork | null) => void;
  /** Hides the site chrome while Leo's guided flow is open. */
  onFocusChange?: (mode: false | 'flow') => void;
}

// Leo's guided steps; null shows the intro page (or the result)
type Flow = null | 'cv' | 'jd' | 'template' | 'pick' | 'working';
const FLOW_DOT: Record<Exclude<Flow, null>, number> = { cv: 1, jd: 2, template: 3, pick: 3, working: 4 };

interface TailorResult {
  matchScore: number;
  keyTailoringInsights: string[];
  matchedSkills: string[];
  missingSkillsRecommended: string[];
  tailoredData?: ExtractedResume;
  generatedHtml?: string;
  templateId?: string;
  resumeText?: string;
}

// What the server saves for a tailor run (backend/src/index.js /api/tailor)
interface SavedTailor {
  fileName?: string;
  jobDescription?: string;
  resumeText?: string;
  result?: TailorResult;
  generatedHtml?: string;
  templateId?: string;
}

const DEFAULT_TEMPLATE = 'cv-ivy-league';
const PAGE_W = 794;
const PAGE_H = 1123;

const templateFor = (id?: string): Template =>
  TEMPLATES.find(t => t.id === id) ?? TEMPLATES.find(t => t.id === DEFAULT_TEMPLATE) ?? RESUME_TEMPLATES[0];

/** Fills the locked CVMind footer back in after the AI filled the template body. */
const finishHtml = (generated: string, templateId?: string) =>
  withFooter(sanitizeResumeHtml(generated), splitFooter(templateFor(templateId).html).footer);

const toFormData = (d: ExtractedResume): WizardFormData => ({
  personalInfo: {
    fullName: d.personalInfo?.fullName || '', email: d.personalInfo?.email || '', phone: d.personalInfo?.phone || '',
    location: d.personalInfo?.location || '', linkedin: d.personalInfo?.linkedin || '', jobTitle: d.personalInfo?.jobTitle || '',
  },
  jobTitle: d.personalInfo?.jobTitle || '',
  summary: d.summary || '',
  education: d.educations || [],
  workExperiences: d.workExperiences || [],
  skills: d.skills || [],
  courses: d.courses || [],
  languages: d.languages || [],
  achievements: d.achievements || [],
  timeBreakdown: [],
});

/** Plain text of the resume as laid out (used for TXT export). */
function htmlToText(html: string): string {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px`;
  el.innerHTML = html;
  document.body.appendChild(el);
  const text = el.innerText;
  el.remove();
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/** AI skill lists sometimes come back as sentences; turn them into short chips. */
function toChips(items: string[] | undefined): string[] {
  if (!Array.isArray(items)) return [];
  const out = new Set<string>();
  for (const item of items) {
    if (!item) continue;
    const inner = item.match(/\((?:e\.g\.,?|such as)\s*(.*?)\)/i)?.[1];
    const parts = inner || (item.length > 30 && /[,;]/.test(item)) ? (inner || item).split(/[,;]+/) : [item];
    for (const p of parts) {
      const clean = p.replace(/[()'"*#]/g, '').trim();
      if (clean.length > 1 && clean.length < 36) out.add(clean);
    }
  }
  return Array.from(out).slice(0, 15);
}

function scoreBand(score: number) {
  if (score >= 75) return { label: 'Strong match', tone: 'good', text: 'Your tailored resume covers most of what this job asks for. Read it through and add any numbers only you know.' };
  if (score >= 50) return { label: 'Good start', tone: 'ok', text: 'Several requirements are covered. Look at the missing skills and add the ones you really have.' };
  return { label: 'Partial match', tone: 'low', text: 'This job asks for a lot your resume doesn\'t show yet. Add missing skills you have, or aim at roles closer to your experience.' };
}

const STEPS = [
  { icon: Upload, title: 'Upload your CV', text: 'PDF, DOCX or TXT, or paste a Google Drive, Dropbox or OneDrive link.' },
  { icon: Target, title: 'Paste the job description', text: 'The whole posting works best: responsibilities, requirements and skills.' },
  { icon: Download, title: 'Download or keep editing', text: 'Get a designed PDF, Word or TXT file, or open it in the CVMind resume editor.' },
];

const CHANGES = [
  'Summary rewritten for the role',
  'Bullets reworded around what the job asks for',
  'Relevant skills moved to the front',
  'Keywords from the posting used where they are true for you',
];
const KEPT = [
  'Companies, job titles and dates',
  'Degrees, schools and grades',
  'Every role and project you listed',
  'No skills or numbers you never had',
];

const EDITOR_TOOLS = [
  { icon: LayoutTemplate, title: 'Switch templates', text: 'Move your content into any CVMind template, A4 or US Letter.' },
  { icon: Palette, title: 'Design & fonts', text: 'Accent colour, font, size, spacing and margins.' },
  { icon: ArrowUpDown, title: 'Rearrange sections', text: 'Drag sections between columns and reorder entries.' },
  { icon: Wand2, title: 'AI assistant', text: 'Fix wording, shorten bullets, or tailor again to another job.' },
  { icon: PencilLine, title: 'Edit every line', text: 'Click any text to change it, add entries, links or a photo.' },
  { icon: Share2, title: 'Share & export', text: 'PDF, Word, TXT, email to yourself, or a shareable link.' },
];

const FAQS = [
  { q: 'Will it make things up?', a: 'It is told to keep your companies, titles, dates and degrees exactly as they are, and not to add skills or numbers you never had. AI can still get things wrong, so read the result before you send it. You can edit every line.' },
  { q: 'What does the match score mean?', a: 'It is the AI\'s estimate of how well the tailored resume fits the job description, from 0 to 100. Use it as a rough guide, not a guarantee of how an ATS or recruiter will score you.' },
  { q: 'Which formats can I download?', a: 'PDF, Word (.doc) and plain text. Signed-in users get a server-made PDF; otherwise your browser\'s "Save as PDF" is used. The PDF keeps selectable text, which ATS software can read.' },
  { q: 'Why is there a CVMind footer?', a: 'Every resume made with CVMind templates carries a small "cvmind.in · Powered by CVMind" line at the bottom. It is locked in the editor and appears in the downloads.' },
  { q: 'What happens to my CV and the job description?', a: 'The text of your CV and the job description are sent to our AI provider to write the tailored version. When you are signed in, the result is saved to your account so you can reopen it. We also keep a usage record (file name, score, skills and the job description). We don\'t sell your data.' },
];

const PHASES = ['Reading your CV', 'Matching it to the job', 'Filling your template'];

/** The finished resume at real size, scaled to fit. Sandboxed with no scripts. */
function ResumeSheet({ html }: { html: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(PAGE_H);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / PAGE_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measure = () => {
    const d = frameRef.current?.contentDocument;
    if (d) setHeight(Math.max(PAGE_H, d.documentElement.scrollHeight));
  };

  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${GOOGLE_FONTS_HREF}">
<style>:root{--rs-h:${PAGE_H}px}html,body{margin:0;background:#fff}body{font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#111}*{box-sizing:border-box}</style>
</head><body>${html}</body></html>`;

  return (
    <div ref={wrapRef} className="tlr-sheet" style={{ height: scale ? height * scale : undefined }}>
      {scale > 0 && (
        <iframe
          ref={frameRef}
          title="Tailored resume preview"
          sandbox="allow-same-origin"
          srcDoc={doc}
          onLoad={() => { measure(); setTimeout(measure, 700); }}
          style={{ width: PAGE_W, height, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}

export default function Tailor({ customApiKey, setCurrentPage, loadedWork, setLoadedWork, onFocusChange }: TailorProps) {
  const [flow, setFlow] = useState<Flow>(null);
  const [jobBusy, setJobBusy] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [html, setHtml] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [showDownload, setShowDownload] = useState(false);
  const [retemplating, setRetemplating] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Set when the user picked a template on the intro page; Leo then offers it first
  const [pickedOnIntro, setPickedOnIntro] = useState(false);

  useEffect(() => {
    onFocusChange?.(flow ? 'flow' : false);
  }, [flow, onFocusChange]);
  useEffect(() => () => onFocusChange?.(false), [onFocusChange]);

  // Full-bleed sections, like the resume builder landing page
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
    if (!loading) return;
    const timers = [setTimeout(() => setPhase(1), 4000), setTimeout(() => setPhase(2), 14000)];
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  // Reopen a saved tailor run from Account / documents. Local state is adjusted during render;
  // clearing the parent's one-shot loadedWork happens in the effect below.
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (!loadedWork.deleted && loadedWork.type === 'resume-tailor') {
      const saved = parseSavedContent<SavedTailor>(loadedWork.htmlContent);
      if (saved?.result) {
        const tid = saved.templateId || DEFAULT_TEMPLATE;
        setResult({ ...saved.result, templateId: tid });
        setHtml(saved.generatedHtml ? finishHtml(saved.generatedHtml, tid) : '');
        setTemplateId(tid);
        setJobDescription(saved.jobDescription || '');
        setResumeText(saved.resumeText || '');
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
    setErrorMsg(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
      setErrorMsg('Please upload a PDF, DOCX or TXT file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('That file is over 5 MB. Please upload a smaller one.');
      return;
    }
    setSelectedFile(file);
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

  const apiHeaders = (json = false) => {
    const h: Record<string, string> = json ? { 'Content-Type': 'application/json' } : {};
    if (customApiKey) h['x-gemini-key'] = customApiKey;
    return h;
  };

  /** Runs the tailor. With `fromText`, re-uses the CV text read on an earlier run instead of the file. */
  const runTailor = async (jd: string, fromText = '', tid = templateId): Promise<boolean> => {
    if (!fromText && uploadMode === 'file' && !selectedFile) { setErrorMsg('Please upload your CV first.'); return false; }
    if (!fromText && uploadMode === 'link' && !resumeUrl.trim()) { setErrorMsg('Please paste a link to your CV.'); return false; }
    if (jd.trim().length < 15) { setErrorMsg('Please paste the job description (at least a few lines).'); return false; }

    const template = templateFor(tid);
    const form = new FormData();
    if (fromText) form.append('resumeText', fromText);
    else if (uploadMode === 'file' && selectedFile) form.append('resume', selectedFile);
    else form.append('resumeUrl', resumeUrl.trim());
    form.append('jobDescription', jd.trim());
    form.append('templateHtml', splitFooter(template.html).body);
    form.append('templateId', template.id);

    setPhase(0);
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authFetch(`${API_BASE}/api/tailor`, { method: 'POST', headers: apiHeaders(), body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Tailoring failed. Please try again.');
      const data: TailorResult = body.data;
      if (!data?.generatedHtml) throw new Error('We tailored your CV but could not lay it out. Please try again.');
      setResult(data);
      setHtml(finishHtml(data.generatedHtml, data.templateId || template.id));
      setResumeText(data.resumeText || fromText);
      if (!fromText) setSourceName(selectedFile?.name || 'Linked CV');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || 'Something went wrong on our side. Please try again in a moment.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ── Leo's guided flow ──
  const openFlow = (step: Exclude<Flow, null> = 'cv') => {
    setErrorMsg(null);
    setFlow(step);
    window.scrollTo({ top: 0 });
  };

  const goToStep = (step: Exclude<Flow, null>) => {
    setErrorMsg(null);
    setFlow(step);
  };

  const cvReady = uploadMode === 'file' ? Boolean(selectedFile) : /^https?:\/\/\S+$/i.test(resumeUrl.trim());

  /** A job link is read into a description first; pasted text goes straight on. */
  const submitJob = async () => {
    const text = jobDescription.trim();
    setErrorMsg(null);
    if (/^https?:\/\/\S+$/i.test(text)) {
      setJobBusy(true);
      try {
        const res = await authFetch(`${API_BASE}/api/auto-apply/scrape-job`, { method: 'POST', headers: apiHeaders(true), body: JSON.stringify({ url: text }) });
        const body = await res.json().catch(() => ({}));
        const d = body?.data;
        // The scraper falls back to placeholder text when it cannot read a page; only trust a real description.
        if (!res.ok || !d || d.source !== 'ai_scraper' || !d.description || d.description.length < 150) {
          throw new Error("I couldn't read that job link. Please paste the job description text instead.");
        }
        setJobDescription([`${d.title || ''}${d.company ? ` at ${d.company}` : ''}`, d.description, d.skills?.length ? `Skills: ${d.skills.join(', ')}` : ''].filter(Boolean).join('\n\n'));
        setFlow('template');
      } catch (err) {
        setErrorMsg(getErrorMessage(err) || "I couldn't read that job link.");
      } finally {
        setJobBusy(false);
      }
      return;
    }
    if (text.length < 60) { setErrorMsg('Please paste a bit more of the job description, so I can match it properly.'); return; }
    setFlow('template');
  };

  const startTailoring = async (tid: string) => {
    setTemplateId(tid);
    setFlow('working');
    if (await runTailor(jobDescription, '', tid)) setFlow(null);
  };

  const changeTemplate = async (id: string) => {
    if (!result?.tailoredData || id === result.templateId || retemplating) return;
    const template = templateFor(id);
    setRetemplating(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/resume/generate`, {
        method: 'POST',
        headers: apiHeaders(true),
        body: JSON.stringify({ templateHtml: splitFooter(template.html).body, formData: toFormData(result.tailoredData), keepFacts: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.data?.generatedHtml) throw new Error(body.error || 'Could not switch the template.');
      const generated = String(body.data.generatedHtml).replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '');
      setHtml(finishHtml(generated, template.id));
      setResult({ ...result, templateId: template.id });
      setTemplateId(template.id);
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || 'Could not switch the template.');
    } finally {
      setRetemplating(false);
    }
  };

  const downloadWord = (fileName: string) => {
    const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Resume</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>body{font-family:Arial,sans-serif;margin:1in;}@page{margin:1in;}</style>
</head><body>${html}</body></html>`;
    const url = URL.createObjectURL(new Blob(['﻿', doc], { type: 'application/msword' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${fileName}.doc` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const openInEditor = async () => {
    if (!result || !html || handingOff) return;
    setHandingOff(true);
    const template = templateFor(result.templateId);
    const name = result.tailoredData?.personalInfo?.fullName?.trim();
    const title = (name ? `${name} - Tailored Resume` : `Tailored Resume - ${template.name}`).slice(0, 120);
    let work: SavedWork = { title, type: 'resume', templateId: template.id, htmlContent: html, source: 'resume-tailor' };
    const user = readUser();
    const userId = user?.id || user?._id;
    if (userId) {
      // Saved first so it shows up in My Documents straight away
      try {
        const res = await authFetch(`${API_BASE}/api/user/work`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, title, type: 'resume', templateId: template.id, htmlContent: html, source: 'resume-tailor' }),
        });
        const body = await res.json();
        if (res.ok && body.data) work = { ...work, ...body.data, htmlContent: html, source: 'resume-tailor' };
      } catch (err) {
        console.error('Could not save the tailored resume before opening the editor:', err);
      }
    }
    setLoadedWork(work);
    setCurrentPage('resume-editor');
  };

  const reset = () => {
    setResult(null);
    setHtml('');
    setResumeText('');
    setJobDescription('');
    setResumeUrl('');
    setErrorMsg(null);
    removeFile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chosen = templateFor(templateId);
  const recommended = pickedOnIntro ? chosen : templateFor(DEFAULT_TEMPLATE);

  // ── LEO'S GUIDED FLOW ────────────────────────────────────────
  if (flow) {
    return (
      <div className="ro-page tlr tlr-flow">
        <button type="button" className="tlr-flow-exit" onClick={() => { setFlow(null); setErrorMsg(null); }} disabled={loading} aria-label="Exit Resume Tailorer">
          Exit <X size={15} />
        </button>
        <Stepper active={FLOW_DOT[flow]} total={4} />

        {flow === 'cv' && (
          <div className="ro-center ro-stage">
            <Leo />
            <h1 className="ro-title">Hi, I'm Leo. Let's tailor your resume. First, upload your current CV or paste a link to it.</h1>
            <div className="tlr-toggle tlr-flow-toggle" role="tablist" aria-label="How to add your CV">
              <button type="button" role="tab" aria-selected={uploadMode === 'file'} className={uploadMode === 'file' ? 'is-on' : ''} onClick={() => { setUploadMode('file'); setErrorMsg(null); }}>
                <Upload size={14} /> Upload file
              </button>
              <button type="button" role="tab" aria-selected={uploadMode === 'link'} className={uploadMode === 'link' ? 'is-on' : ''} onClick={() => { setUploadMode('link'); setErrorMsg(null); }}>
                <Link2 size={14} /> Paste link
              </button>
            </div>
            <div className="tlr-flow-box">
              {uploadMode === 'file' ? (
                selectedFile ? (
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
                )
              ) : (
                <input
                  type="url"
                  className="tlr-input"
                  placeholder="https://drive.google.com/… or a direct PDF/DOCX link"
                  value={resumeUrl}
                  onChange={e => setResumeUrl(e.target.value)}
                  aria-label="Link to your CV"
                  autoFocus
                />
              )}
            </div>
            {errorMsg && <p className="ro-error"><AlertTriangle size={14} /> {errorMsg}</p>}
            <button type="button" className="ro-btn ro-btn--green" disabled={!cvReady} onClick={() => goToStep('jd')}>Next <ArrowRight size={16} /></button>
          </div>
        )}

        {flow === 'jd' && (
          <div className="ro-center ro-stage">
            <Leo />
            <h1 className="ro-title">Got it. Now paste the job description, or a link to the job posting.</h1>
            <p className="ro-sub">The whole posting works best: responsibilities, requirements and skills.</p>
            <textarea
              className="tlr-textarea tlr-flow-box tlr-flow-jd"
              placeholder="Paste the job description or a job link (https://…)"
              value={jobDescription}
              onChange={e => { setJobDescription(e.target.value); setErrorMsg(null); }}
              aria-label="Job description or job link"
              autoFocus
            />
            {errorMsg && <p className="ro-error"><AlertTriangle size={14} /> {errorMsg}</p>}
            <button type="button" className="ro-btn ro-btn--green" disabled={!jobDescription.trim() || jobBusy} onClick={submitJob}>
              {jobBusy ? <><Loader2 size={16} className="ro-spin" /> Reading the job…</> : <>Next <ArrowRight size={16} /></>}
            </button>
            <button type="button" className="ro-link" onClick={() => goToStep('cv')}>← Go back</button>
          </div>
        )}

        {flow === 'template' && (
          <div className="ro-center ro-stage">
            <Leo />
            <h1 className="ro-title">Which template should I put your tailored resume in?</h1>
            <div className="tlr-flow-rec">
              <div className="tlr-flow-rec-art"><TemplatePreview html={recommended.html} name={recommended.name} eager aspect="1 / 1.15" /></div>
              <div className="tlr-flow-rec-copy">
                <span className="tlr-tag">{pickedOnIntro ? 'Your pick' : 'Recommended'}</span>
                <strong>{recommended.name}</strong>
                <small>{recommended.tag}</small>
              </div>
            </div>
            <div className="ro-actions">
              <button type="button" className="ro-btn ro-btn--green" onClick={() => startTailoring(recommended.id)}>Use {recommended.name}</button>
              <button type="button" className="ro-btn ro-btn--purple" onClick={() => goToStep('pick')}>Choose a template</button>
            </div>
            <button type="button" className="ro-link" onClick={() => goToStep('jd')}>← Go back</button>
          </div>
        )}

        {flow === 'pick' && (
          <div className="ro-center ro-stage tlr-flow-pick">
            <h1 className="ro-title">Pick a template</h1>
            <p className="ro-sub">You can switch to another one after it's done, too.</p>
            <div className="tlr-templates">
              {RESUME_TEMPLATES.map(t => (
                <button key={t.id} type="button" className="tlr-tpl" style={{ '--t': t.accent } as React.CSSProperties} onClick={() => startTailoring(t.id)}>
                  <TemplatePreview html={t.html} name={t.name} />
                  <span className="tlr-tpl-name">{t.name}</span>
                </button>
              ))}
            </div>
            <button type="button" className="ro-link" onClick={() => goToStep('template')}>← Go back</button>
          </div>
        )}

        {flow === 'working' && (
          <div className="ro-center ro-stage">
            <Leo />
            {errorMsg ? (
              <>
                <h1 className="ro-title">Something went wrong while tailoring.</h1>
                <p className="ro-error"><AlertTriangle size={14} /> {errorMsg}</p>
                <div className="ro-actions">
                  <button type="button" className="ro-btn ro-btn--green" onClick={() => startTailoring(templateId)}><RefreshCw size={15} /> Try again</button>
                  <button type="button" className="ro-btn ro-btn--purple" onClick={() => goToStep('jd')}>Change the job description</button>
                </div>
              </>
            ) : (
              <>
                <h1 className="ro-title">I'm tailoring your resume for this job…</h1>
                <ul className="tlr-phases" aria-live="polite">
                  {PHASES.map((p, i) => (
                    <li key={p} className={i < phase ? 'is-done' : i === phase ? 'is-on' : ''}>
                      {i < phase ? <CheckCircle2 size={17} /> : i === phase ? <Loader2 size={17} className="ro-spin" /> : <span className="tlr-phase-dot" />}
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="ro-sub">This usually takes 20 to 40 seconds. Please keep this page open.</p>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────
  if (result) {
    const band = scoreBand(result.matchScore || 0);
    const matched = toChips(result.matchedSkills);
    const missing = toChips(result.missingSkillsRecommended);
    const score = Math.max(0, Math.min(100, Math.round(result.matchScore || 0)));
    return (
      <div className="tlr tlr-result">
        <div className="tlr-wrap">
          <div className="tlr-result-top">
            <button type="button" className="tlr-back" onClick={reset}><ArrowLeft size={16} /> Tailor another resume</button>
          </div>

          <section className="tlr-done">
            <div className="tlr-done-leo"><Leo /></div>
            <div className="tlr-done-copy">
              <h1>{html ? 'Done! Your resume is tailored for this job.' : 'Your tailored resume'}</h1>
              {html && <p>Download it now, or open it in the CVMind resume editor to keep working on it.</p>}
              <small className="tlr-done-meta">{sourceName ? `${sourceName} · ` : ''}{templateFor(result.templateId).name} template</small>
              {html && (
                <div className="tlr-done-actions">
                  <button type="button" className="tlr-btn" onClick={() => setShowDownload(true)}><Download size={17} /> Download</button>
                  <button type="button" className="tlr-btn tlr-btn--purple" disabled={handingOff} onClick={openInEditor}>
                    {handingOff ? <Loader2 size={17} className="tlr-spin" /> : <PencilLine size={17} />} Edit in CVMind Resume Editor
                  </button>
                </div>
              )}
              <p className="tlr-fine"><Lock size={12} /> The cvmind.in · Powered by CVMind footer stays on every page.{readUser() ? '' : ' Sign in to save it to My Documents.'}</p>
            </div>
          </section>

          {errorMsg && <div className="tlr-error" role="alert"><AlertTriangle size={16} /> {errorMsg}</div>}

          <div className="tlr-result-grid">
            <div className="tlr-paper">
              {html ? (
                <div className={retemplating ? 'is-busy' : undefined}>
                  <ResumeSheet html={html} />
                  {retemplating && <div className="tlr-paper-busy"><Loader2 size={22} className="tlr-spin" /> Switching template…</div>}
                </div>
              ) : (
                <div className="tlr-paper-empty">
                  <FileText size={28} />
                  <h3>This tailor was saved before designed resumes were added</h3>
                  <p>Run it again to get a resume in a CVMind template that you can download or edit.</p>
                  <button type="button" className="tlr-btn" disabled={loading || !resumeText} onClick={() => runTailor(jobDescription, resumeText)}>
                    {loading ? <><Loader2 size={16} className="tlr-spin" /> {PHASES[phase]}…</> : <><RefreshCw size={16} /> Run it again</>}
                  </button>
                </div>
              )}
            </div>

            <aside className="tlr-side">

              <section className={`tlr-card tlr-score tlr-score--${band.tone}`}>
                <div className="tlr-ring" style={{ '--p': score } as React.CSSProperties}>
                  <b>{score}<small>%</small></b>
                </div>
                <div>
                  <span className="tlr-score-label">{band.label}</span>
                  <p>{band.text}</p>
                  <small className="tlr-fine">Estimated by AI. Use it as a guide.</small>
                </div>
              </section>

              {result.tailoredData && (
                <section className="tlr-card">
                  <h3>Template</h3>
                  <div className="tlr-mini-templates">
                    {RESUME_TEMPLATES.slice(0, 8).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className={`tlr-mini${t.id === result.templateId ? ' is-on' : ''}`}
                        onClick={() => changeTemplate(t.id)}
                        disabled={retemplating}
                        aria-pressed={t.id === result.templateId}
                        title={t.name}
                      >
                        <TemplatePreview html={t.html} name={t.name} aspect="1 / 1.2" />
                        <span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {(matched.length > 0 || missing.length > 0) && (
                <section className="tlr-card">
                  {matched.length > 0 && (
                    <>
                      <h3>Skills from the job you now show</h3>
                      <div className="tlr-chips">{matched.map(s => <span key={s} className="tlr-chip tlr-chip--ok">{s}</span>)}</div>
                    </>
                  )}
                  {missing.length > 0 && (
                    <>
                      <h3 className={matched.length ? 'tlr-mt' : undefined}>Missing or weak</h3>
                      <p className="tlr-fine">Add these only if you really have them.</p>
                      <div className="tlr-chips">{missing.map(s => <span key={s} className="tlr-chip tlr-chip--miss">{s}</span>)}</div>
                    </>
                  )}
                </section>
              )}

              {result.keyTailoringInsights?.length > 0 && (
                <section className="tlr-card">
                  <h3>What changed</h3>
                  <ul className="tlr-list">
                    {result.keyTailoringInsights.map(i => <li key={i}><CheckCircle2 size={15} />{i}</li>)}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>

        {showDownload && (
          <ResumeDownload
            defaultName={result.tailoredData?.personalInfo?.fullName ? `${result.tailoredData.personalInfo.fullName} Resume` : 'Tailored Resume'}
            paper="a4"
            getHtml={() => html}
            getText={() => htmlToText(html)}
            customApiKey={customApiKey}
            onWord={downloadWord}
            onScan={jd => { setShowDownload(false); setJobDescription(jd); if (resumeText) runTailor(jd, resumeText); }}
            onClose={() => setShowDownload(false)}
          />
        )}
      </div>
    );
  }

  // ── INTRO + TOOL ─────────────────────────────────────────────
  return (
    <div className="tlr">
      <section className="tlr-hero">
        <div className="tlr-wrap tlr-hero-grid">
          <div className="tlr-hero-copy">
            <nav className="tlr-crumb" aria-label="Breadcrumb">
              <button type="button" onClick={() => setCurrentPage('home')} aria-label="Home"><Home size={14} /></button>
              <span aria-hidden="true">›</span>
              <span>Resume Tailorer</span>
            </nav>
            <h1>Tailor your resume to <em>the job you want</em></h1>
            <ul className="tlr-checks">
              <li><CheckCircle2 size={18} />Upload your CV and paste the job description. AI rewrites your summary, bullets and skills around what the job asks for.</li>
              <li><CheckCircle2 size={18} />Your facts stay yours: companies, titles, dates and degrees are kept as they are.</li>
              <li><CheckCircle2 size={18} />Get it in a CVMind template. Download PDF, Word or TXT, or keep editing in the resume editor.</li>
            </ul>
            <p className="tlr-note">Free to try. No card needed.</p>
          </div>

          <div className="tlr-start">
            <div className="tlr-start-leo"><Leo /></div>
            <h2>Leo will walk you through it</h2>
            <ol className="tlr-start-steps">
              <li><span>1</span>Upload your CV or paste a link</li>
              <li><span>2</span>Paste the job description or job link</li>
              <li><span>3</span>Pick a template, then download or edit</li>
            </ol>
            <label
              className={`tlr-drop${dragActive ? ' is-drag' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={e => { handleDrop(e); if (e.dataTransfer.files?.[0]) { setUploadMode('file'); setFlow('cv'); } }}
            >
              <input type="file" accept=".pdf,.docx,.txt" onChange={e => { if (e.target.files?.[0]) { validateFile(e.target.files[0]); setUploadMode('file'); setFlow('cv'); } }} />
              <Upload size={22} />
              <span><b>Drop your CV here</b> to start</span>
              <small>PDF, DOCX or TXT · up to 5 MB</small>
            </label>
            <button type="button" className="tlr-btn tlr-btn--block tlr-btn--big" onClick={() => openFlow('cv')}>
              <Sparkles size={18} /> Tailor my resume with Leo
            </button>
          </div>
        </div>
      </section>

      <section className="tlr-light">
        <div className="tlr-wrap">
          <p className="tlr-kicker">How it works</p>
          <h2 className="tlr-center">Three steps to a resume written for the job</h2>
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
            <span className="tlr-tag">What changes</span>
            <h2>Rewritten around the job</h2>
            <ul className="tlr-list">{CHANGES.map(c => <li key={c}><CheckCircle2 size={16} />{c}</li>)}</ul>
          </div>
          <div>
            <span className="tlr-tag tlr-tag--kept">What stays the same</span>
            <h2>Your facts, untouched</h2>
            <ul className="tlr-list tlr-list--kept">{KEPT.map(c => <li key={c}><Lock size={15} />{c}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="tlr-light">
        <div className="tlr-wrap">
          <h2 className="tlr-center">Choose the template for your tailored resume</h2>
          <p className="tlr-center tlr-sub">Real layouts, rendered here as they will download. You can switch later, too.</p>
          <div className="tlr-templates">
            {RESUME_TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                className={`tlr-tpl${t.id === templateId ? ' is-on' : ''}`}
                style={{ '--t': t.accent } as React.CSSProperties}
                onClick={() => { setTemplateId(t.id); setPickedOnIntro(true); openFlow('cv'); }}
                aria-pressed={t.id === templateId}
              >
                <TemplatePreview html={t.html} name={t.name} />
                <span className="tlr-tpl-name">{t.id === templateId && <CheckCircle2 size={15} />}{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="tlr-dark">
        <div className="tlr-wrap">
          <h2 className="tlr-center">Then keep going in the CVMind resume editor</h2>
          <p className="tlr-center tlr-dark-sub">One click opens your tailored resume in the full editor, with every tool it has.</p>
          <div className="tlr-tools">
            {EDITOR_TOOLS.map(t => (
              <div key={t.title} className="tlr-tool-item">
                <t.icon size={20} />
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tlr-light tlr-light--tint">
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
          <h2>Ready for your next application?</h2>
          <p>Upload your CV, paste the job, and get a tailored resume in under a minute.</p>
          <button type="button" className="tlr-btn tlr-btn--big" onClick={() => openFlow('cv')}>Tailor my resume <ArrowRight size={18} /></button>
        </div>
      </section>
    </div>
  );
}

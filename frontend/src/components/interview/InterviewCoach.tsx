import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ChevronDown, FileText, Home, Link2, Loader2, Mic, PenLine,
  RefreshCw, Sparkles, Target, Upload, UserRound, Volume2, X,
} from 'lucide-react';
import { Leo, Stepper } from '../ResumeOnboarding';
import { authFetch } from '../../lib/authFetch';
import { API_BASE } from '../../lib/apiBase';
import { cvFileError, isLink, readJobLink } from '../../lib/jobInput';
import { parseSavedContent } from '../../utils/savedWork';
import { getErrorMessage } from '../../utils/errors';
import type { LoadedWork } from '../../types/api';
import InterviewSession from './InterviewSession';
import InterviewReport from './InterviewReport';
import { useLeoVoice } from './useLeoVoice';
import { COUNTS, LEVELS, ROUNDS } from './types';
import type { InterviewMode, InterviewQuestion, InterviewReportData, InterviewSettings, InterviewTurn, SavedInterview } from './types';
import '../ResumeOnboarding.css';
import '../../pages/Tailor.css';
import './Interview.css';

export interface InterviewCoachProps {
  mode: InterviewMode;
  customApiKey: string;
  /** The CV text the app already has (from the Resume Checker or an earlier run) */
  resumeText: string;
  setResumeText?: (text: string) => void;
  setCurrentPage: (page: string) => void;
  loadedWork: LoadedWork | null;
  setLoadedWork: (work: LoadedWork | null) => void;
  /** Hides the site chrome while Leo's guided flow or the interview is open. */
  onFocusChange?: (mode: false | 'flow') => void;
}

// Leo's guided steps, then the interview itself; null shows the intro page (or the report)
type Flow = null | 'cv' | 'job' | 'setup' | 'working' | 'interview';
const FLOW_DOT: Record<Exclude<Flow, null | 'interview'>, number> = { cv: 1, job: 2, setup: 3, working: 4 };
type CvSource = 'file' | 'link' | 'saved' | 'none';

const PHASES = ['Reading your CV', 'Studying the job', 'Writing your questions'];

const COPY = {
  text: {
    page: 'prep',
    other: 'voice-prep',
    name: 'Interview Prep AI',
    heroTitle: <>Practise the interview <em>before it's real</em></>,
    checks: [
      'Leo reads your CV and the job description, then asks the questions this interviewer is likely to ask.',
      'Type each answer and get a score, what was missing, and a stronger way to say it.',
      'Finish with a report: strengths, weak areas, and questions to practise next.',
    ],
    cta: 'Start my mock interview',
    leoHello: "Hi, I'm Leo. I'll run a mock interview for you. First, add your CV so I can ask about your real experience.",
    working: "I'm preparing your interview…",
  },
  voice: {
    page: 'voice-prep',
    other: 'prep',
    name: 'Voice Prep AI',
    heroTitle: <>Answer out loud, <em>like the real call</em></>,
    checks: [
      'Leo asks each question out loud, built from your CV and the job you want.',
      'Answer by speaking. Your words are turned into text in your browser as you talk.',
      'Get feedback on what you said and how you said it: pace, filler words and confidence.',
    ],
    cta: 'Start my voice interview',
    leoHello: "Hi, I'm Leo. I'll interview you out loud, like a real call. First, add your CV so I can ask about your real experience.",
    working: "I'm getting your interview ready…",
  },
} as const;

const STEPS = [
  { icon: Upload, title: 'Add your CV', text: 'Upload it, paste a link, or skip and practise general questions for the role.' },
  { icon: Target, title: 'Tell Leo the job', text: 'The role, plus the job description or a link to the posting if you have one.' },
  { icon: BarChart3, title: 'Interview and review', text: 'Answer each question, get instant feedback, then a full report at the end.' },
];

const FAQS = [
  { q: 'Are the questions really based on my CV and the job?', a: 'Yes. Leo sends your CV text and the job description to our AI provider and asks for questions this interviewer would likely ask, including about gaps between the two. Without a CV or job description, the questions are general for the role.' },
  { q: 'How does the voice mode work?', a: 'Leo reads each question with your browser\'s built-in voice. When you answer, your browser turns speech into text (Chrome and Edge support this). Only the text is sent to us, never a recording. Pace and filler words are counted from that text.' },
  { q: 'How is my answer scored?', a: 'The AI scores each answer out of 10 for content, structure, relevance and clarity (and confidence for spoken answers). The overall score is the average of your answered questions. It is a practice guide, not a prediction of the real result.' },
  { q: 'Is anything saved?', a: 'When you are signed in, the finished interview (questions, your answers and the feedback) is saved to My Documents so you can review it later. We don\'t sell your data.' },
];

/** Older saved sessions ('prep' and 'voice-prep' works from before Leo) opened in the new report. */
function fromSaved(raw: unknown, mode: InterviewMode): SavedInterview | null {
  const s = raw as Record<string, unknown> | null;
  if (!s) return null;
  if (s.version === 2 && Array.isArray(s.questions) && s.report) return s as unknown as SavedInterview;

  type OldEval = { score?: number; strengths?: string; improvements?: string; refinedAnswer?: string };
  const avg = (turns: InterviewTurn[]) => {
    const scored = turns.filter(t => t.feedback);
    return scored.length ? Math.round((scored.reduce((n, t) => n + (t.feedback?.score || 0), 0) / scored.length) * 10) : 0;
  };

  // Old SmartPrep: { questions: [{ category, question, answer, tip }], userAnswers, evaluations }
  if (mode === 'text' && Array.isArray(s.questions)) {
    const old = s.questions as { category?: string; question?: string; tip?: string }[];
    const answers = (s.userAnswers || {}) as Record<string, string>;
    const evals = (s.evaluations || {}) as Record<string, OldEval>;
    const questions: InterviewQuestion[] = old.map((q, i) => ({
      id: `q${i + 1}`, question: q.question || '', category: q.category || 'Interview', difficulty: 'Medium', whatInterviewerWants: q.tip || '', keyPoints: [],
    }));
    const turns: InterviewTurn[] = questions.flatMap((q, i) => {
      const e = evals[i];
      if (!e || !answers[i]) return [];
      return [{ questionId: q.id, answer: answers[i], feedback: { score: Number(e.score) || 0, strengths: e.strengths ? [e.strengths] : [], missing: e.improvements ? [e.improvements] : [], improvedAnswer: e.refinedAnswer || '' } }];
    });
    return {
      version: 2, mode, settings: { role: 'Interview practice', level: 'Mid-level', round: 'Mixed', count: questions.length },
      resumeText: typeof s.resumeText === 'string' ? s.resumeText : '', questions, turns,
      report: { overallScore: avg(turns), answered: turns.length, summary: '', strengths: [], weakAreas: [], practiceNext: [] },
    };
  }

  // Old Voice Prep: { question, transcript, jobTitle, result }
  if (mode === 'voice' && typeof s.question === 'string') {
    const r = (s.result || {}) as { overallScore?: number; strengths?: string[]; improvements?: string[]; improvedAnswer?: string; verdict?: string };
    const q: InterviewQuestion = { id: 'q1', question: s.question, category: 'Interview', difficulty: 'Medium', whatInterviewerWants: '', keyPoints: [] };
    const turns: InterviewTurn[] = typeof s.transcript === 'string' && s.transcript
      ? [{ questionId: 'q1', answer: s.transcript, feedback: { score: Number(r.overallScore) || 0, verdict: r.verdict, strengths: r.strengths || [], missing: r.improvements || [], improvedAnswer: r.improvedAnswer || '' } }]
      : [];
    return {
      version: 2, mode, settings: { role: String(s.jobTitle || 'Interview practice'), level: 'Mid-level', round: 'Mixed', count: 1 },
      questions: [q], turns,
      report: { overallScore: avg(turns), answered: turns.length, summary: '', strengths: [], weakAreas: [], practiceNext: [] },
    };
  }
  return null;
}

export default function InterviewCoach({ mode, customApiKey, resumeText: appResumeText, setResumeText, setCurrentPage, loadedWork, setLoadedWork, onFocusChange }: InterviewCoachProps) {
  const copy = COPY[mode];
  const [flow, setFlow] = useState<Flow>(null);
  const [cvSource, setCvSource] = useState<CvSource>(appResumeText.trim().length >= 50 ? 'saved' : 'file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [settings, setSettings] = useState<InterviewSettings>({ role: '', level: 'Mid-level', round: 'Mixed', count: 5 });
  const [jobDescription, setJobDescription] = useState('');
  const [jobBusy, setJobBusy] = useState(false);
  const [leoSpeaks, setLeoSpeaks] = useState(true);
  const [phase, setPhase] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [usedResumeText, setUsedResumeText] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [report, setReport] = useState<InterviewReportData | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceTest = useLeoVoice();
  const hasAppResume = appResumeText.trim().length >= 50;

  useEffect(() => {
    onFocusChange?.(flow ? 'flow' : false);
  }, [flow, onFocusChange]);
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
    const timers = [setTimeout(() => setPhase(1), 3000), setTimeout(() => setPhase(2), 8000)];
    return () => timers.forEach(clearTimeout);
  }, [flow, errorMsg]);

  // Reopen a saved interview from My Documents. Local state is adjusted during render;
  // clearing the parent's one-shot loadedWork happens in the effect below.
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (!loadedWork.deleted && loadedWork.type === copy.page) {
      const saved = fromSaved(parseSavedContent(loadedWork.htmlContent), mode);
      if (saved && saved.questions.length) {
        setSettings({ ...saved.settings, count: saved.settings.count || saved.questions.length });
        setQuestions(saved.questions);
        setTurns(saved.turns || []);
        setJobDescription(saved.jobDescription || '');
        setUsedResumeText(saved.resumeText || '');
        setSourceName(saved.fileName || '');
        setErrorMsg(null);
        // A session with no scored answers carries on as an interview
        if (saved.turns?.some(t => t.feedback)) { setReport(saved.report); setFlow(null); }
        else { setReport(null); setFlow('interview'); }
      }
    }
  }
  useEffect(() => {
    if (loadedWork) setLoadedWork(null);
  }, [loadedWork, setLoadedWork]);

  const apiHeaders = (json = false) => {
    const h: Record<string, string> = json ? { 'Content-Type': 'application/json' } : {};
    if (customApiKey) h['x-gemini-key'] = customApiKey;
    return h;
  };

  const validateFile = (file: File) => {
    const problem = cvFileError(file);
    setErrorMsg(problem);
    if (!problem) { setSelectedFile(file); setCvSource('file'); }
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

  const openFlow = (step: Exclude<Flow, null> = 'cv') => {
    setErrorMsg(null);
    setFlow(step);
    window.scrollTo({ top: 0 });
  };

  const goToStep = (step: Exclude<Flow, null>) => {
    setErrorMsg(null);
    setFlow(step);
  };

  const cvReady = cvSource === 'file' ? Boolean(selectedFile) : cvSource === 'link' ? isLink(resumeUrl) : true;

  /** A job link is read into a description first; pasted text goes straight on. The JD is optional. */
  const submitJob = async () => {
    const text = jobDescription.trim();
    setErrorMsg(null);
    if (isLink(text)) {
      setJobBusy(true);
      try {
        const job = await readJobLink(text, apiHeaders());
        setJobDescription(job.text);
        if (!settings.role.trim() && job.title) setSettings(s => ({ ...s, role: job.title.slice(0, 120) }));
        else if (!settings.role.trim()) { setErrorMsg('Please add the role you are interviewing for.'); return; }
        setFlow('setup');
      } catch (err) {
        setErrorMsg(getErrorMessage(err) || "I couldn't read that job link.");
      } finally {
        setJobBusy(false);
      }
      return;
    }
    if (!settings.role.trim()) { setErrorMsg('Please add the role you are interviewing for.'); return; }
    if (text && text.length < 60) { setErrorMsg('Please paste a bit more of the job description, or leave it empty.'); return; }
    setFlow('setup');
  };

  const startInterview = async () => {
    setFlow('working');
    setPhase(0);
    setErrorMsg(null);
    voiceTest.stop();

    const form = new FormData();
    if (cvSource === 'file' && selectedFile) form.append('resume', selectedFile);
    else if (cvSource === 'link') form.append('resumeUrl', resumeUrl.trim());
    else if (cvSource === 'saved') form.append('resumeText', usedResumeText || appResumeText);
    form.append('role', settings.role.trim());
    form.append('jobDescription', jobDescription.trim());
    form.append('level', settings.level);
    form.append('round', settings.round);
    form.append('count', String(settings.count));
    form.append('mode', mode);

    try {
      const res = await authFetch(`${API_BASE}/api/interview/plan`, { method: 'POST', headers: apiHeaders(), body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not prepare your interview. Please try again.');
      const qs: InterviewQuestion[] = body.data?.questions || [];
      if (!qs.length) throw new Error('Leo could not come up with questions. Please try again.');
      const text = typeof body.resumeText === 'string' ? body.resumeText : '';
      setQuestions(qs);
      setTurns([]);
      setReport(null);
      setFinishError(null);
      setUsedResumeText(text);
      setSourceName(cvSource === 'file' ? selectedFile?.name || '' : cvSource === 'link' ? 'Linked CV' : cvSource === 'saved' ? 'Your saved resume' : '');
      if (text && !hasAppResume) setResumeText?.(text);
      setFlow('interview');
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || 'Something went wrong on our side. Please try again in a moment.');
    }
  };

  const finish = async (finalTurns: InterviewTurn[]) => {
    if (!finalTurns.some(t => t.feedback)) { setFlow(null); return; }
    setFinishing(true);
    setFinishError(null);
    try {
      const res = await authFetch(`${API_BASE}/api/interview/report`, {
        method: 'POST',
        headers: apiHeaders(true),
        body: JSON.stringify({ mode, settings, fileName: sourceName, jobDescription, resumeText: usedResumeText, questions, turns: finalTurns }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.data) throw new Error(body.error || 'Could not write your report. Please try again.');
      setReport(body.data);
      setFlow(null);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setFinishError(getErrorMessage(err) || 'Could not write your report. Please try again.');
    } finally {
      setFinishing(false);
    }
  };

  const retryWeak = () => {
    const weak = questions.filter(q => {
      const fb = turns.find(t => t.questionId === q.id)?.feedback;
      return !fb || fb.score < 6;
    });
    setQuestions(weak.length ? weak : questions);
    setTurns([]);
    setReport(null);
    setFinishError(null);
    openFlow('interview');
  };

  const startOver = () => {
    setReport(null);
    setQuestions([]);
    setTurns([]);
    setFinishError(null);
    openFlow('cv');
  };

  // ── LEO'S GUIDED FLOW + THE INTERVIEW ────────────────────────
  if (flow === 'interview' && questions.length) {
    return (
      <div className="ro-page tlr tlr-flow ivw ivw-flow">
        <InterviewSession
          mode={mode}
          settings={settings}
          questions={questions}
          turns={turns}
          setTurns={setTurns}
          jobDescription={jobDescription}
          resumeText={usedResumeText}
          customApiKey={customApiKey}
          leoSpeaks={leoSpeaks}
          finishing={finishing}
          finishError={finishError}
          onFinish={finish}
          onExit={() => { setFlow(null); setFinishError(null); }}
        />
      </div>
    );
  }

  if (flow && flow !== 'interview') {
    return (
      <div className="ro-page tlr tlr-flow ivw ivw-flow">
        <button type="button" className="tlr-flow-exit" onClick={() => { voiceTest.stop(); setFlow(null); setErrorMsg(null); }} disabled={flow === 'working' && !errorMsg} aria-label={`Exit ${copy.name}`}>
          Exit <X size={15} />
        </button>
        <Stepper active={FLOW_DOT[flow]} total={4} />

        {flow === 'cv' && (
          <div className="ro-center ro-stage">
            <Leo pose="support" />
            <h1 className="ro-title">{copy.leoHello}</h1>
            <div className={`tlr-toggle tlr-flow-toggle ivw-cv-toggle${hasAppResume ? ' has-3' : ''}`} role="tablist" aria-label="How to add your CV">
              {hasAppResume && (
                <button type="button" role="tab" aria-selected={cvSource === 'saved'} className={cvSource === 'saved' ? 'is-on' : ''} onClick={() => { setCvSource('saved'); setErrorMsg(null); }}>
                  <FileText size={14} /> My resume
                </button>
              )}
              <button type="button" role="tab" aria-selected={cvSource === 'file'} className={cvSource === 'file' ? 'is-on' : ''} onClick={() => { setCvSource('file'); setErrorMsg(null); }}>
                <Upload size={14} /> Upload file
              </button>
              <button type="button" role="tab" aria-selected={cvSource === 'link'} className={cvSource === 'link' ? 'is-on' : ''} onClick={() => { setCvSource('link'); setErrorMsg(null); }}>
                <Link2 size={14} /> Paste link
              </button>
            </div>
            <div className="tlr-flow-box">
              {cvSource === 'saved' && (
                <div className="tlr-file">
                  <FileText size={22} />
                  <div><strong>The resume you already added</strong><small>{appResumeText.trim().slice(0, 70)}…</small></div>
                </div>
              )}
              {cvSource === 'file' && (selectedFile ? (
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
              {cvSource === 'link' && (
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
            <button type="button" className="ro-btn ro-btn--green" disabled={!cvReady} onClick={() => goToStep('job')}>Next <ArrowRight size={16} /></button>
            <button type="button" className="ro-link" onClick={() => { setCvSource('none'); goToStep('job'); }}>Skip, practise without a CV</button>
          </div>
        )}

        {flow === 'job' && (
          <div className="ro-center ro-stage">
            <Leo pose="thinking" />
            <h1 className="ro-title">Which job are you preparing for?</h1>
            <p className="ro-sub">Add the role. A job description or link makes the questions much closer to the real thing.</p>
            <input
              type="text"
              className="tlr-input ivw-role"
              placeholder="Role, e.g. Data Analyst, Frontend Developer, Product Manager"
              value={settings.role}
              onChange={e => { setSettings(s => ({ ...s, role: e.target.value })); setErrorMsg(null); }}
              aria-label="Role you are interviewing for"
              maxLength={120}
              autoFocus
            />
            <textarea
              className="tlr-textarea tlr-flow-box tlr-flow-jd"
              placeholder="Optional: paste the job description or a job link (https://…)"
              value={jobDescription}
              onChange={e => { setJobDescription(e.target.value); setErrorMsg(null); }}
              aria-label="Job description or job link (optional)"
            />
            {errorMsg && <p className="ro-error"><AlertTriangle size={14} /> {errorMsg}</p>}
            <button type="button" className="ro-btn ro-btn--green" disabled={(!settings.role.trim() && !isLink(jobDescription)) || jobBusy} onClick={submitJob}>
              {jobBusy ? <><Loader2 size={16} className="ro-spin" /> Reading the job…</> : <>Next <ArrowRight size={16} /></>}
            </button>
            <button type="button" className="ro-link" onClick={() => goToStep('cv')}>← Go back</button>
          </div>
        )}

        {flow === 'setup' && (
          <div className="ro-center ro-stage">
            <Leo pose="support" />
            <h1 className="ro-title">How should I run your {settings.role.trim() || 'interview'}{settings.role.trim() ? ' interview' : ''}?</h1>
            <div className="ivw-setup">
              <fieldset>
                <legend>Your level</legend>
                <div className="ivw-chips">
                  {LEVELS.map(l => <button key={l} type="button" className={settings.level === l ? 'is-on' : ''} aria-pressed={settings.level === l} onClick={() => setSettings(s => ({ ...s, level: l }))}>{l}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend>Interview round</legend>
                <div className="ivw-chips">
                  {ROUNDS.map(r => <button key={r} type="button" className={settings.round === r ? 'is-on' : ''} aria-pressed={settings.round === r} onClick={() => setSettings(s => ({ ...s, round: r }))}>{r}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend>Number of questions</legend>
                <div className="ivw-chips">
                  {COUNTS.map(c => <button key={c} type="button" className={settings.count === c ? 'is-on' : ''} aria-pressed={settings.count === c} onClick={() => setSettings(s => ({ ...s, count: c }))}>{c} questions</button>)}
                </div>
              </fieldset>
              {mode === 'voice' && (
                <fieldset>
                  <legend>Leo's voice</legend>
                  {voiceTest.supported ? (
                    <div className="ivw-voice-row">
                      <label className="ivw-switch">
                        <input type="checkbox" checked={leoSpeaks} onChange={e => setLeoSpeaks(e.target.checked)} />
                        <span>Leo reads each question out loud</span>
                      </label>
                      <button type="button" className="ro-link" onClick={() => (voiceTest.speaking ? voiceTest.stop() : voiceTest.speak(`Hi! I'm Leo. Let's practise your ${settings.role.trim() || 'interview'} interview.`))}>
                        <Volume2 size={14} /> {voiceTest.speaking ? 'Stop' : 'Test the voice'}
                      </button>
                    </div>
                  ) : (
                    <p className="ivw-note"><AlertTriangle size={14} /> Your browser can't read questions aloud. They will show on screen.</p>
                  )}
                </fieldset>
              )}
            </div>
            {mode === 'voice' && <p className="ro-sub ivw-mic-note"><Mic size={14} /> Your browser will ask to use the microphone when you answer the first question.</p>}
            <button type="button" className="ro-btn ro-btn--green" onClick={startInterview}>Start the interview <ArrowRight size={16} /></button>
            <button type="button" className="ro-link" onClick={() => goToStep('job')}>← Go back</button>
          </div>
        )}

        {flow === 'working' && (
          <div className="ro-center ro-stage">
            <Leo pose={errorMsg ? 'thinking' : 'typing'} />
            {errorMsg ? (
              <>
                <h1 className="ro-title">Something went wrong while preparing your interview.</h1>
                <p className="ro-error"><AlertTriangle size={14} /> {errorMsg}</p>
                <div className="ro-actions">
                  <button type="button" className="ro-btn ro-btn--green" onClick={startInterview}><RefreshCw size={15} /> Try again</button>
                  <button type="button" className="ro-btn ro-btn--purple" onClick={() => goToStep('cv')}>Change my CV or job</button>
                </div>
              </>
            ) : (
              <>
                <h1 className="ro-title">{copy.working}</h1>
                <ul className="tlr-phases" aria-live="polite">
                  {PHASES.map((p, i) => (
                    <li key={p} className={i < phase ? 'is-done' : i === phase ? 'is-on' : ''}>
                      {i < phase ? <CheckCircle2 size={17} /> : i === phase ? <Loader2 size={17} className="ro-spin" /> : <span className="tlr-phase-dot" />}
                      {i === 0 && cvSource === 'none' ? 'Getting ready' : p}
                    </li>
                  ))}
                </ul>
                <p className="ro-sub">This usually takes 10 to 20 seconds.</p>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── REPORT ───────────────────────────────────────────────────
  if (report && questions.length) {
    return (
      <InterviewReport
        mode={mode}
        settings={settings}
        report={report}
        questions={questions}
        turns={turns}
        sourceName={sourceName}
        onRetryWeak={retryWeak}
        onNew={startOver}
        onSwitchMode={() => setCurrentPage(copy.other)}
      />
    );
  }

  // ── INTRO ────────────────────────────────────────────────────
  const inProgress = questions.length > 0 && !report;
  return (
    <div className="tlr ivw">
      <section className="tlr-hero">
        <div className="tlr-wrap tlr-hero-grid">
          <div className="tlr-hero-copy">
            <nav className="tlr-crumb" aria-label="Breadcrumb">
              <button type="button" onClick={() => setCurrentPage('home')} aria-label="Home"><Home size={14} /></button>
              <span aria-hidden="true">›</span>
              <span>{copy.name}</span>
            </nav>
            <h1>{copy.heroTitle}</h1>
            <ul className="tlr-checks">
              {copy.checks.map(c => <li key={c}><CheckCircle2 size={18} />{c}</li>)}
            </ul>
            <p className="tlr-note">Free to try. No card needed.</p>
          </div>

          <div className="tlr-start">
            <div className="tlr-start-leo"><Leo pose="support" /></div>
            <h2>Leo will interview you</h2>
            <ol className="tlr-start-steps">
              <li><span>1</span>Add your CV, or skip it</li>
              <li><span>2</span>Tell Leo the role and job description</li>
              <li><span>3</span>{mode === 'voice' ? 'Answer out loud, then get your report' : 'Answer each question, then get your report'}</li>
            </ol>
            {inProgress && (
              <button type="button" className="tlr-btn tlr-btn--outline tlr-btn--block" onClick={() => openFlow('interview')}>
                <ArrowRight size={17} /> Continue your interview ({turns.filter(t => t.feedback).length}/{questions.length} answered)
              </button>
            )}
            <button type="button" className="tlr-btn tlr-btn--block tlr-btn--big" onClick={() => openFlow('cv')}>
              <Sparkles size={18} /> {copy.cta}
            </button>
            <button type="button" className="ivw-switch-link" onClick={() => setCurrentPage(copy.other)}>
              {mode === 'voice' ? <><PenLine size={14} /> Prefer typing? Try Interview Prep AI</> : <><Mic size={14} /> Want to answer out loud? Try Voice Prep AI</>}
            </button>
          </div>
        </div>
      </section>

      <section className="tlr-light">
        <div className="tlr-wrap">
          <p className="tlr-kicker">How it works</p>
          <h2 className="tlr-center">A mock interview built from your CV and the job</h2>
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
            <span className="tlr-tag">After every answer</span>
            <h2>Feedback you can use straight away</h2>
            <ul className="tlr-list">
              <li><CheckCircle2 size={16} />A score out of 10, with content, structure and relevance</li>
              <li><CheckCircle2 size={16} />What you said well, and what was missing</li>
              <li><CheckCircle2 size={16} />A stronger version of your own answer, using your facts</li>
              {mode === 'voice' && <li><CheckCircle2 size={16} />Your pace in words per minute and the filler words you used</li>}
            </ul>
          </div>
          <div>
            <span className="tlr-tag tlr-tag--kept">At the end</span>
            <h2>Your interview report</h2>
            <ul className="tlr-list tlr-list--kept">
              <li><UserRound size={15} />An overall score and how ready you sound</li>
              <li><UserRound size={15} />Your strengths and the areas to work on</li>
              <li><UserRound size={15} />New questions to practise next, and one click to retry the weak ones</li>
              <li><UserRound size={15} />Saved to My Documents when you're signed in</li>
            </ul>
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
          <h2>Your next interview starts here</h2>
          <p>Add your CV and the job, and Leo will have your questions ready in seconds.</p>
          <button type="button" className="tlr-btn tlr-btn--big" onClick={() => openFlow('cv')}>{copy.cta} <ArrowRight size={18} /></button>
        </div>
      </section>
    </div>
  );
}

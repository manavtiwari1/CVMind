import { useEffect, useState } from 'react';
import type React from 'react';
import {
  AlertTriangle, Award, BadgeCheck, CheckCircle2, ClipboardCheck, Compass, Download, FileSearch, FileText, ListChecks,
  Search, Sparkles, Star, Tags, Upload, UserCheck, X,
} from 'lucide-react';
import {
  CareerApp, CareerIntro, CareerNext, CareerWorking, CharCount, CheckItem, CopyButton, Field, Panel, Progress, ScoreCard,
} from '../../components/career/CareerKit';
import type { IntroCopy } from '../../components/career/CareerKit';
import { downloadText, resultKey, useCareerRun, useChecklist } from '../../components/career/careerApi';
import { authFetch } from '../../lib/authFetch';
import { API_BASE } from '../../lib/apiBase';
import { readUser } from '../../lib/currentUser';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';

// /api/linkedin/analyze (linkedinSchema in backend/src/services/gemini.js); sectionScores is missing on older saves
interface LinkedInEvaluation {
  score: number;
  summary: string;
  sectionScores?: { headline: number; about: number; experience: number; skills: number };
  headline: { current: string; feedback: string; suggestions: string[] };
  about: { feedback: string; improvedText: string };
  experience: { feedback: string; tips: string[] };
  skillsAndKeywords: { matched: string[]; missing: string[] };
  generalTips: string[];
}

interface SavedAudit {
  evaluation?: LinkedInEvaluation;
  targetRole?: string;
  fileName?: string;
}

interface LinkedInProps {
  customApiKey: string;
  setCurrentPage?: (page: string) => void;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
  onFocusChange?: (mode: false | 'flow') => void;
}

const TOOL = { name: 'Profile PDF Audit', icon: UserCheck };
const PHASES = ['Reading your profile PDF', 'Checking headline, About and experience', 'Writing your fixes'];
// LinkedIn's limits for the headline and the About section
const HEADLINE_MAX = 220;
const ABOUT_MAX = 2600;
// Roughly what shows before "...see more" on the About section
const ABOUT_FOLD = 265;

const COPY: IntroCopy = {
  title: <>Get found by <em>recruiters on LinkedIn</em></>,
  checks: [
    'Upload the PDF of your LinkedIn profile and get a score for the headline, About, experience and skills.',
    'Get three new headlines and a rewritten About section, ready to copy.',
    'See the keywords recruiters search for that your profile is missing.',
  ],
  formTitle: 'Audit my profile',
  steps: [
    { icon: Download, title: 'Save your profile as PDF', text: 'On LinkedIn, open your profile, choose Resources (or More), then Save to PDF.' },
    { icon: Upload, title: 'Upload it here', text: 'Add the role you want recruiters to find you for, so the keywords match it.' },
    { icon: ClipboardCheck, title: 'Fix it section by section', text: 'Copy the new headline and About, add the missing keywords and tick off each fix.' },
  ],
  gets: [
    { icon: Award, title: 'A score for each section', text: 'Headline, About, experience and skills scored separately, so you know where to start.' },
    { icon: Sparkles, title: 'Copy-ready rewrites', text: 'Three headlines under LinkedIn\'s 220-character limit and a full About section in your voice.' },
    { icon: Tags, title: 'Missing keywords', text: 'Skills recruiters search for in your target role that your profile doesn\'t mention yet.' },
    { icon: ListChecks, title: 'A fix list you can tick off', text: 'Every change in one checklist. Your ticks are kept in this browser while you work through it.' },
  ],
  faqs: [
    { q: 'How do I get my LinkedIn profile as a PDF?', a: 'On a computer, open your LinkedIn profile, click Resources (on some accounts it is More), then Save to PDF. LinkedIn downloads a PDF of your profile. Upload that file here.' },
    { q: 'Does it change my LinkedIn profile?', a: 'No. CVMind never connects to your LinkedIn account. You get suggestions and rewritten text, and you decide what to paste into your profile.' },
    { q: 'What does the score mean?', a: 'It is the AI\'s estimate of how well your profile is set up to be found and read by recruiters, from 0 to 100. Use it to compare before and after, not as an official LinkedIn number.' },
    { q: 'Is my profile saved?', a: 'The text of your PDF is sent to our AI provider to write the audit. When you are signed in, the audit is saved to My Documents so you can reopen it. We don\'t sell your data.' },
  ],
  finalTitle: 'Your next recruiter is searching right now',
  finalText: 'Upload your profile PDF and get your fixes in under a minute.',
};

export default function LinkedIn({ customApiKey, setCurrentPage, loadedWork, setLoadedWork, onFocusChange }: LinkedInProps) {
  const runner = useCareerRun<LinkedInEvaluation>(onFocusChange);
  const { stage, result, show, run } = runner;
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [pickedHeadline, setPickedHeadline] = useState(0);

  // Reopen a saved audit from My Documents; the parent's one-shot loadedWork is cleared in the effect below
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (!loadedWork.deleted && loadedWork.type === 'linkedin') {
      const saved = parseSavedContent<SavedAudit>(loadedWork.htmlContent);
      if (saved?.evaluation) {
        setTargetRole(saved.targetRole || '');
        setSourceName(saved.fileName || '');
        setPickedHeadline(0);
        show(saved.evaluation);
      }
    }
  }
  useEffect(() => {
    if (loadedWork) setLoadedWork?.(null);
  }, [loadedWork, setLoadedWork]);

  const pickFile = (f: File) => {
    const isPdf = f.name.toLowerCase().endsWith('.pdf');
    const problem = !isPdf ? 'Please upload the PDF you saved from LinkedIn.' : f.size > 5 * 1024 * 1024 ? 'That file is over 5 MB. Please upload a smaller one.' : null;
    setFileError(problem);
    if (!problem) setFile(f);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(e.type === 'dragenter' || e.type === 'dragover');
  };

  const audit = () => {
    if (!file) return;
    const pdf = file;
    run(async () => {
      const form = new FormData();
      form.append('linkedinPdf', pdf);
      if (targetRole.trim()) form.append('targetRole', targetRole.trim());
      const headers: Record<string, string> = customApiKey ? { 'x-gemini-key': customApiKey } : {};
      const res = await authFetch(`${API_BASE}/api/linkedin/analyze`, { method: 'POST', headers, body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'The audit failed. Please try again.');
      if (!body.data?.headline) throw new Error('The AI could not read this profile. Check it is the PDF from LinkedIn and try again.');
      setSourceName(pdf.name);
      setPickedHeadline(0);
      return body.data as LinkedInEvaluation;
    });
  };

  if (stage === 'working') {
    return (
      <CareerWorking tool={TOOL} title="Auditing your LinkedIn profile…" phases={PHASES} phase={runner.phase} error={runner.error} onRetry={runner.retry} onEdit={runner.toIntro} />
    );
  }

  if (stage === 'result' && result) {
    return (
      <AuditResult
        result={result}
        targetRole={targetRole}
        sourceName={sourceName}
        picked={pickedHeadline}
        setPicked={setPickedHeadline}
        onAgain={() => { setFile(null); runner.toIntro(); }}
        onExit={runner.toIntro}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  return (
    <CareerIntro
      tool={TOOL}
      copy={COPY}
      setCurrentPage={setCurrentPage}
      resumeResult={result ? { label: `Back to your audit (score ${result.score})`, onClick: runner.toResult } : null}
      submit={{ label: 'Audit my profile', disabled: !file, onClick: audit, hint: file ? undefined : 'Add your LinkedIn PDF to start.' }}
    >
      <div className="crt-field">
        <span className="crt-label">LinkedIn profile PDF</span>
        {file ? (
          <div className="tlr-file">
            <FileText size={20} />
            <div><strong>{file.name}</strong><small>{(file.size / (1024 * 1024)).toFixed(2)} MB</small></div>
            <button type="button" onClick={() => setFile(null)} aria-label="Remove file"><X size={16} /></button>
          </div>
        ) : (
          <label className={`tlr-drop crt-drop${drag ? ' is-drag' : ''}`} onDragEnter={onDrag} onDragOver={onDrag} onDragLeave={onDrag} onDrop={e => { onDrag(e); setDrag(false); if (e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]); }}>
            <input type="file" accept=".pdf,application/pdf" onChange={e => { if (e.target.files?.[0]) pickFile(e.target.files[0]); e.target.value = ''; }} />
            <Upload size={20} />
            <span><b>Choose your profile PDF</b> or drag it here</span>
            <small>PDF up to 5 MB</small>
          </label>
        )}
        {fileError && <p className="tlr-error"><AlertTriangle size={15} /> {fileError}</p>}
      </div>
      <details className="crt-help">
        <summary>How do I get this PDF?</summary>
        <ol>
          <li>Open LinkedIn on a computer and go to your profile.</li>
          <li>Click <b>Resources</b> (on some accounts it is <b>More</b>) below your name.</li>
          <li>Choose <b>Save to PDF</b>. The file downloads straight away.</li>
        </ol>
      </details>
      <Field label="Role you want to be found for" optional hint="The keywords and headlines will match this role.">
        <input className="tlr-input" value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Product Designer, Data Analyst" maxLength={120} />
      </Field>
    </CareerIntro>
  );
}

interface AuditResultProps {
  result: LinkedInEvaluation;
  targetRole: string;
  sourceName: string;
  picked: number;
  setPicked: (i: number) => void;
  onAgain: () => void;
  onExit: () => void;
  setCurrentPage?: (page: string) => void;
}

function AuditResult({ result, targetRole, sourceName, picked, setPicked, onAgain, onExit, setCurrentPage }: AuditResultProps) {
  const suggestions = result.headline?.suggestions ?? [];
  const missing = result.skillsAndKeywords?.missing ?? [];
  const matched = result.skillsAndKeywords?.matched ?? [];
  const tips = result.experience?.tips ?? [];
  const general = result.generalTips ?? [];
  const about = result.about?.improvedText ?? '';
  const { done, toggle } = useChecklist(resultKey('linkedin', result));

  // Every fix in one list, in the order a recruiter reads a profile
  const fixes = [
    ...(suggestions.length ? [{ id: 'headline', text: 'Replace your headline with one of the new ones' }] : []),
    ...(about ? [{ id: 'about', text: 'Paste the new About section' }] : []),
    ...(missing.length ? [{ id: 'keywords', text: `Add the missing keywords to your Skills and About (${missing.length})` }] : []),
    ...tips.map((t, i) => ({ id: `exp-${i}`, text: t })),
    ...general.map((t, i) => ({ id: `tip-${i}`, text: t })),
  ];
  const doneCount = fixes.filter(f => done.has(f.id)).length;

  const sections = result.sectionScores ? [
    { label: 'Headline', n: result.sectionScores.headline },
    { label: 'About', n: result.sectionScores.about },
    { label: 'Experience', n: result.sectionScores.experience },
    { label: 'Skills', n: result.sectionScores.skills },
  ].map(s => ({ ...s, n: Math.max(0, Math.min(100, Math.round(Number(s.n) || 0))) })) : [];
  const tone = (n: number) => (n >= 80 ? 'var(--green)' : n >= 60 ? '#d97706' : 'var(--warn)');

  const report = () => [
    `LinkedIn profile audit${targetRole ? ` for ${targetRole}` : ''}`,
    `Score: ${result.score}/100`,
    '',
    result.summary,
    '',
    'NEW HEADLINES',
    ...suggestions.map((s, i) => `${i + 1}. ${s}`),
    '',
    'NEW ABOUT SECTION',
    about,
    '',
    'EXPERIENCE',
    result.experience?.feedback || '',
    ...tips.map(t => `- ${t}`),
    '',
    `MISSING KEYWORDS: ${missing.join(', ') || 'None'}`,
    '',
    'PROFILE TIPS',
    ...general.map(t => `- ${t}`),
  ].join('\n');

  return (
    <CareerApp
      tool={TOOL}
      againLabel="Audit another profile"
      onAgain={onAgain}
      onExit={onExit}
      heading={result.score >= 80 ? 'Your profile is in good shape. Here is how to finish it.' : `Your profile scored ${result.score}. Here is how to raise it.`}
      summary={result.summary}
      meta={[targetRole && `Target: ${targetRole}`, sourceName].filter(Boolean).join(' · ')}
      actions={
        <>
          {suggestions[picked] && <CopyButton text={suggestions[picked]} label="Copy the new headline" />}
          <button type="button" className="tlr-btn tlr-btn--outline" onClick={() => downloadText(`LinkedIn audit${targetRole ? ` - ${targetRole}` : ''}`, report())}><Download size={17} /> Download .txt</button>
        </>
      }
      footnote={readUser() ? 'Saved to My Documents.' : 'Sign in to save it to My Documents.'}
    >
      <div className="crt-layout">
        <div className="crt-main">
          <Panel title="Headline" icon={Award}>
            <div className="crt-sub">Now</div>
            <div className="crt-quote crt-quote--muted">{result.headline?.current || 'No headline found in your PDF.'}</div>
            {result.headline?.feedback && <p className="crt-text">{result.headline.feedback}</p>}
            {suggestions.length > 0 && <div className="crt-sub">Pick one</div>}
            {suggestions.map((s, i) => (
              <div key={i} className={`crt-option${picked === i ? ' is-on' : ''}`}>
                <div className="crt-option-top">
                  <button type="button" className={`crt-pick${picked === i ? ' is-on' : ''}`} aria-pressed={picked === i} onClick={() => setPicked(i)}>
                    {picked === i ? <><CheckCircle2 size={13} /> Picked</> : `Option ${i + 1}`}
                  </button>
                  <span className="crt-spacer" />
                  <CharCount text={s} limit={HEADLINE_MAX} />
                  <CopyButton text={s} small />
                </div>
                <p>{s}</p>
              </div>
            ))}
          </Panel>

          {about && (
            <Panel title="About section" icon={Star} action={<div className="crt-actions-row"><CharCount text={about} limit={ABOUT_MAX} /><CopyButton text={about} small /></div>}>
              {result.about?.feedback && <p className="crt-text">{result.about.feedback}</p>}
              <div className="crt-sub">New About</div>
              <div className="crt-quote">
                <strong>{about.slice(0, ABOUT_FOLD)}</strong>{about.slice(ABOUT_FOLD)}
              </div>
              <p className="tlr-fine">The bold part is roughly what people see before "see more", so it has to make them click.</p>
            </Panel>
          )}

          <Panel title="Keywords" icon={Search} action={missing.length > 0 ? <CopyButton text={missing.join(', ')} label="Copy missing" small /> : undefined}>
            <div className="crt-sub">Missing for {targetRole || 'your target role'}</div>
            <div className="tlr-chips">
              {missing.length ? missing.map(k => <span key={k} className="tlr-chip tlr-chip--miss">{k}</span>) : <span className="crt-text">None. Your profile covers the main keywords.</span>}
            </div>
            <div className="crt-sub">Already on your profile</div>
            <div className="tlr-chips">
              {matched.length ? matched.map(k => <span key={k} className="tlr-chip tlr-chip--ok">{k}</span>) : <span className="crt-text">No strong keywords found yet.</span>}
            </div>
          </Panel>

          <Panel title="Experience" icon={FileSearch}>
            {result.experience?.feedback && <p className="crt-text">{result.experience.feedback}</p>}
            <ul className="crt-bullets">{tips.map(t => <li key={t}><CheckCircle2 size={15} />{t}</li>)}</ul>
          </Panel>

          {general.length > 0 && (
            <Panel title="Profile tips" icon={Compass}>
              <ul className="crt-bullets">{general.map(t => <li key={t}><BadgeCheck size={15} />{t}</li>)}</ul>
            </Panel>
          )}
        </div>

        <aside className="crt-side">
          <ScoreCard score={result.score} title="Profile" note="How well recruiters can find and read your profile, estimated by AI." />
          {sections.length > 0 && (
            <section className="tlr-card">
              <h3>By section</h3>
              <ul className="crt-bars">
                {sections.map(s => (
                  <li key={s.label} style={{ '--tone': tone(s.n) } as React.CSSProperties}>
                    <span>{s.label}</span>
                    <i><em style={{ width: `${s.n}%` }} /></i>
                    <b>{s.n}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {fixes.length > 0 && (
            <section className="tlr-card">
              <h3>Your fix list</h3>
              <Progress done={doneCount} total={fixes.length} label="Fixes done" />
              <ul className="crt-checks crt-mt">
                {fixes.map(f => <CheckItem key={f.id} checked={done.has(f.id)} onToggle={() => toggle(f.id)}>{f.text}</CheckItem>)}
              </ul>
            </section>
          )}
          <CareerNext current="linkedin" setCurrentPage={setCurrentPage} pick={['linkedin-bio', 'linkedin-outreach', 'career-courses']} />
        </aside>
      </div>
    </CareerApp>
  );
}

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent } from 'react';
import {
  ArrowLeft, ArrowRight, Paperclip, Check, Copy, Download, ExternalLink, FileText, X, Monitor, Smartphone,
  Globe, Code2, Eye, SquarePen, RotateCcw, Rocket,
} from 'lucide-react';
import { LeoAvatar } from '../components/ResumeOnboarding';
import { LEO_POSES } from '../lib/leoPoses';
import { portfolioSlug as slug, siteUrl, suggestedUsername } from '../lib/portfolioSite';
import { getErrorMessage } from '../utils/errors';
import { authFetch, getSessionToken } from '../lib/authFetch';
import { parseSavedContent } from '../utils/savedWork';
import type { ExperienceEntry, LoadedWork, SavedWork } from '../types/api';
import PortfolioPublish, { type PublishedSite } from './PortfolioPublish';
import './PortfolioGen.css';

// Parsed resume behind a generated site (/api/portfolio/generate-site)
interface PortfolioData {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  experience?: ExperienceEntry[];
}

interface PortfolioGenProps {
  customApiKey: string;
  resumeText: string;
  setCurrentPage?: (page: string) => void;
  /** Leave the generator (back to the previous page). */
  onExit?: () => void;
  /** A saved portfolio opened from My Documents. */
  loadedWork: LoadedWork | null;
  setLoadedWork: (work: LoadedWork | null) => void;
}

// What generate-site stores in a saved work's htmlContent
interface SavedPortfolio {
  portfolioData?: PortfolioData | null;
  colorTheme?: string;
  portfolioHTML?: string;
}

// The colour themes the backend knows (themeColors in /api/portfolio/generate-site)
const THEMES = [
  { id: 'dark-pro', label: 'Dark Pro', color: '#6366f1', bg: '#0a0a0f', card: '#12121a', text: '#e2e8f0', muted: '#94a3b8' },
  { id: 'ocean', label: 'Ocean', color: '#0ea5e9', bg: '#0c1a2e', card: '#0f2744', text: '#e0f2fe', muted: '#7dd3fc' },
  { id: 'emerald', label: 'Emerald', color: '#10b981', bg: '#0a1a0f', card: '#0f2a1a', text: '#d1fae5', muted: '#6ee7b7' },
  { id: 'purple', label: 'Purple', color: '#a855f7', bg: '#0f0a1e', card: '#1a1030', text: '#ede9fe', muted: '#c4b5fd' },
  { id: 'minimal', label: 'Minimal', color: '#2997ff', bg: '#ffffff', card: '#f8fafc', text: '#0f172a', muted: '#475569' },
  // No set look: the user's description decides, or else the AI designer does
  { id: 'custom', label: 'Leo decides', color: '#12805c', bg: '#e6f4ee', card: '#ffffff', text: '#10231c', muted: '#33473f' },
];
type Theme = (typeof THEMES)[number];

// What Leo is doing while the site is generated
const BUILD_STEPS = ['Reading your resume', 'Picking out your experience and skills', 'Laying out the sections', 'Writing the page'];

const MIN_RESUME_CHARS = 50;

interface Source {
  text: string;
  /** Set when the resume came from an attached file. */
  fileName?: string;
}

interface Turn {
  id: number;
  source: Source;
  theme: string;
  /** How the user described the look, when they did. */
  design?: string;
  status: 'building' | 'done' | 'error';
  html?: string;
  data?: PortfolioData | null;
  /** The saved document behind this page; publishing reads the page from it. */
  workId?: string;
  error?: string;
  /** Built, but not saved to the account yet. */
  saveFailed?: boolean;
  saving?: boolean;
  saveError?: string;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
  || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

const themeOf = (id: string) => THEMES.find(t => t.id === id) || THEMES[0];
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const themeVars = (t: Theme) => ({
  '--s-bg': t.bg, '--s-card': t.card, '--s-accent': t.color, '--s-text': t.text, '--s-muted': t.muted,
}) as CSSProperties;

function firstName() {
  try {
    return (JSON.parse(localStorage.getItem('cvmind_user') || '{}').name || '').trim().split(/\s+/)[0] as string;
  } catch {
    return '';
  }
}

const isSavedPortfolio = (work: LoadedWork | null): work is SavedWork =>
  Boolean(work) && !('deleted' in work!) && (work as SavedWork).type === 'portfolio-gen';

// A saved portfolio as a build. Saved works don't keep the resume, so source.text is empty.
function savedTurn(work: SavedWork, id: number): Turn | null {
  const saved = parseSavedContent<SavedPortfolio>(work.htmlContent);
  if (!saved?.portfolioHTML) return null;
  return {
    id,
    source: { text: '' },
    theme: saved.colorTheme || 'dark-pro',
    status: 'done',
    html: saved.portfolioHTML,
    data: saved.portfolioData || null,
    workId: work.id || work._id,
  };
}

// A fictional person, so the look can be judged before there's a resume
function SamplePage({ theme }: { theme: Theme }) {
  return (
    <div className="pgx-page" style={themeVars(theme)}>
      <div className="pgx-page-nav">
        <strong>Ananya Rao</strong>
        <span>Work</span>
        <span>Contact</span>
      </div>
      <p className="pgx-page-kicker">Product designer</p>
      <p className="pgx-page-hero">I turn messy problems into simple screens.</p>
      <span className="pgx-page-btn">Get in touch</span>
      <div className="pgx-page-cards">
        <div>
          <strong>Clinic booking app</strong>
          <span>A calmer way for patients to book a visit</span>
        </div>
        <div>
          <strong>Neighbourhood grocer</strong>
          <span>Ordering flow for a local store</span>
        </div>
      </div>
      <div className="pgx-page-skills">
        <span>Figma</span><span>Research</span><span>Prototyping</span>
      </div>
    </div>
  );
}

export default function PortfolioGen({ customApiKey, resumeText, setCurrentPage, onExit, loadedWork, setLoadedWork }: PortfolioGenProps) {
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<Source | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [theme, setTheme] = useState('dark-pro');
  const [designDraft, setDesignDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // The studio: which build it shows, and how
  const [openTurn, setOpenTurn] = useState<number | null>(null);
  const [panelTab, setPanelTab] = useState<'preview' | 'code'>('preview');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState<number | null>(null);

  // This account's published site, and the build the Publish dialog is open for
  const [site, setSite] = useState<PublishedSite | null>(null);
  const [publishTurn, setPublishTurn] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(1);
  const openedFromDocuments = useRef(isSavedPortfolio(loadedWork));

  const building = turns.some(t => t.status === 'building');
  // A reopened portfolio has no resume behind it, so it can't be rebuilt in another look
  const lastSource = [...turns].reverse().find(t => t.source.text)?.source ?? null;
  const focus = turns.find(t => t.id === openTurn) ?? turns[turns.length - 1];
  const shown = focus?.status === 'done' ? focus : undefined;
  const publishing = turns.find(t => t.id === publishTurn && t.status === 'done');

  useEffect(() => {
    if (!getSessionToken()) return;
    let current = true;
    authFetch(`${baseUrl}/api/portfolio/site`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (current && data?.site) setSite(data.site); })
      .catch(() => { /* Publish still works; it just starts as a first publish */ });
    return () => { current = false; };
  }, []);

  // Coming back to the builder shows the newest saved portfolio, unless the user has already started
  useEffect(() => {
    if (!getSessionToken() || openedFromDocuments.current) return;
    let current = true;
    authFetch(`${baseUrl}/api/portfolio/latest`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!current || !data?.work || inputRef.current?.value.trim()) return;
        const turn = savedTurn(data.work, nextId.current++);
        if (turn) setTurns(prev => (prev.length ? prev : [turn]));
      })
      .catch(() => { /* The builder just starts empty */ });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!loadedWork) return;
    if (isSavedPortfolio(loadedWork)) {
      const turn = savedTurn(loadedWork, nextId.current++);
      if (turn) {
        setTurns([turn]);
        setOpenTurn(turn.id);
        setPanelTab('preview');
      } else {
        setComposerError('That saved portfolio could not be opened. Build it again from your resume.');
      }
    }
    setLoadedWork(null);
  }, [loadedWork, setLoadedWork]);

  const generate = async (source: Source, themeId: string, design = '') => {
    const id = nextId.current++;
    setTurns(prev => [...prev, { id, source, theme: themeId, design, status: 'building' }]);
    setOpenTurn(id);
    setPanelTab('preview');
    setUpdating(false);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await authFetch(`${baseUrl}/api/portfolio/generate-site`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ resumeText: source.text, colorTheme: themeId, style: themeId, design }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setTurns(prev => prev.map(t => t.id === id ? { ...t, status: 'done', html: data.data.portfolioHTML, data: data.data.portfolioData, workId: data.work?.id || data.work?._id, saveFailed: Boolean(data.saveFailed) } : t));
    } catch (err) {
      setTurns(prev => prev.map(t => t.id === id ? { ...t, status: 'error', error: getErrorMessage(err) || 'Generation failed. Please try again.' } : t));
    }
  };

  // Saves a page that's already built, so a failed save never costs another AI run
  const saveAgain = async (turn: Turn) => {
    const update = (changes: Partial<Turn>) => setTurns(prev => prev.map(t => t.id === turn.id ? { ...t, ...changes } : t));
    update({ saving: true, saveError: undefined });
    try {
      const res = await authFetch(`${baseUrl}/api/user/work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Portfolio - ${turn.data?.name || 'My Portfolio'}`,
          type: 'portfolio-gen',
          templateId: `portfolio-${turn.theme}`,
          htmlContent: JSON.stringify({ portfolioData: turn.data, colorTheme: turn.theme, style: turn.theme, portfolioHTML: turn.html }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save your portfolio.');
      update({ saving: false, saveFailed: false, workId: data.data.id || data.data._id });
    } catch (err) {
      update({ saving: false, saveError: getErrorMessage(err) || 'Could not save your portfolio. Please try again.' });
    }
  };

  // A described style takes the place of the selected look
  const startBuild = (source: Source) => {
    const design = designDraft.trim();
    setDesignDraft('');
    void generate(source, design ? 'custom' : theme, design);
  };

  const send = () => {
    if (building || attaching) return;
    setComposerError(null);
    const typed = draft.trim();
    const source = attachment ?? (typed.length >= MIN_RESUME_CHARS ? { text: typed } : null);
    if (!source) {
      setComposerError(typed
        ? `That looks too short for a resume. Paste the full text (at least ${MIN_RESUME_CHARS} characters) or attach a file.`
        : 'Paste your resume or attach a PDF, DOCX or TXT file to start.');
      return;
    }
    setDraft('');
    setAttachment(null);
    startBuild(source);
  };

  const readFile = async (file: File) => {
    setComposerError(null);
    setAttaching(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const headers: Record<string, string> = {};
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await authFetch(`${baseUrl}/api/resume/parse-data`, { method: 'POST', headers, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.rawText) throw new Error(data.error || 'Could not read that file.');
      setAttachment({ text: data.rawText, fileName: file.name });
    } catch (err) {
      setComposerError(getErrorMessage(err) || 'Could not read that file. Try a PDF, DOCX or TXT under 5 MB.');
    } finally {
      setAttaching(false);
    }
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void readFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !building && !attaching) void readFile(file);
  };

  // A look already built from this resume opens straight away, without another AI run
  const pickLook = (themeId: string) => {
    if (building || themeId === focus?.theme) return;
    setTheme(themeId);
    if (!lastSource) {
      setUpdating(true);
      return;
    }
    const built = [...turns].reverse().find(t => t.status === 'done' && t.theme === themeId && t.source === lastSource && !t.design);
    if (built) setOpenTurn(built.id);
    else void generate(lastSource, themeId);
  };

  const buildDescribedStyle = () => {
    const design = designDraft.trim();
    if (!design || building) return;
    if (!lastSource) {
      setUpdating(true);
      return;
    }
    setDesignDraft('');
    void generate(lastSource, 'custom', design);
  };

  const reset = () => {
    setTurns([]);
    setOpenTurn(null);
    setDraft('');
    setAttachment(null);
    setComposerError(null);
    setUpdating(false);
  };

  const copyHtml = (t: Turn) => {
    if (!t.html) return;
    void navigator.clipboard.writeText(t.html);
    setCopied(t.id);
    setTimeout(() => setCopied(c => (c === t.id ? null : c)), 2000);
  };

  const download = (t: Turn) => {
    if (!t.html) return;
    const url = URL.createObjectURL(new Blob([t.html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(t.data?.name)}-cvmind.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exit = () => (onExit ? onExit() : setCurrentPage?.('home'));
  const canSend = !building && !attaching && (Boolean(attachment) || draft.trim().length > 0);

  const lookTile = (t: Theme, active: boolean, onClick: () => void) => (
    <button key={t.id} type="button" className={`pgx-tile${active ? ' is-on' : ''}`} aria-pressed={active} onClick={onClick} disabled={building} style={themeVars(t)}>
      <span className="pgx-mini" aria-hidden="true"><i /><b /><b /><u /></span>
      <span className="pgx-tile-name">{active && <Check size={13} strokeWidth={3} />}{t.label}</span>
    </button>
  );

  const resumeForm = (cta: string) => (
    <div
      className={`pgx-resume${dragging ? ' is-drag' : ''}${composerError ? ' has-error' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {attachment || attaching ? (
        <div className="pgx-file">
          <span className="pgx-file-icon"><FileText size={20} /></span>
          <span className="pgx-file-text">
            <strong>{attaching ? 'Reading your file…' : attachment?.fileName}</strong>
            <span>{attaching ? 'Pulling out the text' : `${wordCount(attachment?.text || '')} words`}</span>
          </span>
          {attachment && (
            <button type="button" className="pgx-icon-btn" onClick={() => setAttachment(null)} aria-label="Remove file"><X size={16} /></button>
          )}
        </div>
      ) : (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Paste your resume here, or drop a file on this box"
          aria-label="Resume text"
          disabled={building}
        />
      )}

      {!attachment && !attaching && (
        <div className="pgx-resume-tools">
          <button type="button" className="pgx-chip" onClick={() => fileRef.current?.click()} disabled={building}>
            <Paperclip size={15} /> Attach PDF, DOCX or TXT
          </button>
          {resumeText.trim().length >= MIN_RESUME_CHARS && (
            <button type="button" className="pgx-chip" onClick={() => startBuild({ text: resumeText.trim(), fileName: 'Resume from the Resume Checker' })} disabled={building}>
              <FileText size={15} /> Use the resume I checked
            </button>
          )}
        </div>
      )}

      {composerError && <p className="pgx-error" role="alert">{composerError}</p>}

      <button type="button" className="pgx-build" onClick={send} disabled={!canSend}>
        {cta} <ArrowRight size={18} strokeWidth={2.4} />
      </button>
    </div>
  );

  const renderStart = () => {
    const name = firstName();
    const described = designDraft.trim().length > 0;
    const look = themeOf(described ? 'custom' : theme);
    return (
      <main className="pgx-start">
        <div className="pgx-start-grid">
          <div className="pgx-start-copy">
            <p className="pgx-hello">{name ? `Hi ${name}!` : 'Hi there!'}</p>
            <h1 className="pgx-title">Let's turn your resume into <span className="pgx-marker">your own website</span></h1>
            <p className="pgx-sub">Add your resume and pick a look. Leo builds a page you can share at <strong>yourname.portfolio.cvmind.in</strong>.</p>

            <section className="pgx-step">
              <h2 className="pgx-step-head"><span>1</span> Your resume</h2>
              {resumeForm('Build my website')}
            </section>

            {setCurrentPage && (
              <button type="button" className="pgx-noresume" onClick={() => setCurrentPage('resume-builder')}>
                No resume yet? Make one first
              </button>
            )}
          </div>

          <section className="pgx-look">
            <h2 className="pgx-step-head"><span>2</span> Pick a look</h2>
            <div className="pgx-tiles">
              {THEMES.map(t => lookTile(t, !described && t.id === theme, () => { setTheme(t.id); setDesignDraft(''); }))}
            </div>
            <label className="pgx-style">
              <span>Or describe your own style</span>
              <input value={designDraft} onChange={e => setDesignDraft(e.target.value)} maxLength={500} placeholder="Bold and colourful, like a film poster" disabled={building} />
            </label>
            <div className="pgx-sample">
              <img className="pgx-perch" src={LEO_POSES.idea} alt="" width={132} height={132} draggable={false} />
              <p className="pgx-note">this one looks good on you!</p>
              <div className="pgx-browser pgx-browser--sample">
                <div className="pgx-bar">
                  <span className="pgx-url"><Globe size={13} /><span>ananya-rao.portfolio.cvmind.in</span></span>
                </div>
                <SamplePage theme={look} />
              </div>
              <p className="pgx-sample-cap">
                {described ? 'Leo designs yours from your description and your resume.'
                  : look.id === 'custom' ? 'Leo picks the colours and layout to suit your resume.'
                    : `A sample in ${look.label}. Leo writes and lays out yours from your resume.`}
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  };

  const renderStage = (t: Turn) => {
    if (t.status === 'building') {
      return (
        <div className="pgx-skel" style={themeVars(themeOf(t.theme))} role="status" aria-label="Building your portfolio">
          <i className="pgx-skel-nav" /><i className="pgx-skel-hero" /><i className="pgx-skel-line" /><i className="pgx-skel-btn" />
          <div><i /><i /><i /></div>
        </div>
      );
    }
    if (t.status === 'error') {
      return (
        <div className="pgx-oops">
          <img src={LEO_POSES.thinking} alt="" width={120} height={120} draggable={false} />
          <h2>That one didn't work</h2>
          <p className="pgx-error" role="alert">{t.error}</p>
          <button type="button" className="pgx-chip" onClick={() => void generate(t.source, t.theme, t.design)} disabled={building}>
            <RotateCcw size={15} /> Try again
          </button>
        </div>
      );
    }
    if (panelTab === 'code') return <pre className="pgx-code"><code>{t.html}</code></pre>;
    return (
      <div className={`pgx-frame${device === 'mobile' ? ' is-mobile' : ''}`}>
        <iframe key={t.id} srcDoc={t.html} title="Portfolio preview" sandbox="allow-same-origin" />
      </div>
    );
  };

  const renderRailIntro = (t: Turn) => {
    if (t.status === 'building') {
      return (
        <div className="pgx-leo-card">
          <LeoAvatar size={46} pose="typing" className="pgx-leo pgx-leo--busy" />
          <div>
            <h2>Leo is building your site</h2>
            <ol className="pgx-steps">
              {BUILD_STEPS.map((s, i) => (
                <li key={s} style={{ '--i': i } as CSSProperties}><span><Check size={11} strokeWidth={3.5} /></span>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      );
    }
    if (t.status === 'error') {
      return (
        <div className="pgx-leo-card">
          <LeoAvatar size={46} pose="thinking" className="pgx-leo" />
          <div><h2>Let's try that again</h2><p>Your resume is still here, so you don't need to add it again.</p></div>
        </div>
      );
    }
    const d = t.data;
    const parts = [
      d?.experience?.length ? plural(d.experience.length, 'role') : null,
      d?.skills?.length ? plural(d.skills.length, 'skill') : null,
    ].filter(Boolean);
    const first = d?.name?.trim().split(/\s+/)[0];
    return (
      <div className="pgx-leo-card">
        <LeoAvatar size={46} pose={t.source.text ? 'cheer' : 'hello'} className="pgx-leo" />
        <div>
          <h2>{t.source.text ? `Here it is${first ? `, ${first}` : ''}!` : 'Welcome back!'}</h2>
          <p>
            {t.source.text ? '' : 'This is your saved portfolio. '}
            {parts.length > 0 && `It has ${parts.join(' and ')}. `}
            Check names, dates and links before you publish.
          </p>
        </div>
      </div>
    );
  };

  const renderStudio = (t: Turn) => (
    <main className="pgx-studio">
      <section className="pgx-stage">
        <div className="pgx-browser">
          <div className="pgx-bar">
            {shown && (
              <div className="pgx-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={panelTab === 'preview'} onClick={() => setPanelTab('preview')}><Eye size={15} /> Preview</button>
                <button type="button" role="tab" aria-selected={panelTab === 'code'} onClick={() => setPanelTab('code')}><Code2 size={15} /> Code</button>
              </div>
            )}
            <span className="pgx-url">
              <Globe size={13} />
              <span>{site?.username || (t.data?.name ? suggestedUsername(t.data.name) : 'yourname')}.portfolio.cvmind.in</span>
            </span>
            {shown && panelTab === 'preview' && (
              <div className="pgx-devices">
                <button type="button" className={`pgx-icon-btn${device === 'desktop' ? ' is-on' : ''}`} onClick={() => setDevice('desktop')} aria-label="Desktop view" title="Desktop"><Monitor size={16} /></button>
                <button type="button" className={`pgx-icon-btn${device === 'mobile' ? ' is-on' : ''}`} onClick={() => setDevice('mobile')} aria-label="Phone view" title="Phone"><Smartphone size={16} /></button>
              </div>
            )}
          </div>
          <div className="pgx-view">{renderStage(t)}</div>
        </div>
      </section>

      <aside className="pgx-rail" aria-label="Your portfolio">
        {renderRailIntro(t)}

        {t.saveFailed && (
          <div className="pgx-alert">
            <p className="pgx-error" role="alert">{t.saveError || "This page couldn't be saved to your account, so it will be lost if you leave. Saving again won't use any AI tokens."}</p>
            <button type="button" className="pgx-chip" onClick={() => void saveAgain(t)} disabled={t.saving}>
              <RotateCcw size={14} /> {t.saving ? 'Saving…' : 'Save again'}
            </button>
          </div>
        )}

        {shown && (
          <>
            <button type="button" className="pgx-cta" onClick={() => setPublishTurn(shown.id)}>
              <Rocket size={18} /> {site?.enabled ? 'Update my site' : 'Publish my website'}
            </button>
            {site?.enabled && (
              <a className="pgx-live" href={siteUrl(site.username, baseUrl)} target="_blank" rel="noreferrer">
                <i aria-hidden="true" /><span>{site.username}.portfolio.cvmind.in</span><ExternalLink size={14} />
              </a>
            )}
            <div className="pgx-rail-tools">
              <button type="button" className="pgx-chip" onClick={() => download(shown)}><Download size={15} /> Download</button>
              <button type="button" className="pgx-chip" onClick={() => copyHtml(shown)}>
                {copied === shown.id ? <Check size={15} /> : <Copy size={15} />} {copied === shown.id ? 'Copied' : 'Copy HTML'}
              </button>
            </div>
          </>
        )}

        <section className="pgx-rail-part">
          <h3>{lastSource ? 'Try another look' : 'Looks'}</h3>
          <div className="pgx-tiles pgx-tiles--rail">
            {THEMES.map(x => lookTile(x, x.id === t.theme, () => pickLook(x.id)))}
          </div>
          <form className="pgx-style pgx-style--rail" onSubmit={e => { e.preventDefault(); buildDescribedStyle(); }}>
            <input value={designDraft} onChange={e => setDesignDraft(e.target.value)} maxLength={500} placeholder="Or describe your own style" aria-label="Describe your own style" disabled={building} />
            <button type="submit" className="pgx-chip" disabled={building || !designDraft.trim()}>Build</button>
          </form>
        </section>

        {updating ? (
          <section className="pgx-rail-part">
            <h3>{lastSource ? 'Your updated resume' : designDraft.trim() ? 'Add your resume to build your style' : `Add your resume to use ${themeOf(theme).label}`}</h3>
            {resumeForm(designDraft.trim() ? 'Build my style' : theme === 'custom' ? 'Let Leo design it' : `Build in ${themeOf(theme).label}`)}
            <button type="button" className="pgx-noresume" onClick={() => { setUpdating(false); setComposerError(null); }}>Cancel</button>
          </section>
        ) : (
          <button type="button" className="pgx-noresume" onClick={() => setUpdating(true)} disabled={building}>
            Changed your resume? Rebuild from a new one
          </button>
        )}

        {turns.length > 1 && (
          <section className="pgx-rail-part">
            <h3>Your versions</h3>
            <div className="pgx-versions">
              {turns.map((x, i) => (
                <button key={x.id} type="button" className={x.id === t.id ? 'is-on' : ''} onClick={() => setOpenTurn(x.id)} aria-pressed={x.id === t.id}>
                  <i style={{ background: themeOf(x.theme).color }} aria-hidden="true" />
                  {i + 1}. {themeOf(x.theme).label}
                  {x.status === 'building' && <small>building</small>}
                  {x.status === 'error' && <small>failed</small>}
                </button>
              ))}
            </div>
          </section>
        )}
      </aside>
    </main>
  );

  return (
    <div className="pgx">
      <header className="pgx-top">
        <button type="button" className="pgx-icon-btn" onClick={exit} aria-label="Back"><ArrowLeft size={18} /></button>
        <span className="pgx-brand">
          {shown?.data?.name ? `${shown.data.name}'s portfolio` : <>Portfolio <em>Studio</em></>}
        </span>
        {turns.length > 0 && (
          <button type="button" className="pgx-new" onClick={reset} disabled={building}>
            <SquarePen size={15} /> New portfolio
          </button>
        )}
      </header>

      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={onFile} />

      {focus ? renderStudio(focus) : renderStart()}

      {publishing && (
        <PortfolioPublish
          baseUrl={baseUrl}
          workId={publishing.workId}
          suggestedUsername={suggestedUsername(publishing.data?.name)}
          publicDetails={[publishing.data?.email, publishing.data?.phone, publishing.data?.location].filter((d): d is string => Boolean(d))}
          site={site}
          onSiteChange={setSite}
          onClose={() => setPublishTurn(null)}
          onSaveAgain={publishing.saveFailed ? () => void saveAgain(publishing) : undefined}
          saving={publishing.saving}
          saveError={publishing.saveError}
        />
      )}
    </div>
  );
}

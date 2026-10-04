import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  ArrowLeft, ArrowUp, Paperclip, ChevronDown, Check, Copy, Download, X, Monitor, Smartphone,
  Globe, Code2, Eye, FileText, SquarePen, RotateCcw,
} from 'lucide-react';
import { Leo, LeoAvatar } from '../components/ResumeOnboarding';
import { getErrorMessage } from '../utils/errors';
import { authFetch } from '../lib/authFetch';
import type { ExperienceEntry } from '../types/api';
import './PortfolioGen.css';

// Parsed resume behind a generated site (/api/portfolio/generate-site)
interface PortfolioData {
  name?: string;
  title?: string;
  email?: string;
  skills?: string[];
  experience?: ExperienceEntry[];
}

interface PortfolioGenProps {
  customApiKey: string;
  resumeText: string;
  setCurrentPage?: (page: string) => void;
  /** Leave the generator (back to the previous page). */
  onExit?: () => void;
}

// The colour themes the backend knows (themeColors in /api/portfolio/generate-site)
const THEMES = [
  { id: 'dark-pro', label: 'Dark Pro', desc: 'Indigo on near-black', color: '#6366f1', bg: '#0a0a0f' },
  { id: 'ocean', label: 'Ocean', desc: 'Sky blue on deep navy', color: '#0ea5e9', bg: '#0c1a2e' },
  { id: 'emerald', label: 'Emerald', desc: 'Fresh green on dark', color: '#10b981', bg: '#0a1a0f' },
  { id: 'purple', label: 'Purple', desc: 'Violet on midnight', color: '#a855f7', bg: '#0f0a1e' },
  { id: 'minimal', label: 'Minimal', desc: 'Blue on clean white', color: '#2997ff', bg: '#ffffff' },
];

// What Leo says he's doing while the site is generated
const BUILD_STEPS = ['Reading your resume', 'Picking out your experience and skills', 'Laying out the sections', 'Writing the HTML and CSS'];

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
  status: 'building' | 'done' | 'error';
  html?: string;
  data?: PortfolioData | null;
  error?: string;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
  || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

const themeOf = (id: string) => THEMES.find(t => t.id === id) || THEMES[0];
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const slug = (name?: string) => name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'portfolio';

// "Good evening, Priya", using the signed-in user's first name when there is one
function greeting() {
  const h = new Date().getHours();
  const hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  try {
    const first = (JSON.parse(localStorage.getItem('cvmind_user') || '{}').name || '').trim().split(/\s+/)[0];
    return first ? `${hello}, ${first}` : hello;
  } catch {
    return hello;
  }
}

export default function PortfolioGen({ customApiKey, resumeText, setCurrentPage, onExit }: PortfolioGenProps) {
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<Source | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [theme, setTheme] = useState('dark-pro');
  const [themeOpen, setThemeOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);

  // The artifact panel: which turn it shows, and how
  const [openTurn, setOpenTurn] = useState<number | null>(null);
  const [panelTab, setPanelTab] = useState<'preview' | 'code'>('preview');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadEnd = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const building = turns.some(t => t.status === 'building');
  const lastSource = turns.length ? turns[turns.length - 1].source : null;
  const shown = turns.find(t => t.id === openTurn && t.status === 'done');

  // Grow the textarea with its content, up to a cap
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [draft]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  const generate = async (source: Source, themeId: string) => {
    const id = nextId.current++;
    setTurns(prev => [...prev, { id, source, theme: themeId, status: 'building' }]);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await authFetch(`${baseUrl}/api/portfolio/generate-site`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ resumeText: source.text, colorTheme: themeId, style: themeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setTurns(prev => prev.map(t => t.id === id ? { ...t, status: 'done', html: data.data.portfolioHTML, data: data.data.portfolioData } : t));
      setOpenTurn(id);
      setPanelTab('preview');
    } catch (err) {
      setTurns(prev => prev.map(t => t.id === id ? { ...t, status: 'error', error: getErrorMessage(err) || 'Generation failed. Please try again.' } : t));
    }
  };

  // Send: a new resume (typed or attached), or the previous resume again with the chosen theme
  const send = () => {
    if (building || attaching) return;
    setComposerError(null);
    const typed = draft.trim();
    let source: Source | null = null;
    if (attachment) source = attachment;
    else if (typed.length >= MIN_RESUME_CHARS) source = { text: typed };
    else if (!typed && lastSource) source = lastSource;

    if (!source) {
      setComposerError(typed
        ? `That looks too short for a resume. Paste the full text (at least ${MIN_RESUME_CHARS} characters) or attach a file.`
        : 'Paste your resume or attach a PDF, DOCX or TXT file to start.');
      return;
    }
    setDraft('');
    setAttachment(null);
    void generate(source, theme);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
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

  const retheme = (themeId: string) => {
    if (!lastSource || building) return;
    setTheme(themeId);
    void generate(lastSource, themeId);
  };

  const reset = () => {
    setTurns([]);
    setOpenTurn(null);
    setDraft('');
    setAttachment(null);
    setComposerError(null);
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
  const current = themeOf(theme);
  const canSend = !building && !attaching && (Boolean(attachment) || draft.trim().length > 0 || Boolean(lastSource));

  const composer = (
    <div className="pgx-composer-wrap">
      <div className={`pgx-composer${composerError ? ' has-error' : ''}`}>
        {(attachment || attaching) && (
          <div className="pgx-attachments">
            <span className="pgx-file">
              <span className="pgx-file-icon"><FileText size={18} /></span>
              <span className="pgx-file-text">
                <strong>{attaching ? 'Reading file…' : attachment?.fileName}</strong>
                <span>{attaching ? 'Pulling out the text' : `${wordCount(attachment?.text || '')} words`}</span>
              </span>
              {attachment && (
                <button type="button" className="pgx-file-remove" onClick={() => setAttachment(null)} aria-label="Remove file">
                  <X size={13} />
                </button>
              )}
            </span>
          </div>
        )}

        <textarea
          ref={inputRef}
          rows={turns.length ? 1 : 3}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={turns.length
            ? 'Paste an updated resume, or pick another theme and press Enter'
            : 'Paste your resume here, or attach a file'}
          aria-label="Resume text"
          disabled={building}
        />

        <div className="pgx-composer-bar">
          <div className="pgx-composer-left">
            <button
              type="button"
              className="pgx-icon-btn"
              onClick={() => fileRef.current?.click()}
              disabled={building || attaching}
              aria-label="Attach a resume file"
              title="Attach a PDF, DOCX or TXT resume"
            >
              <Paperclip size={17} />
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={onFile} />
          </div>

          <div className="pgx-composer-right">
            <div className="pgx-theme-picker">
              <button
                type="button"
                className="pgx-theme-btn"
                onClick={() => setThemeOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={themeOpen}
              >
                <span className="pgx-swatch" style={{ background: current.bg, borderColor: current.color }}>
                  <span style={{ background: current.color }} />
                </span>
                {current.label}
                <ChevronDown size={15} />
              </button>
              {themeOpen && (
                <>
                  <div className="pgx-menu-scrim" onClick={() => setThemeOpen(false)} />
                  <ul className="pgx-menu" role="listbox" aria-label="Theme">
                    {THEMES.map(t => (
                      <li key={t.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={t.id === theme}
                          onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                        >
                          <span className="pgx-swatch" style={{ background: t.bg, borderColor: t.color }}>
                            <span style={{ background: t.color }} />
                          </span>
                          <span className="pgx-menu-text">
                            <strong>{t.label}</strong>
                            <span>{t.desc}</span>
                          </span>
                          {t.id === theme && <Check size={16} className="pgx-menu-check" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <button type="button" className="pgx-send" onClick={send} disabled={!canSend} aria-label="Build portfolio">
              <ArrowUp size={18} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
      {composerError && <p className="pgx-composer-error" role="alert">{composerError}</p>}
    </div>
  );

  const userMessage = (t: Turn) => (
    <div className="pgx-user">
      {t.source.fileName ? (
        <span className="pgx-file pgx-file--sent">
          <span className="pgx-file-icon"><FileText size={18} /></span>
          <span className="pgx-file-text">
            <strong>{t.source.fileName}</strong>
            <span>{wordCount(t.source.text)} words</span>
          </span>
        </span>
      ) : (
        <p className="pgx-user-text">{t.source.text}</p>
      )}
      <span className="pgx-user-meta">Build my portfolio · {themeOf(t.theme).label} theme</span>
    </div>
  );

  const assistantMessage = (t: Turn, isLast: boolean) => {
    if (t.status === 'building') {
      return (
        <div className="pgx-assistant">
          <LeoAvatar size={32} className="pgx-leo pgx-leo--busy" />
          <div className="pgx-assistant-body">
            <p className="pgx-shimmer">Leo is building your portfolio…</p>
            <ol className="pgx-build-steps">
              {BUILD_STEPS.map((s, i) => (
                <li key={s} style={{ animationDelay: `${i * 1.4}s` }}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      );
    }
    if (t.status === 'error') {
      return (
        <div className="pgx-assistant">
          <LeoAvatar size={32} className="pgx-leo" />
          <div className="pgx-assistant-body">
            <p>Sorry, I couldn't build that one.</p>
            <p className="pgx-error">{t.error}</p>
            <button type="button" className="pgx-chip" onClick={() => void generate(t.source, t.theme)} disabled={building}>
              <RotateCcw size={14} /> Try again
            </button>
          </div>
        </div>
      );
    }
    const d = t.data;
    const parts = [
      d?.experience?.length ? `${d.experience.length} ${d.experience.length === 1 ? 'role' : 'roles'} in the experience timeline` : null,
      d?.skills?.length ? `${d.skills.length} skills` : null,
    ].filter(Boolean);
    const others = THEMES.filter(x => x.id !== t.theme);
    return (
      <div className="pgx-assistant">
        <LeoAvatar size={32} className="pgx-leo" />
        <div className="pgx-assistant-body">
          <p>
            Done! I built a portfolio site for <strong>{d?.name || 'you'}</strong>{d?.title ? `, ${d.title}` : ''}, in the {themeOf(t.theme).label} theme.
            {parts.length > 0 && <> It has {parts.join(' and ')}.</>}
          </p>

          <button type="button" className={`pgx-artifact${openTurn === t.id ? ' is-open' : ''}`} onClick={() => { setOpenTurn(t.id); setPanelTab('preview'); }}>
            <span className="pgx-artifact-icon"><Globe size={20} /></span>
            <span className="pgx-artifact-text">
              <strong>{d?.name ? `${d.name} – Portfolio` : 'Portfolio website'}</strong>
              <span>Click to open website · HTML</span>
            </span>
          </button>

          <p>To put it online, download the file and upload it to a static host such as GitHub Pages, Netlify Drop or Vercel. You'll get a public link to share.</p>

          <div className="pgx-actions">
            <button type="button" className="pgx-icon-btn" onClick={() => copyHtml(t)} aria-label="Copy HTML" title="Copy HTML">
              {copied === t.id ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button type="button" className="pgx-icon-btn" onClick={() => download(t)} aria-label="Download HTML" title="Download .html">
              <Download size={16} />
            </button>
          </div>

          {isLast && (
            <div className="pgx-followups">
              <span>Want a different look? I can rebuild it in another theme</span>
              <div>
                {others.map(x => (
                  <button key={x.id} type="button" className="pgx-chip" onClick={() => retheme(x.id)} disabled={building}>
                    <span className="pgx-swatch pgx-swatch--sm" style={{ background: x.bg, borderColor: x.color }}>
                      <span style={{ background: x.color }} />
                    </span>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`pgx${shown ? ' has-panel' : ''}`}>
      <header className="pgx-top">
        <button type="button" className="pgx-icon-btn" onClick={exit} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="pgx-top-title">
          {turns.length && turns[0].status === 'done' && turns[0].data?.name ? `${turns[0].data.name}'s portfolio` : 'Portfolio Generator with Leo'}
        </span>
        {turns.length > 0 && (
          <button type="button" className="pgx-top-new" onClick={reset} disabled={building}>
            <SquarePen size={16} /> New portfolio
          </button>
        )}
      </header>

      <div className="pgx-main">
        <section className="pgx-chat">
          {turns.length === 0 ? (
            <div className="pgx-empty">
              <div className="pgx-empty-leo"><Leo /></div>
              <h1 className="pgx-greeting">{greeting()}</h1>
              <p className="pgx-empty-sub">I'm Leo. Share your resume and I'll turn it into a portfolio website you can download and host anywhere.</p>
              {composer}
              <div className="pgx-starters">
                {resumeText.trim().length >= MIN_RESUME_CHARS && (
                  <button type="button" className="pgx-chip" onClick={() => void generate({ text: resumeText.trim(), fileName: 'Resume from the Resume Checker' }, theme)}>
                    <FileText size={14} /> Use the resume I checked
                  </button>
                )}
                <button type="button" className="pgx-chip" onClick={() => fileRef.current?.click()}>
                  <Paperclip size={14} /> Attach a resume file
                </button>
                {setCurrentPage && (
                  <button type="button" className="pgx-chip" onClick={() => setCurrentPage('resume-builder')}>
                    <SquarePen size={14} /> I don't have a resume yet
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="pgx-thread">
                {turns.map((t, i) => (
                  <div key={t.id} className="pgx-turn">
                    {userMessage(t)}
                    {assistantMessage(t, i === turns.length - 1)}
                  </div>
                ))}
                <div ref={threadEnd} />
              </div>
              <div className="pgx-dock">
                {composer}
                <p className="pgx-disclaimer">Leo can get details wrong. Check names, dates and links before you publish.</p>
              </div>
            </>
          )}
        </section>

        {shown && (
          <aside className="pgx-panel" aria-label="Portfolio preview">
            <header className="pgx-panel-head">
              <div className="pgx-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={panelTab === 'preview'} onClick={() => setPanelTab('preview')}>
                  <Eye size={15} /> Preview
                </button>
                <button type="button" role="tab" aria-selected={panelTab === 'code'} onClick={() => setPanelTab('code')}>
                  <Code2 size={15} /> Code
                </button>
              </div>
              <span className="pgx-panel-title">{shown.data?.name ? `${shown.data.name} – Portfolio` : 'Portfolio website'}</span>
              <div className="pgx-panel-tools">
                {panelTab === 'preview' && (
                  <>
                    <button type="button" className={`pgx-icon-btn pgx-device${device === 'desktop' ? ' is-on' : ''}`} onClick={() => setDevice('desktop')} aria-label="Desktop view" title="Desktop">
                      <Monitor size={16} />
                    </button>
                    <button type="button" className={`pgx-icon-btn pgx-device${device === 'mobile' ? ' is-on' : ''}`} onClick={() => setDevice('mobile')} aria-label="Mobile view" title="Mobile">
                      <Smartphone size={16} />
                    </button>
                    <span className="pgx-tools-sep pgx-device" />
                  </>
                )}
                <button type="button" className="pgx-icon-btn" onClick={() => copyHtml(shown)} aria-label="Copy HTML" title="Copy HTML">
                  {copied === shown.id ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button type="button" className="pgx-panel-download" onClick={() => download(shown)}>
                  <Download size={15} /><span className="pgx-dl-label">Download</span>
                </button>
                <button type="button" className="pgx-icon-btn" onClick={() => setOpenTurn(null)} aria-label="Close preview" title="Close">
                  <X size={17} />
                </button>
              </div>
            </header>
            <div className="pgx-panel-body">
              {panelTab === 'preview' ? (
                <div className={`pgx-frame${device === 'mobile' ? ' is-mobile' : ''}`}>
                  <iframe srcDoc={shown.html} title="Portfolio preview" sandbox="allow-same-origin" />
                </div>
              ) : (
                <pre className="pgx-code"><code>{shown.html}</code></pre>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

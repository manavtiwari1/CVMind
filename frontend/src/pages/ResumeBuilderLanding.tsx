import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpDown, Briefcase, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock, Contrast,
  Download, FileText, Home, LayoutTemplate, Link2, Lock, MousePointer2, Pencil, ShieldCheck, Smile, Sparkles, Upload, Wand2,
} from 'lucide-react';
import { useLiveStats, formatStat } from '../utils/stats';
import TemplatePreview from '../components/TemplatePreview';
import { TEMPLATES as ALL_TEMPLATES, RESUME_TEMPLATES, type Template } from '../data/resumeTemplates';
import { pickTemplate } from '../lib/templatePick';
import { LETTER_DESIGNS } from '../lib/coverLetter';
import { BUILDER_COPY as copy, FEATURE_SECTIONS, LEVELS, STAGES } from '../data/landings';
import PageLink from '../components/PageLink';
import './ResumeBuilderLanding.css';

interface ResumeBuilderLandingProps {
  setCurrentPage: (page: string) => void;
}

const COVER_LETTER_COUNT = LETTER_DESIGNS.length;
const byId = (id: string): Template => ALL_TEMPLATES.find(t => t.id === id) ?? RESUME_TEMPLATES[0];

const FREE_TOOLS = [
  { label: 'Resume Checker', page: 'home' },
  { label: 'Tailor Resume', page: 'tailor' },
  { label: 'Cover Letter', page: 'cover-letter-builder' },
  { label: 'Interview Prep', page: 'prep' },
  { label: 'LinkedIn Optimizer', page: 'linkedin' },
];

export default function ResumeBuilderLanding({ setCurrentPage }: ResumeBuilderLandingProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [level, setLevel] = useState(LEVELS[0].key);
  const [stage, setStage] = useState(STAGES[0].key);
  const railRef = useRef<HTMLDivElement>(null);
  const liveStats = useLiveStats();
  const analyzed = liveStats.resumesAnalyzed != null ? formatStat(liveStats.resumesAnalyzed) : null;

  const build = () => setCurrentPage('resume-editor');
  const activeLevel = LEVELS.find(l => l.key === level) ?? LEVELS[0];
  const activeStage = STAGES.find(s => s.key === stage) ?? STAGES[0];

  useEffect(() => {
    const main = document.querySelector('.main-content') as HTMLElement | null;
    if (main) {
      main.style.maxWidth = 'none';
      main.style.padding = '0';
      main.style.margin = '0';
    }
    return () => {
      if (main) {
        main.style.maxWidth = '';
        main.style.padding = '';
        main.style.margin = '';
      }
    };
  }, []);

  // Links inside the guide HTML (<a href="/page">) navigate inside the app
  const keepInApp = (e: React.MouseEvent) => {
    const href = (e.target as HTMLElement).closest('a')?.getAttribute('href') || '';
    if (!href.startsWith('/') || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    setCurrentPage(href === '/' ? 'home' : href.slice(1));
  };

  const scrollRail = (dir: 1 | -1) => {
    const rail = railRef.current;
    if (rail) rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="rbl">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="rbl-hero">
        <div className="rbl-wrap rbl-hero-grid">
          <div className="rbl-hero-copy">
            <nav className="rbl-crumb" aria-label="Breadcrumb">
              <PageLink page="home" onNavigate={setCurrentPage} aria-label="Home"><Home size={14} /></PageLink>
              <span aria-hidden="true">›</span>
              <span>{copy.crumb}</span>
            </nav>
            <h1>{copy.h1.lead} <em>{copy.h1.em}</em></h1>
            <ul className="rbl-checks">
              {copy.checks.map(c => <li key={c}><CheckCircle2 size={18} />{c}</li>)}
            </ul>
            <div className="rbl-hero-cta">
              <button type="button" className="rbl-btn rbl-btn--hero" onClick={build}>{copy.cta}</button>
              <span className="rbl-note">Takes a few minutes. No card needed to start.</span>
            </div>
            {analyzed && <p className="rbl-live"><strong>{analyzed}</strong> resumes analyzed on CVMind</p>}
          </div>

          <div className="rbl-hero-art" aria-hidden="true">
            <div className="rbl-app">
              <div className="rbl-app-bar">
                <span className="rbl-app-logo">CVMind</span>
                <i /><i /><i className="is-wide" />
              </div>
              <div className="rbl-app-body">
                <div className="rbl-app-tools">
                  <Pencil size={15} /><ArrowUpDown size={15} /><LayoutTemplate size={15} /><Contrast size={15} />
                  <CircleCheck size={15} /><ShieldCheck size={15} /><Link2 size={15} /><Clock size={15} />
                </div>
                <div className="rbl-app-paper">
                  <TemplatePreview html={byId('cv-polished').html} name="Sample resume" eager aspect="1 / 0.95" />
                </div>
              </div>

              <div className="rbl-assist">
                <span className="rbl-assist-title"><b /> AI ASSISTANT</span>
                <span className="rbl-assist-row"><Wand2 size={14} /> Improve writing</span>
                <span className="rbl-assist-row"><Smile size={14} /> Recruiter review</span>
                <span className="rbl-assist-row"><Sparkles size={14} /> Inspire me</span>
                <span className="rbl-assist-or">or</span>
                <span className="rbl-assist-input">Polish for interview: concise, results-driven, highlight leadership<u /></span>
              </div>
              <span className="rbl-assist-cursor"><MousePointer2 size={26} fill="currentColor" /></span>
            </div>

            <span className="rbl-oneclick"><small>IN ONE CLICK!</small><span><Briefcase size={15} /> Tailored to Job</span></span>
            <span className="rbl-atspdf"><Download size={15} /> ATS PDF</span>
            <span className="rbl-score" title="Sample ATS score">
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e4e7f3" strokeWidth="7" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="url(#rbl-ring)" strokeWidth="7" strokeLinecap="round" strokeDasharray="216 251" transform="rotate(-90 50 50)" />
                <defs><linearGradient id="rbl-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6f4fd6" /><stop offset="1" stopColor="#2bbf8e" /></linearGradient></defs>
              </svg>
              <b>86<small>%</small></b>
              <i className="rbl-ribbon" />
            </span>
          </div>
        </div>
      </section>

      {/* ── FREE TOOLS + START ───────────────────────────────── */}
      <section className="rbl-light">
        <div className="rbl-wrap">
          <p className="rbl-kicker">Free AI resume tools</p>
          <div className="rbl-pills">
            {FREE_TOOLS.map(t => (
              <PageLink key={t.label} page={t.page} onNavigate={setCurrentPage} className="rbl-pill">{t.label}</PageLink>
            ))}
          </div>

          <div className="rbl-start">
            <div>
              <h2>Start for free,<br /><span>build it your way</span></h2>
              <p>Begin with a blank page or bring the resume you already have. CVMind reads it, fills in the form for you, and you pick a template that suits the job you want next.</p>
            </div>
            <button type="button" className="rbl-drop" onClick={build}>
              <Upload size={22} aria-hidden="true" />
              <span>Start with your old resume or from scratch.</span>
              <span className="rbl-drop-sub">PDF and DOCX supported</span>
              <span className="rbl-btn rbl-btn--small">Get Started</span>
              <span className="rbl-privacy"><Lock size={12} /> We never share your data with 3rd parties or use it for AI model training.</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── GUIDE: what it is, how to use it, format (also in the static HTML) ── */}
      <section className="rbl-light rbl-guide-sec">
        <div className="rbl-wrap rbl-guide" onClick={keepInApp}>
          {copy.guide.map(g => (
            <section key={g.id} id={g.id}>
              <h2>{g.heading}</h2>
              <div dangerouslySetInnerHTML={{ __html: g.html }} />
            </section>
          ))}
        </div>
      </section>

      {/* ── FEATURE ROWS ─────────────────────────────────────── */}
      <section className="rbl-light rbl-light--tint">
        <div className="rbl-wrap">
          {FEATURE_SECTIONS.map((f, i) => (
            <article key={f.tag} className={`rbl-feature${i % 2 ? ' is-flip' : ''}`} style={{ '--accent': f.accent } as React.CSSProperties}>
              <div className="rbl-feature-art">
                <div className="rbl-tilt">
                  <div className="rbl-tool-card">
                    <header>
                      <span className="rbl-tool-ico"><FileText size={18} /></span>
                      <div><strong>{f.card.title}</strong><small>{f.card.sub}</small></div>
                    </header>
                    <ul>
                      {f.card.lines.map(l => <li key={l}><CheckCircle2 size={14} />{l.replace('{letters}', String(COVER_LETTER_COUNT))}</li>)}
                    </ul>
                    <span className="rbl-tool-btn">Open tool</span>
                  </div>
                </div>
              </div>
              <div className="rbl-feature-copy">
                <span className="rbl-tag">{f.tag}</span>
                <h2>{f.title}</h2>
                <p>{f.body}</p>
                <PageLink page={f.page} onNavigate={setCurrentPage} className="rbl-textlink">{f.cta} <ArrowRight size={15} /></PageLink>
              </div>
              <ul className="rbl-points">
                {f.points.map(p => (
                  <li key={p.title}><strong>{p.title}</strong><span>{p.text}</span></li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ── EXPERIENCE LEVELS ────────────────────────────────── */}
      <section className="rbl-light">
        <div className="rbl-wrap">
          <h2 className="rbl-center">Make a great resume, whatever your experience</h2>
          <div className="rbl-pills rbl-pills--center" role="tablist">
            {LEVELS.map(l => (
              <button key={l.key} type="button" role="tab" aria-selected={level === l.key} className={`rbl-pill${level === l.key ? ' is-on' : ''}`} onClick={() => setLevel(l.key)}>{l.label}</button>
            ))}
          </div>
          <div className="rbl-level" role="tabpanel">
            <div className="rbl-level-copy">
              <h3>{activeLevel.label}</h3>
              <p>{activeLevel.body}</p>
              <ul className="rbl-list">
                {activeLevel.points.map(p => <li key={p}><CheckCircle2 size={16} />{p}</li>)}
              </ul>
              <button type="button" className="rbl-btn" onClick={build}>Build my resume</button>
            </div>
            <div className="rbl-level-art">
              <div className="rbl-level-sheet"><TemplatePreview html={byId(activeLevel.templateId).html} name={byId(activeLevel.templateId).name} aspect="1 / 1.1" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAGES (dark) ────────────────────────────────────── */}
      <section className="rbl-dark">
        <div className="rbl-wrap">
          <h2 className="rbl-center">AI tools at every stage of your job search</h2>
          <p className="rbl-center rbl-dark-sub">Whether you are starting out or already interviewing, there is a tool for the next step.</p>
          <div className="rbl-pills rbl-pills--center rbl-pills--dark" role="tablist">
            {STAGES.map(s => (
              <button key={s.key} type="button" role="tab" aria-selected={stage === s.key} className={`rbl-pill${stage === s.key ? ' is-on' : ''}`} onClick={() => setStage(s.key)}>{s.label}</button>
            ))}
          </div>
          <div className="rbl-stage" role="tabpanel">
            <div>
              <h3>{activeStage.title}</h3>
              <p>{activeStage.text}</p>
              <ul className="rbl-list rbl-list--dark">
                {activeStage.points.map(p => <li key={p}><CheckCircle2 size={16} />{p}</li>)}
              </ul>
              <button type="button" className="rbl-btn" onClick={() => setCurrentPage(activeStage.page)}>Open {activeStage.label}</button>
            </div>
            <div className="rbl-stage-art" aria-hidden="true">
              {[byId('modern-blue'), byId('classic-pro'), byId('cv-polished')].map((t, i) => (
                <div key={t.id} className={`rbl-stack rbl-stack--${i}`}><TemplatePreview html={t.html} name={t.name} /></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TEMPLATE RAIL ────────────────────────────────────── */}
      <section className="rbl-light rbl-rail-sec">
        <div className="rbl-wrap">
          <h2 className="rbl-center">Pick from {RESUME_TEMPLATES.length} resume templates</h2>
          <p className="rbl-center rbl-sub">Real layouts, not screenshots. Hover a template and start with it.</p>
        </div>
        <div className="rbl-rail-wrap">
          <button type="button" className="rbl-rail-nav rbl-rail-nav--prev" onClick={() => scrollRail(-1)} aria-label="Previous templates"><ChevronLeft size={20} /></button>
          <div className="rbl-rail" ref={railRef} tabIndex={0} aria-label="Resume templates">
            {RESUME_TEMPLATES.map(t => (
              <div key={t.id} className="rbl-slide" style={{ '--t': t.accent } as React.CSSProperties}>
                <TemplatePreview html={t.html} name={t.name} />
                <span className="rbl-slide-name">{t.name}</span>
                <button type="button" className="rbl-btn rbl-slide-cta" onClick={() => { pickTemplate(t.id); build(); }}>Start with this template</button>
              </div>
            ))}
          </div>
          <button type="button" className="rbl-rail-nav rbl-rail-nav--next" onClick={() => scrollRail(1)} aria-label="Next templates"><ChevronRight size={20} /></button>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="rbl-light rbl-light--tint">
        <div className="rbl-wrap rbl-faq">
          <h2 className="rbl-center">Frequently asked questions</h2>
          <div>
            {copy.faqs.map((f, i) => (
              <div key={f.q} className={`rbl-faq-item${openFaq === i ? ' is-open' : ''}`}>
                <button type="button" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{f.q}</span><ChevronDown size={18} />
                </button>
                {/* Answers stay in the page (hidden when closed) so search engines can read them */}
                <p hidden={openFaq !== i}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="rbl-final">
        <div className="rbl-wrap rbl-center">
          <h2>{copy.final.heading}</h2>
          <p>{copy.final.text}</p>
          <button type="button" className="rbl-btn rbl-btn--hero" onClick={build}>{copy.cta}</button>
        </div>
      </section>
    </div>
  );
}

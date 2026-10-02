import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpDown, Briefcase, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock, Contrast,
  Download, FileText, Home, LayoutTemplate, Link2, Lock, MousePointer2, Pencil, ShieldCheck, Smile, Sparkles, Upload, Wand2,
} from 'lucide-react';
import { useLiveStats, formatStat } from '../utils/stats';
import TemplatePreview from '../components/TemplatePreview';
import { TEMPLATES as ALL_TEMPLATES, type Template } from '../data/resumeTemplates';
import './ResumeBuilderLanding.css';

interface ResumeBuilderLandingProps {
  setCurrentPage: (page: string) => void;
}

const RESUME_TEMPLATES = ALL_TEMPLATES.filter(t => (t.type || 'resume') === 'resume');
const COVER_LETTER_COUNT = ALL_TEMPLATES.filter(t => t.type === 'cover-letter').length;
const byId = (id: string): Template => ALL_TEMPLATES.find(t => t.id === id) ?? RESUME_TEMPLATES[0];

const FREE_TOOLS = [
  { label: 'Resume Checker', page: 'home' },
  { label: 'Tailor Resume', page: 'tailor' },
  { label: 'Cover Letter', page: 'resume-editor' },
  { label: 'Interview Prep', page: 'prep' },
  { label: 'LinkedIn Optimizer', page: 'linkedin' },
];

interface FeatureSection {
  tag: string;
  title: string;
  accent: string;
  body: string;
  page: string;
  cta: string;
  card: { title: string; sub: string; lines: string[] };
  points: { title: string; text: string }[];
}

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    tag: 'Tailor to the job', title: 'Customize your resume for any role', accent: '#2f8fe0',
    body: 'Paste a job description and CVMind compares it with your resume, then suggests the keywords, skills and wording that role is asking for. Keep one resume per job instead of one for everything.',
    page: 'tailor', cta: 'Tailor my resume',
    card: { title: 'Resume Tailor', sub: 'Upload resume and paste a job ad', lines: ['Upload your resume (PDF or DOCX)', 'Paste the job description', 'Get a tailored version to review'] },
    points: [
      { title: 'Keyword match', text: 'See which terms from the job ad your resume is missing.' },
      { title: 'Your wording stays', text: 'Suggestions build on what you wrote, so it still sounds like you.' },
      { title: 'Review before you use it', text: 'Accept the changes you like and ignore the rest.' },
      { title: 'One per application', text: 'Make a separate version for every role you apply to.' },
    ],
  },
  {
    tag: 'ATS check', title: 'Know how a parser reads your resume', accent: '#1fa97a',
    body: 'Run your resume through the ATS checker to see your score, the keywords you are missing and the formatting problems that can trip up applicant tracking systems, with a short list of fixes.',
    page: 'home', cta: 'Check my resume',
    card: { title: 'ATS Resume Checker', sub: 'Score and fix list', lines: ['Overall ATS score', 'Missing keywords', 'Formatting issues to fix'] },
    points: [
      { title: 'Score out of 100', text: 'A single number to track as you improve the resume.' },
      { title: 'Keyword gaps', text: 'Compare against a job description of your choice.' },
      { title: 'Plain-text readable', text: 'Spot layouts a parser may not read correctly.' },
      { title: 'Clear next steps', text: 'Fixes are listed so you know what to change first.' },
    ],
  },
  {
    tag: 'Cover letters', title: 'A cover letter that matches your resume', accent: '#e9962b',
    body: 'Pick a cover letter layout, edit it in the same editor as your resume, and let the AI refine the draft for the job you are applying to.',
    page: 'resume-editor', cta: 'Write a cover letter',
    card: { title: 'Cover Letter Builder', sub: 'Pick a layout and edit', lines: [`${COVER_LETTER_COUNT} cover letter layouts`, 'Word-style editor', 'Refine with an AI prompt'] },
    points: [
      { title: 'Layouts to match', text: 'Choose a style that pairs with your resume template.' },
      { title: 'Edit freely', text: 'Fonts, tables, colors and headings, like a word processor.' },
      { title: 'Refine with AI', text: 'Tell the AI what to change and it rewrites the draft.' },
      { title: 'PDF and DOCX', text: 'Download in the format the employer asks for.' },
    ],
  },
  {
    tag: 'LinkedIn', title: 'Tidy up your LinkedIn profile too', accent: '#6f4fd6',
    body: 'Recruiters look at your profile as well as your resume. Upload your profile PDF to get an audit, headline ideas, an About section draft and outreach messages.',
    page: 'linkedin', cta: 'Open LinkedIn tools',
    card: { title: 'LinkedIn Optimizer', sub: 'Audit your profile PDF', lines: ['Profile audit and score', 'Headline and About ideas', 'Recruiter outreach drafts'] },
    points: [
      { title: 'Profile audit', text: 'See what is missing or weak in your profile.' },
      { title: 'Headline ideas', text: 'Several options built around your target role.' },
      { title: 'About section', text: 'A draft you can edit and paste straight in.' },
      { title: 'Outreach messages', text: 'Short notes for recruiters and new connections.' },
    ],
  },
];

const LEVELS = [
  {
    key: 'senior', label: 'Senior & Executive', templateId: 'executive-sidebar',
    body: 'Fit a long career onto a page or two. The AI helps you tighten the experience section so recent, relevant impact comes first.',
    points: ['Shorten older roles and keep the highlights', 'Draft a summary aimed at leadership roles', 'Choose an executive layout that stays ATS-readable'],
  },
  {
    key: 'mid', label: 'Entry & Mid-Level', templateId: 'fresh-graduate',
    body: 'Not sure how to structure your resume yet? Start from a layout built for early careers and let the AI help with wording.',
    points: ['Turn projects and internships into strong bullets', 'Pull a skills section from your experience', 'Tailor the resume to each job you apply for'],
  },
  {
    key: 'change', label: 'Career Changers', templateId: 'modern-blue',
    body: 'Moving to a new field means showing the skills that carry over. Tailor your resume to the new role and lead with those.',
    points: ['Match transferable skills to the new job ad', 'Lead with skills instead of job titles', 'Keep the format simple for ATS parsing'],
  },
];

const STAGES = [
  { key: 'build', label: 'Resume Builder', page: 'resume-editor', title: 'Build the resume', text: 'Pick from ATS-friendly templates, fill in your details or upload an old resume, and edit everything in a Word-style editor.', points: ['Start from an existing resume or a blank page', 'Import details from a LinkedIn PDF', 'Download as PDF or DOCX'] },
  { key: 'check', label: 'Resume Checker', page: 'home', title: 'Check it', text: 'Get an ATS score, keyword gaps and a fix list before a recruiter or parser sees it.', points: ['Overall score', 'Missing keywords', 'Formatting issues'] },
  { key: 'cover', label: 'Cover Letter', page: 'resume-editor', title: 'Write the cover letter', text: 'Pair your resume with a cover letter in a matching layout and refine it with AI.', points: ['Matching layouts', 'Edit in the same editor', 'AI refinement prompts'] },
  { key: 'tailor', label: 'Tailor Resume', page: 'tailor', title: 'Tailor it to the job', text: 'Paste a job description and adjust your resume to match what the role asks for.', points: ['Keyword suggestions', 'Per-job versions', 'You approve every change'] },
  { key: 'prep', label: 'Interview Prep', page: 'prep', title: 'Practice for the interview', text: 'Rehearse likely questions for the role and get feedback on your answers.', points: ['Role-specific questions', 'Feedback on answers', 'Voice practice'] },
  { key: 'linkedin', label: 'LinkedIn', page: 'linkedin', title: 'Polish your profile', text: 'Audit your LinkedIn profile and draft a headline, About section and outreach messages.', points: ['Profile audit', 'Headline ideas', 'Outreach drafts'] },
];

const FAQS = [
  { q: 'What is an AI resume builder?', a: 'It is a resume editor with AI built in. You choose a template, add your details (or upload an old resume), and the AI helps you rewrite bullet points, write a summary and tailor the resume to a job description.' },
  { q: 'Are the templates ATS-friendly?', a: 'The templates use real text, standard section headings and a single readable flow, with no text inside images. Two-column and colored layouts are included too; if you only care about parsing, pick one of the plainer layouts. Running the finished resume through the ATS checker is a good final step.' },
  { q: 'Can I start from my existing resume?', a: 'Yes. Upload a PDF or DOCX at the start and we pre-fill the form with the details we find. You can also import from a LinkedIn profile PDF. Check the filled-in fields before you generate the resume, since extraction can miss things.' },
  { q: 'How does tailoring to a job work?', a: 'Paste the job description into the Tailor tool. It compares the posting with your resume and suggests changes to your summary, skills and bullet points. You decide which suggestions to keep.' },
  { q: 'Can I download my resume?', a: 'Yes. You can download your resume as a PDF or a Word file from the editor. Free and paid limits are listed on the pricing page.' },
  { q: 'Will it sound like AI wrote it?', a: 'The AI works from the details you give it, and you can edit every line afterwards. Reading it through and adding specifics only you know (numbers, tools, results) is the best way to make it sound like you.' },
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
              <button type="button" onClick={() => setCurrentPage('home')} aria-label="Home"><Home size={14} /></button>
              <span aria-hidden="true">›</span>
              <span>AI Resume Builder</span>
            </nav>
            <h1>The AI resume builder that helps you <em>land more job interviews</em></h1>
            <ul className="rbl-checks">
              <li><CheckCircle2 size={18} />Build a professional resume with AI feedback on what you write, not a generic template filled with filler.</li>
              <li><CheckCircle2 size={18} />Rewrite weak bullets, tailor to a job description, and export a clean PDF or DOCX.</li>
            </ul>
            <div className="rbl-hero-cta">
              <button type="button" className="rbl-btn rbl-btn--hero" onClick={build}>Build Your Resume With AI</button>
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
                  <TemplatePreview html={byId('executive-sidebar').html} name="Sample resume" eager aspect="1 / 0.95" />
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
              <button key={t.label} type="button" className="rbl-pill" onClick={() => setCurrentPage(t.page)}>{t.label}</button>
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
                      {f.card.lines.map(l => <li key={l}><CheckCircle2 size={14} />{l}</li>)}
                    </ul>
                    <span className="rbl-tool-btn">Open tool</span>
                  </div>
                </div>
              </div>
              <div className="rbl-feature-copy">
                <span className="rbl-tag">{f.tag}</span>
                <h2>{f.title}</h2>
                <p>{f.body}</p>
                <button type="button" className="rbl-textlink" onClick={() => setCurrentPage(f.page)}>{f.cta} <ArrowRight size={15} /></button>
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
              {[byId('modern-blue'), byId('classic-pro'), byId('executive-sidebar')].map((t, i) => (
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
                <button type="button" className="rbl-btn rbl-slide-cta" onClick={build}>Start with this template</button>
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
            {FAQS.map((f, i) => (
              <div key={f.q} className={`rbl-faq-item${openFaq === i ? ' is-open' : ''}`}>
                <button type="button" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{f.q}</span><ChevronDown size={18} />
                </button>
                {openFaq === i && <p>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="rbl-final">
        <div className="rbl-wrap rbl-center">
          <h2>Ready to build your next resume?</h2>
          <p>Pick the job you want, choose a template, and have a draft in a few minutes.</p>
          <button type="button" className="rbl-btn rbl-btn--hero" onClick={build}>Build Your Resume With AI</button>
        </div>
      </section>
    </div>
  );
}

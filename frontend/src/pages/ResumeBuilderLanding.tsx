import { useState, useEffect } from 'react';
import { CheckCircle2, ChevronDown, ArrowRight, FileText, Zap, Target, Shield, Users, Star } from 'lucide-react';
import { useLiveStats, formatStat } from '../utils/stats';
import TemplatePreview from '../components/TemplatePreview';
import { TEMPLATES as ALL_TEMPLATES, type Template } from '../data/resumeTemplates';
import './ResumeBuilderLanding.css';

interface ResumeBuilderLandingProps {
  setCurrentPage: (page: string) => void;
}

const FEATURED_IDS = ['cvmind-executive', 'executive-sidebar', 'classic-pro', 'modern-blue', 'tech-minimal', 'minimalist-serif'];
const FEATURED_TEMPLATES = FEATURED_IDS
  .map(id => ALL_TEMPLATES.find(t => t.id === id))
  .filter((t): t is Template => Boolean(t));
const RESUME_TEMPLATE_COUNT = ALL_TEMPLATES.filter(t => (t.type || 'resume') === 'resume').length;

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'Software Engineer · Google', text: 'The AI rewriter transformed my bullet points overnight. Got 3 callbacks in a week after using CVMind.' },
  { name: 'James K.', role: 'Product Manager · Meta', text: 'The ATS score went from 54 to 91 after following the AI suggestions. Landed my dream job in 3 weeks.' },
  { name: 'Aisha M.', role: 'Marketing Director', text: 'I\'ve tried every resume builder. CVMind\'s AI is in a different league — it actually understands context.' },
];

const FAQS = [
  { q: 'What is an AI resume builder?', a: 'An AI resume builder uses machine learning to help you write, format, and optimize your resume. CV Mind provides real-time feedback, rewrites weak bullet points, checks ATS compatibility, and tailors your resume to specific job descriptions.' },
  { q: 'Is CVMind\'s resume builder ATS-friendly?', a: 'Yes. Every template is tested against major ATS systems including Workday, Greenhouse, and Lever. We use clean formatting with no tables, graphics, or text-in-images that can confuse parsers.' },
  { q: 'How does AI resume tailoring work?', a: 'Paste any job description and our AI analyzes the required keywords, skills, and experience. It then rewrites your resume sections to match — boosting your match score and ATS ranking for that specific role.' },
  { q: 'Can I use CVMind for free?', a: 'Yes! The resume checker, ATS score, and keyword analysis are free. Premium features like unlimited AI rewrites, DOCX export, and job tailoring require an account.' },
  { q: 'How is CVMind different from Canva or Google Docs?', a: 'Design tools create pretty resumes that often fail ATS scans. CVMind is built specifically for job seekers — every template is ATS-tested, and the AI actively improves your content, not just the design.' },
  { q: 'Can recruiters detect AI-written resumes?', a: 'CV Mind enhances and refines your existing content rather than generating generic text. The result reads as authentically yours — just more polished, quantified, and keyword-optimized.' },
];

const FEATURES = [
  {
    icon: <FileText size={22} />, title: 'Smart Resume Builder',
    desc: '20+ resume sections, real-time grammar checking, and professionally designed layouts built by certified resume writers.',
    bullets: ['20+ customizable sections', 'Grammar & punctuation AI', '30+ language support', 'Live preview as you type'],
  },
  {
    icon: <Target size={22} />, title: 'ATS Resume Checker',
    desc: '19 automated checks that score your resume against ATS algorithms and rewrite weak bullets for maximum impact.',
    bullets: ['ATS score 0–100', 'Keyword gap analysis', 'AI bullet rewriter', 'Formatting compliance'],
  },
  {
    icon: <Zap size={22} />, title: 'One-Click Job Tailoring',
    desc: 'Paste any job description and AI rewrites your resume in under 30 seconds — matched keywords, optimized skills, higher ATS rank.',
    bullets: ['30-second tailoring', 'Unlimited job matches', 'Keyword injection', 'Match score %'],
  },
  {
    icon: <Shield size={22} />, title: 'AI Cover Letters',
    desc: 'Generate a unique, job-specific cover letter for every application — matching your resume\'s design and tone.',
    bullets: ['Job-description tailored', 'Matching design themes', 'New letter per application', 'Instant generation'],
  },
];

export default function ResumeBuilderLanding({ setCurrentPage }: ResumeBuilderLandingProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const liveStats = useLiveStats();
  const resumesStat = liveStats.resumesAnalyzed != null ? formatStat(liveStats.resumesAnalyzed) : '50K+';

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

  return (
    <div className="rbl-page">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="rbl-hero">
        <div className="rbl-hero-blob rbl-blob-1" />
        <div className="rbl-hero-blob rbl-blob-2" />
        <div className="rbl-hero-inner">
          <div className="rbl-hero-left">
            <div className="rbl-eyebrow">
              <span className="rbl-eyebrow-dot" />
              AI-Powered Resume Builder
            </div>
            <h1 className="rbl-hero-h1">
              AI Resume Builder That Helps You<br />
              <span className="rbl-hero-grad">Land More Job Interviews</span>
            </h1>
            <p className="rbl-hero-sub">
              Get real-time AI feedback, keyword optimization, ATS scoring, and one-click job tailoring — then export a professionally formatted PDF in minutes.
            </p>
            <div className="rbl-hero-actions">
              <button className="rbl-btn-primary" onClick={() => setCurrentPage('resume-editor')}>
                Build Your Resume With AI <ArrowRight size={16} />
              </button>
              <button className="rbl-btn-outline" onClick={() => setCurrentPage('home')}>
                Check My ATS Score
              </button>
            </div>
            <div className="rbl-hero-trust">
              <div className="rbl-trust-stars">
                {'★★★★★'.split('').map((s, i) => <span key={i} className="rbl-star">{s}</span>)}
                <span className="rbl-trust-text">4.9 · <strong>250+ Reviews</strong></span>
              </div>
              <span className="rbl-trust-divider" />
              <span className="rbl-trust-users"><Users size={14} /> <strong>{resumesStat}</strong> resumes analyzed</span>
            </div>
            <div className="rbl-trust-pills">
              {['No credit card required', 'ATS-tested templates', 'Instant AI feedback'].map(t => (
                <span key={t} className="rbl-trust-pill">
                  <CheckCircle2 size={13} color="#2dc08d" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: builder mockup */}
          <div className="rbl-hero-right">
            <div className="rbl-mockup">
              <div className="rbl-mockup-bar">
                <span className="rbl-dot red" /><span className="rbl-dot yellow" /><span className="rbl-dot green" />
                <span className="rbl-mockup-title">CVMind Resume Builder</span>
              </div>
              <div className="rbl-mockup-body">
                <div className="rbl-mockup-sidebar">
                  <div className="rbl-mock-section-label">Sections</div>
                  {['Contact', 'Summary', 'Experience', 'Education', 'Skills'].map((s, i) => (
                    <div key={s} className={`rbl-mock-section-item${i === 2 ? ' active' : ''}`}>{s}</div>
                  ))}
                  <div className="rbl-mock-add-btn">+ Add Section</div>
                </div>
                <div className="rbl-mockup-editor">
                  <div className="rbl-mock-resume-header">
                    <div className="rbl-mock-avatar">SJ</div>
                    <div>
                      <div className="rbl-mock-name">Sarah Jenkins</div>
                      <div className="rbl-mock-role">Senior Software Engineer</div>
                    </div>
                    <div className="rbl-mock-score-badge">ATS: 91</div>
                  </div>
                  <div className="rbl-mock-section-title">Experience</div>
                  <div className="rbl-mock-exp-card">
                    <div className="rbl-mock-exp-title">Lead Engineer · TechCorp <span>2023–Present</span></div>
                    <div className="rbl-mock-line" style={{ width: '90%' }} />
                    <div className="rbl-mock-line" style={{ width: '75%' }} />
                  </div>
                  <div className="rbl-mock-ai-banner">
                    <Zap size={13} color="#2dc08d" />
                    <span>AI suggestion: Add a quantified achievement →</span>
                    <button className="rbl-mock-ai-btn">Apply</button>
                  </div>
                  <div className="rbl-mock-section-title" style={{ marginTop: '0.75rem' }}>Skills</div>
                  <div className="rbl-mock-tags">
                    {['React', 'TypeScript', 'Node.js', 'AWS', 'Docker'].map(s => (
                      <span key={s} className="rbl-mock-tag">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Floating badges */}
            <div className="rbl-float rbl-float-score">
              <div className="rbl-float-icon"><Star size={14} color="#f59e0b" /></div>
              <div>
                <div className="rbl-float-val">91 / 100</div>
                <div className="rbl-float-lbl">ATS Score</div>
              </div>
            </div>
            <div className="rbl-float rbl-float-kw">
              <div className="rbl-float-icon"><CheckCircle2 size={14} color="#2dc08d" /></div>
              <div>
                <div className="rbl-float-val">+18 Keywords</div>
                <div className="rbl-float-lbl">Matched</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FREE AI TOOLS STRIP ──────────────────────────────────── */}
      <section className="rbl-tools-strip">
        <div className="rbl-tools-inner">
          <p className="rbl-tools-label">Use CVMind's free AI resume tools</p>
          <div className="rbl-tools-row">
            {[
              { label: 'Resume Checker', page: 'home' },
              { label: 'Resume Tailor', page: 'tailor' },
              { label: 'Cover Letter', page: 'resume-editor' },
              { label: 'Interview Prep', page: 'prep' },
              { label: 'LinkedIn Optimizer', page: 'linkedin' },
            ].map(({ label, page }) => (
              <button key={label} className="rbl-tool-pill" onClick={() => setCurrentPage(page)}>
                {label} <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPERIENCE LEVEL CARDS ───────────────────────────────── */}
      <section className="rbl-levels-section">
        <div className="rbl-section-inner">
          <div className="rbl-section-tag">Built for every career stage</div>
          <h2 className="rbl-section-h2">An AI Resume Builder for Every Professional</h2>
          <div className="rbl-levels-grid">
            {[
              {
                label: 'Senior & Executive', color: '#7c3aed',
                bullets: ['Fit career history on a single page', 'AI rewrites experience sections', 'Generate tailored executive summaries', 'Optimize for leadership roles', 'Highlight strategic impact'],
              },
              {
                label: 'Entry & Mid-Level', color: '#2dc08d',
                bullets: ['Find your winning resume formula', 'AI tailors to any job description', 'Extract and generate relevant skills', 'Get achievement suggestions', 'Follow proven resume structures'],
              },
              {
                label: 'Career Changers', color: '#f59e0b',
                bullets: ['Optimize for new industries instantly', 'ATS compatibility for any sector', 'Match transferable skills to roles', 'Clean formatting for ATS parsing', 'Highlight adaptable achievements'],
              },
            ].map(({ label, color, bullets }) => (
              <div key={label} className="rbl-level-card" style={{ '--card-color': color } as React.CSSProperties}>
                <div className="rbl-level-card-top" style={{ background: color }}>
                  <div className="rbl-level-resume-mock">
                    <div className="rbl-level-mock-line" style={{ width: '60%', background: 'rgba(255,255,255,0.8)' }} />
                    <div className="rbl-level-mock-line" style={{ width: '40%', background: 'rgba(255,255,255,0.5)' }} />
                    <div style={{ height: '0.5rem' }} />
                    <div className="rbl-level-mock-line" style={{ width: '80%' }} />
                    <div className="rbl-level-mock-line" style={{ width: '70%' }} />
                    <div className="rbl-level-mock-line" style={{ width: '55%' }} />
                  </div>
                </div>
                <div className="rbl-level-card-body">
                  <h3 className="rbl-level-title" style={{ color }}>{label}</h3>
                  <ul className="rbl-level-bullets">
                    {bullets.map(b => (
                      <li key={b}><CheckCircle2 size={14} color={color} />{b}</li>
                    ))}
                  </ul>
                  <button className="rbl-level-cta" style={{ color, border: `1.5px solid ${color}` }} onClick={() => setCurrentPage('resume-editor')}>
                    Build My Resume <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEMPLATES ────────────────────────────────────────────── */}
      <section className="rbl-templates-section">
        <div className="rbl-section-inner">
          <div className="rbl-section-tag">Resume Templates</div>
          <h2 className="rbl-section-h2">Start from a Recruiter-Reviewed Layout</h2>
          <p className="rbl-section-sub">{RESUME_TEMPLATE_COUNT} ATS-tested templates with 90%+ parsing rate — no graphics, no text-in-images, no ATS traps.</p>
          <div className="rbl-templates-grid">
            {FEATURED_TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                className="rbl-template-card"
                style={{ '--t-color': t.color } as React.CSSProperties}
                onClick={() => setCurrentPage('resume-editor')}
                aria-label={`Use the ${t.name} template`}
              >
                <TemplatePreview html={t.html} name={t.name} />
                <span className="rbl-template-label">{t.name}</span>
                <span className="rbl-template-overlay"><span>Use Template</span></span>
              </button>
            ))}
          </div>
          <div className="rbl-templates-cta">
            <button className="rbl-btn-primary" onClick={() => setCurrentPage('resume-editor')}>
              View All {RESUME_TEMPLATE_COUNT} Templates <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURE MODULES ──────────────────────────────────────── */}
      <section className="rbl-features-section">
        <div className="rbl-section-inner">
          <div className="rbl-section-tag">AI Tools at Every Stage</div>
          <h2 className="rbl-section-h2">Everything You Need for Your Job Search</h2>
          <div className="rbl-features-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`rbl-feature-row${i % 2 === 1 ? ' rbl-feature-row-reverse' : ''}`}>
                <div className="rbl-feature-text">
                  <div className="rbl-feature-icon-wrap">{f.icon}</div>
                  <h3 className="rbl-feature-title">{f.title}</h3>
                  <p className="rbl-feature-desc">{f.desc}</p>
                  <ul className="rbl-feature-bullets">
                    {f.bullets.map(b => (
                      <li key={b}><CheckCircle2 size={14} color="#2dc08d" />{b}</li>
                    ))}
                  </ul>
                  <button className="rbl-feature-link" onClick={() => setCurrentPage('resume-editor')}>
                    Try it free <ArrowRight size={14} />
                  </button>
                </div>
                <div className="rbl-feature-visual">
                  <div className="rbl-feature-card-mock">
                    <div className="rbl-fcm-header" style={{ background: ['#6366f1','#2dc08d','#f59e0b','#7c3aed'][i] }}>
                      <span>{f.title}</span>
                    </div>
                    <div className="rbl-fcm-body">
                      {f.bullets.map(b => (
                        <div key={b} className="rbl-fcm-row">
                          <CheckCircle2 size={13} color="#2dc08d" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="rbl-testimonials-section">
        <div className="rbl-section-inner">
          <div className="rbl-section-tag">Social Proof</div>
          <h2 className="rbl-section-h2">Trusted by Professionals Worldwide</h2>
          <div className="rbl-stats-row">
            {[[resumesStat,'Resumes Analyzed'],['4.9★','User Rating'],['+42%','More Interviews'],['12K+','Jobs Landed']].map(([v,l]) => (
              <div key={l} className="rbl-stat">
                <div className="rbl-stat-val">{v}</div>
                <div className="rbl-stat-lbl">{l}</div>
              </div>
            ))}
          </div>
          <div className="rbl-testimonials-grid">
            {TESTIMONIALS.map(({ name, role, text }) => (
              <div key={name} className="rbl-testimonial-card">
                <div className="rbl-testi-stars">{'★★★★★'}</div>
                <p className="rbl-testi-text">"{text}"</p>
                <div className="rbl-testi-author">
                  <div className="rbl-testi-avatar">{name[0]}</div>
                  <div>
                    <div className="rbl-testi-name">{name}</div>
                    <div className="rbl-testi-role">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="rbl-faq-section">
        <div className="rbl-section-inner rbl-faq-inner">
          <div className="rbl-section-tag">FAQ</div>
          <h2 className="rbl-section-h2">Frequently Asked Questions</h2>
          <div className="rbl-faq-list">
            {FAQS.map((faq, i) => (
              <div key={i} className={`rbl-faq-item${openFaq === i ? ' open' : ''}`}>
                <button className="rbl-faq-trigger" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <ChevronDown size={18} className="rbl-faq-arrow" />
                </button>
                {openFaq === i && <div className="rbl-faq-answer">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section className="rbl-final-cta">
        <div className="rbl-final-inner">
          <h2 className="rbl-final-h2">Your Resume Is the First Impression.<br />Make It Count.</h2>
          <p className="rbl-final-sub">Join 50,000+ job seekers who landed more interviews with CV Mind.</p>
          <div className="rbl-final-actions">
            <button className="rbl-btn-primary rbl-btn-large" onClick={() => setCurrentPage('resume-editor')}>
              Build Your Resume Now <ArrowRight size={18} />
            </button>
            <button className="rbl-btn-outline rbl-btn-outline-white" onClick={() => setCurrentPage('home')}>
              Check ATS Score Free
            </button>
          </div>
          <div className="rbl-final-trust">
            {'★★★★★'.split('').map((s, i) => <span key={i} style={{ color: '#f59e0b' }}>{s}</span>)}
            <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>4.9 rated · 250+ reviews</span>
          </div>
        </div>
      </section>

    </div>
  );
}

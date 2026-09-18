import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, ShieldAlert, ArrowRight, ShieldCheck, Lock, Search, BarChart3, Sparkles, Link, ChevronLeft, ChevronRight, Palette, Columns2 } from 'lucide-react';
import { useLiveStats, formatStat } from '../utils/stats';
import { authFetch } from '../lib/authFetch';
import { HeroSection } from '../components/blocks/hero-section-9';
import './Home.css';
import './HomeCarousel.css';

interface HomeProps {
  setCurrentPage: (page: string) => void;
  setAnalysisResult: (result: any) => void;
  setResumeText: (text: string) => void;
  customApiKey: string;
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home({ setCurrentPage, setAnalysisResult, setResumeText, customApiKey }: HomeProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [resumeUrl, setResumeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [tplActiveIndex, setTplActiveIndex] = useState(0);

  // Live stats for the banner — falls back to the static values if the API is unreachable.
  const liveStats = useLiveStats();

  const userId = (() => {
    try { const u = JSON.parse(localStorage.getItem('cvmind_user') || '{}'); return u.id || u._id || ''; } catch { return ''; }
  })();

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const scoreRef      = useRef<HTMLElement>(null);
  const scrollToScore = () => scoreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const tplCarouselRef = useRef<HTMLDivElement>(null);
  const TEMPLATE_PREVIEWS: {
    id: string; name: string; color: string; sidebar?: boolean;
    person: string; role: string;
    exp: { title: string; company: string; date: string; bullets: string[] };
    edu: string; skills: string[];
  }[] = [
    {
      id: 'executive-sidebar', name: 'Executive Sidebar', color: '#0f172a', sidebar: true,
      person: 'Maeve Delaney', role: 'Strategic Sourcing Leader | Procurement Specialist | Team Management',
      exp: { title: 'Senior Sourcing Manager', company: 'Premier Inc.', date: '03/2021 – Present',
        bullets: ['Implemented AI-powered category management strategy, automating sourcing decisions for 130+ supplier categories.', 'Negotiated long-term supply contracts, generating $4.2M in annual savings.'] },
      edu: 'Duke University · Master of Business Administration',
      skills: ['Category Management', 'Vendor Negotiation', 'Supply Chain'],
    },
    {
      id: 'modern-blue', name: 'Modern Blue', color: '#1565c0',
      person: 'Ellen Johnson', role: 'Digital Marketing Manager | Growth Hacking | Data Analysis',
      exp: { title: 'Senior Digital Specialist', company: 'Northwind Media', date: '01/2022 – Present',
        bullets: ['Led paid acquisition strategy across 5 channels, cutting CAC by 34% while scaling spend 2x.', 'Built attribution dashboard adopted company-wide for marketing ROI tracking.'] },
      edu: 'UC Berkeley · Master of Science in Marketing Analytics',
      skills: ['Google Ads', 'SQL', 'A/B Testing'],
    },
    {
      id: 'creative-bold', name: 'Creative Bold', color: '#6a1b9a',
      person: 'Grace Jackson', role: 'Data Scientist | Machine Learning | AI Research',
      exp: { title: 'Data Scientist II', company: 'Vertex Analytics', date: '06/2021 – Present',
        bullets: ['Built recommendation engine increasing checkout conversion by 19% across 2M+ users.', 'Mentored 4 junior data scientists on model deployment best practices.'] },
      edu: 'Carnegie Mellon · M.S. in Machine Learning',
      skills: ['Python', 'TensorFlow', 'MLOps'],
    },
    {
      id: 'data-scientist', name: 'Data Scientist', color: '#bf360c',
      person: 'Priya Sharma', role: 'Data Scientist | ML Engineer | AI Researcher',
      exp: { title: 'Senior Data Scientist', company: 'Tech Unicorn', date: '02/2022 – Present',
        bullets: ['Built fraud detection model (XGBoost + LSTM) saving ₹8Cr monthly.', 'Led A/B testing framework adopted by 8 product teams.'] },
      edu: 'IIT Bombay · M.Tech in Data Science',
      skills: ['PyTorch', 'Spark', 'AWS SageMaker'],
    },
    {
      id: 'fresh-graduate', name: 'Fresh Graduate', color: '#0277bd',
      person: 'Arjun Mehta', role: 'B.Tech Computer Science · Class of 2024',
      exp: { title: 'Software Engineering Intern', company: 'Quantum Labs', date: '05/2023 – 08/2023',
        bullets: ['Built feature using React + Node.js, adopted by 5,000+ users in first month.', 'Received Pre-Placement Offer (PPO) at end of internship.'] },
      edu: 'NIT Surathkal · B.Tech in Computer Science',
      skills: ['Java', 'React', 'SQL'],
    },
    {
      id: 'sales-kpi', name: 'Sales & Marketing KPI', color: '#e65100',
      person: 'Brandon Hale', role: 'Senior Business Development Director',
      exp: { title: 'Senior Account Executive', company: 'Apex Solutions', date: '04/2021 – Present',
        bullets: ['Closed $2M+ in new business, exceeding quota by 150% for 3 consecutive years.', 'Built and managed pipeline of 80+ enterprise accounts.'] },
      edu: 'NYU Stern · MBA in Marketing',
      skills: ['Salesforce', 'Negotiation', 'Account Growth'],
    },
    {
      id: 'startup-product', name: 'Startup Product Lead', color: '#059669',
      person: 'Naomi Carter', role: 'Product Manager | 0-to-1 Builder | Growth',
      exp: { title: 'Senior Product Manager', company: 'Lumen Startup', date: '09/2022 – Present',
        bullets: ['Launched feature driving 40% increase in DAU within 2 quarters.', 'Owned roadmap for a product generating $5M ARR.'] },
      edu: 'Stanford University · B.S. in Computer Science',
      skills: ['Roadmapping', 'SQL', 'User Research'],
    },
    {
      id: 'ux-designer', name: 'UX / Product Designer', color: '#ff6f61',
      person: 'Liam Foster', role: 'Product Designer & UX Researcher',
      exp: { title: 'Senior Product Designer', company: 'Studio Nine', date: '07/2021 – Present',
        bullets: ['Redesigned core onboarding flow, lifting activation by 31%.', "Built and scaled the company's first design system."] },
      edu: 'Pratt Institute · B.Des in Interaction Design',
      skills: ['Figma', 'Prototyping', 'Design Systems'],
    },
    {
      id: 'dev-terminal', name: 'Developer Terminal', color: '#16a34a',
      person: 'Rohan Verma', role: 'Full-Stack Software Engineer',
      exp: { title: 'Senior Software Engineer', company: 'CloudByte', date: '03/2022 – Present',
        bullets: ['Built microservices handling 10M+ requests/day at 99.99% uptime.', 'Reduced API latency by 45% via caching and query optimization.'] },
      edu: 'BITS Pilani · B.E. in Computer Science',
      skills: ['TypeScript', 'Node.js', 'Docker'],
    },
    {
      id: 'hospitality-warm', name: 'Hospitality & Service', color: '#c2410c',
      person: 'Sophia Bennett', role: 'Hospitality & Guest Relations Manager',
      exp: { title: 'Guest Relations Manager', company: 'Azure Hotel Group', date: '11/2021 – Present',
        bullets: ['Maintained 4.9/5 guest satisfaction score across 200+ rooms.', 'Resolved VIP escalations, improving repeat bookings by 18%.'] },
      edu: 'Cornell University · BA in Hospitality Management',
      skills: ['Guest Relations', 'Team Training', 'Opera PMS'],
    },
  ];
  const scrollTplCarousel = (dir: 'left' | 'right') => {
    const el = tplCarouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -460 : 460, behavior: 'smooth' });
  };
  const handleTplScroll = () => {
    const el = tplCarouselRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / TEMPLATE_PREVIEWS.length;
    setTplActiveIndex(Math.round(el.scrollLeft / cardWidth));
  };

  // Steps to display in sequence during analysis to keep the user engaged
  const analysisSteps = [
    'Reading resume document...',
    'Extracting text formatting and structures...',
    'Matching skills against ATS algorithms...',
    'Analyzing tone and action verbs...',
    'Evaluating quantified metrics and achievements...',
    'Simulating corporate recruiter assessment...',
    'Generating comprehensive scorecard report...'
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    const allowedExtensions = ['pdf', 'docx', 'txt'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      setErrorMsg('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File is too large. Maximum size is 5MB.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (uploadMode === 'file' && !selectedFile) return;
    if (uploadMode === 'link' && !resumeUrl.trim()) {
      setErrorMsg('Please paste a link to your resume.');
      return;
    }
    setLoading(true);
    setLoadingStep(0);
    setErrorMsg(null);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < analysisSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 1600);

    const formData = new FormData();
    if (uploadMode === 'file' && selectedFile) {
      formData.append('resume', selectedFile);
    } else {
      formData.append('resumeUrl', resumeUrl.trim());
    }
    if (userId) formData.append('userId', userId);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = {};
      if (customApiKey) headers['x-gemini-key'] = customApiKey;

      // Signed in: the session token lets the backend keep this upload as the auto-apply agent's resume
      const response = await authFetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Server error during analysis');

      if (resData.success && resData.data) {
        const resultWithMeta = { ...resData.data, fileName: selectedFile?.name || resumeUrl };
        setAnalysisResult(resultWithMeta);
        if (resData.resumeText) setResumeText(resData.resumeText);
        setCurrentPage('dashboard');
      } else {
        throw new Error('Analysis completed, but failed to retrieve proper feedback metrics.');
      }
    } catch (err: any) {
      console.error('Upload Error:', err);
      setErrorMsg(err.message || 'Connection failed. Ensure the backend server is running.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  // ── Tab data ──
  const tabs = [
    { label: 'ATS Check', icon: '🎯' },
    { label: 'AI Rewrite', icon: '✨' },
    { label: 'Job Tailor', icon: '🔧' },
    { label: 'Interview Prep', icon: '🎤' },
    { label: 'LinkedIn', icon: '💼' },
    { label: 'Career Map', icon: '🗺️' },
    { label: 'Job Finder', icon: '🔍' },
  ];

  const tabPages = ['dashboard', 'dashboard', 'tailor', 'prep', 'linkedin', 'career-roadmap', 'job-finder'];

  // ── FAQ data ──
  const faqs = [
    { q: 'How does the AI resume checker work?', a: 'Our AI analyzes your resume against 500+ ATS keyword models, checks formatting, identifies gaps in quantified achievements, and scores your document on a 0–100 scale. You get a full report in seconds.' },
    { q: 'What is the AI Career Copilot?', a: 'AI Career Copilot is your personal job-search command center with 9 specialized AI agents working in parallel — Resume Agent, Job Discovery, Skill Coach, Interview Coach, Application Intel, Career Analytics, LinkedIn Agent, Networking Agent, and Salary Intel. It extracts your profile from your resume, computes a Career Health Score (0–100), and activates all agents to handle different parts of your job search simultaneously.' },
    { q: 'Can AI auto-fix my resume from the suggestions?', a: 'Yes. In the Resume Center, after your analysis is complete, click "AI Fix Resume" and our AI will automatically rewrite your entire resume incorporating all the suggestions. You can then download the fixed version as a PDF or DOCX instantly, or open it in the in-app resume editor to polish it further.' },
    { q: 'What file formats are supported?', a: 'We support PDF, DOCX, and TXT files up to 5MB. PDF and DOCX give the best results as they preserve formatting information.' },
    { q: 'How accurate is the ATS score?', a: 'Our ATS score correlates with the most widely used applicant tracking systems including Workday, Greenhouse, Lever, and iCIMS. Users who implement our suggestions see an average 42% improvement in interview callback rates.' },
    { q: 'Can I use this for multiple jobs?', a: 'Absolutely. Use the Resume Tailor tool to create a custom-tailored version of your resume for each job application. Our AI aligns your skills, keywords, and achievements to each specific job description.' },
    { q: 'How does the Job Discovery agent work?', a: 'The Job Discovery agent in AI Career Copilot scans across LinkedIn, Indeed, Glassdoor, and other platforms to find roles that match your extracted profile. Each match comes with a compatibility score, required skills, salary range, and a direct apply link — filtered by role type, location, and remote preference.' },
    { q: 'Is my resume data kept private?', a: 'Yes. Your resume is processed in memory and never stored on our servers without your consent. We use end-to-end encrypted connections and your data is never used for AI training.' },
    { q: 'Do I need to create an account?', a: 'No account is required to get your ATS score and basic analysis. Features like AI Career Copilot, saved works, and resume downloads require a free account. You can sign up with Google OAuth or email in seconds.' },
    { q: 'Can I delete my account and all my data?', a: 'Yes. Go to the profile dropdown in the top-right corner → click "Delete Account" → type DELETE to confirm. This permanently removes your account, all saved works, and all associated data from our servers immediately.' },
  ];

  return (
    <div className="home-container animate-fade-in-up">

      {/* ── 1. HERO ──────────────────────────────────────────── */}
      <HeroSection
        setCurrentPage={setCurrentPage}
        onAnalyzeClick={scrollToScore}
      />

      {/* ── 2. STATS BANNER ──────────────────────────────────── */}
      <section className="home-stats-banner">
        <div className="home-stats-inner">
          {[
            { value: liveStats.resumesAnalyzed != null ? formatStat(liveStats.resumesAnalyzed) : '50K+', label: 'Resumes Analyzed' },
            { value: '4.9★', label: 'User Rating' },
            { value: '+42%', label: 'Interview Rate' },
            { value: liveStats.usersThisMonth != null ? formatStat(liveStats.usersThisMonth) : '28K+', label: 'Users This Month' },
          ].map((stat) => (
            <div key={stat.label} className="home-stat-item">
              <div className="home-stat-value">{stat.value}</div>
              <div className="home-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2b. RESUME TEMPLATES CAROUSEL ────────────────────── */}
      <section className="home-tpl-section">
        <h2 className="home-tpl-title">Pick a template and build your resume in minutes!</h2>

        <div className="home-tpl-carousel-wrap">
          <button className="home-tpl-arrow home-tpl-arrow-left" onClick={() => scrollTplCarousel('left')} aria-label="Previous templates">
            <ChevronLeft size={20} />
          </button>

          <div className="home-tpl-carousel" ref={tplCarouselRef} onScroll={handleTplScroll}>
            {TEMPLATE_PREVIEWS.map((t) => (
              <div key={t.id} className="home-tpl-card" onClick={() => setCurrentPage('resume-builder')}>
                <div className="home-tpl-mock-window">
                  <div className={`home-tpl-doc ${t.sidebar ? 'home-tpl-doc-sidebar' : ''}`}>
                    {t.sidebar ? (
                      <>
                        <div className="home-tpl-doc-side" style={{ background: t.color }}>
                          <div className="home-tpl-doc-avatar" />
                          <div className="home-tpl-doc-side-label">CONTACTS</div>
                          <div className="home-tpl-doc-side-text">Phone · Email · LinkedIn</div>
                          <div className="home-tpl-doc-side-label">KEY ACHIEVEMENTS</div>
                          {t.exp.bullets.map((b, i) => <div key={i} className="home-tpl-doc-side-text">★ {b}</div>)}
                          <div className="home-tpl-doc-side-label">SKILLS</div>
                          <div className="home-tpl-doc-side-text">{t.skills.join(' · ')}</div>
                        </div>
                        <div className="home-tpl-doc-main">
                          <div className="home-tpl-doc-name">{t.person}</div>
                          <div className="home-tpl-doc-role" style={{ color: t.color }}>{t.role}</div>
                          <div className="home-tpl-doc-section" style={{ color: t.color }}>EXPERIENCE</div>
                          <div className="home-tpl-doc-job">{t.exp.title}</div>
                          <div className="home-tpl-doc-company">{t.exp.company} · {t.exp.date}</div>
                          <div className="home-tpl-doc-section" style={{ color: t.color, marginTop: '6px' }}>EDUCATION</div>
                          <div className="home-tpl-doc-company">{t.edu}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="home-tpl-doc-header" style={{ background: t.color }}>
                          <div className="home-tpl-doc-avatar home-tpl-doc-avatar-light" />
                          <div>
                            <div className="home-tpl-doc-name home-tpl-doc-name-light">{t.person}</div>
                            <div className="home-tpl-doc-role-light">{t.role}</div>
                          </div>
                        </div>
                        <div className="home-tpl-doc-body">
                          <div className="home-tpl-doc-section" style={{ color: t.color }}>EXPERIENCE</div>
                          <div className="home-tpl-doc-job">{t.exp.title}</div>
                          <div className="home-tpl-doc-company">{t.exp.company} · {t.exp.date}</div>
                          {t.exp.bullets.map((b, i) => <div key={i} className="home-tpl-doc-bullet">• {b}</div>)}
                          <div className="home-tpl-doc-section" style={{ color: t.color, marginTop: '6px' }}>EDUCATION</div>
                          <div className="home-tpl-doc-company">{t.edu}</div>
                          <div className="home-tpl-doc-section" style={{ color: t.color, marginTop: '6px' }}>SKILLS</div>
                          <div className="home-tpl-doc-skills">
                            {t.skills.map((s) => <span key={s} className="home-tpl-doc-chip" style={{ background: t.color }}>{s}</span>)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="home-tpl-card-overlay">
                  <span className="home-tpl-card-btn">Start With This Template</span>
                </div>
              </div>
            ))}
          </div>

          <button className="home-tpl-arrow home-tpl-arrow-right" onClick={() => scrollTplCarousel('right')} aria-label="Next templates">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="home-tpl-dots">
          {TEMPLATE_PREVIEWS.map((_, i) => (
            <span key={i} className={`home-tpl-dot ${i === tplActiveIndex ? 'active' : ''}`} />
          ))}
        </div>

        <div className="home-tpl-features">
          <div className="home-tpl-feature">
            <CheckCircle2 size={28} className="home-tpl-feature-icon home-tpl-feature-icon-green" />
            <p>ATS-friendly professionally designed resumes</p>
          </div>
          <div className="home-tpl-feature">
            <Palette size={28} className="home-tpl-feature-icon home-tpl-feature-icon-teal" />
            <p>Customizable sections, fonts, colors, and backgrounds</p>
          </div>
          <div className="home-tpl-feature">
            <Columns2 size={28} className="home-tpl-feature-icon home-tpl-feature-icon-purple" />
            <p>Single-column, double-column, and multiple-page layouts</p>
          </div>
        </div>

        <button className="home-tpl-browse-link" onClick={() => setCurrentPage('resume-builder')}>
          Browse Resume Templates <ArrowRight size={15} />
        </button>
      </section>

      {/* ── 3. ATS SECTION ───────────────────────────────────── */}
      <section className="home-ats-section">
        <div className="home-ats-inner">
          <div className="home-ats-left">
            <span className="home-ats-eyebrow">ATS Optimization</span>
            <h2 className="home-ats-title">Resumes optimized for<br />Applicant Tracking Systems</h2>
            <p className="home-ats-desc">Every resume template and AI rewrite is tested against leading ATS engines. Clean layouts, matched keywords, and standard section titles — nothing gets filtered out.</p>
            <ul className="home-ats-bullets">
              {['Detect keyword and content gaps', 'Get actionable suggestions to pass AI scans', 'Match recruiter bots and human reviewers', 'Beat 90% of applicants with one click'].map(b => (
                <li key={b}><span className="home-ats-check">✓</span>{b}</li>
              ))}
            </ul>
            <button className="home-ats-cta" onClick={scrollToScore}>Check My ATS Score →</button>
          </div>
          <div className="home-ats-right">
            {[
              { icon: <Search size={20} />, title: 'Keyword Matrix', desc: 'Matches your resume against 500+ ATS keyword models.' },
              { icon: <BarChart3 size={20} />, title: 'Full Score Report', desc: 'See exactly what passes, fails, and needs improvement.' },
              { icon: <CheckCircle2 size={20} />, title: 'Format Compliance', desc: 'Ensures headings, fonts, and structure are ATS-safe.' },
            ].map(card => (
              <div key={card.title} className="home-ats-card">
                <div className="home-ats-card-icon">{card.icon}</div>
                <div>
                  <div className="home-ats-card-title">{card.title}</div>
                  <div className="home-ats-card-desc">{card.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. AI FEATURES ACCORDION ─────────────────────────── */}
      <section className="home-ai-features-section">
        <div className="home-ai-features-inner">
          <div className="home-ai-features-left">
            <span className="home-ai-eyebrow">Fully equipped for the age of AI</span>
            <h2 className="home-ai-title">Fully equipped for<br />the age of AI</h2>
            <div className="home-ai-accordion">
              {[
                { title: 'ATS Score & Keyword Analysis', desc: 'Get a 0–100 ATS compatibility score with a complete breakdown of keyword gaps, missing skills, and formatting issues that prevent your resume from passing screening filters.' },
                { title: 'AI-Powered Resume Rewriting', desc: 'Our AI rewrites weak bullet points with strong action verbs, injects missing keywords, and restructures your experience section for maximum recruiter impact.' },
                { title: 'One-Click Job Tailoring', desc: 'Paste any job description and our AI instantly realigns your resume — injecting the right keywords, adjusting skills emphasis, and rewriting bullets to match the role.' },
                { title: 'Instant DOCX Download', desc: 'Download your AI-optimized resume as a professionally formatted DOCX file that is ATS-safe, recruiter-ready, and fully editable.' },
              ].map((item, i) => (
                <div key={i} className={`home-ai-accordion-item${activeTab === i ? ' open' : ''}`} onClick={() => setActiveTab(i === activeTab ? -1 : i)}>
                  <div className="home-ai-accordion-header">
                    <span className="home-ai-accordion-title">{item.title}</span>
                    <span className="home-ai-accordion-chevron">{activeTab === i ? '−' : '+'}</span>
                  </div>
                  {activeTab === i && (
                    <div className="home-ai-accordion-body">{item.desc}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="home-ai-features-right">
            <div className="home-ai-mock-ui">
              <div className="home-ai-mock-header">
                <div className="home-mock-dot red" /><div className="home-mock-dot yellow" /><div className="home-mock-dot green" />
                <span className="home-mock-title">AI Resume Analyzer</span>
              </div>
              <div className="home-ai-mock-body">
                <div className="home-ai-score-row">
                  <div className="home-ai-score-circle">
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                      <path fill="none" stroke="#f3f4f6" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path fill="none" stroke="#2dc08d" strokeWidth="3" strokeLinecap="round" strokeDasharray="85, 100" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="home-ai-score-num">85</span>
                  </div>
                  <div>
                    <div className="home-ai-score-label">ATS Score</div>
                    <div className="home-ai-score-status">Great match ✓</div>
                  </div>
                </div>
                <div className="home-ai-section-label">Keyword Analysis</div>
                {[['React.js', 98, '#2dc08d'], ['TypeScript', 92, '#2dc08d'], ['AWS Cloud', 74, '#3b82f6'], ['System Design', 55, '#f59e0b']].map(([skill, pct, color]) => (
                  <div key={skill as string} className="home-ai-bar-row">
                    <span className="home-ai-skill">{skill}</span>
                    <div className="home-ai-track"><div className="home-ai-fill" style={{ width: `${pct}%`, background: color as string }} /></div>
                    <span className="home-ai-pct">{pct}%</span>
                  </div>
                ))}
                <div className="home-ai-chips">
                  <span className="home-ai-chip home-ai-chip-green">✓ Format OK</span>
                  <span className="home-ai-chip home-ai-chip-green">✓ One Page</span>
                  <span className="home-ai-chip home-ai-chip-amber">⚠ 3 gaps</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── 6. ALTERNATING: Proofreading ─────────────────────── */}
      <section className="home-alt2-section home-alt2-white">
        <div className="home-alt2-inner">
          <div className="home-alt2-content">
            <span className="home-alt2-eyebrow">AI Proofreading</span>
            <h2 className="home-alt2-title">Leave proofreading<br />to AI tech</h2>
            <p className="home-alt2-desc">Our AI catches typos, grammar mistakes, weak phrasing, and passive voice — then rewrites everything to sound polished and professional. One click, zero errors.</p>
            <ul className="home-alt2-bullets">
              {['Grammar and spelling correction', 'Passive to active voice conversion', 'Weak verb replacement with power verbs', 'Tone alignment for your target industry'].map(b => (
                <li key={b}><span className="home-check-icon">✓</span>{b}</li>
              ))}
            </ul>
            <button className="home-alt2-btn" onClick={() => setCurrentPage('proofreading')}>Try AI Proofreading →</button>
          </div>
          <div className="home-alt2-visual">
            <div className="home-proof-card">
              <div className="home-proof-header">
                <span className="home-proof-badge home-proof-badge-red">Before AI</span>
              </div>
              <div className="home-proof-line home-proof-line-strike">Responsible for managing team projects and doing tasks</div>
              <div className="home-proof-line home-proof-line-strike">Helped with customer service issues and stuff</div>
              <div className="home-proof-divider">AI Rewritten ✨</div>
              <div className="home-proof-line home-proof-line-green">Led cross-functional teams, delivering 12 projects 15% under budget</div>
              <div className="home-proof-line home-proof-line-green">Resolved 200+ customer escalations, achieving 98% satisfaction score</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. ALTERNATING: Job Tailoring (reversed) ─────────── */}
      <section className="home-alt2-section home-alt2-gray">
        <div className="home-alt2-inner home-alt2-reversed">
          <div className="home-alt2-visual">
            <div className="home-mock-panel">
              <div className="home-mock-header">
                <div className="home-mock-dot red" /><div className="home-mock-dot yellow" /><div className="home-mock-dot green" />
                <span className="home-mock-title">Resume Tailor · AI Match</span>
              </div>
              <div className="home-mock-body">
                <div className="home-mock-label">Job Description Paste</div>
                <div className="home-mock-input">Senior Frontend Engineer at Google — React, TypeScript, AWS...</div>
                <div className="home-mock-label" style={{ marginTop: '0.85rem' }}>AI Match Results</div>
                {[['React.js', 98], ['TypeScript', 95], ['AWS Cloud', 78], ['System Design', 62]].map(([skill, pct]) => (
                  <div key={skill as string} className="home-mock-bar-row">
                    <span className="home-mock-skill">{skill}</span>
                    <div className="home-mock-track"><div className="home-mock-fill" style={{ width: `${pct}%`, background: Number(pct) >= 90 ? '#22c55e' : Number(pct) >= 70 ? '#3b82f6' : '#f59e0b' }} /></div>
                    <span className="home-mock-pct">{pct}%</span>
                  </div>
                ))}
                <div className="home-mock-cta-row">
                  <span className="home-mock-score-badge">Match Score: 83%</span>
                  <span className="home-mock-fix-btn">Auto-Fix →</span>
                </div>
              </div>
            </div>
          </div>
          <div className="home-alt2-content">
            <span className="home-alt2-eyebrow">Job Tailoring</span>
            <h2 className="home-alt2-title">Tailor your resume<br />in one click</h2>
            <p className="home-alt2-desc">Paste a job description and our AI instantly aligns your resume — keywords, skills, achievements — for maximum ATS score and recruiter match.</p>
            <ul className="home-alt2-bullets">
              {['JD keyword matching and injection', 'Skills gap detection and fill', 'Achievement rewriting with metrics', 'Match score percentage shown'].map(b => (
                <li key={b}><span className="home-check-icon">✓</span>{b}</li>
              ))}
            </ul>
            <button className="home-alt2-btn" onClick={() => setCurrentPage('tailor')}>Try Resume Tailoring →</button>
          </div>
        </div>
      </section>

      {/* ── 8. ALTERNATING: ATS Beat ─────────────────────────── */}
      <section className="home-alt2-section home-alt2-white">
        <div className="home-alt2-inner">
          <div className="home-alt2-content">
            <span className="home-alt2-eyebrow">ATS Beating</span>
            <h2 className="home-alt2-title">Make sure your resume<br />beats the ATS</h2>
            <p className="home-alt2-desc">Our AI tests your resume against real ATS engines and tells you exactly what to fix. Stop getting rejected before a human ever sees your resume.</p>
            <ul className="home-alt2-bullets">
              {['Real ATS engine simulation', 'Section-by-section breakdown', 'Instant keyword gap list', 'One-click auto-fix suggestions'].map(b => (
                <li key={b}><span className="home-check-icon">✓</span>{b}</li>
              ))}
            </ul>
            <button className="home-alt2-btn" onClick={scrollToScore}>Get My ATS Score →</button>
          </div>
          <div className="home-alt2-visual">
            <div className="home-ats-visual-card">
              <div className="home-ats-vc-header">ATS Compatibility Report</div>
              <div className="home-ats-vc-score-row">
                <div className="home-ats-vc-score">85<span>/100</span></div>
                <div className="home-ats-vc-status">Strong Pass ✓</div>
              </div>
              <div className="home-ats-vc-checks">
                {[
                  { label: 'Keywords Found', status: 'pass', value: '18/22' },
                  { label: 'Formatting Safe', status: 'pass', value: '✓' },
                  { label: 'Section Titles', status: 'pass', value: '✓' },
                  { label: 'Skills Match', status: 'warn', value: '74%' },
                  { label: 'Missing Keywords', status: 'fail', value: '4 gaps' },
                ].map(check => (
                  <div key={check.label} className={`home-ats-vc-check home-ats-vc-check-${check.status}`}>
                    <span className="home-ats-vc-check-icon">{check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗'}</span>
                    <span className="home-ats-vc-check-label">{check.label}</span>
                    <span className="home-ats-vc-check-value">{check.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. AI CAREER COPILOT ─────────────────────────────── */}
      <section className="home-alt2-section home-alt2-gray">
        <div className="home-alt2-inner home-alt2-reversed">
          <div className="home-alt2-content">
            <span className="home-alt2-eyebrow">AI Career Copilot</span>
            <h2 className="home-alt2-title">Your entire job search,<br />on autopilot</h2>
            <p className="home-alt2-desc">9 specialized AI agents working in parallel — optimizing your resume, discovering jobs, coaching your interviews, and tracking every application so you don't have to.</p>
            <ul className="home-alt2-bullets">
              {['Resume Agent auto-fixes & tailors your CV', 'Job Discovery across LinkedIn, Indeed & more', 'AI Interview Coach with STAR feedback', 'Application Intel & career health tracking'].map(b => (
                <li key={b}><span className="home-check-icon">✓</span>{b}</li>
              ))}
            </ul>
            <button className="home-alt2-btn home-alt2-btn-accent" onClick={() => setCurrentPage('career-copilot')}>Launch Career Copilot →</button>
          </div>
          <div className="home-alt2-visual">
            <div className="home-copilot-visual">
              <div className="home-copilot-header">
                <div className="home-mock-dot red" /><div className="home-mock-dot yellow" /><div className="home-mock-dot green" />
                <span className="home-copilot-header-title">AI Career Copilot</span>
              </div>
              <div className="home-copilot-score-row">
                <div className="home-copilot-score-circle">
                  <svg viewBox="0 0 56 56" className="home-copilot-ring">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#6c63ff" strokeWidth="4"
                      strokeDasharray="150.8" strokeDashoffset="30" strokeLinecap="round"
                      transform="rotate(-90 28 28)" />
                  </svg>
                  <span className="home-copilot-ring-val">82</span>
                </div>
                <div className="home-copilot-score-meta">
                  <div className="home-copilot-score-label">Career Health Score</div>
                  <div className="home-copilot-score-status">Strong · 3 agents active</div>
                </div>
              </div>
              <div className="home-copilot-agents">
                {[
                  { icon: '📄', name: 'Resume Agent', status: 'Optimizing…', active: true },
                  { icon: '🔍', name: 'Job Discovery', status: '14 new matches', active: true },
                  { icon: '🎯', name: 'Interview Coach', status: 'Ready', active: false },
                  { icon: '📊', name: 'Application Intel', status: '6 tracked', active: true },
                ].map(agent => (
                  <div key={agent.name} className={`home-copilot-agent-row${agent.active ? ' home-copilot-agent-active' : ''}`}>
                    <span className="home-copilot-agent-icon">{agent.icon}</span>
                    <span className="home-copilot-agent-name">{agent.name}</span>
                    <span className="home-copilot-agent-status">{agent.status}</span>
                    {agent.active && <span className="home-copilot-agent-dot" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. UPLOAD / SCORE SECTION ───────────────────────── */}
      <section ref={scoreRef} className="home-score-section">
        <div className="home-score-inner">
          <div className="home-score-text">
            <span className="home-score-eyebrow">Free ATS Check</span>
            <h2 className="home-score-title">Get Your Resume Score in Seconds</h2>
            <p className="home-score-sub">Upload your resume and instantly see your ATS compatibility score, keyword gaps, formatting issues, and AI-powered fix suggestions.</p>
            <div className="home-score-badges">
              <span className="home-score-badge"><ShieldCheck size={13} /> Privacy guaranteed</span>
              <span className="home-score-badge"><CheckCircle2 size={13} /> Instant results</span>
              <span className="home-score-badge"><Sparkles size={13} /> AI-powered</span>
            </div>
          </div>
          <div className="home-score-upload">
            <div className="upload-section">
              <div className="upload-wrapper">
                {/* Mode toggle */}
                <div className="upload-mode-toggle">
                  <button
                    className={`upload-mode-btn${uploadMode === 'file' ? ' active' : ''}`}
                    onClick={() => { setUploadMode('file'); setErrorMsg(null); }}
                    disabled={loading}
                  >
                    <Upload size={14} /> Upload File
                  </button>
                  <button
                    className={`upload-mode-btn${uploadMode === 'link' ? ' active' : ''}`}
                    onClick={() => { setUploadMode('link'); setErrorMsg(null); }}
                    disabled={loading}
                  >
                    <Link size={14} /> Paste Link
                  </button>
                </div>

                {uploadMode === 'file' ? (
                  <div
                    className={`upload-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''} ${loading ? 'is-loading' : ''}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input ref={fileInputRef} type="file" className="file-input-hidden" accept=".pdf,.docx,.txt" onChange={handleChange} disabled={loading} />
                    {loading ? (
                      <div className="skeleton-loading-state">
                        <div className="skeleton-header-mini">
                          <p className="skeleton-step-label">{analysisSteps[loadingStep]}</p>
                          <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${((loadingStep + 1) / analysisSteps.length) * 100}%` }} />
                          </div>
                        </div>
                        <div className="skeleton-preview">
                          <div className="skeleton-score-row">
                            <div className="skeleton-circle skeleton-pulse" />
                            <div className="skeleton-score-text">
                              <div className="skeleton-mini-line skeleton-pulse" style={{ width: '110px', height: '13px' }} />
                              <div className="skeleton-mini-line skeleton-pulse" style={{ width: '72px', height: '10px' }} />
                            </div>
                          </div>
                          <div className="skeleton-bars-mini">
                            {[88, 74, 61, 46].map((w, i) => (
                              <div key={i} className="skeleton-bar-row-mini">
                                <div className="skeleton-bar-label-mini skeleton-pulse" style={{ width: `${38 + i * 8}px` }} />
                                <div className="skeleton-bar-track-mini">
                                  <div className="skeleton-bar-fill-mini skeleton-pulse" style={{ width: `${w}%` }} />
                                </div>
                                <div className="skeleton-bar-pct-mini skeleton-pulse" />
                              </div>
                            ))}
                          </div>
                          <div className="skeleton-chips-mini">
                            <div className="skeleton-chip-mini skeleton-pulse" />
                            <div className="skeleton-chip-mini skeleton-pulse" />
                            <div className="skeleton-chip-mini skeleton-pulse" />
                          </div>
                        </div>
                      </div>
                    ) : selectedFile ? (
                      <div className="file-selected-state">
                        <div className="file-icon-wrapper"><FileText className="file-icon" /></div>
                        <div className="file-details">
                          <span className="file-name">{selectedFile.name}</span>
                          <span className="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                        <div className="file-actions">
                          <button className="btn-secondary" onClick={removeFile}>Remove</button>
                          <button className="btn-primary" onClick={handleAnalyze}>Analyze Resume <ArrowRight size={18} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-prompt-state" onClick={onButtonClick}>
                        <Upload className="upload-icon" />
                        <button className="upload-cta" type="button">Upload Your Resume</button>
                        <div className="privacy-note"><Lock size={14} /> Privacy guaranteed</div>
                        <div className="file-limits-info">PDF, DOCX, or TXT up to 5MB</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`upload-zone link-input-zone ${loading ? 'is-loading' : ''}`}>
                    {loading ? (
                      <div className="skeleton-loading-state">
                        <div className="skeleton-header-mini">
                          <p className="skeleton-step-label">{analysisSteps[loadingStep]}</p>
                          <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${((loadingStep + 1) / analysisSteps.length) * 100}%` }} />
                          </div>
                        </div>
                        <div className="skeleton-preview">
                          <div className="skeleton-score-row">
                            <div className="skeleton-circle skeleton-pulse" />
                            <div className="skeleton-score-text">
                              <div className="skeleton-mini-line skeleton-pulse" style={{ width: '110px', height: '13px' }} />
                              <div className="skeleton-mini-line skeleton-pulse" style={{ width: '72px', height: '10px' }} />
                            </div>
                          </div>
                          <div className="skeleton-bars-mini">
                            {[88, 74, 61, 46].map((w, i) => (
                              <div key={i} className="skeleton-bar-row-mini">
                                <div className="skeleton-bar-label-mini skeleton-pulse" style={{ width: `${38 + i * 8}px` }} />
                                <div className="skeleton-bar-track-mini">
                                  <div className="skeleton-bar-fill-mini skeleton-pulse" style={{ width: `${w}%` }} />
                                </div>
                                <div className="skeleton-bar-pct-mini skeleton-pulse" />
                              </div>
                            ))}
                          </div>
                          <div className="skeleton-chips-mini">
                            <div className="skeleton-chip-mini skeleton-pulse" />
                            <div className="skeleton-chip-mini skeleton-pulse" />
                            <div className="skeleton-chip-mini skeleton-pulse" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="link-input-state">
                        <Link size={28} className="link-input-icon" />
                        <p className="link-input-label">Paste a shareable link to your resume</p>
                        <input
                          type="url"
                          className="resume-link-input"
                          placeholder="https://drive.google.com/... or any direct PDF/DOCX link"
                          value={resumeUrl}
                          onChange={(e) => setResumeUrl(e.target.value)}
                          disabled={loading}
                        />
                        <p className="link-input-hint">Supports Google Drive, Dropbox, OneDrive, or any direct link</p>
                        <button
                          className="btn-primary"
                          onClick={handleAnalyze}
                          disabled={!resumeUrl.trim()}
                        >
                          Analyze Resume <ArrowRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {errorMsg && (
                  <div className="error-message-bar animate-fade-in-up">
                    <ShieldAlert className="error-icon" /><span>{errorMsg}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. ONE PLACE TABS ───────────────────────────────── */}
      <section className="home-tabs-section">
        <div className="home-tabs-inner">
          <h2 className="home-tabs-title">One place to run your entire job search</h2>
          <p className="home-tabs-sub">Every tool you need to go from unemployed to employed — in one AI-powered platform.</p>
          <div className="home-tabs-nav">
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                className={`home-tab-btn${activeTab === i ? ' home-tab-btn-active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                <span className="home-tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="home-tabs-content">
            <div className="home-tabs-panel">
              <div className="home-tabs-panel-text">
                <h3 className="home-tabs-panel-title">{tabs[activeTab]?.label}</h3>
                <p className="home-tabs-panel-desc">
                  {activeTab === 0 && 'Upload your resume and get an instant ATS score with keyword gap analysis, formatting feedback, and AI-powered suggestions to improve your interview callback rate.'}
                  {activeTab === 1 && 'Our AI rewrites your entire resume — replacing weak bullets with power verbs, injecting keywords, and restructuring your experience to maximize ATS compatibility.'}
                  {activeTab === 2 && 'Paste any job description and our AI instantly tailors your resume to match the role — aligning keywords, skills, and achievements for a 90%+ match score.'}
                  {activeTab === 3 && 'Practice behavioral interviews with our AI coach. Get STAR-framework feedback, confidence scoring, and real-time suggestions to ace any interview.'}
                  {activeTab === 4 && 'Optimize your LinkedIn profile with AI-generated headlines, summaries, and outreach messages that attract recruiters and triple your profile views.'}
                  {activeTab === 5 && 'Get a personalized 5-year career roadmap with milestones, certifications, and skill progression paths tailored to your target role.'}
                  {activeTab === 6 && 'Match your resume against thousands of jobs across LinkedIn, Indeed, and Glassdoor. Get curated job recommendations with match scores and direct apply links.'}
                </p>
                <button className="home-tabs-panel-btn" onClick={() => setCurrentPage(tabPages[activeTab] || 'dashboard')}>
                  Try {tabs[activeTab]?.label} →
                </button>
              </div>
              <div className="home-tabs-panel-visual">
                <div className="home-tabs-mock">
                  <div className="home-tabs-mock-bar">
                    <div className="home-mock-dot red" /><div className="home-mock-dot yellow" /><div className="home-mock-dot green" />
                    <span className="home-mock-title">{tabs[activeTab]?.label}</span>
                  </div>
                  <div className="home-tabs-mock-body">
                    <div className="home-tabs-mock-lines">
                      <div className="home-tabs-mock-line" style={{ width: '90%' }} />
                      <div className="home-tabs-mock-line" style={{ width: '75%' }} />
                      <div className="home-tabs-mock-line" style={{ width: '85%' }} />
                      <div className="home-tabs-mock-line" style={{ width: '60%' }} />
                    </div>
                    <div className="home-tabs-mock-badge">{tabs[activeTab]?.icon} Ready</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. FINAL CTA BANNER ─────────────────────────────── */}
      <section className="home-final-cta">
        <div className="home-final-cta-inner">
          <div className="home-final-stars">{'★★★★★'} <span>Rated 4.9 by 250+ users</span></div>
          <h2 className="home-final-title">Ready to land more interviews?</h2>
          <p className="home-final-sub">Join 50,000+ job seekers who improved their resume score and got hired faster with AI.</p>
          <div className="home-final-actions">
            <button className="home-final-btn-primary" onClick={() => setCurrentPage('resume-builder')}>Build Your Resume Free</button>
            <button className="home-final-btn-secondary" onClick={scrollToScore}>Get ATS Score</button>
          </div>
        </div>
      </section>

      {/* ── 12. FAQ ──────────────────────────────────────────── */}
      <section className="home-faq-section">
        <div className="home-faq-inner">
          <h2 className="home-faq-title">Frequently Asked Questions</h2>
          <p className="home-faq-sub">Everything you need to know about our AI resume tools.</p>
          <div className="home-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`home-faq-item${openFaq === i ? ' open' : ''}`}>
                <button className="home-faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span className="home-faq-chevron">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="home-faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}

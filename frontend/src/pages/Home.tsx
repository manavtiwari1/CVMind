import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, ShieldAlert, ArrowRight, ShieldCheck, Lock, Sparkles, Link } from 'lucide-react';
import { authFetch } from '../lib/authFetch';
import HomeHero from '../components/home/HomeHero';
import AtsBand from '../components/home/AtsBand';
import AiAssistant from '../components/home/AiAssistant';
import FeatureRows from '../components/home/FeatureRows';
import FieldTemplates from '../components/home/FieldTemplates';
import JobSearchTabs from '../components/home/JobSearchTabs';
import GuidesSection from '../components/home/GuidesSection';
import TemplateMarquee from '../components/home/TemplateMarquee';
import '../components/home/home-v2.css';
import { getErrorMessage } from '../utils/errors';
import type { ResumeAnalysis } from '../types/api';
import './Home.css';
import './HomeCarousel.css';

interface HomeProps {
  setCurrentPage: (page: string) => void;
  setAnalysisResult: (result: ResumeAnalysis) => void;
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

  const userId = (() => {
    try { const u = JSON.parse(localStorage.getItem('cvmind_user') || '{}'); return u.id || u._id || ''; } catch { return ''; }
  })();

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const scoreRef      = useRef<HTMLElement>(null);
  const scrollToScore = () => scoreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

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
    } catch (err) {
      console.error('Upload Error:', err);
      setErrorMsg(getErrorMessage(err) || 'Connection failed. Ensure the backend server is running.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  // ── FAQ data ──
  const faqs = [
    { q: 'How does the AI resume checker work?', a: 'Our AI reads your resume, checks keyword coverage and formatting, looks for gaps in quantified achievements, and scores the document from 0 to 100. You get a full report in seconds.' },
    { q: 'What is the AI Career Copilot?', a: 'AI Career Copilot is your personal job-search command center with 9 specialized AI agents working in parallel — Resume Agent, Job Discovery, Skill Coach, Interview Coach, Application Intel, Career Analytics, LinkedIn Agent, Networking Agent, and Salary Intel. It extracts your profile from your resume, computes a Career Health Score (0–100), and activates all agents to handle different parts of your job search simultaneously.' },
    { q: 'Can AI auto-fix my resume from the suggestions?', a: 'Yes. In the Resume Center, after your analysis is complete, click "AI Fix Resume" and our AI will automatically rewrite your entire resume incorporating all the suggestions. You can then download the fixed version as a PDF or DOCX instantly, or open it in the in-app resume editor to polish it further.' },
    { q: 'What file formats are supported?', a: 'We support PDF, DOCX, and TXT files up to 5MB. PDF and DOCX give the best results as they preserve formatting information.' },
    { q: 'How accurate is the ATS score?', a: 'The score is an AI-based estimate of how well your resume reads to an applicant tracking system: keyword coverage, structure and formatting. Treat it as a guide rather than a guarantee, because every company configures its ATS differently.' },
    { q: 'Can I use this for multiple jobs?', a: 'Absolutely. Use the Resume Tailor tool to create a custom-tailored version of your resume for each job application. Our AI aligns your skills, keywords, and achievements to each specific job description.' },
    { q: 'How does the Job Discovery agent work?', a: 'The Job Discovery agent in AI Career Copilot scans across LinkedIn, Indeed, Glassdoor, and other platforms to find roles that match your extracted profile. Each match comes with a compatibility score, required skills, salary range, and a direct apply link — filtered by role type, location, and remote preference.' },
    { q: 'Is my resume data kept private?', a: 'Yes. Your resume is processed in memory and never stored on our servers without your consent. We use end-to-end encrypted connections and your data is never used for AI training.' },
    { q: 'Do I need to create an account?', a: 'No account is required to get your ATS score and basic analysis. Features like AI Career Copilot, saved works, and resume downloads require a free account. You can sign up with Google OAuth or email in seconds.' },
    { q: 'Can I delete my account and all my data?', a: 'Yes. Go to the profile dropdown in the top-right corner → click "Delete Account" → type DELETE to confirm. This permanently removes your account, all saved works, and all associated data from our servers immediately.' },
  ];

  return (
    <div className="home-container animate-fade-in-up">

      {/* ── 1. HERO ──────────────────────────────────────────── */}
      <HomeHero setCurrentPage={setCurrentPage} onAnalyzeClick={scrollToScore} />

      {/* ── 2. TEMPLATE MARQUEE ──────────────────────────────── */}
      <TemplateMarquee onUse={() => setCurrentPage('resume-builder')} />

      {/* ── 3. ATS BAND ──────────────────────────────────────── */}
      <AtsBand onBuild={() => setCurrentPage('resume-builder')} />

      {/* ── 4. AI ASSISTANT ──────────────────────────────────── */}
      <AiAssistant onCheck={scrollToScore} />

      {/* ── 5. FEATURE ROWS ──────────────────────────────────── */}
      <FeatureRows setCurrentPage={setCurrentPage} onCheck={scrollToScore} />

      {/* ── 6. TEMPLATES BY FIELD ────────────────────────────── */}
      <FieldTemplates onUse={() => setCurrentPage('resume-builder')} />

      {/* ── 7. JOB SEARCH TABS ───────────────────────────────── */}
      <JobSearchTabs setCurrentPage={setCurrentPage} onCheck={scrollToScore} />

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

      {/* ── 10b. GUIDES ──────────────────────────────────────── */}
      <GuidesSection setCurrentPage={setCurrentPage} />

      {/* ── 11. FINAL CTA ────────────────────────────────────── */}
      <section className="hp-cta">
        <h2 className="hp-h2 hp-h2--light">Ready to send a better resume?</h2>
        <p className="hp-body hp-body--light">Start from a template, or upload the resume you already have for a free ATS check.</p>
        <div className="hp-actions">
          <button className="hp-btn hp-btn--primary" onClick={() => setCurrentPage('resume-editor')}>Build your resume</button>
          <button className="hp-btn hp-btn--outline" onClick={scrollToScore}>Get your resume score</button>
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

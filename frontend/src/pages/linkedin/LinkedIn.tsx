import { useState, useRef } from 'react';
import {
  Sparkles, ShieldCheck, AlertCircle, Copy, Check, ArrowRight,
  Linkedin, Award, Star, Compass, Terminal, FileText, CheckCircle2, ChevronRight,
  Upload, Lock
} from 'lucide-react';
import SkeletonLoader from '../../components/SkeletonLoader';
import { getErrorMessage } from '../../utils/errors';
import { authFetch } from '../../lib/authFetch';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';
import './LinkedIn.css';

// /api/linkedin evaluation (linkedinSchema in backend/src/services/gemini.js)
interface LinkedInEvaluation {
  score: number;
  summary: string;
  headline: { current: string; feedback: string; suggestions: string[] };
  about: { feedback: string; improvedText: string };
  experience: { feedback: string; tips: string[] };
  skillsAndKeywords: { matched: string[]; missing: string[] };
  generalTips: string[];
}

interface LinkedInProps {
  customApiKey: string;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
}

export default function LinkedIn({ customApiKey, loadedWork, setLoadedWork }: LinkedInProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<LinkedInEvaluation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [saveIndicator, setSaveIndicator] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loaderSteps = [
    'Parsing profile PDF structure...',
    'Analyzing headline impact & SEO compatibility...',
    'Evaluating about section hooks & storytelling...',
    'Scrutinizing experience bullet points for action verbs...',
    'Matching skills against industry target matrices...',
    'Formulating corporate recruiter branding suggestions...'
  ];

  // Load saved work if opened from My Works (adjusting state during render,
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (!loadedWork.deleted && loadedWork.type === 'linkedin') {
      const saved = parseSavedContent<{ evaluation?: LinkedInEvaluation }>(loadedWork.htmlContent);
      if (saved?.evaluation) {
        setResult(saved.evaluation);
      } else if (!saved) {
        console.error('Error parsing loaded LinkedIn work');
      }
    }
  }

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension !== 'pdf') {
      setErrorMsg('Please upload a PDF file exported from LinkedIn.');
      setSelectedFile(null);
      return;
    }
    
    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File is too large. Maximum size is 5MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

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

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    setResult(null);
    setSaveIndicator(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (setLoadedWork) {
      setLoadedWork(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setLoadingStep(0);
    setErrorMsg(null);
    setResult(null);
    setSaveIndicator(false);
    if (setLoadedWork) {
      setLoadedWork(null); // clear currently loaded item to allow new saves
    }

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loaderSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1500);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL 
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

      const userStr = localStorage.getItem('cvmind_user');
      let email = '';
      let userId = '';
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          email = parsedUser.email || '';
          userId = parsedUser.id || parsedUser._id || '';
        } catch {
          // ignore
        }
      }

      const headers: Record<string, string> = {};
      if (customApiKey) {
        headers['x-gemini-key'] = customApiKey;
      }

      const formData = new FormData();
      formData.append('linkedinPdf', selectedFile);
      formData.append('email', email);
      formData.append('userId', userId);

      const response = await authFetch(`${baseUrl}/api/linkedin/analyze`, {
        method: 'POST',
        headers,
        body: formData
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Server error during LinkedIn analysis.');
      }

      if (resData.success && resData.data) {
        setResult(resData.data);
        if (resData.work) {
          setSaveIndicator(true);
        }
      } else {
        throw new Error('Analysis completed, but failed to retrieve profile metrics.');
      }
    } catch (err) {
      console.error('LinkedIn Optimize Error:', err);
      setErrorMsg(getErrorMessage(err) || 'Connection failed. Ensure the backend is active.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  // Helper to determine score color class
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    return 'score-poor';
  };

  return (
    <div className="li-container animate-fade-in-up">
      {/* Background glow stage */}
      <div className="cyber-stage" aria-hidden="true">
        <div className="neon-orbit"></div>
      </div>

      <section className="li-hero-section">
        <div className="li-hero-badge">
          <Linkedin size={14} /> AI LinkedIn Optimizer
        </div>
        <h1 className="li-title">
          Optimize Your Profile for <br />
          <span className="gradient-word">Recruiter Search</span>
        </h1>
        <p className="li-subtitle">
          Export your LinkedIn profile as a PDF and upload it below. Our AI scans your content for search visibility, headline strength, and hook conversion, giving you customized copy-paste improvements in seconds.
        </p>

        <div className="li-row-layout">
          {/* Left panel: Input Area */}
          <div className="li-input-card glass-card">
            <div className="li-input-header">
              <Terminal size={16} className="text-blue" />
              <span>Upload LinkedIn PDF Profile</span>
            </div>
            
            {selectedFile || (loadedWork && !loadedWork.deleted && loadedWork.type === 'linkedin') ? (
              <div className="li-file-selected-state">
                <div className="li-file-icon-wrapper">
                  <FileText className="li-file-icon" />
                </div>
                <div className="li-file-details">
                  <span className="li-file-name">
                    {selectedFile ? selectedFile.name : (loadedWork && !loadedWork.deleted ? loadedWork.title : 'LinkedIn Profile PDF')}
                  </span>
                  {selectedFile && (
                    <span className="li-file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  )}
                </div>
                <div className="li-file-actions">
                  <button className="btn-secondary" onClick={removeFile}>
                    Remove / Clear
                  </button>
                  {selectedFile && (
                    <button className="btn-primary" onClick={handleAnalyze} disabled={loading}>
                      Analyze Profile <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className={`li-upload-zone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
              >
                <input 
                  ref={fileInputRef}
                  type="file"
                  className="li-file-input-hidden"
                  accept=".pdf"
                  onChange={handleChange}
                  disabled={loading}
                />
                <Upload className="li-upload-icon" />
                <button className="li-upload-cta" type="button">
                  Upload LinkedIn PDF
                </button>
                <div className="li-privacy-note">
                  <Lock size={14} /> Anonymized & secure data parsing
                </div>
                <div className="li-file-limits-info">
                  PDF format up to 5MB
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="error-message-bar animate-fade-in-up" style={{ marginTop: '1rem' }}>
                <AlertCircle className="error-icon" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Right panel: Static recruitment guides or Loading state */}
          <div className="li-guide-card glass-card">
            {loading ? (
              <SkeletonLoader
                card={false}
                type="text"
                title="Analyzing Profile"
                subtitle={loaderSteps[loadingStep]}
                step={loadingStep}
                totalSteps={loaderSteps.length}
              />
            ) : result ? (
              <div className="li-score-summary">
                <div className="li-radial-score-container">
                  <div className={`li-score-ring ${getScoreColor(result.score)}`}>
                    <svg viewBox="0 0 36 36">
                      <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path 
                        className="ring-fill" 
                        strokeDasharray={`${result.score}, 100`} 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      />
                    </svg>
                    <div className="ring-text">{result.score}</div>
                  </div>
                  <div>
                    <h3 className="li-score-evaluation">Optimization Score</h3>
                    <p className="li-score-evaluation-desc">
                      {result.score >= 80 ? 'Excellent! Highly optimized for searches.' : result.score >= 60 ? 'Good potential, but key gaps exist.' : 'Needs immediate improvements.'}
                    </p>
                  </div>
                </div>
                {saveIndicator && (
                  <div className="li-save-badge animate-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(48,209,88,0.1)', color: 'var(--green)', border: '1px solid rgba(48,209,88,0.2)', padding: '0.25rem 0.75rem', borderRadius: '980px', fontSize: '0.78rem', fontWeight: 600, alignSelf: 'flex-start' }}>
                    <ShieldCheck size={12} /> Saved in My Works
                  </div>
                )}
                <div className="li-summary-text">
                  <strong>Recruiter Summary:</strong>
                  <p>{result.summary}</p>
                </div>
              </div>
            ) : (
              <div className="li-help-guide">
                <h3 className="li-guide-title"><Sparkles size={16} className="text-blue" /> Quick Profile Optimization Checklist</h3>
                <div className="li-checklist-item">
                  <CheckCircle2 size={16} className="checklist-icon" />
                  <span><strong>SEO Keywords:</strong> Recruiting algorithms search Headlines and Skills first.</span>
                </div>
                <div className="li-checklist-item">
                  <CheckCircle2 size={16} className="checklist-icon" />
                  <span><strong>Headline:</strong> Never just use your job title. Show your tech stack and impact.</span>
                </div>
                <div className="li-checklist-item">
                  <CheckCircle2 size={16} className="checklist-icon" />
                  <span><strong>First 3 Lines:</strong> The 'About' section mobile view cuts off. Hook readers immediately.</span>
                </div>
                <div className="li-checklist-item">
                  <CheckCircle2 size={16} className="checklist-icon" />
                  <span><strong>STAR Bullets:</strong> Convert responsibility lists into achievements with metrics.</span>
                </div>
                <div className="li-security-badge">
                  <ShieldCheck size={14} /> Anonymized parsing & safe data standards.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Results Section */}
        {result && (
          <div className="li-results-wrapper animate-fade-in-up">
            {/* 1. Headline Suggestions */}
            <div className="li-result-panel glass-card">
              <h2 className="li-panel-title"><Award size={18} className="text-blue" /> Headline Optimizer</h2>
              <div className="li-headline-comparison">
                <div className="li-headline-current">
                  <strong>Current Headline:</strong>
                  <p>{result.headline.current || 'Not found / Generic'}</p>
                </div>
                <div className="li-headline-feedback">
                  <strong>Recruiter Assessment:</strong>
                  <p>{result.headline.feedback}</p>
                </div>
              </div>
              <div className="li-headline-suggestions">
                <strong>Copy-Paste Alternatives:</strong>
                <div className="li-suggestions-grid">
                  {result.headline.suggestions.map((suggestion: string, idx: number) => (
                    <div key={idx} className="li-suggestion-box">
                      <p>{suggestion}</p>
                      <button 
                        className="btn-secondary li-copy-btn" 
                        onClick={() => handleCopy(suggestion, `headline-${idx}`)}
                      >
                        {copiedSection === `headline-${idx}` ? <><Check size={13} className="text-success" /> Copied</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. About / Summary Rewrite */}
            <div className="li-result-panel glass-card">
              <h2 className="li-panel-title"><Star size={18} className="text-purple" /> About (Summary) Rewrite</h2>
              <div className="li-about-feedback">
                <strong>Feedback on current About section:</strong>
                <p>{result.about.feedback}</p>
              </div>
              <div className="li-about-rewrite">
                <div className="li-rewrite-header">
                  <strong>Recommended About Section Content:</strong>
                  <button 
                    className="btn-secondary li-copy-btn" 
                    onClick={() => handleCopy(result.about.improvedText, 'about-rewrite')}
                  >
                    {copiedSection === 'about-rewrite' ? <><Check size={13} className="text-success" /> Copied Text</> : <><Copy size={13} /> Copy About Section</>}
                  </button>
                </div>
                <pre className="li-pre-text">{result.about.improvedText}</pre>
              </div>
            </div>

            {/* 3. Skills Matrix & Keywords */}
            <div className="li-skills-grid-row">
              {/* Matched Keywords */}
              <div className="li-skills-card glass-card">
                <h3 className="li-skills-title"><CheckCircle2 size={16} className="text-success" /> Matched Skills & SEO Keywords</h3>
                <div className="li-skills-list">
                  {result.skillsAndKeywords.matched && result.skillsAndKeywords.matched.length > 0 ? (
                    result.skillsAndKeywords.matched.map((skill: string, i: number) => (
                      <span key={i} className="skill-badge-green">{skill}</span>
                    ))
                  ) : (
                    <span className="li-none-text">No matching technical skills identified.</span>
                  )}
                </div>
              </div>

              {/* Missing Keywords */}
              <div className="li-skills-card glass-card">
                <h3 className="li-skills-title"><AlertCircle size={16} className="text-yellow" /> Recommended Missing Keywords</h3>
                <div className="li-skills-list">
                  {result.skillsAndKeywords.missing && result.skillsAndKeywords.missing.length > 0 ? (
                    result.skillsAndKeywords.missing.map((skill: string, i: number) => (
                      <span key={i} className="skill-badge-yellow">{skill}</span>
                    ))
                  ) : (
                    <span className="li-none-text">None missing! Excellent keywords keyword density.</span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Experience & General Profile Audit */}
            <div className="li-double-row-panels">
              {/* Experience Audit */}
              <div className="li-panel-half glass-card">
                <h3 className="li-panel-sub-title"><FileText size={16} className="text-blue" /> Work Experience Audit</h3>
                <p className="li-audit-desc">{result.experience.feedback}</p>
                <div className="li-tips-list">
                  <strong>Quantified Achievement Tips:</strong>
                  {result.experience.tips.map((tip: string, idx: number) => (
                    <div key={idx} className="li-tip-item">
                      <ChevronRight size={14} className="text-blue flex-shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Branding Tips */}
              <div className="li-panel-half glass-card">
                <h3 className="li-panel-sub-title"><Compass size={16} className="text-blue" /> Profile Branding & Networking Tips</h3>
                <div className="li-tips-list" style={{ marginTop: '0.5rem' }}>
                  {result.generalTips.map((tip: string, idx: number) => (
                    <div key={idx} className="li-tip-item">
                      <ChevronRight size={14} className="text-purple flex-shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </section>
    </div>
  );
}

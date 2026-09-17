import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, FileText, Upload, Lock, ShieldAlert, ArrowRight,
  ChevronDown, ChevronUp, Copy, Check, CheckCircle2,
  Building2, HelpCircle, Lightbulb, RefreshCw, FileDown,
  Briefcase, Cpu, Loader2, AlertCircle, Link
} from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import './Prep.css';
import { authFetch } from '../lib/authFetch';

interface PrepQuestion {
  category: string;
  companySource: string;
  question: string;
  answer: string;
  tip: string;
}

interface PrepProps {
  customApiKey: string;
  resumeText: string;
  setResumeText: (text: string) => void;
  setCurrentPage: (page: string) => void;
  loadedWork: any;
  setLoadedWork: (work: any) => void;
}

export default function Prep({ customApiKey, resumeText, setResumeText, setCurrentPage, loadedWork, setLoadedWork }: PrepProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [prepResumeUrl, setPrepResumeUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [questions, setQuestions] = useState<PrepQuestion[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [evaluations, setEvaluations] = useState<Record<number, any>>({});
  const [evaluatingIndex, setEvaluatingIndex] = useState<number | null>(null);
  const [savingPrep, setSavingPrep] = useState(false);

  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from database if loadedWork is present
  useEffect(() => {
    if (loadedWork) {
      if (loadedWork.deleted) {
        setQuestions([]);
        setUserAnswers({});
        setEvaluations({});
        if (setLoadedWork) {
          setLoadedWork(null);
        }
        return;
      }
      if (loadedWork.type === 'prep') {
        try {
          const payload = JSON.parse(loadedWork.htmlContent);
          if (payload.questions) {
            setQuestions(payload.questions);
            if (payload.resumeText) setResumeText(payload.resumeText);
            if (payload.userAnswers) setUserAnswers(payload.userAnswers);
            if (payload.evaluations) setEvaluations(payload.evaluations);
            setExpandedIndex(0);
          }
        } catch (err) {
          console.error('Failed to parse loaded prep session:', err);
        }
      }
    }
  }, [loadedWork, setLoadedWork, setResumeText]);

  const handleEvaluateAnswer = async (idx: number) => {
    const answer = userAnswers[idx];
    if (!answer || !answer.trim()) {
      alert('Please type your answer first before evaluating.');
      return;
    }

    setEvaluatingIndex(idx);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) {
        headers['x-gemini-key'] = customApiKey;
      }

      const response = await fetch(`${baseUrl}/api/prep/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: questions[idx].question,
          userAnswer: answer,
          resumeText
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to evaluate answer');
      }

      if (resData.success && resData.data) {
        const nextEvaluations = {
          ...evaluations,
          [idx]: resData.data
        };
        setEvaluations(nextEvaluations);
        await autoSavePrepSession(questions, userAnswers, nextEvaluations);
      }
    } catch (err: any) {
      alert(err.message || 'Evaluation failed. Make sure the backend server is running.');
    } finally {
      setEvaluatingIndex(null);
    }
  };

  const autoSavePrepSession = async (
    currentQuestions = questions,
    currentAnswers = userAnswers,
    currentEvaluations = evaluations,
    currentWorkId = loadedWork?.id || loadedWork?._id
  ) => {
    if (currentQuestions.length === 0) return;
    const userStr = localStorage.getItem('cvmind_user');
    if (!userStr) return;

    const getUserId = () => {
      try {
        const user = JSON.parse(userStr);
        return user.id || user._id || '';
      } catch {
        return '';
      }
    };
    const userId = getUserId();
    if (!userId) return;

    setSavingPrep(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const payload = {
        resumeText,
        questions: currentQuestions,
        userAnswers: currentAnswers,
        evaluations: currentEvaluations
      };

      const response = await authFetch(`${baseUrl}/api/user/work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: `Interview Prep - ${currentQuestions[0]?.question?.slice(0, 25) || 'Session'}...`,
          type: 'prep',
          templateId: 'interview-prep',
          htmlContent: JSON.stringify(payload),
          workId: currentWorkId || undefined
        })
      });

      const data = await response.json();
      if (response.ok && data.data) {
        if (setLoadedWork) {
          setLoadedWork(data.data);
        }
      }
    } catch (err) {
      console.error('Auto-save prep failed:', err);
    } finally {
      setSavingPrep(false);
    }
  };

  // Debounced effect for auto-saving when userAnswers change
  useEffect(() => {
    if (questions.length === 0) return;

    const userStr = localStorage.getItem('cvmind_user');
    if (!userStr) return;

    const timer = setTimeout(() => {
      autoSavePrepSession(questions, userAnswers, evaluations);
    }, 2000);

    return () => clearTimeout(timer);
  }, [userAnswers]);

  const loaderSteps = [
    'Scanning CV professional history...',
    'Identifying domain experience indicators...',
    'Extracting technical stacks & soft skills...',
    'Simulating corporate interviewer questions...',
    'Sourcing Big Tech & Big 4 HR interview models...',
    'Formulating STAR structured responses...',
    'Assembling executive coaching guidelines...'
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

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateQuestions = async (useCached = false) => {
    if (!selectedFile && !prepResumeUrl && (!useCached || !resumeText)) return;

    setLoading(true);
    setLoadingStep(0);
    setErrorMsg(null);
    setQuestions([]);
    setExpandedIndex(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < loaderSteps.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = {};
      if (customApiKey) {
        headers['x-gemini-key'] = customApiKey;
      }

      let response;
      if (useCached && resumeText) {
        headers['Content-Type'] = 'application/json';
        response = await fetch(`${baseUrl}/api/prep`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            resumeText,
            fileName: 'Cached CV Context',
            fileSize: resumeText.length
          })
        });
      } else if (selectedFile) {
        const formData = new FormData();
        formData.append('resume', selectedFile);
        response = await fetch(`${baseUrl}/api/prep`, {
          method: 'POST',
          headers,
          body: formData
        });
      } else if (prepResumeUrl) {
        const formData = new FormData();
        formData.append('resumeUrl', prepResumeUrl.trim());
        response = await fetch(`${baseUrl}/api/prep`, {
          method: 'POST',
          headers,
          body: formData
        });
      } else {
        throw new Error('No resume source selected.');
      }

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Server error during questions generation');
      }

      if (resData.success && resData.data && resData.data.questions) {
        setQuestions(resData.data.questions);
        if (resData.resumeText) {
          setResumeText(resData.resumeText);
        }
        await autoSavePrepSession(resData.data.questions, {}, {});
      } else {
        throw new Error('Failed to generate interview questions. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Connection failed. Make sure the backend server is running.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleCopyAll = () => {
    const formatted = questions.map((q, i) => 
      `Question ${i + 1} [Source: ${q.companySource} | Category: ${q.category}]\nQuestion: ${q.question}\n\nModel Answer:\n${q.answer}\n\nRecruiter Insider Tip:\n${q.tip}\n\n${'-'.repeat(50)}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  };

  const downloadPrepPDF = () => {
    window.print();
  };

  const categories = ['All', ...Array.from(new Set(questions.map(q => q.category)))];
  const filteredQuestions = activeFilter === 'All' 
    ? questions 
    : questions.filter(q => q.category === activeFilter);

  return (
    <div className="prep-container animate-fade-in-up">
      {/* Background radial glow nodes */}
      <div className="glow-ambient" style={{ top: '10%', left: '10%' }}></div>
      <div className="glow-ambient" style={{ bottom: '20%', right: '10%' }}></div>

      {/* Header */}
      <div className="prep-header no-print">
        <div className="prep-title-section">
          <div className="prep-badge">
            <Sparkles size={13} className="animate-pulse" /> Sourced from HR Leaders
          </div>
          <h1 className="prep-title-text">SmartPrep AI</h1>
          <p className="prep-subtitle-text">
            Simulate realistic corporate interviews. Scan your resume to generate customized questions, STAR framework answers, and recruiter insider tips.
          </p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => setCurrentPage('home')}>
            Back to Home
          </button>
          {questions.length > 0 && (
            <button className="btn-secondary" onClick={() => setQuestions([])}>
              <RefreshCw size={14} /> Scan Another Resume
            </button>
          )}
        </div>
      </div>

      {/* Main Console Grid */}
      <div className="prep-workspace">
        
        {/* Upload and Context Zone (Displays when questions are empty and not loading) */}
        {!loading && questions.length === 0 && (
          <div className="prep-upload-card glass-card">
            <div className="prep-upload-info">
              <Cpu className="prep-upload-cpu-icon" />
              <h3>Choose Resume Source</h3>
              <p>Select whether to leverage your previously analyzed resume or upload a new CV to generate specialized interview questions.</p>
            </div>

            {/* Quick Context Action */}
            {resumeText && (
              <div className="cached-resume-strip glass-card">
                <div className="cached-resume-details">
                  <CheckCircle2 className="text-success" size={20} />
                  <div>
                    <strong>Active CV Session Detected</strong>
                    <p>Use your already uploaded resume context to generate prep questions instantly.</p>
                  </div>
                </div>
                <button className="btn-primary" onClick={() => generateQuestions(true)}>
                  Analyze Active CV <ArrowRight size={15} />
                </button>
              </div>
            )}

            {/* Upload Zone */}
            <div className="prep-drop-zone">
              <div className="divider-or"><span>OR UPLOAD NEW CV</span></div>

              {/* Mode toggle */}
              <div className="upload-mode-toggle">
                <button
                  className={`upload-mode-btn${uploadMode === 'file' ? ' active' : ''}`}
                  onClick={() => { setUploadMode('file'); setErrorMsg(null); }}
                >
                  <Upload size={14} /> Upload File
                </button>
                <button
                  className={`upload-mode-btn${uploadMode === 'link' ? ' active' : ''}`}
                  onClick={() => { setUploadMode('link'); setErrorMsg(null); }}
                >
                  <Link size={14} /> Paste Link
                </button>
              </div>

              {uploadMode === 'file' ? (
                <div
                  className={`prep-upload-area ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="file-input-hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={handleChange}
                  />
                  {selectedFile ? (
                    <div className="file-selected-state">
                      <div className="file-icon-wrapper"><FileText className="file-icon" /></div>
                      <div className="file-details">
                        <span className="file-name">{selectedFile.name}</span>
                        <span className="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <div className="file-actions">
                        <button className="btn-secondary" onClick={removeFile}>Remove</button>
                        <button className="btn-primary" onClick={() => generateQuestions(false)}>
                          Scan & Prep <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-prompt-state" onClick={triggerUpload}>
                      <Upload className="upload-icon" />
                      <button className="upload-cta" type="button">Upload Resume Document</button>
                      <div className="privacy-note"><Lock size={13} /> Secure local sandboxed evaluation</div>
                      <div className="file-limits-info">PDF, DOCX, or TXT up to 5MB</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="prep-upload-area link-input-zone" style={{ cursor: 'default', minHeight: '160px' }}>
                  <div className="link-input-state">
                    <Link size={26} className="link-input-icon" />
                    <p className="link-input-label">Paste a shareable link to your resume</p>
                    <input
                      type="url"
                      className="resume-link-input"
                      placeholder="https://drive.google.com/... or any direct PDF/DOCX link"
                      value={prepResumeUrl}
                      onChange={(e) => setPrepResumeUrl(e.target.value)}
                    />
                    <p className="link-input-hint">Supports Google Drive, Dropbox, OneDrive, or any direct link</p>
                    <button
                      className="btn-primary"
                      onClick={() => generateQuestions(false)}
                      disabled={!prepResumeUrl.trim()}
                    >
                      Scan & Prep <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="error-message-bar">
                  <ShieldAlert className="error-icon" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <SkeletonLoader
            type="list"
            title="Generating Tailored Questions"
            subtitle={loaderSteps[loadingStep]}
            step={loadingStep}
            totalSteps={loaderSteps.length}
          />
        )}

        {/* Results Panel */}
        {!loading && questions.length > 0 && (
          <div className="prep-results-area">
            
            {/* Toolbar */}
            <div className="prep-results-toolbar glass-card no-print">
              <div className="toolbar-left">
                <span className="results-count">Generated {questions.length} Interview Scorecards</span>
                
                {/* Category Badges Filter */}
                <div className="category-filters">
                  {categories.map(cat => (
                    <button 
                      key={cat} 
                      className={`filter-badge ${activeFilter === cat ? 'active' : ''}`}
                      onClick={() => {
                        setActiveFilter(cat);
                        setExpandedIndex(null);
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="toolbar-right" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn-secondary btn-sm" onClick={handleCopyAll}>
                  {copiedAll ? <><Check size={14} className="text-success" /> Copied Scorecard!</> : <><Copy size={14} /> Copy All</>}
                </button>
                <button className="btn-primary btn-sm" onClick={downloadPrepPDF}>
                  <FileDown size={14} /> Download PDF
                </button>
                {localStorage.getItem('cvmind_user') ? (
                  <div className="prep-autosave-status" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    {savingPrep ? (
                      <><Loader2 size={12} className="cl-spin text-blue" /> Saving...</>
                    ) : (
                      <><Check size={12} className="text-success" /> Saved automatically</>
                    )}
                  </div>
                ) : (
                  <div className="prep-autosave-status" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-warning)', padding: '0.35rem 0.75rem', background: 'rgba(251,146,60,0.05)', borderRadius: '6px', border: '1px solid rgba(251,146,60,0.2)' }}>
                    <AlertCircle size={12} /> Sign in to save
                  </div>
                )}
              </div>
            </div>

            {/* Accordion Questions List */}
            <div className="prep-questions-list">
              {filteredQuestions.length === 0 ? (
                <div className="glass-card empty-results-state">
                  <HelpCircle size={40} className="text-muted" />
                  <h4>No questions match the active filter.</h4>
                </div>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const isExpanded = expandedIndex === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`prep-question-card glass-card ${isExpanded ? 'expanded' : ''}`}
                    >
                      {/* Accordion Header */}
                      <header 
                        className="question-card-header" 
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      >
                        <div className="question-header-info">
                          <div className="question-badges-row">
                            <span className="badge badge-primary">
                              <Building2 size={11} /> {q.companySource} Style
                            </span>
                            <span className="badge badge-success">
                              <Briefcase size={11} /> {q.category}
                            </span>
                          </div>
                          <h3 className="question-heading">
                            {idx + 1}. {q.question}
                          </h3>
                        </div>
                        <button className="accordion-toggle-btn" title={isExpanded ? 'Collapse' : 'Expand'}>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </header>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="question-card-body">
                          
                          {/* Model Answer Section */}
                          <div className="body-section model-answer-section">
                            <div className="section-header-row">
                              <h4 className="section-title">
                                <CheckCircle2 size={15} className="text-success" /> Professional Model Answer (STAR)
                              </h4>
                              <button 
                                className="copy-btn" 
                                onClick={() => handleCopy(q.answer, idx)}
                                title="Copy answer to clipboard"
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <Check size={12} className="text-success" /> Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} /> Copy Answer
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="answer-text-box">
                              {q.answer}
                            </div>
                          </div>

                          {/* Recruiter Insider Tip Section */}
                          <div className="body-section recruiter-tip-section">
                            <h4 className="section-title">
                              <Lightbulb size={15} className="text-warning" /> Recruiter Insights & Insider Strategies
                            </h4>
                            <p className="tip-text-box">
                              {q.tip}
                            </p>
                          </div>

                          {/* Mock Practice Answer Input */}
                          <div className="body-section mock-practice-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                            <h4 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--blue)' }}>
                              <Cpu size={15} /> Practice Your Answer
                            </h4>
                            <div className="practice-box-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                              <textarea
                                className="practice-answer-input"
                                style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', border: '1px solid var(--border)', resize: 'vertical', fontSize: '0.85rem', outline: 'none' }}
                                placeholder="Type your personal mock answer here... try to use the STAR method."
                                value={userAnswers[idx] || ''}
                                onChange={(e) => setUserAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                                onBlur={() => autoSavePrepSession(questions, userAnswers, evaluations)}
                              />
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button 
                                  className="btn-primary btn-sm" 
                                  onClick={() => handleEvaluateAnswer(idx)}
                                  disabled={evaluatingIndex === idx}
                                >
                                  {evaluatingIndex === idx ? 'Analyzing Answer...' : 'AI Evaluation & Score'}
                                </button>
                                </div>
                              </div>

                              {/* Evaluation results */}
                              {evaluations[idx] && (
                                <div className="evaluation-box glass-card animate-fade-in" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <h5 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: 700 }}>AI Assessment</h5>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', background: 'var(--color-primary-dim)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                      Score: {evaluations[idx].score}/10
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <p style={{ margin: 0 }}><strong>Strengths:</strong> {evaluations[idx].strengths}</p>
                                    <p style={{ margin: 0 }}><strong>To Improve:</strong> {evaluations[idx].improvements}</p>
                                    <div style={{ margin: '0.5rem 0 0', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--color-emerald)', borderRadius: '0 4px 4px 0' }}>
                                      <strong>Refined Answer:</strong>
                                      <p style={{ margin: '0.2rem 0 0', fontStyle: 'italic' }}>"{evaluations[idx].refinedAnswer}"</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </div>

      {/* Printable PDF Template */}
      <div className="print-scorecard-document">
        <div className="print-header">
          <h1 className="print-title">CVMIND AI - SMARTPREP SCORECARD</h1>
          <p className="print-meta">
            Generated on: {new Date().toLocaleDateString()} | Resume Source: {selectedFile ? selectedFile.name : 'Active Session CV'}
          </p>
        </div>
        
        <div className="print-questions-list">
          {questions.map((q, idx) => (
            <div key={idx} className="print-question-item">
              <div className="print-question-header">
                <h3>{idx + 1}. {q.question}</h3>
                <div className="print-question-meta">
                  <span><strong>Company Style:</strong> {q.companySource} Style</span>
                  <span><strong>Category:</strong> {q.category}</span>
                </div>
              </div>
              <div className="print-question-body">
                <div className="print-answer-block">
                  <strong>Professional Model Answer (STAR Method):</strong>
                  <p>{q.answer}</p>
                </div>
                <div className="print-tip-block">
                  <strong>Recruiter Insider Tip:</strong>
                  <p>{q.tip}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

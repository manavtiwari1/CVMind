import { useState } from 'react';
import { authFetch } from '../lib/authFetch';
import {
  Award, FileText, CheckCircle2, AlertTriangle, FileSearch,
  RotateCcw, Printer, ArrowRight, Target, Check, AlertCircle, Copy,
  Sparkles, Download, Zap
} from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import { downloadResumeAsDocx, downloadResumeAsPdf, downloadResumeAsTxt } from '../utils/generateResumeDocx';
import { getErrorMessage } from '../utils/errors';
import './Dashboard.css';

interface Suggestions {
  original: string;
  improved: string;
}

interface AnalysisData {
  fileName?: string;
  score: number;
  summary: string;
  atsKeywords: {
    score: number;
    matched: string[];
    missing: string[];
    feedback: string;
  };
  contentAndImpact: {
    score: number;
    feedback: string;
    suggestions: Suggestions[];
  };
  formattingAndStyle: {
    score: number;
    feedback: string;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface DashboardProps {
  setCurrentPage: (page: string) => void;
  analysisResult: AnalysisData | null;
  resumeText: string;
  resetAnalysis: () => void;
  customApiKey: string;
}

export default function Dashboard({ setCurrentPage, analysisResult, resumeText, resetAnalysis, customApiKey }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'keywords' | 'rewrites' | 'formatting' | 'optimize'>('summary');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResume, setOptimizedResume] = useState<string>('');
  const [optimizeError, setOptimizeError] = useState<string>('');
  const [optimizeCopied, setOptimizeCopied] = useState(false);

  // Return to uploader if no results yet
  if (!analysisResult) {
    return (
      <div className="dashboard-empty-state glass-card animate-fade-in-up">
        <FileSearch size={48} className="empty-icon" />
        <h3>No resume checked yet</h3>
        <p>Upload your resume on the home page to get your ATS score and a full feedback report.</p>
        <button className="btn-primary" onClick={() => setCurrentPage('home')}>
          Check my resume
        </button>
      </div>
    );
  }

  const {
    score,
    summary,
    atsKeywords,
    contentAndImpact,
    formattingAndStyle,
    strengths,
    weaknesses,
    recommendations
  } = analysisResult;

  // Determine score color classes
  const getScoreColorClass = (val: number) => {
    if (val >= 80) return 'score-success';
    if (val >= 60) return 'score-warning';
    return 'score-danger';
  };

  const getScoreText = (val: number) => {
    if (val >= 80) return 'Excellent';
    if (val >= 60) return 'Good Effort';
    return 'Needs Attention';
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 1500);
  };

  const handleOptimize = async () => {
    if (!resumeText || optimizing) return;
    setOptimizing(true);
    setOptimizeError('');
    setOptimizedResume('');
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await authFetch(`${baseUrl}/api/optimize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          resumeText, 
          analysisResult,
          fileName: analysisResult.fileName || 'Unknown Resume'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Optimization failed.');
      setOptimizedResume(data.data.optimizedResume);
    } catch (err) {
      setOptimizeError(getErrorMessage(err) || 'Something went wrong.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleCopyOptimized = () => {
    navigator.clipboard.writeText(optimizedResume);
    setOptimizeCopied(true);
    setTimeout(() => setOptimizeCopied(false), 1800);
  };

  const handleDownload = () => {
    const originalName = analysisResult?.fileName || 'optimized_resume.docx';
    const ext = originalName.split('.').pop()?.toLowerCase() || 'docx';
    const baseName = originalName.replace(/\.[^/.]+$/, "");

    if (ext === 'pdf') {
      downloadResumeAsPdf(optimizedResume, `${baseName}_optimized.pdf`);
    } else if (ext === 'txt') {
      downloadResumeAsTxt(optimizedResume, `${baseName}_optimized.txt`);
    } else {
      downloadResumeAsDocx(optimizedResume, `${baseName}_optimized.docx`);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  // Circular progress calculation
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="dashboard-container animate-fade-in-up">
      {/* Background glow node */}
      <div className="glow-ambient" style={{ top: '15%', right: '15%' }}></div>
      
      {/* Header Actions */}
      <div className="dashboard-header no-print">
        <div>
          <h1 className="dashboard-title-text">Resume Analysis</h1>
          <p className="dashboard-subtitle">A comprehensive breakdown of your document health.</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn-secondary" onClick={resetAnalysis}>
            <RotateCcw size={16} /> Re-scan Resume
          </button>
          <button className="btn-primary" onClick={triggerPrint}>
            <Printer size={16} /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Overview Card */}
      <section className="overview-row">
        {/* Animated Circular Score widget */}
        <div className={`score-radial-card glass-card ${getScoreColorClass(score)}`}>
          <div className="radial-wrapper">
            <svg height={radius * 2} width={radius * 2} className="radial-svg">
              <circle
                stroke="var(--border)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke="currentColor"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="radial-bar"
              />
            </svg>
            <div className="radial-content">
              <span className="score-number-display">{score}</span>
              <span className="score-total">/100</span>
            </div>
          </div>
          <div className="radial-label-group">
            <h3 className="radial-grade-label">{getScoreText(score)}</h3>
            <p className="radial-desc">Overall Quality Rating</p>
          </div>
        </div>

        {/* Professional Summary Paragraph */}
        <div className="summary-block glass-card">
          <div className="summary-header">
            <FileText className="summary-icon text-primary" size={20} />
            <h3 className="summary-title">Executive Summary</h3>
          </div>
          <p className="summary-content">{summary}</p>
        </div>
      </section>

      {/* Tabs Selector */}
      <div className="tabs-bar no-print">
        <button 
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <Award size={16} /> Executive Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'keywords' ? 'active' : ''}`}
          onClick={() => setActiveTab('keywords')}
        >
          <Target size={16} /> ATS Keywords ({atsKeywords.matched.length + atsKeywords.missing.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'rewrites' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewrites')}
        >
          <CheckCircle2 size={16} /> Experience Bullet Rewriter
        </button>
        <button 
          className={`tab-btn ${activeTab === 'formatting' ? 'active' : ''}`}
          onClick={() => setActiveTab('formatting')}
        >
          <FileText size={16} /> Formatting & Layout
        </button>
        <button 
          className={`tab-btn tab-btn-optimize ${activeTab === 'optimize' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimize')}
        >
          <Sparkles size={16} /> AI Auto-Fix Resume
        </button>
      </div>

      {/* PRINT VIEW EXCLUSIVE SECTION (Always visible during print) */}
      <div className="print-exclusive-header">
        <div className="print-title-row">
          <h2>CV Mind Resume Audit Report</h2>
          <div className="print-score-pill">Score: {score}/100</div>
        </div>
        <p className="print-summary">{summary}</p>
      </div>

      {/* Tabs Content */}
      <div className="tabs-content-area">
        
        {/* Tab 1: Executive Overview */}
        {(activeTab === 'summary' || window.matchMedia('print').matches) && (
          <div className={`tab-pane ${activeTab !== 'summary' ? 'print-only' : ''}`}>
            
            {/* Strengths & Weaknesses Grid */}
            <div className="responsive-grid sw-grid">
              <div className="sw-card glass-card strength-border">
                <h4 className="sw-card-title text-success">
                  <CheckCircle2 size={18} /> Top Strengths
                </h4>
                <ul className="sw-list">
                  {strengths.map((str, i) => (
                    <li key={i} className="sw-list-item">
                      <span className="bullet-dot bg-success"></span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="sw-card glass-card weakness-border">
                <h4 className="sw-card-title text-danger">
                  <AlertCircle size={18} /> Major Gaps
                </h4>
                <ul className="sw-list">
                  {weaknesses.map((weak, i) => (
                    <li key={i} className="sw-list-item">
                      <span className="bullet-dot bg-danger"></span>
                      <span>{weak}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Prioritized Recommendations */}
            <div className="recommendations-block glass-card">
              <h4 className="rec-block-title">
                <Target size={18} className="text-primary" /> Prioritized Action Items
              </h4>
              <div className="rec-timeline">
                {recommendations.map((rec, i) => (
                  <div key={i} className="rec-timeline-item">
                    <div className="rec-number-badge">{i + 1}</div>
                    <div className="rec-content">{rec}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: ATS Keywords */}
        {(activeTab === 'keywords' || window.matchMedia('print').matches) && (
          <div className={`tab-pane ${activeTab !== 'keywords' ? 'print-only' : ''}`}>
            <div className="keywords-panel glass-card">
              <div className="panel-header-row">
                <h4 className="panel-title">ATS Optimization Index</h4>
                <div className={`tab-score-badge badge ${getScoreColorClass(atsKeywords.score)}`}>
                  ATS Score: {atsKeywords.score}/100
                </div>
              </div>
              
              <p className="panel-desc">{atsKeywords.feedback}</p>

              <div className="keyword-badges-container">
                <div className="keyword-column">
                  <h5 className="kw-heading-success">Matched Keywords ({atsKeywords.matched.length})</h5>
                  {atsKeywords.matched.length > 0 ? (
                    <div className="badge-grid">
                      {atsKeywords.matched.map((kw, i) => (
                        <span key={i} className="badge badge-success">{kw}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="no-badge-info">No major matched industry keywords detected.</p>
                  )}
                </div>

                <div className="keyword-column">
                  <h5 className="kw-heading-danger">Recommended Missing Keywords ({atsKeywords.missing.length})</h5>
                  {atsKeywords.missing.length > 0 ? (
                    <div className="badge-grid">
                      {atsKeywords.missing.map((kw, i) => (
                        <span key={i} className="badge badge-danger">{kw}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="no-badge-info">Amazing! No major missing keywords identified.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Bullet Rewriter */}
        {(activeTab === 'rewrites' || window.matchMedia('print').matches) && (
          <div className={`tab-pane ${activeTab !== 'rewrites' ? 'print-only' : ''}`}>
            <div className="rewrites-panel glass-card">
              <div className="panel-header-row">
                <h4 className="panel-title">Experience Impact Analyzer</h4>
                <div className={`tab-score-badge badge ${getScoreColorClass(contentAndImpact.score)}`}>
                  Impact Rating: {contentAndImpact.score}/100
                </div>
              </div>

              <p className="panel-desc">{contentAndImpact.feedback}</p>

              <div className="rewrites-table-wrapper">
                {contentAndImpact.suggestions.length > 0 ? (
                  <div className="rewrites-list">
                    {contentAndImpact.suggestions.map((sug, i) => (
                      <div key={i} className="rewrite-row">
                        <div className="rewrite-block original-block">
                          <span className="block-label text-danger">Original bullet (Passive / Weak)</span>
                          <p className="block-content">"{sug.original}"</p>
                        </div>
                        <div className="rewrite-arrow-cell no-print">
                          <ArrowRight size={20} />
                        </div>
                        <div className="rewrite-block improved-block">
                          <div className="improved-header-row">
                            <span className="block-label text-success">AI Improved (Result-driven / Quantified)</span>
                            <button 
                              className="copy-btn no-print" 
                              onClick={() => handleCopy(sug.improved, i)}
                              title="Copy improved text"
                            >
                              {copiedIndex === i ? (
                                <>
                                  <Check size={14} className="text-success" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={14} /> Copy
                                </>
                              )}
                            </button>
                          </div>
                          <p className="block-content">"{sug.improved}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-rewrites-box">
                    <p>No passive bullet rewrites suggested. Your experience section is already formatted strongly with action verbs and metrics!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Formatting */}
        {(activeTab === 'formatting' || window.matchMedia('print').matches) && (
          <div className={`tab-pane ${activeTab !== 'formatting' ? 'print-only' : ''}`}>
            <div className="formatting-panel glass-card">
              <div className="panel-header-row">
                <h4 className="panel-title">Visual Layout Audits</h4>
                <div className={`tab-score-badge badge ${getScoreColorClass(formattingAndStyle.score)}`}>
                  Layout Score: {formattingAndStyle.score}/100
                </div>
              </div>

              <p className="formatting-feedback-content">{formattingAndStyle.feedback}</p>
            </div>
          </div>
        )}

        {/* Tab 5: AI Auto-Fix Resume */}
        {activeTab === 'optimize' && (
          <div className="tab-pane">
            <div className="optimize-panel glass-card">

              {/* Header */}
              <div className="optimize-header">
                <div className="optimize-title-row">
                  <Sparkles size={22} className="optimize-icon" />
                  <h4 className="panel-title">AI Auto-Fix Resume</h4>
                </div>
                <p className="optimize-subtitle">
                  Our AI will rewrite your entire resume — injecting missing ATS keywords, strengthening every bullet point with action verbs and metrics, and restructuring sections for maximum recruiter impact.
                </p>

                {/* Keyword badges to be injected */}
                {atsKeywords.missing.length > 0 && (
                  <div className="optimize-keywords-preview">
                    <span className="optimize-kw-label">Keywords to inject:</span>
                    <div className="badge-grid">
                      {atsKeywords.missing.slice(0, 8).map((kw, i) => (
                        <span key={i} className="badge badge-danger">{kw}</span>
                      ))}
                      {atsKeywords.missing.length > 8 && (
                        <span className="badge badge-primary">+{atsKeywords.missing.length - 8} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CTA / Loading / Result */}
              {!optimizedResume && !optimizing && (
                <div className="optimize-cta-area">
                  {optimizeError && (
                    <div className="optimize-error">
                      <AlertTriangle size={16} /> {optimizeError}
                    </div>
                  )}
                  {!resumeText && (
                    <p className="optimize-no-text">Resume text unavailable. Please re-upload your resume to use this feature.</p>
                  )}
                  <button
                    className="btn-optimize"
                    onClick={handleOptimize}
                    disabled={!resumeText}
                    id="optimize-generate-btn"
                  >
                    <Zap size={18} />
                    Generate AI-Optimized Resume
                  </button>
                </div>
              )}

              {optimizing && (
                <SkeletonLoader
                  type="sidebar"
                  title="AI is rewriting your resume..."
                  subtitle="Injecting keywords · Strengthening bullets · Restructuring sections..."
                  card={false}
                />
              )}

              {optimizedResume && (
                <div className="optimize-result-area">
                  <div className="optimize-result-header">
                    <div className="optimize-result-badge">
                      <Check size={14} /> ATS-Optimized Resume Ready
                    </div>
                    <div className="optimize-result-actions">
                      <button
                        className="copy-btn"
                        onClick={handleCopyOptimized}
                        id="optimize-copy-btn"
                      >
                        {optimizeCopied ? <><Check size={14} className="text-success" /> Copied!</> : <><Copy size={14} /> Copy All</>}
                      </button>
                      <button
                        className="btn-download"
                        onClick={handleDownload}
                        id="optimize-download-btn"
                      >
                        <Download size={14} /> {(() => {
                          const ext = (analysisResult?.fileName || '').split('.').pop()?.toLowerCase();
                          if (ext === 'pdf') return 'Download .pdf';
                          if (ext === 'txt') return 'Download .txt';
                          return 'Download .docx';
                        })()}
                      </button>
                    </div>
                  </div>
                  <pre className="optimized-resume-output">{optimizedResume}</pre>
                  <button
                    className="optimize-regenerate-btn"
                    onClick={handleOptimize}
                  >
                    <RotateCcw size={14} /> Regenerate
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

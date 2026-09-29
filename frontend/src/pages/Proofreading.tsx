import { useState, useRef } from 'react';
import {
  CheckCircle2, Copy, Check, ArrowRight, RefreshCw, FileText,
  AlertCircle, Zap, MessageSquare, BookOpen, Target, Upload, X, Link
} from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import { getErrorMessage } from '../utils/errors';
import './Proofreading.css';

const INDUSTRIES = [
  'General', 'Technology', 'Finance', 'Healthcare', 'Marketing',
  'Engineering', 'Education', 'Legal', 'Sales', 'Design'
];

const CHANGE_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  grammar:       { label: 'Grammar',      color: '#2997ff', bg: 'rgba(41,151,255,0.10)' },
  punctuation:   { label: 'Punctuation',  color: '#2997ff', bg: 'rgba(41,151,255,0.10)' },
  spelling:      { label: 'Spelling',     color: '#f43f5e', bg: 'rgba(244,63,94,0.10)' },
  passive_voice: { label: 'Active Voice', color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  weak_verb:     { label: 'Power Verb',   color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  tone:          { label: 'Tone',         color: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
  clarity:       { label: 'Clarity',      color: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
};

function getChangeMeta(type: string) {
  return CHANGE_TYPE_META[type] || { label: type, color: 'var(--text-secondary)', bg: 'var(--bg-secondary)' };
}

// /api/ai/proofread (schema in backend/src/services/gemini.js)
interface ProofreadChange {
  type: string;
  original: string;
  corrected: string;
  explanation: string;
}

interface ProofreadResult {
  correctedText: string;
  score: number;
  summary: string;
  changes: ProofreadChange[];
  stats: {
    grammarFixes: number;
    spellingFixes: number;
    passiveToActive: number;
    verbUpgrades: number;
    toneAlignments: number;
  };
}

interface ProofreadingProps {
  customApiKey: string;
}

export default function Proofreading({ customApiKey }: ProofreadingProps) {
  const [inputMode, setInputMode] = useState<'text' | 'file' | 'link'>('text');
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [industry, setIndustry] = useState('General');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProofreadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = (() => {
    try { const u = JSON.parse(localStorage.getItem('cvmind_user') || '{}'); return u.id || u._id || ''; } catch { return ''; }
  })();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
      setErrorMsg('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File too large. Please upload a file under 5MB.');
      return;
    }
    setSelectedFile(file);
    setErrorMsg(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleProofread = async () => {
    if (inputMode === 'text' && !inputText.trim()) {
      setErrorMsg('Please paste some text to proofread.');
      return;
    }
    if (inputMode === 'text' && inputText.trim().length < 20) {
      setErrorMsg('Please provide at least 20 characters of text.');
      return;
    }
    if (inputMode === 'file' && !selectedFile) {
      setErrorMsg('Please upload a resume file to proofread.');
      return;
    }
    if (inputMode === 'link' && !resumeUrl.trim()) {
      setErrorMsg('Please paste a link to your resume.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

      const headers: Record<string, string> = {};
      if (customApiKey) headers['x-gemini-key'] = customApiKey;

      let body: FormData | string;

      if (inputMode === 'file' && selectedFile) {
        const fd = new FormData();
        fd.append('resume', selectedFile);
        fd.append('industry', industry);
        if (userId) fd.append('userId', userId);
        body = fd;
      } else if (inputMode === 'link') {
        const fd = new FormData();
        fd.append('resumeUrl', resumeUrl.trim());
        fd.append('industry', industry);
        if (userId) fd.append('userId', userId);
        body = fd;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ text: inputText.trim(), industry, userId });
      }

      const response = await fetch(`${baseUrl}/api/ai/proofread`, {
        method: 'POST',
        headers,
        body
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Server returned an error');
      if (resData.success && resData.data) {
        setResult(resData.data);
        // If file was uploaded, show the extracted text so the user can see it
        if (resData.extractedText) setInputText(resData.extractedText);
      } else {
        throw new Error('Invalid response format from server.');
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || 'Proofreading failed. Make sure the servers are online.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setInputText('');
    setSelectedFile(null);
    setResumeUrl('');
    setErrorMsg(null);
  };

  const totalFixes = result
    ? (result.stats?.grammarFixes || 0) + (result.stats?.spellingFixes || 0) +
      (result.stats?.passiveToActive || 0) + (result.stats?.verbUpgrades || 0) +
      (result.stats?.toneAlignments || 0)
    : 0;

  const scoreColor = result
    ? result.score >= 80 ? '#10b981' : result.score >= 60 ? '#fb923c' : '#f43f5e'
    : '#10b981';

  return (
    <div className="proofread-container animate-fade-in-up">
      <div className="glow-ambient" style={{ top: '10%', left: '8%' }} />
      <div className="glow-ambient" style={{ bottom: '20%', right: '10%' }} />

      {/* Header */}
      <div className="proofread-header">
        <div className="proofread-title-section">
          <div className="proofread-badge">
            <Zap size={12} /> AI PROOFREADING
          </div>
          <h1 className="proofread-title">Leave proofreading to AI tech</h1>
          <p className="proofread-subtitle">
            Our AI catches typos, grammar mistakes, weak phrasing, and passive voice — then rewrites
            everything to sound polished and professional. One click, zero errors.
          </p>
        </div>
        {result && (
          <button className="btn-secondary" onClick={handleReset}>
            <RefreshCw size={14} /> Start Over
          </button>
        )}
      </div>

      {/* Feature pills */}
      {!result && !loading && (
        <div className="proofread-features-row">
          <div className="proofread-feature-pill">
            <CheckCircle2 size={14} className="pill-check" /> Grammar &amp; Spelling
          </div>
          <div className="proofread-feature-pill">
            <CheckCircle2 size={14} className="pill-check" /> Passive → Active Voice
          </div>
          <div className="proofread-feature-pill">
            <CheckCircle2 size={14} className="pill-check" /> Weak → Power Verbs
          </div>
          <div className="proofread-feature-pill">
            <CheckCircle2 size={14} className="pill-check" /> Tone Alignment
          </div>
        </div>
      )}

      <div className="proofread-content-area">
        {/* Input card */}
        {!loading && !result && (
          <div className="proofread-input-card glass-card">
            {/* Tab switcher */}
            <div className="proofread-mode-tabs">
              <button
                className={`proofread-mode-tab${inputMode === 'text' ? ' active' : ''}`}
                onClick={() => { setInputMode('text'); setErrorMsg(null); }}
              >
                <FileText size={14} /> Paste Text
              </button>
              <button
                className={`proofread-mode-tab${inputMode === 'file' ? ' active' : ''}`}
                onClick={() => { setInputMode('file'); setErrorMsg(null); }}
              >
                <Upload size={14} /> Upload Resume
              </button>
              <button
                className={`proofread-mode-tab${inputMode === 'link' ? ' active' : ''}`}
                onClick={() => { setInputMode('link'); setErrorMsg(null); }}
              >
                <Link size={14} /> Paste Link
              </button>
            </div>

            <div className="proofread-form">
              {inputMode === 'text' ? (
                <div className="form-group">
                  <label>Text to Proofread *</label>
                  <textarea
                    placeholder="Paste your cover letter, resume bullet points, email draft, LinkedIn summary, or any professional text here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="proofread-textarea"
                    rows={10}
                  />
                  <div className="char-count">{inputText.length} characters</div>
                </div>
              ) : inputMode === 'file' ? (
                <div className="form-group">
                  <label>Upload Resume (PDF, DOCX, TXT)</label>
                  <div
                    className={`proofread-upload-zone${dragActive ? ' drag-active' : ''}${selectedFile ? ' has-file' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => !selectedFile && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="file-input-hidden"
                      onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
                    />
                    {selectedFile ? (
                      <div className="proofread-file-selected">
                        <div className="proofread-file-icon">
                          <FileText size={22} />
                        </div>
                        <div className="proofread-file-details">
                          <span className="proofread-file-name">{selectedFile.name}</span>
                          <span className="proofread-file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button
                          className="proofread-file-remove"
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          title="Remove file"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="proofread-upload-prompt">
                        <Upload size={28} className="upload-icon" />
                        <p className="upload-main-text">Drag &amp; drop or <span className="upload-browse">browse</span></p>
                        <p className="upload-sub-text">PDF, DOCX, or TXT · Max 5MB</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label>Paste a shareable link to your resume</label>
                  <div className="proofread-link-zone">
                    <Link size={22} className="link-input-icon" />
                    <input
                      type="url"
                      className="resume-link-input"
                      placeholder="https://drive.google.com/... or any direct PDF/DOCX link"
                      value={resumeUrl}
                      onChange={(e) => setResumeUrl(e.target.value)}
                    />
                    <p className="link-input-hint">Supports Google Drive, Dropbox, OneDrive, or any direct link</p>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Target Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="proofread-select"
                >
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              {errorMsg && (
                <div className="proofread-error-bar">
                  <AlertCircle size={15} /> {errorMsg}
                </div>
              )}

              <button
                className="btn-primary proofread-submit-btn"
                onClick={handleProofread}
                disabled={
                  inputMode === 'text' ? !inputText.trim() :
                  inputMode === 'file' ? !selectedFile :
                  !resumeUrl.trim()
                }
              >
                Proofread My {inputMode === 'text' ? 'Text' : 'Resume'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <SkeletonLoader
            type="text"
            title="Proofreading Your Text..."
            subtitle="Analysing grammar, passive voice, verb strength, and tone alignment..."
          />
        )}

        {/* Results */}
        {result && (
          <div className="proofread-results-grid animate-fade-in">
            {/* Sidebar */}
            <div className="proofread-sidebar">
              <div className="glass-card proofread-score-card">
                <div className="score-ring-wrapper">
                  <svg viewBox="0 0 80 80" className="score-ring-svg">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke={scoreColor} strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - result.score / 100)}`}
                      transform="rotate(-90 40 40)"
                    />
                  </svg>
                  <div className="score-ring-inner">
                    <span className="score-value" style={{ color: scoreColor }}>{result.score}</span>
                    <span className="score-label">/ 100</span>
                  </div>
                </div>
                <p className="score-caption">Original Writing Score</p>
              </div>

              <div className="glass-card proofread-stats-card">
                <h4>Fixes Applied</h4>
                <div className="stat-row">
                  <span>Grammar &amp; Punctuation</span>
                  <strong>{result.stats?.grammarFixes || 0}</strong>
                </div>
                <div className="stat-row">
                  <span>Spelling</span>
                  <strong>{result.stats?.spellingFixes || 0}</strong>
                </div>
                <div className="stat-row">
                  <span>Active Voice</span>
                  <strong style={{ color: '#a78bfa' }}>{result.stats?.passiveToActive || 0}</strong>
                </div>
                <div className="stat-row">
                  <span>Power Verbs</span>
                  <strong style={{ color: '#10b981' }}>{result.stats?.verbUpgrades || 0}</strong>
                </div>
                <div className="stat-row">
                  <span>Tone &amp; Clarity</span>
                  <strong style={{ color: '#fb923c' }}>{result.stats?.toneAlignments || 0}</strong>
                </div>
                <div className="stat-total-row">
                  <span>Total Improvements</span>
                  <strong>{totalFixes}</strong>
                </div>
              </div>

              <div className="glass-card proofread-summary-card">
                <div className="summary-icon-row">
                  <BookOpen size={15} />
                  <span>AI Summary</span>
                </div>
                <p>{result.summary}</p>
              </div>
            </div>

            {/* Main panel */}
            <div className="proofread-main-panel">
              <div className="glass-card proofread-corrected-card">
                <div className="corrected-card-header">
                  <div className="corrected-header-left">
                    <Target size={16} />
                    <span>Corrected Text</span>
                    <div className="corrected-badge">Polished &amp; Professional</div>
                  </div>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => handleCopy(result.correctedText, 'corrected')}
                  >
                    {copiedId === 'corrected'
                      ? <><Check size={12} className="text-success" /> Copied!</>
                      : <><Copy size={12} /> Copy Text</>
                    }
                  </button>
                </div>
                <div className="corrected-text-body">
                  {result.correctedText}
                </div>
              </div>

              {result.changes && result.changes.length > 0 && (
                <div className="glass-card proofread-changes-card">
                  <div className="changes-card-header">
                    <MessageSquare size={16} />
                    <span>Detailed Changes</span>
                    <span className="changes-count">{result.changes.length} improvements</span>
                  </div>

                  <div className="changes-list">
                    {result.changes.map((change, idx: number) => {
                      const meta = getChangeMeta(change.type);
                      return (
                        <div key={idx} className="change-item">
                          <div className="change-type-badge" style={{ color: meta.color, background: meta.bg }}>
                            {meta.label}
                          </div>
                          <div className="change-diff-row">
                            <div className="change-original">
                              <span className="diff-label">Before</span>
                              <span className="diff-text original-text">{change.original}</span>
                            </div>
                            <ArrowRight size={14} className="diff-arrow" />
                            <div className="change-corrected">
                              <span className="diff-label">After</span>
                              <span className="diff-text corrected-text">{change.corrected}</span>
                            </div>
                          </div>
                          <p className="change-explanation">{change.explanation}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

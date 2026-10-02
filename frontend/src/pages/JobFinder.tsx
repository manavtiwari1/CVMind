import React, { useState, useRef } from 'react';
import { authFetch } from '../lib/authFetch';
import {
  Upload, FileText, Search, RefreshCw, ShieldCheck,
  Briefcase, MapPin, Clock, ExternalLink, AlertCircle, Sparkles
} from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import { getErrorMessage } from '../utils/errors';
import './JobFinder.css';

interface JobFinderProps {
  customApiKey: string;
}

interface Job {
  title: string;
  company: string;
  companyDomain?: string;
  location: string;
  jobType: string;
  matchScore: number;
  matchReasons: string[];
  requiredSkills: string[];
  salary: string;
  applyUrl: string;
  linkedinUrl: string;
  indeedUrl: string;
  naukriUrl: string;
  workindiaUrl: string;
  postedDate: string;
  experienceRequired: string;
}

interface JobFinderResult {
  jobs: Job[];
  searchSummary: string;
}

const JOB_TYPES = ['All', 'Full-time', 'Part-time', 'Remote', 'Internship'];

const companyGradients = [
  'linear-gradient(135deg,#2997ff,#5ac8fa)',
  'linear-gradient(135deg,#bf5af2,#e879f9)',
  'linear-gradient(135deg,#00d4aa,#2997ff)',
  'linear-gradient(135deg,#ff9f0a,#ffcc02)',
  'linear-gradient(135deg,#ff453a,#ff6b6b)',
  'linear-gradient(135deg,#30d158,#34d399)',
  'linear-gradient(135deg,#5ac8fa,#2997ff)',
  'linear-gradient(135deg,#e879f9,#bf5af2)',
];

function getCompanyGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return companyGradients[Math.abs(hash) % companyGradients.length];
}

function CompanyAvatar({ company, domain, gradient, initial }: { company: string; domain?: string; gradient: string; initial: string }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null;

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={company}
        className="jf-company-logo"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="jf-company-avatar"
      style={{ background: gradient, color: '#000' }}
      aria-label={company}
    >
      {initial}
    </div>
  );
}

function getScoreClass(score: number) {
  if (score >= 80) return 'score-high';
  if (score >= 60) return 'score-med';
  return 'score-low';
}

const loaderSteps = [
  'Parsing your resume skills & experience...',
  'Analysing your target job preferences...',
  'Scanning the job market with AI...',
  'Scoring match compatibility...',
  'Curating the top 8–10 opportunities...',
  'Generating personalized apply links...',
];

export default function JobFinder({ customApiKey }: JobFinderProps) {
  const [currentUserEmail] = useState<string>(() => {
    const userStr = localStorage.getItem('cvmind_user');
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        return parsedUser?.email?.toLowerCase() || '';
      } catch {
        return '';
      }
    }
    return '';
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [jobType, setJobType] = useState('All');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<JobFinderResult | null>(null);
  const [resultFilter, setResultFilter] = useState('All');

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── File Handling ── */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateFile(e.target.files[0]);
  };

  const validateFile = (file: File) => {
    setErrorMsg(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
      setErrorMsg('Invalid file type. Please upload a PDF, DOCX, or TXT file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File too large. Max 5 MB.');
      return;
    }
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Find Jobs ── */
  const handleFindJobs = async () => {
    if (!selectedFile) { setErrorMsg('Please upload your CV first.'); return; }
    if (jobDescription.trim().length < 10) { setErrorMsg('Please describe your target role (min 10 characters).'); return; }

    setLoading(true);
    setLoadingStep(0);
    setErrorMsg(null);
    setResult(null);

    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev < loaderSteps.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('jobDescription', jobDescription.trim());
      formData.append('jobType', jobType);

      if (currentUserEmail) {
        formData.append('email', currentUserEmail);
      }

      const baseUrl =
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_BACKEND_URL ||
        (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

      const headers: Record<string, string> = {};
      if (customApiKey) headers['x-gemini-key'] = customApiKey;

      const response = await authFetch(`${baseUrl}/api/job-finder`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Server error during job search.');
      if (resData.success && resData.data) {
        setResult(resData.data);
        setResultFilter('All');
      } else {
        throw new Error('Job search completed but returned no results.');
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || 'Connection failed. Please check that the backend server is running.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setJobDescription('');
    setJobType('All');
    setResultFilter('All');
    removeFile();
    setErrorMsg(null);
  };

  /* ── Filtered jobs (client-side) ── */
  const filteredJobs = result?.jobs?.filter(job => {
    if (resultFilter === 'All') return true;
    return job.jobType?.toLowerCase().includes(resultFilter.toLowerCase());
  }) ?? [];

  /* ── Result type chips ── */
  const availableTypes = result
    ? ['All', ...Array.from(new Set(result.jobs.map(j => j.jobType).filter(Boolean)))]
    : ['All'];

  return (
    <div className="jf-page animate-fade-in-up">
      {/* Ambient background glows */}
      <div className="jf-stage" aria-hidden="true">
        <div className="jf-glow-left" />
        <div className="jf-glow-right" />
      </div>

      {/* ── Header ── */}
      <header className="jf-header">
        <div className="jf-badge">
          <Search size={13} />
          AI Job Finder
        </div>
        <h1 className="jf-title">Find Your Perfect Job Match</h1>
        <p className="jf-subtitle">
          Upload your CV, describe your dream role, and let AI curate the most relevant job openings with direct apply links — filtered by your work preference.
        </p>

        {/* Hero Stats Bar */}
        <div className="jf-stats-bar">
          <div className="jf-stat-item">
            <span className="jf-stat-icon">🎯</span>
            <div className="jf-stat-text">
              <span className="jf-stat-value">8-10</span>
              <span className="jf-stat-label">Tailored Matches</span>
            </div>
          </div>
          <div className="jf-stat-item">
            <span className="jf-stat-icon">📈</span>
            <div className="jf-stat-text">
              <span className="jf-stat-value">95%</span>
              <span className="jf-stat-label">Match Accuracy</span>
            </div>
          </div>
          <div className="jf-stat-item">
            <span className="jf-stat-icon">⚡</span>
            <div className="jf-stat-text">
              <span className="jf-stat-value">Instant</span>
              <span className="jf-stat-label">LinkedIn Apply</span>
            </div>
          </div>
          <div className="jf-stat-item">
            <span className="jf-stat-icon">🔒</span>
            <div className="jf-stat-text">
              <span className="jf-stat-value">100%</span>
              <span className="jf-stat-label">In-Memory Privacy</span>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <SkeletonLoader
          type="jobs"
          title="Analysing CV & Job Description"
          subtitle={loaderSteps[loadingStep]}
          step={loadingStep}
          totalSteps={loaderSteps.length}
        />
      ) : !result ? (
        /* ── INPUT WORKSPACE ── */
        <div className="jf-workspace animate-fade-in-up">
          {/* Left card — Upload + JD */}
          <div className="jf-input-card">
            <p className="jf-card-title">
              <span className="jf-card-step">1</span>
              Upload Your CV
            </p>

            <div
              className={`jf-upload-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="jf-hidden-input"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                disabled={loading}
              />

              {selectedFile ? (
                <div className="jf-file-details">
                  <FileText size={32} className="jf-file-icon" />
                  <div className="jf-file-meta">
                    <span className="jf-file-name">{selectedFile.name}</span>
                    <span className="jf-file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  <button className="jf-remove-btn" onClick={removeFile} disabled={loading}>
                    Remove
                  </button>
                </div>
              ) : (
                <div className="jf-upload-prompt" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={40} className="jf-upload-icon" style={{ margin: '0 auto 0.75rem' }} />
                  <button className="jf-select-btn" type="button">Select CV File</button>
                  <p>PDF, DOCX, or TXT &nbsp;·&nbsp; Max 5 MB</p>
                </div>
              )}
            </div>

            {/* Step 2 — Target Role */}
            <p className="jf-card-title" style={{ marginTop: '1.5rem' }}>
              <span className="jf-card-step">2</span>
              Target Role / Job Description
            </p>
            <textarea
              id="jf-jd-textarea"
              className="jf-textarea"
              placeholder="e.g. &quot;Frontend Developer with React experience at a fintech startup&quot; or paste a full job description..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              disabled={loading}
            />

            {/* Step 3 — Work Type Filter */}
            <p className="jf-card-title" style={{ marginTop: '1.25rem' }}>
              <span className="jf-card-step">3</span>
              Work Preference
            </p>
            <div className="jf-filter-row">
              {JOB_TYPES.map(type => (
                <button
                  key={type}
                  id={`jf-filter-${type.toLowerCase()}`}
                  className={`jf-filter-pill ${jobType === type ? 'active' : ''}`}
                  onClick={() => setJobType(type)}
                  disabled={loading}
                >
                  {type === 'All' && '🌐 '}
                  {type === 'Full-time' && '💼 '}
                  {type === 'Part-time' && '🕐 '}
                  {type === 'Remote' && '🏠 '}
                  {type === 'Internship' && '🎓 '}
                  {type}
                </button>
              ))}
            </div>

            {errorMsg && (
              <div className="jf-error">
                <AlertCircle size={15} />
                {errorMsg}
              </div>
            )}

            <button
              id="jf-find-jobs-btn"
              className="jf-submit-btn"
              onClick={handleFindJobs}
              disabled={loading || !selectedFile || jobDescription.trim().length < 10}
            >
              <Search size={17} />
              Find My Job Matches
            </button>
          </div>

          {/* Right card — How it works */}
          <div className="jf-info-card">
            <p className="jf-card-title">
              <Sparkles size={14} />
              How It Works
            </p>

            <div className="jf-timeline-steps">
              <div className="jf-timeline-step-item">
                <div className="jf-timeline-badge">1</div>
                <div className="jf-timeline-content">
                  <h4>Upload Your CV</h4>
                  <p>Drag & drop your PDF, DOCX, or TXT. Our AI parses your skills, experience, and key professional signals in-memory.</p>
                </div>
              </div>
              <div className="jf-timeline-step-item">
                <div className="jf-timeline-badge">2</div>
                <div className="jf-timeline-content">
                  <h4>Describe Your Dream Role</h4>
                  <p>Enter a brief target role name or paste a complete job description to specify your career targets.</p>
                </div>
              </div>
              <div className="jf-timeline-step-item">
                <div className="jf-timeline-badge">3</div>
                <div className="jf-timeline-content">
                  <h4>Select Work Preference</h4>
                  <p>Choose work styles: Remote, Hybrid, On-site, Full-time, Part-time, or Internship opportunities.</p>
                </div>
              </div>
              <div className="jf-timeline-step-item">
                <div className="jf-timeline-badge">4</div>
                <div className="jf-timeline-content">
                  <h4>AI Match & Apply</h4>
                  <p>Our AI curates the top 8–10 openings with match scores, skills gap checklists, and direct LinkedIn apply links.</p>
                </div>
              </div>
            </div>

            <div className="jf-security-note">
              <ShieldCheck size={14} />
              Resume parsed in-memory only. Zero data stored on server.
            </div>
          </div>
        </div>
      ) : (
        /* ── RESULTS ── */
        <div className="jf-results-section animate-fade-in-up">
          {/* Results header */}
          <div className="jf-results-header">
            <h2 className="jf-results-title">
              <span>{result.jobs.length}</span> Job Matches Found
            </h2>
            <button id="jf-reset-btn" className="jf-reset-btn" onClick={handleReset}>
              <RefreshCw size={14} /> Start New Search
            </button>
          </div>

          {/* Results Summary Dashboard */}
          <div className="jf-results-summary-card glass-card">
            <div className="jf-summary-stat">
              <div className="jf-summary-stat-val">{result.jobs.length}</div>
              <div className="jf-summary-stat-lbl">Curated Matches</div>
            </div>
            <div className="jf-summary-stat-divider"></div>
            <div className="jf-summary-stat">
              <div className="jf-summary-stat-val">
                {Math.round(result.jobs.reduce((acc, job) => acc + job.matchScore, 0) / result.jobs.length)}%
              </div>
              <div className="jf-summary-stat-lbl">Average Match Score</div>
            </div>
            <div className="jf-summary-stat-divider"></div>
            <div className="jf-summary-stat">
              <div className="jf-summary-stat-val" style={{ color: '#00d4aa' }}>95%</div>
              <div className="jf-summary-stat-lbl">Accuracy Level</div>
            </div>
          </div>

          {/* Summary */}
          {result.searchSummary && (
            <div className="jf-active-filters">
              <span className="jf-summary-text">{result.searchSummary}</span>
              {jobType !== 'All' && (
                <span className="jf-active-type-badge">
                  <Briefcase size={11} />
                  {jobType} only
                </span>
              )}
            </div>
          )}

          {/* Client-side type filter */}
          {availableTypes.length > 2 && (
            <div className="jf-result-filters">
              {availableTypes.map(type => (
                <button
                  key={type}
                  className={`jf-result-filter-btn ${resultFilter === type ? 'active' : ''}`}
                  onClick={() => setResultFilter(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {/* Jobs Grid */}
          <div className="jf-jobs-grid">
            {filteredJobs.length === 0 ? (
              <div className="jf-empty-state">
                <div className="jf-empty-icon">🔍</div>
                <p>No jobs match this filter. Try selecting "All".</p>
              </div>
            ) : (
              filteredJobs.map((job, idx) => {
                const gradient = getCompanyGradient(job.company);
                const initial = (job.company || '?').charAt(0).toUpperCase();
                const scoreClass = getScoreClass(job.matchScore);

                return (
                  <div key={idx} className={`jf-job-card jf-score-card-${scoreClass}`}>
                    {/* Card header */}
                    <div className="jf-card-header">
                      <CompanyAvatar 
                        company={job.company} 
                        domain={job.companyDomain} 
                        gradient={gradient} 
                        initial={initial} 
                      />
                      <div className="jf-card-title-block">
                        <h3 className="jf-job-title" title={job.title}>{job.title}</h3>
                        <p className="jf-company-name">{job.company}</p>
                      </div>
                      <div className="jf-match-score-badge">
                        <span className={`jf-score-number ${scoreClass}`}>{job.matchScore}%</span>
                        <span className="jf-score-label">MATCH</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="jf-tags-row">
                      {job.jobType && (
                        <span className="jf-tag jf-tag-type">
                          {job.jobType}
                        </span>
                      )}
                      {job.location && (
                        <span className="jf-tag jf-tag-location">
                          <MapPin size={10} style={{ marginRight: 3 }} />
                          {job.location}
                        </span>
                      )}
                      {job.experienceRequired && (
                        <span className="jf-tag jf-tag-experience">
                          {job.experienceRequired}
                        </span>
                      )}
                    </div>

                    {/* Match Reasons */}
                    {job.matchReasons?.length > 0 && (
                      <div className="jf-match-reasons">
                        {job.matchReasons.slice(0, 3).map((reason, i) => (
                          <div key={i} className="jf-reason-item">
                            <span className="jf-reason-dot" />
                            {reason}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Required Skills */}
                    {job.requiredSkills?.length > 0 && (
                      <div className="jf-skills-wrap">
                        {job.requiredSkills.slice(0, 6).map((skill, i) => (
                          <span key={i} className="jf-skill-badge">{skill}</span>
                        ))}
                      </div>
                    )}

                    {/* Platforms section */}
                    <div className="jf-platforms-section">
                      <span className="jf-platforms-label">Direct Apply Sources:</span>
                      <div className="jf-platforms-row">
                        {job.linkedinUrl && (
                          <a
                            href={job.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="jf-platform-btn linkedin"
                            title="Apply on LinkedIn"
                          >
                            LinkedIn
                          </a>
                        )}
                        {job.indeedUrl && (
                          <a
                            href={job.indeedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="jf-platform-btn indeed"
                            title="Apply on Indeed"
                          >
                            Indeed
                          </a>
                        )}
                        {job.naukriUrl && (
                          <a
                            href={job.naukriUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="jf-platform-btn naukri"
                            title="Apply on Naukri.com"
                          >
                            Naukri.com
                          </a>
                        )}
                        {job.workindiaUrl && (
                          <a
                            href={job.workindiaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="jf-platform-btn workindia"
                            title="Apply on WorkIndia.com"
                          >
                            WorkIndia
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="jf-card-footer">
                      <div>
                        {job.salary && job.salary !== 'Not disclosed' && (
                          <div className="jf-salary">{job.salary}</div>
                        )}
                        {job.postedDate && (
                          <div className="jf-posted">
                            <Clock size={11} style={{ marginRight: 3 }} />
                            {job.postedDate}
                          </div>
                        )}
                      </div>
                      <a
                        href={job.applyUrl || job.linkedinUrl || job.indeedUrl || job.naukriUrl || job.workindiaUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="jf-apply-btn"
                        id={`jf-apply-${idx}`}
                      >
                        Apply Now <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

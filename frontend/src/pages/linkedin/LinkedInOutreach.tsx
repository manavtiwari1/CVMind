import { useState, useEffect } from 'react';
import {
  Copy, Check, Linkedin, ArrowRight, RefreshCw, Send, Users, UserCheck
} from 'lucide-react';
import SkeletonLoader from '../../components/SkeletonLoader';
import { getErrorMessage } from '../../utils/errors';
import { authFetch } from '../../lib/authFetch';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';
import './LinkedInOutreach.css';

// /api/linkedin/outreach
interface OutreachResult {
  connectionRequest: string;
  referralPitch: string;
  recruiterDM: string;
}

// Page state saved in a 'linkedin-outreach' work
interface SavedOutreachContent {
  jobTitle?: string;
  companyName?: string;
  targetName?: string;
  context?: string;
  result?: OutreachResult | null;
}

interface LinkedInOutreachProps {
  customApiKey: string;
  resumeText: string;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
}

export default function LinkedInOutreach({ customApiKey, resumeText, loadedWork, setLoadedWork }: LinkedInOutreachProps) {
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [targetName, setTargetName] = useState('');
  const [context, setContext] = useState('');
  const [useResumeText, setUseResumeText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OutreachResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'connect' | 'referral' | 'recruiter'>('connect');

  const clearForm = () => {
    setResult(null);
    setJobTitle('');
    setCompanyName('');
    setTargetName('');
    setContext('');
  };

  // Load saved work if opened from My Works (adjusting state during render,
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (loadedWork.deleted) {
      clearForm();
    } else if (loadedWork.type === 'linkedin-outreach') {
      const saved = parseSavedContent<SavedOutreachContent>(loadedWork.htmlContent);
      if (saved) {
        setJobTitle(saved.jobTitle || '');
        setCompanyName(saved.companyName || '');
        setTargetName(saved.targetName || '');
        setContext(saved.context || '');
        setResult(saved.result || null);
      } else {
        console.error('Error parsing loaded LinkedIn outreach work');
      }
    }
  }

  // A deletion notice has been handled; clear it in the parent
  useEffect(() => {
    if (loadedWork?.deleted && setLoadedWork) setLoadedWork(null);
  }, [loadedWork, setLoadedWork]);

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleGenerate = async () => {
    if (!jobTitle.trim()) {
      setErrorMsg('Target Job Title is required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

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

      if (!userId) {
        throw new Error('Please sign in to generate and save your LinkedIn outreach DMs.');
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) {
        headers['x-gemini-key'] = customApiKey;
      }

      const response = await authFetch(`${baseUrl}/api/linkedin/outreach`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobTitle,
          companyName,
          context,
          targetName,
          resumeText: useResumeText ? resumeText : '',
          email,
          userId
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Server returned an error');
      }

      if (resData.success && resData.data) {
        setResult(resData.data);
        if (resData.work && setLoadedWork) {
          setLoadedWork(resData.work);
        }
      } else {
        throw new Error('Invalid output format from server.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(getErrorMessage(err) || 'Generation failed. Make sure the servers are online.');
    } finally {
      setLoading(false);
    }
  };



  function removeState() {
    clearForm();
    if (setLoadedWork) {
      setLoadedWork(null);
    }
  }

  return (
    <div className="li-outreach-container animate-fade-in-up">
      <div className="glow-ambient" style={{ top: '15%', left: '10%' }}></div>
      <div className="glow-ambient" style={{ bottom: '25%', right: '15%' }}></div>

      {/* Header */}
      <div className="li-outreach-header">
        <div className="li-outreach-title-section">
          <div className="li-outreach-badge">
            <Linkedin size={13} style={{ fill: 'currentColor' }} /> Networking Assistant
          </div>
          <h1 className="li-outreach-title-text">LinkedIn Outreach & DM Writer</h1>
          <p className="li-outreach-subtitle-text">
            Generate high-conversion, personalized connection requests, referral pitches, and recruiter DMs that land interviews.
          </p>
        </div>
        {result && (
          <button className="btn-secondary" onClick={removeState}>
            <RefreshCw size={14} /> Start Over
          </button>
        )}
      </div>

      <div className="li-outreach-content-area">
        {!loading && !result && (
          <div className="li-outreach-input-card glass-card">
            <div className="input-card-info">
              <h3>Custom Outreach Wizard</h3>
              <p>Provide details about the target job, company, and contact person to write tailored professional pitches.</p>
            </div>

            <div className="li-outreach-form">
              <div className="form-group-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Target Job Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Product Manager, Frontend Developer..."
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="form-control-input"
                  />
                </div>

                <div className="form-group">
                  <label>Target Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Google, Stripe, Local Startup..."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="form-control-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Recipient Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe, HR Team..."
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  className="form-control-input"
                />
              </div>

              <div className="form-group">
                <label>Custom Context / Focus Area (Optional)</label>
                <textarea
                  placeholder="e.g. Mention my background in SaaS sales, or highlight my recent React portfolio project, or mention we both went to University of Washington..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="form-control-input"
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>

              {resumeText && (
                <div className="resume-context-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <input
                    type="checkbox"
                    id="useResumeCheck"
                    checked={useResumeText}
                    onChange={(e) => setUseResumeText(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="useResumeCheck" style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Include active CV resume context (highly recommended for personalized alignment)
                  </label>
                </div>
              )}

              {errorMsg && (
                <div className="error-message-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <span>⚠️ {errorMsg}</span>
                </div>
              )}

              <button className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={handleGenerate}>
                Generate Networking Templates <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <SkeletonLoader
            type="text"
            title="Generating Outreach Copy..."
            subtitle="Structuring connection request notes, cold referral pitches, and recruiter DMs..."
          />
        )}

        {result && (
          <div className="li-outreach-results-grid animate-fade-in">
            {/* Sidebar actions / Stats */}
            <div className="results-sidebar glass-card">
              <h4>Pitch Summary</h4>
              <div className="sidebar-stat-item">
                <span>Job Profile:</span>
                <strong>{jobTitle}</strong>
              </div>
              {companyName && (
                <div className="sidebar-stat-item">
                  <span>Company:</span>
                  <strong>{companyName}</strong>
                </div>
              )}
              {targetName && (
                <div className="sidebar-stat-item">
                  <span>Contact:</span>
                  <strong>{targetName}</strong>
                </div>
              )}

              <div className="sidebar-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.5rem' }}>
                {localStorage.getItem('cvmind_user') ? (
                  <div className="li-autosave-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <Check size={14} className="text-success" />
                    <span>Saved automatically to My Works</span>
                  </div>
                ) : (
                  <div className="li-autosave-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-warning)', padding: '0.5rem', background: 'rgba(251,146,60,0.05)', borderRadius: '6px', border: '1px solid rgba(251,146,60,0.2)' }}>
                    <span>Sign in to auto-save</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main suggestion panels */}
            <div className="results-main-panel">
              
              {/* Tab Selector */}
              <div className="tabs-header-wrapper glass-card">
                <button 
                  className={`tab-btn ${activeTab === 'connect' ? 'active' : ''}`}
                  onClick={() => setActiveTab('connect')}
                >
                  <Users size={14} /> Connection Request (Invite)
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'referral' ? 'active' : ''}`}
                  onClick={() => setActiveTab('referral')}
                >
                  <Send size={14} /> Referral Ask
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'recruiter' ? 'active' : ''}`}
                  onClick={() => setActiveTab('recruiter')}
                >
                  <UserCheck size={14} /> Recruiter DM
                </button>
              </div>

              {/* Tab Contents */}
              <div className="tab-content-display glass-card" style={{ marginTop: '1.5rem', padding: '2rem', border: '1px solid var(--border)', borderRadius: '16px' }}>
                
                {activeTab === 'connect' && (
                  <div className="tab-pane-content animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--blue)' }}>Personalized Connection Invite</h4>
                      <button 
                        className="btn-secondary btn-sm" 
                        onClick={() => handleCopy(result.connectionRequest, 'connect-copy')}
                        style={{ padding: '0.35rem 0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                      >
                        {copiedSection === 'connect-copy' ? <><Check size={12} className="text-success" /> Copied!</> : <><Copy size={12} /> Copy Invite</>}
                      </button>
                    </div>
                    <div className="pitch-output-preview" style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: '1.65', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {result.connectionRequest}
                    </div>
                    <div className="helper-tip-box" style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong>Pro-tip:</strong> LinkedIn connection notes have a strict 300-character limit. This template has been dynamically optimized to remain within the boundary while maximizing conversion.
                    </div>
                  </div>
                )}

                {activeTab === 'referral' && (
                  <div className="tab-pane-content animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--blue)' }}>Informational Interview & Referral Pitch</h4>
                      <button 
                        className="btn-secondary btn-sm" 
                        onClick={() => handleCopy(result.referralPitch, 'referral-copy')}
                        style={{ padding: '0.35rem 0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                      >
                        {copiedSection === 'referral-copy' ? <><Check size={12} className="text-success" /> Copied!</> : <><Copy size={12} /> Copy Pitch</>}
                      </button>
                    </div>
                    <div className="pitch-output-preview" style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: '1.65', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {result.referralPitch}
                    </div>
                    <div className="helper-tip-box" style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong>Pro-tip:</strong> Send this to employees working in similar functions at your target company. Make sure to personalize the brackets before hitting send!
                    </div>
                  </div>
                )}

                {activeTab === 'recruiter' && (
                  <div className="tab-pane-content animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--blue)' }}>Direct Message for Recruiters & Hiring Managers</h4>
                      <button 
                        className="btn-secondary btn-sm" 
                        onClick={() => handleCopy(result.recruiterDM, 'recruiter-copy')}
                        style={{ padding: '0.35rem 0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                      >
                        {copiedSection === 'recruiter-copy' ? <><Check size={12} className="text-success" /> Copied!</> : <><Copy size={12} /> Copy Pitch</>}
                      </button>
                    </div>
                    <div className="pitch-output-preview" style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: '1.65', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {result.recruiterDM}
                    </div>
                    <div className="helper-tip-box" style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong>Pro-tip:</strong> Use this for direct InMails when applying for an active role. It concisely presents your profile and immediately references the open position.
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

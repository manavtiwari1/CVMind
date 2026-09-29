import { useState, useEffect } from 'react';
import {
  Copy, Check, ArrowRight, RefreshCw, GraduationCap, Building2, Rocket, Palette
} from 'lucide-react';
import SkeletonLoader from '../../components/SkeletonLoader';
import { getErrorMessage } from '../../utils/errors';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';
import './ElevatorPitch.css';

// AI response (schema in backend/src/services/gemini.js)
interface PitchResult {
  corporate: string;
  startup: string;
  creative: string;
}

// Page state saved in an 'elevator-pitch' work
interface SavedPitchContent {
  jobTitle?: string;
  details?: string;
  result?: PitchResult | null;
}

interface ElevatorPitchProps {
  customApiKey: string;
  resumeText: string;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
}

export default function ElevatorPitch({ customApiKey, resumeText, loadedWork, setLoadedWork }: ElevatorPitchProps) {
  const [jobTitle, setJobTitle] = useState('');
  const [details, setDetails] = useState('');
  const [useResumeText, setUseResumeText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PitchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'corporate' | 'startup' | 'creative'>('corporate');

  const clearForm = () => {
    setResult(null);
    setJobTitle('');
    setDetails('');
  };

  // Load saved work if opened from My Works (adjusting state during render,
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (loadedWork.deleted) {
      clearForm();
    } else if (loadedWork.type === 'elevator-pitch') {
      const saved = parseSavedContent<SavedPitchContent>(loadedWork.htmlContent);
      if (saved) {
        setJobTitle(saved.jobTitle || '');
        setDetails(saved.details || '');
        setResult(saved.result || null);
      } else {
        console.error('Error parsing loaded elevator pitch work');
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
        throw new Error('Please sign in to generate and save your Elevator Pitches.');
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) {
        headers['x-gemini-key'] = customApiKey;
      }

      const response = await fetch(`${baseUrl}/api/career/pitch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobTitle,
          details,
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
    <div className="elevator-pitch-container animate-fade-in-up">
      <div className="glow-ambient" style={{ top: '15%', left: '10%' }}></div>
      <div className="glow-ambient" style={{ bottom: '25%', right: '15%' }}></div>

      {/* Header */}
      <div className="elevator-pitch-header">
        <div className="elevator-pitch-title-section">
          <div className="elevator-pitch-badge">
            <GraduationCap size={13} style={{ fill: 'currentColor' }} /> Career Path AI
          </div>
          <h1 className="elevator-pitch-title-text">AI Elevator Pitch Builder</h1>
          <p className="elevator-pitch-subtitle-text">
            Formulate your 60-second introduction custom-tailored for Corporate, Startup, and Creative contexts.
          </p>
        </div>
        {result && (
          <button className="btn-secondary" onClick={removeState}>
            <RefreshCw size={14} /> Start Over
          </button>
        )}
      </div>

      <div className="elevator-pitch-content-area">
        {!loading && !result && (
          <div className="elevator-pitch-input-card glass-card">
            <div className="input-card-info">
              <h3>Elevator Pitch Wizard</h3>
              <p>State your target job title and any specific highlight values you want to focus on to generate professional verbal pitches.</p>
            </div>

            <div className="elevator-pitch-form">
              <div className="form-group">
                <label>Target Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Executive, Data Engineer, Product Designer..."
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="form-control-input"
                />
              </div>

              <div className="form-group">
                <label>Specific Highlight / Unique Hook (Optional)</label>
                <textarea
                  placeholder="e.g. Highlight my 5 years in retail banking, or focus on my ability to optimize SQL database queries by 40%..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
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
                    Include active CV resume context (highly recommended to anchor metrics)
                  </label>
                </div>
              )}

              {errorMsg && (
                <div className="error-message-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <span>⚠️ {errorMsg}</span>
                </div>
              )}

              <button className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={handleGenerate}>
                Build My Elevator Pitches <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <SkeletonLoader
            type="text"
            title="Formulating Verbal Pitches..."
            subtitle="Structuring dynamic hooks, core metrics, and speakable calls to action..."
          />
        )}

        {result && (
          <div className="elevator-pitch-results-grid animate-fade-in">
            {/* Sidebar Stats */}
            <div className="results-sidebar glass-card">
              <h4>Pitch Summary</h4>
              <div className="sidebar-stat-item">
                <span>Job Profile:</span>
                <strong>{jobTitle}</strong>
              </div>
              <div className="sidebar-stat-item">
                <span>Word Count:</span>
                <strong>~120 words per pitch</strong>
              </div>

              {localStorage.getItem('cvmind_user') ? (
                <div className="pitch-autosave-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '1rem' }}>
                  <Check size={14} className="text-success" />
                  <span>Saved automatically to My Works</span>
                </div>
              ) : (
                <div className="pitch-autosave-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-warning)', padding: '0.5rem', background: 'rgba(251,146,60,0.05)', borderRadius: '6px', border: '1px solid rgba(251,146,60,0.2)', marginTop: '1rem' }}>
                  <span>Sign in to auto-save</span>
                </div>
              )}
            </div>

            {/* Main suggestion panels */}
            <div className="results-main-panel">
              
              {/* Tab Selector */}
              <div className="tabs-header-wrapper glass-card">
                <button 
                  className={`tab-btn corporate-tab ${activeTab === 'corporate' ? 'active' : ''}`}
                  onClick={() => setActiveTab('corporate')}
                >
                  <Building2 size={14} /> Corporate Context
                </button>
                <button 
                  className={`tab-btn startup-tab ${activeTab === 'startup' ? 'active' : ''}`}
                  onClick={() => setActiveTab('startup')}
                >
                  <Rocket size={14} /> Startup Context
                </button>
                <button 
                  className={`tab-btn creative-tab ${activeTab === 'creative' ? 'active' : ''}`}
                  onClick={() => setActiveTab('creative')}
                >
                  <Palette size={14} /> Creative Context
                </button>
              </div>

              {/* Tab Contents */}
              <div className="tab-content-display glass-card" style={{ marginTop: '1.5rem', padding: '2rem', border: '1px solid var(--border)', borderRadius: '16px' }}>
                
                {activeTab === 'corporate' && (
                  <div className="tab-pane-content animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--blue)' }}>Corporate Introduction (60 Seconds)</h4>
                      <button 
                        className="btn-secondary btn-sm" 
                        onClick={() => handleCopy(result.corporate, 'corp-copy')}
                        style={{ padding: '0.35rem 0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                      >
                        {copiedSection === 'corp-copy' ? <><Check size={12} className="text-success" /> Copied!</> : <><Copy size={12} /> Copy Script</>}
                      </button>
                    </div>
                    <div className="pitch-output-preview corporate-theme" style={{ padding: '1.5rem', background: 'rgba(0,100,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: '1.7', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {result.corporate}
                    </div>
                    <div className="helper-tip-box" style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong>Tip:</strong> Deliver this at networking sessions, traditional job fairs, or during the initial "tell me about yourself" interview prompt in conservative settings. Speak slowly and emphasize results.
                    </div>
                  </div>
                )}

                {activeTab === 'startup' && (
                  <div className="tab-pane-content animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#a78bfa' }}>Agile / Startup Pitch (60 Seconds)</h4>
                      <button 
                        className="btn-secondary btn-sm" 
                        onClick={() => handleCopy(result.startup, 'startup-copy')}
                        style={{ padding: '0.35rem 0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                      >
                        {copiedSection === 'startup-copy' ? <><Check size={12} className="text-success" /> Copied!</> : <><Copy size={12} /> Copy Script</>}
                      </button>
                    </div>
                    <div className="pitch-output-preview startup-theme" style={{ padding: '1.5rem', background: 'rgba(167,139,250,0.02)', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: '1.7', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {result.startup}
                    </div>
                    <div className="helper-tip-box" style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong>Tip:</strong> Perfect for tech meetups, start-up hackathons, or pitching founders. Focuses on speed of execution, growth metrics, and adaptability.
                    </div>
                  </div>
                )}

                {activeTab === 'creative' && (
                  <div className="tab-pane-content animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fb923c' }}>Storytelling / Creative Hook (60 Seconds)</h4>
                      <button 
                        className="btn-secondary btn-sm" 
                        onClick={() => handleCopy(result.creative, 'creative-copy')}
                        style={{ padding: '0.35rem 0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                      >
                        {copiedSection === 'creative-copy' ? <><Check size={12} className="text-success" /> Copied!</> : <><Copy size={12} /> Copy Script</>}
                      </button>
                    </div>
                    <div className="pitch-output-preview creative-theme" style={{ padding: '1.5rem', background: 'rgba(251,146,60,0.02)', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: '1.7', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {result.creative}
                    </div>
                    <div className="helper-tip-box" style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong>Tip:</strong> Great for design, media, marketing, or general conversational interactions. Emphasizes creative vision, unique perspective, and your personal story.
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

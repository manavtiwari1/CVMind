import { useState, useEffect } from 'react';
import {
  ArrowRight, RefreshCw, GraduationCap, Check, Compass, Flag
} from 'lucide-react';
import SkeletonLoader from '../../components/SkeletonLoader';
import { getErrorMessage } from '../../utils/errors';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';
import './CareerRoadmap.css';

// AI response (schema in backend/src/services/gemini.js)
interface RoadmapStep {
  stepNumber: number;
  phaseName: string;
  timeframe: string;
  focus: string;
  actions: string[];
  milestone: string;
}

interface RoadmapResult {
  steps: RoadmapStep[];
}

// Page state saved in a 'career-roadmap' work
interface SavedRoadmapContent {
  currentRole?: string;
  targetRole?: string;
  years?: string;
  result?: RoadmapResult | null;
}

interface CareerRoadmapProps {
  customApiKey: string;
  resumeText: string;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
}

export default function CareerRoadmap({ customApiKey, resumeText, loadedWork, setLoadedWork }: CareerRoadmapProps) {
  const [currentRole, setCurrentRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [years, setYears] = useState('2 Years');
  const [useResumeText, setUseResumeText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoadmapResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const clearForm = () => {
    setResult(null);
    setCurrentRole('');
    setTargetRole('');
    setYears('2 Years');
  };

  // Load saved work if opened from My Works (adjusting state during render,
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (loadedWork.deleted) {
      clearForm();
    } else if (loadedWork.type === 'career-roadmap') {
      const saved = parseSavedContent<SavedRoadmapContent>(loadedWork.htmlContent);
      if (saved) {
        setCurrentRole(saved.currentRole || '');
        setTargetRole(saved.targetRole || '');
        setYears(saved.years || '2 Years');
        setResult(saved.result || null);
      } else {
        console.error('Error parsing loaded career roadmap work');
      }
    }
  }

  // A deletion notice has been handled; clear it in the parent
  useEffect(() => {
    if (loadedWork?.deleted && setLoadedWork) setLoadedWork(null);
  }, [loadedWork, setLoadedWork]);

  const handleGenerate = async () => {
    if (!targetRole.trim()) {
      setErrorMsg('Target Role is required.');
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
        throw new Error('Please sign in to generate and save your Career Roadmaps.');
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) {
        headers['x-gemini-key'] = customApiKey;
      }

      const response = await fetch(`${baseUrl}/api/career/roadmap`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentRole,
          targetRole,
          years,
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
    <div className="career-roadmap-container animate-fade-in-up">
      <div className="glow-ambient" style={{ top: '15%', left: '10%' }}></div>
      <div className="glow-ambient" style={{ bottom: '25%', right: '15%' }}></div>

      {/* Header */}
      <div className="career-roadmap-header">
        <div className="career-roadmap-title-section">
          <div className="career-roadmap-badge">
            <GraduationCap size={13} style={{ fill: 'currentColor' }} /> Career Path AI
          </div>
          <h1 className="career-roadmap-title-text">Interactive Career Roadmap</h1>
          <p className="career-roadmap-subtitle-text">
            Plan your transition path to benchmark roles using a structured 4-step progression roadmap.
          </p>
        </div>
        {result && (
          <button className="btn-secondary" onClick={removeState}>
            <RefreshCw size={14} /> Start Over
          </button>
        )}
      </div>

      <div className="career-roadmap-content-area">
        {!loading && !result && (
          <div className="career-roadmap-input-card glass-card">
            <div className="input-card-info">
              <h3>Transition Planner</h3>
              <p>State your current background and target role to generate a step-by-step career timeline.</p>
            </div>

            <div className="career-roadmap-form">
              <div className="form-group-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Current Role / Profile</label>
                  <input
                    type="text"
                    placeholder="e.g. Sales Associate, College Graduate..."
                    value={currentRole}
                    onChange={(e) => setCurrentRole(e.target.value)}
                    className="form-control-input"
                  />
                </div>

                <div className="form-group">
                  <label>Target Role *</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Data Analyst, Project Lead..."
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="form-control-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Transition Timeframe Budget</label>
                <select
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  className="form-control-input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="6 Months">6 Months</option>
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="3-5 Years">3-5 Years</option>
                </select>
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
                    Include active CV resume context (highly recommended for custom career alignment)
                  </label>
                </div>
              )}

              {errorMsg && (
                <div className="error-message-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <span>⚠️ {errorMsg}</span>
                </div>
              )}

              <button className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={handleGenerate}>
                Generate Career Roadmap <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <SkeletonLoader
            type="list"
            title="Building Career Transition Path..."
            subtitle="Mapping milestones, timeframe phases, and skill progression checks..."
          />
        )}

        {result && (
          <div className="career-roadmap-results-wrapper animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            {/* Top Stats Banner */}
            <div className="roadmap-stats-banner glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderRadius: '16px', marginBottom: '2.5rem', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Compass size={22} className="text-blue" />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Path: <strong>{currentRole || 'Your Background'}</strong> to <strong>{targetRole}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Timeframe: <strong>{years}</strong></span>
                {localStorage.getItem('cvmind_user') ? (
                  <div className="roadmap-autosave-status" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <Check size={12} className="text-success" />
                    <span>Saved automatically to My Works</span>
                  </div>
                ) : (
                  <div className="roadmap-autosave-status" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-warning)', padding: '0.35rem 0.75rem', background: 'rgba(251,146,60,0.05)', borderRadius: '6px', border: '1px solid rgba(251,146,60,0.2)' }}>
                    <span>Sign in to auto-save</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vertical Timeline */}
            <div className="vertical-timeline-container" style={{ position: 'relative', paddingLeft: '2.5rem', borderLeft: '2px solid rgba(41, 151, 255, 0.2)' }}>
              
              {result.steps && result.steps.map((step, idx: number) => (
                <div key={idx} className="timeline-block animate-fade-in" style={{ position: 'relative', marginBottom: '2.5rem' }}>
                  
                  {/* Timeline Badge/Dot */}
                  <div className="timeline-node-circle" style={{ position: 'absolute', left: 'calc(-2.5rem - 11px)', top: '0', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-primary)', border: '3px solid var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(41, 151, 255, 0.4)', color: 'var(--blue)', fontSize: '0.75rem', fontWeight: 800 }}>
                    {idx + 1}
                  </div>

                  {/* Roadmap Content Card */}
                  <div className="roadmap-step-card glass-card" style={{ padding: '1.75rem', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Time & Title Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 850, color: 'var(--text-primary)' }}>{step.phaseName}</h3>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(41,151,255,0.2)', padding: '0.25rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                        {step.timeframe}
                      </span>
                    </div>

                    {/* Focus Statement */}
                    <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      <strong>Strategic Focus:</strong> {step.focus}
                    </p>

                    {/* Actions Checklist */}
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action Items Checklist:</h4>
                      <div className="checklist-stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {step.actions && step.actions.map((act: string, aIdx: number) => (
                          <div key={aIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--color-emerald)' }}>
                              <Check size={9} />
                            </div>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Phase Milestone */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.15)', padding: '0.65rem 1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                      <Flag size={14} className="text-emerald" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        <strong>Milestone Goal:</strong> {step.milestone}
                      </span>
                    </div>

                  </div>
                </div>
              ))}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

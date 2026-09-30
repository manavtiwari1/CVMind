import { useState, useEffect } from 'react';
import {
  ArrowRight, RefreshCw, BookOpen, GraduationCap, Check, HelpCircle
} from 'lucide-react';
import SkeletonLoader from '../../components/SkeletonLoader';
import { getErrorMessage } from '../../utils/errors';
import { authFetch } from '../../lib/authFetch';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';
import './CareerCourses.css';

// AI response (schema in backend/src/services/gemini.js)
interface CourseSuggestion {
  title: string;
  platform: string;
  skillsCovered: string[];
  reason: string;
  duration: string;
}

interface CoursesResult {
  gaps: string[];
  courses: CourseSuggestion[];
}

// Page state saved in a 'career-courses' work
interface SavedCoursesContent {
  targetJob?: string;
  skills?: string;
  result?: CoursesResult | null;
}

interface CareerCoursesProps {
  customApiKey: string;
  resumeText: string;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
}

export default function CareerCourses({ customApiKey, resumeText, loadedWork, setLoadedWork }: CareerCoursesProps) {
  const [targetJob, setTargetJob] = useState('');
  const [skills, setSkills] = useState('');
  const [useResumeText, setUseResumeText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoursesResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clearForm = () => {
    setResult(null);
    setTargetJob('');
    setSkills('');
  };

  // Load saved work if opened from My Works (adjusting state during render,
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (loadedWork.deleted) {
      clearForm();
    } else if (loadedWork.type === 'career-courses') {
      const saved = parseSavedContent<SavedCoursesContent>(loadedWork.htmlContent);
      if (saved) {
        setTargetJob(saved.targetJob || '');
        setSkills(saved.skills || '');
        setResult(saved.result || null);
      } else {
        console.error('Error parsing loaded career courses work');
      }
    }
  }

  // A deletion notice has been handled; clear it in the parent
  useEffect(() => {
    if (loadedWork?.deleted && setLoadedWork) setLoadedWork(null);
  }, [loadedWork, setLoadedWork]);

  const handleGenerate = async () => {
    if (!targetJob.trim()) {
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
        throw new Error('Please sign in to run Skill Gap analysis & save recommendations.');
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) {
        headers['x-gemini-key'] = customApiKey;
      }

      const response = await authFetch(`${baseUrl}/api/career/courses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetJob,
          skills,
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
    <div className="career-courses-container animate-fade-in-up">
      <div className="glow-ambient" style={{ top: '15%', left: '10%' }}></div>
      <div className="glow-ambient" style={{ bottom: '25%', right: '15%' }}></div>

      {/* Header */}
      <div className="career-courses-header">
        <div className="career-courses-title-section">
          <div className="career-courses-badge">
            <GraduationCap size={13} style={{ fill: 'currentColor' }} /> Career Path AI
          </div>
          <h1 className="career-courses-title-text">Skill Gaps & Online Courses</h1>
          <p className="career-courses-subtitle-text">
            Compare your profile against target roles, identify missing skills, and get personalized course recommendations to bridge the gap.
          </p>
        </div>
        {result && (
          <button className="btn-secondary" onClick={removeState}>
            <RefreshCw size={14} /> Start Over
          </button>
        )}
      </div>

      <div className="career-courses-content-area">
        {!loading && !result && (
          <div className="career-courses-input-card glass-card">
            <div className="input-card-info">
              <h3>Analyze Career Skill Gaps</h3>
              <p>Enter your target career path to analyze missing technical and soft skills, and get structured learning recommendations.</p>
            </div>

            <div className="career-courses-form">
              <div className="form-group">
                <label>Target Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. DevOps Architect, UX Researcher, Data Scientist..."
                  value={targetJob}
                  onChange={(e) => setTargetJob(e.target.value)}
                  className="form-control-input"
                />
              </div>

              <div className="form-group">
                <label>Current Skills / Tech Stack (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. JavaScript, Excel, SQL, Project Coordination..."
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="form-control-input"
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
                    Include active CV resume context (highly recommended for precision scan)
                  </label>
                </div>
              )}

              {errorMsg && (
                <div className="error-message-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <span>⚠️ {errorMsg}</span>
                </div>
              )}

              <button className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={handleGenerate}>
                Analyze Skills & Fetch Courses <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <SkeletonLoader
            type="cards"
            title="Conducting Skill Gap Audit..."
            subtitle="Matching your profile with target skill matrices and course curricula..."
          />
        )}

        {result && (
          <div className="career-courses-results-grid animate-fade-in">
            {/* Sidebar Gaps List */}
            <div className="results-sidebar glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <HelpCircle size={16} className="text-warning" />
                <h4 style={{ margin: 0 }}>Identified Skill Gaps</h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                These are the top skill areas you lack compared to benchmark requirements for **{targetJob}**:
              </p>
              <div className="gaps-list-stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {result.gaps && result.gaps.map((gap: string, idx: number) => (
                  <div key={idx} className="gap-item-card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 700 }}>•</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{gap}</span>
                  </div>
                ))}
              </div>

              {localStorage.getItem('cvmind_user') ? (
                <div className="course-autosave-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '1.5rem' }}>
                  <Check size={14} className="text-success" />
                  <span>Saved automatically to My Works</span>
                </div>
              ) : (
                <div className="course-autosave-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-warning)', padding: '0.5rem', background: 'rgba(251,146,60,0.05)', borderRadius: '6px', border: '1px solid rgba(251,146,60,0.2)', marginTop: '1.5rem' }}>
                  <span>Sign in to auto-save</span>
                </div>
              )}
            </div>

            {/* Courses Recommendations Cards */}
            <div className="results-main-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <BookOpen size={20} className="text-blue" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Recommended Online Courses & Certifications</h3>
              </div>

              <div className="courses-cards-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {result.courses && result.courses.map((course, index: number) => (
                  <div key={index} className="course-recommendation-card glass-card" style={{ padding: '1.75rem', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(41,151,255,0.2)', padding: '0.25rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                          {course.platform}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 850, color: 'var(--text-primary)' }}>{course.title}</h4>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        Duration: <strong>{course.duration}</strong>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                      {course.reason}
                    </p>

                    <div>
                      <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Skills you will build:</h5>
                      <div className="skills-badge-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {course.skillsCovered && course.skillsCovered.map((skill: string, sIdx: number) => (
                          <span key={sIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '0.2% 0.5rem', borderRadius: '6px' }}>
                            <Check size={11} className="text-success" /> {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

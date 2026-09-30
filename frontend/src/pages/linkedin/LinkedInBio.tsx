import { useState, useEffect } from 'react';
import {
  Copy, Check, Linkedin, ArrowRight, RefreshCw
} from 'lucide-react';
import SkeletonLoader from '../../components/SkeletonLoader';
import { getErrorMessage } from '../../utils/errors';
import { authFetch } from '../../lib/authFetch';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';
import './LinkedInBio.css';

// /api/linkedin/bio
interface BannerIdea {
  text: string;
  bgStyle: string;
  tip: string;
}

interface BioResult {
  headlines?: string[];
  aboutSummaries?: string[];
  bannerIdeas?: BannerIdea[];
  hashtags?: string[];
}

// Page state saved in a 'linkedin-bio' work
interface SavedBioContent {
  jobTitle?: string;
  skills?: string;
  result?: BioResult | null;
}

interface LinkedInBioProps {
  customApiKey: string;
  resumeText: string;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
}

export default function LinkedInBio({ customApiKey, resumeText, loadedWork, setLoadedWork }: LinkedInBioProps) {
  const [jobTitle, setJobTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [useResumeText, setUseResumeText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BioResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);


  const clearForm = () => {
    setResult(null);
    setJobTitle('');
    setSkills('');
  };

  // Load saved work if opened from My Works (adjusting state during render,
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (loadedWork.deleted) {
      clearForm();
    } else if (loadedWork.type === 'linkedin-bio') {
      const saved = parseSavedContent<SavedBioContent>(loadedWork.htmlContent);
      if (saved) {
        setJobTitle(saved.jobTitle || '');
        setSkills(saved.skills || '');
        setResult(saved.result || null);
      } else {
        console.error('Error parsing loaded LinkedIn bio work');
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
        throw new Error('Please sign in to generate and save your LinkedIn branding assets.');
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) {
        headers['x-gemini-key'] = customApiKey;
      }

      const response = await authFetch(`${baseUrl}/api/linkedin/bio`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          skills,
          jobTitle,
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
    <div className="li-bio-container animate-fade-in-up">
      <div className="glow-ambient" style={{ top: '15%', left: '10%' }}></div>
      <div className="glow-ambient" style={{ bottom: '25%', right: '15%' }}></div>

      {/* Header */}
      <div className="li-bio-header">
        <div className="li-bio-title-section">
          <div className="li-bio-badge">
            <Linkedin size={13} style={{ fill: 'currentColor' }} /> Premium LinkedIn Kit
          </div>
          <h1 className="li-bio-title-text">LinkedIn Bio & Banner AI</h1>
          <p className="li-bio-subtitle-text">
            Generate high-engagement, keyword-rich headlines, professional summaries, and banner copy designs to optimize your digital brand.
          </p>
        </div>
        {result && (
          <button className="btn-secondary" onClick={removeState}>
            <RefreshCw size={14} /> Start Over
          </button>
        )}
      </div>

      <div className="li-bio-content-area">
        {!loading && !result && (
          <div className="li-bio-input-card glass-card">
            <div className="input-card-info">
              <h3>Profile Optimization Form</h3>
              <p>Fill out your target job profile, and let our AI construct premium headlines, bios, and LinkedIn banner slogans.</p>
            </div>

            <div className="li-bio-form">
              <div className="form-group">
                <label>Target Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Engineer, Financial Analyst..."
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="form-control-input"
                />
              </div>

              <div className="form-group">
                <label>Core Skills & Expertise (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. React, Python, Cloud Architecture, Project Management..."
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="form-control-input"
                />
              </div>

              {resumeText && (
                <div className="resume-context-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <input
                    type="checkbox"
                    id="useResumeCheck"
                    checked={useResumeText}
                    onChange={(e) => setUseResumeText(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="useResumeCheck" style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Include active CV resume context (highly recommended for better customization)
                  </label>
                </div>
              )}

              {errorMsg && (
                <div className="error-message-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <span>⚠️ {errorMsg}</span>
                </div>
              )}

              <button className="btn-primary" style={{ marginTop: '1rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={handleGenerate}>
                Generate Profile Assets <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <SkeletonLoader
            type="text"
            title="Generating LinkedIn Brand Copy..."
            subtitle="Structuring professional bios, custom headers, and banner visual themes..."
          />
        )}

        {result && (
          <div className="li-bio-results-grid">
            
            {/* Sidebar actions / Stats */}
            <div className="results-sidebar glass-card">
              <h4>Branding Summary</h4>
              <div className="sidebar-stat-item">
                <span>Job Profile:</span>
                <strong>{jobTitle}</strong>
              </div>
              <div className="sidebar-stat-item">
                <span>Total Assets:</span>
                <strong>7 suggestions</strong>
              </div>

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
              
              {/* HEADLINES OPTION */}
              <div className="result-panel-section glass-card">
                <div className="panel-section-header">
                  <h3>🎯 Optimized Headlines (Click to Copy)</h3>
                </div>
                <div className="headlines-stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {result.headlines && result.headlines.map((headline: string, index: number) => {
                    const id = `headline-${index}`;
                    return (
                      <div 
                        key={index} 
                        className="copy-card-row glass-card"
                        onClick={() => handleCopy(headline, id)}
                        style={{ cursor: 'pointer', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', transition: 'all 0.2s', borderRadius: '8px' }}
                      >
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{headline}</span>
                        <button className="copy-action-btn">
                          {copiedSection === id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ABOUT SUMMARIES */}
              <div className="result-panel-section glass-card" style={{ marginTop: '1.5rem' }}>
                <div className="panel-section-header">
                  <h3>📝 Professional "About" Bios</h3>
                </div>
                <div className="about-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                  {result.aboutSummaries && result.aboutSummaries.map((bio: string, index: number) => {
                    const id = `bio-${index}`;
                    return (
                      <div key={index} className="bio-card glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h5 style={{ margin: 0, fontWeight: 700, color: 'var(--blue)' }}>
                            {index === 0 ? 'Option 1: Structured / Bulleted' : 'Option 2: Narrative / Storytelling'}
                          </h5>
                          <button 
                            className="btn-secondary btn-sm" 
                            onClick={() => handleCopy(bio, id)}
                            style={{ padding: '0.3rem 0.6rem' }}
                          >
                            {copiedSection === id ? <><Check size={12} className="text-success" /> Copied!</> : <><Copy size={12} /> Copy Bio</>}
                          </button>
                        </div>
                        <p style={{ fontSize: '0.85rem', lineHeight: '1.6', margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{bio}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BANNER IDEAS */}
              <div className="result-panel-section glass-card" style={{ marginTop: '1.5rem' }}>
                <div className="panel-section-header">
                  <h3>🎨 LinkedIn Profile Banner Visual Ideas</h3>
                </div>
                <div className="banner-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  {result.bannerIdeas && result.bannerIdeas.map((banner, index: number) => {
                    const id = `banner-${index}`;
                    return (
                      <div key={index} className="banner-card glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h5 style={{ margin: 0, fontWeight: 700, color: 'var(--color-primary)' }}>Idea 0{index + 1}</h5>
                          <button 
                            className="btn-secondary btn-sm" 
                            onClick={() => handleCopy(banner.text, id)}
                            style={{ padding: '0.3rem 0.6rem' }}
                          >
                            {copiedSection === id ? <><Check size={12} className="text-success" /> Copied!</> : <><Copy size={12} /> Copy Text</>}
                          </button>
                        </div>
                        <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <p style={{ margin: 0 }}>
                            <strong>Main Banner Text:</strong>
                            <span style={{ display: 'block', margin: '0.2rem 0', padding: '0.4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontStyle: 'italic' }}>"{banner.text}"</span>
                          </p>
                          <p style={{ margin: 0 }}><strong>Visual Styling:</strong> {banner.bgStyle}</p>
                          <p style={{ margin: 0 }}><strong>Recruiter Tip:</strong> {banner.tip}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RECOMMENDED HASHTAGS */}
              {result.hashtags && result.hashtags.length > 0 && (
                <div className="result-panel-section glass-card" style={{ marginTop: '1.5rem' }}>
                  <div className="panel-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>#️⃣ Recommended Hashtags</h3>
                    <button 
                      className="btn-secondary btn-sm" 
                      onClick={() => handleCopy((result.hashtags || []).join(' '), 'hashtags')}
                    >
                      {copiedSection === 'hashtags' ? <><Check size={12} className="text-success" /> Copied!</> : <><Copy size={12} /> Copy Hashtags</>}
                    </button>
                  </div>
                  <div className="tags-stack" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {result.hashtags.map((tag: string, index: number) => (
                      <span key={index} className="filter-badge" style={{ cursor: 'default', background: 'rgba(41,151,255,0.08)', color: 'var(--blue)', border: '1px solid rgba(41,151,255,0.15)' }}>
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
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

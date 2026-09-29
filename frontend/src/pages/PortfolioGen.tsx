import { useState } from 'react';
import { Globe, ArrowRight, RefreshCw, Download, Copy, Check, Palette, Zap, Monitor } from 'lucide-react';
import { getErrorMessage } from '../utils/errors';
import type { ExperienceEntry } from '../types/api';
import './PortfolioGen.css';

// Parsed resume behind a generated site (/api/portfolio/generate-site)
interface PortfolioData {
  name?: string;
  title?: string;
  email?: string;
  skills?: string[];
  experience?: ExperienceEntry[];
}

interface PortfolioGenProps {
  customApiKey: string;
  resumeText: string;
  setCurrentPage?: (page: string) => void;
}

const THEMES = [
  { id: 'dark-pro', label: 'Dark Pro', color: '#6366f1', bg: '#0a0a0f', desc: 'Modern & Minimal' },
  { id: 'ocean', label: 'Ocean', color: '#0ea5e9', bg: '#0c1a2e', desc: 'Deep Blue' },
  { id: 'emerald', label: 'Emerald', color: '#10b981', bg: '#0a1a0f', desc: 'Fresh Green' },
  { id: 'purple', label: 'Purple', color: '#a855f7', bg: '#0f0a1e', desc: 'Vibrant Purple' },
  { id: 'minimal', label: 'Minimal', color: '#2997ff', bg: '#ffffff', desc: 'Clean White' },
];

export default function PortfolioGen({ customApiKey, resumeText, setCurrentPage }: PortfolioGenProps) {
  const [localResume, setLocalResume] = useState(resumeText || '');
  const [colorTheme, setColorTheme] = useState('dark-pro');
  const [step, setStep] = useState<'setup' | 'generating' | 'preview'>('setup');
  const [portfolioHTML, setPortfolioHTML] = useState('');
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Follow the shared resume text when it changes (adjusting state during render)
  const [prevResumeText, setPrevResumeText] = useState(resumeText);
  if (resumeText !== prevResumeText) {
    setPrevResumeText(resumeText);
    setLocalResume(resumeText || '');
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
    || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

  const handleGenerate = async () => {
    if (!localResume.trim() || localResume.trim().length < 50) {
      setErrorMsg('Please paste your resume text (at least 50 characters).'); return;
    }
    setStep('generating'); setErrorMsg(null);
    try {
      const userStr = localStorage.getItem('cvmind_user');
      let userId = '';
      if (userStr) { try { const u = JSON.parse(userStr); userId = u.id || u._id || ''; } catch { /* not signed in */ } }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await fetch(`${baseUrl}/api/portfolio/generate-site`, {
        method: 'POST', headers,
        body: JSON.stringify({ resumeText: localResume, colorTheme, style: colorTheme, userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setPortfolioHTML(data.data.portfolioHTML);
      setPortfolioData(data.data.portfolioData);
      setStep('preview');
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || 'Generation failed. Please try again.');
      setStep('setup');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([portfolioHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioData?.name?.replace(/\s+/g, '-') || 'portfolio'}-cvmind.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(portfolioHTML);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const selectedTheme = THEMES.find(t => t.id === colorTheme) || THEMES[0];

  return (
    <div className="pg-container animate-fade-in-up">
      <div className="glow-ambient" style={{ top: '5%', right: '10%', background: `radial-gradient(circle, ${selectedTheme.color}20 0%, transparent 70%)` }} />
      <div className="glow-ambient" style={{ bottom: '15%', left: '5%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />

      {/* Header */}
      <div className="pg-header">
        <div className="pg-title-section">
          <div className="pg-badge"><Globe size={12} /> Portfolio Generator</div>
          <h1 className="pg-title-text">AI Portfolio Website Generator</h1>
          <p className="pg-subtitle-text">
            Paste your resume → AI extracts your data and generates a stunning, responsive portfolio website. Download the HTML file and host it anywhere instantly.
          </p>
        </div>
        {step === 'preview' && (
          <button className="btn-secondary" onClick={() => setStep('setup')}>
            <RefreshCw size={14} /> Regenerate
          </button>
        )}
      </div>

      {/* Progress steps */}
      <div className="pg-steps">
        {['Configure', 'Generate', 'Preview & Download'].map((s, i) => {
          const stepIdx = step === 'setup' ? 0 : step === 'generating' ? 1 : 2;
          return (
            <div key={s} className={`pg-step${stepIdx === i ? ' active' : stepIdx > i ? ' done' : ''}`}>
              <div className="pg-step-dot" style={stepIdx >= i ? { borderColor: selectedTheme.color, background: stepIdx > i ? selectedTheme.color : 'transparent' } : {}}>
                {stepIdx > i ? <Check size={10} /> : i + 1}
              </div>
              <span>{s}</span>
            </div>
          );
        })}
      </div>

      {/* Setup */}
      {step === 'setup' && (
        <div className="pg-setup-grid">
          {/* Left: Resume Input */}
          <div className="pg-setup-card glass-card">
            <div className="pg-card-header">
              <h3>Your Resume</h3>
              <p>Paste your resume text. AI will extract your info automatically.</p>
            </div>
            <textarea
              className="pg-resume-input"
              rows={12}
              placeholder="Paste your resume content here...&#10;&#10;Include your:&#10;• Name & contact info&#10;• Work experience&#10;• Skills&#10;• Education&#10;• Projects"
              value={localResume}
              onChange={e => setLocalResume(e.target.value)}
            />
            {!resumeText && (
              <p className="pg-resume-hint">
                💡 <strong>Tip:</strong> Go to Home page, upload your resume, then come back — your text will auto-fill.
                {setCurrentPage && (
                  <button className="pg-link-btn" onClick={() => setCurrentPage('home')}>Go to Home →</button>
                )}
              </p>
            )}
          </div>

          {/* Right: Theme + Generate */}
          <div className="pg-setup-right">
            <div className="pg-theme-card glass-card">
              <div className="pg-card-header">
                <h3><Palette size={15} /> Choose Theme</h3>
                <p>Pick a color palette for your portfolio</p>
              </div>
              <div className="pg-theme-grid">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    className={`pg-theme-btn${colorTheme === t.id ? ' active' : ''}`}
                    onClick={() => setColorTheme(t.id)}
                    style={colorTheme === t.id ? { borderColor: t.color, boxShadow: `0 0 20px ${t.color}30` } : {}}
                  >
                    <div className="pg-theme-preview" style={{ background: t.bg, border: `2px solid ${t.color}` }}>
                      <div className="pg-theme-dot" style={{ background: t.color }} />
                      <div className="pg-theme-lines">
                        <div style={{ background: t.color, opacity: 0.7 }} />
                        <div style={{ background: t.color, opacity: 0.4 }} />
                        <div style={{ background: t.color, opacity: 0.25 }} />
                      </div>
                    </div>
                    <div className="pg-theme-info">
                      <span className="pg-theme-name" style={colorTheme === t.id ? { color: t.color } : {}}>{t.label}</span>
                      <span className="pg-theme-desc">{t.desc}</span>
                    </div>
                    {colorTheme === t.id && <Check size={13} className="pg-theme-check" style={{ color: t.color }} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pg-features-card glass-card">
              <h4>✨ What gets generated</h4>
              <ul className="pg-features-list">
                <li><Check size={12} /> Responsive HTML + CSS</li>
                <li><Check size={12} /> Hero section with avatar</li>
                <li><Check size={12} /> Skills & tech stack grid</li>
                <li><Check size={12} /> Work experience timeline</li>
                <li><Check size={12} /> Projects showcase</li>
                <li><Check size={12} /> Education section</li>
                <li><Check size={12} /> Contact links</li>
                <li><Check size={12} /> Mobile responsive</li>
              </ul>
            </div>

            {errorMsg && <div className="pg-error">⚠️ {errorMsg}</div>}

            <button className="btn-primary pg-generate-btn" onClick={handleGenerate}>
              <Zap size={16} /> Generate My Portfolio <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Generating */}
      {step === 'generating' && (
        <div className="pg-generating glass-card">
          <div className="pg-gen-animation">
            <div className="pg-gen-ring" style={{ borderTopColor: selectedTheme.color }} />
            <div className="pg-gen-ring pg-gen-ring-2" style={{ borderTopColor: selectedTheme.color, opacity: 0.5 }} />
            <Globe size={24} style={{ color: selectedTheme.color }} />
          </div>
          <h3>Building your portfolio...</h3>
          <div className="pg-gen-steps">
            {['Extracting resume data', 'Parsing experience & skills', 'Designing layout', 'Generating HTML & CSS'].map((s, i) => (
              <div key={i} className="pg-gen-step" style={{ animationDelay: `${i * 0.6}s` }}>
                <div className="pg-gen-step-dot" style={{ background: selectedTheme.color }} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {step === 'preview' && portfolioHTML && (
        <div className="pg-preview-area">
          {/* Actions bar */}
          <div className="pg-preview-bar glass-card">
            <div className="pg-preview-info">
              <Globe size={16} style={{ color: selectedTheme.color }} />
              <div>
                <strong>{portfolioData?.name || 'Your Portfolio'}</strong>
                <span> · {selectedTheme.label} Theme · {portfolioData?.skills?.length || 0} skills · {portfolioData?.experience?.length || 0} experiences</span>
              </div>
            </div>
            <div className="pg-preview-actions">
              <div className="pg-view-toggle">
                <button className={`pg-view-btn${previewMode === 'desktop' ? ' active' : ''}`} onClick={() => setPreviewMode('desktop')}>
                  <Monitor size={14} /> Desktop
                </button>
                <button className={`pg-view-btn${previewMode === 'mobile' ? ' active' : ''}`} onClick={() => setPreviewMode('mobile')}>
                  📱 Mobile
                </button>
              </div>
              <button className="btn-secondary pg-action-btn" onClick={handleCopyHTML}>
                {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy HTML</>}
              </button>
              <button className="btn-primary pg-action-btn" onClick={handleDownload}>
                <Download size={13} /> Download .html
              </button>
            </div>
          </div>

          {/* iFrame Preview */}
          <div className={`pg-iframe-wrapper${previewMode === 'mobile' ? ' mobile' : ''}`}>
            <div className="pg-browser-chrome">
              <div className="pg-browser-dots">
                <span /><span /><span />
              </div>
              <div className="pg-browser-url">
                <Globe size={11} />
                {portfolioData?.name?.toLowerCase().replace(/\s+/g, '-') || 'my-portfolio'}.html
              </div>
            </div>
            <iframe
              srcDoc={portfolioHTML}
              className="pg-iframe"
              title="Portfolio Preview"
              sandbox="allow-same-origin"
            />
          </div>

          {/* Info */}
          <div className="pg-deploy-info glass-card">
            <h4>🚀 How to publish your portfolio</h4>
            <div className="pg-deploy-steps">
              <div className="pg-deploy-step">
                <span className="pg-deploy-num" style={{ background: selectedTheme.color }}>1</span>
                <div>
                  <strong>Download</strong> the .html file
                </div>
              </div>
              <div className="pg-deploy-step">
                <span className="pg-deploy-num" style={{ background: selectedTheme.color }}>2</span>
                <div>
                  <strong>Upload</strong> to GitHub Pages, Netlify Drop, or Vercel
                </div>
              </div>
              <div className="pg-deploy-step">
                <span className="pg-deploy-num" style={{ background: selectedTheme.color }}>3</span>
                <div>
                  <strong>Share</strong> your live portfolio link with recruiters!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

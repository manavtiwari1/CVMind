import React, { useState, useRef } from 'react';
import { Upload, FileText, ChevronRight, Check, Copy, Sparkles, BrainCircuit, RefreshCw, Cpu, CheckCircle2, ShieldCheck, FileCheck, Download, ChevronDown, Link } from 'lucide-react';
import { getErrorMessage } from '../utils/errors';
import './Tailor.css';

interface TailorProps {
  customApiKey: string;
}

interface TailorResult {
  tailoredResume: string;
  matchScore: number;
  keyTailoringInsights: string[];
  matchedSkills: string[];
  missingSkillsRecommended: string[];
}

export default function Tailor({ customApiKey }: TailorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [resumeUrl, setResumeUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loaderSteps = [
    'Reading original CV structures...',
    'Parsing credentials & work history...',
    'Matching keyword requirements from the JD...',
    'Emphasizing high-impact accomplishments...',
    'Injecting required industry skills naturally...',
    'Generating polished, ATS-optimized layout...'
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
      validateFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateFile(e.target.files[0]);
    }
  };

  const validateFile = (file: File) => {
    setErrorMsg(null);
    const allowed = ['pdf', 'docx', 'txt'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !allowed.includes(ext)) {
      setErrorMsg('Invalid file type. Please upload a PDF, DOCX, or TXT file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File is too large. Max size is 5MB.');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTailor = async () => {
    if (uploadMode === 'file' && !selectedFile) {
      setErrorMsg('Please upload your current CV first.');
      return;
    }
    if (uploadMode === 'link' && !resumeUrl.trim()) {
      setErrorMsg('Please paste a link to your CV.');
      return;
    }
    if (!jobDescription.trim() || jobDescription.trim().length < 15) {
      setErrorMsg('Please paste a target Job Description (min 15 characters).');
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setErrorMsg(null);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loaderSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 1500);

    const formData = new FormData();
    if (uploadMode === 'file' && selectedFile) {
      formData.append('resume', selectedFile);
    } else {
      formData.append('resumeUrl', resumeUrl.trim());
    }
    formData.append('jobDescription', jobDescription.trim());

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      
      const headers: Record<string, string> = {};
      if (customApiKey) {
        headers['x-gemini-key'] = customApiKey;
      }

      const response = await fetch(`${baseUrl}/api/tailor`, {
        method: 'POST',
        headers,
        body: formData
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Server error during tailoring');
      }

      if (resData.success && resData.data) {
        setResult(resData.data);
        setEditedText(resData.data.tailoredResume);
        setIsEditing(false);
      } else {
        throw new Error('Completed, but failed to retrieve tailored output.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(getErrorMessage(err) || 'Connection failed. Make sure the backend server is running.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const convertResumeTextToHTML = (text: string) => {
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    
    let name = '';
    const contactLines: string[] = [];
    let bodyStartIndex = 0;
    
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (/summary|skills|competencies|internship|experience|employment|responsibility|education|projects|certifications|achievements/i.test(line)) {
        bodyStartIndex = i;
        break;
      }
      
      if (!name && line.length > 2 && line.length < 40 && !line.includes('|') && !line.includes('@') && !line.includes(':') && !line.includes('Phone')) {
        name = line;
        bodyStartIndex = i + 1;
      } else if (line.includes('@') || line.includes('|') || line.includes('Phone') || line.includes('Email') || line.includes('LinkedIn') || line.includes('github.com')) {
        contactLines.push(line);
        bodyStartIndex = i + 1;
      }
    }

    if (!name && lines[0]) {
      name = lines[0].trim().replace(/[#*]/g, '');
      bodyStartIndex = 1;
    }

    html += '<div class="resume-header">';
    html += '<h1 class="candidate-name">' + name + '</h1>';
    if (contactLines.length > 0) {
      const contactText = contactLines.join(' | ').replace(/\s*\|\s*\|\s*/g, ' | ');
      html += '<div class="contact-info">' + contactText + '</div>';
    }
    html += '</div>';
    html += '<hr class="header-divider"/>';

    for (let i = bodyStartIndex; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        continue;
      }

      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');

      const cleanHeaderLine = line.replace(/^[#\s\-*]+/, '').replace(/<[^>]*>/g, '').trim();
      const isSectionHeader = /^(professional\s+)?summary$|^(technical\s+)?skills$|^(core\s+)?competencies$|^internship$|^(work\s+)?experience$|^(professional\s+)?experience$|^employment\s+history$|^position(s)?\s+of\s+responsibility$|^education$|^(academic\s+)?projects$|^projects$|^certifications$|^achievements$/i.test(cleanHeaderLine);

      if (isSectionHeader) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += '<h2 class="section-title">' + cleanHeaderLine.toUpperCase() + '</h2>';
        continue;
      }

      const isListItem = /^[•\-*\s]+/.test(lines[i]) || line.startsWith('-') || line.startsWith('*');
      if (isListItem) {
        const cleanContent = line.replace(/^[•\-*\s]+/, '').trim();
        if (!inList) {
          html += '<ul class="bullet-list">';
          inList = true;
        }
        html += '<li>' + cleanContent + '</li>';
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        
        if (line.includes('|') || line.includes(' - ') || line.includes('Present') || line.includes('202')) {
          html += '<div class="info-line">' + line + '</div>';
        } else {
          html += '<p class="normal-paragraph">' + line + '</p>';
        }
      }
    }

    if (inList) {
      html += '</ul>';
    }

    return html;
  };

  const handleDownloadDocx = () => {
    const header = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head>' +
      '<title>Tailored Resume</title>' +
      '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
      '<style>' +
      'body { font-family: Arial, sans-serif; font-size: 10.5pt; line-height: 1.4; color: #111111; margin: 1in; }' +
      '.resume-header { text-align: center; margin-bottom: 8px; }' +
      '.candidate-name { font-size: 20pt; font-weight: bold; color: #102a43; margin-bottom: 4px; }' +
      '.contact-info { font-size: 9.5pt; color: #486581; }' +
      '.header-divider { border-top: 2px solid #102a43; height: 0; margin-bottom: 12px; }' +
      '.section-title { font-size: 11pt; font-weight: bold; color: #102a43; text-transform: uppercase; border-bottom: 1.5px solid #102a43; padding-bottom: 2px; margin-top: 14px; margin-bottom: 6px; }' +
      '.bullet-list { margin-bottom: 6px; padding-left: 20px; }' +
      '.bullet-list li { font-size: 10.5pt; color: #243e56; margin-bottom: 3px; }' +
      '.info-line { font-weight: bold; font-size: 10.5pt; color: #102a43; margin-top: 6px; margin-bottom: 3px; }' +
      '.normal-paragraph { font-size: 10.5pt; color: #243e56; margin-bottom: 6px; text-align: justify; }' +
      '</style>' +
      '</head>' +
      '<body>';
    const footer = '</body></html>';
    const formattedBody = convertResumeTextToHTML(editedText);
    const html = header + formattedBody + footer;
    const blob = new Blob(['\ufeff' + html], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = selectedFile ? selectedFile.name.split('.').slice(0, -1).join('.') + '_Tailored.doc' : 'Tailored_Resume.doc';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const htmlContent = '<html>' +
      '<head>' +
      '<title>Tailored_Resume</title>' +
      '<style>' +
      '@page { size: A4; margin: 20mm; }' +
      'body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #1a1a1a; background: #ffffff; padding: 0; margin: 0; }' +
      '.resume-header { text-align: center; margin-bottom: 8px; }' +
      '.candidate-name { font-size: 20pt; font-weight: 800; color: #102a43; margin: 0 0 4px; }' +
      '.contact-info { font-size: 9.5pt; color: #486581; margin: 0; font-weight: 500; }' +
      '.header-divider { border: 0; border-top: 2px solid #102a43; margin: 8px 0 12px; }' +
      '.section-title { font-size: 11pt; font-weight: 800; color: #102a43; text-transform: uppercase; border-bottom: 1.5px solid #102a43; padding-bottom: 3px; margin-top: 14px; margin-bottom: 6px; letter-spacing: 0.02em; }' +
      '.bullet-list { margin: 0 0 6px; padding-left: 20px; list-style-type: disc; }' +
      '.bullet-list li { margin-bottom: 3px; font-size: 10.5pt; color: #243e56; text-align: justify; }' +
      '.info-line { font-weight: bold; font-size: 10.5pt; color: #102a43; margin-top: 6px; margin-bottom: 3px; }' +
      '.normal-paragraph { font-size: 10.5pt; color: #243e56; margin: 0 0 6px; text-align: justify; }' +
      'strong { color: #102a43; font-weight: bold; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      convertResumeTextToHTML(editedText) +
      '<script>' +
      'window.onload = function() {' +
      '  window.print();' +
      '  setTimeout(function() {' +
      '    window.frameElement.remove();' +
      '  }, 100);' +
      '};' +
      '</script>' +
      '</body>' +
      '</html>';

    doc.write(htmlContent);
    doc.close();
  };

  const parseSkillsBadges = (skillsArray: string[] | undefined): string[] => {
    if (!skillsArray || !Array.isArray(skillsArray)) return [];
    
    let processed: string[] = [];
    
    skillsArray.forEach(item => {
      if (!item) return;
      
      const itemLower = item.toLowerCase();
      
      if ((item.includes(',') || item.includes(';')) && (item.length > 30 || itemLower.includes('related to') || itemLower.includes('such as') || itemLower.includes('e.g.'))) {
        let listText = item;
        const egi = item.search(/\((e\.g\.|such as)/i);
        if (egi !== -1) {
          const match = item.substring(egi).match(/\((.*?)\)/);
          if (match && match[1]) {
            listText = match[1].replace(/e\.g\.,?\s*|such as\s*/i, '');
          }
        }
        
        const parts = listText.split(/[,;]+/);
        parts.forEach(part => {
          const cleanPart = part.replace(/[()'".*]/g, '').trim();
          if (cleanPart && cleanPart.length > 1 && cleanPart.length < 35 && !/specific|related|skills|begging|e\.g\./i.test(cleanPart)) {
            processed.push(cleanPart);
          }
        });
      } else {
        const clean = item.replace(/[()'".*]/g, '').trim();
        if (clean && clean.length > 1 && clean.length < 35) {
          processed.push(clean);
        }
      }
    });

    processed = Array.from(new Set(processed));
    
    if (processed.length === 0) {
      skillsArray.forEach(item => {
        const clean = item.replace(/[#*]/g, '').trim();
        if (clean) processed.push(clean.substring(0, 40));
      });
    }
    
    return processed.slice(0, 15);
  };

  const handleReset = () => {
    setResult(null);
    setJobDescription('');
    setResumeUrl('');
    removeFile();
  };

  return (
    <div className="tailor-page-container animate-fade-in-up">
      <div className="tailor-stage" aria-hidden="true">
        <div className="stage-glow-left"></div>
        <div className="stage-glow-right"></div>
      </div>

      <header className="tailor-header">
        <div className="tailor-badge">
          <Cpu size={14} /> AI Tailorer Console
        </div>
        <h1 className="tailor-title">Tailor Your Resume to Any Job</h1>
        <p className="tailor-subtitle">
          Upload your CV, paste your target Job Description (JD), and let our artificial corporate recruiter craft a beautifully aligned, ATS-perfect resume.
        </p>
      </header>

      {!result ? (
        <div className="tailor-workspace">
          <div className="tailor-inputs-wrapper glass-card">
            <h2 className="workspace-card-title">1. Upload Your Current CV</h2>

            {/* Mode toggle */}
            <div className="upload-mode-toggle" style={{ marginBottom: '0.75rem' }}>
              <button
                className={`upload-mode-btn${uploadMode === 'file' ? ' active' : ''}`}
                onClick={() => { setUploadMode('file'); setErrorMsg(null); }}
                disabled={loading}
              >
                <Upload size={14} /> Upload File
              </button>
              <button
                className={`upload-mode-btn${uploadMode === 'link' ? ' active' : ''}`}
                onClick={() => { setUploadMode('link'); setErrorMsg(null); }}
                disabled={loading}
              >
                <Link size={14} /> Paste Link
              </button>
            </div>

            {uploadMode === 'file' ? (
              <div
                className={`tailor-upload-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''} ${loading ? 'is-loading' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="tailor-hidden-input"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                {loading ? (
                  <div className="skeleton-loading-state">
                    <div className="skeleton-header-mini">
                      <p className="skeleton-step-label">{loaderSteps[loadingStep]}</p>
                      <div className="sk-loader-progress" style={{ width: 'min(260px,100%)' }}>
                        <div className="sk-loader-progress-fill" style={{ width: `${((loadingStep + 1) / loaderSteps.length) * 100}%` }} />
                      </div>
                    </div>
                    <div className="skeleton-preview">
                      <div className="skeleton-score-row">
                        <div className="skeleton-circle skeleton-pulse" />
                        <div className="skeleton-score-text">
                          <div className="skeleton-mini-line skeleton-pulse" style={{ width: '100px', height: '13px' }} />
                          <div className="skeleton-mini-line skeleton-pulse" style={{ width: '68px', height: '10px' }} />
                        </div>
                      </div>
                      <div className="skeleton-bars-mini">
                        {[85, 70, 58, 44].map((w, i) => (
                          <div key={i} className="skeleton-bar-row-mini">
                            <div className="skeleton-bar-label-mini skeleton-pulse" style={{ width: `${36 + i * 8}px` }} />
                            <div className="skeleton-bar-track-mini">
                              <div className="skeleton-bar-fill-mini skeleton-pulse" style={{ width: `${w}%` }} />
                            </div>
                            <div className="skeleton-bar-pct-mini skeleton-pulse" />
                          </div>
                        ))}
                      </div>
                      <div className="skeleton-chips-mini">
                        <div className="skeleton-chip-mini skeleton-pulse" />
                        <div className="skeleton-chip-mini skeleton-pulse" />
                      </div>
                    </div>
                  </div>
                ) : selectedFile ? (
                  <div className="tailor-file-details">
                    <div className="tailor-file-icon"><FileText size={32} /></div>
                    <div className="tailor-file-meta">
                      <span className="file-name">{selectedFile.name}</span>
                      <span className="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <button className="btn-secondary remove-file-btn" onClick={removeFile}>Remove File</button>
                  </div>
                ) : (
                  <div className="tailor-prompt" onClick={triggerUpload}>
                    <Upload className="upload-icon" />
                    <button className="upload-cta-btn" type="button">Select CV File</button>
                    <p className="file-formats-note">PDF, DOCX, or TXT (Max 5MB)</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="tailor-upload-zone link-input-zone" style={{ cursor: 'default', minHeight: '140px' }}>
                {loading ? (
                  <div className="skeleton-loading-state">
                    <div className="skeleton-header-mini">
                      <p className="skeleton-step-label">{loaderSteps[loadingStep]}</p>
                      <div className="sk-loader-progress" style={{ width: 'min(260px,100%)' }}>
                        <div className="sk-loader-progress-fill" style={{ width: `${((loadingStep + 1) / loaderSteps.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="link-input-state">
                    <Link size={24} className="link-input-icon" />
                    <p className="link-input-label">Paste a shareable link to your CV</p>
                    <input
                      type="url"
                      className="resume-link-input"
                      placeholder="https://drive.google.com/... or any direct PDF/DOCX link"
                      value={resumeUrl}
                      onChange={(e) => setResumeUrl(e.target.value)}
                      disabled={loading}
                    />
                    <p className="link-input-hint">Supports Google Drive, Dropbox, OneDrive, or any direct link</p>
                  </div>
                )}
              </div>
            )}

            <h2 className="workspace-card-title mt-4">2. Paste Target Job Description (JD)</h2>
            <textarea
              className="tailor-textarea"
              placeholder="Paste the target Job Description (JD), key responsibilities, or role guidelines here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={loading}
            />

            {errorMsg && (
              <div className="tailor-error-banner animate-fade-in-up">
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              className="btn-primary tailor-submit-btn"
              onClick={handleTailor}
              disabled={loading || (uploadMode === 'file' ? !selectedFile : !resumeUrl.trim()) || !jobDescription.trim()}
            >
              Tailor Resume <ChevronRight size={18} />
            </button>
          </div>

          <div className="tailor-features-card glass-card">
            <h2 className="features-card-title"><Sparkles size={16} /> Targeted Optimization</h2>
            <p className="features-card-desc">How our AI Tailorer transforms your application to pass the screening:</p>
            
            <div className="features-bullet-list">
              <div className="features-bullet-item">
                <CheckCircle2 className="bullet-icon-check" />
                <div>
                  <strong>Semantic Keyword Alignment:</strong>
                  <p>Injects high-impact terms and technical stack requirements mentioned in the JD naturally into your profile.</p>
                </div>
              </div>
              <div className="features-bullet-item">
                <CheckCircle2 className="bullet-icon-check" />
                <div>
                  <strong>Achievement Tailoring:</strong>
                  <p>Reframes your work history bullets to showcase accomplishments that match the primary responsibilities sought by the hiring team.</p>
                </div>
              </div>
              <div className="features-bullet-item">
                <CheckCircle2 className="bullet-icon-check" />
                <div>
                  <strong>ATS Integrity Protection:</strong>
                  <p>Re-structures the resume sections strictly following standard structural headers (Summary, Skills, Experience, Education).</p>
                </div>
              </div>
            </div>

            <div className="security-guarantee">
              <ShieldCheck size={18} />
              <span>Parsed securely in-memory. Zero data persistency.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="tailor-results-workspace">
          <div className="results-toolbar">
            <button className="btn-secondary reset-workspace-btn" onClick={handleReset}>
              <RefreshCw size={14} /> Start Fresh
            </button>
          </div>

          <div className="results-split-pane">
            {/* Left Pane - Tailored Resume text editor */}
            <div className="results-editor-pane glass-card">
              <div className="pane-header">
                <h3><FileCheck size={18} className="highlight-cyan" /> Optimized Resume Draft</h3>
                <div className="editor-controls">
                  <button 
                    className={`btn-secondary control-btn ${isEditing ? 'active-edit-mode' : ''}`} 
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Done Tweak' : 'Tweak Text'}
                  </button>
                  <button className="btn-secondary control-btn" onClick={handleCopy}>
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? 'Copied' : 'Copy Text'}
                  </button>

                  <div className="download-dropdown-container">
                    <button className="btn-primary control-btn download-toggle-btn">
                      <Download size={14} /> Download <ChevronDown size={12} className="download-arrow" />
                    </button>
                    <div className="download-dropdown-menu glass-card">
                      <button 
                        className="download-dropdown-item"
                        onClick={handleDownloadDocx}
                      >
                        <FileText size={14} className="dropdown-item-icon color-blue" />
                        <span>Word Document (.doc)</span>
                      </button>
                      <button 
                        className="download-dropdown-item"
                        onClick={handleDownloadPDF}
                      >
                        <FileCheck size={14} className="dropdown-item-icon color-cyan" />
                        <span>PDF Document (.pdf)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="editor-workspace-container">
                {isEditing ? (
                  <textarea
                    className="tailored-textarea-editor"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                  />
                ) : (
                  <pre className="tailored-resume-pre">{editedText}</pre>
                )}
              </div>
            </div>

            {/* Right Pane - Tailoring Metrics & Insights */}
            <div className="results-insights-pane">
              {/* Match Score Card */}
              <div className="glass-card match-score-card">
                <div className="gauge-wrapper" style={{ '--percentage': `${result.matchScore}%` } as React.CSSProperties}>
                  <div className="gauge-content">
                    <span className="gauge-number">{result.matchScore}%</span>
                    <span className="gauge-label">Match Score</span>
                  </div>
                </div>
                <div className="score-feedback">
                  <h4>Excellent JD Alignment!</h4>
                  <p>Your resume highlights the core requirements requested in the Job Description, greatly increasing call-back chances.</p>
                </div>
              </div>

              {/* Keyword Badges */}
              {((result.matchedSkills && parseSkillsBadges(result.matchedSkills).length > 0) || 
                (result.missingSkillsRecommended && parseSkillsBadges(result.missingSkillsRecommended).length > 0)) && (
                <div className="glass-card keywords-card">
                  {result.matchedSkills && parseSkillsBadges(result.matchedSkills).length > 0 && (
                    <>
                      <h4><BrainCircuit size={16} /> Matched Skills & Keywords</h4>
                      <div className="keyword-badges-grid">
                        {parseSkillsBadges(result.matchedSkills).map((skill) => (
                          <span key={skill} className="keyword-badge matched">{skill}</span>
                        ))}
                      </div>
                    </>
                  )}

                  {result.missingSkillsRecommended && parseSkillsBadges(result.missingSkillsRecommended).length > 0 && (
                    <>
                      <h4 className={result.matchedSkills && parseSkillsBadges(result.matchedSkills).length > 0 ? "mt-4" : ""}><Sparkles size={16} /> Recommended Additions</h4>
                      <div className="keyword-badges-grid">
                        {parseSkillsBadges(result.missingSkillsRecommended).map((skill) => (
                          <span key={skill} className="keyword-badge missing">{skill}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Action Insights */}
              <div className="glass-card insights-list-card">
                <h4>AI Tailoring Insights</h4>
                <div className="insights-checklist">
                  {result.keyTailoringInsights.map((insight, idx) => (
                    <div key={idx} className="insight-checklist-item">
                      <Check className="check-bullet" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

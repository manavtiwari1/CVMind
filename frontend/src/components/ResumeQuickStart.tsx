import { useRef, useState } from 'react';
import { AlertTriangle, Loader2, Lock } from 'lucide-react';
import { API_BASE } from '../lib/apiBase';
import { getErrorMessage } from '../utils/errors';
import type { ExtractedResume } from '../types/api';
import './ResumeOnboarding.css';
import { authFetch } from '../lib/authFetch';

interface ResumeQuickStartProps {
  templateName: string;
  customApiKey: string;
  /** Extracted resume data, or null to open the template as it is. */
  onDone: (data: ExtractedResume | null) => void;
}

/** Shown when the user picked a template directly: "existing resume?" → upload, or straight to the editor. */
export default function ResumeQuickStart({ templateName, customApiKey, onDone }: ResumeQuickStartProps) {
  const [step, setStep] = useState<'ask' | 'upload'>('ask');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('resume', file);
      // An uploaded resume is copied as written, never rewritten.
      fd.append('exact', 'true');
      const headers: Record<string, string> = {};
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await authFetch(`${API_BASE}/api/resume/parse-data`, { method: 'POST', headers, body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to read your resume.');
      onDone(body.data);
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not read your resume. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ro-page">
      {step === 'ask' ? (
        <div className="ro-center ro-stage ro-quick">
          <p className="ro-quick-tag">Template: <strong>{templateName}</strong></p>
          <h1 className="ro-title">Do you have an existing resume to use as a starting point?</h1>
          <p className="ro-sub">Upload it and we'll fill this template with your details. Or start with the template as it is.</p>
          <div className="ro-actions">
            <button type="button" className="ro-btn ro-btn--green" onClick={() => setStep('upload')}>Yes</button>
            <button type="button" className="ro-btn ro-btn--purple" onClick={() => onDone(null)}>No</button>
          </div>
        </div>
      ) : (
        <div className="ro-center ro-stage ro-quick">
          <h1 className="ro-title">Great. Please upload it for a quick start.</h1>
          <div
            className={`ro-drop${dragOver ? ' is-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f && !busy) upload(f); }}
          >
            <p>Drop your resume here or choose a file.</p>
            <p>.pdf and .docx only.</p>
            <input ref={fileRef} type="file" accept=".pdf,.docx" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
            {busy ? (
              <p className="ro-extracting"><Loader2 size={16} className="ro-spin" /> Reading your resume with AI…</p>
            ) : (
              <button type="button" className="ro-btn ro-btn--green" onClick={() => fileRef.current?.click()}>Upload Resume</button>
            )}
            {error && <p className="ro-error" role="alert"><AlertTriangle size={14} /> {error}</p>}
          </div>
          <p className="ro-privacy"><Lock size={13} /> We never share your data with 3rd parties or use it for AI model training.</p>
          <button type="button" className="ro-link" disabled={busy} onClick={() => setStep('ask')}>← Go back</button>
        </div>
      )}
    </div>
  );
}

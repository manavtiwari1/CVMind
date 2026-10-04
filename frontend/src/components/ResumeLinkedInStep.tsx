import { useRef, useState } from 'react';
import { AlertTriangle, Linkedin, Loader2, Upload } from 'lucide-react';
import { Leo, Stepper } from './ResumeOnboarding';
import { API_BASE } from '../lib/apiBase';
import { getErrorMessage } from '../utils/errors';
import type { ExtractedResume } from '../types/api';
import './ResumeOnboarding.css';
import { authFetch } from '../lib/authFetch';

interface ResumeLinkedInStepProps {
  customApiKey: string;
  onDone: (data: ExtractedResume | null) => void;
}

/** Step 6: optionally pre-fill the resume from the user's LinkedIn profile. */
export default function ResumeLinkedInStep({ customApiKey, onDone }: ResumeLinkedInStepProps) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [offerPdf, setOfferPdf] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const headers = (json: boolean): Record<string, string> => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}),
  });

  const run = async (request: () => Promise<Response>, pdfFallback: boolean) => {
    setBusy(true);
    setError('');
    try {
      const res = await request();
      const body = await res.json();
      if (!res.ok) {
        setOfferPdf(pdfFallback && body.code === 'LINKEDIN_PRIVATE');
        throw new Error(body.error || 'Could not import your LinkedIn profile.');
      }
      onDone(body.data);
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not import your LinkedIn profile.');
    } finally {
      setBusy(false);
    }
  };

  const importUrl = () => run(
    () => authFetch(`${API_BASE}/api/resume/import-linkedin`, { method: 'POST', headers: headers(true), body: JSON.stringify({ url: url.trim() }) }),
    true,
  );

  const importPdf = (file: File) => {
    const fd = new FormData();
    fd.append('resume', file);
    return run(() => authFetch(`${API_BASE}/api/resume/parse-data`, { method: 'POST', headers: headers(false), body: fd }), false);
  };

  return (
    <div className="ro-page">
      <Stepper active={6} />
      <div className="ro-center ro-stage">
        <Leo pose="linkedin" />
        <h1 className="ro-title">Finally, would you like to save time by importing your LinkedIn?</h1>

        <form className="ro-position ro-linkedin" onSubmit={e => { e.preventDefault(); if (url.trim() && !busy) importUrl(); }}>
          <label className="ro-li-field">
            <Linkedin size={16} aria-hidden="true" />
            <input
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); setOfferPdf(false); }}
              placeholder="https://linkedin.com/in/..."
              aria-label="LinkedIn profile link"
              inputMode="url"
              autoFocus
            />
          </label>
          <button type="submit" className="ro-btn ro-btn--green" disabled={!url.trim() || busy}>
            {busy ? <Loader2 size={15} className="ro-spin" /> : 'Import'}
          </button>
        </form>

        {error && <p className="ro-error" role="alert"><AlertTriangle size={14} /> {error}</p>}

        <p className="ro-or">or</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) importPdf(f); e.target.value = ''; }}
        />
        <button
          type="button"
          className={`ro-btn ${offerPdf ? 'ro-btn--purple' : 'ro-btn--outline'}`}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={15} /> Upload LinkedIn PDF
        </button>
        <p className="ro-hint">On LinkedIn: open your profile → More → Save to PDF.</p>

        <button type="button" className="ro-link" disabled={busy} onClick={() => onDone(null)}>Skip This Step</button>
      </div>
    </div>
  );
}

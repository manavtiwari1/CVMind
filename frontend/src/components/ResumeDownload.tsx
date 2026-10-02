import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Link2, Loader2, Search, Sparkles, Target, X, Zap } from 'lucide-react';
import { authFetch } from '../lib/authFetch';
import { API_BASE } from '../lib/apiBase';
import { getErrorMessage } from '../utils/errors';
import { printResume } from '../lib/printPdf';
import './ResumeDownload.css';

interface ResumeDownloadProps {
  defaultName: string;
  paper: 'a4' | 'letter';
  getHtml: () => string;
  getText: () => string;
  customApiKey: string;
  onWord: (fileName: string) => void;
  /** Opens "Check & Tailor" with this job description. */
  onScan: (jobDescription: string) => void;
  onClose: () => void;
}

type Stage = 'choose' | 'working' | 'done' | 'error';

/** Letters, numbers and spaces only, as the hint under the field says. */
const cleanName = (v: string) => v.replace(/[^A-Za-z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 80);

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

export default function ResumeDownload({ defaultName, paper, getHtml, getText, customApiKey, onWord, onScan, onClose }: ResumeDownloadProps) {
  const [name, setName] = useState(() => cleanName(defaultName) || 'My Resume');
  const [stage, setStage] = useState<Stage>('choose');
  const [mode, setMode] = useState<'pdf' | 'email'>('pdf');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [job, setJob] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState('');
  const [blob, setBlob] = useState<Blob | null>(null);
  // True when the server couldn't make the PDF and the browser's print dialog was used instead
  const [printed, setPrinted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileName = (name.trim() || 'My Resume');

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Creep towards 90% while the server works; the response takes it to 100%.
  useEffect(() => {
    if (stage !== 'working') return;
    const t = setInterval(() => setProgress(p => (p < 90 ? p + Math.max(1, Math.round((90 - p) / 9)) : p)), 250);
    return () => clearInterval(t);
  }, [stage]);

  const run = async (kind: 'pdf' | 'email') => {
    setMode(kind);
    setStage('working');
    setProgress(8);
    setError('');
    setPrinted(false);
    // The server can't render PDFs (no browser available): save it through the print dialog instead
    const printInstead = async () => {
      await printResume(getHtml(), fileName, paper);
      setPrinted(true);
      setProgress(100);
      setStage('done');
    };
    try {
      const res = await authFetch(`${API_BASE}/api/resume/${kind === 'pdf' ? 'pdf' : 'email-pdf'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: getHtml(), fileName, paper }),
      });
      if (kind === 'pdf' && res.status === 503) {
        await printInstead();
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || (res.status === 401 ? 'Please sign in again to download.' : 'Could not create the PDF.'));
      }
      if (kind === 'pdf') {
        const pdf = await res.blob();
        setBlob(pdf);
        saveBlob(pdf, `${fileName}.pdf`);
      } else {
        const body = await res.json();
        setSentTo(body.email || 'your email');
      }
      setProgress(100);
      setStage('done');
    } catch (err) {
      setError(getErrorMessage(err) || 'Something went wrong.');
      setStage('error');
    }
  };

  const downloadTxt = () => saveBlob(new Blob([getText()], { type: 'text/plain;charset=utf-8' }), `${fileName}.txt`);

  const scan = async () => {
    const text = job.trim();
    setScanError('');
    if (!text) return;
    if (/^https?:\/\//i.test(text)) {
      setScanBusy(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (customApiKey) headers['x-gemini-key'] = customApiKey;
        const res = await authFetch(`${API_BASE}/api/auto-apply/scrape-job`, { method: 'POST', headers, body: JSON.stringify({ url: text }) });
        const body = await res.json();
        const d = body?.data;
        // The scraper falls back to placeholder text when it cannot read a page; only trust a real description.
        if (!res.ok || !d || d.source !== 'ai_scraper' || !d.description || d.description.length < 150) {
          throw new Error("We couldn't read that link. Paste the job description text instead.");
        }
        onScan([`${d.title || ''}${d.company ? ` at ${d.company}` : ''}`, d.description, d.skills?.length ? `Skills: ${d.skills.join(', ')}` : ''].filter(Boolean).join('\n\n'));
      } catch (err) {
        setScanError(getErrorMessage(err) || "We couldn't read that link.");
      } finally {
        setScanBusy(false);
      }
      return;
    }
    if (text.length < 60) { setScanError('Paste a bit more of the job description so we can compare it.'); return; }
    onScan(text);
  };

  return createPortal(
    <div className="rd-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rd-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="rd-title">
        <button type="button" className="rd-x" onClick={onClose} aria-label="Close"><X size={20} /></button>

        {stage === 'choose' ? (
          <>
            <h2 id="rd-title">Download Your Resume</h2>
            <p className="rd-sub">Please select the file format you'd like to download:</p>
            <label className="rd-label" htmlFor="rd-name">File name</label>
            <div className="rd-name">
              <input id="rd-name" value={name} onChange={e => setName(cleanName(e.target.value))} autoFocus />
              <span>.pdf</span>
            </div>
            <p className="rd-hint">Letters, numbers and spaces are allowed. Special characters are removed automatically.</p>
            <div className="rd-actions">
              <button type="button" className="rd-btn rd-btn--green" onClick={() => run('pdf')}>Download as PDF</button>
              <button type="button" className="rd-btn rd-btn--outline" onClick={() => run('email')}>Send PDF to Your Email</button>
            </div>
            <div className="rd-links">
              <button type="button" onClick={downloadTxt}>Download as TXT</button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => onWord(fileName)}>Download as Word</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="rd-title">
              {stage === 'working' && 'Preparing the file'}
              {stage === 'done' && (mode === 'pdf' ? 'Your resume is ready' : 'Sent to your inbox')}
              {stage === 'error' && 'Something went wrong'}
            </h2>
            {stage === 'error' ? (
              <div className="rd-error" role="alert">
                <AlertTriangle size={16} /> {error}
                <div className="rd-actions">
                  <button type="button" className="rd-btn rd-btn--green" onClick={() => run(mode)}>Try again</button>
                  <button type="button" className="rd-btn rd-btn--outline" onClick={() => setStage('choose')}>Back</button>
                </div>
              </div>
            ) : (
              <>
                <p className="rd-progress-label" aria-live="polite">
                  {stage === 'done'
                    ? (mode === 'email'
                      ? <><CheckCircle2 size={16} /> PDF sent to {sentTo}</>
                      : printed
                        ? <><CheckCircle2 size={16} /> Choose "Save as PDF" in the print window</>
                        : <><CheckCircle2 size={16} /> {fileName}.pdf downloaded</>)
                    : `${progress}% Complete...`}
                </p>
                <div className="rd-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${progress}%` }} />
                </div>
              </>
            )}

            <section className="rd-bonus" aria-label="Check your resume against a job">
              <span className="rd-chip"><Zap size={13} /> Bonus step</span>
              <h3>Will it beat the ATS?</h3>
              <p>Don't guess. Paste your target job link or description to see missing keywords and tailor your resume to it.</p>
              <ul>
                <li><Target size={15} /> Match check</li>
                <li><Search size={15} /> Keyword gaps</li>
                <li><Sparkles size={15} /> Tailored suggestions</li>
              </ul>
              <form className="rd-scan" onSubmit={e => { e.preventDefault(); scan(); }}>
                <label className="rd-scan-field">
                  <Link2 size={16} aria-hidden="true" />
                  <input value={job} onChange={e => { setJob(e.target.value); setScanError(''); }} placeholder="Paste a job URL (https://) or the full job description" aria-label="Job URL or description" />
                </label>
                <button type="submit" className="rd-btn rd-btn--green" disabled={!job.trim() || scanBusy}>
                  {scanBusy ? <Loader2 size={15} className="rd-spin" /> : 'Scan Now'}
                </button>
              </form>
              {scanError && <p className="rd-scan-error"><AlertTriangle size={13} /> {scanError}</p>}
            </section>

            {mode === 'pdf' && stage !== 'error' && !printed && (
              <p className="rd-foot">
                * If the download doesn't start automatically in a few seconds, please{' '}
                <button type="button" disabled={!blob} onClick={() => blob && saveBlob(blob, `${fileName}.pdf`)}>click here</button>.
              </p>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

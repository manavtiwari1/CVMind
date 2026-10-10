import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, ExternalLink, Loader2, Users, X } from 'lucide-react';
import { getReferralAsk, markReferralSent, writeReferral, type ReferralMessages } from '../../lib/growthApi';
import { getErrorMessage } from '../../utils/errors';
import { appliedOn } from './format';
import type { FinderJob } from './jobFinderApi';
import '../../components/growth/growth.css';

// "Find a referral": find someone at the company on LinkedIn, then copy a connection note and a
// referral request written for this job and the user's resume.

const RELATIONS = [
  { value: '', label: "I don't know them yet" },
  { value: 'We went to the same college', label: 'Same college' },
  { value: 'We worked together before', label: 'Worked together before' },
  { value: 'We work in the same field', label: 'Same field or community' },
  { value: 'They are a recruiter at the company', label: 'Recruiter at the company' },
];
const TONES = ['Warm', 'Formal', 'Short and direct'];

function CopyCard({ label, text, limit }: { label: string; text: string; limit?: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt(`Copy the ${label.toLowerCase()}`, text);
    }
  };
  return (
    <div className="rf-card">
      <div className="rf-card-head">
        <strong>{label}</strong>
        {limit && <span className={text.length > limit ? 'rf-over' : ''}>{text.length}/{limit}</span>}
        <button type="button" className="jf-btn jf-btn--ghost jf-btn--sm" onClick={copy}>
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>
      <p>{text}</p>
    </div>
  );
}

interface ReferralDialogProps {
  job: FinderJob;
  onClose: () => void;
}

export default function ReferralDialog({ job, onClose }: ReferralDialogProps) {
  const [targetName, setTargetName] = useState('');
  const [relation, setRelation] = useState('');
  const [tone, setTone] = useState('Warm');
  const [messages, setMessages] = useState<ReferralMessages | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<'write' | 'sent' | null>(null);
  const [error, setError] = useState('');

  const peopleUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${job.company} ${job.title}`)}`;
  const companyUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(job.company)}`;

  useEffect(() => {
    let alive = true;
    getReferralAsk(job.jobKey).then(ask => { if (alive && ask?.sentAt) setSentAt(ask.sentAt); }).catch(() => {});
    return () => { alive = false; };
  }, [job.jobKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const write = async () => {
    setBusy('write');
    setError('');
    try {
      const res = await writeReferral({ jobKey: job.jobKey, targetName: targetName.trim(), relation, tone });
      setMessages(res.messages);
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not write the messages. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const markSent = async () => {
    setBusy('sent');
    try {
      setSentAt((await markReferralSent(job.jobKey)).sentAt);
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not save that.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="gd-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gd-box wide" role="dialog" aria-modal="true" aria-labelledby="referral-title">
        <button type="button" className="gd-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className="gd-head">
          <span className="gd-icon"><Users size={18} /></span>
          <div>
            <h2 id="referral-title">Find a referral</h2>
            <p>{job.title} at {job.company}</p>
          </div>
        </div>

        <ol className="rf-steps">
          <li>
            <strong>Find someone at {job.company}</strong>
            <p>People who do this kind of work, or anyone from your college or past company. LinkedIn's "School" and "Past company" filters help.</p>
            <div className="rf-links">
              <a className="jf-btn jf-btn--ghost jf-btn--sm" href={peopleUrl} target="_blank" rel="noopener noreferrer">People in this role <ExternalLink size={13} /></a>
              <a className="jf-btn jf-btn--ghost jf-btn--sm" href={companyUrl} target="_blank" rel="noopener noreferrer">Everyone at {job.company} <ExternalLink size={13} /></a>
            </div>
          </li>
          <li>
            <strong>Tell us about them (optional)</strong>
            <div className="rf-form">
              <label>
                <span>First name</span>
                <input value={targetName} onChange={e => setTargetName(e.target.value)} maxLength={80} placeholder="e.g. Asha" />
              </label>
              <label>
                <span>How you know them</span>
                <select value={relation} onChange={e => setRelation(e.target.value)}>
                  {RELATIONS.map(r => <option key={r.label} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              <label>
                <span>Tone</span>
                <select value={tone} onChange={e => setTone(e.target.value)}>
                  {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </div>
            <button type="button" className="jf-btn jf-btn--primary" onClick={write} disabled={busy !== null}>
              {busy === 'write' && <Loader2 size={15} className="jf-spin" />} {messages ? 'Write them again' : 'Write my messages'}
            </button>
          </li>
          {messages && (
            <li>
              <strong>Send them on LinkedIn</strong>
              <div className="rf-cards">
                <CopyCard label="Connection note" text={messages.connectionRequest} limit={300} />
                <CopyCard label="Referral request" text={messages.referralPitch} />
                <CopyCard label="Follow-up, a week later" text={messages.followUp} />
              </div>
              <p className="jf-muted">Saved in My Documents as outreach messages.</p>
            </li>
          )}
        </ol>

        {sentAt ? (
          <p className="rf-sent"><CheckCircle2 size={16} /> You asked for a referral on {appliedOn(sentAt)}.</p>
        ) : messages && (
          <button type="button" className="jf-btn jf-btn--ghost rf-sent-btn" onClick={markSent} disabled={busy !== null}>
            {busy === 'sent' && <Loader2 size={15} className="jf-spin" />} I sent it
          </button>
        )}

        {error && <p className="gd-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { API_BASE } from '../lib/apiBase';
import { authFetch } from '../lib/authFetch';
import './ReportContent.css';

const REASONS = ['Spam or scam', 'Offensive or hateful', 'Someone else\'s personal information', 'Copyright', 'Something else'];

// "Report" link for public user content. Reports land in Admin → Moderation.
export default function ReportContent({ targetType, targetId }: { targetType: 'work' | 'job' | 'problem'; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    setState('sending');
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, details })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send the report.');
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the report.');
      setState('idle');
    }
  };

  return (
    <>
      <button type="button" className="rc-link" onClick={() => setOpen(true)}><Flag size={12} /> Report</button>
      {open && (
        <div className="rc-overlay" onClick={() => setOpen(false)}>
          <div className="rc-dialog" role="dialog" aria-modal="true" aria-labelledby="rc-title" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="rc-close" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
            {state === 'sent' ? (
              <>
                <h2 id="rc-title">Thanks for letting us know</h2>
                <p className="rc-text">Our team will review it. You won't hear back unless we need more details.</p>
                <button type="button" className="rc-btn" onClick={() => setOpen(false)}>Close</button>
              </>
            ) : (
              <>
                <h2 id="rc-title">Report this page</h2>
                <p className="rc-text">What's wrong with it?</p>
                <div className="rc-reasons">
                  {REASONS.map((r) => (
                    <label key={r} className="rc-reason">
                      <input type="radio" name="rc-reason" checked={reason === r} onChange={() => setReason(r)} /> {r}
                    </label>
                  ))}
                </div>
                <textarea className="rc-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder="Anything else we should know? (optional)" />
                {error && <p className="rc-error" role="alert">{error}</p>}
                <button type="button" className="rc-btn" disabled={!reason || state === 'sending'} onClick={submit}>
                  {state === 'sending' ? 'Sending…' : 'Send report'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

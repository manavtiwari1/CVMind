import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, Clock, Loader2, X, XCircle } from 'lucide-react';
import { formatInr, loadRefundStatus, requestRefund, type RefundRequestView, type RefundStatus } from '../lib/billing';
import './CancelSubscription.css';

const dateIn = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Account → Billing: cancel a Monthly plan with a refund request, and the state of the last request.
// Payments are non-refundable; the team reviews each request by hand.
export default function CancelSubscription({ isPro, setCurrentPage }: { isPro: boolean; setCurrentPage: (page: string) => void }) {
  const [status, setStatus] = useState<RefundStatus | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRefundStatus().then((s) => { if (!cancelled) setStatus(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!status) return null;
  const policy = <button type="button" className="acct-link inline" onClick={() => setCurrentPage('refund-policy')}>refund policy</button>;

  return (
    <div className="cs">
      {status.request && <RequestState request={status.request} />}

      {status.canRequest && status.plan && (
        <div className="cs-box">
          <div>
            <h2 className="cs-title">Cancel subscription</h2>
            <p className="cs-text">
              Payments are non-refundable. If you have a genuine reason, such as being charged twice or a Pro feature not working for you,
              you can cancel your Monthly plan and ask for a refund. Our team reviews every request by hand. Read the {policy}.
            </p>
          </div>
          <button type="button" className="acct-btn ghost cs-open" onClick={() => setOpen(true)}>Cancel subscription</button>
        </div>
      )}

      {!status.canRequest && !status.request && isPro && (
        <p className="acct-billing-note">
          Payments are non-refundable. Cancelling with a refund request is only available on the Monthly plan, for a genuine reason. Read the {policy}.
        </p>
      )}

      {open && status.plan && (
        <RequestDialog
          status={status}
          onClose={() => setOpen(false)}
          onSent={(request) => { setStatus({ ...status, canRequest: false, request }); setOpen(false); }}
          policy={policy}
        />
      )}
    </div>
  );
}

function RequestState({ request }: { request: RefundRequestView }) {
  if (request.status === 'pending') {
    return (
      <div className="cs-state is-pending" role="status">
        <Clock size={18} />
        <div>
          <strong>Your refund request is being reviewed</strong>
          <p>Sent on {dateIn(request.createdAt)} for your {request.plan} plan ({formatInr(request.amount)}). We'll email you within 3 working days. Pro stays active while we review it.</p>
        </div>
      </div>
    );
  }
  if (request.status === 'approved') {
    return (
      <div className="cs-state is-ok" role="status">
        <CheckCircle2 size={18} />
        <div>
          <strong>Refund approved</strong>
          <p>We started a refund of {formatInr(request.amount)}{request.decidedAt ? ` on ${dateIn(request.decidedAt)}` : ''}. It usually reaches the account or card you paid with within 5 to 7 working days.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="cs-state is-bad" role="status">
      <XCircle size={18} />
      <div>
        <strong>We couldn't approve your refund request</strong>
        <p>{request.note ? `Our note: ${request.note}` : 'Payments are non-refundable and this request did not qualify.'} Your plan stays active until it ends.</p>
      </div>
    </div>
  );
}

function RequestDialog({ status, onClose, onSent, policy }: {
  status: RefundStatus;
  onClose: () => void;
  onSent: (request: RefundRequestView) => void;
  policy: ReactNode;
}) {
  const plan = status.plan!;
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const short = details.trim().length < status.minDetails;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sending) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const send = async () => {
    setSending(true);
    setError('');
    try {
      onSent(await requestRefund({ category, details: details.trim(), acknowledged }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your request.');
      setSending(false);
    }
  };

  return (
    <div className="acct-modal-overlay" onClick={() => !sending && onClose()}>
      <div className="acct-modal cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-title" onClick={(e) => e.stopPropagation()}>
        <button className="acct-modal-close" onClick={onClose} aria-label="Close" disabled={sending}><X size={18} /></button>
        <h2 id="cs-title" className="acct-modal-title cs-modal-title">Cancel subscription</h2>
        <p className="acct-modal-text">
          {plan.label} plan · {formatInr(plan.amount)}{plan.expiresAt ? ` · Pro until ${dateIn(plan.expiresAt)}` : ''}
        </p>

        <div className="cs-policy">
          <strong>Payments on CVMind are non-refundable.</strong> A refund is only given for a genuine reason, after our team reviews your
          request by hand. If it is approved, the refund is started, your Pro plan ends and the money reaches you in 5 to 7 working days.
          Nothing changes until then. Read the {policy}.
        </div>

        <label className="acct-label" htmlFor="cs-category">Reason</label>
        <select id="cs-category" className="acct-input acct-select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={sending}>
          <option value="">Pick a reason</option>
          {Object.entries(status.categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>

        <label className="acct-label" htmlFor="cs-details">What happened?</label>
        <textarea
          id="cs-details"
          className="acct-input cs-textarea"
          rows={4}
          maxLength={1000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Tell us what went wrong, with any details that help us check it (for example the feature, the date, or the two payment IDs)."
          disabled={sending}
        />
        <span className={`cs-count${short && details ? ' is-short' : ''}`}>
          {short ? `At least ${status.minDetails} characters (${details.trim().length} so far)` : `${details.trim().length} / 1000`}
        </span>

        <label className="cs-check">
          <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} disabled={sending} />
          <span>I understand that payments are non-refundable and a refund is only given if the team approves my request.</span>
        </label>

        {error && <span className="acct-msg error">{error}</span>}
        <div className="acct-actions end">
          <button className="acct-btn ghost" onClick={onClose} disabled={sending}>Keep my plan</button>
          <button className="acct-btn danger" disabled={!category || short || !acknowledged || sending} onClick={send}>
            {sending ? <Loader2 size={15} className="acct-spin" /> : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, MonitorPlay, Puzzle, RefreshCw, Save, Send } from 'lucide-react';
import type { AgentApplication, ReviewData } from '../../types/agent';
import { ApiError, getReview, startServerFill, submitApplication, updateFillPlan, fetchArtifact } from '../../lib/agentApi';
import './ReviewPanel.css';

const HANDOFF_REASONS: Record<string, string> = {
  captcha: 'This form uses a CAPTCHA, which only a person can pass.',
  login_required: 'This site asks you to sign in first.',
  unsupported_site: 'CVMind can only fill Greenhouse and Lever forms on the server.',
  workday_account: 'Workday applications need an account with that employer, so they have to be filled in your own browser.',
  adapter_disabled: 'Server filling is switched off for this site right now.',
  browser_unavailable: 'The server has no browser available to fill forms.',
  form_changed: 'The form changed after it was filled, so nothing was submitted.',
  values_not_applied: 'The answers did not stay in the form, so nothing was submitted.',
  no_url: 'This job has no application link to open.'
};

interface ReviewPanelProps {
  application: AgentApplication;
  busy: boolean;
  onChanged: (updated: AgentApplication) => void;
}

export default function ReviewPanel({ application, busy, onChanged }: ReviewPanelProps) {
  const [review, setReview] = useState<ReviewData | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const filledAt = application.fill?.filledAt;
  useEffect(() => {
    if (!application.fill?.planHash) return;
    let cancelled = false;
    getReview(application.id)
      .then(data => { if (!cancelled) { setReview(data); setEdits({}); } })
      .catch(e => { if (!cancelled) setMessage({ tone: 'error', text: e.message }); });
    return () => { cancelled = true; };
  }, [application.id, filledAt, application.fill?.planHash]);

  // Screenshots are private, so they are fetched with the session token and shown from a blob URL
  const screenshotUrl = review?.screenshotUrl;
  useEffect(() => {
    if (!screenshotUrl) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchArtifact(screenshotUrl)
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setScreenshot(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [screenshotUrl]);

  const act = async (label: string, action: () => Promise<void>) => {
    setWorking(label); setMessage(null);
    try {
      await action();
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Something went wrong.' });
    } finally {
      setWorking('');
    }
  };

  const onStartFill = () => act('fill', async () => {
    onChanged(await startServerFill(application.id));
    setMessage({ tone: 'ok', text: 'CVMind is opening the form and filling it. You will review it before anything is sent.' });
  });

  const onSaveEdits = () => act('save', async () => {
    const changed = Object.entries(edits).map(([selector, value]) => ({ selector, value }));
    if (!changed.length) return;
    const updated = await updateFillPlan(application.id, changed);
    setReview(current => (current ? { ...current, planHash: updated.planHash, items: updated.items, approved: false } : current));
    setEdits({});
    setMessage({ tone: 'ok', text: 'Saved. Check the answers once more, then submit.' });
  });

  const onSubmit = () => {
    if (!review) return;
    if (!window.confirm('Submit this application? CVMind will send the answers exactly as shown.')) return;
    act('submit', async () => {
      try {
        await submitApplication(application.id, review.planHash);
        setMessage({ tone: 'ok', text: 'Submitting. The result will appear here in a moment.' });
      } catch (e) {
        if (e instanceof ApiError && e.code === 'PLAN_CHANGED') {
          setReview(await getReview(application.id));
          setMessage({ tone: 'error', text: 'These answers changed since you reviewed them. Check them again.' });
          return;
        }
        throw e;
      }
    });
  };

  const disabled = busy || !!working;
  const fill = application.fill;
  const dirty = Object.keys(edits).length > 0;

  // Nothing filled yet: offer it, unless the site already went to the extension
  if (!fill?.planHash) {
    return (
      <section className="aa-review">
        <h4 className="aa-score-subtitle"><MonitorPlay size={15} /> Let CVMind fill the form</h4>
        {fill?.handoff ? (
          <div className="aa-resume-warning">
            <Puzzle size={16} />
            <span>{HANDOFF_REASONS[fill.blockedReason || ''] || 'This form needs your own browser.'} Use the CVMind extension on the job page instead.</span>
          </div>
        ) : (
          <>
            <p className="aa-label-hint">CVMind opens the application in a server browser, fills it from your tailored documents, and shows you a screenshot. Nothing is sent until you approve it.</p>
            <button className="aa-btn-ghost aa-btn-sm" disabled={disabled} onClick={onStartFill}>
              {working === 'fill' ? <RefreshCw size={14} className="aa-spin" /> : <MonitorPlay size={14} />} Fill it for me
            </button>
          </>
        )}
        {message && <div className={message.tone === 'ok' ? 'aa-resume-notice' : 'aa-error'}>{message.tone === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {message.text}</div>}
      </section>
    );
  }

  return (
    <section className="aa-review">
      <div className="aa-review-head">
        <div>
          <h4 className="aa-score-subtitle"><Eye size={15} /> Review before submitting</h4>
          <p className="aa-label-hint">
            Filled {fill.filled} field{fill.filled === 1 ? '' : 's'} on the {fill.adapter} form
            {fill.needsReview > 0 && ` · ${fill.needsReview} need${fill.needsReview === 1 ? 's' : ''} your check`}
            {fill.unmappedRequired > 0 && ` · ${fill.unmappedRequired} required field${fill.unmappedRequired === 1 ? '' : 's'} left empty`}
          </p>
        </div>
        {application.status === 'ready_for_review' && !fill.handoff && (
          <button className="aa-btn-primary aa-btn-sm" disabled={disabled || dirty} onClick={onSubmit} title={dirty ? 'Save your changes first' : undefined}>
            {working === 'submit' ? <RefreshCw size={14} className="aa-spin" /> : <Send size={14} />} Submit application
          </button>
        )}
      </div>

      {message && <div className={message.tone === 'ok' ? 'aa-resume-notice' : 'aa-error'}>{message.tone === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {message.text}</div>}

      {!!review?.unmappedRequired.length && (
        <div className="aa-resume-warning">
          <AlertCircle size={16} />
          <span>These required fields are still empty and the site will reject the form without them: {review.unmappedRequired.map(item => item.label).join(', ')}. Fill them in your browser instead.</span>
        </div>
      )}

      {screenshot && (
        <a className="aa-review-shot" href={screenshot} target="_blank" rel="noopener noreferrer" title="Open full screenshot">
          <img src={screenshot} alt="Screenshot of the filled application form" />
        </a>
      )}

      {review && (
        <table className="aa-review-table">
          <thead>
            <tr><th>Field</th><th>Answer</th></tr>
          </thead>
          <tbody>
            {review.items.map(item => (
              <tr key={item.selector} className={item.requiresReview ? 'needs-review' : ''}>
                <td>
                  <span className="aa-review-label">{item.label}</span>
                  {item.requiresReview && <span className="aa-review-flag">{item.sensitive ? 'sensitive' : 'check this'}</span>}
                  {item.reason && <small>{item.reason}</small>}
                </td>
                <td>
                  {item.action === 'upload' ? (
                    <span className="aa-label-hint">Your tailored resume PDF</span>
                  ) : (
                    <input
                      className="aa-input"
                      value={edits[item.selector] ?? item.value}
                      readOnly={application.status !== 'ready_for_review'}
                      onChange={e => setEdits(current => ({ ...current, [item.selector]: e.target.value }))}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dirty && (
        <div className="aa-resume-savebar">
          <span>You changed {Object.keys(edits).length} answer(s)</span>
          <button className="aa-btn-ghost aa-btn-sm" disabled={disabled} onClick={() => setEdits({})}>Discard</button>
          <button className="aa-btn-primary aa-btn-sm" disabled={disabled} onClick={onSaveEdits}>
            {working === 'save' ? <RefreshCw size={14} className="aa-spin" /> : <Save size={14} />} Save answers
          </button>
        </div>
      )}
    </section>
  );
}

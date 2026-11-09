import { useState } from 'react';
import { Check, ExternalLink, Loader2, MapPin, Plug, Save, Trash2 } from 'lucide-react';
import ResultCard, { CopyButton, type CardActions } from './cards';
import { ResumeResult, TemplatePicker } from './flowCards';
import {
  cancelReminder, connectTool, markApplied, saveResumeText,
  type ApplyPackCard, type ConnectCard, type DocumentCard, type JobPickCard, type RemindersCard, type TailorCard, type WritingCard
} from './chatApi';

// Cards for Leo Agent Mode: finished writing, the job picker, the apply pack and reminders.

// Leo needs a tool that isn't connected: one tap connects it and runs the request again
export function ConnectView({ card, actions, live, busy }: { card: ConnectCard; actions: CardActions; live: boolean; busy: boolean }) {
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');
  const [error, setError] = useState('');
  const go = async () => {
    setState('working');
    setError('');
    try {
      const list = await connectTool(card.connector.id);
      setState('done');
      actions.connectorsChanged(list.filter((c) => c.connected).length);
      actions.retryLast();
    } catch (err) {
      setError((err as Error).message);
      setState('idle');
    }
  };
  return (
    <div className="lk-ask">
      <span className="lk-icon" aria-hidden="true"><Plug size={18} /></span>
      <span className="lk-text"><strong>Connect {card.connector.label}</strong><small>{card.connector.description}</small></span>
      {state === 'done'
        ? <span className="lc-text lc-saved"><Check size={14} /> Connected</span>
        : <button type="button" className="lc-btn lc-btn-primary" disabled={!live || busy || state === 'working'} onClick={() => void go()}>{state === 'working' ? <Loader2 size={14} className="lx-spin" /> : 'Connect'}</button>}
      {error && <p className="lm-message lm-bad" role="alert">{error}</p>}
    </div>
  );
}

// Anything Leo wrote: a list of blocks to read and copy
export function WritingView({ card }: { card: WritingCard }) {
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const saveAsResume = async (text: string) => {
    setError('');
    try {
      await saveResumeText(text);
      setSaved(text);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <>
      <div className="lc-kicker">{card.kicker}</div>
      {(card.title || typeof card.score === 'number') && <div className="lc-title">{card.title}{typeof card.score === 'number' && card.score > 0 ? `${card.title ? ' · ' : ''}${Math.round(card.score)}/100` : ''}</div>}
      {card.blocks.map((b) => (
        <div key={b.title} className="lc-section lw-block">
          <h4>{b.title}</h4>
          <p className="lw-text">{b.text}</p>
          {(b.copy || b.saveAsResume) && (
            <div className="lc-actions">
              {b.copy && <CopyButton text={b.text} />}
              {b.saveAsResume && (saved === b.text
                ? <span className="lc-text lc-saved"><Check size={14} /> Saved as your resume</span>
                : <button type="button" className="lc-btn" onClick={() => void saveAsResume(b.text)}><Save size={15} /> Use as my saved resume</button>)}
            </div>
          )}
        </div>
      ))}
      {error && <p className="lm-message lm-bad" role="alert">{error}</p>}
    </>
  );
}

// The ranked jobs. With onToggle the user is picking; without it the list is a record.
export function JobPickView({ card, selected = [], onToggle }: { card: JobPickCard; selected?: string[]; onToggle?: (jobKey: string) => void }) {
  if (!card.jobs.length) return <p className="lc-text">No open jobs matched {card.query}. Try another role or city.</p>;
  const full = selected.length >= card.maxPicks;
  return (
    <div className="lj-list">
      <div className="lc-kicker">{card.jobs.length} jobs for {card.query}{card.location ? ` in ${card.location}` : ''}{onToggle ? ` · pick up to ${card.maxPicks}` : ''}</div>
      {card.jobs.map((j) => {
        const on = selected.includes(j.jobKey);
        const body = (
          <>
            <span className="lj-main">
              <strong>{j.title}</strong>
              <small>{j.company}{j.location && <> · <MapPin size={11} /> {j.location}</>}{j.remote && ' · Remote'}</small>
              {j.missing.length > 0 && <small>Missing: {j.missing.join(', ')}</small>}
            </span>
            {typeof j.score === 'number' && <span className="lj-score">{Math.round(j.score)}%</span>}
          </>
        );
        return onToggle
          ? <button key={j.jobKey} type="button" className={`lj-job ${on ? 'is-on' : ''}`} aria-pressed={on} disabled={!on && full} onClick={() => onToggle(j.jobKey)}>{body}</button>
          : <div key={j.jobKey} className="lj-job">{body}</div>;
      })}
    </div>
  );
}

// Everything for one application. The user opens the job, applies, and says so.
export function ApplyPackView({ card, actions, fresh, busy }: { card: ApplyPackCard; actions: CardActions; fresh: boolean; busy: boolean }) {
  const [applied, setApplied] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const { job, referral } = card;

  const confirm = async () => {
    setSending(true);
    setError('');
    try {
      await markApplied(job.jobKey);
      setApplied(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="lj-pack">
      <div>
        <div className="lc-kicker">Apply pack</div>
        <div className="lc-title">{job.title} at {job.company}</div>
        {job.location && <p className="lc-text">{job.location}{typeof job.score === 'number' ? ` · ${Math.round(job.score)}% match` : ''}</p>}
      </div>
      {card.changes.length > 0 && (
        <div className="lc-section">
          <h4>What Leo changed from your resume. Please check these.</h4>
          <ul>{card.changes.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}
      <ResultCard card={card.tailor} actions={actions} live={false} fresh={fresh} busy={busy} />
      <ResultCard card={card.letter} actions={actions} live={false} fresh={fresh} busy={busy} />
      {referral && (
        <div className="lc-section lw-block">
          <h4>Ask someone there for a referral</h4>
          <p className="lw-text">{referral.referralPitch}</p>
          <div className="lc-actions"><CopyButton text={referral.referralPitch} /></div>
        </div>
      )}
      <p className="lc-text">The CVMind browser extension can fill the form from this pack. You check it and press Submit.</p>
      {error && <p className="lm-message lm-bad" role="alert">{error}</p>}
      <div className="lc-actions lm-actions">
        {job.applyUrl && <a className="lc-btn lc-btn-primary" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Open the application <ExternalLink size={14} /></a>}
        {applied
          ? <span className="lc-text lc-saved"><Check size={14} /> Marked as applied</span>
          : <button type="button" className="lc-btn" disabled={sending} onClick={() => void confirm()}>{sending ? <Loader2 size={15} className="lx-spin" /> : <Check size={15} />} I applied</button>}
      </div>
    </div>
  );
}

export function RemindersView({ card }: { card: RemindersCard }) {
  const [items, setItems] = useState(card.items);
  const [error, setError] = useState('');
  const cancel = async (id: string) => {
    setError('');
    try {
      await cancelReminder(id);
      setItems((list) => list.filter((r) => r.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <>
      <div className="lc-kicker">Reminders by email</div>
      {items.length === 0 && <p className="lc-text">No reminders set.</p>}
      {items.map((r) => (
        <div key={r.id} className="lj-reminder">
          <span className="lj-main">
            <strong>{r.text}</strong>
            <small>{new Date(r.dueAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small>
          </span>
          <button type="button" className="lc-btn" onClick={() => void cancel(r.id)}><Trash2 size={14} /> Cancel</button>
        </div>
      ))}
      {error && <p className="lm-message lm-bad" role="alert">{error}</p>}
    </>
  );
}

// Turns a tailored resume into a real document: pick a template, then the usual preview and downloads
export function TailorDocument({ card, actions }: { card: TailorCard; actions: CardActions }) {
  const [templateId, setTemplateId] = useState(card.html ? card.templateId || '' : '');
  const [picking, setPicking] = useState(false);
  const { data } = card;
  if (!data) return null;

  if (templateId) {
    const documentCard: DocumentCard = {
      type: 'document',
      id: card.id || 'tailored-resume',
      product: 'tailor',
      title: `${data.personalInfo?.fullName || 'My'} Tailored Resume`.slice(0, 120),
      templateId,
      data,
      // A tailored resume is already written; the template must not rewrite it
      keepFacts: true,
      html: card.html,
      workId: card.workId,
    };
    return <ResumeResult card={documentCard} fresh actions={actions} />;
  }
  if (picking) {
    return (
      <TemplatePicker
        card={{ type: 'template_picker', product: 'tailor', selected: '' }}
        live
        busy={false}
        actions={{ ...actions, tap: (_action, value) => { setTemplateId(value.templateId); setPicking(false); } }}
      />
    );
  }
  return <button type="button" className="lc-btn lc-btn-primary" onClick={() => setPicking(true)}>Make this my resume</button>;
}

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Download, ExternalLink, RefreshCw, Save, Send, Sparkles } from 'lucide-react';
import type { AgentApplication, TailoredDocuments, TailoredEditPayload } from '../../types/agent';
import { ApiError, downloadTailoredPdf, getTailored, markApplicationSubmitted, updateTailored } from '../../lib/agentApi';
import './TailoredPreview.css';

interface Draft {
  headline: string;
  summary: string;
  experience: Record<string, string>;
  projects: Record<string, string>;
  skills: string;
  coverSubject: string;
  coverBody: string;
}

const bulletsToText = (group: { id: string; bullets: { text: string }[] }[]) =>
  Object.fromEntries(group.map(item => [item.id, item.bullets.map(bullet => bullet.text).join('\n')]));

function toDraft(docs: TailoredDocuments): Draft {
  return {
    headline: docs.resume.headline,
    summary: docs.resume.summary,
    experience: bulletsToText(docs.resume.experience),
    projects: bulletsToText(docs.resume.projects),
    skills: docs.resume.skills.join(', '),
    coverSubject: docs.coverLetter.subject,
    coverBody: docs.coverLetter.body
  };
}

function toPayload(draft: Draft, docs: TailoredDocuments): TailoredEditPayload {
  return {
    headline: draft.headline,
    summary: draft.summary,
    experience: docs.resume.experience.map(role => ({ id: role.id, bullets: (draft.experience[role.id] ?? '').split('\n') })),
    projects: docs.resume.projects.map(project => ({ id: project.id, bullets: (draft.projects[project.id] ?? '').split('\n') })),
    skills: draft.skills.split(','),
    coverLetter: { subject: draft.coverSubject, body: draft.coverBody }
  };
}

interface TailoredPreviewProps {
  application: AgentApplication;
  busy: boolean;
  onSubmitted: (updated: AgentApplication) => void;
}

export default function TailoredPreview({ application, busy, onSubmitted }: TailoredPreviewProps) {
  const [docs, setDocs] = useState<TailoredDocuments | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const generatedAt = application.tailored?.generatedAt;
  useEffect(() => {
    let cancelled = false;
    getTailored(application.id)
      .then(loaded => { if (!cancelled) setDocs(loaded); })
      .catch(e => { if (!cancelled) setMessage({ tone: 'error', text: e.message }); });
    return () => { cancelled = true; };
  }, [application.id, generatedAt]);

  const editable = application.status === 'ready_for_review';
  const view = draft ?? (docs ? toDraft(docs) : null);
  const dirty = draft !== null;
  const disabled = busy || !!working;

  const change = (patch: Partial<Draft>) => { if (view) setDraft({ ...view, ...patch }); };

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

  const onSave = () => act('save', async () => {
    if (!view || !docs) return;
    setDocs(await updateTailored(application.id, toPayload(view, docs)));
    setDraft(null);
    setMessage({ tone: 'ok', text: 'Saved. Your PDF is being updated.' });
  });

  const onDownload = () => act('download', async () => {
    try {
      const blob = await downloadTailoredPdf(application.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = docs?.pdf?.filename || 'Tailored_Resume.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'PDF_RENDERING') {
        setMessage({ tone: 'error', text: e.message });
        return;
      }
      throw e;
    }
  });

  const onCopyLetter = () => act('copy', async () => {
    if (!view) return;
    await navigator.clipboard.writeText(`${view.coverSubject}\n\n${view.coverBody}`);
    setMessage({ tone: 'ok', text: 'Cover letter copied.' });
  });

  const onMarkSubmitted = () => {
    if (!window.confirm('Mark this application as submitted? Your tailored documents will be locked.')) return;
    act('submit', async () => { onSubmitted(await markApplicationSubmitted(application.id)); });
  };

  if (!docs || !view) {
    return (
      <section className="aa-tailored">
        {message?.tone === 'error'
          ? <div className="aa-error"><AlertCircle size={16} /> {message.text}</div>
          : <div className="aa-empty"><RefreshCw size={24} className="aa-spin" /></div>}
      </section>
    );
  }

  return (
    <section className="aa-tailored">
      <div className="aa-tailored-head">
        <div>
          <h4 className="aa-score-subtitle"><Sparkles size={15} /> Tailored for this job</h4>
          <p className="aa-label-hint">
            Rewritten from your own resume only — nothing new was added.
            {docs.violations > 0 && ` We removed ${docs.violations} suggested change${docs.violations === 1 ? '' : 's'} that your resume did not support.`}
          </p>
        </div>
        <div className="aa-resume-actions">
          <button className="aa-btn-ghost aa-btn-sm" disabled={disabled} onClick={onDownload}><Download size={14} /> PDF</button>
          <button className="aa-btn-ghost aa-btn-sm" disabled={disabled} onClick={onCopyLetter}><Copy size={14} /> Copy letter</button>
          {application.job?.applyUrl && (
            <a className="aa-btn-ghost aa-btn-sm" href={application.job.applyUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Apply on site</a>
          )}
          {editable && (
            <button className="aa-btn-primary aa-btn-sm" disabled={disabled} onClick={onMarkSubmitted}><Send size={14} /> Mark as submitted</button>
          )}
        </div>
      </div>

      {application.status === 'submitted' && application.submission && (
        <p className="aa-decision is-approved">Submitted on {new Date(application.submission.submittedAt).toLocaleString()}.</p>
      )}
      {message && (
        message.tone === 'ok'
          ? <div className="aa-resume-notice"><CheckCircle2 size={16} /> {message.text}</div>
          : <div className="aa-error"><AlertCircle size={16} /> {message.text}</div>
      )}

      {!!docs.changes.length && (
        <ul className="aa-tailored-changes">
          {docs.changes.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}

      <div className="aa-tailored-grid">
        <label className="aa-resume-field">
          <span className="aa-label">Headline</span>
          <input className="aa-input" value={view.headline} readOnly={!editable} onChange={e => change({ headline: e.target.value })} />
        </label>
        <label className="aa-resume-field">
          <span className="aa-label">Skills <span className="aa-label-hint">most relevant first</span></span>
          <input className="aa-input" value={view.skills} readOnly={!editable} onChange={e => change({ skills: e.target.value })} />
        </label>
      </div>
      <label className="aa-resume-field">
        <span className="aa-label">Summary</span>
        <textarea className="aa-input" rows={3} value={view.summary} readOnly={!editable} onChange={e => change({ summary: e.target.value })} />
      </label>

      <div className="aa-tailored-toggle">
        <label className="aa-resume-check">
          <input type="checkbox" checked={showOriginal} onChange={e => setShowOriginal(e.target.checked)} />
          Show my original bullets
        </label>
      </div>

      {docs.resume.experience.map(role => (
        <div key={role.id} className="aa-resume-entry">
          <span className="aa-label">{role.title}{role.company ? ` — ${role.company}` : ''}</span>
          <textarea
            className="aa-input"
            rows={Math.max(3, (view.experience[role.id] ?? '').split('\n').length)}
            value={view.experience[role.id] ?? ''}
            readOnly={!editable}
            onChange={e => change({ experience: { ...view.experience, [role.id]: e.target.value } })}
          />
          {showOriginal && (
            <ul className="aa-tailored-original">
              {role.bullets.map((bullet, i) => <li key={bullet.sourceBulletId ?? i}>{bullet.original ?? '(new line you added)'}</li>)}
            </ul>
          )}
        </div>
      ))}

      {docs.resume.projects.map(project => (
        <div key={project.id} className="aa-resume-entry">
          <span className="aa-label">{project.name}</span>
          <textarea
            className="aa-input"
            rows={3}
            value={view.projects[project.id] ?? ''}
            readOnly={!editable}
            onChange={e => change({ projects: { ...view.projects, [project.id]: e.target.value } })}
          />
        </div>
      ))}

      <div className="aa-tailored-letter">
        <h4 className="aa-score-subtitle">Cover letter</h4>
        {docs.coverLetter.needsReview && (
          <div className="aa-resume-warning">
            <AlertCircle size={16} />
            <span>{docs.coverLetter.warnings.join(' ')}</span>
          </div>
        )}
        <label className="aa-resume-field">
          <span className="aa-label">Subject</span>
          <input className="aa-input" value={view.coverSubject} readOnly={!editable} onChange={e => change({ coverSubject: e.target.value })} />
        </label>
        <label className="aa-resume-field">
          <span className="aa-label">Letter</span>
          <textarea className="aa-input" rows={12} value={view.coverBody} readOnly={!editable} onChange={e => change({ coverBody: e.target.value })} />
        </label>
      </div>

      {editable && dirty && (
        <div className="aa-resume-savebar">
          <span>You have unsaved changes</span>
          <button className="aa-btn-ghost aa-btn-sm" disabled={disabled} onClick={() => setDraft(null)}>Discard</button>
          <button className="aa-btn-primary aa-btn-sm" disabled={disabled} onClick={onSave}>
            {working === 'save' ? <RefreshCw size={14} className="aa-spin" /> : <Save size={14} />} Save changes
          </button>
        </div>
      )}
    </section>
  );
}

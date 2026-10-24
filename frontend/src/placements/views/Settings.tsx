import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import type { College } from '../api';
import { sanitizeResumeHtml } from '../../lib/sanitizeHtml';
import { Spinner } from '../ui';
import { errorText, fmtDate, usePortal } from '../portal';

interface Template { id: string; name: string; description: string; html: string }

export default function SettingsView() {
  const { college, setCollege, readOnly, toast } = usePortal();
  const [minAts, setMinAts] = useState(String(college.settings.minAtsScore));
  const [minLinkedin, setMinLinkedin] = useState(String(college.settings.minLinkedinScore));
  const [requireFormat, setRequireFormat] = useState(college.settings.requireCollegeFormat);
  const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState<Template[] | null>(null);

  useEffect(() => {
    api<{ data: Template[] }>('/templates').then((r) => setTemplates(r.data), () => setTemplates([]));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ college: College }>('/settings', { method: 'PATCH', body: { minAtsScore: Number(minAts) || 0, minLinkedinScore: Number(minLinkedin) || 0, requireCollegeFormat: requireFormat } });
      setCollege(r.college);
      toast('Settings saved.');
    } catch (err) {
      toast(errorText(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="pl-head">
        <div>
          <h1>Settings</h1>
          <p>The rule for your eligible list, and your plan with CVMind.</p>
        </div>
      </div>

      <form className="pl-card pad" onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 620 }}>
        <h2 style={{ margin: 0 }}>Eligibility for placement drives</h2>
        <p className="pl-muted">A student is eligible when their latest ATS score meets the minimum and they have an approved resume that hasn't been edited since you approved it.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="pl-field" style={{ width: 200 }}>
            <label htmlFor="set-ats">Minimum ATS score</label>
            <input id="set-ats" className="pl-input" type="number" min={0} max={100} value={minAts} onChange={(e) => setMinAts(e.target.value)} disabled={readOnly} />
          </div>
          <div className="pl-field" style={{ width: 200 }}>
            <label htmlFor="set-li">Minimum LinkedIn score</label>
            <input id="set-li" className="pl-input" type="number" min={0} max={100} value={minLinkedin} onChange={(e) => setMinLinkedin(e.target.value)} disabled={readOnly} />
            <span className="pl-muted pl-small">0 means not required</span>
          </div>
        </div>
        <label className="pl-check">
          <input type="checkbox" checked={requireFormat} onChange={(e) => setRequireFormat(e.target.checked)} disabled={readOnly || !templates?.length} />
          <span>The approved resume must use your college's resume format{templates && !templates.length ? ' (CVMind hasn\'t added your format yet)' : ''}</span>
        </label>
        {!readOnly && <div><button type="submit" className="pl-btn primary" disabled={busy}>{busy && <Spinner size={14} />} Save</button></div>}
      </form>

      <div className="pl-card pad" style={{ maxWidth: 620 }}>
        <h2>Your plan</h2>
        <dl className="pl-kv">
          <dt>Seats</dt><dd>{college.contract.seats} students</dd>
          <dt>Started</dt><dd>{fmtDate(college.contract.startsAt)}</dd>
          <dt>Ends</dt><dd>{fmtDate(college.contract.endsAt)}</dd>
        </dl>
        <p className="pl-muted pl-small" style={{ marginTop: 10 }}>Joined students get CVMind Pro until the plan ends. To add seats or renew, write to CVMind support.</p>
      </div>

      <div className="pl-card pad">
        <h2>Your college resume format</h2>
        {!templates ? <Spinner /> : templates.length === 0 ? (
          <p className="pl-muted">CVMind hasn't added your college's format yet. Send your format to CVMind support and it will show up for your students in the resume builder.</p>
        ) : (
          <div className="pl-grid two">
            {templates.map((t) => (
              <div key={t.id}>
                <b>{t.name}</b>
                {t.description && <p className="pl-muted pl-small">{t.description}</p>}
                <iframe className="pl-preview" style={{ height: 420, border: '1px solid var(--pl-border)', borderRadius: 8, marginTop: 8 }} title={`${t.name} preview`} sandbox="" srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font-family:Arial,sans-serif;font-size:12px}</style></head><body>${sanitizeResumeHtml(t.html)}</body></html>`} />
              </div>
            ))}
          </div>
        )}
        <p className="pl-muted pl-small" style={{ marginTop: 10 }}>Your students see this format first when they build a resume on CVMind.</p>
      </div>
    </>
  );
}

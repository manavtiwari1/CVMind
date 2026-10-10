import { useEffect, useState } from 'react';
import { BellRing, Crown, Loader2, X } from 'lucide-react';
import { getAlerts, saveAlerts, type AlertSettings } from '../../lib/growthApi';
import { requestUpgrade } from '../../lib/billing';
import { getErrorMessage } from '../../utils/errors';
import { appliedOn } from './format';
import '../../components/growth/growth.css';

// Job alert emails: new jobs that match the user's Job Finder resume, weekly (daily on Pro).

const SCORES = [40, 50, 60, 70, 80];

interface AlertsDialogProps {
  role: string;
  location: string;
  onClose: () => void;
  onSaved: (alerts: AlertSettings) => void;
}

export default function AlertsDialog({ role, location, onClose, onSaved }: AlertsDialogProps) {
  const [alerts, setAlerts] = useState<AlertSettings | null>(null);
  const [draft, setDraft] = useState<Pick<AlertSettings, 'enabled' | 'frequency' | 'minScore'>>({ enabled: true, frequency: 'weekly', minScore: 60 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getAlerts()
      .then(a => {
        if (!alive) return;
        setAlerts(a);
        // Opening the dialog is the way to turn alerts on, so a first visit starts switched on
        setDraft({ enabled: a.lastSentAt || a.enabled ? a.enabled : true, frequency: a.frequency, minScore: a.minScore });
      })
      .catch(err => { if (alive) setError(getErrorMessage(err) || 'Could not load your alerts.'); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await saveAlerts(draft);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not save your alerts.');
    } finally {
      setSaving(false);
    }
  };

  const searchFor = [role, location ? `in ${location}` : ''].filter(Boolean).join(' ');

  return (
    <div className="gd-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gd-box" role="dialog" aria-modal="true" aria-labelledby="alerts-title">
        <button type="button" className="gd-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className="gd-head">
          <span className="gd-icon"><BellRing size={18} /></span>
          <div>
            <h2 id="alerts-title">Job alerts by email</h2>
            <p>New jobs that match your resume{searchFor ? `: ${searchFor}` : ''}</p>
          </div>
        </div>

        {!alerts && !error ? (
          <div className="gd-loading"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : (
          <>
            <label className="sd-switch">
              <input type="checkbox" checked={draft.enabled} onChange={e => setDraft(d => ({ ...d, enabled: e.target.checked }))} />
              <span className="sd-track" aria-hidden="true"><span /></span>
              <span>{draft.enabled ? 'Alerts are on' : 'Alerts are off'}</span>
            </label>

            <fieldset className="al-field" disabled={!draft.enabled}>
              <legend>How often</legend>
              <div className="al-options">
                <label className={`al-option${draft.frequency === 'weekly' ? ' is-on' : ''}`}>
                  <input type="radio" name="al-frequency" checked={draft.frequency === 'weekly'} onChange={() => setDraft(d => ({ ...d, frequency: 'weekly' }))} />
                  Weekly
                </label>
                <label className={`al-option${draft.frequency === 'daily' ? ' is-on' : ''}${alerts?.canDaily ? '' : ' is-locked'}`}>
                  <input
                    type="radio"
                    name="al-frequency"
                    checked={draft.frequency === 'daily'}
                    onChange={() => (alerts?.canDaily ? setDraft(d => ({ ...d, frequency: 'daily' })) : requestUpgrade('limit', 'Daily job alerts are part of CVMind Pro.'))}
                  />
                  Daily {!alerts?.canDaily && <span className="al-pro"><Crown size={11} /> Pro</span>}
                </label>
              </div>
            </fieldset>

            <label className="al-field al-select" htmlFor="al-score">
              <span>Only jobs that match at least</span>
              <select id="al-score" value={draft.minScore} disabled={!draft.enabled} onChange={e => setDraft(d => ({ ...d, minScore: Number(e.target.value) }))}>
                {SCORES.map(s => <option key={s} value={s}>{s}%</option>)}
              </select>
            </label>

            <ul className="al-notes">
              <li>Up to 10 jobs per email, best match first. A job is never sent twice.</li>
              <li>We use the resume, role and city in your Job Finder profile. Change them with "Edit profile".</li>
              <li>Every email has a one-click unsubscribe link.</li>
              {alerts?.lastSentAt && <li>Last alert sent {appliedOn(alerts.lastSentAt)}.</li>}
            </ul>

            <div className="al-actions">
              <button type="button" className="jf-btn jf-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="button" className="jf-btn jf-btn--primary" onClick={save} disabled={saving}>
                {saving && <Loader2 size={15} className="jf-spin" />} Save
              </button>
            </div>
          </>
        )}

        {error && <p className="gd-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { API_BASE } from '../lib/apiBase';
import { authFetch } from '../lib/authFetch';

// Account page: the on/off switch for CVMind's updates and offers. It is the same setting as the
// Unsubscribe link in those emails. Password resets, invoices and other account emails aren't affected.

const URL = `${API_BASE}/api/user/email-preferences`;

export default function AccountEmailPrefs() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Hidden if the setting can't be read
  useEffect(() => {
    authFetch(URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('unavailable'))))
      .then((body) => setSubscribed(Boolean(body.subscribed)))
      .catch(() => {});
  }, []);

  if (subscribed === null) return null;

  const change = async (next: boolean) => {
    setSaving(true);
    setError('');
    try {
      const res = await authFetch(URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscribed: next }) });
      if (!res.ok) throw new Error('failed');
      setSubscribed(next);
    } catch {
      setError('Could not save that. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="acct-field">
      <span className="acct-label">Emails</span>
      <label className="acct-email-pref">
        <input type="checkbox" checked={subscribed} disabled={saving} onChange={(e) => void change(e.target.checked)} />
        <span>Send me updates and offers from CVMind</span>
      </label>
      <span className="acct-hint">Password resets, invoices and other account emails always arrive.</span>
      {error && <span className="acct-msg error">{error}</span>}
    </div>
  );
}

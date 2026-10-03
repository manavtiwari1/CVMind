import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from './api';
import { useAction } from './hooks';
import { Spinner } from './ui';

export default function MyPasswordForm({ onDone }: { onDone?: () => void }) {
  const { busy, run } = useAction();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm && next !== confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('save', () => api('/me/password', { method: 'POST', body: { currentPassword: current, newPassword: next } }), 'Password changed');
    if (ok !== undefined) {
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone?.();
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 420 }}>
      <div className="ad-field">
        <label htmlFor="mp-cur">Current password</label>
        <input id="mp-cur" className="ad-input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </div>
      <div className="ad-field">
        <label htmlFor="mp-new">New password</label>
        <input id="mp-new" className="ad-input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <span className="ad-hint">At least 10 characters.</span>
      </div>
      <div className="ad-field">
        <label htmlFor="mp-confirm">Repeat new password</label>
        <input id="mp-confirm" className="ad-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        {mismatch && <span className="ad-hint" style={{ color: '#dc2626' }}>The passwords don't match.</span>}
      </div>
      <button type="submit" className="ad-btn primary" style={{ marginTop: 18 }} disabled={!current || next.length < 10 || next !== confirm || busy === 'save'}>
        {busy === 'save' && <Spinner size={14} />} Change password
      </button>
    </form>
  );
}

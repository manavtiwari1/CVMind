import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Monitor, Smartphone } from 'lucide-react';
import { API_BASE } from '../lib/apiBase';
import { authFetch } from '../lib/authFetch';

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Account → Devices: where the user is signed in, with a way to sign each one out
export default function AccountSessions() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    authFetch(`${API_BASE}/api/account/sessions`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load your devices.');
        if (!cancelled) { setSessions(data.data); setError(''); }
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const signOut = async (path: string, id: string, init: RequestInit) => {
    setBusy(id);
    try {
      const res = await authFetch(`${API_BASE}${path}`, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not sign that device out.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign that device out.');
    } finally {
      setBusy(null);
    }
  };

  const others = (sessions || []).filter((s) => !s.current);

  return (
    <>
      <h1 className="acct-title">Devices</h1>
      <p className="acct-billing-note" style={{ marginTop: 0 }}>
        Where your account is signed in. If you don't recognise a device, sign it out and change your password.
      </p>
      {error && <p className="acct-msg error" role="alert">{error}</p>}
      {!sessions && !error ? (
        <div className="acct-empty"><Loader2 size={22} className="acct-spin" /> Loading your devices…</div>
      ) : sessions && sessions.length === 0 ? (
        <div className="acct-empty">
          <AlertCircle size={22} />
          <span>No devices recorded yet. Devices show up here the next time you sign in.</span>
        </div>
      ) : sessions && (
        <>
          <ul className="acct-docs">
            {sessions.map((s) => (
              <li key={s.id} className="acct-doc">
                <div className="acct-doc-info">
                  <span className="acct-doc-title">
                    {s.device === 'Mobile' ? <Smartphone size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 6 }} /> : <Monitor size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 6 }} />}
                    {s.browser} on {s.os}{s.current && ' · This device'}
                  </span>
                  <span className="acct-doc-meta">
                    Last active {when(s.lastSeenAt)} · signed in {when(s.createdAt)}{s.ip && ` · ${s.ip}`}
                  </span>
                </div>
                {!s.current && (
                  <div className="acct-doc-actions">
                    <button className="acct-link" disabled={busy === s.id} onClick={() => signOut(`/api/account/sessions/${s.id}`, s.id, { method: 'DELETE' })}>
                      {busy === s.id ? 'Signing out…' : 'Sign out'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {others.length > 0 && (
            <div className="acct-actions" style={{ marginTop: 16 }}>
              <button className="acct-btn ghost" disabled={busy === 'all'} onClick={() => signOut('/api/account/sessions/revoke-others', 'all', { method: 'POST' })}>
                {busy === 'all' ? <Loader2 size={15} className="acct-spin" /> : 'Sign out all other devices'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import cvmindIcon from '../assets/cvmind_icon.png';
import './team.css';
import { api, clearSession, loadSession, saveSession, setAuthErrorHandler } from './api';
import type { Session, TeamAccount } from './api';
import type { Toast } from './store';
import { disablePush, registerTeamWorker } from './push';
import { isSplitHost } from '../lib/hosts';
import TeamProvider from './TeamProvider';
import Shell from './Shell';
import { ConfirmHost, Spinner } from './ui';

type Phase = 'checking' | 'signed-out' | 'set-password' | 'signed-in';

export default function TeamApp() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [phase, setPhase] = useState<Phase>(() => (loadSession() ? 'checking' : 'signed-out'));
  const [notice, setNotice] = useState('');
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; tone: 'ok' | 'error' }>>([]);

  const toast: Toast = useCallback((message, tone = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);

  const signOut = useCallback((message = '') => {
    // Stop pushes to this browser while the session can still authorise it
    disablePush().catch(() => {});
    clearSession();
    setSession(null);
    setNotice(message);
    setPhase('signed-out');
  }, []);

  // A private workspace: keep it out of search engines
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.title = 'CVMind Team';
    // Installable as its own app on team.cvmind.in (the manifest's start_url is the site root)
    const links = isSplitHost()
      ? [Object.assign(document.createElement('link'), { rel: 'manifest', href: '/team.webmanifest' }), Object.assign(document.createElement('link'), { rel: 'apple-touch-icon', href: '/team-icon-192.png' })]
      : [];
    const theme = Object.assign(document.createElement('meta'), { name: 'theme-color', content: '#12172a' });
    const appTitle = Object.assign(document.createElement('meta'), { name: 'apple-mobile-web-app-title', content: 'CVMind Team' });
    const capable = Object.assign(document.createElement('meta'), { name: 'apple-mobile-web-app-capable', content: 'yes' });
    [...links, theme, appTitle, capable].forEach((el) => document.head.appendChild(el));
    registerTeamWorker();
    return () => { meta.remove(); [...links, theme, appTitle, capable].forEach((el) => el.remove()); };
  }, []);

  useEffect(() => {
    setAuthErrorHandler((code, message) => {
      if (code === 'TEAM_SET_PASSWORD') setPhase('set-password');
      else signOut(code === 'TEAM_NO_ACCESS' ? message : 'Your session ended. Please sign in again.');
    });
    return () => setAuthErrorHandler(null);
  }, [signOut]);

  const enter = useCallback((s: Session) => {
    setSession(s);
    setPhase(s.admin.mustChangePassword ? 'set-password' : 'signed-in');
  }, []);

  // Re-check a stored session so access and role are the server's current ones
  useEffect(() => {
    if (phase !== 'checking' || !session) return;
    let cancelled = false;
    api<{ admin: TeamAccount }>('/me')
      .then(({ admin }) => {
        if (cancelled) return;
        const fresh = { token: session.token, admin };
        saveSession(fresh);
        enter(fresh);
      })
      .catch(() => { if (!cancelled) signOut(); });
    return () => { cancelled = true; };
  }, [phase, session, signOut, enter]);

  let screen;
  if (phase === 'checking') {
    screen = <div className="tm-center"><Spinner size={22} /><span>Opening CVMind Team…</span></div>;
  } else if (phase === 'signed-out' || !session) {
    screen = <Login notice={notice} onLogin={(s, remember) => { saveSession(s, remember); setNotice(''); enter(s); }} />;
  } else if (phase === 'set-password') {
    screen = <SetPassword session={session} onDone={(admin) => { const s = { token: session.token, admin }; saveSession(s); enter(s); }} onSignOut={() => signOut()} />;
  } else {
    screen = (
      <TeamProvider key={session.token} me={session.admin} token={session.token} toast={toast} signOut={() => signOut()}>
        <Shell />
      </TeamProvider>
    );
  }

  return (
    <div className="tm-app">
      {screen}
      <ConfirmHost />
      <div className="tm-toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`tm-toast ${t.tone}`}>{t.message}</div>)}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="tm-brand">
      <img src={cvmindIcon} alt="" width={34} height={34} />
      <span>CV<b>Mind</b> Team</span>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, autoFocus }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="tm-field">
      <label htmlFor={id}>{label}</label>
      <div className="tm-password">
        <input id={id} className="tm-input" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} autoFocus={autoFocus} required />
        <button type="button" className="tm-icon-btn sm" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </div>
    </div>
  );
}

function Login({ notice, onLogin }: { notice: string; onLogin: (s: Session, remember: boolean) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ token: string; admin: TeamAccount }>('/login', { method: 'POST', body: { username, password, remember } });
      onLogin({ token: res.token, admin: res.admin }, remember);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="tm-auth">
      <form className="tm-auth-card" onSubmit={submit}>
        <Brand />
        <h1>Sign in</h1>
        <p className="tm-muted">The CVMind team workspace: announcements, tasks and chat. Use the details from your invitation email.</p>
        {notice && <div className="tm-notice amber">{notice}</div>}
        {error && <div className="tm-notice red" role="alert">{error}</div>}
        <div className="tm-field">
          <label htmlFor="tm-user">Username or work email</label>
          <input id="tm-user" className="tm-input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </div>
        <PasswordField id="tm-pass" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <label className="tm-check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed in for 7 days</label>
        <button type="submit" className="tm-btn primary block" disabled={busy || !username || !password}>{busy && <Spinner size={15} />} Sign in</button>
        <p className="tm-muted small">Forgot your password? Ask a manager to resend your invitation or reset it from the admin panel.</p>
      </form>
    </main>
  );
}

function SetPassword({ session, onDone, onSignOut }: { session: Session; onDone: (admin: TeamAccount) => void; onSignOut: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mismatch = !!confirm && next !== confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 10 || mismatch) return;
    setBusy(true);
    setError('');
    try {
      const res = await api<{ admin: TeamAccount }>('/me/password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      onDone(res.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="tm-auth">
      <form className="tm-auth-card" onSubmit={submit}>
        <Brand />
        <h1>Welcome, {session.admin.name.split(' ')[0]}</h1>
        <p className="tm-muted">Choose your own password before you start. Only you will know it.</p>
        {error && <div className="tm-notice red" role="alert">{error}</div>}
        <PasswordField id="sp-cur" label="Temporary password (from the email)" value={current} onChange={setCurrent} autoComplete="current-password" autoFocus />
        <PasswordField id="sp-new" label="New password" value={next} onChange={setNext} autoComplete="new-password" />
        <span className={`tm-hint ${next && next.length < 10 ? 'bad' : ''}`}>At least 10 characters.</span>
        <PasswordField id="sp-confirm" label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {mismatch && <span className="tm-hint bad">The passwords don't match.</span>}
        <button type="submit" className="tm-btn primary block" disabled={busy || !current || next.length < 10 || next !== confirm}>{busy && <Spinner size={15} />} Save and continue</button>
        <button type="button" className="tm-btn ghost block" onClick={onSignOut}>Sign out</button>
      </form>
    </main>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, Eye, EyeOff, GraduationCap, LayoutDashboard, LogOut, Menu, Settings, UserPlus, Users, UsersRound, X } from 'lucide-react';
import cvmindIcon from '../assets/cvmind_icon.png';
import './placements.css';
import { api, clearSession, loadSession, saveSession, setAuthErrorHandler } from './api';
import type { College, Session, Staff } from './api';
import { Spinner } from './ui';
import { PortalContext, errorText } from './portal';
import type { Portal, Toast } from './portal';
import Overview from './views/Overview';
import Students from './views/Students';
import StudentDetail from './views/StudentDetail';
import Invite from './views/Invite';
import StaffView from './views/Staff';
import SettingsView from './views/Settings';
import ActivityView from './views/Activity';

type Phase = 'checking' | 'signed-out' | 'set-password' | 'signed-in';
type View = 'overview' | 'students' | 'invite' | 'staff' | 'settings' | 'activity';

const NAV: Array<{ id: View; label: string; icon: typeof Users; admin?: boolean }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: GraduationCap },
  { id: 'invite', label: 'Add students', icon: UserPlus },
  { id: 'staff', label: 'Staff', icon: UsersRound, admin: true },
  { id: 'settings', label: 'Settings', icon: Settings, admin: true },
  { id: 'activity', label: 'Activity log', icon: Activity, admin: true }
];

export default function PlacementsApp() {
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
    clearSession();
    setSession(null);
    setNotice(message);
    setPhase('signed-out');
  }, []);

  // A private portal: keep it out of search engines
  useEffect(() => {
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' });
    document.head.appendChild(meta);
    document.title = 'CVMind Placements';
    return () => meta.remove();
  }, []);

  useEffect(() => {
    setAuthErrorHandler((code, message) => {
      if (code === 'COLLEGE_SET_PASSWORD') setPhase('set-password');
      else signOut(code === 'COLLEGE_CLOSED' ? message : 'Your session ended. Please sign in again.');
    });
    return () => setAuthErrorHandler(null);
  }, [signOut]);

  const enter = useCallback((s: Session) => {
    setSession(s);
    setPhase(s.staff.mustChangePassword ? 'set-password' : 'signed-in');
  }, []);

  // Re-check a stored session so the role and college are the server's current ones
  useEffect(() => {
    if (phase !== 'checking' || !session) return;
    let cancelled = false;
    api<{ staff: Staff; college: College }>('/me')
      .then(({ staff, college }) => {
        if (cancelled) return;
        const fresh = { token: session.token, staff, college };
        saveSession(fresh);
        enter(fresh);
      })
      .catch(() => { if (!cancelled) signOut(); });
    return () => { cancelled = true; };
  }, [phase, session, signOut, enter]);

  let screen;
  if (phase === 'checking') {
    screen = <div className="pl-center"><Spinner size={22} /><span>Opening the placements portal…</span></div>;
  } else if (phase === 'signed-out' || !session) {
    screen = <Login notice={notice} onLogin={(s, remember) => { saveSession(s, remember); setNotice(''); enter(s); }} />;
  } else if (phase === 'set-password') {
    screen = <SetPassword onDone={(s) => { saveSession(s); enter(s); }} session={session} onSignOut={() => signOut()} />;
  } else {
    screen = <Shell key={session.token} session={session} toast={toast} onSession={(s) => { saveSession(s); setSession(s); }} signOut={() => signOut()} />;
  }

  return (
    <div className="pl-app">
      {screen}
      <div className="pl-toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`pl-toast ${t.tone}`}>{t.message}</div>)}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="pl-brand">
      <img src={cvmindIcon} alt="" width={32} height={32} />
      <span>CV<b>Mind</b><small>Placements</small></span>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, autoFocus }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pl-field">
      <label htmlFor={id}>{label}</label>
      <div className="pl-password">
        <input id={id} className="pl-input" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} autoFocus={autoFocus} required />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </div>
    </div>
  );
}

function Login({ notice, onLogin }: { notice: string; onLogin: (s: Session, remember: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<Session>('/login', { method: 'POST', body: { email, password, remember } });
      onLogin({ token: res.token, staff: res.staff, college: res.college }, remember);
    } catch (err) {
      setError(errorText(err, 'Could not sign in.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="pl-auth">
      <form className="pl-auth-card" onSubmit={submit}>
        <Brand />
        <h1>Sign in</h1>
        <p className="pl-muted">The placements portal for colleges: your students' resumes, ATS scores and reviews. Use the details from your CVMind email.</p>
        {notice && <div className="pl-notice amber">{notice}</div>}
        {error && <div className="pl-notice red" role="alert">{error}</div>}
        <div className="pl-field">
          <label htmlFor="pl-email">Email</label>
          <input id="pl-email" className="pl-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus required />
        </div>
        <PasswordField id="pl-pass" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <label className="pl-check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed in for 7 days</label>
        <button type="submit" className="pl-btn primary block" disabled={busy || !email || !password}>{busy && <Spinner size={15} />} Sign in</button>
        <p className="pl-muted pl-small">Forgot your password? Staff can ask the college admin to reset it. College admins can write to CVMind support.</p>
      </form>
    </main>
  );
}

function SetPassword({ session, onDone, onSignOut }: { session: Session; onDone: (s: Session) => void; onSignOut: () => void }) {
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
      const res = await api<{ token: string; staff: Staff }>('/me/password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      onDone({ token: res.token, staff: res.staff, college: session.college });
    } catch (err) {
      setError(errorText(err, 'Could not save your password.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="pl-auth">
      <form className="pl-auth-card" onSubmit={submit}>
        <Brand />
        <h1>Choose your password</h1>
        <p className="pl-muted">Replace the temporary password from your email with your own. Use at least 10 characters.</p>
        {error && <div className="pl-notice red" role="alert">{error}</div>}
        <PasswordField id="pl-cur" label="Temporary password" value={current} onChange={setCurrent} autoComplete="current-password" autoFocus />
        <PasswordField id="pl-new" label="New password" value={next} onChange={setNext} autoComplete="new-password" />
        <PasswordField id="pl-confirm" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {next && next.length < 10 && <p className="pl-muted pl-small">Use at least 10 characters.</p>}
        {mismatch && <p className="pl-small" style={{ color: 'var(--pl-red)' }}>The passwords don't match.</p>}
        <button type="submit" className="pl-btn primary block" disabled={busy || !current || next.length < 10 || mismatch || !confirm}>{busy && <Spinner size={15} />} Save password</button>
        <button type="button" className="pl-link pl-small" onClick={onSignOut}>Sign out</button>
      </form>
    </main>
  );
}

function Shell({ session, toast, onSession, signOut }: { session: Session; toast: Toast; onSession: (s: Session) => void; signOut: () => void }) {
  const [view, setView] = useState<View>('overview');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { staff, college } = session;
  const isAdmin = staff.role === 'admin';

  const portal: Portal = useMemo(() => ({
    staff,
    college,
    isAdmin,
    readOnly: college.access !== 'active',
    toast,
    setCollege: (c) => onSession({ ...session, college: c }),
    openStudent: (id) => { setStudentId(id); setView('students'); window.scrollTo(0, 0); }
  }), [staff, college, isAdmin, toast, onSession, session]);

  const go = (v: View) => { setView(v); setStudentId(null); setMenuOpen(false); window.scrollTo(0, 0); };

  let body;
  if (view === 'students' && studentId) body = <StudentDetail key={studentId} id={studentId} onBack={() => setStudentId(null)} />;
  else if (view === 'students') body = <Students />;
  else if (view === 'invite') body = <Invite />;
  else if (view === 'staff' && isAdmin) body = <StaffView />;
  else if (view === 'settings' && isAdmin) body = <SettingsView />;
  else if (view === 'activity' && isAdmin) body = <ActivityView />;
  else body = <Overview go={go} />;

  return (
    <PortalContext.Provider value={portal}>
      <div className="pl-topbar">
        <Brand />
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" style={{ color: '#fff' }}><Menu size={22} /></button>
      </div>
      <div className="pl-shell">
        <aside className={`pl-side${menuOpen ? ' open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Brand />
            {menuOpen && <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" style={{ color: '#fff' }}><X size={20} /></button>}
          </div>
          <div className="pl-college">
            {college.logo ? <img src={college.logo} alt="" /> : <GraduationCap size={26} color="#2dc08d" />}
            <div><b>{college.name}</b><span className="pl-small">{isAdmin ? 'College admin' : 'Staff'}</span></div>
          </div>
          {NAV.filter((n) => !n.admin || isAdmin).map((n) => (
            <button key={n.id} type="button" className={`pl-nav${view === n.id ? ' active' : ''}`} onClick={() => go(n.id)}>
              <n.icon size={17} /> {n.label}
            </button>
          ))}
          <div className="pl-side-foot">
            <span>{staff.name || staff.email}</span>
            <button type="button" onClick={signOut}><LogOut size={15} /> Sign out</button>
          </div>
        </aside>
        <main className="pl-main">
          {portal.readOnly && <div className="pl-notice amber">Your CVMind contract ended on {new Date(college.contract.endsAt || '').toLocaleDateString('en-IN')}. The portal is read-only, and students no longer get CVMind Pro. Contact CVMind to renew.</div>}
          {body}
        </main>
      </div>
    </PortalContext.Provider>
  );
}

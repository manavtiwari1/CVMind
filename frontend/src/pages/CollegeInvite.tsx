import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, GraduationCap, RefreshCw, Sparkles } from 'lucide-react';
import { GradientBackground } from '../components/ui/sign-up';
import { API_BASE } from '../lib/apiBase';
import { authFetch } from '../lib/authFetch';
import { readUser, saveUser } from '../lib/currentUser';
import { COLLEGE_INVITE_KEY } from '../lib/collegeInvite';

interface CollegeInviteProps {
  setCurrentPage: (page: string) => void;
  openSignIn: () => void;
}


function readToken(): string {
  const fromPath = window.location.pathname.match(/^\/college-invite\/([A-Za-z0-9_-]+)/)?.[1];
  try {
    if (fromPath) sessionStorage.setItem(COLLEGE_INVITE_KEY, fromPath);
    return fromPath || sessionStorage.getItem(COLLEGE_INVITE_KEY) || '';
  } catch {
    return fromPath || '';
  }
}

const forget = () => {
  try { sessionStorage.removeItem(COLLEGE_INVITE_KEY); } catch { /* ignore */ }
};

type State =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'ready'; college: string; email: string }
  | { kind: 'joined'; college: string }
  | { kind: 'declined' };

// Where a college's invitation email lands: app.cvmind.in/college-invite/<token>
export default function CollegeInvite({ setCurrentPage, openSignIn }: CollegeInviteProps) {
  const [token] = useState(readToken);
  const [state, setState] = useState<State>(() => (token ? { kind: 'loading' } : { kind: 'invalid', message: 'This invitation link is incomplete. Open it again from your email.' }));
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const user = readUser();
  const signedIn = Boolean(user?.token);

  useEffect(() => {
    // Keep the token out of the address bar and browser history
    if (token) window.history.replaceState(window.history.state, '', '/college-invite');
    if (!token) return;
    fetch(`${API_BASE}/api/college-invite/${token}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { forget(); setState({ kind: 'invalid', message: data.error || 'This invitation has expired.' }); return; }
        setState({ kind: 'ready', college: data.college.name, email: data.email });
      })
      .catch(() => setState({ kind: 'invalid', message: 'Could not reach CVMind. Check your connection and try again.' }));
  }, [token]);

  const respond = async (accept: boolean) => {
    setBusy(true);
    setError('');
    try {
      const res = await (accept ? authFetch : fetch)(`${API_BASE}/api/college-invite/${token}/${accept ? 'accept' : 'decline'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accept ? { consent: true } : {})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Something went wrong. Please try again.'); return; }
      forget();
      if (accept) {
        // Pro and the verified email apply at once; the next account check confirms them
        const stored = readUser();
        if (stored) saveUser({ ...stored, isPro: true, plan: 'pro', emailVerified: true });
        setState({ kind: 'joined', college: data.college?.name || (state.kind === 'ready' ? state.college : '') });
      } else {
        setState({ kind: 'declined' });
      }
    } catch {
      setError('Could not reach CVMind. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const brandBtn = { background: 'var(--gradient-brand)', padding: '12px 16px' };
  const plainBtn = { padding: '12px 16px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' };

  let icon;
  let title;
  let body;
  if (state.kind === 'loading') {
    icon = <RefreshCw size={44} className="animate-spin" style={{ color: 'var(--blue)' }} />;
    title = 'Opening your invitation…';
    body = null;
  } else if (state.kind === 'invalid') {
    icon = <AlertCircle size={48} style={{ color: 'var(--red)' }} />;
    title = "This invitation can't be used";
    body = <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{state.message}</p>;
  } else if (state.kind === 'declined') {
    icon = <CheckCircle size={48} style={{ color: 'var(--text-secondary)' }} />;
    title = 'Invitation declined';
    body = <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Your college won't see your CVMind account. If you change your mind, ask your placement team to invite you again.</p>;
  } else if (state.kind === 'joined') {
    icon = <CheckCircle size={48} style={{ color: 'var(--green)' }} />;
    title = `You're linked to ${state.college}`;
    body = (
      <div className="flex flex-col gap-2.5">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>CVMind Pro is now on for your account. Build your resume in your college's format and your placement team will review it.</p>
        <button type="button" onClick={() => setCurrentPage('resume-editor')} className="rounded-xl text-sm font-semibold text-white" style={brandBtn}>Build my resume</button>
        <button type="button" onClick={() => setCurrentPage('account')} className="rounded-xl text-sm font-semibold" style={plainBtn}>See my college on my account</button>
      </div>
    );
  } else {
    icon = <GraduationCap size={48} style={{ color: 'var(--blue)' }} />;
    title = `${state.college} invited you`;
    body = (
      <div className="flex flex-col gap-3 text-left">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Join your college on CVMind to get CVMind Pro free while your college's plan is active, and feedback on your resume from your placement team.
        </p>
        {!signedIn ? (
          <>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sign in or create your account with <b style={{ color: 'var(--text-primary)' }}>{state.email}</b>.</p>
            <button type="button" onClick={openSignIn} className="rounded-xl text-sm font-semibold text-white" style={brandBtn}>Sign in to accept</button>
          </>
        ) : (
          <>
            <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
              <span>I agree that {state.college} can see my CVMind resumes, ATS scores and LinkedIn results while I am linked. I can leave my college at any time from my account.</span>
            </label>
            {error && <p className="text-sm" role="alert" style={{ color: 'var(--red)' }}>{error}</p>}
            <button type="button" onClick={() => respond(true)} disabled={busy || !consent} className="rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={brandBtn}>{busy ? 'Please wait…' : 'Accept and join'}</button>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Signed in as {user?.email}. The invitation is for {state.email}.</p>
          </>
        )}
        <button type="button" onClick={() => respond(false)} disabled={busy} className="text-sm underline" style={{ color: 'var(--text-secondary)' }}>Decline invitation</button>
      </div>
    );
  }

  return (
    // Inline spacing: theme.css resets every element's margin and padding, which overrides Tailwind's spacing classes
    <div className="fixed inset-0 flex flex-col overflow-y-auto" style={{ background: 'var(--bg-primary)', zIndex: 1050 }}>
      <GradientBackground />
      <div className="relative z-10 flex items-center gap-2" style={{ padding: '20px 24px' }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--gradient-brand)' }}>
          <Sparkles size={15} className="text-white" />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CVMind</span>
      </div>
      <div className="relative z-10 flex flex-1 items-center justify-center" style={{ padding: '0 16px 40px' }}>
        <div className="w-full max-w-[440px] rounded-2xl text-center" role="status"
          style={{ padding: 28, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex justify-center" style={{ marginBottom: 16 }}>{icon}</div>
          <h1 className="font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: 24, lineHeight: 1.2, marginBottom: 12 }}>{title}</h1>
          {body}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';
import { GradientBackground } from '../components/ui/sign-up';
import { verifyEmail, resendVerification, type VerifyResult } from '../lib/verification';
import { readUser } from '../lib/currentUser';

interface VerifyEmailProps {
  setCurrentPage: (page: string) => void;
  openSignIn: () => void;
}

// One request per token: the link is single-use, so a second run (React StrictMode, a re-render) must reuse the first
const pending = new Map<string, Promise<VerifyResult>>();
function verifyOnce(token: string) {
  if (!pending.has(token)) pending.set(token, verifyEmail(token));
  return pending.get(token)!;
}

// Where the emailed link lands: /verify-email?token=…
export default function VerifyEmail({ setCurrentPage, openSignIn }: VerifyEmailProps) {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [result, setResult] = useState<VerifyResult | null>(
    token ? null : { ok: false, code: 'INVALID', message: 'This verification link is invalid or has already been used.' }
  );
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const signedIn = Boolean(readUser()?.token);

  useEffect(() => {
    // Keep the token out of the address bar and browser history
    if (token) window.history.replaceState({}, '', '/verify-email');
    if (!token) return;
    let active = true;
    verifyOnce(token).then(r => { if (active) setResult(r); });
    return () => { active = false; };
  }, [token]);

  async function resend() {
    setResending(true);
    const r = await resendVerification();
    setResending(false);
    setResendNote(r.alreadyVerified ? 'Your email address is already verified.' : r.message);
  }

  const success = result?.ok;
  const title = !result ? 'Verifying your email…'
    : success ? (result.code === 'ALREADY_VERIFIED' ? 'Already verified' : 'Email verified')
      : result.code === 'EXPIRED' ? 'Link expired' : "We couldn't verify your email";
  const message = !result ? 'This only takes a moment.'
    : success ? (result.code === 'ALREADY_VERIFIED' ? 'Your email address is already verified.' : 'Thanks! Your CVMind account now has full access.')
      : result.message;

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
        <div className="w-full max-w-[420px] rounded-2xl text-center" role="status"
          style={{ padding: 28, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex justify-center" style={{ marginBottom: 16 }}>
            {!result ? <RefreshCw size={44} className="animate-spin" style={{ color: 'var(--blue)' }} />
              : success ? <CheckCircle size={48} style={{ color: 'var(--green)' }} />
                : <AlertCircle size={48} style={{ color: 'var(--red)' }} />}
          </div>
          <h1 className="font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: 24, lineHeight: 1.2, marginBottom: 8 }}>{title}</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{message}</p>

          {result && (
            <div className="flex flex-col gap-2.5">
              {success && (
                <button type="button" onClick={() => (signedIn ? setCurrentPage('my-documents') : openSignIn())}
                  className="rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--gradient-brand)', padding: '12px 16px' }}>
                  {signedIn ? 'Continue to CVMind' : 'Sign in to continue'}
                </button>
              )}
              {!success && signedIn && result.code !== 'TOO_MANY' && (
                <button type="button" onClick={resend} disabled={resending}
                  className="rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--gradient-brand)', padding: '12px 16px' }}>
                  {resending ? 'Sending…' : 'Resend Verification Email'}
                </button>
              )}
              {!success && !signedIn && (
                <button type="button" onClick={openSignIn}
                  className="rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--gradient-brand)', padding: '12px 16px' }}>
                  Sign in to get a new link
                </button>
              )}
              {resendNote && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{resendNote}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

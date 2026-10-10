import { useState, useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  User, CheckCircle, AlertCircle, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { Confetti, type ConfettiRef } from './ui/sign-up';
import { getErrorMessage } from '../utils/errors';
import { setSession } from '../lib/session';
import { OAUTH_NONCE_KEY, siteOrigin } from '../lib/hosts';
import VerifyEmailPanel from './VerifyEmailPanel';
import { LEO_POSES, type LeoPose } from '../lib/leoPoses';
import cvmindLogo from '../assets/cvmind_logo_transparent.png';
import './AuthModal.css';

/* ─── Types ─────────────────────────────────────────────────────── */

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword' | 'resetPassword';
type AuthMethod = 'google' | 'linkedin' | 'github' | 'email';

const LAST_AUTH_KEY = 'cvmind_last_auth';

function readLastAuth(): AuthMethod | null {
  try { return localStorage.getItem(LAST_AUTH_KEY) as AuthMethod | null; } catch { return null; }
}
function saveLastAuth(method: AuthMethod) {
  try { localStorage.setItem(LAST_AUTH_KEY, method); } catch { /* storage blocked: badge just won't show */ }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─── API helper ─────────────────────────────────────────────────── */

function getBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com')
  );
}

/* ─── Password strength (0–3) ────────────────────────────────────── */

function passwordStrength(pw: string) {
  if (!pw) return 0;
  let score = pw.length >= 6 ? 1 : 0;
  if (pw.length >= 8 && /[a-z]/i.test(pw) && /\d/.test(pw)) score++;
  if (pw.length >= 10 && (/[^a-z0-9]/i.test(pw) || /[A-Z]/.test(pw) && /[a-z]/.test(pw))) score++;
  return score;
}
const STRENGTH = [
  { label: '', color: 'var(--border)' },
  { label: 'Weak', color: '#ef4444' },
  { label: 'Okay', color: '#f59e0b' },
  { label: 'Strong', color: '#2dc08d' },
];

/* ─── Icons ──────────────────────────────────────────────────────── */

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.47 2.18 4.95l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

/* ─── Brand panel (left) ─────────────────────────────────────────── */

function Sparkle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0Z" />
    </svg>
  );
}

type MascotMood = 'idle' | 'looking' | 'hiding' | 'peeking' | 'oops' | 'happy';

// Leo's pose for each mood of the form
const MOOD_POSE: Record<MascotMood, LeoPose> = {
  idle: 'hello', // idle loops through IDLE_FRAMES instead
  looking: 'typing',
  hiding: 'thumbs',
  peeking: 'thumbs',
  oops: 'thinking',
  happy: 'cheer',
};

interface LeoFrame { pose: LeoPose; line: string }

// While the form is untouched Leo loops through these, like a little animation
const IDLE_FRAMES: Record<AuthMode, LeoFrame[]> = {
  signIn: [
    { pose: 'hello',  line: 'Hi again! Leo here, ready when you are.' },
    { pose: 'resume', line: 'Your resumes are right where you left them.' },
    { pose: 'idea',   line: 'Tip: tailor your resume for every job.' },
    { pose: 'thumbs', line: "Log in and let's get you hired!" },
  ],
  signUp: [
    { pose: 'hello',     line: "Hi! I'm Leo, your career buddy." },
    { pose: 'resume',    line: "I'll help you build a resume that stands out." },
    { pose: 'checklist', line: 'I check it against ATS rules too.' },
    { pose: 'cheer',     line: "Sign up free and let's start!" },
  ],
  forgotPassword: [{ pose: 'support', line: 'Happens to the best of us!' }],
  resetPassword:  [{ pose: 'thumbs',  line: "Pick a strong one. I won't peek!" }],
};
const FRAME_MS = 2800;

interface BrandPanelProps { mode: AuthMode; mood: MascotMood; frames: LeoFrame[] }

function BrandPanel({ mode, mood, frames }: BrandPanelProps) {
  const signUp = mode === 'signUp';

  // Loop through the frames; start over whenever the set of frames changes
  const framesKey = frames.map(f => f.line).join('|');
  const [frameIndex, setFrameIndex] = useState(0);
  const [seenKey, setSeenKey] = useState(framesKey);
  if (framesKey !== seenKey) { setSeenKey(framesKey); setFrameIndex(0); }
  useEffect(() => {
    if (frames.length < 2) return;
    const t = setInterval(() => setFrameIndex(i => (i + 1) % frames.length), FRAME_MS);
    return () => clearInterval(t);
  }, [framesKey, frames.length]);
  const frame = frames[frameIndex % frames.length];
  return (
    <aside className="auth-brand" aria-hidden="true">
      <div className="auth-logo">
        <img src={cvmindLogo} alt="" />
        CVMind
      </div>

      <div className="auth-brand-body">
        <div className="auth-stage">
          <Sparkle className="auth-doodle d-star2" />
          <Sparkle className="auth-doodle d-star1" />
          <Sparkle className="auth-doodle d-star3" />
          <svg className="auth-doodle d-heart" viewBox="0 0 24 22" fill="currentColor">
            <path d="M12 21.6 10.3 20C4.2 14.6 0 10.9 0 6.4 0 2.7 2.9 0 6.6 0 8.7 0 10.7 1 12 2.5 13.3 1 15.3 0 17.4 0 21.1 0 24 2.7 24 6.4c0 4.5-4.2 8.2-10.3 13.6Z" />
          </svg>
          <svg className="auth-doodle d-plane" viewBox="0 0 130 70" fill="none">
            <path d="M4 62c22 4 40-6 52-20s30-24 46-18" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" opacity="0.5" />
            <path d="M104 14 128 4 118 30 112 22Z" fill="currentColor" />
            <path d="M104 14 112 22 108 28Z" fill="rgba(255,255,255,0.55)" />
          </svg>

          <div className={`auth-leo auth-leo--${mood}`}>
            <span className="auth-leo-glow" />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={frame.pose}
                src={LEO_POSES[frame.pose]}
                alt=""
                className="auth-leo-img"
                initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                draggable={false}
              />
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={frame.line}
              className="auth-bubble"
              initial={{ opacity: 0, scale: 0.85, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              style={{ transformOrigin: '0% 100%' }}
            >
              {frame.line}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={signUp ? 'up' : 'in'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="auth-brand-title">
              {signUp ? 'Build a resume' : 'Welcome back.'}
              <br />
              <em>{signUp ? 'that gets read.' : 'Your next role is waiting.'}</em>
            </h2>
            <svg className="auth-underline" viewBox="0 0 210 14" fill="none">
              <path d="M2 9c40-6 90-8 140-4 22 2 44 3 66-1" stroke="#2dc08d" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </motion.div>
        </AnimatePresence>

        <div className="auth-plan">
          <span className="auth-plan-label">Your plan</span>
          <div className="auth-plan-row on"><span className="auth-plan-num">1</span>{signUp ? 'Create your account' : 'Sign in'}</div>
          <div className="auth-plan-row"><span className="auth-plan-num">2</span>Upload or build your resume</div>
          <div className="auth-plan-row"><span className="auth-plan-num">3</span>Tailor it for any job</div>
        </div>
      </div>

      <div className="auth-brand-foot">© {new Date().getFullYear()} CVMind</div>
    </aside>
  );
}

/* ─── AuthModal ──────────────────────────────────────────────────── */

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signIn');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [captcha, setCaptcha] = useState<{ id: string; svg: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Set by the server for risky sign-ups (e.g. a disposable address): adds the captcha to sign-up
  const [signupCaptcha, setSignupCaptcha] = useState(false);
  // After sign-up: the "Verify your email address" step for this address
  const [verifyFor, setVerifyFor] = useState<{ email: string; sendFailed: boolean } | null>(null);
  const [lastAuth, setLastAuth] = useState<AuthMethod | null>(null);
  // Which field has focus, so the mascot can react to it
  const [focused, setFocused] = useState<'name' | 'email' | 'password' | 'confirm' | 'captcha' | null>(null);
  // Mascot shows an "oops" face for a moment after each error
  const [oops, setOops] = useState(false);
  const [seenError, setSeenError] = useState<string | null>(null);
  if (errorMsg !== seenError) {
    setSeenError(errorMsg);
    if (errorMsg) setOops(true);
  }
  useEffect(() => {
    if (!oops) return;
    const t = setTimeout(() => setOops(false), 2400);
    return () => clearTimeout(t);
  }, [oops]);

  const confettiRef = useRef<ConfettiRef>(null);

  // Sign-in always needs a captcha; it appears once an email is typed so the form starts clean
  const showCaptcha = (mode === 'signIn' && email.trim().length > 0) || (mode === 'signUp' && signupCaptcha);

  /* Reset on open (adjusting state during render, see
     https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes) ── */
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('resetToken');
      const urlEmail = params.get('email');
      if (token && urlEmail) {
        setMode('resetPassword');
        setResetToken(token);
        setEmail(urlEmail);
      } else {
        setMode('signIn');
        setResetToken('');
        setEmail('');
      }
      setName(''); setPassword(''); setConfirm('');
      setShowPw(false); setShowConfirm(false);
      setCaptcha(null); setCaptchaAnswer('');
      setSuccessMsg(null);
      setLoading(false); setDone(false);
      setSignupCaptcha(false); setVerifyFor(null);
      setLastAuth(readLastAuth());
      // Surface OAuth redirect errors (GitHub/LinkedIn) passed back via query param
      setErrorMsg(params.get('authError'));
    }
  }

  /* Remove the OAuth error from the URL once it has been shown ─── */
  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('authError')) {
      params.delete('authError');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, [isOpen]);

  /* Load a fresh captcha whenever the captcha row appears ─ */
  useEffect(() => {
    if (isOpen && showCaptcha) loadCaptcha();
  }, [isOpen, showCaptcha]);

  async function loadCaptcha() {
    setCaptchaAnswer('');
    setCaptchaLoading(true);
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/captcha`);
      const data = await res.json();
      setCaptcha({ id: data.captchaId, svg: data.svg });
    } catch {
      setCaptcha(null);
      setErrorMsg('Could not load captcha. Please try refreshing.');
    } finally { setCaptchaLoading(false); }
  }

  if (!isOpen) return null;

  /* Navigation ─────────────────────────────────────────────────── */

  function clearMessages() { setErrorMsg(null); setSuccessMsg(null); }

  function switchMode(m: AuthMode) {
    clearMessages();
    setMode(m);
    setPassword(''); setConfirm('');
    setShowPw(false); setShowConfirm(false);
    setCaptcha(null); setCaptchaAnswer('');
    setDone(false);
    setSignupCaptcha(false);
  }

  function validate(): string | null {
    if (mode !== 'resetPassword') {
      if (mode === 'signUp' && !name.trim()) return 'Please enter your full name.';
      if (!email.trim()) return 'Please enter your email address.';
      if (!EMAIL_RE.test(email)) return 'Please enter a valid email.';
    }
    if (mode !== 'forgotPassword') {
      if (!password) return 'Please enter a password.';
      if (password.length < 6) return 'Password must be at least 6 characters.';
    }
    if (mode === 'signUp') {
      if (!confirm) return 'Please confirm your password.';
      if (password !== confirm) return 'Passwords do not match.';
    }
    if (showCaptcha && !captchaAnswer.trim()) return 'Please enter the code shown in the image.';
    return null;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    clearMessages();
    const problem = validate();
    if (problem) { setErrorMsg(problem); return; }
    handleSubmit();
  }

  /* Submit ─────────────────────────────────────────────────────── */

  async function handleSubmit() {
    if (mode === 'forgotPassword') {
      setLoading(true);
      try {
        const res = await fetch(`${getBaseUrl()}/api/auth/forgot-password`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed.');
        setSuccessMsg(data.message || 'A reset link has been sent to your email.');
      } catch (err) { setErrorMsg(getErrorMessage(err) || 'Connection failed.'); }
      finally { setLoading(false); }
      return;
    }

    if (mode === 'resetPassword') {
      setLoading(true);
      try {
        const res = await fetch(`${getBaseUrl()}/api/auth/reset-password`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token: resetToken, newPassword: password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reset failed.');
        window.history.pushState({}, '', window.location.pathname);
        setSuccessMsg(data.message || 'Password reset! You can now sign in.');
        setTimeout(() => switchMode('signIn'), 2000);
      } catch (err) { setErrorMsg(getErrorMessage(err) || 'Connection failed.'); }
      finally { setLoading(false); }
      return;
    }

    if (mode === 'signUp') {
      setLoading(true);
      try {
        const res = await fetch(`${getBaseUrl()}/api/auth/signup`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, captchaId: captcha?.id, captchaAnswer }),
        });
        const data = await res.json();
        if (data.captchaRequired) {
          // The server wants a captcha for this sign-up: show (or refresh) the captcha row
          setErrorMsg(data.error || null);
          if (signupCaptcha) loadCaptcha();
          else setSignupCaptcha(true);
          return;
        }
        if (!res.ok) throw new Error(data.error || 'Sign up failed.');
        setSession(data.user);
        saveLastAuth('email');
        setVerifyFor({ email: data.user?.email || email, sendFailed: data.verificationEmailSent === false });
      } catch (err) {
        setErrorMsg(getErrorMessage(err) || 'Connection failed.');
        if (signupCaptcha) loadCaptcha();
      }
      finally { setLoading(false); }
      return;
    }

    // signIn
    setLoading(true);
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaId: captcha?.id, captchaAnswer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');
      setSession(data.user);
      saveLastAuth('email');
      fireSuccess();
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || 'Connection failed.');
      loadCaptcha(); // challenge is single-use — get a fresh one for the retry
    }
    finally { setLoading(false); }
  }

  /* Google OAuth ───────────────────────────────────────────────── */

  function startGoogleRedirectFlow() {
    saveLastAuth('google');
    const clientId = '1036904236561-m92usq7j7pso47r9k02n9dtdmm563162.apps.googleusercontent.com';
    // Google only knows www.cvmind.in, so app.cvmind.in sign-ins return there too; www then
    // shares the session and sends the user on to the app (enterAfterSignIn in App)
    const redirectUri = siteOrigin() + '/';
    const responseType = 'id_token';
    const scope = 'openid email profile';
    const nonce = 'cvmindnonce' + Math.random().toString(36).substring(2, 15);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&nonce=${nonce}`;
    window.location.assign(googleAuthUrl);
  }

  /* GitHub / LinkedIn OAuth — server-side flow via backend redirect ─ */

  function startProviderRedirectFlow(provider: 'github' | 'linkedin') {
    saveLastAuth(provider);
    // Kept in this tab; the sign-in code that comes back only works together with it (see App.tsx)
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const nonce = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    try { sessionStorage.setItem(OAUTH_NONCE_KEY, nonce); } catch { /* storage blocked: the sign-in will ask to retry */ }
    window.location.assign(
      `${getBaseUrl()}/api/auth/${provider}?origin=${encodeURIComponent(window.location.origin)}&nonce=${nonce}`
    );
  }

  /* Success ────────────────────────────────────────────────────── */

  function fireSuccess() {
    setDone(true);
    const fire = (x: number, angle: number) => {
      confettiRef.current?.fire({
        origin: { x, y: 0.6 }, angle, spread: 55,
        particleCount: 80, startVelocity: 55,
        colors: ['#2dc08d', '#7c3aed', '#a78bfa', '#5eead4', '#f59e0b'],
      });
    };
    setTimeout(() => { fire(0.05, 60); fire(0.95, 120); }, 200);
    setTimeout(() => { fire(0.1, 70);  fire(0.9, 110);  }, 500);
    setTimeout(() => { onSuccess(); onClose(); }, 1800);
  }

  /* Labels ─────────────────────────────────────────────────────── */

  const titles: Record<AuthMode, [string, string]> = {
    signIn:         ['Welcome back', 'Log in to pick up your resume where you left it.'],
    signUp:         ['Create your free account', 'Build, check and tailor your resume in minutes.'],
    forgotPassword: ['Reset your password', "Enter your email and we'll send you a reset link."],
    resetPassword:  ['Choose a new password', 'Use at least 6 characters.'],
  };

  const submitLabel: Record<AuthMode, string> = {
    signIn:         'Log in',
    signUp:         'Create account',
    forgotPassword: 'Send reset link',
    resetPassword:  'Save new password',
  };

  const isAuthMode = mode === 'signIn' || mode === 'signUp';
  const strength = passwordStrength(password);
  const [title, subtitle] = verifyFor
    ? ['Verify your email address', 'Your account is ready. One last step.']
    : titles[mode];

  const closeScreen = verifyFor ? () => { onSuccess(); onClose(); } : onClose;

  const socials: { id: Exclude<AuthMethod, 'email'>; label: string; icon: ReactNode; onClick: () => void }[] = [
    { id: 'google',   label: 'Continue with Google',   icon: <GoogleIcon />,   onClick: startGoogleRedirectFlow },
    { id: 'linkedin', label: 'Continue with LinkedIn', icon: <LinkedInIcon />, onClick: () => startProviderRedirectFlow('linkedin') },
    { id: 'github',   label: 'Continue with GitHub',   icon: <GitHubIcon />,   onClick: () => startProviderRedirectFlow('github') },
  ];

  /* Mascot ─────────────────────────────────────────────────────── */

  const typingSecret = focused === 'password' || focused === 'confirm';
  const secretShown = focused === 'confirm' ? showConfirm : showPw;
  const mood: MascotMood =
    done ? 'happy' :
    oops ? 'oops' :
    typingSecret ? (secretShown ? 'peeking' : 'hiding') :
    focused === 'email' || focused === 'name' ? 'looking' :
    'idle';
  const firstName = name.trim().split(/\s+/)[0];
  const reaction =
    mood === 'happy' ? "Yay, you're in!" :
    mood === 'hiding' ? "Eyes closed. I'm not looking!" :
    mood === 'peeking' ? 'Okay… maybe one tiny peek.' :
    mood === 'oops' ? "Oops! Let's try that again." :
    focused === 'name' ? (firstName ? `Nice to meet you, ${firstName}!` : 'What should I call you?') :
    focused === 'email' ? (email ? 'Noting it down…' : 'Type your email here.') :
    null;
  const leoFrames: LeoFrame[] =
    verifyFor && !done ? [{ pose: 'checklist', line: 'Check your inbox for my letter!' }] :
    reaction ? [{ pose: MOOD_POSE[mood], line: reaction }] :
    IDLE_FRAMES[mode];

  /* Render ─────────────────────────────────────────────────────── */

  const eyeButton = (shown: boolean, toggle: () => void) => (
    <button type="button" className="auth-eye" onMouseDown={e => e.preventDefault()} onClick={toggle} aria-label={shown ? 'Hide password' : 'Show password'}>
      {shown ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );

  return (
    <>
      <Confetti ref={confettiRef} manualstart />

      <div className="auth-root" role="dialog" aria-modal="true" aria-label={title}>
        <BrandPanel mode={mode} mood={mood} frames={leoFrames} />

        <div className="auth-main">
          <div className="auth-topbar">
            <div className="auth-logo">
              <img src={cvmindLogo} alt="" />
              CVMind
            </div>
            <button type="button" className="auth-back" onClick={closeScreen}>
              <ArrowLeft size={14} /> Back to site
            </button>
          </div>

          <div className="auth-center">
            <div className="auth-panel">
              {isAuthMode && !verifyFor && !done && (
                <div className="auth-tabs" role="tablist">
                  {(['signIn', 'signUp'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      className={`auth-tab${mode === m ? ' on' : ''}`}
                      onClick={() => mode !== m && switchMode(m)}
                      disabled={loading}
                    >
                      {mode === m && (
                        <motion.span layoutId="auth-tab-pill" className="auth-tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                      )}
                      <span className="auth-tab-label">{m === 'signIn' ? 'Log in' : 'Sign up'}</span>
                    </button>
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={done ? 'done' : verifyFor ? 'verify' : mode}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {done ? (
                    <div className="auth-done">
                      <motion.div
                        className="auth-done-ring"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <CheckCircle size={38} />
                      </motion.div>
                      <strong>{verifyFor ? 'Email verified!' : mode === 'signUp' ? 'Account created!' : "You're in!"}</strong>
                      <p>Taking you to your dashboard…</p>
                    </div>
                  ) : (
                    <>
                      {/* The verify panel brings its own heading */}
                      {!verifyFor && (
                        <>
                          <h1 className="auth-title">{title}</h1>
                          <p className="auth-sub">{subtitle}</p>
                        </>
                      )}

                      {verifyFor ? (
                        <>
                          <VerifyEmailPanel
                            email={verifyFor.email}
                            initialCooldown={verifyFor.sendFailed ? 0 : 60}
                            sendFailed={verifyFor.sendFailed}
                            onVerified={fireSuccess}
                          />
                          <p className="auth-foot" style={{ marginTop: 14 }}>
                            <button type="button" className="auth-link" onClick={() => { onSuccess(); onClose(); }}>
                              I'll verify later
                            </button>
                          </p>
                        </>
                      ) : (
                        <>
                          {isAuthMode && (
                            <>
                              <div className="auth-social">
                                {socials.map(s => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    className={`auth-social-btn${lastAuth === s.id ? ' last' : ''}`}
                                    onClick={s.onClick}
                                    disabled={loading}
                                  >
                                    {s.icon}
                                    {s.label}
                                    {lastAuth === s.id && <span className="auth-badge">Last used</span>}
                                  </button>
                                ))}
                              </div>
                              <div className="auth-divider">
                                {lastAuth === 'email' ? 'or use your email (last used)' : 'or continue with email'}
                              </div>
                            </>
                          )}

                          <form className="auth-form" onSubmit={onSubmit} noValidate>
                            {mode === 'signUp' && (
                              <label className="auth-field">
                                <input
                                  className="auth-input"
                                  type="text"
                                  placeholder="Full name"
                                  value={name}
                                  onChange={e => setName(e.target.value)}
                                  autoComplete="name"
                                  onFocus={() => setFocused('name')}
                                  onBlur={() => setFocused(null)}
                                  disabled={loading}
                                />
                                <span className="auth-field-icon"><User size={17} /></span>
                              </label>
                            )}

                            {mode !== 'resetPassword' && (
                              <label className="auth-field">
                                <input
                                  className="auth-input"
                                  type="email"
                                  placeholder="Email address"
                                  value={email}
                                  onChange={e => setEmail(e.target.value)}
                                  autoComplete="email"
                                  onFocus={() => setFocused('email')}
                                  onBlur={() => setFocused(null)}
                                  disabled={loading}
                                />
                                <span className="auth-field-icon"><Mail size={17} /></span>
                              </label>
                            )}

                            {mode !== 'forgotPassword' && (
                              <label className="auth-field">
                                <input
                                  className="auth-input"
                                  type={showPw ? 'text' : 'password'}
                                  placeholder={mode === 'resetPassword' ? 'New password' : 'Password'}
                                  value={password}
                                  onChange={e => setPassword(e.target.value)}
                                  autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                                  onFocus={() => setFocused('password')}
                                  onBlur={() => setFocused(null)}
                                  disabled={loading}
                                  autoFocus={mode === 'resetPassword'}
                                />
                                <span className="auth-field-icon"><Lock size={17} /></span>
                                {eyeButton(showPw, () => setShowPw(p => !p))}
                              </label>
                            )}

                            {(mode === 'signUp' || mode === 'resetPassword') && password && (
                              <div className="auth-strength" aria-live="polite">
                                {[1, 2, 3].map(i => (
                                  <span
                                    key={i}
                                    className="auth-strength-seg"
                                    style={{ background: strength >= i ? STRENGTH[strength].color : undefined }}
                                  />
                                ))}
                                <span className="auth-strength-label" style={{ color: STRENGTH[strength].color }}>
                                  {STRENGTH[strength].label || 'Too short'}
                                </span>
                              </div>
                            )}

                            {mode === 'signUp' && (
                              <label className="auth-field">
                                <input
                                  className="auth-input"
                                  type={showConfirm ? 'text' : 'password'}
                                  placeholder="Confirm password"
                                  value={confirm}
                                  onChange={e => setConfirm(e.target.value)}
                                  autoComplete="new-password"
                                  onFocus={() => setFocused('confirm')}
                                  onBlur={() => setFocused(null)}
                                  disabled={loading}
                                />
                                <span className="auth-field-icon"><Lock size={17} /></span>
                                {eyeButton(showConfirm, () => setShowConfirm(p => !p))}
                              </label>
                            )}

                            {mode === 'signIn' && (
                              <div className="auth-row-end">
                                <button type="button" className="auth-link" onClick={() => switchMode('forgotPassword')}>
                                  Forgot password?
                                </button>
                              </div>
                            )}

                            {/* Captcha (sign in, and risky sign-ups) */}
                            <AnimatePresence initial={false}>
                              {showCaptcha && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.25 }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div className="auth-captcha">
                                      <div className="auth-captcha-img">
                                        {captchaLoading ? (
                                          <RefreshCw size={18} className="animate-spin" style={{ color: '#6b7280' }} />
                                        ) : captcha ? (
                                          <img
                                            src={`data:image/svg+xml;utf8,${encodeURIComponent(captcha.svg)}`}
                                            alt="Captcha challenge"
                                            draggable={false}
                                          />
                                        ) : (
                                          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Captcha unavailable</span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        className="auth-icon-btn"
                                        onClick={loadCaptcha}
                                        disabled={loading || captchaLoading}
                                        aria-label="Get a new code"
                                        title="Get a new code"
                                      >
                                        <RefreshCw size={16} />
                                      </button>
                                    </div>
                                    <label className="auth-field">
                                      <input
                                        className="auth-input"
                                        type="text"
                                        placeholder="Enter the code above"
                                        value={captchaAnswer}
                                        onChange={e => setCaptchaAnswer(e.target.value.toUpperCase())}
                                        autoComplete="off"
                                        onFocus={() => setFocused('captcha')}
                                        onBlur={() => setFocused(null)}
                                        disabled={loading}
                                      />
                                      <span className="auth-field-icon"><ShieldCheck size={17} /></span>
                                    </label>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <AnimatePresence>
                              {errorMsg && (
                                <motion.div
                                  key="err"
                                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                  className="auth-banner err"
                                  role="alert"
                                >
                                  <AlertCircle size={15} />
                                  {errorMsg}
                                </motion.div>
                              )}
                              {successMsg && (
                                <motion.div
                                  key="ok"
                                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                  className="auth-banner ok"
                                  role="status"
                                >
                                  <CheckCircle size={15} />
                                  {successMsg}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <button type="submit" className="auth-submit" disabled={loading}>
                              {loading ? <span className="auth-spinner" /> : <>{submitLabel[mode]} <ArrowRight size={17} /></>}
                            </button>

                            {mode === 'forgotPassword' && (
                              <button type="button" className="auth-ghost-btn" onClick={() => switchMode('signIn')}>
                                ← Back to log in
                              </button>
                            )}
                          </form>

                          {mode === 'signUp' && (
                            <p className="auth-legal">
                              By signing up, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and{' '}
                              <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                            </p>
                          )}
                          {mode === 'signIn' && (
                            <p className="auth-foot">
                              New to CVMind?{' '}
                              <button type="button" className="auth-link" onClick={() => switchMode('signUp')}>
                                Create a free account
                              </button>
                            </p>
                          )}
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  User, CheckCircle, AlertCircle, X, Sparkles,
  ShieldCheck, RefreshCw,
} from 'lucide-react';
import {
  Confetti,
  TextLoop,
  BlurFade,
  GlassButton,
  GlassInput,
  GradientBackground,
  type ConfettiRef,
} from './ui/sign-up';
import { useRef } from 'react';

/* ─── Types ─────────────────────────────────────────────────────── */

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword' | 'resetPassword';

const MODE_STEPS: Record<AuthMode, string[]> = {
  signIn:         ['email', 'password', 'captcha'],
  signUp:         ['email', 'password', 'confirm'],
  forgotPassword: ['email'],
  resetPassword:  ['password'],
};

/* ─── API helper ─────────────────────────────────────────────────── */

function getBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com')
  );
}

/* ─── Step dots ──────────────────────────────────────────────────── */

function StepDots({ total, current }: { total: number; current: number }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? '1.5rem' : '0.5rem',
            opacity: i <= current ? 1 : 0.3,
          }}
          transition={{ duration: 0.25 }}
          className="h-[6px] rounded-full"
          style={{ background: i === current ? 'var(--blue)' : 'var(--border-strong)' }}
        />
      ))}
    </div>
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
  const [step, setStep] = useState(0);

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

  const confettiRef = useRef<ConfettiRef>(null);

  const steps = MODE_STEPS[mode];
  const currentStepName = steps[step];
  const isLastStep = step === steps.length - 1;

  /* Reset on open ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
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
    setStep(0);
    setName(''); setPassword(''); setConfirm('');
    setShowPw(false); setShowConfirm(false);
    setCaptcha(null); setCaptchaAnswer('');
    setErrorMsg(null); setSuccessMsg(null);
    setLoading(false); setDone(false);

    // Surface OAuth redirect errors (GitHub/LinkedIn) passed back via query param
    const authError = params.get('authError');
    if (authError) {
      setErrorMsg(authError);
      params.delete('authError');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, [isOpen]);

  /* Load a fresh captcha whenever the sign-in captcha step is shown ─ */
  useEffect(() => {
    if (isOpen && mode === 'signIn' && MODE_STEPS.signIn[step] === 'captcha') loadCaptcha();
  }, [isOpen, mode, step]);

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
    setMode(m); setStep(0);
    setPassword(''); setConfirm('');
    setShowPw(false); setShowConfirm(false);
    setCaptcha(null); setCaptchaAnswer('');
    setDone(false);
  }

  function goBack() {
    clearMessages();
    if (step > 0) setStep(s => s - 1);
    else switchMode('signIn');
  }

  function goNext() {
    clearMessages();

    // Validate current step
    if (currentStepName === 'email') {
      if (!email.trim()) { setErrorMsg('Please enter your email address.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorMsg('Please enter a valid email.'); return; }
      if (mode === 'signUp' && !name.trim()) { setErrorMsg('Please enter your full name.'); return; }
    }
    if (currentStepName === 'password' && mode !== 'forgotPassword') {
      if (!password) { setErrorMsg('Please enter a password.'); return; }
      if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    }
    if (currentStepName === 'captcha') {
      if (!captchaAnswer.trim()) { setErrorMsg('Please enter the code shown in the image.'); return; }
    }

    if (!isLastStep) { setStep(s => s + 1); return; }

    handleSubmit();
  }

  /* Submit ─────────────────────────────────────────────────────── */

  async function handleSubmit() {
    clearMessages();

    if (mode === 'forgotPassword') {
      if (!email.trim()) { setErrorMsg('Please enter your email.'); return; }
      setLoading(true);
      try {
        const res = await fetch(`${getBaseUrl()}/api/auth/forgot-password`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed.');
        setSuccessMsg(data.message || 'A reset link has been sent to your email.');
      } catch (err: any) { setErrorMsg(err.message || 'Connection failed.'); }
      finally { setLoading(false); }
      return;
    }

    if (mode === 'resetPassword') {
      if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
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
      } catch (err: any) { setErrorMsg(err.message || 'Connection failed.'); }
      finally { setLoading(false); }
      return;
    }

    if (mode === 'signUp') {
      if (!confirm) { setErrorMsg('Please confirm your password.'); return; }
      if (password !== confirm) { setErrorMsg('Passwords do not match.'); return; }
      setLoading(true);
      try {
        const res = await fetch(`${getBaseUrl()}/api/auth/signup`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Sign up failed.');
        localStorage.setItem('cvmind_logged_in', 'true');
        localStorage.setItem('cvmind_user', JSON.stringify(data.user));
        fireSuccess();
      } catch (err: any) { setErrorMsg(err.message || 'Connection failed.'); }
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
      localStorage.setItem('cvmind_logged_in', 'true');
      localStorage.setItem('cvmind_user', JSON.stringify(data.user));
      fireSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection failed.');
      loadCaptcha(); // challenge is single-use — get a fresh one for the retry
    }
    finally { setLoading(false); }
  }

  /* Google OAuth ───────────────────────────────────────────────── */

  function startGoogleRedirectFlow() {
    const clientId = '1036904236561-m92usq7j7pso47r9k02n9dtdmm563162.apps.googleusercontent.com';
    const redirectUri = window.location.origin + '/';
    const responseType = 'id_token';
    const scope = 'openid email profile';
    const nonce = 'cvmindnonce' + Math.random().toString(36).substring(2, 15);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&nonce=${nonce}`;
    window.location.assign(googleAuthUrl);
  }

  /* GitHub / LinkedIn OAuth — server-side flow via backend redirect ─ */

  function startProviderRedirectFlow(provider: 'github' | 'linkedin') {
    window.location.assign(
      `${getBaseUrl()}/api/auth/${provider}?origin=${encodeURIComponent(window.location.origin)}`
    );
  }

  /* Success ────────────────────────────────────────────────────── */

  function fireSuccess() {
    setDone(true);
    const fire = (x: number, angle: number) => {
      confettiRef.current?.fire({
        origin: { x, y: 0.6 }, angle, spread: 55,
        particleCount: 80, startVelocity: 55,
        colors: ['#2997ff', '#7c3aed', '#2dc08d', '#f59e0b', '#ff453a'],
      });
    };
    setTimeout(() => { fire(0.05, 60); fire(0.95, 120); }, 200);
    setTimeout(() => { fire(0.1, 70);  fire(0.9, 110);  }, 500);
    setTimeout(() => { onSuccess(); onClose(); }, 1800);
  }

  /* Labels ─────────────────────────────────────────────────────── */

  const headings: Record<AuthMode, string[]> = {
    signIn:         ['Welcome back.', 'Great to see you.', 'Sign in below.'],
    signUp:         ['Create your account.', 'Join CV Mind.', 'Get started today.'],
    forgotPassword: ['Forgot password?', 'No worries.', 'Reset it now.'],
    resetPassword:  ['Choose a new password.', 'Almost done.', 'Make it strong.'],
  };

  const stepHints: Record<string, string> = {
    email:    mode === 'signUp' ? 'Enter your name and email to continue' : 'Enter your email address',
    password: mode === 'signUp' ? 'Choose a password (min 6 characters)' : 'Enter your password',
    confirm:  'Re-enter your password to confirm',
    captcha:  "Type the code below to verify you're human",
  };

  const submitLabel: Record<AuthMode, string> = {
    signIn:         'Sign In',
    signUp:         'Create Account',
    forgotPassword: 'Send Reset Link',
    resetPassword:  'Save New Password',
  };

  const showGoogle = (mode === 'signIn' || mode === 'signUp') && currentStepName === 'email' && !done;
  const showBackBtn = step > 0 || mode === 'forgotPassword';
  const isForgotOrReset = mode === 'forgotPassword' || mode === 'resetPassword';

  /* Render ─────────────────────────────────────────────────────── */

  return (
    <>
      <Confetti ref={confettiRef} manualstart />

      <div
        className="fixed inset-0 z-[100] flex flex-col"
        style={{ background: 'var(--bg-primary)' }}
      >
        <GradientBackground />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'var(--gradient-brand)' }}
            >
              <Sparkles size={15} className="text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              CV Mind
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:opacity-70"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Centered form */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-10">
          <div className="w-full max-w-[420px]">

            {/* Heading */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                <TextLoop interval={3.5}>
                  {headings[mode].map((h, i) => <span key={i}>{h}</span>)}
                </TextLoop>
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {stepHints[currentStepName]}
              </p>
            </div>

            {/* Step dots */}
            <StepDots total={steps.length} current={step} />

            {/* Card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${mode}-${step}`}
                  initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0,  filter: 'blur(0px)' }}
                  exit={{    opacity: 0, x: -20, filter: 'blur(4px)' }}
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex flex-col gap-4"
                >
                  {/* Success / Done state */}
                  {done ? (
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <CheckCircle size={48} style={{ color: 'var(--green)' }} />
                      </motion.div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {mode === 'signUp' ? 'Account created!' : 'Signed in!'}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        Redirecting you now…
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Email step */}
                      {currentStepName === 'email' && (
                        <>
                          {mode === 'signUp' && (
                            <BlurFade delay={0}>
                              <GlassInput
                                type="text"
                                placeholder="Full name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoComplete="name"
                                icon={<User size={16} />}
                                disabled={loading}
                              />
                            </BlurFade>
                          )}
                          <BlurFade delay={mode === 'signUp' ? 0.06 : 0}>
                            <GlassInput
                              type="email"
                              placeholder="Email address"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              autoComplete="email"
                              icon={<Mail size={16} />}
                              disabled={loading}
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter' && !loading) goNext(); }}
                            />
                          </BlurFade>
                        </>
                      )}

                      {/* Password step */}
                      {currentStepName === 'password' && (
                        <BlurFade delay={0}>
                          <GlassInput
                            type={showPw ? 'text' : 'password'}
                            placeholder={mode === 'resetPassword' ? 'New password' : 'Password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                            icon={<Lock size={16} />}
                            rightIcon={
                              <button
                                type="button"
                                onClick={() => setShowPw(p => !p)}
                                tabIndex={-1}
                                style={{ lineHeight: 0, color: 'inherit' }}
                              >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            }
                            disabled={loading}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter' && !loading) goNext(); }}
                          />
                        </BlurFade>
                      )}

                      {/* Confirm step */}
                      {currentStepName === 'confirm' && (
                        <BlurFade delay={0}>
                          <GlassInput
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="Confirm password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            autoComplete="new-password"
                            icon={<Lock size={16} />}
                            rightIcon={
                              <button
                                type="button"
                                onClick={() => setShowConfirm(p => !p)}
                                tabIndex={-1}
                                style={{ lineHeight: 0, color: 'inherit' }}
                              >
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            }
                            disabled={loading}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter' && !loading) goNext(); }}
                          />
                        </BlurFade>
                      )}

                      {/* Captcha step (sign in) */}
                      {currentStepName === 'captcha' && (
                        <BlurFade delay={0}>
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex flex-1 items-center justify-center rounded-xl overflow-hidden"
                                style={{ border: '1px solid var(--border)', background: '#f4f4f7', minHeight: '64px' }}
                              >
                                {captchaLoading ? (
                                  <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                                ) : captcha ? (
                                  <img
                                    src={`data:image/svg+xml;utf8,${encodeURIComponent(captcha.svg)}`}
                                    alt="Captcha challenge"
                                    style={{ display: 'block', height: '64px' }}
                                    draggable={false}
                                  />
                                ) : (
                                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Captcha unavailable</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={loadCaptcha}
                                disabled={loading || captchaLoading}
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all hover:opacity-70"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                aria-label="Get a new code"
                                title="Get a new code"
                              >
                                <RefreshCw size={15} />
                              </button>
                            </div>
                            <GlassInput
                              type="text"
                              placeholder="Enter the code"
                              value={captchaAnswer}
                              onChange={e => setCaptchaAnswer(e.target.value.toUpperCase())}
                              autoComplete="off"
                              icon={<ShieldCheck size={16} />}
                              disabled={loading}
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter' && !loading) goNext(); }}
                            />
                          </div>
                        </BlurFade>
                      )}

                      {/* Error / success banners */}
                      <AnimatePresence>
                        {errorMsg && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                            style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}
                          >
                            <AlertCircle size={14} className="flex-shrink-0" />
                            {errorMsg}
                          </motion.div>
                        )}
                        {successMsg && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                            style={{ background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(45,192,141,0.2)' }}
                          >
                            <CheckCircle size={14} className="flex-shrink-0" />
                            {successMsg}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Navigation */}
                      {isForgotOrReset ? (
                        /* Forgot / reset: full-width submit button */
                        <div className="flex flex-col gap-3 pt-1">
                          <button
                            type="button"
                            onClick={goNext}
                            disabled={loading}
                            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
                            style={{ background: 'var(--gradient-brand)', boxShadow: '0 4px 20px rgba(124,58,237,0.25)' }}
                          >
                            {loading ? (
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : submitLabel[mode]}
                          </button>
                          {mode === 'forgotPassword' && (
                            <button
                              type="button"
                              onClick={goBack}
                              className="text-sm text-center"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              ← Back to sign in
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Sign in / sign up: arrow buttons row */
                        <div className="flex items-center justify-between pt-1">
                          {showBackBtn ? (
                            <GlassButton variant="arrow" onClick={goBack} disabled={loading} aria-label="Go back">
                              <ArrowLeft size={16} />
                            </GlassButton>
                          ) : <div />}

                          {mode === 'signIn' && currentStepName === 'password' && (
                            <button
                              type="button"
                              onClick={() => switchMode('forgotPassword')}
                              className="text-xs font-medium"
                              style={{ color: 'var(--blue)' }}
                            >
                              Forgot password?
                            </button>
                          )}

                          <GlassButton
                            variant="arrow"
                            onClick={goNext}
                            isLoading={loading}
                            aria-label={isLastStep ? submitLabel[mode] : 'Continue'}
                          >
                            <ArrowRight size={16} />
                          </GlassButton>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Google OAuth */}
            <AnimatePresence>
              {showGoogle && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ delay: 0.1 }}
                  className="mt-4"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>or continue with</span>
                    <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                  </div>
                  <div className="flex justify-center w-full">
                    <button
                      type="button"
                      onClick={startGoogleRedirectFlow}
                      disabled={loading}
                      className="flex w-[370px] max-w-full items-center justify-center gap-3 rounded-full border py-3 px-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                      style={{
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.47 2.18 4.95l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  </div>
                  <div className="mt-3 flex justify-center w-full">
                    <div className="flex w-[370px] max-w-full items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startProviderRedirectFlow('github')}
                        disabled={loading}
                        className="flex flex-1 items-center justify-center gap-2.5 rounded-full border py-3 px-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                        style={{
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        GitHub
                      </button>
                      <button
                        type="button"
                        onClick={() => startProviderRedirectFlow('linkedin')}
                        disabled={loading}
                        className="flex flex-1 items-center justify-center gap-2.5 rounded-full border py-3 px-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                        style={{
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#0A66C2">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        LinkedIn
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mode toggle footer */}
            {!done && !isForgotOrReset && (
              <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {mode === 'signIn' ? (
                  <>
                    Don't have an account?{' '}
                    <button type="button" onClick={() => switchMode('signUp')}
                      className="font-semibold" style={{ color: 'var(--blue)' }}>
                      Sign up free
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => switchMode('signIn')}
                      className="font-semibold" style={{ color: 'var(--blue)' }}>
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

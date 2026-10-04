import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Mail, MailOpen, Pencil, RefreshCw } from 'lucide-react';
import { GlassInput } from './ui/sign-up';
import { changeEmail, inboxLink, refreshVerification, resendVerification } from '../lib/verification';

interface VerifyEmailPanelProps {
  email: string;
  // Seconds before the first resend is allowed (the sign-up email was just sent)
  initialCooldown?: number;
  // Sign-up could not send the first email
  sendFailed?: boolean;
  onVerified: () => void;
}

// "Verify your email address": shown after sign-up and whenever an unverified account opens a locked feature
export default function VerifyEmailPanel({ email, initialCooldown = 0, sendFailed = false, onVerified }: VerifyEmailPanelProps) {
  const [address, setAddress] = useState(email);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [busy, setBusy] = useState<'resend' | 'change' | 'check' | null>(null);
  const [error, setError] = useState<string | null>(sendFailed ? "We couldn't send the verification email right now. Please try again later." : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const clear = () => { setError(null); setNotice(null); };

  async function resend() {
    clear();
    setBusy('resend');
    const r = await resendVerification();
    setBusy(null);
    if (r.alreadyVerified) { onVerified(); return; }
    if (r.ok) setNotice(r.message || `We've sent a new verification link to ${address}.`);
    // A cooldown just restarts the countdown on the button
    else if (!r.cooldown) setError(r.message);
    if (r.retryAfter) setCooldown(r.retryAfter);
  }

  async function submitNewEmail() {
    clear();
    const value = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setError('Please enter a valid email address.'); return; }
    setBusy('change');
    const r = await changeEmail(value);
    setBusy(null);
    if (!r.ok) { setError(r.message); if (r.retryAfter) setCooldown(r.retryAfter); return; }
    setAddress(value.toLowerCase());
    setEditing(false);
    setNewEmail('');
    setNotice(r.message);
    setCooldown(r.retryAfter);
  }

  async function checkNow() {
    clear();
    setBusy('check');
    const verified = await refreshVerification();
    setBusy(null);
    if (verified) onVerified();
    else setError("Your email isn't verified yet. Open the link in the email we sent, then try again.");
  }

  // Inline padding: theme.css resets every element's padding, which overrides Tailwind's spacing classes
  const buttonStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '12px 16px' };
  const noticeStyle = { padding: '10px 12px' };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--blue-dim, rgba(41,151,255,0.12))', color: 'var(--blue)' }}>
          <Mail size={26} />
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          We've sent a verification link to <strong style={{ color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{address}</strong>.
          Please verify your email address to continue using CVMind.
        </p>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <GlassInput
            type="email"
            placeholder="Your correct email address"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            autoComplete="email"
            icon={<Mail size={16} />}
            disabled={busy !== null}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && busy === null) submitNewEmail(); }}
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setEditing(false); clear(); }} disabled={busy !== null}
              className="flex-1 rounded-xl text-sm font-semibold transition-all hover:opacity-80" style={buttonStyle}>
              Cancel
            </button>
            <button type="button" onClick={submitNewEmail} disabled={busy !== null}
              className="flex-1 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--gradient-brand)', padding: '12px 16px' }}>
              {busy === 'change' ? 'Saving…' : 'Send link here'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <a href={inboxLink(address)} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-95"
            style={{ background: 'var(--gradient-brand)', boxShadow: '0 4px 20px rgba(124,58,237,0.25)', padding: '12px 16px', color: '#fff', textDecoration: 'none' }}>
            <MailOpen size={16} /> Open Email
          </a>
          <button type="button" onClick={resend} disabled={busy !== null || cooldown > 0}
            className="flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-60"
            style={buttonStyle}>
            <RefreshCw size={15} className={busy === 'resend' ? 'animate-spin' : ''} />
            {cooldown > 0 ? `Resend available in ${cooldown} seconds` : 'Resend Verification Email'}
          </button>
          <button type="button" onClick={() => { clear(); setEditing(true); }} disabled={busy !== null}
            className="flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={buttonStyle}>
            <Pencil size={15} /> Change Email
          </button>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-lg text-sm" role="alert"
            style={{ ...noticeStyle, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={14} className="flex-shrink-0" /> {error}
          </motion.div>
        )}
        {notice && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-lg text-sm" role="status"
            style={{ ...noticeStyle, background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(45,192,141,0.2)' }}>
            <CheckCircle size={14} className="flex-shrink-0" /> {notice}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        Didn't receive the email? Check your spam folder or resend the verification email.{' '}
        <button type="button" onClick={checkNow} disabled={busy !== null} className="font-semibold" style={{ color: 'var(--blue)' }}>
          {busy === 'check' ? 'Checking…' : "I've verified it"}
        </button>
      </p>
    </div>
  );
}

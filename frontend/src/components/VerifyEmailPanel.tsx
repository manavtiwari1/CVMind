import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowUpRight, Check, CheckCircle, RefreshCw } from 'lucide-react';
import { changeEmail, inboxLink, refreshVerification, resendVerification } from '../lib/verification';
import cvmindLogo from '../assets/cvmind_logo_transparent.png';
import './VerifyEmailPanel.css';

interface VerifyEmailPanelProps {
  email: string;
  // Seconds before the first resend is allowed (the sign-up email was just sent)
  initialCooldown?: number;
  // Sign-up could not send the first email
  sendFailed?: boolean;
  onVerified: () => void;
}

// Name of the inbox "Open …" takes the user to (matches the hosts in inboxLink)
function inboxName(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (['gmail.com', 'googlemail.com'].includes(domain)) return 'Gmail';
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) return 'Outlook';
  if (domain.startsWith('yahoo.')) return 'Yahoo Mail';
  if (['icloud.com', 'me.com', 'mac.com'].includes(domain)) return 'iCloud Mail';
  if (['proton.me', 'protonmail.com'].includes(domain)) return 'Proton Mail';
  return 'your email app';
}

const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* Envelope with the verification letter sliding out, a CVMind stamp and a postmark */
function EnvelopeScene() {
  return (
    <div className="vep-scene" aria-hidden="true">
      <svg className="vep-postlines" viewBox="0 0 90 30" fill="none">
        <path d="M2 6c10-5 20 5 30 0s20 5 30 0 20 5 26 1M2 15c10-5 20 5 30 0s20 5 30 0 20 5 26 1M2 24c10-5 20 5 30 0s20 5 30 0 20 5 26 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      <div className="vep-env">
        <svg className="vep-env-back" viewBox="0 0 168 150">
          <path d="M4 50 84 6l80 44Z" fill="#e6d8bf" stroke="#d9c8a8" strokeLinejoin="round" />
          <rect x="0" y="46" width="168" height="104" rx="9" fill="#efe4cf" />
        </svg>

        <div className="vep-letter">
          <span className="vep-letter-line w60" />
          <span className="vep-letter-line w85" />
          <span className="vep-letter-line w70" />
          <span className="vep-letter-btn"><Check size={9} strokeWidth={4} /> Verify</span>
        </div>

        <svg className="vep-env-front" viewBox="0 0 168 150">
          <path d="M0 80 84 118l84-38v61a9 9 0 0 1-9 9H9a9 9 0 0 1-9-9Z" fill="#f7efdf" stroke="#e1d2b6" strokeLinejoin="round" />
        </svg>

        <div className="vep-stamp"><img src={cvmindLogo} alt="" /></div>
        <div className="vep-postmark"><span>CVMIND</span><span className="vep-postmark-mid">✓ MAIL</span><span>2026</span></div>
      </div>
    </div>
  );
}

// "Verify your email address": shown after sign-up and whenever an unverified account opens a locked feature
export default function VerifyEmailPanel({ email, initialCooldown = 0, sendFailed = false, onVerified }: VerifyEmailPanelProps) {
  const [address, setAddress] = useState(email);
  const [cooldown, setCooldown] = useState(initialCooldown);
  // Length of the current cooldown, for the progress bar on the resend button
  const [cooldownTotal, setCooldownTotal] = useState(initialCooldown);
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
  const startCooldown = (seconds: number) => { setCooldown(seconds); setCooldownTotal(seconds); };

  async function resend() {
    clear();
    setBusy('resend');
    const r = await resendVerification();
    setBusy(null);
    if (r.alreadyVerified) { onVerified(); return; }
    if (r.ok) setNotice(r.message || `We've sent a new verification link to ${address}.`);
    // A cooldown just restarts the countdown on the button
    else if (!r.cooldown) setError(r.message);
    if (r.retryAfter) startCooldown(r.retryAfter);
  }

  async function submitNewEmail() {
    clear();
    const value = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setError('Please enter a valid email address.'); return; }
    setBusy('change');
    const r = await changeEmail(value);
    setBusy(null);
    if (!r.ok) { setError(r.message); if (r.retryAfter) startCooldown(r.retryAfter); return; }
    setAddress(value.toLowerCase());
    setEditing(false);
    setNewEmail('');
    setNotice(r.message);
    startCooldown(r.retryAfter);
  }

  async function checkNow() {
    clear();
    setBusy('check');
    const verified = await refreshVerification();
    setBusy(null);
    if (verified) onVerified();
    else setError("Not verified yet. Open the link in the email we sent, then try again.");
  }

  const provider = inboxName(address);
  const cooldownLeft = cooldownTotal > 0 ? (cooldown / cooldownTotal) * 100 : 0;

  return (
    <div className="vep">
      <EnvelopeScene />

      <div className="vep-body">
        <h3 className="vep-title">Check your <em>inbox</em></h3>
        <p className="vep-text">Click the link we emailed you to unlock everything in CVMind.</p>

        {editing ? (
          <div className="vep-edit">
            <input
              className="vep-input"
              type="email"
              placeholder="Your correct email address"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              autoComplete="email"
              disabled={busy !== null}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && busy === null) submitNewEmail(); }}
            />
            <div className="vep-row">
              <button type="button" className="vep-btn ghost" onClick={() => { setEditing(false); clear(); }} disabled={busy !== null}>
                Cancel
              </button>
              <button type="button" className="vep-btn ink" onClick={submitNewEmail} disabled={busy !== null}>
                {busy === 'change' ? 'Saving…' : 'Send link here'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="vep-address">
              <span className="vep-address-label">Sent to</span>
              <strong>{address}</strong>
              <button type="button" className="vep-change" onClick={() => { clear(); setEditing(true); }} disabled={busy !== null}>
                Change
              </button>
            </div>

            <a className="vep-btn ink" href={inboxLink(address)} target="_blank" rel="noopener noreferrer">
              Open {provider} <ArrowUpRight size={16} />
            </a>

            <div className="vep-row">
              <button type="button" className="vep-btn ghost vep-resend" onClick={resend} disabled={busy !== null || cooldown > 0}>
                {cooldown > 0 && <span className="vep-resend-fill" style={{ width: `${cooldownLeft}%` }} />}
                <span className="vep-btn-inner">
                  <RefreshCw size={14} className={busy === 'resend' ? 'animate-spin' : ''} />
                  {cooldown > 0 ? `Resend in ${formatSeconds(cooldown)}` : 'Resend link'}
                </span>
              </button>
              <button type="button" className="vep-btn ghost" onClick={checkNow} disabled={busy !== null}>
                <Check size={14} strokeWidth={2.6} />
                {busy === 'check' ? 'Checking…' : "I've verified"}
              </button>
            </div>
          </>
        )}

        <AnimatePresence>
          {error && (
            <motion.div key="err" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="vep-note err" role="alert">
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}
          {notice && (
            <motion.div key="ok" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="vep-note ok" role="status">
              <CheckCircle size={14} /> {notice}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="vep-tip">Can't find it? Look in <b>Spam</b> or <b>Promotions</b>.</p>
      </div>
    </div>
  );
}

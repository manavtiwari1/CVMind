import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Copy, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import cvmindIcon from '../../assets/cvmind_icon.png';
import { api, saveSession } from './api';
import type { AdminSession } from './api';
import { Spinner } from './ui';

interface AdminLoginProps {
  onLogin: (session: AdminSession) => void;
  setCurrentPage: (page: string) => void;
  notice?: string;
}

type Step = 'credentials' | 'mfa-verify' | 'mfa-email' | 'mfa-setup' | 'backup-codes' | 'forgot' | 'reset';

interface LoginStepResponse {
  mfaRequired: boolean;
  mfaToken: string;
  needs2faSetup: boolean;
  mustChangePassword: boolean;
  maskedEmail: string;
  username: string;
}

export default function AdminLogin({ onLogin, setCurrentPage, notice }: AdminLoginProps) {
  const [step, setStep] = useState<Step>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('resetToken') ? 'reset' : 'credentials';
    } catch {
      return 'credentials';
    }
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // MFA state
  const [mfaToken, setMfaToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [pendingSession, setPendingSession] = useState<AdminSession | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Email reset state
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetToken, setResetToken] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('resetToken') || '';
    } catch {
      return '';
    }
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    if (step !== 'mfa-setup' || !mfaToken || qrDataUrl) return;
    setBusy(true);
    api<{ qrDataUrl: string; manualKey: string }>('/mfa/setup-init', {
      method: 'POST',
      body: { mfaToken }
    })
      .then((res) => {
        setQrDataUrl(res.qrDataUrl);
        setManualKey(res.manualKey);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not initialize 2FA setup.'))
      .finally(() => setBusy(false));
  }, [step, mfaToken, qrDataUrl]);

  const finishLogin = (data: AdminSession) => {
    const session = { token: data.token, admin: data.admin };
    saveSession(session, remember);
    onLogin(session);
  };

  const submitCredentials = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const data = await api<LoginStepResponse>('/login', {
        method: 'POST',
        body: { username: username.trim(), password }
      });
      setMfaToken(data.mfaToken);
      setMaskedEmail(data.maskedEmail || '');
      setCode('');
      setStep(data.needs2faSetup ? 'mfa-setup' : 'mfa-verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitTotpVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await api<AdminSession>('/mfa/verify', {
        method: 'POST',
        body: { mfaToken, code: code.trim() }
      });
      finishLogin(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitTotpSetupConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await api<AdminSession & { backupCodes: string[] }>('/mfa/setup-confirm', {
        method: 'POST',
        body: { mfaToken, code: code.trim() }
      });
      setBackupCodes(data.backupCodes || []);
      setPendingSession({ token: data.token, admin: data.admin });
      setStep('backup-codes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm 2FA setup.');
    } finally {
      setBusy(false);
    }
  };

  const sendEmailOtp = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api<{ maskedEmail: string; devOtp?: string }>('/mfa/email-otp/send', {
        method: 'POST',
        body: { mfaToken }
      });
      setMaskedEmail(res.maskedEmail || maskedEmail);
      setCode('');
      setStep('mfa-email');
      setInfo(
        res.devOtp
          ? `Local dev OTP (email not configured): ${res.devOtp}`
          : `A 6-digit code was sent to ${res.maskedEmail || 'your registered email'}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send email code.');
    } finally {
      setBusy(false);
    }
  };

  const submitEmailOtpVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await api<AdminSession>('/mfa/email-otp/verify', {
        method: 'POST',
        body: { mfaToken, otp: code.trim() }
      });
      finishLogin(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email OTP verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) return;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api<{ message: string; devResetToken?: string }>('/forgot-password', {
        method: 'POST',
        body: { identifier: resetIdentifier.trim() }
      });
      if (res.devResetToken) {
        setResetToken(res.devResetToken);
        setStep('reset');
        setInfo('Local dev mode: reset token loaded. Set your new 14+ char password below.');
      } else {
        setInfo(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  const submitResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 14 || newPassword !== confirmNewPassword) return;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api<{ message: string }>('/reset-password', {
        method: 'POST',
        body: { token: resetToken, newPassword }
      });
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('resetToken');
        window.history.replaceState({}, '', url.toString());
      } catch {
        /* ignore */
      }
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setStep('credentials');
      setInfo(res.message || 'Password updated. Sign in with your new password and 2FA.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setBusy(false);
    }
  };

  const backToCredentials = () => {
    setStep('credentials');
    setError('');
    setInfo('');
    setCode('');
    setQrDataUrl('');
    setManualKey('');
    setMfaToken('');
  };

  return (
    <div className="ad-login">
      <div className="ad-login-card">
        <div className="ad-login-brand">
          <img src={cvmindIcon} alt="" />
          <span className="ad-brand-name">CVMind</span>
          <span className="ad-brand-chip">Admin</span>
        </div>

        {step === 'credentials' && (
          <form onSubmit={submitCredentials} noValidate>
            <h1>Sign in to the admin panel</h1>
            <p>Sign in with your administrator credentials and 2FA.</p>

            {notice && !error && !info && (
              <div className="ad-notice amber" style={{ marginBottom: 16 }}>
                <AlertCircle size={16} />
                <div>{notice}</div>
              </div>
            )}
            {info && (
              <div className="ad-notice green" style={{ marginBottom: 16 }}>
                <CheckCircle2 size={16} />
                <div>{info}</div>
              </div>
            )}

            <div className="ad-field">
              <label htmlFor="ad-username">Username or email</label>
              <input
                id="ad-username"
                className="ad-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
              />
            </div>
            <div className="ad-field">
              <label htmlFor="ad-password">Password</label>
              <div className="ad-pass">
                <input
                  id="ad-password"
                  className="ad-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="ad-btn ghost icon sm"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <label className="ad-check" style={{ marginTop: 14 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Keep me signed in on this device
            </label>

            {error && (
              <div className="ad-login-error" role="alert">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button className="ad-btn primary ad-login-submit" type="submit" disabled={busy || !username.trim() || !password}>
              {busy && <Spinner size={15} />}
              {busy ? 'Verifying…' : 'Continue to 2FA'}
            </button>

            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button
                type="button"
                className="ad-btn ghost sm"
                onClick={() => {
                  setResetIdentifier(username);
                  setError('');
                  setInfo('');
                  setStep('forgot');
                }}
              >
                <Mail size={13} /> Change / reset password via email
              </button>
            </div>
          </form>
        )}

        {step === 'mfa-verify' && (
          <form onSubmit={submitTotpVerify} noValidate>
            <h1><ShieldCheck size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />Two-Factor Authentication</h1>
            <p>Enter the 6-digit code from your authenticator app, or an 8-character recovery code.</p>

            <div className="ad-field">
              <label htmlFor="ad-totp">Authenticator or Recovery Code</label>
              <input
                id="ad-totp"
                className="ad-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="ad-login-error" role="alert">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button className="ad-btn primary ad-login-submit" type="submit" disabled={busy || !code.trim()}>
              {busy && <Spinner size={15} />}
              Verify & Sign In
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="ad-btn ghost sm" onClick={sendEmailOtp} disabled={busy}>
                <Mail size={13} /> Send code to {maskedEmail || 'email'}
              </button>
              <button type="button" className="ad-btn ghost sm" onClick={backToCredentials} disabled={busy}>
                Back
              </button>
            </div>
          </form>
        )}

        {step === 'mfa-email' && (
          <form onSubmit={submitEmailOtpVerify} noValidate>
            <h1><Mail size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />Email Verification Code</h1>
            <p>Enter the 6-digit code sent to <strong>{maskedEmail}</strong>.</p>

            {info && (
              <div className="ad-notice green" style={{ marginBottom: 14 }}>
                <CheckCircle2 size={16} />
                <div>{info}</div>
              </div>
            )}

            <div className="ad-field">
              <label htmlFor="ad-email-otp">6-digit Email OTP</label>
              <input
                id="ad-email-otp"
                className="ad-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="ad-login-error" role="alert">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button className="ad-btn primary ad-login-submit" type="submit" disabled={busy || !code.trim()}>
              {busy && <Spinner size={15} />}
              Verify Email Code
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              <button type="button" className="ad-btn ghost sm" onClick={sendEmailOtp} disabled={busy}>
                Resend code
              </button>
              <button type="button" className="ad-btn ghost sm" onClick={backToCredentials} disabled={busy}>
                Back
              </button>
            </div>
          </form>
        )}

        {step === 'mfa-setup' && (
          <form onSubmit={submitTotpSetupConfirm} noValidate>
            <h1><ShieldCheck size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />Set Up Mandatory 2FA</h1>
            <p>Scan this QR code in Google Authenticator, Apple Passwords, or 1Password, then enter the 6-digit code.</p>

            {qrDataUrl ? (
              <div style={{ textAlign: 'center', margin: '14px 0' }}>
                <img src={qrDataUrl} alt="2FA QR Code" style={{ width: 180, height: 180, borderRadius: 10, border: '1px solid #e2e8f0', padding: 6, background: '#fff' }} />
                {manualKey && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#475569', wordBreak: 'break-all' }}>
                    Manual key: <code>{manualKey}</code>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 24 }}><Spinner size={20} /></div>
            )}

            <div className="ad-field">
              <label htmlFor="ad-setup-code">6-digit Authenticator Code</label>
              <input
                id="ad-setup-code"
                className="ad-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </div>

            {error && (
              <div className="ad-login-error" role="alert">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button className="ad-btn primary ad-login-submit" type="submit" disabled={busy || code.trim().length < 6}>
              {busy && <Spinner size={15} />}
              Confirm & Enable 2FA
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              <button type="button" className="ad-btn ghost sm" onClick={sendEmailOtp} disabled={busy}>
                <Mail size={13} /> Use email OTP instead
              </button>
              <button type="button" className="ad-btn ghost sm" onClick={backToCredentials} disabled={busy}>
                Back
              </button>
            </div>
          </form>
        )}

        {step === 'backup-codes' && (
          <div>
            <h1><KeyRound size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />Save Recovery Backup Codes</h1>
            <p>Save these one-time recovery codes in a safe place. Each code can be used once if you lose your authenticator.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, margin: '14px 0', fontFamily: 'monospace', fontSize: 13 }}>
              {backupCodes.map((c) => (
                <div key={c}>{c}</div>
              ))}
            </div>

            <button
              type="button"
              className="ad-btn"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 10, gap: 6 }}
              onClick={() => {
                navigator.clipboard?.writeText(backupCodes.join('\n')).catch(() => {});
                setCopiedCodes(true);
              }}
            >
              <Copy size={14} /> {copiedCodes ? 'Copied backup codes!' : 'Copy all codes'}
            </button>

            <button
              type="button"
              className="ad-btn primary ad-login-submit"
              onClick={() => pendingSession && finishLogin(pendingSession)}
            >
              Continue to Admin Panel
            </button>
          </div>
        )}

        {step === 'forgot' && (
          <form onSubmit={submitForgot} noValidate>
            <h1>Reset Password via Email</h1>
            <p>Enter your username or email. A 15-minute reset link will be sent to your registered email.</p>

            {info && (
              <div className="ad-notice green" style={{ marginBottom: 14 }}>
                <CheckCircle2 size={16} />
                <div>{info}</div>
              </div>
            )}

            <div className="ad-field">
              <label htmlFor="ad-reset-id">Username or email</label>
              <input
                id="ad-reset-id"
                className="ad-input"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                placeholder="Username or email"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="ad-login-error" role="alert">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button className="ad-btn primary ad-login-submit" type="submit" disabled={busy || !resetIdentifier.trim()}>
              {busy && <Spinner size={15} />}
              Send Reset Email
            </button>

            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button type="button" className="ad-btn ghost sm" onClick={backToCredentials}>
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={submitResetPassword} noValidate>
            <h1>Set New Admin Password</h1>
            <p>Choose a strong password (at least 14 characters). All other active sessions will be signed out.</p>

            {info && (
              <div className="ad-notice green" style={{ marginBottom: 14 }}>
                <CheckCircle2 size={16} />
                <div>{info}</div>
              </div>
            )}

            <div className="ad-field">
              <label htmlFor="ad-new-pw">New Password (min 14 chars)</label>
              <input
                id="ad-new-pw"
                className="ad-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                required
              />
            </div>
            <div className="ad-field">
              <label htmlFor="ad-confirm-pw">Confirm New Password</label>
              <input
                id="ad-confirm-pw"
                className="ad-input"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              {confirmNewPassword && newPassword !== confirmNewPassword && (
                <span className="ad-hint" style={{ color: '#dc2626' }}>Passwords do not match.</span>
              )}
            </div>

            {error && (
              <div className="ad-login-error" role="alert">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button
              className="ad-btn primary ad-login-submit"
              type="submit"
              disabled={busy || newPassword.length < 14 || newPassword !== confirmNewPassword}
            >
              {busy && <Spinner size={15} />}
              Update Password
            </button>

            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button type="button" className="ad-btn ghost sm" onClick={backToCredentials}>
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>

      <button type="button" className="ad-login-back" onClick={() => setCurrentPage('home')}>
        <ArrowLeft size={14} /> Back to cvmind.in
      </button>
    </div>
  );
}

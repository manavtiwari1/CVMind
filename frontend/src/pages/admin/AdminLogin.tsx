import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import cvmindIcon from '../../assets/cvmind_icon.png';
import { api, saveSession } from './api';
import type { AdminSession } from './api';
import { Spinner } from './ui';

interface AdminLoginProps {
  onLogin: (session: AdminSession) => void;
  setCurrentPage: (page: string) => void;
  notice?: string;
}

export default function AdminLogin({ onLogin, setCurrentPage, notice }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      const data = await api<AdminSession>('/login', { method: 'POST', body: { username: username.trim(), password } });
      const session = { token: data.token, admin: data.admin };
      saveSession(session, remember);
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setBusy(false);
    }
  };

  return (
    <div className="ad-login">
      <form className="ad-login-card" onSubmit={submit} noValidate>
        <div className="ad-login-brand">
          <img src={cvmindIcon} alt="" />
          <span className="ad-brand-name">CVMind</span>
          <span className="ad-brand-chip">Admin</span>
        </div>
        <h1>Sign in to the admin panel</h1>
        <p>For the CVMind team. Use the account your owner set up for you.</p>

        {notice && !error && (
          <div className="ad-notice amber" style={{ marginBottom: 16 }}>
            <AlertCircle size={16} />
            <div>{notice}</div>
          </div>
        )}

        <div className="ad-field">
          <label htmlFor="ad-username">Username</label>
          <input id="ad-username" className="ad-input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus required />
        </div>
        <div className="ad-field">
          <label htmlFor="ad-password">Password</label>
          <div className="ad-pass">
            <input id="ad-password" className="ad-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            <button type="button" className="ad-btn ghost icon sm" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
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
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <button type="button" className="ad-login-back" onClick={() => setCurrentPage('home')}>
        <ArrowLeft size={14} /> Back to cvmind.in
      </button>
    </div>
  );
}

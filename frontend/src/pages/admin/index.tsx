import { useCallback, useEffect, useState } from 'react';
import AdminLogin from './AdminLogin';
import AdminShell from './AdminShell';
import { api, clearSession, loadSession, saveSession, setUnauthorizedHandler } from './api';
import type { AdminAccount, AdminSession } from './api';
import { Spinner } from './ui';

interface AdminIndexProps {
  setCurrentPage: (page: string) => void;
}

type Phase = 'checking' | 'signed-out' | 'signed-in';

export default function AdminIndex({ setCurrentPage }: AdminIndexProps) {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [phase, setPhase] = useState<Phase>(() => (loadSession() ? 'checking' : 'signed-out'));
  const [notice, setNotice] = useState('');

  const signOut = useCallback((message = '') => {
    clearSession();
    setSession(null);
    setNotice(message);
    setPhase('signed-out');
  }, []);

  // Any 401 from the API (expired token, role changed, account disabled) ends the session
  useEffect(() => {
    setUnauthorizedHandler(() => signOut('Your session ended. Please sign in again.'));
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Re-check a stored session, so permissions are always the server's current ones
  useEffect(() => {
    if (phase !== 'checking' || !session) return;
    let cancelled = false;
    api<{ admin: AdminAccount }>('/me')
      .then(({ admin }) => {
        if (cancelled) return;
        const fresh = { token: session.token, admin };
        // Keep it wherever it was stored
        const remembered = (() => { try { return !!localStorage.getItem('cvmind_admin_session'); } catch { return false; } })();
        saveSession(fresh, remembered);
        setSession(fresh);
        setPhase('signed-in');
      })
      .catch(() => { if (!cancelled) signOut(); });
    return () => { cancelled = true; };
  }, [phase, session, signOut]);

  if (phase === 'checking') {
    return (
      <div className="ad-login ad-loading-page">
        <Spinner size={22} />
        <span>Opening the admin panel…</span>
      </div>
    );
  }

  if (phase === 'signed-out' || !session) {
    return (
      <AdminLogin
        notice={notice}
        setCurrentPage={setCurrentPage}
        onLogin={(s) => { setSession(s); setNotice(''); setPhase('signed-in'); }}
      />
    );
  }

  return <AdminShell admin={session.admin} onSignOut={() => signOut()} setCurrentPage={setCurrentPage} />;
}

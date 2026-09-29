import { useCallback, useEffect, useState } from 'react';
import AdminLogin from './AdminLogin';
import AdminShell from './AdminShell';
import type { AdminStats } from './types';
import { AlertTriangle, Loader2 } from 'lucide-react';

// Request only (no React state), shared by the initial load and refreshes
async function requestStats(backend: string, key: string): Promise<AdminStats> {
  const res = await fetch(`${backend}/api/admin/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': key },
    body: JSON.stringify({ secret: key }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch platform diagnostics.');
  return data.data;
}

interface AdminIndexProps {
  setCurrentPage: (page: string) => void;
}

export default function AdminIndex({ setCurrentPage }: AdminIndexProps) {
  const [secret, setSecret] = useState(() => localStorage.getItem('cvmind_admin_secret') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('cvmind_admin_secret'));
  const [isFetching, setIsFetching] = useState(() => !!localStorage.getItem('cvmind_admin_secret'));
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  const BACKEND = import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

  const fetchStats = useCallback(async (key: string) => {
    if (!key) return;
    setIsFetching(true);
    setError('');
    try {
      setStats(await requestStats(BACKEND, key));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed to backend API.');
    } finally {
      setIsFetching(false);
    }
  }, [BACKEND]);

  // Initial data load once signed in; state is only set when the request settles
  useEffect(() => {
    if (!isLoggedIn || !secret) return;
    let cancelled = false;
    requestStats(BACKEND, secret)
      .then((data) => { if (!cancelled) setStats(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Connection failed to backend API.'); })
      .finally(() => { if (!cancelled) setIsFetching(false); });
    return () => { cancelled = true; };
  }, [isLoggedIn, secret, BACKEND]);

  // Set up auto-refresh timer
  useEffect(() => {
    if (!isLoggedIn || !secret) return;
    const interval = setInterval(() => {
      fetchStats(secret);
    }, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [isLoggedIn, secret, fetchStats]);

  const handleLogin = (secretKey: string) => {
    setSecret(secretKey);
    setIsLoggedIn(true);
    setIsFetching(true);
    setError('');
  };

  const handleSignOut = () => {
    setSecret('');
    setIsLoggedIn(false);
    setStats(null);
    localStorage.removeItem('cvmind_admin_secret');
  };

  if (!isLoggedIn) {
    return (
      <AdminLogin
        onLogin={handleLogin}
        setCurrentPage={setCurrentPage}
        BACKEND={BACKEND}
      />
    );
  }

  if (isFetching && !stats) {
    return (
      <div className="admin-v2" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--root)', gap: 16 }}>
        <Loader2 className="login-spinner" size={24} style={{ color: 'var(--blue)' }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-3)' }}>Synchronizing secure admin keys…</span>
      </div>
    );
  }

  return (
    <div className="admin-v2">
      {error && (
        <div className="admin-error-banner" style={{ margin: 16 }}>
          <AlertTriangle size={16} />
          <div>
            <strong>Backend Connection Issue</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {stats ? (
        <AdminShell
          stats={stats}
          isFetching={isFetching}
          onRefresh={() => fetchStats(secret)}
          onSignOut={handleSignOut}
          setCurrentPage={setCurrentPage}
          secret={secret}
          BACKEND={BACKEND}
        />
      ) : (
        <div className="admin-loading" style={{ minHeight: '80vh' }}>
          <Loader2 className="login-spinner" size={24} />
          <p>Awaiting platform data payload…</p>
        </div>
      )}
    </div>
  );
}

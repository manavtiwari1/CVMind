import { useEffect, useState } from 'react';
import { API_BASE } from './apiBase';
import { authFetch, getSessionToken } from './authFetch';

// Learn with Leo is "coming soon": only accounts the server allows (backend learnLeo/access.js) can
// open it. Everyone else who clicks a Learn with Leo button sees the coming-soon dialog instead.

export const COMING_SOON_EVENT = 'cvmind-coming-soon';

let cached: { token: string | null; result: Promise<boolean> } | null = null;

export function leoAccess(): Promise<boolean> {
  const token = getSessionToken();
  if (!token) return Promise.resolve(false);
  if (cached?.token !== token) {
    const result = authFetch(`${API_BASE}/api/leo/access`)
      .then((res) => (res.ok ? res.json() : { access: false }))
      .then((data: { access?: boolean }) => data.access === true)
      .catch(() => false);
    cached = { token, result };
  }
  return cached.result;
}

export function showComingSoon() {
  window.dispatchEvent(new Event(COMING_SOON_EVENT));
}

/** Runs `go` for accounts with access, otherwise shows the coming-soon dialog. */
export async function openLearnWithLeo(go: () => void) {
  if (await leoAccess()) go();
  else showComingSoon();
}

export function useLeoAccess(): 'checking' | 'open' | 'locked' {
  const [state, setState] = useState<'checking' | 'open' | 'locked'>('checking');
  useEffect(() => {
    let alive = true;
    leoAccess().then((ok) => { if (alive) setState(ok ? 'open' : 'locked'); });
    return () => { alive = false; };
  }, []);
  return state;
}

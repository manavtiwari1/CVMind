import { useEffect, useState } from 'react';
import { API_BASE } from './apiBase';

// The API runs on Render, which puts it to sleep after a quiet spell; the first request then waits
// about a minute while it starts. Visitors used to hit that wait on their first upload and give up.

let waking = false;

/** Pings the API once on page load, so a sleeping server starts while the visitor is still reading. */
export function wakeServer() {
  if (waking) return;
  waking = true;
  // no-cors: the answer isn't needed, only the request reaching the server
  fetch(`${API_BASE}/`, { mode: 'no-cors', cache: 'no-store' }).catch(() => { /* offline: nothing to wake */ });
}

/** True once `active` has lasted `after` ms: time to tell the user the wait is normal. */
export function useSlowHint(active: boolean, after = 8000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setSlow(true), after);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [active, after]);
  return active && slow;
}

export const SLOW_SERVER_HINT = 'Our server is waking up. The first request can take up to a minute; please keep this page open.';

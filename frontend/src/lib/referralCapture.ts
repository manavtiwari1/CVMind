import { claimReferral } from './growthApi';

// Invite links look like cvmind.in/?ref=CODE. The code is kept in this browser for 30 days and
// sent once the visitor has an account; the server checks it's a new account and rewards both
// people when the friend's email is verified.

const KEY = 'cvmind_ref';
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_RE = /^[A-Za-z0-9]{4,12}$/;

/** Saves ?ref= from the address (first code wins) and removes it from the URL. Returns true when one was found. */
export function captureReferral(): boolean {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('ref');
  if (!code) return false;
  params.delete('ref');
  const qs = params.toString();
  window.history.replaceState(window.history.state, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
  if (!CODE_RE.test(code)) return false;
  try {
    if (!storedReferral()) localStorage.setItem(KEY, JSON.stringify({ code: code.toUpperCase(), at: Date.now() }));
  } catch { /* storage blocked: the invite just isn't remembered */ }
  return true;
}

export function storedReferral(): string | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as { code?: string; at?: number } | null;
    if (!raw?.code || !raw.at || Date.now() - raw.at > KEEP_MS) return null;
    return raw.code;
  } catch {
    return null;
  }
}

let claiming = false;
/** Sends the saved code for the signed-in account, once. A network error keeps it for the next visit. */
export async function claimStoredReferral(): Promise<void> {
  const code = storedReferral();
  if (!code || claiming) return;
  claiming = true;
  try {
    await claimReferral(code);
    localStorage.removeItem(KEY);
  } catch (err) {
    // The server answered (e.g. not a new account): don't try again
    if ((err as { status?: number }).status) {
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    }
  } finally {
    claiming = false;
  }
}

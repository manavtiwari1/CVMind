import type { StoredUser } from '../types/api';
import { baseDomain, isSplitHost } from './hosts';

// localStorage is per-origin, so www.cvmind.in and app.cvmind.in can't see each other's sign-in.
// The session is mirrored into a cookie on the shared parent domain; each host copies it into its
// own localStorage on load (syncSessionFromCookie), which the rest of the app keeps reading.

export const USER_CHANGE_EVENT = 'cvmind-user-change';

const COOKIE = 'cvmind_session';
// Set once this browser's session has been written to the cookie. A signed-in localStorage with the
// marker but no cookie means the user signed out on the other host; without the marker it's a
// session from before the split that still needs copying to the cookie.
const SYNCED_KEY = 'cvmind_session_synced';
const MAX_AGE = 7 * 24 * 60 * 60; // matches the auth token lifetime

function readCookie(): StoredUser | null {
  const match = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try {
    const user = JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1)));
    return user && typeof user === 'object' && user.token ? user : null;
  } catch {
    return null;
  }
}

function writeCookie(value: string, maxAge: number) {
  const base = baseDomain();
  if (!base) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${value}; Domain=.${base}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

// Cookies cap out around 4KB, so keep only what the app needs to restore the session
function slim(user: StoredUser): StoredUser {
  const { id, _id, name, email, avatar, isGoogleUser, plan, isPro, token } = user;
  return {
    id, _id, name, email, isGoogleUser, plan, isPro, token,
    // Uploaded photos are data: URLs far too big for a cookie
    avatar: avatar && !avatar.startsWith('data:') && avatar.length < 1000 ? avatar : undefined,
  };
}

function storeLocally(user: StoredUser) {
  localStorage.setItem('cvmind_logged_in', 'true');
  localStorage.setItem('cvmind_user', JSON.stringify(user));
}

export function syncSessionCookie(user: StoredUser) {
  if (!isSplitHost() || !user.token) return;
  writeCookie(encodeURIComponent(JSON.stringify(slim(user))), MAX_AGE);
  localStorage.setItem(SYNCED_KEY, '1');
}

export function setSession(user: StoredUser) {
  storeLocally(user);
  syncSessionCookie(user);
  window.dispatchEvent(new Event(USER_CHANGE_EVENT));
}

export function clearSession() {
  localStorage.removeItem('cvmind_logged_in');
  localStorage.removeItem('cvmind_user');
  localStorage.removeItem(SYNCED_KEY);
  if (isSplitHost()) writeCookie('', 0);
}

// Run before React renders so App's initial state already reflects the shared session
export function syncSessionFromCookie() {
  if (!isSplitHost()) return;
  const cookieUser = readCookie();
  const signedIn = localStorage.getItem('cvmind_logged_in') === 'true';
  const localUser: StoredUser | null = (() => {
    try { return JSON.parse(localStorage.getItem('cvmind_user') || 'null'); } catch { return null; }
  })();

  if (cookieUser) {
    if (!signedIn || localUser?.token !== cookieUser.token) {
      // Signed in on the other host. Keep any fields only this host knows (e.g. an uploaded photo)
      // when it's the same account.
      const sameAccount = localUser?.email === cookieUser.email;
      storeLocally(sameAccount ? { ...localUser, ...cookieUser, avatar: cookieUser.avatar ?? localUser?.avatar } : cookieUser);
    }
    localStorage.setItem(SYNCED_KEY, '1');
    return;
  }

  if (!signedIn) return;
  if (localStorage.getItem(SYNCED_KEY)) {
    clearSession();
  } else if (localUser?.token) {
    syncSessionCookie(localUser);
  }
}

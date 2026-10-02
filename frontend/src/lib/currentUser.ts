import type { StoredUser } from '../types/api';
import { USER_CHANGE_EVENT, syncSessionCookie } from './session';

export { USER_CHANGE_EVENT };

export function readUser(): StoredUser | null {
  try {
    const u = JSON.parse(localStorage.getItem('cvmind_user') || 'null');
    return u && typeof u === 'object' ? u : null;
  } catch {
    return null;
  }
}

// Persist the signed-in user and let other mounted components (e.g. the Navbar avatar) refresh
export function saveUser(user: StoredUser) {
  localStorage.setItem('cvmind_user', JSON.stringify(user));
  syncSessionCookie(user);
  window.dispatchEvent(new Event(USER_CHANGE_EVENT));
}

export const isProUser = (u: StoredUser | null) => Boolean(u && (u.isPro || u.plan === 'pro'));

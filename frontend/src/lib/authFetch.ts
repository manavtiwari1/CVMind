type SessionKey = 'cvmind_user' | 'cvmind_company';

// Fired when the server refuses a request because the account's email isn't verified (App shows the verify screen)
export const VERIFY_REQUIRED_EVENT = 'cvmind-verify-required';
// Fired when a feature needs a signed-in account (App opens sign-in)
export const AUTH_REQUIRED_EVENT = 'cvmind-auth-required';

export function getSessionToken(key: SessionKey = 'cvmind_user'): string | null {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}').token || null;
  } catch {
    return null;
  }
}

// Fired when a free account hits a weekly limit or its AI token budget (App shows the upgrade dialog).
// Same name as UPGRADE_EVENT in lib/billing.ts.
const UPGRADE_EVENT = 'cvmind-upgrade-required';

// Tells the app about verification, sign-in and plan refusals; the caller still gets the response and shows its error
function announceRefusal(res: Response) {
  if (![401, 402, 403, 429].includes(res.status)) return;
  res.clone().json().then((data: { code?: string; error?: string }) => {
    if (data?.code === 'EMAIL_NOT_VERIFIED') window.dispatchEvent(new Event(VERIFY_REQUIRED_EVENT));
    else if (data?.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
    else if (data?.code === 'UPGRADE_REQUIRED' || data?.code === 'TOKEN_LIMIT') {
      window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: { reason: data.code === 'TOKEN_LIMIT' ? 'tokens' : 'limit', message: data.error } }));
    }
  }).catch(() => { /* not JSON */ });
}

// fetch() that attaches the signed session token as a Bearer header
export async function authFetch(input: string, init: RequestInit = {}, key: SessionKey = 'cvmind_user') {
  const headers = new Headers(init.headers);
  const token = getSessionToken(key);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (key === 'cvmind_user') announceRefusal(res);
  return res;
}

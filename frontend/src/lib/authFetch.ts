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

// Tells the app about verification and sign-in refusals; the caller still gets the response and shows its error
function announceRefusal(res: Response) {
  if (res.status !== 401 && res.status !== 403) return;
  res.clone().json().then((data: { code?: string }) => {
    if (data?.code === 'EMAIL_NOT_VERIFIED') window.dispatchEvent(new Event(VERIFY_REQUIRED_EVENT));
    else if (data?.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
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

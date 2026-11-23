type SessionKey = 'cvmind_user' | 'cvmind_company';

// Fired when the server refuses a request because the account's email isn't verified (App shows the verify screen)
export const VERIFY_REQUIRED_EVENT = 'cvmind-verify-required';
// Fired when a feature needs a signed-in account (App opens sign-in)
export const AUTH_REQUIRED_EVENT = 'cvmind-auth-required';
// Fired when a feature that isn't open yet refuses the account (same name as COMING_SOON_EVENT in lib/leoAccess.ts)
const COMING_SOON_EVENT = 'cvmind-coming-soon';

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
  res.clone().json().then((data: { code?: string; error?: string; feature?: string; product?: string }) => {
    if (data?.code === 'EMAIL_NOT_VERIFIED') window.dispatchEvent(new Event(VERIFY_REQUIRED_EVENT));
    else if (data?.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
    else if (data?.code === 'COMING_SOON') window.dispatchEvent(new CustomEvent(COMING_SOON_EVENT, { detail: { product: data.product || 'learn-leo' } }));
    else if (data?.code === 'UPGRADE_REQUIRED' || data?.code === 'TOKEN_LIMIT') {
      const reason = data.code === 'TOKEN_LIMIT' ? 'tokens' : data.feature === 'learn-leo' ? 'learn-leo' : 'limit';
      window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: { reason, message: data.error } }));
    }
  }).catch(() => { /* not JSON */ });
}

// While the API wakes up or redeploys, its host (Render, behind Cloudflare) can answer 502/503/504 with
// its own HTML page before our server ever sees the request, so sending it again is safe. Our server's
// own errors are JSON and are never retried.
const WAKE_RETRY_MS = [3000, 6000];
const hostNotReady = (res: Response) => [502, 503, 504].includes(res.status) && !(res.headers.get('content-type') || '').includes('application/json');
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// fetch() that attaches the signed session token as a Bearer header
export async function authFetch(input: string, init: RequestInit = {}, key: SessionKey = 'cvmind_user') {
  const headers = new Headers(init.headers);
  const token = getSessionToken(key);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let res = await fetch(input, { ...init, headers });
  for (const wait of WAKE_RETRY_MS) {
    if (!hostNotReady(res) || init.signal?.aborted) break;
    await pause(wait);
    if (init.signal?.aborted) break;
    res = await fetch(input, { ...init, headers });
  }
  if (key === 'cvmind_user') announceRefusal(res);
  return res;
}

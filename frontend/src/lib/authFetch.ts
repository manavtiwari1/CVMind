type SessionKey = 'cvmind_user' | 'cvmind_company';

export function getSessionToken(key: SessionKey = 'cvmind_user'): string | null {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}').token || null;
  } catch {
    return null;
  }
}

// fetch() that attaches the signed session token as a Bearer header
export function authFetch(input: string, init: RequestInit = {}, key: SessionKey = 'cvmind_user') {
  const headers = new Headers(init.headers);
  const token = getSessionToken(key);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

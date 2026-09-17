import dns from 'dns/promises';
import net from 'net';
import { FatalError, RetryableError } from '../../errors.js';

const REQUEST_TIMEOUT_MS = 20000;

export const PAGE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; CVMindBot/1.0; +https://www.cvmind.online)',
  Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

export function titleCaseSlug(slug) {
  return String(slug || '').split(/[-_]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

export function httpError(status, what) {
  const message = `${what} (HTTP ${status}).`;
  return status === 429 || status >= 500
    ? new RetryableError(message, { code: `HTTP_${status}` })
    : new FatalError(message, { code: `HTTP_${status}` });
}

export function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127);
  }
  const value = String(address).toLowerCase();
  if (value.startsWith('::ffff:')) return isPrivateAddress(value.slice(7));
  return value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80');
}

// Fetches a user-supplied URL; every hop (including redirects) must resolve to a public address, so pasted
// links can't be used to reach internal services from the server
export async function safeFetch(url, init = {}, { fetchImpl = fetch, lookup = dns.lookup, maxRedirects = 5 } = {}) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const parsed = new URL(current);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new FatalError('Only http and https links are supported.', { code: 'BAD_URL' });
    }
    const host = parsed.hostname.replace(/^\[|\]$/g, '');
    const addresses = net.isIP(host)
      ? [{ address: host }]
      : await lookup(host, { all: true }).catch(() => { throw new FatalError(`Could not find the website ${host}.`, { code: 'DNS_FAILED' }); });
    if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
      throw new FatalError('That link points to a private network address.', { code: 'BLOCKED_URL' });
    }

    let res;
    try {
      res = await fetchImpl(current, { ...init, redirect: 'manual', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (err) {
      throw new RetryableError(`Could not reach ${host}: ${err.message}`, { cause: err, code: 'NETWORK' });
    }
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
  throw new FatalError('The link redirected too many times.', { code: 'TOO_MANY_REDIRECTS' });
}

import dns from 'dns/promises';
import net from 'net';

const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', '0.0.0.0', 'metadata.google.internal']);

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIp(ip) {
  const clean = String(ip || '').replace(/^\[|\]$/g, '').split('%')[0].toLowerCase();
  if (net.isIPv4(clean)) return isPrivateIpv4(clean);
  if (net.isIPv6(clean)) {
    if (clean === '::' || clean === '::1') return true;
    if (clean.startsWith('::ffff:')) return isPrivateIpv4(clean.slice(7));
    if (clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('fe80:')) return true;
    return false;
  }
  return true;
}

/**
 * Validates that a user-supplied URL points to a public HTTP(S) host, blocking loopback,
 * link-local metadata endpoints, and private network ranges.
 */
export async function assertSafePublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    throw Object.assign(new Error('Invalid URL.'), { status: 400 });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw Object.assign(new Error('Only HTTP and HTTPS URLs are allowed.'), { status: 400 });
  }
  const host = parsed.hostname.toLowerCase();
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw Object.assign(new Error('Blocked target host.'), { status: 400 });
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw Object.assign(new Error('Private IP addresses are not allowed.'), { status: 400 });
    return parsed;
  }
  const records = await dns.lookup(host, { all: true });
  if (!records.length || records.some((r) => isPrivateIp(r.address))) {
    throw Object.assign(new Error('Target host resolves to a restricted address.'), { status: 400 });
  }
  return parsed;
}

/**
 * Fetches a public URL with SSRF protection on the initial request and any redirects.
 */
export async function safePublicFetch(rawUrl, options = {}, maxRedirects = 3) {
  let current = rawUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    const safeUrl = await assertSafePublicUrl(current);
    const res = await fetch(safeUrl.href, {
      ...options,
      redirect: 'manual',
      signal: options.signal || AbortSignal.timeout(8000)
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return res;
      current = new URL(loc, safeUrl).href;
      continue;
    }
    return res;
  }
  throw Object.assign(new Error('Too many redirects.'), { status: 400 });
}

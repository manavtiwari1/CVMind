import net from 'net';

// Render serves this API through Cloudflare. With 'trust proxy' set to 1, req.ip is the last
// X-Forwarded-For entry, which on Render is one of Cloudflare's own addresses: shared by many
// visitors and different from one request to the next. Every per-IP limit (sign-in attempts,
// sign-ups, password resets, AI requests) was then shared between strangers, so one busy address
// could lock everyone behind it out of signing in.
// Cloudflare puts the visitor's own address in CF-Connecting-IP and replaces any value a visitor
// sends, so on Render that header is the address to use. Elsewhere (local dev, tests, other hosts)
// the header could be forged, so it is ignored there.
export function visitorIpFromHeaders(headers, env = process.env) {
  if (env.RENDER !== 'true') return null;
  const value = String(headers?.['cf-connecting-ip'] || '').trim();
  return net.isIP(value) ? value : null;
}

// Express middleware: makes req.ip the visitor's address, so every limit and log that reads
// req.ip (or clientIp() in services/limiter.js) counts each visitor on their own
export function useVisitorIp(req, res, next) {
  const ip = visitorIpFromHeaders(req.headers);
  if (ip) Object.defineProperty(req, 'ip', { value: ip, enumerable: true, configurable: true });
  next();
}

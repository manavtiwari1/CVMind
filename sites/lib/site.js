// Serves published portfolios at username.portfolio.cvmind.in. Vercel project "cvmind-sites",
// root directory "sites", environment variable BACKEND_URL.
//
// Anything served here runs next to the .cvmind.in sign-in cookie, which scripts can read, so every
// response carries a policy that allows no scripts. It is set here as well as on the backend, so
// these pages are protected whatever the backend sends.

const HOST_RE = /^([a-z0-9](?:[a-z0-9-]{0,62}))\.portfolio\.cvmind\.in$/;

// Render can take a while to wake; a Vercel function stops at 30 seconds (vercel.json)
const BACKEND_TIMEOUT_MS = 25000;

const SAFETY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex',
  'Content-Type': 'text/html; charset=utf-8'
};

// Short, so taking a site offline shows within a minute. Vercel keeps a separate copy per host.
const CACHED = 'public, max-age=0, s-maxage=60';
const NOT_CACHED = 'no-store';

const page = (title, heading, text, link = '') => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · CVMind</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f2faf6;color:#10231c;text-align:center}
h1{font-size:24px;margin:0 0 8px}p{margin:0 0 20px;color:#5f736a;line-height:1.6}a{color:#12805c;font-weight:600}</style></head>
<body><main><h1>${heading}</h1><p>${text}</p>${link}</main></body></html>`;

const NOT_FOUND_PAGE = page('Portfolio not found', "This portfolio isn't here", 'The link may be wrong, or its owner may have taken it down.', '<a href="https://www.cvmind.in/">Build your own portfolio with CVMind</a>');
const UNAVAILABLE_PAGE = page('Try again soon', 'This portfolio is waking up', 'Please refresh the page in a few seconds.');

function send(req, res, status, cache, body) {
  res.statusCode = status;
  for (const [name, value] of Object.entries(SAFETY_HEADERS)) res.setHeader(name, value);
  res.setHeader('Cache-Control', cache);
  res.end(req.method === 'HEAD' ? undefined : body);
}

const sendMissing = (req, res) => send(req, res, 404, CACHED, NOT_FOUND_PAGE);

// Every address other than a site's home page
export function serveMissing(req, res) {
  sendMissing(req, res);
}

export function createSiteHandler({ timeoutMs = BACKEND_TIMEOUT_MS } = {}) {
  return async function serveSite(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return send(req, res, 405, NOT_CACHED, '');
    }

    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
    const username = HOST_RE.exec(host)?.[1];
    if (!username) return sendMissing(req, res);

    const backend = String(process.env.BACKEND_URL || '').replace(/\/+$/, '');
    if (!backend) {
      console.error('[cvmind-sites] BACKEND_URL is not set');
      return send(req, res, 503, NOT_CACHED, UNAVAILABLE_PAGE);
    }

    try {
      const reply = await fetch(`${backend}/sites/${username}`, { redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
      if (reply.status === 200) return send(req, res, 200, CACHED, await reply.text());
      if (reply.status === 404) return sendMissing(req, res);
      console.error(`[cvmind-sites] backend answered ${reply.status}`);
    } catch (err) {
      console.error('[cvmind-sites] backend unreachable:', err.message);
    }
    return send(req, res, 503, NOT_CACHED, UNAVAILABLE_PAGE);
  };
}

import crypto from 'crypto';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEV_FALLBACK_SECRET = 'cvmind-dev-only-secret-change-me';

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set in production.');
  }
  return DEV_FALLBACK_SECRET;
}

function hmac(data) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

// Signed token: base64url(JSON payload) + "." + HMAC signature
// ttlMs and jti are used by extension device tokens, which live longer and can be revoked by id
export function signToken({ sub, kind, email, ttlMs, jti }) {
  const payload = {
    sub: String(sub),
    kind,
    email: String(email || '').trim().toLowerCase(),
    exp: Date.now() + (ttlMs || TOKEN_TTL_MS),
    ...(jti ? { jti } : {})
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = hmac(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function readBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

function requireKind(kind) {
  return (req, res, next) => {
    const payload = verifyToken(readBearer(req));
    if (!payload || payload.kind !== kind) {
      return res.status(401).json({ success: false, error: 'Please sign in to continue.' });
    }
    req.auth = payload;
    next();
  };
}

export const requireUser = requireKind('user');
export const requireCompany = requireKind('company');

// For routes like /things/:userId — the signed-in user may only act on their own id
export function requireSelf(param = 'userId') {
  return [requireUser, (req, res, next) => {
    if (String(req.params[param]) !== String(req.auth.sub)) {
      return res.status(403).json({ success: false, error: 'You can only access your own account data.' });
    }
    next();
  }];
}

// Fails fast at startup instead of on the first login
export function assertAuthConfigured() {
  getSecret();
}

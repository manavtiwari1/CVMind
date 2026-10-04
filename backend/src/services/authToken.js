import crypto from 'crypto';

export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
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
    iat: Date.now(),
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

// Set by the admin module: checks a user token against revoked sessions and blocked accounts.
// Returns { ok, error }. Without it (tests, scripts) every valid signature is accepted.
let userSessionValidator = null;

export function setUserSessionValidator(fn) {
  userSessionValidator = fn;
}

async function checkUserSession(payload) {
  if (!userSessionValidator) return { ok: true };
  try {
    return await userSessionValidator(payload);
  } catch (err) {
    // A database hiccup must not sign everyone out
    console.error('[auth] session check failed:', err.message);
    return { ok: true };
  }
}

// The validator reports the account's emailVerified flag when it looked the user up (MongoDB only)
const withVerification = (payload, check) =>
  (typeof check?.emailVerified === 'boolean' ? { ...payload, emailVerified: check.emailVerified } : payload);

function requireKind(kind) {
  return async (req, res, next) => {
    const payload = verifyToken(readBearer(req));
    if (!payload || payload.kind !== kind) {
      return res.status(401).json({ success: false, error: 'Please sign in to continue.' });
    }
    if (kind === 'user') {
      const check = await checkUserSession(payload);
      if (!check.ok) return res.status(401).json({ success: false, code: 'SESSION_REVOKED', error: check.error });
      req.auth = withVerification(payload, check);
      return next();
    }
    req.auth = payload;
    next();
  };
}

export const requireUser = requireKind('user');

// For status checks: null without a user token, otherwise { ok, error } for the token's session
export async function userSessionStatus(req) {
  const payload = verifyToken(readBearer(req));
  if (!payload || payload.kind !== 'user') return null;
  return checkUserSession(payload);
}
export const requireCompany = requireKind('company');

// For public routes that also do something extra for signed-in users (e.g. save to My Works):
// sets req.auth when a valid user token is present, never rejects the request
export async function optionalUser(req, res, next) {
  const payload = verifyToken(readBearer(req));
  if (payload && payload.kind === 'user') {
    const check = await checkUserSession(payload);
    if (check.ok) req.auth = withVerification(payload, check);
  }
  next();
}

// For middleware that needs the signed-in user without rejecting: null without a valid user token,
// otherwise { payload, ok, error } with payload.emailVerified set when the session check knows it
export async function readUserSession(req) {
  const payload = verifyToken(readBearer(req));
  if (!payload || payload.kind !== 'user') return null;
  const check = await checkUserSession(payload);
  return { payload: withVerification(payload, check), ok: check.ok, error: check.error };
}

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

import { readUserSession } from './authToken.js';
import { FEATURES, getSettings } from '../admin/settings.js';
import { dbReady } from '../admin/auth.js';
import { ProductGrant } from '../admin/models.js';

// Products an admin has locked can only be used by accounts with an active manual grant.
// Unlocked products (the default) are untouched, and settings fall back to "nothing locked"
// when the database is down, so an outage never shuts people out.

// No AI and nothing saved: the Cover Letter Generator reads the resume before sign-in
const ALWAYS_OPEN = ['/api/cover-letter/read-resume'];

const normalizePath = (path) => path.replace(/^\/_\/backend/, '');

const productFor = (path, locked) =>
  locked.find((key) => FEATURES[key]?.paths.some((p) => path === p || path.startsWith(`${p}/`)));

export async function hasProductAccess(email, product) {
  if (!email || !(await dbReady(2000))) return false;
  return !!(await ProductGrant.exists({
    email: String(email).trim().toLowerCase(),
    product,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
  }));
}

// Which locked products this account can use, for the site to show a "no access" screen
export async function grantedProducts(email, products) {
  if (!email || !products.length || !(await dbReady(2000))) return [];
  return ProductGrant.distinct('product', {
    email: String(email).trim().toLowerCase(),
    product: { $in: products },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
  });
}

export async function productGate(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const path = normalizePath(req.path);
  if (!path.startsWith('/api/') || ALWAYS_OPEN.includes(path)) return next();

  const { locked } = (await getSettings()).productAccess;
  if (!locked.length) return next();
  const product = productFor(path, locked);
  if (!product) return next();

  const label = FEATURES[product].label;
  const session = await readUserSession(req);
  if (!session) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', product, error: `Please sign in to use ${label}.` });
  if (!session.ok) return res.status(401).json({ success: false, code: 'SESSION_REVOKED', error: session.error });

  try {
    if (await hasProductAccess(session.payload.email, product)) return next();
  } catch (err) {
    console.error('[product gate] grant lookup failed:', err.message);
    return res.status(503).json({ success: false, error: 'Could not check your access right now. Please try again.' });
  }
  return res.status(403).json({
    success: false,
    code: 'PRODUCT_LOCKED',
    product,
    error: `Your account doesn't have access to ${label} yet. Contact support to get access.`
  });
}

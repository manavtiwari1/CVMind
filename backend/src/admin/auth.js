import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { signToken, verifyToken } from '../services/authToken.js';
import { AdminUser } from './models.js';
import { permissionsFor, ROLES } from './permissions.js';

const ADMIN_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
// Used when MongoDB isn't configured: the env owner can still sign in to read stats
const ENV_OWNER_ID = 'env-owner';
const CONNECTED = 1;
const CONNECTING = 2;

export async function dbReady(waitMs = 5000) {
  if (!process.env.MONGODB_URI) return false;
  const deadline = Date.now() + waitMs;
  while (mongoose.connection.readyState === CONNECTING && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return mongoose.connection.readyState === CONNECTED;
}

// Route guard for admin features that only work with MongoDB
export async function requireDb(req, res, next) {
  if (await dbReady()) return next();
  return res.status(503).json({ success: false, code: 'ADMIN_REQUIRES_MONGODB', error: 'This admin feature needs MongoDB. Set MONGODB_URI on the server.' });
}

function envCredentials() {
  const username = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  return username && password ? { username, password } : null;
}

export function toPublicAdmin(admin) {
  return {
    id: String(admin._id || admin.id),
    username: admin.username,
    name: admin.name || admin.username,
    email: admin.email || '',
    role: admin.role,
    roleLabel: ROLES[admin.role]?.label || admin.role,
    active: admin.active !== false,
    lastLoginAt: admin.lastLoginAt || null,
    createdAt: admin.createdAt || null,
    permissions: permissionsFor(admin.role)
  };
}

function issueToken(admin) {
  return signToken({
    sub: String(admin._id || admin.id),
    kind: 'admin',
    email: admin.username,
    ttlMs: ADMIN_TOKEN_TTL_MS,
    jti: `v${admin.tokenVersion || 0}`
  });
}

// The env owner exists in the database once Mongo is up, so it can be audited and managed like anyone else
async function seedEnvOwner(env) {
  const existing = await AdminUser.findOne({ username: env.username });
  if (existing) {
    // Env credentials always work for this account, so a forgotten panel password can be recovered
    if (!(await bcrypt.compare(env.password, existing.passwordHash))) {
      existing.passwordHash = await bcrypt.hash(env.password, 10);
    }
    if (existing.role !== 'owner') existing.role = 'owner';
    existing.active = true;
    await existing.save();
    return existing;
  }
  return AdminUser.create({
    username: env.username,
    name: 'Owner',
    passwordHash: await bcrypt.hash(env.password, 10),
    role: 'owner'
  });
}

// Returns { token, admin } or null for bad credentials
export async function loginAdmin(username, password) {
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanPass = String(password || '');
  if (!cleanUser || !cleanPass) return null;

  const env = envCredentials();
  const isEnvOwner = !!env && cleanUser === env.username && cleanPass === env.password;

  if (!(await dbReady())) {
    if (!isEnvOwner) return null;
    const admin = { id: ENV_OWNER_ID, username: env.username, name: 'Owner', role: 'owner', tokenVersion: 0 };
    return { token: issueToken(admin), admin: toPublicAdmin(admin) };
  }

  let admin;
  if (isEnvOwner) {
    admin = await seedEnvOwner(env);
  } else {
    admin = await AdminUser.findOne({ username: cleanUser });
    if (!admin || !admin.active) return null;
    if (!(await bcrypt.compare(cleanPass, admin.passwordHash))) return null;
  }

  admin.lastLoginAt = new Date();
  await admin.save();
  invalidateAdminCache(String(admin._id));
  return { token: issueToken(admin), admin: toPublicAdmin(admin) };
}

// Short cache so every admin request doesn't hit the database for the same account
const adminCache = new Map();
const ADMIN_CACHE_MS = 15 * 1000;

export function invalidateAdminCache(id) {
  if (id) adminCache.delete(String(id));
  else adminCache.clear();
}

async function loadAdmin(id) {
  const hit = adminCache.get(id);
  if (hit && Date.now() - hit.at < ADMIN_CACHE_MS) return hit.admin;
  const admin = mongoose.isValidObjectId(id) ? await AdminUser.findById(id).lean() : null;
  adminCache.set(id, { admin, at: Date.now() });
  return admin;
}

async function resolveAdmin(req) {
  const header = req.headers.authorization || '';
  const payload = header.startsWith('Bearer ') ? verifyToken(header.slice(7).trim()) : null;
  if (!payload || payload.kind !== 'admin') return null;

  if (payload.sub === ENV_OWNER_ID) {
    // Only valid while the database is down; once it's up the seeded account takes over
    if (await dbReady(0)) return null;
    const env = envCredentials();
    if (!env || env.username !== payload.email) return null;
    return { id: ENV_OWNER_ID, username: env.username, name: 'Owner', role: 'owner', permissions: permissionsFor('owner') };
  }

  if (!(await dbReady())) return null;
  const admin = await loadAdmin(payload.sub);
  if (!admin || !admin.active) return null;
  if (payload.jti !== `v${admin.tokenVersion || 0}`) return null;
  return toPublicAdmin(admin);
}

// requireAdmin() checks the session; requireAdmin('users.manage') also checks the role
export function requireAdmin(permission) {
  return async (req, res, next) => {
    try {
      const admin = await resolveAdmin(req);
      if (!admin) {
        return res.status(401).json({ success: false, code: 'ADMIN_AUTH', error: 'Your admin session has expired. Please sign in again.' });
      }
      if (permission && !admin.permissions.includes(permission)) {
        return res.status(403).json({ success: false, code: 'ADMIN_FORBIDDEN', error: 'Your role does not allow this action.' });
      }
      req.admin = admin;
      next();
    } catch (err) {
      next(err);
    }
  };
}

import bcrypt from 'bcryptjs';
import { AdminUser } from './models.js';
import { ROLE_KEYS } from './permissions.js';
import { clean, httpError, isEmail } from './util.js';

// Validates and creates an admin account. Used by Team & roles and by team-app invitations.
export async function createAdminMember(input, { requireEmail = false, extra = {} } = {}) {
  const username = clean(input?.username, 40).toLowerCase();
  const name = clean(input?.name, 80);
  const email = clean(input?.email, 120).toLowerCase();
  const role = clean(input?.role, 20);
  const password = String(input?.password || '');
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw httpError(400, 'Username must be 3–40 characters: letters, numbers, dot, dash or underscore.');
  if (!ROLE_KEYS.includes(role)) throw httpError(400, 'Pick a valid role.');
  if (password.length < 10) throw httpError(400, 'Use at least 10 characters for the password.');
  if (requireEmail && !email) throw httpError(400, 'Enter their email address.');
  if (email && !isEmail(email)) throw httpError(400, 'Enter a valid email address.');
  if (await AdminUser.exists({ username })) throw httpError(409, 'That username is already taken.');
  if (email && (await AdminUser.exists({ email }))) throw httpError(409, 'Someone on the team already uses that email.');
  return AdminUser.create({ username, name, email, role, passwordHash: await bcrypt.hash(password, 10), ...extra });
}

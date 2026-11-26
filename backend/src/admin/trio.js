import crypto from 'crypto';

// Strict Admin Panel v3 allowlist: ONLY Manav, Abhay, and Vanshika can access /admin and /api/admin/*.
export const TRIO_MEMBERS = [
  {
    key: 'manav',
    name: 'Manav Tiwari',
    username: 'manav',
    legacyUsernames: ['admin'],
    email: 'manavaneja60@gmail.com',
    role: 'owner'
  },
  {
    key: 'abhay',
    name: 'Abhay Mishra',
    username: 'abhay',
    legacyUsernames: ['cto'],
    email: 'am7330226@gmail.com',
    role: 'owner'
  },
  {
    key: 'vanshika',
    name: 'Vanshika Garg',
    username: 'vanshika',
    legacyUsernames: ['co-founder'],
    email: 'vanshikagargsatna@gmail.com',
    role: 'owner'
  }
];

const TRIO_EMAILS = new Set(TRIO_MEMBERS.map((m) => m.email.toLowerCase()));
const TRIO_USERNAMES = new Set(
  TRIO_MEMBERS.flatMap((m) => [m.username, ...m.legacyUsernames]).map((u) => u.toLowerCase())
);

/**
 * Returns true ONLY if the admin account belongs to the authorized Trio (Manav, Abhay, or Vanshika).
 */
export function isTrioAdmin(admin) {
  if (!admin || admin.active === false) return false;
  const email = String(admin.email || '').trim().toLowerCase();
  const username = String(admin.username || '').trim().toLowerCase();
  // Email must match one of the Trio's verified emails AND username must match an allowed Trio handle.
  return TRIO_EMAILS.has(email) && TRIO_USERNAMES.has(username);
}

export function findTrioMemberByIdentifier(identifier) {
  const clean = String(identifier || '').trim().toLowerCase();
  if (!clean) return null;
  return TRIO_MEMBERS.find(
    (m) => m.email === clean || m.username === clean || m.legacyUsernames.includes(clean)
  ) || null;
}

export function maskEmail(email) {
  const str = String(email || '').trim();
  const [local, domain] = str.split('@');
  if (!local || !domain) return '';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 2))}@${domain}`;
}

function encryptionKey() {
  const secret = process.env.ADMIN_2FA_KEY || process.env.AUTH_SECRET || 'cvmind-dev-only-secret-change-me';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload) {
  if (!payload || typeof payload !== 'string') return '';
  const parts = payload.split('.');
  if (parts.length !== 3) return '';
  try {
    const [ivB64, tagB64, dataB64] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivB64, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

export function generateStrongPassword(length = 18) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*-_=+';
  const all = upper + lower + digits + symbols;
  const pick = (chars) => chars[crypto.randomInt(0, chars.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

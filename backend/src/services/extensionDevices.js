import crypto from 'crypto';
import ExtensionDevice from '@cvmind/auto-apply-agent/models/ExtensionDevice.js';
import PairCode from '@cvmind/auto-apply-agent/models/PairCode.js';
import { signToken } from './authToken.js';

// Base32 without look-alike characters (0/O, 1/I), so codes are easy to read out and type
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
export const PAIR_CODE_TTL_MS = 5 * 60 * 1000;
export const DEVICE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

export const normalizePairCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const hashCode = (code) => crypto.createHash('sha256').update(normalizePairCode(code)).digest('hex');

export const formatPairCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

export async function createPairCode({ userId, email }) {
  const code = Array.from(crypto.randomBytes(CODE_LENGTH))
    .map((byte) => ALPHABET[byte % ALPHABET.length])
    .join('');
  const expiresAt = new Date(Date.now() + PAIR_CODE_TTL_MS);
  await PairCode.create({ codeHash: hashCode(code), userId: String(userId), email, expiresAt });
  return { code: formatPairCode(code), expiresAt };
}

// Redeems a code once and issues a device token; the code is unusable afterwards
export async function redeemPairCode(code, deviceName) {
  const normalized = normalizePairCode(code);
  if (normalized.length !== CODE_LENGTH) return { ok: false, error: 'That code is not valid.' };

  const claimed = await PairCode.findOneAndUpdate(
    { codeHash: hashCode(normalized), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { returnDocument: 'after' }
  ).lean();
  if (!claimed) return { ok: false, error: 'That code is wrong, already used, or expired.' };

  const jti = crypto.randomUUID();
  const device = await ExtensionDevice.create({
    userId: claimed.userId,
    jti,
    name: String(deviceName || 'Browser extension').slice(0, 60),
    lastSeenAt: new Date()
  });
  const token = signToken({ sub: claimed.userId, kind: 'extension', email: claimed.email, ttlMs: DEVICE_TOKEN_TTL_MS, jti });
  return { ok: true, token, device, expiresAt: new Date(Date.now() + DEVICE_TOKEN_TTL_MS) };
}

export async function findActiveDevice(jti) {
  if (!jti) return null;
  return ExtensionDevice.findOne({
    revokedAt: null,
    $or: [{ jti }, { prevJti: jti, prevJtiUntil: { $gt: new Date() } }]
  }).lean();
}

export function touchDevice(device) {
  if (device.lastSeenAt && Date.now() - new Date(device.lastSeenAt).getTime() < LAST_SEEN_THROTTLE_MS) return;
  ExtensionDevice.updateOne({ _id: device._id }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
}

const issueDeviceToken = (auth, jti) => ({
  token: signToken({ sub: auth.sub, kind: 'extension', email: auth.email, ttlMs: DEVICE_TOKEN_TTL_MS, jti }),
  expiresAt: new Date(Date.now() + DEVICE_TOKEN_TTL_MS)
});

// Rotates the device id. The replaced id keeps working until its token would have expired anyway
// (no weaker than not rotating), so a refresh whose response was lost never unpairs the browser:
// its retry, or a concurrent refresh, gets a token for the current id instead of rotating again.
// Revoking the device still cuts off both ids at once.
export async function refreshDeviceToken(auth, device) {
  if (auth.jti !== device.jti) return issueDeviceToken(auth, device.jti);

  const jti = crypto.randomUUID();
  const rotated = await ExtensionDevice.updateOne(
    { _id: device._id, jti: auth.jti, revokedAt: null },
    { $set: { jti, prevJti: auth.jti, prevJtiUntil: new Date(auth.exp), lastSeenAt: new Date() } }
  );
  if (rotated.matchedCount === 1) return issueDeviceToken(auth, jti);

  const current = await findActiveDevice(auth.jti);
  if (!current) return null;
  return issueDeviceToken(auth, current.jti);
}

export const listDevices = (userId) => ExtensionDevice.find({ userId: String(userId), revokedAt: null }).sort({ createdAt: -1 }).lean();

export const revokeDevice = (userId, deviceId) =>
  ExtensionDevice.updateOne({ _id: deviceId, userId: String(userId), revokedAt: null }, { $set: { revokedAt: new Date() } });

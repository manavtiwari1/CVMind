import crypto from 'crypto';
import { httpError } from '../admin/util.js';

// Field encryption for bank account numbers and PAN (AES-256-GCM).
// ERP_ENCRYPTION_KEY = 64 hex characters (32 bytes): node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Stored form: v1:<iv hex>:<tag hex>:<ciphertext hex>

function key() {
  const hex = String(process.env.ERP_ENCRYPTION_KEY || '').trim();
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  return Buffer.from(hex, 'hex');
}

export const encryptionConfigured = () => !!key();

export function encrypt(plain) {
  const value = String(plain ?? '');
  if (!value) return '';
  const k = key();
  if (!k) throw Object.assign(httpError(503, 'Bank details can\'t be saved yet: ERP_ENCRYPTION_KEY is not set on the server.'), { expose: true });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', k, iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${data.toString('hex')}`;
}

export function decrypt(stored) {
  if (!stored) return '';
  const k = key();
  if (!k) throw Object.assign(httpError(503, 'ERP_ENCRYPTION_KEY is not set on the server.'), { expose: true });
  const [version, iv, tag, data] = String(stored).split(':');
  if (version !== 'v1' || !iv || !tag || !data) throw httpError(500, 'Stored value is unreadable.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8');
}

export const last4 = (value) => String(value || '').replace(/\s/g, '').slice(-4);

import mongoose from 'mongoose';
import { verifyToken } from '../services/authToken.js';
import { findActiveDevice, touchDevice } from './extension/devices.js';

const CONNECTING = 2;
const CONNECTED = 1;

// Paired browser extensions: the token carries a device id (jti) that the user can revoke at any time
export async function requireExtension(req, res, next) {
  const header = req.headers.authorization || '';
  const payload = header.startsWith('Bearer ') ? verifyToken(header.slice(7).trim()) : null;
  if (!payload || payload.kind !== 'extension') {
    return res.status(401).json({ success: false, code: 'PAIR_REQUIRED', error: 'Connect this extension to your CVMind account.' });
  }
  const device = await findActiveDevice(payload.jti);
  if (!device) {
    return res.status(401).json({ success: false, code: 'DEVICE_REVOKED', error: 'This extension was disconnected. Pair it again from CVMind.' });
  }
  req.auth = payload;
  req.device = device;
  touchDevice(device);
  next();
}

// The agent needs real MongoDB (queue leases, GridFS); there is no JSON-file fallback
export function requireMongo({ waitMs = 5000 } = {}) {
  return async (req, res, next) => {
    if (!process.env.MONGODB_URI) {
      return res.status(503).json({ success: false, code: 'AGENT_REQUIRES_MONGODB', error: 'Auto-apply agent requires MongoDB to be configured.' });
    }
    const deadline = Date.now() + waitMs;
    while (mongoose.connection.readyState === CONNECTING && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (mongoose.connection.readyState !== CONNECTED) {
      return res.status(503).json({ success: false, code: 'AGENT_DB_UNAVAILABLE', error: 'Database is not reachable. Please try again shortly.' });
    }
    next();
  };
}

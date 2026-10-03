import { AdminAuditLog } from './models.js';

// Records an admin action. A failed write is logged, never thrown, so the action itself still succeeds.
export async function audit(req, action, { targetType = '', targetId = '', targetLabel = '', details = null } = {}) {
  const admin = req.admin || {};
  try {
    await AdminAuditLog.create({
      actorId: admin.id || '',
      actorName: admin.name || admin.username || '',
      actorRole: admin.role || '',
      action,
      targetType,
      targetId: String(targetId || ''),
      targetLabel: String(targetLabel || '').slice(0, 200),
      details,
      ip: req.ip || ''
    });
  } catch (err) {
    console.error('[admin audit] write failed:', err.message);
  }
}

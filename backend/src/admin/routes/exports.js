import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { AdminAuditLog, Coupon, Ticket } from '../models.js';
import { FEATURE_LOGS } from './analytics.js';
import { userFilter } from './users.js';
import { paymentFilter } from './payments.js';
import { ticketFilter } from './tickets.js';
import { auditFilter } from './team.js';
import { model, handle, httpError, dateRange } from '../util.js';

const router = express.Router();
router.use(requireDb);

const MAX_ROWS = 100000;

function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Stop spreadsheet apps from running a cell as a formula
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Each report: columns, the rows it reads, and the permission it needs
const REPORTS = {
  users: {
    label: 'Users',
    columns: ['id', 'name', 'email', 'provider', 'status', 'statusReason', 'emailVerified', 'createdAt'],
    cursor: (q) => model('User').find(userFilter(q)).sort({ createdAt: -1 }).select('name email provider isGoogleUser status statusReason emailVerified createdAt').lean().cursor(),
    row: (u) => ({ id: String(u._id), name: u.name, email: u.email, provider: u.provider || (u.isGoogleUser ? 'google' : 'password'), status: u.status || 'active', statusReason: u.statusReason || '', emailVerified: !!u.emailVerified, createdAt: u.createdAt })
  },
  payments: {
    label: 'Payments',
    columns: ['id', 'createdAt', 'email', 'amount', 'currency', 'status', 'paymentMethod', 'transactionId', 'plan', 'couponCode', 'discount', 'refundedAt', 'refundReason'],
    cursor: (q) => model('PaymentLog').find(paymentFilter(q)).sort({ createdAt: -1 }).lean().cursor(),
    row: (p) => ({ ...p, id: String(p._id), currency: p.currency || 'INR' })
  },
  'ai-usage': {
    label: 'AI usage',
    columns: ['feature', 'id', 'createdAt', 'userId', 'email', 'detail'],
    // Several collections, read one after another
    async *rows(q) {
      const range = dateRange(q);
      for (const f of FEATURE_LOGS) {
        if (q.feature && q.feature !== f.key) continue;
        for await (const r of model(f.model).find(range).sort({ createdAt: -1 }).lean().cursor()) {
          yield { feature: f.label, id: String(r._id), createdAt: r.createdAt, userId: r.userId || '', email: r.email || '', detail: Object.fromEntries(f.detail.filter((d) => d !== 'email').map((d) => [d, r[d]])) };
        }
      }
    }
  },
  tickets: {
    label: 'Support tickets',
    columns: ['number', 'createdAt', 'name', 'email', 'subject', 'status', 'priority', 'assigneeName', 'messages', 'resolvedAt'],
    cursor: (q, admin) => Ticket.find(ticketFilter(q, admin)).sort({ createdAt: -1 }).lean().cursor(),
    row: (t) => ({ ...t, messages: (t.messages || []).length })
  },
  coupons: {
    label: 'Coupons',
    columns: ['code', 'type', 'value', 'active', 'usedCount', 'maxUses', 'perUserLimit', 'minAmount', 'validFrom', 'validTo', 'createdAt'],
    cursor: () => Coupon.find().sort({ createdAt: -1 }).select('-redemptions').lean().cursor(),
    row: (c) => c
  },
  audit: {
    label: 'Audit log',
    permission: 'audit.view',
    columns: ['createdAt', 'actorName', 'actorRole', 'action', 'targetType', 'targetId', 'targetLabel', 'details', 'ip'],
    cursor: (q) => AdminAuditLog.find(auditFilter(q)).sort({ createdAt: -1 }).lean().cursor(),
    row: (a) => a
  }
};

router.get('/:type', requireAdmin('reports.export'), handle(async (req, res) => {
  const report = REPORTS[req.params.type];
  if (!report) throw httpError(404, 'Unknown report.');
  if (report.permission && !req.admin.permissions.includes(report.permission)) throw httpError(403, 'Your role does not allow this export.');
  const format = req.query.format === 'json' ? 'json' : 'csv';
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `cvmind-${req.params.type}-${stamp}.${format}`;

  res.setHeader('Content-Type', format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  const source = report.rows ? report.rows(req.query) : (async function* () {
    for await (const doc of report.cursor(req.query, req.admin)) yield report.row(doc);
  })();

  let count = 0;
  if (format === 'csv') res.write(`﻿${report.columns.join(',')}\n`);
  else res.write('[');
  for await (const row of source) {
    if (count >= MAX_ROWS) break;
    if (format === 'csv') res.write(`${report.columns.map((c) => csvCell(row[c])).join(',')}\n`);
    else res.write(`${count ? ',' : ''}\n${JSON.stringify(Object.fromEntries(report.columns.map((c) => [c, row[c] ?? null])))}`);
    count++;
  }
  if (format === 'json') res.write('\n]');
  res.end();
  await audit(req, 'report.exported', { targetType: 'report', targetId: req.params.type, targetLabel: report.label, details: { format, rows: count, filters: req.query } });
}));

export const REPORT_LIST = Object.entries(REPORTS).map(([key, r]) => ({ key, label: r.label, columns: r.columns, permission: r.permission || 'reports.export' }));

export default router;

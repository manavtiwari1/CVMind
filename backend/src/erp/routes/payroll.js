import express from 'express';
import { audit } from '../../admin/audit.js';
import { requireAdmin } from '../../admin/auth.js';
import { clean, handle, httpError, isId } from '../../admin/util.js';
import { notify } from '../../team/notify.js';
import { ErpPayLine, ErpPayRun, ErpProfile, PAYMENT_MODES } from '../models.js';
import { calculateRun, isLeadership, MONTH, monthLabel, netOf, nextPayslipNumber, publicLine, publicRun, rupees, runOr404, runTotals } from '../payroll.js';
import { renderPayslipPdf } from '../pdf.js';
import { decrypt } from '../secure.js';
import { getSettings, saveSettings } from '../settings.js';

// Admin panel → ERP → Payroll, and ERP settings
const router = express.Router();
const view = requireAdmin('hr.view');
const manage = requireAdmin('hr.manage');
const actorId = (req) => (req.admin.id === 'env-owner' ? null : req.admin.id);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const money = (v, label) => {
  const n = v === '' || v === undefined || v === null ? 0 : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 10000000) throw httpError(400, `Enter ${label} in rupees.`);
  return Math.round(n * 100) / 100;
};

// ── Settings ─────────────────────────────────────────────────────────────────
router.get('/settings', view, handle(async (req, res) => {
  res.json({ success: true, data: await getSettings() });
}));

router.put('/settings', manage, handle(async (req, res) => {
  const data = await saveSettings(req.body, req.admin.username || '');
  await audit(req, 'hr.settings_updated', { targetType: 'erp_settings', details: { fields: Object.keys(req.body || {}) } });
  res.json({ success: true, data });
}));

// ── Runs ─────────────────────────────────────────────────────────────────────
router.get('/payroll/runs', view, handle(async (req, res) => {
  const runs = await ErpPayRun.find({}).sort({ month: -1 }).limit(60).lean();
  const lines = await ErpPayLine.find({ runId: { $in: runs.map((r) => r._id) } }).lean();
  res.json({ success: true, data: runs.map((r) => publicRun(r, runTotals(lines.filter((l) => String(l.runId) === String(r._id))))) });
}));

router.post('/payroll/runs', manage, handle(async (req, res) => {
  const month = clean(req.body?.month, 7);
  if (!MONTH.test(month)) throw httpError(400, 'Pick a month.');
  if (await ErpPayRun.exists({ month })) throw httpError(409, `There is already a pay run for ${monthLabel(month)}.`);
  const run = await ErpPayRun.create({ month, createdBy: actorId(req), createdByName: req.admin.name || req.admin.username });
  await calculateRun(run);
  await audit(req, 'hr.payrun_created', { targetType: 'pay_run', targetId: run._id, targetLabel: month });
  res.json({ success: true, data: publicRun(run.toObject()) });
}));

router.get('/payroll/runs/:id', view, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Pay run not found.');
  const run = await runOr404(req.params.id);
  const lines = await ErpPayLine.find({ runId: run._id }).sort({ name: 1 }).lean();
  res.json({ success: true, data: publicRun(run.toObject(), runTotals(lines)), lines: lines.map(publicLine), canApprove: isLeadership(req.admin) });
}));

router.post('/payroll/runs/:id/recalculate', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Pay run not found.');
  const run = await runOr404(req.params.id);
  await calculateRun(run);
  res.json({ success: true });
}));

router.delete('/payroll/runs/:id', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Pay run not found.');
  const run = await runOr404(req.params.id);
  if (run.status !== 'draft') throw httpError(400, 'An approved run can\'t be deleted.');
  await ErpPayLine.deleteMany({ runId: run._id });
  await run.deleteOne();
  await audit(req, 'hr.payrun_deleted', { targetType: 'pay_run', targetId: run._id, targetLabel: run.month });
  res.json({ success: true });
}));

// Leadership locks the numbers
router.post('/payroll/runs/:id/approve', manage, handle(async (req, res) => {
  if (!isLeadership(req.admin)) throw httpError(403, 'Only the CEO, CTO, CMO or owner can approve a pay run.');
  if (!isId(req.params.id)) throw httpError(404, 'Pay run not found.');
  const run = await runOr404(req.params.id);
  if (run.status !== 'draft') throw httpError(400, 'This run is already approved.');
  const lines = await ErpPayLine.find({ runId: run._id }).lean();
  if (!lines.length) throw httpError(400, 'There is no one to pay in this run.');
  run.status = 'approved';
  run.approvedBy = actorId(req);
  run.approvedByName = req.admin.name || req.admin.username;
  run.approvedAt = new Date();
  await run.save();
  await audit(req, 'hr.payrun_approved', { targetType: 'pay_run', targetId: run._id, targetLabel: run.month, details: runTotals(lines) });
  res.json({ success: true, data: publicRun(run.toObject(), runTotals(lines)) });
}));

// Bonus, deductions, reimbursements and a note, while the run is a draft
router.patch('/payroll/lines/:id', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Line not found.');
  const line = await ErpPayLine.findById(req.params.id);
  if (!line) throw httpError(404, 'Line not found.');
  const run = await runOr404(line.runId);
  if (run.status !== 'draft') throw httpError(400, 'This run is approved, so its numbers are locked.');
  if (req.body.bonus !== undefined) line.bonus = money(req.body.bonus, 'the bonus');
  if (req.body.deductions !== undefined) line.deductions = money(req.body.deductions, 'the deductions');
  if (req.body.reimbursements !== undefined) line.reimbursements = money(req.body.reimbursements, 'the reimbursements');
  if (req.body.note !== undefined) line.note = clean(req.body.note, 200);
  line.netPay = netOf(line);
  if (line.netPay < 0) throw httpError(400, 'Deductions are more than the pay.');
  await line.save();
  res.json({ success: true, data: publicLine(line.toObject()) });
}));

// After the bank transfer: records it, numbers the payslip and tells the member
router.post('/payroll/lines/:id/paid', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Line not found.');
  const line = await ErpPayLine.findById(req.params.id);
  if (!line) throw httpError(404, 'Line not found.');
  const run = await runOr404(line.runId);
  if (run.status === 'draft') throw httpError(400, 'Approve the run before marking anyone paid.');
  if (line.paidAt) throw httpError(400, `${line.name} is already marked paid.`);
  const paidOn = clean(req.body?.paidOn, 10);
  if (!DAY.test(paidOn)) throw httpError(400, 'Pick the payment date.');
  if (!PAYMENT_MODES.includes(req.body?.mode)) throw httpError(400, 'Pick how it was paid.');
  line.paidOn = paidOn;
  line.paidMode = req.body.mode;
  line.paidRef = clean(req.body?.reference, 60);
  line.paidAt = new Date();
  line.paidByName = req.admin.name || req.admin.username;
  line.payslipNumber = await nextPayslipNumber(line.month);
  await line.save();
  if (!(await ErpPayLine.exists({ runId: run._id, paidAt: null }))) {
    run.status = 'paid';
    await run.save();
  }
  await notify([String(line.adminId)], { type: 'payslip_ready', actorId: actorId(req), refType: 'payslip', refId: line._id, preview: `${monthLabel(line.month)}: ${rupees(line.netPay).toLocaleString('en-IN')} rupees paid` });
  await audit(req, 'hr.pay_marked_paid', { targetType: 'pay_line', targetId: line._id, targetLabel: `${line.name} · ${line.month}`, details: { netPay: line.netPay, mode: line.paidMode, reference: line.paidRef } });
  res.json({ success: true, data: publicLine(line.toObject()) });
}));

router.get('/payroll/lines/:id/payslip', view, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Payslip not found.');
  const line = await ErpPayLine.findById(req.params.id).lean();
  if (!line) throw httpError(404, 'Payslip not found.');
  const pdf = await renderPayslipPdf(line, await getSettings());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${line.month}-${(line.name || 'member').replace(/[^\w-]+/g, '-')}.pdf"`);
  res.send(pdf);
}));

// ── Exports ──────────────────────────────────────────────────────────────────
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
};
const csv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

// The whole run, for the CA
router.get('/payroll/runs/:id/export', view, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Pay run not found.');
  const run = await runOr404(req.params.id);
  const lines = await ErpPayLine.find({ runId: run._id }).sort({ name: 1 }).lean();
  const rows = [['Name', 'ID', 'Designation', 'Type', 'Monthly amount', 'Month working days', 'Their working days', 'Present', 'Paid leave', 'Unpaid days', 'Base pay', 'Bonus', 'Deductions', 'Reimbursements', 'Net pay', 'Paid on', 'Mode', 'Reference', 'Payslip']];
  for (const l of lines) rows.push([l.name, l.idNumber, l.designation, l.payType, l.monthlyAmount, l.monthWorkingDays, l.workingDays, l.presentDays, l.paidLeaveDays, l.unpaidDays, l.basePay, l.bonus, l.deductions, l.reimbursements, l.netPay, l.paidOn, l.paidMode, l.paidRef, l.payslipNumber]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="payroll-${run.month}.csv"`);
  res.send(csv(rows));
}));

// Bank bulk-transfer file: full account numbers, so HR managers only, and recorded
router.get('/payroll/runs/:id/bank-file', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Pay run not found.');
  const run = await runOr404(req.params.id);
  if (run.status === 'draft') throw httpError(400, 'Approve the run first.');
  const lines = await ErpPayLine.find({ runId: run._id, paidAt: null }).sort({ name: 1 }).lean();
  const profiles = new Map((await ErpProfile.find({ adminId: { $in: lines.map((l) => l.adminId) } }).lean()).map((p) => [String(p.adminId), p]));
  const rows = [['Beneficiary name', 'Account number', 'IFSC', 'UPI ID', 'Amount', 'Remarks']];
  for (const l of lines) {
    const p = profiles.get(String(l.adminId)) || {};
    rows.push([p.bankHolder || l.name, decrypt(p.bankAccountEnc), p.bankIfsc || '', p.upiId || '', l.netPay, `CVMind ${l.payType} ${l.month}`]);
  }
  await audit(req, 'hr.bank_file_downloaded', { targetType: 'pay_run', targetId: run._id, targetLabel: run.month, details: { people: lines.length } });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bank-transfer-${run.month}.csv"`);
  res.send(csv(rows));
}));

export default router;

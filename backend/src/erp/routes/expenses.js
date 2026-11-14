import express from 'express';
import { audit } from '../../admin/audit.js';
import { requireAdmin } from '../../admin/auth.js';
import { clean, handle, httpError, isId } from '../../admin/util.js';
import { TeamFile } from '../../admin/team/models.js';
import { notify } from '../../admin/team/notify.js';
import { fileTypeError, headObject, MAX_FILE_BYTES, presignDownload, presignUpload, removeObject } from '../../admin/team/storage.js';
import { newFileKey } from '../../admin/team/files.js';
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, ErpExpense, ErpPayLine, ErpPayRun } from '../models.js';
import { approveStep, attachReceipt, canDecide, CATEGORY_LABELS, declineStep, PANEL_UPLOADER, publicExpenses, readExpense } from '../expenses.js';
import { MONTH, netOf } from '../payroll.js';

// Admin panel → ERP → Expenses
const router = express.Router();
const view = requireAdmin('hr.view');
const manage = requireAdmin('hr.manage');
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Receipts uploaded from the admin panel (private "hr" files, opened only through signed links)
router.post('/files/upload-url', manage, handle(async (req, res) => {
  const name = clean(req.body?.name, 180).replace(/[\\/]/g, '_');
  const mime = clean(req.body?.mime, 120).toLowerCase();
  const size = Number(req.body?.size);
  const typeError = fileTypeError(name, mime);
  if (!name || typeError) throw httpError(400, typeError || 'The file needs a name.');
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) throw httpError(400, `Files can be up to ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  const key = newFileKey(name);
  const uploadUrl = await presignUpload(key, mime);
  const file = await TeamFile.create({ key, name, mime, size, uploadedBy: PANEL_UPLOADER, scope: 'hr' });
  res.json({ success: true, file: { id: String(file._id), name }, uploadUrl, headers: { 'Content-Type': mime } });
}));

router.post('/files/:id/complete', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'File not found.');
  const file = await TeamFile.findOne({ _id: req.params.id, uploadedBy: PANEL_UPLOADER, status: 'pending' });
  if (!file) throw httpError(404, 'File not found.');
  const stored = await headObject(file.key);
  if (!stored || stored.size !== file.size || String(stored.mime || '').split(';')[0].toLowerCase() !== file.mime) {
    await removeObject(file.key).catch(() => {});
    await file.deleteOne();
    throw httpError(400, 'The upload did not finish. Try again.');
  }
  file.status = 'ready';
  await file.save();
  res.json({ success: true, file: { id: String(file._id), name: file.name } });
}));

router.get('/expenses', view, handle(async (req, res) => {
  const filter = {};
  const month = clean(req.query.month, 7);
  if (MONTH.test(month)) filter.date = { $gte: `${month}-01`, $lte: `${month}-31` };
  if (['company', 'claim'].includes(req.query.kind)) filter.kind = req.query.kind;
  if (EXPENSE_CATEGORIES.includes(req.query.category)) filter.category = req.query.category;
  if (req.query.status === 'pending') filter.status = { $in: ['pending_manager', 'pending_hr', 'pending_leadership'] };
  else if (EXPENSE_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const rows = await ErpExpense.find(filter).sort({ date: -1, createdAt: -1 }).limit(500).lean();
  // Money actually spent: everything except drafts, declined claims and claims not approved yet
  const spent = rows.filter((e) => ['recorded', 'approved', 'reimbursed'].includes(e.status));
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({ category: c, label: CATEGORY_LABELS[c], amount: Math.round(spent.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0)) })).filter((c) => c.amount > 0);
  const counts = {
    pending: await ErpExpense.countDocuments({ status: { $in: ['pending_hr', 'pending_leadership'] } }),
    toReimburse: await ErpExpense.countDocuments({ status: 'approved' }),
    drafts: await ErpExpense.countDocuments({ status: 'draft' })
  };
  res.json({ success: true, data: await publicExpenses(rows), total: Math.round(spent.reduce((s, e) => s + e.amount, 0)), byCategory, counts, categories: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })) });
}));

router.post('/expenses', manage, handle(async (req, res) => {
  const fields = readExpense(req.body);
  const row = new ErpExpense({ ...fields, kind: 'company', status: 'recorded', createdBy: req.admin.id === 'env-owner' ? null : req.admin.id, createdByName: req.admin.name || req.admin.username });
  row.receiptFileId = await attachReceipt(req.body?.receiptFileId, PANEL_UPLOADER, row._id);
  await row.save();
  await audit(req, 'hr.expense_added', { targetType: 'expense', targetId: row._id, targetLabel: `${row.date} · ₹${row.amount}`, details: { category: row.category } });
  res.json({ success: true, data: (await publicExpenses([row.toObject()]))[0] });
}));

// Edit a company expense (or confirm a draft from a repeating one)
router.patch('/expenses/:id', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Expense not found.');
  const row = await ErpExpense.findById(req.params.id);
  if (!row || row.kind !== 'company') throw httpError(404, 'Expense not found.');
  Object.assign(row, readExpense({ ...row.toObject(), ...req.body }));
  if (row.status === 'draft' && req.body?.confirm === true) row.status = 'recorded';
  if (req.body?.receiptFileId && !row.receiptFileId) row.receiptFileId = await attachReceipt(req.body.receiptFileId, PANEL_UPLOADER, row._id);
  await row.save();
  await audit(req, 'hr.expense_updated', { targetType: 'expense', targetId: row._id, targetLabel: `${row.date} · ₹${row.amount}` });
  res.json({ success: true, data: (await publicExpenses([row.toObject()]))[0] });
}));

router.delete('/expenses/:id', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Expense not found.');
  const row = await ErpExpense.findById(req.params.id);
  if (!row || row.kind !== 'company') throw httpError(404, 'Only company expenses can be deleted. Decline a claim instead.');
  await row.deleteOne();
  if (row.receiptFileId) await TeamFile.updateOne({ _id: row.receiptFileId }, { status: 'deleted', deletedAt: new Date() });
  await audit(req, 'hr.expense_deleted', { targetType: 'expense', targetId: row._id, targetLabel: `${row.date} · ₹${row.amount}` });
  res.json({ success: true });
}));

router.get('/expenses/:id/receipt', view, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Expense not found.');
  const row = await ErpExpense.findById(req.params.id).lean();
  const file = row?.receiptFileId ? await TeamFile.findById(row.receiptFileId).lean() : null;
  if (!file || file.status !== 'ready') throw httpError(404, 'No receipt.');
  res.json({ success: true, url: await presignDownload(file, req.query.download === '1') });
}));

// Claims at the HR or leadership step
router.post('/expenses/:id/decide', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Claim not found.');
  const row = await ErpExpense.findById(req.params.id);
  if (!row || row.kind !== 'claim') throw httpError(404, 'Claim not found.');
  if (!canDecide(req.admin, row, { fromPanel: true })) {
    throw httpError(403, row.status === 'pending_leadership' ? 'Claims above the limit are approved by the CEO, CTO, CMO or owner.' : row.status === 'pending_manager' ? 'Their manager approves this step in CVMind Team.' : 'This claim isn\'t waiting for a decision.');
  }
  if (req.body?.approve === true) await approveStep(req.admin, row);
  else await declineStep(req.admin, row, req.body?.reason);
  await audit(req, req.body?.approve === true ? 'hr.claim_approved' : 'hr.claim_declined', { targetType: 'expense', targetId: row._id, targetLabel: `₹${row.amount}` });
  res.json({ success: true, data: (await publicExpenses([row.toObject()]))[0] });
}));

// An approved claim is paid back directly, or added to the member's line in a draft pay run
router.post('/expenses/:id/reimburse', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Claim not found.');
  const row = await ErpExpense.findById(req.params.id);
  if (!row || row.kind !== 'claim') throw httpError(404, 'Claim not found.');
  if (row.status !== 'approved') throw httpError(400, 'Only approved claims can be reimbursed.');
  if (req.body?.via === 'payroll') {
    const month = clean(req.body?.month, 7);
    const run = MONTH.test(month) ? await ErpPayRun.findOne({ month }).lean() : null;
    if (!run || run.status !== 'draft') throw httpError(400, 'Pick a month whose pay run is still a draft.');
    const line = await ErpPayLine.findOne({ runId: run._id, adminId: row.submittedBy });
    if (!line) throw httpError(400, 'They aren\'t in that month\'s pay run. Reimburse them directly instead.');
    line.reimbursements = Math.round(((line.reimbursements || 0) + row.amount) * 100) / 100;
    line.netPay = netOf(line);
    await line.save();
    row.reimbursedVia = 'payroll';
    row.reimbursedOn = month;
    row.payLineId = line._id;
  } else {
    const paidOn = clean(req.body?.paidOn, 10);
    if (!DAY.test(paidOn)) throw httpError(400, 'Pick the date you paid it back.');
    row.reimbursedVia = 'direct';
    row.reimbursedOn = paidOn;
    row.reference = clean(req.body?.reference, 80) || row.reference;
  }
  row.status = 'reimbursed';
  await row.save();
  await notify([String(row.submittedBy)], { type: 'claim_reimbursed', refType: 'claim', refId: row._id, preview: `₹${row.amount.toLocaleString('en-IN')}${row.reimbursedVia === 'payroll' ? ` with your ${row.reimbursedOn} pay` : ''}` });
  await audit(req, 'hr.claim_reimbursed', { targetType: 'expense', targetId: row._id, targetLabel: `₹${row.amount}`, details: { via: row.reimbursedVia, on: row.reimbursedOn } });
  res.json({ success: true, data: (await publicExpenses([row.toObject()]))[0] });
}));

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
};

router.get('/expenses-export', view, handle(async (req, res) => {
  const month = clean(req.query.month, 7);
  const filter = MONTH.test(month) ? { date: { $gte: `${month}-01`, $lte: `${month}-31` } } : {};
  const rows = await publicExpenses(await ErpExpense.find({ ...filter, status: { $in: ['recorded', 'approved', 'reimbursed'] } }).sort({ date: 1 }).lean());
  const lines = [['Date', 'Kind', 'Category', 'Paid to', 'Description', 'Amount', 'Mode', 'Reference', 'Claimed by', 'Status'], ...rows.map((e) => [e.date, e.kind, e.categoryLabel, e.paidTo, e.description, e.amount, e.paymentMode, e.reference, e.submittedByName, e.status])];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="expenses-${month || 'all'}.csv"`);
  res.send(lines.map((r) => r.map(csvCell).join(',')).join('\n') + '\n');
}));

export default router;

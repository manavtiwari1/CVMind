import mongoose from 'mongoose';
import { AdminUser } from '../admin/models.js';
import { clean, httpError, isId } from '../admin/util.js';
import { TeamFile } from '../admin/team/models.js';
import { istDay, notify } from '../admin/team/notify.js';
import { EXPENSE_CATEGORIES, ErpExpense, ErpProfile } from './models.js';
import { hrManagerIds } from './jobs.js';
import { isLeadership } from './payroll.js';
import { getSettings } from './settings.js';

// Expenses: checking fields, the claim approval steps, and repeating expenses.

export const CATEGORY_LABELS = {
  servers: 'Servers & hosting', ai_apis: 'AI APIs', marketing: 'Marketing & ads', software: 'Software & SaaS',
  domains: 'Domains', office_travel: 'Office & travel', salaries: 'Salaries & stipends', other: 'Other'
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// Files the admin panel uploads (it has no team account) are owned by this id
export const PANEL_UPLOADER = new mongoose.Types.ObjectId('000000000000000000000000');

export function readExpense(body = {}, { claim = false } = {}) {
  const date = clean(body.date, 10);
  if (!DAY.test(date)) throw httpError(400, 'Pick the date of the expense.');
  if (date > istDay()) throw httpError(400, 'The date is in the future.');
  const amount = Math.round(Number(body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) throw httpError(400, 'Enter the amount in rupees.');
  if (!EXPENSE_CATEGORIES.includes(body.category) || (claim && body.category === 'salaries')) throw httpError(400, 'Pick a category.');
  const out = {
    date,
    amount,
    category: body.category,
    paidTo: clean(body.paidTo, 120),
    description: clean(body.description, 500),
    paymentMode: clean(body.paymentMode, 30),
    reference: clean(body.reference, 80)
  };
  if (claim && !out.description) throw httpError(400, 'Say what the money was for.');
  if (!claim) {
    out.recurring = ['monthly', 'yearly'].includes(body.recurring) ? body.recurring : 'none';
    out.nextDueOn = out.recurring === 'none' ? '' : nextDate(date, out.recurring);
    out.assetId = isId(body.assetId) ? body.assetId : null;
  }
  return out;
}

export function nextDate(day, every) {
  const [y, m, d] = day.split('-').map(Number);
  const target = every === 'yearly' ? new Date(Date.UTC(y + 1, m - 1, 1)) : new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

// Ties an uploaded receipt (ready, not used yet) to the expense
export async function attachReceipt(fileId, uploadedBy, expenseId) {
  if (!fileId) return null;
  if (!isId(fileId)) throw httpError(400, 'Upload the receipt again.');
  const file = await TeamFile.findOneAndUpdate(
    { _id: fileId, uploadedBy, scope: 'hr', status: 'ready', 'attachedTo.type': null },
    { attachedTo: { type: 'expense_receipt', id: expenseId } },
    { returnDocument: 'after' }
  ).lean();
  if (!file) throw httpError(400, 'The receipt is not ready or is already used. Upload it again.');
  return file._id;
}

// The first approval step for a new claim
export async function firstStage(adminId, amount) {
  const [profile, settings] = await Promise.all([ErpProfile.findOne({ adminId }, { managerId: 1 }).lean(), getSettings()]);
  const managerId = profile?.managerId && (await AdminUser.exists({ _id: profile.managerId, active: true })) ? profile.managerId : null;
  if (managerId) return { status: 'pending_manager', managerId };
  return { status: amount > settings.claimApprovalLimit ? 'pending_leadership' : 'pending_hr', managerId: null };
}

// Who may act on a claim at its current step: 'manager' (team token), or HR/leadership (panel)
export function canDecide(admin, expense, { fromPanel }) {
  if (expense.status === 'pending_manager') return !fromPanel && String(expense.managerId) === String(admin.id);
  if (expense.status === 'pending_hr') return fromPanel && admin.permissions.includes('hr.manage');
  if (expense.status === 'pending_leadership') return fromPanel && isLeadership(admin);
  return false;
}

// Approves the current step and moves the claim on; tells the next approvers or the member
export async function approveStep(admin, expense) {
  const settings = await getSettings();
  const stage = expense.status;
  expense.approvals.push({ stage, byId: admin.id === 'env-owner' ? null : admin.id, byName: admin.name || admin.username, at: new Date() });
  expense.status = stage === 'pending_manager' && expense.amount > settings.claimApprovalLimit ? 'pending_leadership' : 'approved';
  await expense.save();
  const amount = `₹${expense.amount.toLocaleString('en-IN')}`;
  if (expense.status === 'approved') {
    await notify([String(expense.submittedBy)], { type: 'claim_approved', refType: 'claim', refId: expense._id, preview: `${amount} · ${expense.description}` });
    await notify(await hrManagerIds(), { type: 'claim_to_reimburse', refType: 'claim', refId: expense._id, preview: `${amount} · ${expense.description}` });
  }
  return expense;
}

export async function declineStep(admin, expense, reason) {
  expense.status = 'declined';
  expense.declinedReason = clean(reason, 300);
  expense.declinedByName = admin.name || admin.username;
  await expense.save();
  await notify([String(expense.submittedBy)], { type: 'claim_declined', refType: 'claim', refId: expense._id, preview: `₹${expense.amount.toLocaleString('en-IN')}${expense.declinedReason ? ` · ${expense.declinedReason}` : ''}` });
  return expense;
}

export async function publicExpenses(rows) {
  const ids = [...new Set(rows.flatMap((e) => [e.submittedBy, e.managerId].filter(Boolean).map(String)))];
  const names = new Map((await AdminUser.find({ _id: { $in: ids } }, { name: 1, username: 1 }).lean()).map((a) => [String(a._id), a.name || a.username]));
  const files = new Map((await TeamFile.find({ _id: { $in: rows.map((e) => e.receiptFileId).filter(Boolean) } }, { name: 1 }).lean()).map((f) => [String(f._id), f.name]));
  return rows.map((e) => ({
    id: String(e._id),
    kind: e.kind,
    date: e.date,
    amount: e.amount,
    category: e.category,
    categoryLabel: CATEGORY_LABELS[e.category],
    paidTo: e.paidTo,
    description: e.description,
    paymentMode: e.paymentMode,
    reference: e.reference,
    receiptName: e.receiptFileId ? files.get(String(e.receiptFileId)) || 'Receipt' : '',
    hasReceipt: !!e.receiptFileId,
    status: e.status,
    submittedById: e.submittedBy ? String(e.submittedBy) : null,
    submittedByName: e.submittedBy ? names.get(String(e.submittedBy)) || 'Former member' : '',
    managerName: e.managerId ? names.get(String(e.managerId)) || '' : '',
    approvals: (e.approvals || []).map((a) => ({ stage: a.stage, byName: a.byName, at: a.at })),
    declinedReason: e.declinedReason,
    reimbursedVia: e.reimbursedVia,
    reimbursedOn: e.reimbursedOn,
    recurring: e.recurring,
    nextDueOn: e.nextDueOn,
    assetId: e.assetId ? String(e.assetId) : null,
    createdByName: e.createdByName,
    createdAt: e.createdAt
  }));
}

// Daily: a repeating expense whose next date has come gets a draft copy, which carries the repeat on
export async function spawnRecurringExpenses(now = new Date()) {
  const today = istDay(now);
  const due = await ErpExpense.find({ kind: 'company', recurring: { $ne: 'none' }, nextDueOn: { $ne: '', $lte: today } }).lean();
  let created = 0;
  for (const e of due) {
    const claimed = await ErpExpense.updateOne({ _id: e._id, recurring: e.recurring, nextDueOn: e.nextDueOn }, { $set: { recurring: 'none', nextDueOn: '' } });
    if (!claimed.modifiedCount) continue;
    await ErpExpense.create({
      kind: 'company', date: e.nextDueOn, amount: e.amount, category: e.category, paidTo: e.paidTo, description: e.description,
      paymentMode: e.paymentMode, status: 'draft', recurring: e.recurring, nextDueOn: nextDate(e.nextDueOn, e.recurring),
      assetId: e.assetId, createdByName: 'Repeats automatically'
    });
    created += 1;
  }
  return { created };
}

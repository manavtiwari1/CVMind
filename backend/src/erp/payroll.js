import { AdminUser, AppSetting } from '../admin/models.js';
import { ROLES } from '../admin/permissions.js';
import { httpError } from '../admin/util.js';
import { TeamLeave, TeamStandup } from '../team/models.js';
import { ErpPayHistory, ErpPayLine, ErpPayRun, ErpProfile } from './models.js';
import { getSettings } from './settings.js';

// Monthly payroll: one line per paid person, filled from their HR file and CVMind Team attendance.
//
// Net pay = monthly amount ÷ working days in the month × (their working days − unpaid days)
//           + bonus − deductions + reimbursements
//
// Their working days are the month's working days between joining and their last day (pro-rated).
// Unpaid days = casual/sick leave beyond the monthly paid quota, plus (only if the setting is on)
// working days with no check-in and no leave. Approved WFH counts as present.

export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function monthDays(month) {
  const [y, m] = month.split('-').map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}
const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay();
export const rupees = (n) => Math.round(Number(n || 0));

export const isLeadership = (admin) => admin?.id === 'env-owner' || admin?.role === 'owner' || !!ROLES[admin?.role]?.leadership;

// The pay rate in force on a day, from the dated pay history
async function rateOn(adminId, day) {
  const row = await ErpPayHistory.findOne({ adminId, effectiveFrom: { $lte: day } }).sort({ effectiveFrom: -1, createdAt: -1 }).lean();
  return row ? { payType: row.payType, amount: row.amount } : null;
}

// Works out one person's line for the month, or null when they aren't paid that month
export async function computeLine(person, profile, month, settings) {
  const days = monthDays(month);
  const holidays = new Set((settings.holidays || []).map((h) => h.date));
  const working = days.filter((d) => settings.workingWeekdays.includes(weekday(d)) && !holidays.has(d));
  const start = profile.joiningDate || new Date(person.createdAt).toISOString().slice(0, 10);
  const end = profile.lastWorkingDay || profile.endDate || '9999-12-31';
  const mine = working.filter((d) => d >= start && d <= end);
  if (!mine.length) return null;

  const rate = await rateOn(person._id, mine.at(-1));
  if (!rate || rate.payType === 'unpaid' || !(rate.amount > 0)) return null;

  const [standups, leaves] = await Promise.all([
    TeamStandup.find({ adminId: person._id, day: { $gte: days[0], $lte: days.at(-1) } }, { day: 1 }).lean(),
    TeamLeave.find({ adminId: person._id, status: 'approved', from: { $lte: days.at(-1) }, to: { $gte: days[0] } }).lean()
  ]);
  const checkedIn = new Set(standups.map((s) => s.day));
  const leaveOn = new Map();
  for (const l of leaves) for (const d of mine) if (d >= l.from && d <= l.to) leaveOn.set(d, l.kind);

  let present = 0, wfh = 0, leaveDays = 0, absent = 0;
  for (const d of mine) {
    const kind = leaveOn.get(d);
    if (kind === 'wfh') { wfh += 1; present += 1; continue; }
    if (kind) { leaveDays += 1; continue; }
    if (checkedIn.has(d)) present += 1;
    else absent += 1;
  }
  const quota = Number(settings.paidLeavePerMonth?.[profile.employmentType || 'intern'] ?? 0);
  const paidLeave = Math.min(leaveDays, quota);
  const unpaidLeave = leaveDays - paidLeave;
  const unpaid = unpaidLeave + (settings.missedCheckInUnpaid ? absent : 0);
  const basePay = rupees(rate.amount / working.length * (mine.length - unpaid));

  return {
    adminId: person._id,
    name: profile.legalName || person.name || person.username,
    idNumber: person.idNumber || '',
    designation: profile.designation || ROLES[person.role]?.label || '',
    department: person.department || '',
    employmentType: profile.employmentType || 'intern',
    payType: rate.payType,
    monthlyAmount: rate.amount,
    monthWorkingDays: working.length,
    workingDays: mine.length,
    presentDays: present,
    wfhDays: wfh,
    paidLeaveDays: paidLeave,
    unpaidLeaveDays: unpaidLeave,
    absentDays: absent,
    unpaidDays: unpaid,
    basePay,
    bankAccountLast4: profile.bankAccountLast4 || '',
    upiId: profile.upiId || ''
  };
}

export const netOf = (line) => rupees(line.basePay + (line.bonus || 0) - (line.deductions || 0) + (line.reimbursements || 0));

// Fills (or refills) a draft run. Bonus, deductions, reimbursements and notes typed by HR are kept.
export async function calculateRun(run) {
  if (run.status !== 'draft') throw httpError(400, 'This run is approved, so its numbers are locked.');
  const settings = await getSettings();
  const people = await AdminUser.find({ active: true }).lean();
  const profiles = new Map((await ErpProfile.find({ adminId: { $in: people.map((p) => p._id) } }).lean()).map((p) => [String(p.adminId), p]));
  const existing = new Map((await ErpPayLine.find({ runId: run._id }).lean()).map((l) => [String(l.adminId), l]));
  const keep = new Set();
  for (const person of people) {
    const line = await computeLine(person, profiles.get(String(person._id)) || {}, run.month, settings);
    if (!line) continue;
    const prev = existing.get(String(person._id));
    const extra = prev ? { bonus: prev.bonus, deductions: prev.deductions, reimbursements: prev.reimbursements, note: prev.note } : {};
    const full = { ...line, ...extra, runId: run._id, month: run.month };
    full.netPay = netOf(full);
    await ErpPayLine.updateOne({ runId: run._id, adminId: person._id }, { $set: full }, { upsert: true });
    keep.add(String(person._id));
  }
  // People who no longer qualify (pay removed, left before the month) drop off the draft
  const gone = [...existing.keys()].filter((id) => !keep.has(id));
  if (gone.length) await ErpPayLine.deleteMany({ runId: run._id, adminId: { $in: gone } });
  run.calculatedAt = new Date();
  await run.save();
}

// CVM/PAY/2026-11/0001, counting within each month
export async function nextPayslipNumber(month) {
  const row = await AppSetting.findOneAndUpdate({ key: `counter.payslip.${month}` }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' }).lean();
  return `CVM/PAY/${month}/${String(row.value).padStart(4, '0')}`;
}

export const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

export const publicRun = (r, totals = null) => ({
  id: String(r._id),
  month: r.month,
  label: monthLabel(r.month),
  status: r.status,
  createdByName: r.createdByName || '',
  approvedByName: r.approvedByName || '',
  approvedAt: r.approvedAt || null,
  calculatedAt: r.calculatedAt || null,
  createdAt: r.createdAt,
  ...(totals ? { totals } : {})
});

export const publicLine = (l) => ({
  id: String(l._id),
  adminId: String(l.adminId),
  month: l.month,
  name: l.name,
  idNumber: l.idNumber,
  designation: l.designation,
  department: l.department,
  employmentType: l.employmentType,
  payType: l.payType,
  monthlyAmount: l.monthlyAmount,
  monthWorkingDays: l.monthWorkingDays,
  workingDays: l.workingDays,
  presentDays: l.presentDays,
  wfhDays: l.wfhDays,
  paidLeaveDays: l.paidLeaveDays,
  unpaidLeaveDays: l.unpaidLeaveDays,
  absentDays: l.absentDays,
  unpaidDays: l.unpaidDays,
  basePay: l.basePay,
  bonus: l.bonus,
  deductions: l.deductions,
  reimbursements: l.reimbursements,
  netPay: l.netPay,
  note: l.note,
  paid: !!l.paidAt,
  paidOn: l.paidOn || '',
  paidMode: l.paidMode || '',
  paidRef: l.paidRef || '',
  payslipNumber: l.payslipNumber || '',
  bankAccountLast4: l.bankAccountLast4 || '',
  upiId: l.upiId || ''
});

export function runTotals(lines) {
  return {
    people: lines.length,
    gross: rupees(lines.reduce((s, l) => s + l.basePay, 0)),
    bonus: rupees(lines.reduce((s, l) => s + (l.bonus || 0), 0)),
    deductions: rupees(lines.reduce((s, l) => s + (l.deductions || 0), 0)),
    reimbursements: rupees(lines.reduce((s, l) => s + (l.reimbursements || 0), 0)),
    net: rupees(lines.reduce((s, l) => s + l.netPay, 0)),
    paid: lines.filter((l) => l.paidAt).length
  };
}

export async function runOr404(id) {
  const run = await ErpPayRun.findById(id);
  if (!run) throw httpError(404, 'Pay run not found.');
  return run;
}

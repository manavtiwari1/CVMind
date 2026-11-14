import { AppSetting } from '../admin/models.js';
import { clean, httpError } from '../admin/util.js';
import { EMPLOYMENT_TYPES } from './models.js';

// ERP settings (admin panel → ERP → Settings), one AppSetting row: erp.settings
const KEY = 'erp.settings';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_SETTINGS = Object.freeze({
  // 0 = Sunday … 6 = Saturday. Mon–Sat, like CVMind Team check-ins.
  workingWeekdays: [1, 2, 3, 4, 5, 6],
  holidays: [],
  // Paid casual + sick days a month by type of job; leave beyond these is unpaid
  paidLeavePerMonth: { intern: 1, full_time: 2, part_time: 1, contractor: 0 },
  // A working day with no check-in and no leave doesn't cut pay unless this is on
  missedCheckInUnpaid: false,
  // Expense claims above this (INR) also need leadership approval
  claimApprovalLimit: 2000,
  // Letters
  signatoryName: '',
  signatoryTitle: '',
  companyAddress: ''
});

export async function getSettings() {
  const row = await AppSetting.findOne({ key: KEY }).lean();
  const saved = row?.value && typeof row.value === 'object' ? row.value : {};
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    paidLeavePerMonth: { ...DEFAULT_SETTINGS.paidLeavePerMonth, ...(saved.paidLeavePerMonth || {}) }
  };
}

export async function saveSettings(body = {}, updatedBy = '') {
  const current = await getSettings();
  const next = { ...current };
  if (body.workingWeekdays !== undefined) {
    const days = [...new Set((Array.isArray(body.workingWeekdays) ? body.workingWeekdays : []).map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
    if (!days.length) throw httpError(400, 'Pick at least one working day.');
    next.workingWeekdays = days;
  }
  if (body.holidays !== undefined) {
    const list = (Array.isArray(body.holidays) ? body.holidays : []).slice(0, 100).map((h) => ({ date: clean(h?.date, 10), name: clean(h?.name, 60) }));
    if (list.some((h) => !DAY.test(h.date))) throw httpError(400, 'Every holiday needs a valid date.');
    next.holidays = [...new Map(list.map((h) => [h.date, h])).values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  if (body.paidLeavePerMonth !== undefined) {
    const out = { ...current.paidLeavePerMonth };
    for (const t of EMPLOYMENT_TYPES) {
      if (body.paidLeavePerMonth?.[t] === undefined) continue;
      const n = Number(body.paidLeavePerMonth[t]);
      if (!Number.isFinite(n) || n < 0 || n > 31) throw httpError(400, 'Paid leave a month must be between 0 and 31 days.');
      out[t] = Math.round(n * 2) / 2;
    }
    next.paidLeavePerMonth = out;
  }
  if (body.missedCheckInUnpaid !== undefined) next.missedCheckInUnpaid = body.missedCheckInUnpaid === true;
  if (body.claimApprovalLimit !== undefined) {
    const n = Number(body.claimApprovalLimit);
    if (!Number.isFinite(n) || n < 0) throw httpError(400, 'Enter the claim limit in rupees.');
    next.claimApprovalLimit = Math.round(n);
  }
  if (body.signatoryName !== undefined) next.signatoryName = clean(body.signatoryName, 80);
  if (body.signatoryTitle !== undefined) next.signatoryTitle = clean(body.signatoryTitle, 80);
  if (body.companyAddress !== undefined) next.companyAddress = clean(body.companyAddress, 300);
  await AppSetting.findOneAndUpdate({ key: KEY }, { value: next, updatedBy }, { upsert: true });
  return next;
}

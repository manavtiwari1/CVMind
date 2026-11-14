import mongoose from 'mongoose';
import { AppSetting } from '../admin/models.js';
import { ErpExpense, ErpPayLine, ErpPayRun, EXPENSE_CATEGORIES } from './models.js';
import { CATEGORY_LABELS } from './expenses.js';
import { monthLabel } from './payroll.js';

// Profit & loss by calendar month (IST). Nothing is typed in here: it reads Payments, Payroll and Expenses.
//
// Revenue      = successful payments made in the month (refunded ones included, since they were received)
// Refunds      = payments refunded in the month
// Payroll      = base pay + bonus − deductions of that month's pay run; a draft run counts as an estimate
//                (reimbursements are left out: those claims are already counted under Expenses)
// Expenses     = recorded company expenses + approved or paid-back claims dated in the month
// Net          = Revenue − Refunds − Payroll − Expenses

const PaymentLog = () => mongoose.model('PaymentLog');
const SPENT = ['recorded', 'approved', 'reimbursed'];

const monthStart = (m) => new Date(`${m}-01T00:00:00+05:30`);
export const addMonths = (m, n) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const round = (n) => Math.round(Number(n || 0));
const PLAN_LABELS = { 'pass-3d': '3-day pass', 'pass-7d': '7-day pass', monthly: 'Monthly', 'half-yearly': '6 months', yearly: 'Yearly' };

// Every figure for a range of months [from, to], one row per month
export async function monthlyFigures(from, to) {
  const months = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) months.push(m);
  const start = monthStart(from);
  const end = monthStart(addMonths(to, 1));
  const [payments, refunds, runs, expenses] = await Promise.all([
    PaymentLog().find({ status: { $in: ['success', 'refunded'] }, createdAt: { $gte: start, $lt: end } }, { amount: 1, plan: 1, email: 1, createdAt: 1 }).lean(),
    PaymentLog().find({ status: 'refunded', refundedAt: { $gte: start, $lt: end } }, { amount: 1, refundedAt: 1 }).lean(),
    ErpPayRun.find({ month: { $gte: from, $lte: to } }).lean(),
    ErpExpense.find({ status: { $in: SPENT }, date: { $gte: `${from}-01`, $lte: `${to}-31` } }, { date: 1, amount: 1, category: 1 }).lean()
  ]);
  const lines = await ErpPayLine.find({ runId: { $in: runs.map((r) => r._id) } }, { month: 1, basePay: 1, bonus: 1, deductions: 1 }).lean();
  const istMonth = (d) => new Date(+new Date(d) + 5.5 * 3600 * 1000).toISOString().slice(0, 7);

  return months.map((month) => {
    const pays = payments.filter((p) => istMonth(p.createdAt) === month);
    const revenue = round(pays.reduce((s, p) => s + p.amount, 0));
    const refunded = round(refunds.filter((p) => istMonth(p.refundedAt) === month).reduce((s, p) => s + p.amount, 0));
    const run = runs.find((r) => r.month === month);
    const payroll = run ? round(lines.filter((l) => l.month === month).reduce((s, l) => s + l.basePay + (l.bonus || 0) - (l.deductions || 0), 0)) : 0;
    const exp = expenses.filter((e) => e.date.slice(0, 7) === month);
    const byCategory = EXPENSE_CATEGORIES.map((c) => ({ category: c, label: CATEGORY_LABELS[c], amount: round(exp.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0)) })).filter((c) => c.amount > 0);
    const expenseTotal = round(byCategory.reduce((s, c) => s + c.amount, 0));
    const byPlan = Object.entries(pays.reduce((acc, p) => ({ ...acc, [p.plan || 'other']: (acc[p.plan || 'other'] || 0) + p.amount }), {}))
      .map(([plan, amount]) => ({ plan, label: PLAN_LABELS[plan] || plan || 'Other', amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount);
    const payingUsers = new Set(pays.map((p) => p.email)).size;
    const aiCost = byCategory.find((c) => c.category === 'ai_apis')?.amount || 0;
    const costs = payroll + expenseTotal;
    return {
      month,
      label: monthLabel(month),
      revenue,
      refunds: refunded,
      netRevenue: revenue - refunded,
      payroll,
      payrollStatus: run ? run.status : 'none',
      expenses: expenseTotal,
      costs,
      net: revenue - refunded - costs,
      byCategory,
      byPlan,
      payments: pays.length,
      payingUsers,
      revenuePerPayingUser: payingUsers ? round((revenue - refunded) / payingUsers) : 0,
      aiCostPerPayingUser: payingUsers ? round(aiCost / payingUsers) : 0
    };
  });
}

// Bank balance typed in by leadership once a month, for the runway figure
const CASH_KEY = 'erp.cashBalance';
export async function cashBalances() {
  const row = await AppSetting.findOne({ key: CASH_KEY }).lean();
  return row?.value && typeof row.value === 'object' ? row.value : {};
}
export async function setCashBalance(month, amount, by) {
  const all = await cashBalances();
  if (amount === null) delete all[month];
  else all[month] = { amount: round(amount), by, at: new Date().toISOString() };
  await AppSetting.findOneAndUpdate({ key: CASH_KEY }, { value: all, updatedBy: by }, { upsert: true });
  return all;
}

// India's financial year: April to March. "FY 2026-27" = Apr 2026 – Mar 2027.
export const fiscalYearOf = (month) => {
  const [y, m] = month.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return { from: `${start}-04`, to: `${start + 1}-03`, label: `FY ${start}-${String((start + 1) % 100).padStart(2, '0')}` };
};

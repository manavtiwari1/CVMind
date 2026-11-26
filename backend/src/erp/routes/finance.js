import express from 'express';
import { audit } from '../../admin/audit.js';
import { requireAdmin } from '../../admin/auth.js';
import { clean, handle, httpError } from '../../admin/util.js';
import { istDay } from '../../team/notify.js';
import { addMonths, cashBalances, fiscalYearOf, monthlyFigures, setCashBalance } from '../finance.js';
import { isLeadership, MONTH } from '../payroll.js';

// Admin panel → ERP → Finance (profit & loss). finance.view only: leadership and the owner by default.
const router = express.Router();
const view = requireAdmin('finance.view');

const sum = (rows, key) => rows.reduce((s, r) => s + r[key], 0);

router.get('/finance', view, handle(async (req, res) => {
  const month = MONTH.test(clean(req.query.month, 7)) ? req.query.month : istDay().slice(0, 7);
  const trend = await monthlyFigures(addMonths(month, -11), month);
  const current = trend.at(-1);
  const previous = trend.at(-2);
  const fy = fiscalYearOf(month);
  const fyRows = await monthlyFigures(fy.from, fy.to < month ? fy.to : month);
  const cash = await cashBalances();
  // Runway: the latest balance entered (up to this month) ÷ average costs of the last 3 months with costs
  const balanceMonth = Object.keys(cash).filter((m) => m <= month).sort().at(-1) || null;
  const recentCosts = trend.filter((t) => t.costs > 0).slice(-3);
  const avgCosts = recentCosts.length ? sum(recentCosts, 'costs') / recentCosts.length : 0;
  const balance = balanceMonth ? cash[balanceMonth].amount : null;
  res.json({
    success: true,
    data: {
      month,
      current,
      previous,
      trend: trend.map(({ month: m, label, revenue, refunds, costs, payroll, expenses, net }) => ({ month: m, label, revenue, refunds, costs, payroll, expenses, net })),
      fiscalYear: {
        label: fy.label,
        throughMonth: fyRows.at(-1)?.month || month,
        revenue: sum(fyRows, 'revenue'),
        refunds: sum(fyRows, 'refunds'),
        payroll: sum(fyRows, 'payroll'),
        expenses: sum(fyRows, 'expenses'),
        net: sum(fyRows, 'net')
      },
      cash: {
        balance,
        balanceMonth,
        avgMonthlyCosts: Math.round(avgCosts),
        runwayMonths: balance !== null && avgCosts > 0 ? Math.round((balance / avgCosts) * 10) / 10 : null
      },
      canEditCash: isLeadership(req.admin)
    }
  });
}));

router.put('/finance/cash', view, handle(async (req, res) => {
  if (!isLeadership(req.admin)) throw httpError(403, 'Only the CEO, CTO, CMO or owner can enter the bank balance.');
  const month = clean(req.body?.month, 7);
  if (!MONTH.test(month)) throw httpError(400, 'Pick a month.');
  const amount = req.body?.amount === null ? null : Number(req.body?.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw httpError(400, 'Enter the bank balance in rupees.');
  await setCashBalance(month, amount, req.admin.username || '');
  await audit(req, 'finance.cash_balance_set', { targetType: 'finance', targetLabel: month });
  res.json({ success: true });
}));

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Month-by-month P&L for the CA or investors
router.get('/finance/export', view, handle(async (req, res) => {
  const to = MONTH.test(clean(req.query.to, 7)) ? req.query.to : istDay().slice(0, 7);
  const from = MONTH.test(clean(req.query.from, 7)) ? req.query.from : addMonths(to, -11);
  if (from > to) throw httpError(400, 'The start month is after the end month.');
  const rows = await monthlyFigures(from, to);
  const lines = [['Month', 'Revenue', 'Refunds', 'Net revenue', 'Payroll', 'Expenses', 'Total costs', 'Net profit/loss', 'Paying users', 'Payroll status']];
  for (const r of rows) lines.push([r.month, r.revenue, r.refunds, r.netRevenue, r.payroll, r.expenses, r.costs, r.net, r.payingUsers, r.payrollStatus]);
  lines.push(['Total', sum(rows, 'revenue'), sum(rows, 'refunds'), sum(rows, 'netRevenue'), sum(rows, 'payroll'), sum(rows, 'expenses'), sum(rows, 'costs'), sum(rows, 'net'), '', '']);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="profit-and-loss-${from}-to-${to}.csv"`);
  res.send(lines.map((r) => r.map(csvCell).join(',')).join('\n') + '\n');
}));

export default router;

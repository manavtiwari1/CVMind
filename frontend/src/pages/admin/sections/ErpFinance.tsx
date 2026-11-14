import { useState } from 'react';
import type { FormEvent } from 'react';
import { FileDown, Pencil, Table2 } from 'lucide-react';
import { api, downloadFile } from '../api';
import { useAction, useApi } from '../hooks';
import { money } from '../format';
import { BarList, Card, ErrorState, Modal, Notice, PageHeader, Spinner, StatCard } from '../ui';
import { todayIso } from '../erp';

// ERP → Finance: profit & loss by month. Reads Payments, Payroll and Expenses; nothing is typed in here
// except the bank balance used for runway.

interface Month {
  month: string; label: string; revenue: number; refunds: number; netRevenue: number; payroll: number; payrollStatus: string; expenses: number; costs: number; net: number;
  byCategory: Array<{ category: string; label: string; amount: number }>; byPlan: Array<{ label: string; amount: number }>;
  payments: number; payingUsers: number; revenuePerPayingUser: number; aiCostPerPayingUser: number;
}
interface TrendRow { month: string; label: string; revenue: number; refunds: number; costs: number; payroll: number; expenses: number; net: number }
interface Finance {
  month: string; current: Month; previous: Month; trend: TrendRow[];
  fiscalYear: { label: string; throughMonth: string; revenue: number; refunds: number; payroll: number; expenses: number; net: number };
  cash: { balance: number | null; balanceMonth: string | null; avgMonthlyCosts: number; runwayMonths: number | null };
  canEditCash: boolean;
}

// Validated pair (dataviz validator, light surface): revenue blue, costs amber
const C = { revenue: '#2563eb', cost: '#d97706', profit: '#1a8a63', loss: '#dc2626', grid: '#e8ebef', axis: '#9ca3af', ink: '#111827', soft: '#6b7280' };
const short = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e7 ? `${(a / 1e7).toFixed(1)}Cr` : a >= 1e5 ? `${(a / 1e5).toFixed(1)}L` : a >= 1e3 ? `${(a / 1e3).toFixed(1)}k` : String(Math.round(a));
  return `${n < 0 ? '−' : ''}₹${s}`;
};
const shortMonth = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' });

export default function ErpFinance() {
  const { busy, run } = useAction();
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const { data, error, loading, reload } = useApi<{ data: Finance }>('/erp/finance', { month });
  const [editingCash, setEditingCash] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const f = data?.data;
  const m = f?.current;

  if (error && !f) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Profit & loss"
        description="Revenue from Payments, minus refunds, payroll and expenses. Months are calendar months in IST."
        actions={<span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="month" className="ad-input" style={{ maxWidth: 170 }} value={month} max={todayIso().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
          <button type="button" className="ad-btn" disabled={busy === 'csv'} onClick={() => run('csv', () => downloadFile(`/erp/finance/export?to=${month}`, `profit-and-loss-${month}.csv`))}><FileDown size={14} /> 12-month CSV</button>
        </span>}
      />
      {!f || !m ? <div className="ad-empty"><Spinner size={20} /></div> : (
        <>
          {m.payrollStatus === 'draft' && <Notice tone="amber">{m.label}'s pay run is still a draft, so payroll here is an estimate.</Notice>}
          <div className="ad-grid cols-4" style={{ marginBottom: 16 }}>
            <StatCard label={`Revenue · ${m.label}`} value={money(m.netRevenue)} tone="blue" loading={loading} foot={<span className="muted">{m.refunds ? `${money(m.revenue)} received, ${money(m.refunds)} refunded` : `${m.payments} payments`}</span>} />
            <StatCard label="Costs" value={money(m.costs)} tone="amber" loading={loading} foot={<span className="muted">Payroll {money(m.payroll)} · expenses {money(m.expenses)}</span>} />
            <StatCard label={m.net >= 0 ? 'Profit' : 'Loss'} value={<span style={{ color: m.net >= 0 ? C.profit : C.loss }}>{m.net >= 0 ? '▲ ' : '▼ '}{money(Math.abs(m.net))}</span>} tone={m.net >= 0 ? 'green' : 'red'} loading={loading} foot={<span className="muted">Last month {money(f.previous.net)}</span>} />
            <StatCard
              label="Cash runway"
              value={f.cash.runwayMonths !== null ? `${f.cash.runwayMonths} months` : '—'}
              tone="purple"
              foot={<span className="muted">{f.cash.balance !== null ? `${money(f.cash.balance)} in the bank (${f.cash.balanceMonth})` : 'Enter the bank balance'}{f.canEditCash && <> · <button type="button" className="ad-link" onClick={() => setEditingCash(true)}><Pencil size={11} /> Edit</button></>}</span>}
            />
          </div>

          <div className="ad-grid cols-2" style={{ marginBottom: 16 }}>
            <Card title={`How ${m.label} got to ${m.net >= 0 ? 'a profit' : 'a loss'} of ${money(Math.abs(m.net))}`} description="From money received to what was left. Hover a bar for its amount.">
              <Bridge month={m} />
            </Card>
            <Card
              title="Last 12 months"
              description="Revenue and costs each month, on one scale; profit or loss below."
              actions={<button type="button" className="ad-btn sm ghost" onClick={() => setShowTable((v) => !v)}><Table2 size={13} /> {showTable ? 'Chart' : 'Table'}</button>}
            >
              {showTable ? <TrendTable rows={f.trend} /> : <Trend rows={f.trend} />}
            </Card>
          </div>

          <div className="ad-grid cols-3">
            <Card title="Revenue by plan" description={`${m.payingUsers} paying users`}>
              {m.byPlan.length ? <BarList items={m.byPlan.map((p) => ({ label: p.label, value: p.amount, hint: money(p.amount) }))} /> : <p className="muted">No payments this month.</p>}
            </Card>
            <Card title="Costs by category" description="Expenses, plus payroll">
              <BarList tone="purple" items={[...(m.payroll ? [{ label: 'Payroll', value: m.payroll, hint: money(m.payroll) }] : []), ...m.byCategory.map((c) => {
                const before = f.previous.byCategory.find((p) => p.category === c.category)?.amount || 0;
                return { label: c.label, value: c.amount, hint: `${money(c.amount)}${before ? ` (${c.amount >= before ? '+' : '−'}${money(Math.abs(c.amount - before))} vs last month)` : ''}` };
              })]} />
              {!m.costs && <p className="muted">No costs recorded this month.</p>}
            </Card>
            <Card title="Per paying user" description={`${f.fiscalYear.label} so far: ${f.fiscalYear.net >= 0 ? 'profit' : 'loss'} of ${money(Math.abs(f.fiscalYear.net))}`}>
              <dl className="ad-kv">
                <dt>Revenue per paying user</dt><dd>{money(m.revenuePerPayingUser)}</dd>
                <dt>AI API cost per paying user</dt><dd>{money(m.aiCostPerPayingUser)}</dd>
                <dt>{f.fiscalYear.label} revenue</dt><dd>{money(f.fiscalYear.revenue - f.fiscalYear.refunds)}</dd>
                <dt>{f.fiscalYear.label} costs</dt><dd>{money(f.fiscalYear.payroll + f.fiscalYear.expenses)}</dd>
              </dl>
            </Card>
          </div>
        </>
      )}
      {editingCash && f && <CashForm month={month} current={f.cash.balanceMonth === month ? f.cash.balance : null} onClose={() => setEditingCash(false)} onDone={() => { setEditingCash(false); reload(); }} />}
    </>
  );
}

// Waterfall: revenue up, each cost down, net at the end. One scale from zero.
function Bridge({ month }: { month: Month }) {
  const [hover, setHover] = useState<number | null>(null);
  const steps: Array<{ label: string; amount: number; kind: 'total' | 'down' }> = [
    { label: 'Revenue', amount: month.revenue, kind: 'total' },
    ...(month.refunds ? [{ label: 'Refunds', amount: month.refunds, kind: 'down' as const }] : []),
    ...(month.payroll ? [{ label: 'Payroll', amount: month.payroll, kind: 'down' as const }] : []),
    ...month.byCategory.map((c) => ({ label: c.label, amount: c.amount, kind: 'down' as const }))
  ];
  let level = 0;
  const bars = steps.map((s) => {
    const from = s.kind === 'total' ? 0 : level;
    const to = s.kind === 'total' ? s.amount : level - s.amount;
    level = to;
    return { ...s, from, to };
  });
  bars.push({ label: month.net >= 0 ? 'Profit' : 'Loss', amount: month.net, kind: 'total', from: 0, to: month.net });
  const values = bars.flatMap((b) => [b.from, b.to, 0]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const W = 560, H = 260, left = 8, right = 8, top = 16, bottom = 56;
  const slot = (W - left - right) / bars.length;
  const y = (v: number) => top + (max - v) / (max - min) * (H - top - bottom);
  const bw = Math.min(44, slot - 10);

  if (!month.revenue && !month.costs) return <p className="muted">Nothing to show for this month yet.</p>;
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Revenue ${money(month.revenue)}, costs ${money(month.costs + month.refunds)}, ${month.net >= 0 ? 'profit' : 'loss'} ${money(Math.abs(month.net))}`}>
        <line x1={left} x2={W - right} y1={y(0)} y2={y(0)} stroke={C.axis} strokeWidth={1} />
        {bars.map((b, i) => {
          const x = left + i * slot + (slot - bw) / 2;
          const y0 = y(Math.max(b.from, b.to));
          const h = Math.max(2, Math.abs(y(b.from) - y(b.to)));
          const last = i === bars.length - 1;
          const color = last ? (b.amount >= 0 ? C.profit : C.loss) : b.kind === 'total' ? C.revenue : C.cost;
          return (
            <g key={b.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={left + i * slot} y={top} width={slot} height={H - top - bottom} fill="transparent" />
              <rect x={x} y={y0} width={bw} height={h} rx={4} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />
              {i < bars.length - 1 && <line x1={x + bw} x2={x + slot} y1={y(b.to)} y2={y(b.to)} stroke={C.axis} strokeDasharray="3 3" />}
              {(b.kind === 'total') && <text x={x + bw / 2} y={y0 - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.ink}>{short(b.kind === 'total' && last ? b.amount : b.amount)}</text>}
              <text x={x + bw / 2} y={H - bottom + 16} textAnchor="middle" fontSize={10.5} fill={C.soft}>{b.label.length > 12 ? `${b.label.slice(0, 11)}…` : b.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="ad-chart-tip" style={{ position: 'absolute', top: 0, left: `${Math.min(70, (hover / bars.length) * 100)}%`, background: '#fff', border: '1px solid #e8ebef', borderRadius: 8, padding: '6px 10px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)', pointerEvents: 'none' }}>
          <strong>{bars[hover].label}</strong>: {hover === bars.length - 1 ? (bars[hover].amount >= 0 ? 'profit ' : 'loss ') : bars[hover].kind === 'down' ? '− ' : ''}{money(Math.abs(bars[hover].amount))}
        </div>
      )}
    </div>
  );
}

// Revenue and costs as two lines on one axis, with a profit/loss strip under them
function Trend({ rows }: { rows: TrendRow[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 240, left = 44, right = 54, top = 12, bottom = 22, strip = 46;
  const max = Math.max(1, ...rows.flatMap((r) => [r.revenue - r.refunds, r.costs]));
  const step = (W - left - right) / Math.max(1, rows.length - 1);
  const x = (i: number) => left + i * step;
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom - strip);
  const ticks = [0, max / 2, max];
  const line = (key: 'rev' | 'cost') => rows.map((r, i) => `${i ? 'L' : 'M'}${x(i)},${y(key === 'rev' ? r.revenue - r.refunds : r.costs)}`).join('');
  const netMax = Math.max(1, ...rows.map((r) => Math.abs(r.net)));
  const stripMid = H - bottom - strip / 2;
  const last = rows.length - 1;
  if (rows.every((r) => !r.revenue && !r.costs)) return <p className="muted">No revenue or costs in the last 12 months yet.</p>;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 14, fontSize: 12, marginBottom: 6 }} aria-hidden>
        <span><span style={{ display: 'inline-block', width: 14, height: 2, background: C.revenue, verticalAlign: 'middle', marginRight: 5 }} />Revenue</span>
        <span><span style={{ display: 'inline-block', width: 14, height: 2, background: C.cost, verticalAlign: 'middle', marginRight: 5 }} />Costs</span>
        <span className="muted">Bars: profit ▲ / loss ▼</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Revenue and costs over the last 12 months" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => <g key={t}><line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke={C.grid} /><text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill={C.soft}>{short(t)}</text></g>)}
        <path d={line('rev')} fill="none" stroke={C.revenue} strokeWidth={2} strokeLinejoin="round" />
        <path d={line('cost')} fill="none" stroke={C.cost} strokeWidth={2} strokeLinejoin="round" />
        <text x={x(last) + 6} y={y(rows[last].revenue - rows[last].refunds) + 4} fontSize={10.5} fill={C.ink}>Revenue</text>
        <text x={x(last) + 6} y={y(rows[last].costs) + (Math.abs(y(rows[last].costs) - y(rows[last].revenue - rows[last].refunds)) < 12 ? 14 : 4)} fontSize={10.5} fill={C.ink}>Costs</text>
        <line x1={left} x2={W - right} y1={stripMid} y2={stripMid} stroke={C.axis} />
        {rows.map((r, i) => {
          const h = Math.max(1, Math.abs(r.net) / netMax * (strip / 2 - 3));
          return <rect key={r.month} x={x(i) - 6} y={r.net >= 0 ? stripMid - h : stripMid} width={12} height={h} rx={2} fill={r.net >= 0 ? C.profit : C.loss} />;
        })}
        {rows.map((r, i) => (i % 2 === last % 2) && <text key={`m-${r.month}`} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill={C.soft}>{shortMonth(r.month)}</text>)}
        {hover !== null && <>
          <line x1={x(hover)} x2={x(hover)} y1={top} y2={H - bottom} stroke={C.axis} strokeDasharray="3 3" />
          <circle cx={x(hover)} cy={y(rows[hover].revenue - rows[hover].refunds)} r={4} fill={C.revenue} stroke="#fff" strokeWidth={2} />
          <circle cx={x(hover)} cy={y(rows[hover].costs)} r={4} fill={C.cost} stroke="#fff" strokeWidth={2} />
        </>}
        {rows.map((r, i) => <rect key={`h-${r.month}`} x={x(i) - step / 2} y={0} width={step} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />)}
      </svg>
      {hover !== null && (
        <div style={{ position: 'absolute', top: 24, left: `${Math.min(62, (hover / Math.max(1, last)) * 100)}%`, background: '#fff', border: '1px solid #e8ebef', borderRadius: 8, padding: '6px 10px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <strong>{rows[hover].label}</strong><br />
          Revenue {money(rows[hover].revenue - rows[hover].refunds)}<br />
          Costs {money(rows[hover].costs)}<br />
          {rows[hover].net >= 0 ? '▲ Profit' : '▼ Loss'} {money(Math.abs(rows[hover].net))}
        </div>
      )}
    </div>
  );
}

function TrendTable({ rows }: { rows: TrendRow[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="ad-table">
        <thead><tr><th>Month</th><th>Revenue</th><th>Payroll</th><th>Expenses</th><th>Profit / loss</th></tr></thead>
        <tbody>
          {[...rows].reverse().map((r) => (
            <tr key={r.month}><td>{r.label}</td><td>{money(r.revenue - r.refunds)}</td><td>{money(r.payroll)}</td><td>{money(r.expenses)}</td><td style={{ color: r.net >= 0 ? C.profit : C.loss }}>{r.net >= 0 ? '▲' : '▼'} {money(Math.abs(r.net))}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashForm({ month, current, onClose, onDone }: { month: string; current: number | null; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [amount, setAmount] = useState(current !== null ? String(current) : '');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('cash', () => api('/erp/finance/cash', { method: 'PUT', body: { month, amount: Number(amount) } }), 'Bank balance saved');
    if (ok !== undefined) onDone();
  };
  return (
    <Modal
      title="Bank balance"
      description="What CVMind's bank account held at the end of this month. Runway = this ÷ the average costs of the last 3 months."
      onClose={onClose}
      footer={<>
        <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="erp-cash" className="ad-btn primary" disabled={busy === 'cash'}>{busy === 'cash' && <Spinner size={14} />} Save</button>
      </>}
    >
      <form id="erp-cash" onSubmit={submit}>
        <div className="ad-field"><label htmlFor="cash-amt">Balance at the end of {month} (₹)</label><input id="cash-amt" type="number" min={0} className="ad-input" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus /></div>
      </form>
    </Modal>
  );
}

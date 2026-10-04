import { useState } from 'react';
import { CreditCard, Download, RotateCcw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, downloadExport } from '../api';
import type { Paged } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { count, dateTime, money } from '../format';
import { Card, ConfirmDialog, DataTable, Empty, Notice, PageHeader, Pagination, SearchInput, Select, Spinner, StatCard, StatusBadge } from '../ui';

interface Payment {
  id: string;
  email: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  status: string;
  plan: string;
  couponCode: string;
  discount: number;
  refundedAt: string | null;
  refundReason: string;
  createdAt: string;
}

interface Summary {
  months: Array<{ month: string; revenue: number; refunded: number; failed: number; count: number }>;
  byMethod: Array<{ method: string; amount: number; count: number }>;
  byPlan: Array<{ plan: string; amount: number; count: number }>;
  totals: Record<string, { amount: number; count: number }>;
  gatewaySimulated: boolean;
}

const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
const METHOD_LABELS: Record<string, string> = { card: 'Card', upi: 'UPI', paypal: 'PayPal' };

export default function Payments() {
  const { can, params } = useAdmin();
  const [q, setQ] = useState(params.q || '');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const filters = { q: search, status, method, from, to };
  const list = useApi<Paged<Payment> & { summary: Record<string, { amount: number; count: number; discount: number }>; methods: string[] }>('/payments', { ...filters, page, limit: 25 });
  const summary = useApi<{ data: Summary }>('/payments/summary');
  const { busy, run } = useAction();
  const [refunding, setRefunding] = useState<Payment | null>(null);
  const [exporting, setExporting] = useState(false);
  const s = summary.data?.data;
  const set = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  const success = s?.totals.success || { amount: 0, count: 0 };
  const refunded = s?.totals.refunded || { amount: 0, count: 0 };
  const failed = s?.totals.failed || { amount: 0, count: 0 };

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every transaction, with refunds and revenue by month."
        actions={can('reports.export') && (
          <button type="button" className="ad-btn" disabled={exporting} onClick={async () => {
            setExporting(true);
            try { await downloadExport('payments', filters); } finally { setExporting(false); }
          }}>{exporting ? <Spinner size={14} /> : <Download size={15} />} Export CSV</button>
        )}
      />

      {s?.gatewaySimulated && (
        <Notice tone="amber">
          <strong>Checkout is simulated.</strong> No payment gateway is connected yet, so these records come from the test checkout and "Refund" only marks a payment as refunded. Connect a real gateway before taking money.
        </Notice>
      )}

      <div className="ad-grid cols-3" style={{ marginTop: s?.gatewaySimulated ? 16 : 0 }}>
        <StatCard label="Revenue (all time)" icon={<CreditCard size={16} />} loading={!s} value={money(success.amount)} foot={`${count(success.count)} successful ${success.count === 1 ? 'payment' : 'payments'}`} />
        <StatCard label="Refunded" tone="amber" icon={<RotateCcw size={16} />} loading={!s} value={money(refunded.amount)} foot={`${count(refunded.count)} ${refunded.count === 1 ? 'refund' : 'refunds'}`} />
        <StatCard label="Failed payments" tone="red" icon={<CreditCard size={16} />} loading={!s} value={count(failed.count)} foot="All time" />
      </div>

      <div className="ad-grid wide-left">
        <Card title="Revenue by month" description="Last 12 months, successful payments">
          <div className="ad-chart sm">
            {s && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.months} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => `₹${count(v)}`} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="ad-recharts-tooltip">
                      <strong>{monthLabel(String(label))}</strong>
                      Revenue: {money(Number(payload[0].value))}<br />
                      Refunded: {money(Number(payload[0].payload.refunded))}
                    </div>
                  ) : null} />
                  <Bar dataKey="revenue" fill="#2dc08d" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card title="Breakdown" description="Successful payments">
          {s && (s.byMethod.length || s.byPlan.length) ? (
            <>
              <div className="ad-section-title">By method</div>
              <ul className="ad-list">
                {s.byMethod.map((m) => <li key={m.method}><span>{METHOD_LABELS[m.method] || m.method}</span><strong>{money(m.amount)} <span className="ad-muted" style={{ fontWeight: 400 }}>· {count(m.count)}</span></strong></li>)}
              </ul>
              <div className="ad-section-title">By plan</div>
              <ul className="ad-list">
                {s.byPlan.map((p) => <li key={p.plan}><span>{p.plan}</span><strong>{money(p.amount)} <span className="ad-muted" style={{ fontWeight: 400 }}>· {count(p.count)}</span></strong></li>)}
              </ul>
            </>
          ) : <Empty title={s ? 'No payments yet' : 'Loading…'} />}
        </Card>
      </div>

      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={set(setQ)} placeholder="Email or transaction ID" />
          <Select label="Status" value={status} onChange={set(setStatus)} options={[{ value: '', label: 'All statuses' }, { value: 'success', label: 'Successful' }, { value: 'refunded', label: 'Refunded' }, { value: 'failed', label: 'Failed' }]} />
          <Select label="Method" value={method} onChange={set(setMethod)} options={[{ value: '', label: 'All methods' }, ...(list.data?.methods || []).map((m) => ({ value: m, label: METHOD_LABELS[m] || m }))]} />
          <input className="ad-input" style={{ width: 'auto' }} type="date" value={from} onChange={(e) => set(setFrom)(e.target.value)} aria-label="From date" />
          <input className="ad-input" style={{ width: 'auto' }} type="date" value={to} onChange={(e) => set(setTo)(e.target.value)} aria-label="To date" />
        </div>
        <DataTable
          rows={list.data?.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(p) => p.id}
          empty={<Empty icon={<CreditCard size={20} />} title="No payments found" text={search || status || method || from || to ? 'Try different filters.' : 'Payments show up here once people buy a plan.'} />}
          columns={[
            { key: 'when', header: 'Date', render: (p) => <span className="muted">{dateTime(p.createdAt)}</span> },
            { key: 'email', header: 'Customer', render: (p) => <span className="ad-cell-title">{p.email}</span> },
            { key: 'tx', header: 'Transaction', render: (p) => <span className="ad-mono">{p.transactionId}</span> },
            { key: 'method', header: 'Method', render: (p) => METHOD_LABELS[p.paymentMethod] || p.paymentMethod },
            { key: 'coupon', header: 'Coupon', render: (p) => p.couponCode ? <span className="ad-mono">{p.couponCode} <span className="muted">−{money(p.discount)}</span></span> : <span className="muted">—</span> },
            { key: 'status', header: 'Status', render: (p) => <span title={p.refundReason ? `Refund reason: ${p.refundReason}` : undefined}><StatusBadge status={p.status} /></span> },
            { key: 'amount', header: 'Amount', className: 'num', render: (p) => <strong>{money(p.amount)}</strong> },
            { key: 'actions', header: '', className: 'actions', render: (p) => can('payments.manage') && p.status === 'success' && (
              <button type="button" className="ad-btn sm" onClick={() => setRefunding(p)}><RotateCcw size={13} /> Refund</button>
            ) }
          ]}
        />
        {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} />}
      </Card>

      {refunding && (
        <ConfirmDialog
          title={`Refund ${money(refunding.amount)} to ${refunding.email}?`}
          description={s?.gatewaySimulated ? 'The payment is marked as refunded. No money moves because the gateway is simulated.' : 'The payment is marked as refunded.'}
          confirmLabel="Mark as refunded"
          danger
          reason={{ label: 'Reason', placeholder: 'e.g. Charged twice', required: true }}
          busy={busy === 'refund'}
          onClose={() => setRefunding(null)}
          onConfirm={async (reason) => {
            const ok = await run('refund', () => api(`/payments/${refunding.id}/refund`, { method: 'POST', body: { reason } }), 'Payment marked as refunded');
            setRefunding(null);
            if (ok !== undefined) { list.reload(); summary.reload(); }
          }}
        />
      )}
    </>
  );
}

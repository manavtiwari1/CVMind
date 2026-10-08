import { useState } from 'react';
import { Download, FileText, Mail, ReceiptText } from 'lucide-react';
import { api, downloadFile } from '../api';
import type { Paged } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { count, date, dateTime, money } from '../format';
import { Card, DataTable, Empty, Notice, PageHeader, Pagination, SearchInput, Spinner, StatCard, StatusBadge } from '../ui';

interface Invoice {
  orderId: string;
  number: string;
  email: string;
  name: string | null;
  plan: string;
  listPrice: number;
  discount: number;
  couponCode: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  sentAt: string | null;
  refunded: boolean;
  refundedAt: string | null;
}

type InvoiceList = Paged<Invoice> & {
  emailEnabled: boolean;
  totals: { amount: number; count: number };
  thisMonth: { amount: number; count: number };
};

const METHOD_LABELS: Record<string, string> = { upi: 'UPI', credit_card: 'Credit card', debit_card: 'Debit card', net_banking: 'Net banking', wallet: 'Wallet' };

// Every invoice emailed after a Cashfree payment, with the PDF and a resend
export default function Invoices() {
  const { can } = useAdmin();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const list = useApi<InvoiceList>('/invoices', { q: search, from, to, page, limit: 25 });
  const { busy, run } = useAction();
  const [downloading, setDownloading] = useState('');
  const d = list.data;
  const set = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  const download = async (inv: Invoice) => {
    setDownloading(inv.orderId);
    try {
      await run(`pdf-${inv.orderId}`, () => downloadFile(`/invoices/${inv.orderId}/pdf`, `CVMind-Invoice-${inv.number || inv.orderId}.pdf`));
      // An older order gets its invoice number the first time its PDF is made
      if (!inv.number) list.reload();
    } finally {
      setDownloading('');
    }
  };

  const resend = async (inv: Invoice) => {
    const ok = await run(`send-${inv.orderId}`, () => api(`/invoices/${inv.orderId}/send`, { method: 'POST' }), `Invoice emailed to ${inv.email}`);
    if (ok !== undefined) list.reload();
  };

  return (
    <>
      <PageHeader title="Invoices" description="Every bill emailed to a customer after a Cashfree payment. Download the PDF or send it again." />

      {d && !d.emailEnabled && (
        <Notice tone="amber">Email isn't configured on this server (RESEND_API_KEY), so new invoices aren't being emailed. You can still download them here.</Notice>
      )}

      <div className="ad-grid cols-3" style={{ marginTop: d && !d.emailEnabled ? 16 : 0 }}>
        <StatCard label="Invoiced this month" icon={<ReceiptText size={16} />} loading={!d} value={money(d?.thisMonth.amount)} foot={`${count(d?.thisMonth.count)} ${d?.thisMonth.count === 1 ? 'invoice' : 'invoices'}`} />
        <StatCard label={search || from || to ? 'Matching invoices' : 'Invoiced (all time)'} icon={<FileText size={16} />} loading={!d} value={money(d?.totals.amount)} foot={`${count(d?.totals.count)} ${d?.totals.count === 1 ? 'invoice' : 'invoices'}`} />
        <StatCard label="Not emailed yet" tone="amber" icon={<Mail size={16} />} loading={!d} value={count(d?.data.filter((i) => !i.sentAt).length)} foot="On this page" />
      </div>

      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={set(setQ)} placeholder="Email, invoice no. or order ID" />
          <input className="ad-input" style={{ width: 'auto' }} type="date" value={from} onChange={(e) => set(setFrom)(e.target.value)} aria-label="Paid from" />
          <input className="ad-input" style={{ width: 'auto' }} type="date" value={to} onChange={(e) => set(setTo)(e.target.value)} aria-label="Paid to" />
        </div>
        <DataTable
          rows={d?.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(i) => i.orderId}
          empty={<Empty icon={<ReceiptText size={20} />} title="No invoices found" text={search || from || to ? 'Try different filters.' : 'Invoices appear here once someone pays for Pro.'} />}
          columns={[
            { key: 'no', header: 'Invoice', render: (i) => <><div className={i.number ? 'ad-mono' : 'muted'}>{i.number || 'Not numbered'}</div><div className="ad-cell-sub">Paid {dateTime(i.paidAt)}</div></> },
            { key: 'who', header: 'Customer', render: (i) => <><div className="ad-cell-title">{i.name || i.email}</div>{i.name && <div className="ad-cell-sub">{i.email}</div>}</> },
            { key: 'plan', header: 'Plan', render: (i) => <><div>{i.plan}</div>{i.couponCode && <div className="ad-cell-sub">{i.couponCode} −{money(i.discount)}</div>}</> },
            { key: 'email', header: 'Emailed', render: (i) => i.sentAt ? <span className="muted">{date(i.sentAt)}</span> : <StatusBadge status="pending" label="Not sent" /> },
            { key: 'status', header: 'Status', render: (i) => i.refunded ? <StatusBadge status="refunded" /> : <StatusBadge status="success" label="Paid" /> },
            { key: 'amount', header: 'Amount', className: 'num', render: (i) => <><strong>{money(i.amount)}</strong><div className="ad-cell-sub">{METHOD_LABELS[i.paymentMethod] || i.paymentMethod || ''}</div></> },
            { key: 'actions', header: '', className: 'actions', render: (i) => (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button type="button" className="ad-btn sm" disabled={downloading === i.orderId} onClick={() => download(i)} aria-label={`Download invoice ${i.number || i.orderId}`}>
                  {downloading === i.orderId ? <Spinner size={13} /> : <Download size={13} />} PDF
                </button>
                {can('payments.manage') && d?.emailEnabled && (
                  <button type="button" className="ad-btn sm" disabled={busy === `send-${i.orderId}`} onClick={() => resend(i)}>
                    {busy === `send-${i.orderId}` ? <Spinner size={13} /> : <Mail size={13} />} {i.sentAt ? 'Resend' : 'Send'}
                  </button>
                )}
              </span>
            ) }
          ]}
        />
        {d && <Pagination page={d.page} limit={d.limit} total={d.total} onPage={setPage} />}
      </Card>
    </>
  );
}

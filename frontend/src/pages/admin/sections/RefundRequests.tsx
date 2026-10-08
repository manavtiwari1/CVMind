import { useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi } from '../hooks';
import { date, dateTime, money } from '../format';
import { Card, DataTable, Empty, Modal, Notice, PageHeader, Person, StatusBadge, Tabs } from '../ui';

interface RefundRequest {
  id: string;
  email: string;
  name: string | null;
  orderId: string;
  plan: string;
  planLabel: string;
  amount: number;
  category: string;
  categoryLabel: string;
  details: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  adminNote: string;
  decidedBy: string;
  decidedAt: string | null;
  createdAt: string;
  proFrom: string | null;
  proUntil: string | null;
  proActive: boolean;
}

type Filter = 'pending' | 'approved' | 'rejected' | '';

// Monthly-plan cancellations sent from Account → Billing. Payments are non-refundable, so nothing is
// refunded until someone here approves a request.
export default function RefundRequests() {
  const { can, refreshBadges } = useAdmin();
  const [filter, setFilter] = useState<Filter>('pending');
  const list = useApi<{ data: RefundRequest[]; counts: Record<'pending' | 'approved' | 'rejected', number> }>('/refund-requests', { status: filter });
  const [open, setOpen] = useState<RefundRequest | null>(null);
  const counts = list.data?.counts;

  return (
    <>
      <PageHeader
        title="Refund requests"
        description="Customers on a Monthly plan who asked to cancel and get their money back. Nothing is refunded until you approve a request."
      />
      <Notice tone="amber">
        Payments are non-refundable. Approve only genuine requests, such as a double charge or a Pro feature that doesn't work for the customer.
        Approving refunds the payment through Cashfree, ends the Pro time from that payment and emails the customer.
      </Notice>

      <Card bodyClass={false}>
        <div style={{ padding: '12px 16px 0' }}>
          <Tabs<Filter>
            tabs={[
              { id: 'pending', label: 'Waiting', count: counts?.pending },
              { id: 'approved', label: 'Approved', count: counts?.approved },
              { id: 'rejected', label: 'Rejected', count: counts?.rejected },
              { id: '', label: 'All' }
            ]}
            active={filter}
            onChange={setFilter}
          />
        </div>
        <DataTable
          rows={list.data?.data}
          rowKey={(r) => r.id}
          error={list.error}
          onRetry={list.reload}
          onRowClick={setOpen}
          empty={<Empty icon={<ReceiptText size={20} />} title={filter === 'pending' ? 'No requests waiting' : 'No requests here'} text="Requests appear here when a customer cancels a Monthly plan from their Billing page." />}
          columns={[
            { key: 'who', header: 'Customer', render: (r) => <Person name={r.name || undefined} email={r.email} /> },
            { key: 'plan', header: 'Payment', render: (r) => <><div className="ad-cell-title">{money(r.amount)}</div><div className="ad-cell-sub">{r.planLabel}</div></> },
            { key: 'reason', header: 'Reason', render: (r) => <><div className="ad-cell-title">{r.categoryLabel}</div><div className="ad-cell-sub">{r.details.length > 70 ? `${r.details.slice(0, 70)}…` : r.details}</div></> },
            { key: 'pro', header: 'Pro', render: (r) => r.proActive && r.proUntil ? `Until ${date(r.proUntil)}` : <span className="ad-muted">Ended</span> },
            { key: 'when', header: 'Asked', render: (r) => dateTime(r.createdAt) },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status === 'processing' ? 'pending' : r.status} label={r.status === 'pending' || r.status === 'processing' ? 'Waiting' : undefined} /> },
            { key: 'open', header: '', render: (r) => <button type="button" className="ad-btn sm" onClick={(e) => { e.stopPropagation(); setOpen(r); }}>{r.status === 'pending' && can('payments.manage') ? 'Review' : 'View'}</button> }
          ]}
        />
      </Card>

      {open && (
        <ReviewDialog
          request={open}
          canDecide={can('payments.manage') && open.status === 'pending'}
          onClose={() => setOpen(null)}
          onDone={() => { setOpen(null); list.reload(); refreshBadges(); }}
        />
      )}
    </>
  );
}

function ReviewDialog({ request: r, canDecide, onClose, onDone }: { request: RefundRequest; canDecide: boolean; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const approve = async () => {
    const ok = await run('approve', () => api(`/refund-requests/${r.id}/approve`, { method: 'POST', body: { note } }), `Refund of ${money(r.amount)} started`);
    if (ok !== undefined) onDone();
  };
  const reject = async () => {
    const ok = await run('reject', () => api(`/refund-requests/${r.id}/reject`, { method: 'POST', body: { note } }), 'Request rejected');
    if (ok !== undefined) onDone();
  };

  return (
    <Modal
      wide
      title={`Refund request from ${r.name || r.email}`}
      description={`${r.planLabel} plan · ${money(r.amount)} · asked ${dateTime(r.createdAt)}`}
      onClose={onClose}
      footer={canDecide ? (
        rejecting ? (
          <>
            <button type="button" className="ad-btn ghost" onClick={() => setRejecting(false)} disabled={!!busy}>Back</button>
            <button type="button" className="ad-btn danger" onClick={reject} disabled={!note.trim() || !!busy}>Reject and email the customer</button>
          </>
        ) : (
          <>
            <button type="button" className="ad-btn danger-outline" onClick={() => setRejecting(true)} disabled={!!busy}>Reject</button>
            <button type="button" className="ad-btn primary" onClick={approve} disabled={!!busy}>{busy === 'approve' ? 'Refunding…' : `Approve and refund ${money(r.amount)}`}</button>
          </>
        )
      ) : <button type="button" className="ad-btn" onClick={onClose}>Close</button>}
    >
      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px', margin: 0 }}>
        <dt className="ad-muted">Customer</dt><dd style={{ margin: 0 }}>{r.name ? `${r.name} · ${r.email}` : r.email}</dd>
        <dt className="ad-muted">Order</dt><dd style={{ margin: 0 }}><code>{r.orderId}</code></dd>
        <dt className="ad-muted">Pro</dt><dd style={{ margin: 0 }}>{r.proFrom ? `${date(r.proFrom)} to ${date(r.proUntil)}` : '—'}{r.proActive ? '' : ' (ended)'}</dd>
        <dt className="ad-muted">Reason</dt><dd style={{ margin: 0 }}>{r.categoryLabel}</dd>
        <dt className="ad-muted">Details</dt><dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.details}</dd>
        {r.status !== 'pending' && r.status !== 'processing' && (
          <>
            <dt className="ad-muted">Decision</dt>
            <dd style={{ margin: 0 }}>
              <StatusBadge status={r.status} /> {r.decidedBy ? `by ${r.decidedBy}` : ''} {r.decidedAt ? `on ${dateTime(r.decidedAt)}` : ''}
              {r.adminNote && <div className="ad-cell-sub" style={{ marginTop: 4 }}>{r.adminNote}</div>}
            </dd>
          </>
        )}
      </dl>

      {canDecide && (
        <div style={{ marginTop: 16 }}>
          <label className="ad-label" htmlFor="rr-note">{rejecting ? 'Why it is rejected (sent to the customer)' : 'Note (optional, kept in the audit log)'}</label>
          <textarea
            id="rr-note"
            className="ad-textarea"
            rows={3}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={rejecting ? 'e.g. We checked your account and the PDF download works; you used Pro on 12 days.' : 'e.g. Confirmed the double charge in Cashfree.'}
          />
        </div>
      )}
    </Modal>
  );
}

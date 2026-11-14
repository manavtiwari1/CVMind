import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, FileDown, Paperclip, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react';
import { api, downloadFile } from '../api';
import { useAction, useAdmin, useApi } from '../hooks';
import { money } from '../format';
import { Badge, BarList, Card, ConfirmDialog, DataTable, Empty, Modal, PageHeader, Segment, Spinner, StatCard } from '../ui';
import type { Tone } from '../ui';
import { day, todayIso, uploadReceipt } from '../erp';

// ERP → Expenses: company spending (with receipts, optionally repeating) and member claims with their approvals.

interface Expense {
  id: string; kind: 'company' | 'claim'; date: string; amount: number; category: string; categoryLabel: string; paidTo: string; description: string;
  paymentMode: string; reference: string; hasReceipt: boolean; status: string; submittedByName: string; managerName: string;
  approvals: Array<{ stage: string; byName: string }>; declinedReason: string; reimbursedVia: string; reimbursedOn: string; recurring: string; nextDueOn: string;
}
interface ListResponse { data: Expense[]; total: number; byCategory: Array<{ label: string; amount: number }>; counts: { pending: number; toReimburse: number; drafts: number }; categories: Array<{ value: string; label: string }> }

const STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Draft (repeat)', tone: 'amber' },
  recorded: { label: 'Recorded', tone: 'gray' },
  pending_manager: { label: 'With manager', tone: 'blue' },
  pending_hr: { label: 'Needs HR', tone: 'amber' },
  pending_leadership: { label: 'Needs leadership', tone: 'amber' },
  approved: { label: 'Approved · to pay back', tone: 'purple' },
  reimbursed: { label: 'Paid back', tone: 'green' },
  declined: { label: 'Declined', tone: 'red' }
};
type Filter = 'all' | 'company' | 'claim' | 'pending' | 'approved' | 'draft';

export default function ErpExpenses() {
  const { can } = useAdmin();
  const { busy, run } = useAction();
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [filter, setFilter] = useState<Filter>('all');
  const query = { month: ['pending', 'approved', 'draft'].includes(filter) ? '' : month, kind: filter === 'company' || filter === 'claim' ? filter : '', status: ['pending', 'approved', 'draft'].includes(filter) ? filter : '' };
  const { data, error, loading, reload } = useApi<ListResponse>('/erp/expenses', query);
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [deciding, setDeciding] = useState<{ row: Expense; approve: boolean } | null>(null);
  const [reimbursing, setReimbursing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const manage = can('hr.manage');

  const openReceipt = async (e: Expense) => {
    const res = await run(`r-${e.id}`, () => api<{ url: string }>(`/erp/expenses/${e.id}/receipt`));
    if (res?.url) window.open(res.url, '_blank', 'noopener');
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Everything CVMind spends: servers, ads, tools and claims from the team. Claims go to the member's manager first, then leadership if they're above the limit in ERP settings."
        actions={<span style={{ display: 'inline-flex', gap: 8 }}>
          <button type="button" className="ad-btn" disabled={busy === 'csv'} onClick={() => run('csv', () => downloadFile(`/erp/expenses-export?month=${month}`, `expenses-${month}.csv`))}><FileDown size={14} /> CSV</button>
          {manage && <button type="button" className="ad-btn primary" onClick={() => setEditing('new')}><Plus size={15} /> Add expense</button>}
        </span>}
      />
      <div className="ad-grid cols-4" style={{ marginBottom: 16 }}>
        <StatCard label="Spent in the month" value={money(data?.total)} loading={loading && !data} />
        <StatCard label="Claims needing a decision" value={data?.counts.pending ?? 0} tone="amber" />
        <StatCard label="Approved, to pay back" value={data?.counts.toReimburse ?? 0} tone="purple" />
        <StatCard label="Repeat drafts to confirm" value={data?.counts.drafts ?? 0} tone="blue" />
      </div>
      <div className="ad-grid wide-left">
        <Card bodyClass={false}>
          <div className="ad-toolbar">
            <input type="month" className="ad-input" style={{ maxWidth: 170 }} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month" />
            <Segment<Filter> value={filter} onChange={setFilter} options={[
              { value: 'all', label: 'All' }, { value: 'company', label: 'Company' }, { value: 'claim', label: 'Claims' },
              { value: 'pending', label: 'Needs decision' }, { value: 'approved', label: 'To pay back' }, { value: 'draft', label: 'Drafts' }
            ]} />
          </div>
          <DataTable
            rows={data?.data}
            loading={loading}
            error={error}
            onRetry={reload}
            rowKey={(e) => e.id}
            empty={<Empty icon={<Receipt size={20} />} title="Nothing here" text="Add an expense, or wait for claims from the team." />}
            columns={[
              { key: 'date', header: 'Date', render: (e) => day(e.date) },
              { key: 'what', header: 'What', render: (e) => <span><strong>{e.description || e.paidTo || e.categoryLabel}</strong><br /><span className="muted">{e.categoryLabel}{e.paidTo ? ` · ${e.paidTo}` : ''}{e.kind === 'claim' ? ` · claim by ${e.submittedByName}` : ''}{e.recurring !== 'none' ? ` · repeats ${e.recurring}` : ''}</span></span> },
              { key: 'amount', header: 'Amount', render: (e) => <strong>{money(e.amount)}</strong> },
              { key: 'status', header: 'Status', render: (e) => <span><Badge tone={STATUS[e.status]?.tone}>{STATUS[e.status]?.label || e.status}</Badge>{e.declinedReason && <><br /><span className="muted">{e.declinedReason}</span></>}{e.reimbursedOn && <><br /><span className="muted">{e.reimbursedVia === 'payroll' ? `with ${e.reimbursedOn} pay` : `on ${day(e.reimbursedOn)}`}</span></>}</span> },
              { key: 'actions', header: '', className: 'actions', render: (e) => (
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  {e.hasReceipt && <button type="button" className="ad-btn sm" onClick={() => openReceipt(e)} aria-label="Open receipt"><Paperclip size={13} /></button>}
                  {manage && e.kind === 'company' && <button type="button" className="ad-btn sm" onClick={() => setEditing(e)}><Pencil size={13} />{e.status === 'draft' ? ' Confirm' : ''}</button>}
                  {manage && e.kind === 'company' && <button type="button" className="ad-btn sm danger-outline" onClick={() => setDeleting(e)} aria-label="Delete"><Trash2 size={13} /></button>}
                  {manage && (e.status === 'pending_hr' || e.status === 'pending_leadership') && <>
                    <button type="button" className="ad-btn sm primary" onClick={() => setDeciding({ row: e, approve: true })}><Check size={13} /> Approve</button>
                    <button type="button" className="ad-btn sm" onClick={() => setDeciding({ row: e, approve: false })}><X size={13} /></button>
                  </>}
                  {manage && e.status === 'approved' && <button type="button" className="ad-btn sm primary" onClick={() => setReimbursing(e)}>Pay back</button>}
                </span>
              ) }
            ]}
          />
        </Card>
        <Card title="By category" description="Recorded spending and approved claims in the month.">
          {data?.byCategory.length ? <BarList items={data.byCategory.map((c) => ({ label: c.label, value: c.amount, hint: money(c.amount) }))} /> : <p className="muted">No spending yet.</p>}
        </Card>
      </div>
      {editing && <ExpenseForm row={editing === 'new' ? null : editing} categories={data?.categories || []} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
      {deciding && (
        <ConfirmDialog
          title={`${deciding.approve ? 'Approve' : 'Decline'} ${money(deciding.row.amount)} for ${deciding.row.submittedByName}?`}
          description={deciding.row.description}
          confirmLabel={deciding.approve ? 'Approve' : 'Decline'}
          danger={!deciding.approve}
          reason={deciding.approve ? undefined : { label: 'Reason', placeholder: 'Not a work expense', required: true }}
          busy={busy === 'decide'}
          onClose={() => setDeciding(null)}
          onConfirm={async (reason) => {
            const ok = await run('decide', () => api(`/erp/expenses/${deciding.row.id}/decide`, { method: 'POST', body: { approve: deciding.approve, reason } }), deciding.approve ? 'Claim approved' : 'Claim declined');
            setDeciding(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
      {reimbursing && <ReimburseForm row={reimbursing} onClose={() => setReimbursing(null)} onDone={() => { setReimbursing(null); reload(); }} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${money(deleting.amount)} on ${day(deleting.date)}?`}
          description={deleting.description}
          confirmLabel="Delete"
          danger
          busy={busy === 'delete'}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const ok = await run('delete', () => api(`/erp/expenses/${deleting.id}`, { method: 'DELETE' }), 'Expense deleted');
            setDeleting(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </>
  );
}

function ExpenseForm({ row, categories, onClose, onDone }: { row: Expense | null; categories: Array<{ value: string; label: string }>; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    date: row?.date || todayIso(), amount: row ? String(row.amount) : '', category: row?.category || 'servers', paidTo: row?.paidTo || '', description: row?.description || '',
    paymentMode: row?.paymentMode || '', reference: row?.reference || '', recurring: row?.recurring || 'none'
  });
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('save', async () => {
      const receiptFileId = file ? await uploadReceipt(file) : undefined;
      const body = { ...form, amount: Number(form.amount), receiptFileId, ...(row?.status === 'draft' ? { confirm: true } : {}) };
      return api(row ? `/erp/expenses/${row.id}` : '/erp/expenses', { method: row ? 'PATCH' : 'POST', body });
    }, row?.status === 'draft' ? 'Confirmed' : 'Expense saved');
    if (ok !== undefined) onDone();
  };

  return (
    <Modal
      title={row ? (row.status === 'draft' ? 'Confirm repeating expense' : 'Edit expense') : 'Add expense'}
      description={row?.status === 'draft' ? 'Check the amount for this month, then confirm. Only confirmed expenses count in the totals.' : undefined}
      onClose={onClose}
      wide
      footer={<>
        <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="erp-exp" className="ad-btn primary" disabled={busy === 'save'}>{busy === 'save' && <Spinner size={14} />} {row?.status === 'draft' ? 'Confirm' : 'Save'}</button>
      </>}
    >
      <form id="erp-exp" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field"><label htmlFor="ex-date">Date</label><input id="ex-date" type="date" className="ad-input" value={form.date} max={todayIso()} onChange={set('date')} required /></div>
          <div className="ad-field"><label htmlFor="ex-amt">Amount (₹)</label><input id="ex-amt" type="number" min={1} step="0.01" className="ad-input" value={form.amount} onChange={set('amount')} required /></div>
          <div className="ad-field">
            <label htmlFor="ex-cat">Category</label>
            <select id="ex-cat" className="ad-select" value={form.category} onChange={set('category')}>{categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
          </div>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="ex-to">Paid to</label><input id="ex-to" className="ad-input" value={form.paidTo} onChange={set('paidTo')} maxLength={120} placeholder="Render" /></div>
          <div className="ad-field"><label htmlFor="ex-desc">What for</label><input id="ex-desc" className="ad-input" value={form.description} onChange={set('description')} maxLength={500} placeholder="Backend hosting, November" /></div>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="ex-mode">Paid by</label><input id="ex-mode" className="ad-input" value={form.paymentMode} onChange={set('paymentMode')} maxLength={30} placeholder="Company card" /></div>
          <div className="ad-field"><label htmlFor="ex-ref">Reference</label><input id="ex-ref" className="ad-input" value={form.reference} onChange={set('reference')} maxLength={80} /></div>
          <div className="ad-field">
            <label htmlFor="ex-rep">Repeats</label>
            <select id="ex-rep" className="ad-select" value={form.recurring} onChange={set('recurring')}>
              <option value="none">No</option><option value="monthly">Every month</option><option value="yearly">Every year</option>
            </select>
          </div>
        </div>
        {!row?.hasReceipt && (
          <div className="ad-field" style={{ marginTop: 14 }}>
            <span className="ad-label">Receipt</span>
            <input ref={input} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button type="button" className="ad-btn sm" onClick={() => input.current?.click()}><Paperclip size={13} /> {file ? file.name : 'Attach PDF or photo'}</button>
          </div>
        )}
      </form>
    </Modal>
  );
}

function ReimburseForm({ row, onClose, onDone }: { row: Expense; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [via, setVia] = useState<'payroll' | 'direct'>('payroll');
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [paidOn, setPaidOn] = useState(todayIso());
  const [reference, setReference] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('pay', () => api(`/erp/expenses/${row.id}/reimburse`, { method: 'POST', body: via === 'payroll' ? { via, month } : { via, paidOn, reference } }), 'Marked as paid back');
    if (ok !== undefined) onDone();
  };
  return (
    <Modal
      title={`Pay back ${money(row.amount)} to ${row.submittedByName}`}
      description={row.description}
      onClose={onClose}
      footer={<>
        <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="erp-reimb" className="ad-btn primary" disabled={busy === 'pay'}>{busy === 'pay' && <Spinner size={14} />} Save</button>
      </>}
    >
      <form id="erp-reimb" onSubmit={submit}>
        <Segment<'payroll' | 'direct'> value={via} onChange={setVia} options={[{ value: 'payroll', label: 'Add to their pay' }, { value: 'direct', label: 'Paid separately' }]} />
        {via === 'payroll' ? (
          <div className="ad-field" style={{ marginTop: 14 }}>
            <label htmlFor="rb-month">Pay run month</label>
            <input id="rb-month" type="month" className="ad-input" value={month} onChange={(e) => setMonth(e.target.value)} required />
            <span className="ad-hint">The run must still be a draft. The amount shows as reimbursements on their payslip.</span>
          </div>
        ) : (
          <div className="ad-form-row" style={{ marginTop: 14 }}>
            <div className="ad-field"><label htmlFor="rb-on">Paid on</label><input id="rb-on" type="date" className="ad-input" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required /></div>
            <div className="ad-field"><label htmlFor="rb-ref">Reference</label><input id="rb-ref" className="ad-input" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} /></div>
          </div>
        )}
      </form>
    </Modal>
  );
}

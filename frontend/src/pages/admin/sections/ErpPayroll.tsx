import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Banknote, CheckCircle2, Download, FileDown, Lock, Pencil, Plus, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { api, downloadFile } from '../api';
import { useAction, useApi } from '../hooks';
import { money } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Empty, ErrorState, Modal, Notice, PageHeader, Spinner, StatCard } from '../ui';
import type { Tone } from '../ui';
import { day, todayIso } from '../erp';

// ERP → Payroll: a monthly run filled from HR files and CVMind Team attendance.
// Draft (HR edits bonus/deductions) → approved by leadership (locked) → each person marked paid → payslip.

type RunStatus = 'draft' | 'approved' | 'paid';
const STATUS: Record<RunStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'amber' },
  approved: { label: 'Approved', tone: 'blue' },
  paid: { label: 'Paid', tone: 'green' }
};
interface Totals { people: number; gross: number; bonus: number; deductions: number; reimbursements: number; net: number; paid: number }
interface Run { id: string; month: string; label: string; status: RunStatus; createdByName: string; approvedByName: string; approvedAt: string | null; totals?: Totals }
interface Line {
  id: string; adminId: string; name: string; idNumber: string; designation: string; payType: string; monthlyAmount: number;
  monthWorkingDays: number; workingDays: number; presentDays: number; wfhDays: number; paidLeaveDays: number; unpaidLeaveDays: number; absentDays: number; unpaidDays: number;
  basePay: number; bonus: number; deductions: number; reimbursements: number; netPay: number; note: string;
  paid: boolean; paidOn: string; paidMode: string; paidRef: string; payslipNumber: string; bankAccountLast4: string; upiId: string;
}

const thisMonth = () => todayIso().slice(0, 7);

export default function ErpPayroll() {
  const [openRun, setOpenRun] = useState<string | null>(null);
  return openRun ? <RunView runId={openRun} onBack={() => setOpenRun(null)} /> : <RunList onOpen={setOpenRun} />;
}

function RunList({ onOpen }: { onOpen: (id: string) => void }) {
  const { busy, run } = useAction();
  const { data, error, loading, reload } = useApi<{ data: Run[] }>('/erp/payroll/runs');
  const [month, setMonth] = useState(thisMonth());
  const [creating, setCreating] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const res = await run('create', () => api<{ data: Run }>('/erp/payroll/runs', { method: 'POST', body: { month } }), 'Pay run created');
    if (res) { setCreating(false); reload(); onOpen(res.data.id); }
  };

  return (
    <>
      <PageHeader
        title="Payroll"
        description="One run a month. It fills itself from each person's HR file (pay rate, joining and last day) and CVMind Team attendance and leave. Leadership approves it, then you mark each person paid and their payslip goes to CVMind Team."
        actions={<button type="button" className="ad-btn primary" onClick={() => setCreating(true)}><Plus size={15} /> New pay run</button>}
      />
      <Card bodyClass={false}>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(r) => r.id}
          onRowClick={(r) => onOpen(r.id)}
          empty={<Empty icon={<Wallet size={20} />} title="No pay runs yet" text="Start one for this month. Set each person's pay in ERP → People first." />}
          columns={[
            { key: 'month', header: 'Month', render: (r) => <strong>{r.label}</strong> },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge> },
            { key: 'people', header: 'People', render: (r) => r.totals ? `${r.totals.paid}/${r.totals.people} paid` : '—' },
            { key: 'net', header: 'Net pay', render: (r) => <strong>{money(r.totals?.net)}</strong> },
            { key: 'approved', header: 'Approved by', render: (r) => r.approvedByName || <span className="muted">—</span> }
          ]}
        />
      </Card>
      {creating && (
        <Modal
          title="New pay run"
          description="Everyone with a stipend or salary who worked in that month is added. You can change bonuses and deductions before it's approved."
          onClose={() => setCreating(false)}
          footer={<>
            <button type="button" className="ad-btn" onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" form="erp-run" className="ad-btn primary" disabled={busy === 'create'}>{busy === 'create' && <Spinner size={14} />} Create run</button>
          </>}
        >
          <form id="erp-run" onSubmit={create}>
            <div className="ad-field"><label htmlFor="run-month">Month</label><input id="run-month" type="month" className="ad-input" value={month} onChange={(e) => setMonth(e.target.value)} required /></div>
          </form>
        </Modal>
      )}
    </>
  );
}

function RunView({ runId, onBack }: { runId: string; onBack: () => void }) {
  const { busy, run } = useAction();
  const { data, error, reload } = useApi<{ data: Run & { totals: Totals }; lines: Line[]; canApprove: boolean }>(`/erp/payroll/runs/${runId}`);
  const [editing, setEditing] = useState<Line | null>(null);
  const [paying, setPaying] = useState<Line | null>(null);
  const [confirm, setConfirm] = useState<'approve' | 'delete' | null>(null);
  const r = data?.data;
  const lines = data?.lines;
  const draft = r?.status === 'draft';

  if (error && !r) return <ErrorState message={error} onRetry={reload} />;
  if (!r || !lines) return <div className="ad-empty"><Spinner size={20} /></div>;

  return (
    <>
      <PageHeader
        title={`Payroll · ${r.label}`}
        description={draft ? 'Draft: check the days and amounts, add bonuses or deductions, then ask leadership to approve.' : r.status === 'approved' ? `Approved by ${r.approvedByName}. Mark each person paid after the bank transfer.` : 'Everyone in this run has been paid.'}
        actions={
          <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="ad-btn" onClick={onBack}><ArrowLeft size={14} /> All runs</button>
            <button type="button" className="ad-btn" disabled={busy === 'csv'} onClick={() => run('csv', () => downloadFile(`/erp/payroll/runs/${runId}/export`, `payroll-${r.month}.csv`))}><FileDown size={14} /> CSV for CA</button>
            {!draft && r.status !== 'paid' && <button type="button" className="ad-btn" disabled={busy === 'bank'} onClick={() => run('bank', () => downloadFile(`/erp/payroll/runs/${runId}/bank-file`, `bank-transfer-${r.month}.csv`))}><Banknote size={14} /> Bank transfer file</button>}
            {draft && <button type="button" className="ad-btn" disabled={busy === 'recalc'} onClick={() => run('recalc', () => api(`/erp/payroll/runs/${runId}/recalculate`, { method: 'POST' }), 'Recalculated from the latest attendance').then((ok) => ok !== undefined && reload())}><RefreshCw size={14} /> Recalculate</button>}
            {draft && <button type="button" className="ad-btn danger-outline" onClick={() => setConfirm('delete')}><Trash2 size={14} /></button>}
            {draft && data?.canApprove && <button type="button" className="ad-btn primary" onClick={() => setConfirm('approve')}><Lock size={14} /> Approve</button>}
          </span>
        }
      />
      {draft && !data?.canApprove && <Notice tone="blue">Only the CEO, CTO, CMO or owner can approve this run.</Notice>}
      <div className="ad-grid cols-4" style={{ marginBottom: 16 }}>
        <StatCard label="People" value={r.totals.people} foot={<span className="muted">{r.totals.paid} paid</span>} />
        <StatCard label="Base pay" value={money(r.totals.gross)} tone="blue" />
        <StatCard label="Bonus + reimbursements − deductions" value={money(r.totals.bonus + r.totals.reimbursements - r.totals.deductions)} tone="purple" />
        <StatCard label="Net pay" value={money(r.totals.net)} tone="green" />
      </div>
      <Card bodyClass={false}>
        <DataTable
          rows={lines}
          rowKey={(l) => l.id}
          empty={<Empty icon={<Wallet size={20} />} title="No one to pay" text="No one had a stipend or salary in this month. Set pay in ERP → People, then recalculate." />}
          columns={[
            { key: 'who', header: 'Person', render: (l) => <span><strong>{l.name}</strong><br /><span className="muted">{l.designation}{l.idNumber ? ` · ${l.idNumber}` : ''}</span></span> },
            { key: 'rate', header: 'Monthly', render: (l) => <span>{money(l.monthlyAmount)}<br /><span className="muted">{l.payType}</span></span> },
            { key: 'days', header: 'Days', render: (l) => (
              <span title={`Present ${l.presentDays} (WFH ${l.wfhDays}), paid leave ${l.paidLeaveDays}, unpaid leave ${l.unpaidLeaveDays}, no check-in ${l.absentDays}`}>
                {l.workingDays - l.unpaidDays}/{l.monthWorkingDays} paid
                {l.unpaidDays > 0 && <><br /><span className="muted">{l.unpaidDays} unpaid</span></>}
              </span>
            ) },
            { key: 'adj', header: 'Adjustments', render: (l) => {
              const parts = [l.bonus ? `+${money(l.bonus)} bonus` : '', l.reimbursements ? `+${money(l.reimbursements)} claims` : '', l.deductions ? `−${money(l.deductions)}` : ''].filter(Boolean);
              return parts.length ? <span>{parts.join(' · ')}{l.note && <><br /><span className="muted">{l.note}</span></>}</span> : <span className="muted">—</span>;
            } },
            { key: 'net', header: 'Net pay', render: (l) => <strong>{money(l.netPay)}</strong> },
            { key: 'status', header: 'Paid', render: (l) => l.paid ? <span><Badge tone="green">Paid {day(l.paidOn)}</Badge><br /><span className="muted ad-mono">{l.payslipNumber}</span></span> : <span className="muted">{l.bankAccountLast4 ? `•••• ${l.bankAccountLast4}` : l.upiId || 'No bank details'}</span> },
            { key: 'actions', header: '', className: 'actions', render: (l) => (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                {draft && <button type="button" className="ad-btn sm" onClick={() => setEditing(l)}><Pencil size={13} /> Adjust</button>}
                {!draft && !l.paid && <button type="button" className="ad-btn sm primary" onClick={() => setPaying(l)}><CheckCircle2 size={13} /> Mark paid</button>}
                {l.paid && <button type="button" className="ad-btn sm" disabled={busy === `slip-${l.id}`} onClick={() => run(`slip-${l.id}`, () => downloadFile(`/erp/payroll/lines/${l.id}/payslip`, `payslip-${r.month}.pdf`))}><Download size={13} /> Payslip</button>}
              </span>
            ) }
          ]}
        />
      </Card>
      {editing && <AdjustForm line={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
      {paying && <PaidForm line={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); reload(); }} />}
      {confirm === 'approve' && (
        <ConfirmDialog
          title={`Approve ${r.label} payroll?`}
          description={`${r.totals.people} people, ${money(r.totals.net)} in total. After this the numbers are locked and HR can mark people paid.`}
          confirmLabel="Approve"
          busy={busy === 'approve'}
          onClose={() => setConfirm(null)}
          onConfirm={async () => { const ok = await run('approve', () => api(`/erp/payroll/runs/${runId}/approve`, { method: 'POST' }), 'Pay run approved'); setConfirm(null); if (ok !== undefined) reload(); }}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title={`Delete the ${r.label} draft?`}
          description="You can start the month again afterwards."
          confirmLabel="Delete draft"
          danger
          busy={busy === 'delete'}
          onClose={() => setConfirm(null)}
          onConfirm={async () => { const ok = await run('delete', () => api(`/erp/payroll/runs/${runId}`, { method: 'DELETE' }), 'Draft deleted'); setConfirm(null); if (ok !== undefined) onBack(); }}
        />
      )}
    </>
  );
}

function AdjustForm({ line, onClose, onDone }: { line: Line; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ bonus: String(line.bonus || ''), deductions: String(line.deductions || ''), reimbursements: String(line.reimbursements || ''), note: line.note });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const net = line.basePay + Number(form.bonus || 0) + Number(form.reimbursements || 0) - Number(form.deductions || 0);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('save', () => api(`/erp/payroll/lines/${line.id}`, { method: 'PATCH', body: form }), 'Saved');
    if (ok !== undefined) onDone();
  };
  return (
    <Modal
      title={`Adjust ${line.name}`}
      description={`Base pay ${money(line.basePay)} for ${line.workingDays - line.unpaidDays} of ${line.monthWorkingDays} working days.`}
      onClose={onClose}
      footer={<>
        <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="erp-adjust" className="ad-btn primary" disabled={busy === 'save'}>{busy === 'save' && <Spinner size={14} />} Save · net {money(Math.round(net))}</button>
      </>}
    >
      <form id="erp-adjust" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field"><label htmlFor="adj-bonus">Bonus (₹)</label><input id="adj-bonus" type="number" min={0} className="ad-input" value={form.bonus} onChange={set('bonus')} /></div>
          <div className="ad-field"><label htmlFor="adj-reimb">Reimbursements (₹)</label><input id="adj-reimb" type="number" min={0} className="ad-input" value={form.reimbursements} onChange={set('reimbursements')} /></div>
          <div className="ad-field"><label htmlFor="adj-ded">Deductions (₹)</label><input id="adj-ded" type="number" min={0} className="ad-input" value={form.deductions} onChange={set('deductions')} /></div>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}><label htmlFor="adj-note">Note on the payslip</label><input id="adj-note" className="ad-input" value={form.note} onChange={set('note')} maxLength={200} /></div>
      </form>
    </Modal>
  );
}

function PaidForm({ line, onClose, onDone }: { line: Line; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ paidOn: todayIso(), mode: line.bankAccountLast4 ? 'bank' : line.upiId ? 'upi' : 'bank', reference: '' });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('paid', () => api(`/erp/payroll/lines/${line.id}/paid`, { method: 'POST', body: form }), `${line.name} marked paid. Their payslip is in CVMind Team.`);
    if (ok !== undefined) onDone();
  };
  return (
    <Modal
      title={`Mark ${line.name} paid`}
      description={`${money(line.netPay)} to ${line.bankAccountLast4 ? `account •••• ${line.bankAccountLast4}` : line.upiId || 'their account'}. Do the transfer in your bank app first.`}
      onClose={onClose}
      footer={<>
        <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="erp-paid" className="ad-btn primary" disabled={busy === 'paid'}>{busy === 'paid' && <Spinner size={14} />} Mark paid</button>
      </>}
    >
      <form id="erp-paid" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field"><label htmlFor="paid-on">Paid on</label><input id="paid-on" type="date" className="ad-input" value={form.paidOn} onChange={(e) => setForm((f) => ({ ...f, paidOn: e.target.value }))} required /></div>
          <div className="ad-field">
            <label htmlFor="paid-mode">How</label>
            <select id="paid-mode" className="ad-select" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
              <option value="bank">Bank transfer</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}><label htmlFor="paid-ref">Reference (UTR or transaction ID)</label><input id="paid-ref" className="ad-input ad-mono" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} maxLength={60} /></div>
      </form>
    </Modal>
  );
}

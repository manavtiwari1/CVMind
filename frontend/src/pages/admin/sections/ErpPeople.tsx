import { useState } from 'react';
import type { FormEvent } from 'react';
import { BadgeCheck, Eye, FileText, IndianRupee, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { api } from '../api';
import { useAction, useApi, useDebounced } from '../hooks';
import { money } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Drawer, Empty, ErrorState, Modal, PageHeader, SearchInput, Segment, Spinner } from '../ui';
import { day, EMPLOYMENT, todayIso } from '../erp';
import type { EmploymentType, PayType } from '../erp';

// ERP → People: one HR file per person on the team (job, dates, pay, personal and bank details, documents).
// Members fill their own personal and bank details in CVMind Team → Profile → My HR file.

const employmentOf = (v: string) => EMPLOYMENT.find((e) => e.value === v);
const PAY_LABEL: Record<PayType, string> = { stipend: 'Stipend', salary: 'Salary', unpaid: 'Unpaid' };
const DOC_LABEL: Record<string, string> = { id_proof: 'ID proof', pan_card: 'PAN card', college_letter: 'College letter / NOC', signed_offer: 'Signed offer letter', other: 'Other' };

interface Row {
  id: string; name: string; username: string; email: string; roleLabel: string; department: string; idNumber: string; active: boolean;
  employmentType: EmploymentType | ''; designation: string; managerName: string; joiningDate: string; endDate: string;
  payType?: PayType; payAmount?: number; hasFile: boolean; missing: string[]; documentsToVerify: number;
}
interface PayChange { id: string; payType: PayType; amount: number; effectiveFrom: string; note: string; createdByName: string }
interface HrDocument { id: string; kind: string; name: string; size: number; verified: boolean }
interface HrFile {
  adminId: string; employmentType: EmploymentType; designation: string; managerId: string | null; managerName: string;
  joiningDate: string; endDate: string; probationEndDate: string; lastWorkingDay: string;
  payType?: PayType; payAmount?: number; payHistory?: PayChange[];
  legalName: string; dateOfBirth: string; personalEmail: string; address: string; emergencyName: string; emergencyRelation: string; emergencyPhone: string;
  bankHolder: string; bankAccountLast4: string; bankIfsc: string; upiId: string; panLast4: string;
  documents: HrDocument[]; notes?: string; missing: string[];
}
interface Person { id: string; name: string; username: string; email: string; phone: string; roleLabel: string; department: string; idNumber: string; active: boolean }
interface Member { id: string; name: string; username: string; active: boolean }

export default function ErpPeople() {
  const [q, setQ] = useState('');
  const [type, setType] = useState<'' | EmploymentType>('');
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<{ data: Row[]; canManage: boolean }>('/erp/people', { q: search, type });
  const [open, setOpen] = useState<string | null>(null);
  const canManage = !!data?.canManage;

  return (
    <>
      <PageHeader
        title="People"
        description="Everyone's HR file: job, dates, pay, personal and bank details, and documents. Members fill in their own personal and bank details in CVMind Team → Profile → My HR file."
      />
      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, ID or department" />
          <Segment<'' | EmploymentType> value={type} onChange={setType} options={[{ value: '' as const, label: 'All' }, ...EMPLOYMENT.map((e) => ({ value: e.value, label: e.label }))]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(r) => r.id}
          onRowClick={(r) => setOpen(r.id)}
          empty={<Empty icon={<Users size={20} />} title="No one here" text="People invited to the team show up here." />}
          columns={[
            { key: 'who', header: 'Person', render: (r) => <span><strong>{r.name}</strong><br /><span className="muted">{r.designation || r.roleLabel}{r.idNumber ? ` · ${r.idNumber}` : ''}</span></span> },
            { key: 'type', header: 'Type', render: (r) => r.employmentType ? <Badge tone={employmentOf(r.employmentType)?.tone}>{employmentOf(r.employmentType)?.label}</Badge> : <span className="muted">—</span> },
            { key: 'dates', header: 'Dates', render: (r) => <span>{day(r.joiningDate)}{r.endDate && <><br /><span className="muted">until {day(r.endDate)}</span></>}</span> },
            { key: 'manager', header: 'Reports to', render: (r) => r.managerName || <span className="muted">—</span> },
            ...(canManage ? [{ key: 'pay', header: 'Pay / month', render: (r: Row) => r.payType && r.payType !== 'unpaid' ? <span>{money(r.payAmount)}<br /><span className="muted">{PAY_LABEL[r.payType]}</span></span> : <span className="muted">Unpaid</span> }] : []),
            { key: 'file', header: 'File', render: (r) => (
              <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                {r.missing.length ? <Badge tone="amber">{r.missing.length} missing</Badge> : <Badge tone="green">Complete</Badge>}
                {r.documentsToVerify > 0 && <Badge tone="blue">{r.documentsToVerify} to verify</Badge>}
              </span>
            ) }
          ]}
        />
      </Card>
      {open && <PersonDrawer adminId={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  );
}

function PersonDrawer({ adminId, onClose, onChanged }: { adminId: string; onClose: () => void; onChanged: () => void }) {
  const { busy, run } = useAction();
  const { data, error, reload } = useApi<{ person: Person; data: HrFile; canManage: boolean }>(`/erp/people/${adminId}`);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [revealed, setRevealed] = useState<{ bankAccount: string; pan: string } | null>(null);
  const [removingPay, setRemovingPay] = useState<PayChange | null>(null);
  const p = data?.data;
  const person = data?.person;
  const manage = !!data?.canManage;
  const changed = () => { reload(); onChanged(); };

  const openDoc = async (doc: HrDocument) => {
    const res = await run('doc', () => api<{ url: string }>(`/erp/people/${adminId}/documents/${doc.id}/url`));
    if (res?.url) window.open(res.url, '_blank', 'noopener');
  };

  return (
    <Drawer
      title={person?.name || 'HR file'}
      subtitle={person ? [p?.designation || person.roleLabel, person.idNumber, person.email].filter(Boolean).join(' · ') : undefined}
      onClose={onClose}
      footer={manage && p ? <button type="button" className="ad-btn primary" onClick={() => setEditing(true)}><Pencil size={14} /> Edit HR file</button> : undefined}
    >
      {error && !p ? <ErrorState message={error} onRetry={reload} /> : !p || !person ? <div className="ad-empty"><Spinner size={20} /></div> : (
        <>
          {p.missing.length > 0 && <p className="ad-small" style={{ color: '#b45309', marginBottom: 14 }}>Missing: {p.missing.join(', ')}</p>}

          <div className="ad-section-title">Job</div>
          <dl className="ad-kv">
            <dt>Type</dt><dd>{employmentOf(p.employmentType)?.label || '—'}</dd>
            <dt>Designation</dt><dd>{p.designation || '—'}</dd>
            <dt>Department</dt><dd>{person.department || '—'}</dd>
            <dt>Reports to</dt><dd>{p.managerName || '—'}</dd>
            <dt>Joined</dt><dd>{day(p.joiningDate)}</dd>
            <dt>{p.employmentType === 'intern' ? 'Internship ends' : 'Contract ends'}</dt><dd>{day(p.endDate)}</dd>
            <dt>Probation ends</dt><dd>{day(p.probationEndDate)}</dd>
            <dt>Last working day</dt><dd>{day(p.lastWorkingDay)}</dd>
          </dl>

          {manage && (
            <>
              <div className="ad-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Pay</span>
                <button type="button" className="ad-btn sm" onClick={() => setPaying(true)}><IndianRupee size={13} /> Change pay</button>
              </div>
              <p style={{ marginBottom: 10 }}><strong>{p.payType === 'unpaid' ? 'Unpaid' : `${money(p.payAmount)} a month`}</strong>{p.payType !== 'unpaid' && <span className="muted"> · {PAY_LABEL[p.payType || 'unpaid']}</span>}</p>
              {(p.payHistory || []).length > 0 && (
                <ul className="ad-list" style={{ marginBottom: 16 }}>
                  {(p.payHistory || []).map((h) => (
                    <li key={h.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <div>
                        <div className="ad-cell-title">{h.payType === 'unpaid' ? 'Unpaid' : `${money(h.amount)} · ${PAY_LABEL[h.payType]}`}</div>
                        <div className="ad-cell-sub">From {day(h.effectiveFrom)}{h.note ? ` · ${h.note}` : ''}{h.createdByName ? ` · by ${h.createdByName}` : ''}</div>
                      </div>
                      <button type="button" className="ad-btn sm ghost" aria-label="Delete this pay change" onClick={() => setRemovingPay(h)}><Trash2 size={13} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div className="ad-section-title">Personal</div>
          <dl className="ad-kv">
            <dt>Legal name</dt><dd>{p.legalName || '—'}</dd>
            <dt>Date of birth</dt><dd>{day(p.dateOfBirth)}</dd>
            <dt>Phone</dt><dd>{person.phone || '—'}</dd>
            <dt>Personal email</dt><dd>{p.personalEmail || '—'}</dd>
            <dt>Address</dt><dd>{p.address || '—'}</dd>
            <dt>Emergency contact</dt><dd>{p.emergencyName ? `${p.emergencyName}${p.emergencyRelation ? ` (${p.emergencyRelation})` : ''} · ${p.emergencyPhone || '—'}` : '—'}</dd>
          </dl>

          <div className="ad-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Bank</span>
            {manage && (p.bankAccountLast4 || p.panLast4) && !revealed && (
              <button type="button" className="ad-btn sm" disabled={busy === 'reveal'} onClick={async () => { const r = await run('reveal', () => api<{ bankAccount: string; pan: string }>(`/erp/people/${adminId}/reveal`, { method: 'POST' })); if (r) setRevealed(r); }}>
                <Eye size={13} /> Reveal
              </button>
            )}
          </div>
          <dl className="ad-kv">
            <dt>Account holder</dt><dd>{p.bankHolder || '—'}</dd>
            <dt>Account number</dt><dd className="ad-mono">{revealed?.bankAccount || (p.bankAccountLast4 ? `•••• ${p.bankAccountLast4}` : '—')}</dd>
            <dt>IFSC</dt><dd className="ad-mono">{p.bankIfsc || '—'}</dd>
            <dt>UPI</dt><dd>{p.upiId || '—'}</dd>
            <dt>PAN</dt><dd className="ad-mono">{revealed?.pan || (p.panLast4 ? `•••••${p.panLast4}` : '—')}</dd>
          </dl>
          {revealed && <p className="ad-hint" style={{ marginTop: -6, marginBottom: 14 }}>Shown once and recorded in the audit log.</p>}

          <div className="ad-section-title">Documents</div>
          {p.documents.length === 0 ? <p className="muted" style={{ marginBottom: 14 }}>Nothing uploaded yet. Members add documents from CVMind Team.</p> : (
            <ul className="ad-list" style={{ marginBottom: 14 }}>
              {p.documents.map((d) => (
                <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <button type="button" className="ad-link" onClick={() => openDoc(d)} style={{ textAlign: 'left' }}>
                    <div className="ad-cell-title"><FileText size={13} style={{ verticalAlign: '-2px' }} /> {DOC_LABEL[d.kind] || d.kind}</div>
                    <div className="ad-cell-sub">{d.name}</div>
                  </button>
                  {d.verified ? <Badge tone="green">Verified</Badge> : manage ? (
                    <button type="button" className="ad-btn sm" disabled={busy === `v-${d.id}`} onClick={() => run(`v-${d.id}`, () => api(`/erp/people/${adminId}/documents/${d.id}/verify`, { method: 'POST', body: { verified: true } }), 'Document verified').then((ok) => ok !== undefined && changed())}>
                      <BadgeCheck size={13} /> Verify
                    </button>
                  ) : <Badge tone="gray">Not verified</Badge>}
                </li>
              ))}
            </ul>
          )}

          {manage && p.notes && (<><div className="ad-section-title">HR notes</div><p style={{ whiteSpace: 'pre-wrap' }}>{p.notes}</p></>)}
        </>
      )}
      {editing && p && person && <EditFile adminId={adminId} person={person} file={p} onClose={() => setEditing(false)} onDone={() => { setEditing(false); changed(); }} />}
      {paying && <PayForm adminId={adminId} onClose={() => setPaying(false)} onDone={() => { setPaying(false); changed(); }} />}
      {removingPay && (
        <ConfirmDialog
          title="Delete this pay change?"
          description={`${removingPay.payType === 'unpaid' ? 'Unpaid' : money(removingPay.amount)} from ${day(removingPay.effectiveFrom)}. Their current pay is worked out again from the changes that are left.`}
          confirmLabel="Delete"
          danger
          busy={busy === 'delpay'}
          onClose={() => setRemovingPay(null)}
          onConfirm={async () => {
            const ok = await run('delpay', () => api(`/erp/people/${adminId}/pay/${removingPay.id}`, { method: 'DELETE' }), 'Pay change deleted');
            setRemovingPay(null);
            if (ok !== undefined) changed();
          }}
        />
      )}
    </Drawer>
  );
}

function EditFile({ adminId, person, file, onClose, onDone }: { adminId: string; person: Person; file: HrFile; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const members = useApi<{ data: Member[] }>('/erp/people');
  const [form, setForm] = useState({
    employmentType: file.employmentType, designation: file.designation, department: person.department, managerId: file.managerId || '',
    joiningDate: file.joiningDate, endDate: file.endDate, probationEndDate: file.probationEndDate, lastWorkingDay: file.lastWorkingDay,
    legalName: file.legalName, dateOfBirth: file.dateOfBirth, personalEmail: file.personalEmail, address: file.address,
    emergencyName: file.emergencyName, emergencyRelation: file.emergencyRelation, emergencyPhone: file.emergencyPhone,
    bankHolder: file.bankHolder, bankIfsc: file.bankIfsc, upiId: file.upiId, notes: file.notes || ''
  });
  // Account number and PAN are only sent when typed again
  const [bankAccount, setBankAccount] = useState('');
  const [pan, setPan] = useState('');
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const managers = (members.data?.data || []).filter((m) => m.active && m.id !== adminId).sort((a, b) => a.name.localeCompare(b.name));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { ...form, ...(bankAccount ? { bankAccount } : {}), ...(pan ? { pan } : {}) };
    const ok = await run('save', () => api(`/erp/people/${adminId}`, { method: 'PATCH', body }), 'HR file saved');
    if (ok !== undefined) onDone();
  };

  return (
    <Modal
      title={`Edit ${person.name}'s HR file`}
      onClose={onClose}
      wide
      footer={<>
        <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="erp-file" className="ad-btn primary" disabled={busy === 'save'}>{busy === 'save' && <Spinner size={14} />} Save</button>
      </>}
    >
      <form id="erp-file" onSubmit={submit}>
        <div className="ad-section-title">Job</div>
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="hr-type">Type</label>
            <select id="hr-type" className="ad-select" value={form.employmentType} onChange={set('employmentType')}>
              {EMPLOYMENT.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="ad-field"><label htmlFor="hr-desig">Designation</label><input id="hr-desig" className="ad-input" value={form.designation} onChange={set('designation')} maxLength={80} placeholder="Frontend Developer Intern" /></div>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="hr-dept">Department</label><input id="hr-dept" className="ad-input" value={form.department} onChange={set('department')} maxLength={60} /></div>
          <div className="ad-field">
            <label htmlFor="hr-mgr">Reports to</label>
            <select id="hr-mgr" className="ad-select" value={form.managerId} onChange={set('managerId')}>
              <option value="">{members.loading ? 'Loading…' : 'No one'}</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name || m.username}</option>)}
            </select>
          </div>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="hr-join">Joining date</label><input id="hr-join" type="date" className="ad-input" value={form.joiningDate} onChange={set('joiningDate')} /></div>
          <div className="ad-field"><label htmlFor="hr-end">{form.employmentType === 'intern' ? 'Internship ends' : 'Contract ends'}</label><input id="hr-end" type="date" className="ad-input" value={form.endDate} onChange={set('endDate')} /></div>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="hr-prob">Probation ends</label><input id="hr-prob" type="date" className="ad-input" value={form.probationEndDate} onChange={set('probationEndDate')} /></div>
          <div className="ad-field"><label htmlFor="hr-lwd">Last working day</label><input id="hr-lwd" type="date" className="ad-input" value={form.lastWorkingDay} onChange={set('lastWorkingDay')} /></div>
        </div>

        <div className="ad-section-title" style={{ marginTop: 20 }}>Personal</div>
        <div className="ad-form-row">
          <div className="ad-field"><label htmlFor="hr-legal">Legal name</label><input id="hr-legal" className="ad-input" value={form.legalName} onChange={set('legalName')} maxLength={100} /></div>
          <div className="ad-field"><label htmlFor="hr-dob">Date of birth</label><input id="hr-dob" type="date" className="ad-input" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></div>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="hr-pemail">Personal email</label><input id="hr-pemail" type="email" className="ad-input" value={form.personalEmail} onChange={set('personalEmail')} maxLength={120} /></div>
          <div className="ad-field"><label htmlFor="hr-addr">Address</label><input id="hr-addr" className="ad-input" value={form.address} onChange={set('address')} maxLength={400} /></div>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="hr-ename">Emergency contact</label><input id="hr-ename" className="ad-input" value={form.emergencyName} onChange={set('emergencyName')} maxLength={80} /></div>
          <div className="ad-field"><label htmlFor="hr-erel">Relation</label><input id="hr-erel" className="ad-input" value={form.emergencyRelation} onChange={set('emergencyRelation')} maxLength={40} placeholder="Father" /></div>
          <div className="ad-field"><label htmlFor="hr-ephone">Their phone</label><input id="hr-ephone" type="tel" className="ad-input" value={form.emergencyPhone} onChange={set('emergencyPhone')} maxLength={20} /></div>
        </div>

        <div className="ad-section-title" style={{ marginTop: 20 }}>Bank</div>
        <div className="ad-form-row">
          <div className="ad-field"><label htmlFor="hr-holder">Account holder</label><input id="hr-holder" className="ad-input" value={form.bankHolder} onChange={set('bankHolder')} maxLength={100} /></div>
          <div className="ad-field">
            <label htmlFor="hr-acct">Account number</label>
            <input id="hr-acct" className="ad-input ad-mono" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} inputMode="numeric" maxLength={24} placeholder={file.bankAccountLast4 ? `Saved: •••• ${file.bankAccountLast4}` : ''} autoComplete="off" />
            <span className="ad-hint">Type it only to change it.</span>
          </div>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="hr-ifsc">IFSC</label><input id="hr-ifsc" className="ad-input ad-mono" value={form.bankIfsc} onChange={(e) => setForm((f) => ({ ...f, bankIfsc: e.target.value.toUpperCase() }))} maxLength={11} placeholder="SBIN0001234" /></div>
          <div className="ad-field"><label htmlFor="hr-upi">UPI ID</label><input id="hr-upi" className="ad-input" value={form.upiId} onChange={set('upiId')} maxLength={100} placeholder="name@okicici" /></div>
          <div className="ad-field"><label htmlFor="hr-pan">PAN</label><input id="hr-pan" className="ad-input ad-mono" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} maxLength={10} placeholder={file.panLast4 ? `Saved: •••••${file.panLast4}` : 'ABCDE1234F'} autoComplete="off" /></div>
        </div>

        <div className="ad-field" style={{ marginTop: 20 }}>
          <label htmlFor="hr-notes">HR notes</label>
          <textarea id="hr-notes" className="ad-textarea" value={form.notes} onChange={set('notes')} maxLength={2000} placeholder="Only people with HR access see these." />
        </div>
      </form>
    </Modal>
  );
}

function PayForm({ adminId, onClose, onDone }: { adminId: string; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ payType: 'stipend' as PayType, amount: '', effectiveFrom: todayIso(), note: '' });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('pay', () => api(`/erp/people/${adminId}/pay`, { method: 'POST', body: { ...form, amount: Number(form.amount) } }), 'Pay saved');
    if (ok !== undefined) onDone();
  };
  return (
    <Modal
      title="Change pay"
      description="The old rate stays in the history. Payroll uses whichever rate applied in each month."
      onClose={onClose}
      footer={<>
        <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="erp-pay" className="ad-btn primary" disabled={busy === 'pay'}>{busy === 'pay' && <Spinner size={14} />} <Plus size={14} /> Save</button>
      </>}
    >
      <form id="erp-pay" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="pay-type">Pay type</label>
            <select id="pay-type" className="ad-select" value={form.payType} onChange={(e) => setForm((f) => ({ ...f, payType: e.target.value as PayType }))}>
              <option value="stipend">Monthly stipend</option>
              <option value="salary">Monthly salary</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          {form.payType !== 'unpaid' && (
            <div className="ad-field"><label htmlFor="pay-amt">Amount a month (₹)</label><input id="pay-amt" type="number" min={1} step="1" className="ad-input" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required /></div>
          )}
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="pay-from">Starts from</label><input id="pay-from" type="date" className="ad-input" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} required /></div>
          <div className="ad-field"><label htmlFor="pay-note">Note</label><input id="pay-note" className="ad-input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} maxLength={200} placeholder="Raise after review" /></div>
        </div>
      </form>
    </Modal>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BadgeCheck, Briefcase, FileText, Trash2, Upload } from 'lucide-react';
import { api } from '../api';
import { confirmDialog } from '../confirm';
import { Spinner } from '../ui';
import { ACCEPT, checkFile, fileUrl, formatBytes, uploadFile } from '../upload';

// Profile → My HR file: the member's own HR record. Job, dates and pay are set by HR (read-only here);
// personal details, bank details and documents are filled in by the member.

interface HrDocument { id: string; kind: string; fileId: string; name: string; size: number; verified: boolean }
interface HrFile {
  employmentType: string; designation: string; managerName: string; joiningDate: string; endDate: string; probationEndDate: string;
  payType: 'stipend' | 'salary' | 'unpaid'; payAmount: number;
  legalName: string; dateOfBirth: string; personalEmail: string; address: string; emergencyName: string; emergencyRelation: string; emergencyPhone: string;
  bankHolder: string; bankAccountLast4: string; bankIfsc: string; upiId: string; panLast4: string;
  documents: HrDocument[]; missing: string[];
}

const TYPE_LABEL: Record<string, string> = { intern: 'Intern', full_time: 'Full-time', part_time: 'Part-time', contractor: 'Contractor' };
const DOC_KINDS: Array<{ value: string; label: string }> = [
  { value: 'id_proof', label: 'ID proof (Aadhaar, passport…)' },
  { value: 'pan_card', label: 'PAN card' },
  { value: 'college_letter', label: 'College letter / NOC' },
  { value: 'signed_offer', label: 'Signed offer letter' },
  { value: 'other', label: 'Other' }
];
const docLabel = (k: string) => DOC_KINDS.find((d) => d.value === k)?.label.replace(/ \(.*\)$/, '') || k;
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const day = (v: string) => {
  if (!v) return '—';
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function MyHrFile({ myId }: { myId: string }) {
  const [file, setFile] = useState<HrFile | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [bankAccount, setBankAccount] = useState('');
  const [pan, setPan] = useState('');
  const [docKind, setDocKind] = useState('id_proof');
  const input = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Array<{ id: string; name: string; assignedToMe: boolean; loginHolder: boolean }>>([]);

  const apply = useCallback((f: HrFile) => {
    setFile(f);
    setForm({
      legalName: f.legalName, dateOfBirth: f.dateOfBirth, personalEmail: f.personalEmail, address: f.address,
      emergencyName: f.emergencyName, emergencyRelation: f.emergencyRelation, emergencyPhone: f.emergencyPhone,
      bankHolder: f.bankHolder, bankIfsc: f.bankIfsc, upiId: f.upiId
    });
  }, []);

  useEffect(() => {
    api<{ data: HrFile }>('/me/hr').then((r) => apply(r.data)).catch((e: Error) => setError(e.message));
    api<{ data: Array<{ id: string; name: string; assignedToMe: boolean; loginHolder: boolean }> }>('/me/assets').then((r) => setAssets(r.data)).catch(() => {});
  }, [apply]);

  const set = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('save'); setMessage(''); setError('');
    try {
      const r = await api<{ data: HrFile }>('/me/hr', { method: 'PATCH', body: { ...form, ...(bankAccount ? { bankAccount } : {}), ...(pan ? { pan } : {}) } });
      apply(r.data);
      setBankAccount(''); setPan('');
      setMessage('Saved.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const addDocument = async (picked: File | undefined) => {
    if (!picked) return;
    const problem = checkFile(picked);
    if (problem) { setError(problem); return; }
    setBusy('upload'); setError(''); setMessage('');
    try {
      const uploaded = await uploadFile(picked, { scope: 'hr', scopeId: myId });
      const r = await api<{ data: HrFile }>('/me/hr/documents', { method: 'POST', body: { fileId: uploaded.id, kind: docKind } });
      apply(r.data);
      setMessage('Document added. HR will verify it.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  };

  const removeDocument = async (doc: HrDocument) => {
    if (!(await confirmDialog({ title: `Remove ${docLabel(doc.kind)}?`, message: doc.name, confirmLabel: 'Remove', danger: true }))) return;
    setBusy(`rm-${doc.id}`);
    try {
      const r = await api<{ data: HrFile }>(`/me/hr/documents/${doc.id}`, { method: 'DELETE' });
      apply(r.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openDocument = async (doc: HrDocument) => {
    try {
      window.open(await fileUrl(doc.fileId), '_blank', 'noopener');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!file) {
    return (
      <section className="tm-card pad tm-form">
        <h2 className="tm-h2"><Briefcase size={16} /> My HR file</h2>
        {error ? <p className="tm-notice amber">{error}</p> : <Spinner size={18} />}
      </section>
    );
  }

  return (
    <form className="tm-card pad tm-form" onSubmit={save}>
      <h2 className="tm-h2"><Briefcase size={16} /> My HR file</h2>
      <p className="tm-muted">Only you and CVMind's HR team see this. Your job, dates and pay are set by HR; fill in the rest so payroll and letters can go out on time.</p>
      {file.missing.length > 0 && <p className="tm-notice amber">Still missing: {file.missing.join(', ')}.</p>}

      <dl className="tm-kv">
        <dt>Job</dt><dd>{file.designation || '—'}{file.employmentType && ` · ${TYPE_LABEL[file.employmentType] || file.employmentType}`}</dd>
        <dt>Reports to</dt><dd>{file.managerName || '—'}</dd>
        <dt>Joined</dt><dd>{day(file.joiningDate)}</dd>
        {file.endDate && <><dt>{file.employmentType === 'intern' ? 'Internship ends' : 'Contract ends'}</dt><dd>{day(file.endDate)}</dd></>}
        {file.probationEndDate && <><dt>Probation ends</dt><dd>{day(file.probationEndDate)}</dd></>}
        <dt>Pay</dt><dd>{file.payType === 'unpaid' ? 'Unpaid' : `${inr.format(file.payAmount)} a month (${file.payType})`}</dd>
      </dl>

      {assets.length > 0 && (
        <p className="tm-muted">Company things with you: {assets.map((a) => `${a.name}${a.assignedToMe ? '' : ' (login)'}`).join(', ')}. Return or hand them over before your last day.</p>
      )}

      <h3 className="tm-h3">Personal details</h3>
      <div className="tm-form-row">
        <div className="tm-field"><label htmlFor="hr-legal">Legal name (as on documents)</label><input id="hr-legal" className="tm-input" value={form.legalName || ''} onChange={set('legalName')} maxLength={100} /></div>
        <div className="tm-field"><label htmlFor="hr-dob">Date of birth</label><input id="hr-dob" type="date" className="tm-input" value={form.dateOfBirth || ''} onChange={set('dateOfBirth')} /></div>
      </div>
      <div className="tm-form-row">
        <div className="tm-field"><label htmlFor="hr-pemail">Personal email</label><input id="hr-pemail" type="email" className="tm-input" value={form.personalEmail || ''} onChange={set('personalEmail')} maxLength={120} /></div>
        <div className="tm-field"><label htmlFor="hr-addr">Address</label><input id="hr-addr" className="tm-input" value={form.address || ''} onChange={set('address')} maxLength={400} /></div>
      </div>
      <div className="tm-form-row">
        <div className="tm-field"><label htmlFor="hr-ename">Emergency contact</label><input id="hr-ename" className="tm-input" value={form.emergencyName || ''} onChange={set('emergencyName')} maxLength={80} /></div>
        <div className="tm-field"><label htmlFor="hr-erel">Relation</label><input id="hr-erel" className="tm-input" value={form.emergencyRelation || ''} onChange={set('emergencyRelation')} maxLength={40} placeholder="Mother" /></div>
        <div className="tm-field"><label htmlFor="hr-ephone">Their phone</label><input id="hr-ephone" type="tel" className="tm-input" value={form.emergencyPhone || ''} onChange={set('emergencyPhone')} maxLength={20} /></div>
      </div>

      <h3 className="tm-h3">Bank details for your stipend or salary</h3>
      <div className="tm-form-row">
        <div className="tm-field"><label htmlFor="hr-holder">Account holder</label><input id="hr-holder" className="tm-input" value={form.bankHolder || ''} onChange={set('bankHolder')} maxLength={100} /></div>
        <div className="tm-field">
          <label htmlFor="hr-acct">Account number</label>
          <input id="hr-acct" className="tm-input" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} inputMode="numeric" maxLength={24} placeholder={file.bankAccountLast4 ? `Saved: •••• ${file.bankAccountLast4}` : ''} autoComplete="off" />
        </div>
      </div>
      <div className="tm-form-row">
        <div className="tm-field"><label htmlFor="hr-ifsc">IFSC</label><input id="hr-ifsc" className="tm-input" value={form.bankIfsc || ''} onChange={(e) => setForm((f) => ({ ...f, bankIfsc: e.target.value.toUpperCase() }))} maxLength={11} placeholder="SBIN0001234" /></div>
        <div className="tm-field"><label htmlFor="hr-upi">UPI ID</label><input id="hr-upi" className="tm-input" value={form.upiId || ''} onChange={set('upiId')} maxLength={100} placeholder="name@okicici" /></div>
        <div className="tm-field"><label htmlFor="hr-pan">PAN</label><input id="hr-pan" className="tm-input" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} maxLength={10} placeholder={file.panLast4 ? `Saved: •••••${file.panLast4}` : 'ABCDE1234F'} autoComplete="off" /></div>
      </div>
      <span className="tm-hint">Your account number and PAN are stored encrypted. Type them only to add or change them.</span>

      {error && <p className="tm-notice amber">{error}</p>}
      {message && <p className="tm-notice">{message}</p>}
      <div><button type="submit" className="tm-btn primary" disabled={busy === 'save'}>{busy === 'save' && <Spinner size={14} />} Save HR details</button></div>

      <h3 className="tm-h3">Documents</h3>
      {file.documents.length > 0 && (
        <ul className="tm-doc-list">
          {file.documents.map((d) => (
            <li key={d.id}>
              <button type="button" className="tm-link" onClick={() => openDocument(d)}><FileText size={14} /> {docLabel(d.kind)} <span className="tm-muted">· {d.name} · {formatBytes(d.size)}</span></button>
              {d.verified
                ? <span className="tm-pill green"><BadgeCheck size={12} /> Verified</span>
                : <button type="button" className="tm-btn sm ghost tm-danger" onClick={() => removeDocument(d)} disabled={busy === `rm-${d.id}`} aria-label={`Remove ${docLabel(d.kind)}`}><Trash2 size={13} /></button>}
            </li>
          ))}
        </ul>
      )}
      <div className="tm-form-row" style={{ alignItems: 'flex-end' }}>
        <div className="tm-field">
          <label htmlFor="hr-doc-kind">Add a document</label>
          <select id="hr-doc-kind" className="tm-input" value={docKind} onChange={(e) => setDocKind(e.target.value)}>
            {DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
        <div className="tm-field">
          <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => addDocument(e.target.files?.[0])} />
          <button type="button" className="tm-btn" onClick={() => input.current?.click()} disabled={busy === 'upload'}>{busy === 'upload' ? <Spinner size={14} /> : <Upload size={14} />} Upload PDF or photo</button>
        </div>
      </div>
    </form>
  );
}

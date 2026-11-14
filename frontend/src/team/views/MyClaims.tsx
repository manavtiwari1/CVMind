import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Paperclip, Receipt, X } from 'lucide-react';
import { api } from '../api';
import { Spinner } from '../ui';
import { checkFile, uploadFile } from '../upload';

// Profile → Expense claims: ask CVMind to pay back money you spent for work, and (for managers)
// approve claims from the people who report to you.
interface Claim { id: string; date: string; amount: number; categoryLabel: string; description: string; status: string; submittedByName: string; declinedReason: string; reimbursedVia: string; reimbursedOn: string }
interface Data { data: Claim[]; toApprove: Claim[]; categories: Array<{ value: string; label: string }> }

const STATUS: Record<string, [string, string]> = {
  pending_manager: ['With your manager', 'gray'], pending_hr: ['With HR', 'gray'], pending_leadership: ['With leadership', 'gray'],
  approved: ['Approved', 'green'], reimbursed: ['Paid back', 'green'], declined: ['Declined', 'amber']
};
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function MyClaims({ myId }: { myId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: todayIso(), amount: '', category: 'office_travel', description: '', paidTo: '' });
  const [file, setFile] = useState<File | null>(null);
  const [declining, setDeclining] = useState<{ id: string; reason: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => api<Data>('/me/claims').then(setData).catch((e: Error) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Add a photo or PDF of the receipt.'); return; }
    const problem = checkFile(file);
    if (problem) { setError(problem); return; }
    setBusy('send'); setError(''); setMessage('');
    try {
      const uploaded = await uploadFile(file, { scope: 'hr', scopeId: myId });
      await api('/me/claims', { method: 'POST', body: { ...form, amount: Number(form.amount), receiptFileId: uploaded.id } });
      setForm({ date: todayIso(), amount: '', category: 'office_travel', description: '', paidTo: '' });
      setFile(null);
      setOpen(false);
      setMessage('Claim sent for approval.');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const decide = async (c: Claim, approve: boolean, reason = '') => {
    setBusy(c.id);
    try {
      await api(`/claims/${c.id}/decide`, { method: 'POST', body: { approve, reason } });
      setDeclining(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const receipt = async (c: Claim) => {
    try { window.open((await api<{ url: string }>(`/claims/${c.id}/receipt`)).url, '_blank', 'noopener'); } catch (err) { setError((err as Error).message); }
  };

  return (
    <section className="tm-card pad tm-form">
      <h2 className="tm-h2"><Receipt size={16} /> Expense claims</h2>
      {!data ? (error ? <p className="tm-notice amber">{error}</p> : <Spinner size={18} />) : (
        <>
          {data.toApprove.length > 0 && (
            <>
              <h3 className="tm-h3">Waiting for your approval</h3>
              <ul className="tm-doc-list">
                {data.toApprove.map((c) => (
                  <li key={c.id} style={{ flexWrap: 'wrap' }}>
                    <button type="button" className="tm-link" onClick={() => receipt(c)}><Paperclip size={13} /> {c.submittedByName} · {inr.format(c.amount)} <span className="tm-muted">· {c.description}</span></button>
                    {declining?.id === c.id ? (
                      <span style={{ display: 'flex', gap: 6, flex: '1 1 100%' }}>
                        <input className="tm-input" autoFocus value={declining.reason} onChange={(e) => setDeclining({ id: c.id, reason: e.target.value })} maxLength={300} placeholder="Why you're declining" aria-label="Reason for declining" />
                        <button type="button" className="tm-btn sm" disabled={busy === c.id || !declining.reason.trim()} onClick={() => decide(c, false, declining.reason)}>Decline</button>
                        <button type="button" className="tm-btn sm ghost" onClick={() => setDeclining(null)}>Cancel</button>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <button type="button" className="tm-btn sm primary" disabled={busy === c.id} onClick={() => decide(c, true)}><Check size={13} /> Approve</button>
                        <button type="button" className="tm-btn sm" disabled={busy === c.id} onClick={() => setDeclining({ id: c.id, reason: '' })} aria-label="Decline"><X size={13} /></button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {data.data.length === 0 && !open && <p className="tm-muted">Spent your own money on something for CVMind (a cab, a tool)? Send a claim with the receipt and it's paid back after approval.</p>}
          {data.data.length > 0 && (
            <ul className="tm-doc-list">
              {data.data.map((c) => (
                <li key={c.id}>
                  <span>
                    <strong>{inr.format(c.amount)}</strong> <span className="tm-muted">· {c.description} · {c.categoryLabel}</span>
                    {c.declinedReason && <span className="tm-muted"> · {c.declinedReason}</span>}
                  </span>
                  <span className={`tm-pill ${STATUS[c.status]?.[1] || 'gray'}`}>{STATUS[c.status]?.[0] || c.status}</span>
                </li>
              ))}
            </ul>
          )}
          {open ? (
            <form onSubmit={submit} className="tm-form">
              <div className="tm-form-row">
                <div className="tm-field"><label htmlFor="cl-date">Date</label><input id="cl-date" type="date" className="tm-input" value={form.date} max={todayIso()} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
                <div className="tm-field"><label htmlFor="cl-amt">Amount (₹)</label><input id="cl-amt" type="number" min={1} step="0.01" className="tm-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              </div>
              <div className="tm-form-row">
                <div className="tm-field">
                  <label htmlFor="cl-cat">Category</label>
                  <select id="cl-cat" className="tm-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{data.categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                </div>
                <div className="tm-field"><label htmlFor="cl-to">Paid to</label><input id="cl-to" className="tm-input" value={form.paidTo} onChange={(e) => setForm({ ...form, paidTo: e.target.value })} maxLength={120} placeholder="Uber" /></div>
              </div>
              <div className="tm-field"><label htmlFor="cl-desc">What it was for</label><input id="cl-desc" className="tm-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} required placeholder="Cab to the college placement drive" /></div>
              <div>
                <input ref={input} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <button type="button" className="tm-btn sm" onClick={() => input.current?.click()}><Paperclip size={13} /> {file ? file.name : 'Attach the receipt'}</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="tm-btn primary" disabled={busy === 'send'}>{busy === 'send' && <Spinner size={13} />} Send claim</button>
                <button type="button" className="tm-btn" onClick={() => setOpen(false)}>Cancel</button>
              </div>
            </form>
          ) : <div><button type="button" className="tm-btn" onClick={() => setOpen(true)}>New claim</button></div>}
          {error && <p className="tm-notice amber">{error}</p>}
          {message && <p className="tm-notice">{message}</p>}
        </>
      )}
    </section>
  );
}

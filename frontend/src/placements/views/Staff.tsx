import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, Trash2, UserPlus } from 'lucide-react';
import { api } from '../api';
import type { Staff } from '../api';
import { Spinner } from '../ui';
import { errorText, fmtDate, usePortal } from '../portal';

export default function StaffView() {
  const { staff: me, readOnly, toast } = usePortal();
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [max, setMax] = useState(10);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api<{ data: Staff[]; max: number }>('/staff').then((r) => { setRows(r.data); setMax(r.max); }, (err) => toast(errorText(err), 'error'));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const emailNote = (r: { emailSent: boolean; emailError: string }, ok: string) => (r.emailSent ? toast(ok) : toast(`Saved, but the email failed: ${r.emailError}`, 'error'));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('add');
    try {
      const r = await api<{ emailSent: boolean; emailError: string }>('/staff', { method: 'POST', body: { email, name } });
      emailNote(r, 'Login details emailed.');
      setEmail('');
      setName('');
      load();
    } catch (err) {
      toast(errorText(err), 'error');
    } finally {
      setBusy('');
    }
  };

  const act = async (id: string, label: string, fn: () => Promise<{ emailSent?: boolean; emailError?: string }>, ok: string) => {
    setBusy(`${label}:${id}`);
    try {
      const r = await fn();
      if (r.emailSent === false) toast(`Saved, but the email failed: ${r.emailError}`, 'error'); else toast(ok);
      load();
    } catch (err) {
      toast(errorText(err), 'error');
    } finally {
      setBusy('');
    }
  };

  const active = (rows || []).filter((r) => r.active);

  return (
    <>
      <div className="pl-head">
        <div>
          <h1>Staff</h1>
          <p>Faculty coordinators who can see students, review resumes and download them. Up to {max} logins.</p>
        </div>
      </div>

      {!readOnly && (
        <form className="pl-card pad" onSubmit={add} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="pl-field" style={{ flex: '1 1 220px' }}>
            <label htmlFor="st-email">Work email</label>
            <input id="st-email" className="pl-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="pl-field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="st-name">Name</label>
            <input id="st-name" className="pl-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="pl-btn primary" disabled={!!busy || !email || active.length >= max}>{busy === 'add' ? <Spinner size={14} /> : <UserPlus size={15} />} Add and email login</button>
        </form>
      )}

      <div className="pl-card">
        {!rows ? <div className="pl-center"><Spinner /></div> : (
          <div className="pl-table-wrap">
            <table className="pl-table">
              <thead><tr><th>Name</th><th>Role</th><th>Last sign-in</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="pl-name"><b>{r.name}</b><span>{r.email}</span></td>
                    <td>{r.role === 'admin' ? 'College admin' : 'Staff'}</td>
                    <td>{fmtDate(r.lastLoginAt)}</td>
                    <td>{!r.active ? <span className="pl-badge">Removed</span> : r.mustChangePassword ? <span className="pl-badge amber">Hasn't signed in</span> : <span className="pl-badge green">Active</span>}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!readOnly && r.role !== 'admin' && r.id !== me.id && <>
                        <button type="button" className="pl-btn sm" disabled={!!busy} onClick={() => act(r.id, 'reset', () => api(`/staff/${r.id}/reset`, { method: 'POST' }), 'A new password was emailed.')}>{busy === `reset:${r.id}` ? <Spinner size={13} /> : <KeyRound size={13} />} {r.active ? 'Reset password' : 'Restore'}</button>{' '}
                        {r.active && <button type="button" className="pl-btn sm danger" disabled={!!busy} aria-label={`Remove ${r.email}`} onClick={() => act(r.id, 'remove', () => api(`/staff/${r.id}`, { method: 'DELETE' }), 'Login removed.')}><Trash2 size={13} /></button>}
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="pl-muted pl-small">To change the college admin login, write to CVMind support.</p>
    </>
  );
}

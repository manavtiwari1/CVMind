import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { RefreshCw, Trash2, Upload } from 'lucide-react';
import { api } from '../api';
import type { ImportRow, RowError, StudentRow } from '../api';
import { toImportRows } from '../csv';
import { Spinner, StatusBadge } from '../ui';
import { errorText, fmtDate, usePortal } from '../portal';

const SAMPLE = 'Email,Name,Roll no,Branch,Batch\nriya.sharma@gmail.com,Riya Sharma,21CS001,CSE,2026\n';

export default function Invite() {
  const { readOnly, toast } = usePortal();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<{ valid: number; errors: RowError[]; seatsFree: number } | null>(null);
  const [result, setResult] = useState<{ invited: number; errors: RowError[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [paste, setPaste] = useState('');
  const [reload, setReload] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const load = async (text: string, name: string) => {
    setResult(null);
    setPreview(null);
    const parsed = toImportRows(text);
    setFileName(name);
    if (parsed.error) { setError(parsed.error); setRows(null); return; }
    setError('');
    setRows(parsed.rows);
    setBusy(true);
    try {
      setPreview(await api('/students/preview', { method: 'POST', body: { rows: parsed.rows } }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Use a CSV file under 2 MB.'); return; }
    if (!/\.(csv|txt|tsv)$/i.test(file.name)) { setError('Save the sheet as CSV (File → Download → CSV in Google Sheets, or Save As → CSV in Excel).'); return; }
    await load(await file.text(), file.name);
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); pickFile(e.dataTransfer.files?.[0]); };

  const send = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      const r = await api<{ invited: number; errors: RowError[] }>('/students/import', { method: 'POST', body: { rows } });
      setResult(r);
      setRows(null);
      setPreview(null);
      setPaste('');
      setReload((n) => n + 1);
      toast(`${r.invited} ${r.invited === 1 ? 'invitation' : 'invitations'} sent.`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const sampleHref = `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE)}`;

  return (
    <>
      <div className="pl-head">
        <div>
          <h1>Add students</h1>
          <p>Upload your student list. Each student gets an email invitation and joins with that email.</p>
        </div>
      </div>

      {readOnly ? <div className="pl-notice amber">You can't add students while the portal is read-only.</div> : (
        <div className="pl-card pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={`pl-drop${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
            <Upload size={26} />
            <b style={{ color: 'var(--pl-text)' }}>Drop a CSV file here</b>
            <span className="pl-small">Columns: Email (required), Name, Roll no, Branch, Batch · up to 2,000 students at a time</span>
            <div className="pl-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="pl-btn" onClick={() => input.current?.click()}>Choose file</button>
              <a className="pl-link pl-small" href={sampleHref} download="students-sample.csv">Download a sample</a>
            </div>
            <input ref={input} type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <details>
            <summary className="pl-small" style={{ cursor: 'pointer', fontWeight: 600 }}>Or paste from a spreadsheet</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <textarea className="pl-textarea" rows={6} placeholder={SAMPLE} value={paste} onChange={(e) => setPaste(e.target.value)} aria-label="Pasted students" />
              <div><button type="button" className="pl-btn" disabled={!paste.trim() || busy} onClick={() => load(paste, 'Pasted list')}>Check list</button></div>
            </div>
          </details>

          {error && <div className="pl-notice red">{error}</div>}
          {busy && !preview && <div className="pl-center" style={{ minHeight: 60 }}><Spinner /> Checking the list…</div>}

          {preview && rows && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className={`pl-notice ${preview.valid ? 'green' : 'amber'}`}>
                <b>{fileName}</b>: {rows.length} rows. {preview.valid} will get an invitation{preview.errors.length ? `, ${preview.errors.length} will be skipped` : ''}. {preview.seatsFree} seats free on your plan.
              </div>
              {preview.errors.length > 0 && <RowErrors errors={preview.errors} />}
              <div className="pl-actions">
                <button type="button" className="pl-btn primary" disabled={busy || !preview.valid} onClick={send}>{busy && <Spinner size={14} />} Send {preview.valid} {preview.valid === 1 ? 'invitation' : 'invitations'}</button>
                <button type="button" className="pl-btn" disabled={busy} onClick={() => { setRows(null); setPreview(null); }}>Cancel</button>
              </div>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="pl-notice green">{result.invited} {result.invited === 1 ? 'invitation was' : 'invitations were'} sent. Students appear on the Students page as they accept.</div>
              {result.errors.length > 0 && <RowErrors errors={result.errors} />}
            </div>
          )}
        </div>
      )}

      <Pending key={reload} />
    </>
  );
}

function RowErrors({ errors }: { errors: RowError[] }) {
  return (
    <div className="pl-card pl-table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
      <table className="pl-table">
        <thead><tr><th>Row</th><th>Email</th><th>Skipped because</th></tr></thead>
        <tbody>{errors.map((e) => <tr key={`${e.row}-${e.email}`}><td>{e.row}</td><td>{e.email || '—'}</td><td>{e.error}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

// Students who haven't joined: resend or take them off the list
function Pending() {
  const { readOnly, toast } = usePortal();
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    Promise.all(['invited', 'declined', 'left'].map((status) => api<{ data: StudentRow[] }>('/students', { query: { status, limit: 200 } })))
      .then((r) => setRows(r.flatMap((x) => x.data)), (err) => toast(errorText(err), 'error'));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, label: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(`${label}:${id}`);
    try { await fn(); toast(done); load(); } catch (err) { toast(errorText(err), 'error'); } finally { setBusy(''); }
  };

  return (
    <div className="pl-card">
      <h2 style={{ padding: '16px 16px 0' }}>Not joined yet</h2>
      {!rows ? <div className="pl-center"><Spinner /></div> : rows.length === 0 ? <p className="pl-muted" style={{ padding: 16 }}>Everyone you invited has joined.</p> : (
        <div className="pl-table-wrap">
          <table className="pl-table">
            <thead><tr><th>Student</th><th>Roll no</th><th>Status</th><th>Invited</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="pl-name"><b>{r.name || '—'}</b><span>{r.email}</span></td>
                  <td>{r.rollNo || '—'}</td>
                  <td><StatusBadge status={r.status} />{r.inviteError && <span className="pl-badge red" style={{ marginLeft: 4 }}>Email failed</span>}</td>
                  <td>{fmtDate(r.invitedAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {!readOnly && <>
                      <button type="button" className="pl-btn sm" disabled={!!busy} onClick={() => act(r.id, 'resend', () => api(`/students/${r.id}/resend`, { method: 'POST' }), 'Invitation sent again.')}>{busy === `resend:${r.id}` ? <Spinner size={13} /> : <RefreshCw size={13} />} {r.status === 'invited' ? 'Resend' : 'Invite again'}</button>{' '}
                      <button type="button" className="pl-btn sm danger" disabled={!!busy} aria-label={`Remove ${r.email}`} onClick={() => act(r.id, 'remove', () => api(`/students/${r.id}`, { method: 'DELETE' }), 'Removed from your list.')}><Trash2 size={13} /></button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

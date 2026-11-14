import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, FileSignature } from 'lucide-react';
import { api, downloadFile } from '../api';
import { Spinner } from '../ui';

// Profile → Letters: offer letters and certificates CVMind has issued, and asking HR for a new one
interface Letter { id: string; number: string; typeLabel: string; title: string; issuedOn: string; status: 'valid' | 'revoked'; verifyUrl: string }
interface Request { id: string; typeLabel: string; note: string; status: 'pending' | 'issued' | 'declined'; reply: string }
interface LetterType { value: string; label: string }

const day = (v: string) => new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function MyLetters() {
  const [data, setData] = useState<{ data: Letter[]; requests: Request[]; types: LetterType[] } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [type, setType] = useState('experience');
  const [note, setNote] = useState('');

  const load = useCallback(() => api<{ data: Letter[]; requests: Request[]; types: LetterType[] }>('/me/letters').then(setData).catch((e: Error) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const request = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('ask'); setError(''); setMessage('');
    try {
      await api('/me/letter-requests', { method: 'POST', body: { type, note } });
      setNote('');
      setMessage('Sent to HR. You will get a notification when it is ready.');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const download = async (l: Letter) => {
    setBusy(l.id);
    try { await downloadFile(`/me/letters/${l.id}/pdf`, `${l.number}.pdf`); } catch (err) { setError((err as Error).message); } finally { setBusy(null); }
  };

  const pending = (data?.requests || []).filter((r) => r.status !== 'issued');

  return (
    <section className="tm-card pad tm-form">
      <h2 className="tm-h2"><FileSignature size={16} /> Letters and certificates</h2>
      {!data ? (error ? <p className="tm-notice amber">{error}</p> : <Spinner size={18} />) : (
        <>
          {data.data.length === 0 ? <p className="tm-muted">No letters yet. Offer letters, certificates and experience letters CVMind issues to you show up here.</p> : (
            <ul className="tm-doc-list">
              {data.data.map((l) => (
                <li key={l.id}>
                  <span>
                    <strong>{l.title}</strong>
                    <span className="tm-muted"> · {day(l.issuedOn)} · {l.number}</span>
                    {l.status === 'revoked' && <span className="tm-pill amber" style={{ marginLeft: 6 }}>Revoked</span>}
                  </span>
                  <button type="button" className="tm-btn sm" onClick={() => download(l)} disabled={busy === l.id}>{busy === l.id ? <Spinner size={13} /> : <Download size={13} />} PDF</button>
                </li>
              ))}
            </ul>
          )}
          {pending.length > 0 && (
            <ul className="tm-doc-list">
              {pending.map((r) => (
                <li key={r.id}>
                  <span>{r.typeLabel}{r.reply && <span className="tm-muted"> · {r.reply}</span>}</span>
                  <span className={`tm-pill ${r.status === 'declined' ? 'amber' : 'gray'}`}>{r.status === 'declined' ? 'Declined' : 'Asked'}</span>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={request} className="tm-form-row" style={{ alignItems: 'flex-end' }}>
            <div className="tm-field">
              <label htmlFor="lt-ask">Ask HR for a letter</label>
              <select id="lt-ask" className="tm-input" value={type} onChange={(e) => setType(e.target.value)}>
                {data.types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="tm-field">
              <label htmlFor="lt-note">What it's for (optional)</label>
              <input id="lt-note" className="tm-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Visa application" />
            </div>
            <div><button type="submit" className="tm-btn" disabled={busy === 'ask'}>{busy === 'ask' && <Spinner size={13} />} Ask HR</button></div>
          </form>
          {error && <p className="tm-notice amber">{error}</p>}
          {message && <p className="tm-notice">{message}</p>}
        </>
      )}
    </section>
  );
}

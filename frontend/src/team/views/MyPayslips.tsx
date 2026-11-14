import { useEffect, useState } from 'react';
import { Download, Wallet } from 'lucide-react';
import { api, downloadFile } from '../api';
import { Spinner } from '../ui';

// Profile → Payslips: every month CVMind has paid, with its PDF
interface Payslip { id: string; month: string; netPay: number; payType: string; paidOn: string; payslipNumber: string; bonus: number; deductions: number; reimbursements: number; unpaidDays: number }

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const monthName = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export function MyPayslips() {
  const [rows, setRows] = useState<Payslip[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<{ data: Payslip[] }>('/me/payslips').then((r) => setRows(r.data)).catch((e: Error) => setError(e.message));
  }, []);

  const download = async (p: Payslip) => {
    setBusy(p.id);
    try {
      await downloadFile(`/me/payslips/${p.id}/pdf`, `payslip-${p.month}.pdf`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="tm-card pad tm-form">
      <h2 className="tm-h2"><Wallet size={16} /> Payslips</h2>
      {error && <p className="tm-notice amber">{error}</p>}
      {!rows ? (!error && <Spinner size={18} />) : rows.length === 0 ? (
        <p className="tm-muted">No payslips yet. When HR marks your stipend or salary as paid, the payslip shows up here.</p>
      ) : (
        <ul className="tm-doc-list">
          {rows.map((p) => (
            <li key={p.id}>
              <span>
                <strong>{monthName(p.month)}</strong> · {inr.format(p.netPay)}
                <span className="tm-muted"> · paid {new Date(`${p.paidOn}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{p.unpaidDays ? ` · ${p.unpaidDays} unpaid day${p.unpaidDays === 1 ? '' : 's'}` : ''}</span>
              </span>
              <button type="button" className="tm-btn sm" onClick={() => download(p)} disabled={busy === p.id}>{busy === p.id ? <Spinner size={13} /> : <Download size={13} />} PDF</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

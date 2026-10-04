import { useState } from 'react';
import { FileJson, FileSpreadsheet } from 'lucide-react';
import { downloadExport } from '../api';
import { useApi, useToast } from '../hooks';
import { Card, Empty, ErrorState, PageHeader, Spinner } from '../ui';

interface Report { key: string; label: string; columns: string[] }

const DESCRIPTIONS: Record<string, string> = {
  users: 'Every account with sign-in method, status and join date.',
  payments: 'Transactions with amounts, methods, coupons and refunds.',
  'ai-usage': 'One row per AI request, across every tool.',
  tickets: 'Support tickets with status, priority and assignee.',
  coupons: 'Every coupon with its limits and how often it was used.',
  audit: 'Every admin action: who did what, and when.'
};

const DATED = new Set(['users', 'payments', 'ai-usage', 'tickets', 'audit']);

export default function Reports() {
  const { data, error, reload } = useApi<{ data: Report[] }>('/reports');
  const toast = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (key: string, format: 'csv' | 'json') => {
    setBusy(`${key}-${format}`);
    try {
      await downloadExport(key, { format, from: DATED.has(key) ? from : '', to: DATED.has(key) ? to : '' });
      toast('Download started');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Export failed.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Reports & exports" description="Download real data as CSV (opens in Excel or Google Sheets) or JSON. Every export is recorded in the audit log." />
      <Card title="Date range" description="Applies to reports with dates. Leave empty for everything.">
        <div className="ad-toolbar">
          <div className="ad-field" style={{ margin: 0 }}>
            <label htmlFor="r-from">From</label>
            <input id="r-from" className="ad-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="ad-field" style={{ margin: 0 }}>
            <label htmlFor="r-to">To</label>
            <input id="r-to" className="ad-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(from || to) && <button type="button" className="ad-btn ghost" style={{ alignSelf: 'flex-end' }} onClick={() => { setFrom(''); setTo(''); }}>Clear</button>}
        </div>
      </Card>
      {error && !data ? <Card><ErrorState message={error} onRetry={reload} /></Card> : !data ? <Card><div className="ad-skeleton" style={{ height: 160 }} /></Card> : data.data.length === 0 ? (
        <Card><Empty title="No reports for your role" /></Card>
      ) : (
        <div className="ad-grid cols-3">
          {data.data.map((r) => (
            <div key={r.key} className="ad-card ad-stat" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="ad-stat-top">
                <span className="ad-cell-title">{r.label}</span>
                <span className="ad-stat-icon purple"><FileSpreadsheet size={16} /></span>
              </div>
              <p className="ad-muted ad-small" style={{ margin: '8px 0 4px', flex: 1 }}>{DESCRIPTIONS[r.key] || ''}</p>
              <p className="ad-hint" style={{ margin: '0 0 14px' }}>{r.columns.length} columns{DATED.has(r.key) && (from || to) ? ' · date range applied' : ''}</p>
              <div className="ad-actions-row">
                <button type="button" className="ad-btn primary sm" disabled={!!busy} onClick={() => download(r.key, 'csv')}>
                  {busy === `${r.key}-csv` ? <Spinner size={13} /> : <FileSpreadsheet size={14} />} CSV
                </button>
                <button type="button" className="ad-btn sm" disabled={!!busy} onClick={() => download(r.key, 'json')}>
                  {busy === `${r.key}-json` ? <Spinner size={13} /> : <FileJson size={14} />} JSON
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

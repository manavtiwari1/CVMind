import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { downloadExport } from '../api';
import type { Paged } from '../api';
import { useAdmin, useApi, useDebounced } from '../hooks';
import { ago, dateTime } from '../format';
import { Badge, Card, DataTable, Empty, Modal, PageHeader, Pagination, SearchInput, Select } from '../ui';

interface Entry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  details: unknown;
  ip: string;
  createdAt: string;
}

// "user.suspended" → "User suspended"
const actionLabel = (a: string) => a.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const ACTION_TONE = (a: string) =>
  /deleted|banned|revoked|refunded|removed|suspended|withdrawn|hidden|signed_out/.test(a) ? 'red'
    : /login/.test(a) ? 'gray'
      : /created|added|granted|verified|reactivated|restored|sent|replied/.test(a) ? 'green'
        : 'blue';

export default function AuditLog() {
  const { can } = useAdmin();
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const query = { q: search, action, from, to };
  const { data, error, loading, reload } = useApi<Paged<Entry> & { actions: string[] }>('/audit', { ...query, page, limit: 50 });
  const [open, setOpen] = useState<Entry | null>(null);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change made in the admin panel, who made it and when. Entries can't be edited or deleted."
        actions={can('reports.export') && <button type="button" className="ad-btn" onClick={() => downloadExport('audit', query)}>Export CSV</button>}
      />
      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search person, action or target" />
          <Select label="Action" value={action} onChange={(v) => { setAction(v); setPage(1); }} options={[{ value: '', label: 'All actions' }, ...(data?.actions || []).map((a) => ({ value: a, label: actionLabel(a) }))]} />
          <input className="ad-input" style={{ width: 'auto' }} type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="From date" />
          <input className="ad-input" style={{ width: 'auto' }} type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="To date" />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(e) => e.id}
          onRowClick={(e) => setOpen(e)}
          empty={<Empty icon={<ScrollText size={20} />} title="No activity yet" text="Actions taken in the admin panel show up here." />}
          columns={[
            { key: 'when', header: 'When', render: (e) => <span className="muted" title={dateTime(e.createdAt)}>{ago(e.createdAt)}</span> },
            { key: 'who', header: 'Who', render: (e) => <div><div className="ad-cell-title">{e.actorName || '—'}</div><div className="ad-cell-sub">{e.actorRole}</div></div> },
            { key: 'action', header: 'Action', render: (e) => <Badge tone={ACTION_TONE(e.action)}>{actionLabel(e.action)}</Badge> },
            { key: 'target', header: 'Target', render: (e) => <div style={{ maxWidth: 340 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.targetLabel || e.targetId || '—'}</div><div className="ad-cell-sub">{e.targetType}</div></div> },
            { key: 'ip', header: 'IP', render: (e) => <span className="ad-mono muted">{e.ip || '—'}</span> }
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>
      {open && (
        <Modal title={actionLabel(open.action)} description={`${open.actorName} (${open.actorRole}) · ${dateTime(open.createdAt)}`} onClose={() => setOpen(null)} wide footer={<button type="button" className="ad-btn" onClick={() => setOpen(null)}>Close</button>}>
          <dl className="ad-kv">
            <dt>Target</dt><dd>{open.targetLabel || '—'}</dd>
            <dt>Type</dt><dd>{open.targetType || '—'}</dd>
            <dt>Target ID</dt><dd className="ad-mono">{open.targetId || '—'}</dd>
            <dt>IP address</dt><dd className="ad-mono">{open.ip || '—'}</dd>
          </dl>
          {open.details !== null && open.details !== undefined && (
            <>
              <div className="ad-section-title" style={{ marginTop: 18 }}>Details</div>
              <pre className="ad-pre">{JSON.stringify(open.details, null, 2)}</pre>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

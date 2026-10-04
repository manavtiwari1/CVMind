import { useState } from 'react';
import { Eye, EyeOff, Flag, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Paged } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { ago, date, dateTime } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Drawer, Empty, ErrorState, PageHeader, Pagination, Person, SearchInput, Select, Spinner, StatusBadge, Tabs } from '../ui';

type View = 'reports' | 'work' | 'job' | 'problem';

interface Report {
  id: string;
  targetType: 'work' | 'job' | 'problem' | 'user';
  targetId: string;
  targetLabel: string;
  targetHidden: boolean | null;
  reason: string;
  details: string;
  reporterEmail: string;
  status: string;
  resolution: string;
  resolvedBy: string;
  resolvedAt: string | null;
  createdAt: string;
}

interface Item {
  id: string;
  title: string;
  kind: string;
  hidden: boolean;
  hiddenReason?: string;
  owner: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt?: string;
}

const TYPE_LABELS: Record<string, string> = { work: 'Document', job: 'Job post', problem: 'Coding problem', user: 'User' };

export default function Moderation() {
  const { refreshBadges } = useAdmin();
  const [view, setView] = useState<View>('reports');
  const [reportStatus, setReportStatus] = useState('open');
  const [q, setQ] = useState('');
  const [hiddenOnly, setHiddenOnly] = useState('');
  const [workType, setWorkType] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const reports = useApi<Paged<Report> & { open: number }>(view === 'reports' ? '/content/moderation/reports' : null, { status: reportStatus, page, limit: 25 });
  const items = useApi<Paged<Item> & { workTypes?: string[] }>(view !== 'reports' ? '/content/moderation/items' : null, { type: view, q: search, hidden: hiddenOnly, workType: view === 'work' ? workType : '', page, limit: 25 });
  const [reviewing, setReviewing] = useState<{ type: string; id: string } | null>(null);
  const { busy, run } = useAction();

  const switchView = (v: View) => { setView(v); setPage(1); setQ(''); setHiddenOnly(''); };
  const changed = () => { reports.reload(); items.reload(); refreshBadges(); };

  return (
    <>
      <PageHeader title="Moderation" description="Review content people reported, and browse what users publish: shared resumes and portfolios, company job posts and AI-generated coding problems." />
      <Tabs<View>
        active={view}
        onChange={switchView}
        tabs={[
          { id: 'reports', label: 'Reports', count: reports.data?.open },
          { id: 'work', label: 'Documents' },
          { id: 'job', label: 'Job posts' },
          { id: 'problem', label: 'Coding problems' }
        ]}
      />

      {view === 'reports' ? (
        <Card bodyClass={false}>
          <div className="ad-toolbar">
            <Select label="Report status" value={reportStatus} onChange={(v) => { setReportStatus(v); setPage(1); }} options={[{ value: 'open', label: 'Open' }, { value: 'actioned', label: 'Actioned' }, { value: 'dismissed', label: 'Dismissed' }, { value: '', label: 'All' }]} />
          </div>
          <DataTable
            rows={reports.data?.data}
            loading={reports.loading}
            error={reports.error}
            onRetry={reports.reload}
            rowKey={(r) => r.id}
            empty={<Empty icon={<ShieldCheck size={20} />} title={reportStatus === 'open' ? 'No open reports' : 'No reports'} text={reportStatus === 'open' ? 'Nothing is waiting for review.' : undefined} />}
            columns={[
              { key: 'target', header: 'Reported', render: (r) => (
                <div>
                  <div className="ad-cell-title">{r.targetLabel}</div>
                  <div className="ad-cell-sub">{TYPE_LABELS[r.targetType]}{r.targetHidden && ' · hidden'}</div>
                </div>
              ) },
              { key: 'reason', header: 'Reason', render: (r) => <div style={{ maxWidth: 300 }}><Badge tone="amber">{r.reason}</Badge>{r.details && <div className="ad-cell-sub" style={{ marginTop: 4 }}>{r.details}</div>}</div> },
              { key: 'by', header: 'Reported by', render: (r) => <span className="muted">{r.reporterEmail || 'Anonymous'}</span> },
              { key: 'when', header: 'When', render: (r) => <span className="muted" title={dateTime(r.createdAt)}>{ago(r.createdAt)}</span> },
              { key: 'status', header: 'Status', render: (r) => <span title={r.resolution || undefined}><StatusBadge status={r.status} /></span> },
              { key: 'actions', header: '', className: 'actions', render: (r) => (
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  {r.targetLabel !== '(deleted)' && r.targetType !== 'user' && <button type="button" className="ad-btn sm" onClick={() => setReviewing({ type: r.targetType, id: r.targetId })}>Review</button>}
                  {r.status === 'open' && (
                    <button type="button" className="ad-btn sm ghost" disabled={busy === r.id} onClick={() => run(r.id, () => api(`/content/moderation/reports/${r.id}/resolve`, { method: 'POST', body: { status: 'dismissed', note: 'No action needed' } }), 'Report dismissed').then((ok) => ok !== undefined && changed())}>Dismiss</button>
                  )}
                </span>
              ) }
            ]}
          />
          {reports.data && <Pagination page={reports.data.page} limit={reports.data.limit} total={reports.data.total} onPage={setPage} />}
        </Card>
      ) : (
        <Card bodyClass={false}>
          <div className="ad-toolbar">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={view === 'job' ? 'Search title or company' : 'Search by title'} />
            {view === 'work' && (
              <Select label="Document type" value={workType} onChange={(v) => { setWorkType(v); setPage(1); }} options={[{ value: '', label: 'All types' }, ...(items.data?.workTypes || []).map((t) => ({ value: t, label: t }))]} />
            )}
            <Select label="Visibility" value={hiddenOnly} onChange={(v) => { setHiddenOnly(v); setPage(1); }} options={[{ value: '', label: 'Visible and hidden' }, { value: 'true', label: 'Hidden only' }]} />
          </div>
          <DataTable
            rows={items.data?.data}
            loading={items.loading}
            error={items.error}
            onRetry={items.reload}
            rowKey={(i) => i.id}
            onRowClick={(i) => setReviewing({ type: view, id: i.id })}
            empty={<Empty title="Nothing found" />}
            columns={[
              { key: 'title', header: 'Title', render: (i) => <div style={{ maxWidth: 380 }}><div className="ad-cell-title">{i.title}</div><div className="ad-cell-sub">{i.kind}</div></div> },
              { key: 'owner', header: view === 'job' ? '' : 'Owner', render: (i) => i.owner ? <Person name={i.owner.name} email={i.owner.email} /> : view === 'job' ? null : <span className="muted">Signed out / unknown</span> },
              { key: 'visible', header: 'Visibility', render: (i) => i.hidden ? <span title={i.hiddenReason}><StatusBadge status="hidden" /></span> : <Badge tone="green" dot>Visible</Badge> },
              { key: 'date', header: 'Created', render: (i) => <span className="muted">{date(i.createdAt)}</span> },
              { key: 'actions', header: '', className: 'actions', render: (i) => <button type="button" className="ad-btn sm" onClick={() => setReviewing({ type: view, id: i.id })}>Review</button> }
            ]}
          />
          {items.data && <Pagination page={items.data.page} limit={items.data.limit} total={items.data.total} onPage={setPage} />}
        </Card>
      )}

      {reviewing && (
        <ReviewDrawer
          type={reviewing.type}
          id={reviewing.id}
          openReports={(reports.data?.data || []).filter((r) => r.targetType === reviewing.type && r.targetId === reviewing.id && r.status === 'open')}
          onClose={() => setReviewing(null)}
          onChanged={changed}
        />
      )}
    </>
  );
}

interface Preview {
  id: string;
  type: string;
  title: string;
  owner: { id: string; name: string; email: string } | null;
  hidden: boolean;
  preview: { format: 'html' | 'json' | 'text'; content: string };
}

function ReviewDrawer({ type, id, openReports, onClose, onChanged }: { type: string; id: string; openReports: Report[]; onClose: () => void; onChanged: () => void }) {
  const { can, go } = useAdmin();
  const { data, error, reload } = useApi<{ data: Preview }>(`/content/moderation/items/${type}/${encodeURIComponent(id)}`);
  const { busy, run } = useAction();
  const [confirm, setConfirm] = useState<'hide' | 'delete' | null>(null);
  const p = data?.data;
  const hidden = p?.hidden;

  const resolveReports = (note: string) => Promise.all(openReports.map((r) => api(`/content/moderation/reports/${r.id}/resolve`, { method: 'POST', body: { status: 'actioned', note } })));

  return (
    <Drawer
      title={p?.title || 'Review'}
      subtitle={TYPE_LABELS[type]}
      onClose={onClose}
      footer={p && (
        <>
          {hidden ? (
            <button type="button" className="ad-btn" disabled={busy === 'restore'} onClick={() => run('restore', () => api(`/content/moderation/items/${type}/${encodeURIComponent(id)}/hide`, { method: 'POST', body: { hidden: false } }), 'Visible again').then((ok) => { if (ok !== undefined) { reload(); onChanged(); } })}>
              <Eye size={14} /> Make visible
            </button>
          ) : (
            <button type="button" className="ad-btn" onClick={() => setConfirm('hide')}><EyeOff size={14} /> Hide</button>
          )}
          <button type="button" className="ad-btn danger-outline" onClick={() => setConfirm('delete')}><Trash2 size={14} /> Delete</button>
        </>
      )}
    >
      {error && !p ? <ErrorState message={error} onRetry={reload} /> : !p ? <div className="ad-empty"><Spinner size={20} /></div> : (
        <>
          {openReports.length > 0 && (
            <div className="ad-notice amber" style={{ marginBottom: 16 }}>
              <Flag size={16} />
              <div>{openReports.length} open {openReports.length === 1 ? 'report' : 'reports'}: {openReports.map((r) => r.reason).join(', ')}</div>
            </div>
          )}
          {p.owner && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Person name={p.owner.name} email={p.owner.email} />
              {can('users.view') && <button type="button" className="ad-link ad-small" onClick={() => go('users', { id: p.owner!.id })}>Open user</button>}
            </div>
          )}
          {p.preview.format === 'html' ? (
            // Sandboxed: no scripts, no same-origin access, no forms
            <iframe className="ad-preview-frame" title="Content preview" sandbox="" srcDoc={p.preview.content} />
          ) : (
            <pre className="ad-pre">{p.preview.format === 'json' ? prettyJson(p.preview.content) : p.preview.content}</pre>
          )}
        </>
      )}

      {confirm === 'hide' && (
        <ConfirmDialog
          title="Hide this content?"
          description={type === 'work' ? 'The public link stops working. The owner still sees it in their account.' : type === 'job' ? 'The job disappears from the public job board.' : 'The problem disappears from the problem list.'}
          confirmLabel="Hide"
          danger
          reason={{ label: 'Reason (for your team)', required: true, placeholder: 'e.g. Spam links' }}
          busy={busy === 'hide'}
          onClose={() => setConfirm(null)}
          onConfirm={async (reason) => {
            const ok = await run('hide', async () => {
              await api(`/content/moderation/items/${type}/${encodeURIComponent(id)}/hide`, { method: 'POST', body: { reason } });
              await resolveReports(`Hidden: ${reason}`);
            }, 'Content hidden');
            setConfirm(null);
            if (ok !== undefined) { reload(); onChanged(); }
          }}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title="Delete this content for good?"
          description="It can't be restored. Open reports about it are closed."
          confirmLabel="Delete"
          danger
          busy={busy === 'delete'}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const ok = await run('delete', () => api(`/content/moderation/items/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' }), 'Deleted');
            setConfirm(null);
            if (ok !== undefined) { onChanged(); onClose(); }
          }}
        />
      )}
    </Drawer>
  );
}

function prettyJson(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

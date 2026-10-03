import { useState } from 'react';
import { AlertTriangle, ClipboardList, ExternalLink, RotateCcw, XCircle } from 'lucide-react';
import { api } from '../api';
import type { Paged } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { ago, count, dateTime } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Empty, Modal, Notice, PageHeader, Pagination, Person, SearchInput, Select, Spinner, StatCard, StatusBadge, Tabs } from '../ui';

type View = 'auto-apply' | 'company';

interface QueueJob { id: string; queue: string; status: string; attempts: number; maxAttempts: number; lastError: string; runAt: string; stuck: boolean }
interface AutoApp {
  id: string;
  status: string;
  step: string;
  decision: string;
  score: number | null;
  error: string;
  user: { id: string; name: string; email: string };
  job: { title: string; company: string; location: string; ats: string; url: string } | null;
  queueJobs: QueueJob[];
  createdAt: string;
  updatedAt: string;
}
interface CompanyApp {
  id: string;
  status: string;
  mode: string;
  matchScore: number;
  candidate: { name: string; email: string };
  job: { id: string; title: string; company: string };
  events: Array<{ title: string; actor: string; timestamp: string }>;
  appliedAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = { pending: 'Pending', matched: 'Matched', tailoring: 'Tailoring', ready_for_review: 'Ready for review', submitted: 'Submitted', failed: 'Failed' };

export default function Orders() {
  const [view, setView] = useState<View>('auto-apply');
  return (
    <>
      <PageHeader title="Applications" description="Job applications people make through CVMind: Auto Apply runs and applications to companies on the Company Portal. Fix stuck ones here." />
      <Tabs<View> active={view} onChange={setView} tabs={[{ id: 'auto-apply', label: 'Auto Apply' }, { id: 'company', label: 'Company Portal' }]} />
      {view === 'auto-apply' ? <AutoApplyList /> : <CompanyList />}
    </>
  );
}

function AutoApplyList() {
  const { can, go } = useAdmin();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<Paged<AutoApp> & { counts: Record<string, number>; queue: Record<string, number>; statuses: string[] }>('/orders/auto-apply', { status, q: search, page, limit: 25 });
  const { busy, run } = useAction();
  const [overriding, setOverriding] = useState<AutoApp | null>(null);
  const [cancelling, setCancelling] = useState<QueueJob | null>(null);
  const queue = data?.queue || {};
  const stuck = (queue.stuckQueued || 0) + (queue.stuckRunning || 0);

  return (
    <>
      <div className="ad-grid cols-4" style={{ marginTop: 16 }}>
        <StatCard label="Waiting in queue" tone="blue" loading={!data} value={count(queue.queued)} />
        <StatCard label="Running now" tone="purple" loading={!data} value={count(queue.running)} />
        <StatCard label="Stuck" tone={stuck ? 'red' : 'green'} icon={<AlertTriangle size={16} />} loading={!data} value={count(stuck)} foot="Queued 30+ min or past their lease" />
        <StatCard label="Failed jobs" tone="red" loading={!data} value={count(queue.dead)} foot="Kept for 30 days" />
      </div>
      {!!stuck && <div style={{ marginTop: 16 }}><Notice tone="amber">Some jobs look stuck. If the worker isn't running, start it (<span className="ad-mono">npm run worker</span>) or retry the jobs below.</Notice></div>}
      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search user name or email" />
          <Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: '', label: 'All statuses' }, ...(data?.statuses || []).map((s) => ({ value: s, label: `${STATUS_LABELS[s] || s} (${count(data?.counts[s] || 0)})` }))]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(a) => a.id}
          empty={<Empty icon={<ClipboardList size={20} />} title="No Auto Apply applications" text="They show up once early-access users start applying." />}
          columns={[
            { key: 'job', header: 'Job', render: (a) => a.job ? (
              <div style={{ maxWidth: 320 }}>
                <div className="ad-cell-title">{a.job.title}</div>
                <div className="ad-cell-sub">{[a.job.company, a.job.location, a.job.ats !== 'unknown' && a.job.ats].filter(Boolean).join(' · ')}</div>
              </div>
            ) : <span className="muted">Job removed</span> },
            { key: 'user', header: 'User', render: (a) => <Person name={a.user.name} email={a.user.email} onClick={can('users.view') ? () => go('users', { id: a.user.id }) : undefined} /> },
            { key: 'status', header: 'Status', render: (a) => (
              <div>
                <StatusBadge status={a.status} label={STATUS_LABELS[a.status]} />
                {a.error && <div className="ad-cell-sub" style={{ color: '#dc2626', maxWidth: 240 }} title={a.error}>{a.error.slice(0, 80)}</div>}
              </div>
            ) },
            { key: 'score', header: 'Match', className: 'num', render: (a) => a.score === null ? '—' : Math.round(a.score) },
            { key: 'jobs', header: 'Queue', render: (a) => a.queueJobs.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {a.queueJobs.map((j) => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Badge tone={j.stuck ? 'red' : j.status === 'dead' ? 'red' : 'blue'}>{j.queue}: {j.stuck ? 'stuck' : j.status}</Badge>
                    {can('orders.manage') && (
                      <>
                        <button type="button" className="ad-btn sm icon" title="Retry" aria-label="Retry job" disabled={busy === j.id} onClick={() => run(j.id, () => api(`/orders/queue-jobs/${j.id}/retry`, { method: 'POST' }), 'Job queued again').then((ok) => ok !== undefined && reload())}><RotateCcw size={13} /></button>
                        {j.status !== 'dead' && <button type="button" className="ad-btn sm icon" title="Cancel" aria-label="Cancel job" onClick={() => setCancelling(j)}><XCircle size={13} /></button>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : <span className="muted">—</span> },
            { key: 'updated', header: 'Updated', render: (a) => <span className="muted" title={dateTime(a.updatedAt)}>{ago(a.updatedAt)}</span> },
            { key: 'actions', header: '', className: 'actions', render: (a) => (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                {a.job?.url && <a className="ad-btn sm icon" href={a.job.url} target="_blank" rel="noreferrer" aria-label="Open job posting"><ExternalLink size={13} /></a>}
                {can('orders.manage') && <button type="button" className="ad-btn sm" onClick={() => setOverriding(a)}>Set status</button>}
              </span>
            ) }
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>

      {overriding && (
        <StatusOverride
          title="Set application status"
          description="Use this to unstick an application, for example marking one as submitted after the user applied by hand."
          current={overriding.status}
          options={(data?.statuses || []).map((s) => ({ value: s, label: STATUS_LABELS[s] || s }))}
          withNote
          onClose={() => setOverriding(null)}
          onSave={(statusValue, note) => api(`/orders/auto-apply/${overriding.id}/status`, { method: 'POST', body: { status: statusValue, note } })}
          onSaved={() => { setOverriding(null); reload(); }}
        />
      )}
      {cancelling && (
        <ConfirmDialog
          title="Cancel this job?"
          description="The worker stops picking it up. You can retry it later."
          confirmLabel="Cancel job"
          danger
          busy={busy === 'cancel'}
          onClose={() => setCancelling(null)}
          onConfirm={async () => {
            const ok = await run('cancel', () => api(`/orders/queue-jobs/${cancelling.id}/cancel`, { method: 'POST' }), 'Job cancelled');
            setCancelling(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </>
  );
}

function CompanyList() {
  const { can } = useAdmin();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<Paged<CompanyApp> & { counts: Record<string, number>; statuses: string[] }>('/orders/company-applications', { status, q: search, page, limit: 25 });
  const [overriding, setOverriding] = useState<CompanyApp | null>(null);

  return (
    <>
      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search candidate name or email" />
          <Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: '', label: 'All statuses' }, ...(data?.statuses || []).map((s) => ({ value: s, label: `${s} (${count(data?.counts[s] || 0)})` }))]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(a) => a.id}
          empty={<Empty icon={<ClipboardList size={20} />} title="No applications yet" text="Applications to jobs on the Company Portal show up here." />}
          columns={[
            { key: 'candidate', header: 'Candidate', render: (a) => <Person name={a.candidate.name} email={a.candidate.email} /> },
            { key: 'job', header: 'Job', render: (a) => <div><div className="ad-cell-title">{a.job.title}</div><div className="ad-cell-sub">{a.job.company}</div></div> },
            { key: 'mode', header: 'Applied via', render: (a) => <Badge tone="gray">{a.mode}</Badge> },
            { key: 'match', header: 'Match', className: 'num', render: (a) => `${a.matchScore}%` },
            { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} label={a.status} /> },
            { key: 'updated', header: 'Last change', render: (a) => <span className="muted" title={a.events.at(-1)?.title}>{ago(a.updatedAt)}</span> },
            { key: 'actions', header: '', className: 'actions', render: (a) => can('orders.manage') && <button type="button" className="ad-btn sm" onClick={() => setOverriding(a)}>Set status</button> }
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>
      {overriding && (
        <StatusOverride
          title={`Update ${overriding.candidate.name}'s application`}
          description="Use this to resolve a dispute or fix a stuck status. The change shows in the application's history as CVMind support."
          current={overriding.status}
          options={(data?.statuses || []).map((s) => ({ value: s, label: s }))}
          onClose={() => setOverriding(null)}
          onSave={(statusValue) => api(`/orders/company-applications/${overriding.id}/status`, { method: 'POST', body: { status: statusValue } })}
          onSaved={() => { setOverriding(null); reload(); }}
        />
      )}
    </>
  );
}

function StatusOverride({ title, description, current, options, withNote, onClose, onSave, onSaved }: {
  title: string; description: string; current: string; options: Array<{ value: string; label: string }>; withNote?: boolean;
  onClose: () => void; onSave: (status: string, note: string) => Promise<unknown>; onSaved: () => void;
}) {
  const [value, setValue] = useState(current);
  const [note, setNote] = useState('');
  const { busy, run } = useAction();
  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="ad-btn primary" disabled={value === current || busy === 'save'} onClick={async () => {
            const ok = await run('save', () => onSave(value, note), 'Status updated');
            if (ok !== undefined) onSaved();
          }}>{busy === 'save' && <Spinner size={14} />} Save</button>
        </>
      }
    >
      <div className="ad-field">
        <label htmlFor="o-status">Status</label>
        <select id="o-status" className="ad-select" value={value} onChange={(e) => setValue(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {withNote && (
        <div className="ad-field">
          <label htmlFor="o-note">Note (added to the application)</label>
          <textarea id="o-note" className="ad-textarea" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}

import { useState } from 'react';
import { BadgeCheck, Building2, ExternalLink, PauseCircle, PlayCircle } from 'lucide-react';
import { api } from '../api';
import type { Paged } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { count, date } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Drawer, Empty, ErrorState, PageHeader, Pagination, SearchInput, Select, Spinner, StatusBadge } from '../ui';

interface Company {
  id: string;
  name: string;
  email: string;
  website: string;
  industry: string;
  companySize: string;
  location: string;
  verified: boolean;
  status: string;
  statusReason: string;
  createdAt: string;
  jobs: number;
  activeJobs: number;
  applications: number;
  interviews: number;
  hires: number;
}

export default function Partners() {
  const { params, go } = useAdmin();
  const [q, setQ] = useState('');
  const [verified, setVerified] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<Paged<Company>>('/partners', { q: search, verified, status, page, limit: 25 });

  return (
    <>
      <PageHeader title="Companies" description="Recruiters on the Company Portal. Verify them, watch how their jobs perform, and suspend bad actors." />
      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, email or website" />
          <Select label="Verification" value={verified} onChange={(v) => { setVerified(v); setPage(1); }} options={[{ value: '', label: 'Verified or not' }, { value: 'true', label: 'Verified' }, { value: 'false', label: 'Not verified' }]} />
          <Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(c) => c.id}
          onRowClick={(c) => go('partners', { id: c.id })}
          empty={<Empty icon={<Building2 size={20} />} title="No companies yet" text="Companies appear here when they register on the Company Portal." />}
          columns={[
            { key: 'name', header: 'Company', render: (c) => (
              <div>
                <div className="ad-cell-title">{c.name} {c.verified && <BadgeCheck size={14} color="#2dc08d" style={{ verticalAlign: '-2px' }} aria-label="Verified" />}</div>
                <div className="ad-cell-sub">{c.email}</div>
              </div>
            ) },
            { key: 'industry', header: 'Industry', render: (c) => <div><div>{c.industry}</div><div className="ad-cell-sub">{c.companySize}</div></div> },
            { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
            { key: 'jobs', header: 'Open jobs', className: 'num', render: (c) => <>{count(c.activeJobs)}<span className="muted"> / {count(c.jobs)}</span></> },
            { key: 'apps', header: 'Applications', className: 'num', render: (c) => count(c.applications) },
            { key: 'hires', header: 'Hires', className: 'num', render: (c) => count(c.hires) },
            { key: 'joined', header: 'Joined', render: (c) => <span className="muted">{date(c.createdAt)}</span> }
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>
      {params.id && <CompanyDrawer id={params.id} onClose={() => go('partners')} onChanged={reload} />}
    </>
  );
}

interface Detail {
  id: string;
  name: string;
  email: string;
  website: string;
  industry: string;
  companySize: string;
  location: string;
  description: string;
  verified: boolean;
  status: string;
  statusReason: string;
  createdAt: string;
  jobs: Array<{ id: string; title: string; status: string; location: string; jobType: string; postedAt: string; applications: number }>;
}

function CompanyDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { can } = useAdmin();
  const { data, error, reload } = useApi<{ data: Detail }>(`/partners/${encodeURIComponent(id)}`);
  const { busy, run } = useAction();
  const [suspending, setSuspending] = useState(false);
  const c = data?.data;
  const manage = can('partners.manage');
  const done = () => { reload(); onChanged(); };

  return (
    <Drawer title={c?.name || 'Company'} subtitle={c?.email} onClose={onClose}>
      {error && !c ? <ErrorState message={error} onRetry={reload} /> : !c ? <div className="ad-empty"><Spinner size={20} /></div> : (
        <>
          <div className="ad-chips" style={{ marginBottom: 14 }}>
            <StatusBadge status={c.status} />
            {c.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="gray">Not verified</Badge>}
          </div>
          {c.status === 'suspended' && c.statusReason && <p className="ad-small" style={{ color: '#b45309', marginBottom: 14 }}>Suspended: {c.statusReason}</p>}
          {manage && (
            <div className="ad-actions-row" style={{ marginBottom: 6 }}>
              <button type="button" className="ad-btn sm" disabled={busy === 'verify'} onClick={() => run('verify', () => api(`/partners/${encodeURIComponent(c.id)}/verify`, { method: 'POST', body: { verified: !c.verified } }), c.verified ? 'Verification removed' : 'Company verified').then((ok) => ok !== undefined && done())}>
                <BadgeCheck size={14} /> {c.verified ? 'Remove verification' : 'Verify company'}
              </button>
              {c.status === 'suspended' ? (
                <button type="button" className="ad-btn sm primary" disabled={busy === 'status'} onClick={() => run('status', () => api(`/partners/${encodeURIComponent(c.id)}/status`, { method: 'POST', body: { status: 'active' } }), 'Company reactivated').then((ok) => ok !== undefined && done())}>
                  <PlayCircle size={14} /> Reactivate
                </button>
              ) : (
                <button type="button" className="ad-btn sm danger-outline" onClick={() => setSuspending(true)}><PauseCircle size={14} /> Suspend</button>
              )}
              {c.website && <a className="ad-btn sm" href={/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Website</a>}
            </div>
          )}

          <div className="ad-section-title" style={{ marginTop: 20 }}>Profile</div>
          <dl className="ad-kv">
            <dt>Industry</dt><dd>{c.industry}</dd>
            <dt>Size</dt><dd>{c.companySize}</dd>
            <dt>Location</dt><dd>{c.location}</dd>
            <dt>Joined</dt><dd>{date(c.createdAt)}</dd>
            {c.description && (<><dt>About</dt><dd>{c.description}</dd></>)}
          </dl>

          <div className="ad-section-title">Jobs ({c.jobs.length})</div>
          {c.jobs.length ? (
            <ul className="ad-list">
              {c.jobs.map((j) => (
                <li key={j.id}>
                  <div>
                    <div className="ad-cell-title">{j.title}</div>
                    <div className="ad-cell-sub">{j.location} · {j.jobType} · {count(j.applications)} applications · posted {date(j.postedAt)}</div>
                  </div>
                  {manage && j.status !== 'HIDDEN' ? (
                    <select className="ad-select sm" style={{ width: 'auto' }} value={j.status} aria-label={`${j.title} status`} disabled={busy === j.id} onChange={(e) => run(j.id, () => api(`/partners/${encodeURIComponent(c.id)}/jobs/${encodeURIComponent(j.id)}/status`, { method: 'POST', body: { status: e.target.value } }), 'Job updated').then((ok) => ok !== undefined && reload())}>
                      <option value="ACTIVE">Open</option>
                      <option value="PAUSED">Paused</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  ) : <StatusBadge status={j.status.toLowerCase()} />}
                </li>
              ))}
            </ul>
          ) : <p className="ad-muted ad-small">No jobs posted.</p>}
        </>
      )}
      {c && suspending && (
        <ConfirmDialog
          title={`Suspend ${c.name}?`}
          description="Their open jobs are paused and they can't post new ones. Reactivating doesn't reopen jobs automatically."
          confirmLabel="Suspend"
          danger
          reason={{ label: 'Reason', required: true, placeholder: 'e.g. Fake job listings' }}
          busy={busy === 'suspend'}
          onClose={() => setSuspending(false)}
          onConfirm={async (reason) => {
            const ok = await run('suspend', () => api(`/partners/${encodeURIComponent(c.id)}/status`, { method: 'POST', body: { status: 'suspended', reason } }), 'Company suspended');
            setSuspending(false);
            if (ok !== undefined) done();
          }}
        />
      )}
    </Drawer>
  );
}

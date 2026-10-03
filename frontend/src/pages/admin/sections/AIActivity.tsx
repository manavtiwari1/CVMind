import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAdmin, useApi, useDebounced } from '../hooks';
import { ago, count, dateTime } from '../format';
import { Card, DataTable, Empty, PageHeader, Pagination, Person, SearchInput, Select } from '../ui';

interface ActivityResponse {
  features: Array<{ key: string; label: string }>;
  feature: { key: string; label: string; columns: string[] };
  total: number;
  page: number;
  limit: number;
  data: Array<Record<string, unknown> & { id: string; createdAt: string; userId: string; user: { name: string; email: string } | null }>;
}

const COLUMN_LABELS: Record<string, string> = {
  fileName: 'File', score: 'Score', priorScore: 'Score before', questionsCount: 'Questions', email: 'Email',
  jobTitle: 'Role', industry: 'Industry', issuesCount: 'Issues found', topic: 'Topic', theme: 'Theme', jobType: 'Job type', jobsCount: 'Jobs found'
};
const NUMERIC = new Set(['score', 'priorScore', 'questionsCount', 'issuesCount', 'jobsCount']);

export default function AIActivity() {
  const { go, can } = useAdmin();
  const [feature, setFeature] = useState('scan');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<ActivityResponse>('/analytics/activity', { feature, q: search, page, limit: 25 });

  const columns = (data?.feature.columns || []).filter((c) => c !== 'email');

  return (
    <>
      <PageHeader title="AI activity" description="Every request to an AI tool, newest first. Signed-in requests link to the user." />
      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <Select
            label="Tool"
            value={feature}
            onChange={(v) => { setFeature(v); setPage(1); }}
            options={(data?.features || [{ key: 'scan', label: 'Resume scans' }]).map((f) => ({ value: f.key, label: f.label }))}
          />
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search email, file or role" />
          <span className="ad-toolbar-spacer" />
          {data && <span className="ad-muted ad-small">{count(data.total)} requests in total</span>}
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(r) => r.id}
          empty={<Empty icon={<Sparkles size={20} />} title="No requests yet" text={search ? 'Nothing matches that search.' : `Nobody has used ${data?.feature.label.toLowerCase() || 'this tool'} yet.`} />}
          columns={[
            { key: 'when', header: 'When', render: (r) => <span title={dateTime(r.createdAt)}>{ago(r.createdAt)}</span> },
            { key: 'user', header: 'User', render: (r) => r.user
              ? <Person name={r.user.name} email={r.user.email} onClick={can('users.view') ? () => go('users', { id: r.userId }) : undefined} />
              : <span className="muted">{(r.email as string) || 'Signed out visitor'}</span> },
            ...columns.map((c) => ({
              key: c,
              header: COLUMN_LABELS[c] || c,
              className: NUMERIC.has(c) ? 'num' : undefined,
              render: (r: ActivityResponse['data'][number]) => {
                const v = r[c];
                if (v === '' || v === null || v === undefined) return <span className="muted">—</span>;
                return NUMERIC.has(c) ? count(Number(v)) : <span style={{ display: 'inline-block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }} title={String(v)}>{String(v)}</span>;
              }
            }))
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>
    </>
  );
}

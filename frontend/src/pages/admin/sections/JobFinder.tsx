import { useState } from 'react';
import { Briefcase, CalendarDays, ExternalLink, Search, Users } from 'lucide-react';
import { useAdmin, useApi, useDebounced } from '../hooks';
import { ago, count, dateTime } from '../format';
import { Badge, Card, DataTable, Empty, Notice, PageHeader, Pagination, Person, SearchInput, Select, StatCard } from '../ui';
import type { Tone } from '../ui';

interface ApplyRow {
  id: string;
  email: string;
  name: string | null;
  title: string;
  company: string;
  location: string;
  source: string;
  applyUrl: string;
  matchScore: number | null;
  appliedAt: string;
  lastOpenedAt: string;
  openCount: number;
}
interface Summary {
  appliesToday: number;
  appliesWeek: number;
  total: number;
  usersWeek: number;
  topCompanies: { company: string; count: number }[];
  bySource: Record<string, number>;
  jsearch: { used: number; cap: number; configured: boolean };
  adzuna: { used: number; cap: number; today: number; dailyCap: number; configured: boolean };
}

const SOURCE: Record<string, { label: string; tone: Tone }> = {
  jsearch: { label: 'Job sites (JSearch)', tone: 'blue' },
  adzuna: { label: 'Job sites (Adzuna)', tone: 'blue' },
  greenhouse: { label: 'Careers page', tone: 'purple' },
  lever: { label: 'Careers page', tone: 'purple' },
  ashby: { label: 'Careers page', tone: 'purple' },
  smartrecruiters: { label: 'Careers page', tone: 'purple' },
  workable: { label: 'Careers page', tone: 'purple' },
  cvmind: { label: 'CVMind recruiter', tone: 'green' }
};

export default function JobFinder() {
  const { go, can } = useAdmin();
  const [q, setQ] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const companySearch = useDebounced(company);
  const { data: summary } = useApi<{ data: Summary }>('/job-finder/summary');
  const { data, error, loading, reload } = useApi<{ data: ApplyRow[]; page: number; limit: number; total: number }>(
    '/job-finder', { q: search, company: companySearch, source, page, limit: 50 }
  );
  const s = summary?.data;
  const jsearch = s?.jsearch;
  const adzuna = s?.adzuna;

  return (
    <>
      <PageHeader
        title="AI Job Finder"
        description="Every job a user marked as applied in Job Finder (after opening its application), newest first. Jobs posted by CVMind recruiters count when the resume is sent."
      />

      <div className="ad-grid cols-3">
        <StatCard label="Applies today" icon={<CalendarDays size={16} />} loading={!s} value={count(s?.appliesToday)} foot="Since midnight IST" />
        <StatCard label="Applies, last 7 days" icon={<Briefcase size={16} />} loading={!s} value={count(s?.appliesWeek)} foot={`${count(s?.total)} in total`} />
        <StatCard label="Users applying, 7 days" icon={<Users size={16} />} loading={!s} value={count(s?.usersWeek)} foot={s?.topCompanies.length ? `Top: ${s.topCompanies.slice(0, 2).map((c) => c.company).join(', ')}` : 'No applies yet'} />
      </div>
      <div className="ad-grid cols-2">
        <StatCard label="JSearch calls this month" tone="purple" icon={<Search size={16} />} loading={!s}
          value={jsearch?.configured ? `${count(jsearch.used)} / ${count(jsearch.cap)}` : 'Off'}
          foot={jsearch?.configured ? 'Searches are cached for an hour' : 'Set JSEARCH_API_KEY to turn it on'} />
        <StatCard label="Adzuna calls this month" tone="purple" icon={<Search size={16} />} loading={!s}
          value={adzuna?.configured ? `${count(adzuna.used)} / ${count(adzuna.cap)}` : 'Off'}
          foot={adzuna?.configured ? `Today ${count(adzuna.today)} / ${count(adzuna.dailyCap)}` : 'Set ADZUNA_APP_ID and ADZUNA_APP_KEY to turn it on'} />
      </div>

      {jsearch?.configured && jsearch.cap > 0 && jsearch.used >= jsearch.cap && (
        <Notice tone="amber">This month's JSearch cap is used up. Job Finder skips JSearch until the 1st; the other sources still work.</Notice>
      )}
      {adzuna?.configured && ((adzuna.cap > 0 && adzuna.used >= adzuna.cap) || (adzuna.dailyCap > 0 && adzuna.today >= adzuna.dailyCap)) && (
        <Notice tone="amber">The Adzuna cap is used up for {adzuna.used >= adzuna.cap ? 'this month' : 'today'}. Job Finder skips Adzuna until it resets; the other sources still work.</Notice>
      )}

      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search email…" />
          <SearchInput value={company} onChange={(v) => { setCompany(v); setPage(1); }} placeholder="Company…" />
          <Select
            label="Source"
            value={source}
            onChange={(v) => { setSource(v); setPage(1); }}
            options={[
              { value: '', label: 'All sources' },
              { value: 'jsearch', label: 'Job sites (JSearch)' },
              { value: 'adzuna', label: 'Job sites (Adzuna)' },
              { value: 'greenhouse', label: 'Careers page (Greenhouse)' },
              { value: 'lever', label: 'Careers page (Lever)' },
              { value: 'ashby', label: 'Careers page (Ashby)' },
              { value: 'smartrecruiters', label: 'Careers page (SmartRecruiters)' },
              { value: 'workable', label: 'Careers page (Workable)' },
              { value: 'cvmind', label: 'CVMind recruiter' }
            ]}
          />
          <span className="ad-toolbar-spacer" />
          {data && <span className="ad-muted ad-small">{count(data.total)} records</span>}
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(r) => r.id}
          empty={<Empty icon={<Briefcase size={20} />} title="No applies yet" text={search || companySearch || source ? 'Nothing matches these filters.' : 'Applies from AI Job Finder show up here.'} />}
          columns={[
            { key: 'person', header: 'User', render: (r) => <Person name={r.name || undefined} email={r.email} onClick={can('users.view') ? () => go('users', { q: r.email }) : undefined} /> },
            { key: 'job', header: 'Job', render: (r) => (
              <span style={{ display: 'inline-flex', flexDirection: 'column', maxWidth: 300 }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.title}>{r.title}</strong>
                <span className="muted">{r.company}{r.location ? ` · ${r.location}` : ''}</span>
              </span>
            ) },
            { key: 'source', header: 'Source', render: (r) => <Badge tone={SOURCE[r.source]?.tone || 'gray'}>{SOURCE[r.source]?.label || r.source}</Badge> },
            { key: 'match', header: 'Match', className: 'num', render: (r) => (r.matchScore === null ? <span className="muted">—</span> : `${r.matchScore}%`) },
            { key: 'applied', header: 'Applied on', render: (r) => <span title={dateTime(r.appliedAt)}>{dateTime(r.appliedAt)}</span> },
            { key: 'again', header: 'Marked again', render: (r) => (r.openCount > 1
              ? <span title={`Last marked ${dateTime(r.lastOpenedAt)}`}>{r.openCount - 1}× · {ago(r.lastOpenedAt)}</span>
              : <span className="muted">No</span>) },
            { key: 'link', header: '', className: 'actions', render: (r) => r.applyUrl && (
              <a className="ad-btn sm" href={r.applyUrl} target="_blank" rel="noopener noreferrer" title="Open the job's application page"><ExternalLink size={14} /></a>
            ) }
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>
    </>
  );
}

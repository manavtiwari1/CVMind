import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, Coins, CreditCard, LifeBuoy, RefreshCw, Sparkles, UserPlus, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAdmin, useApi } from '../hooks';
import { ago, change, count, date, money, providerLabel } from '../format';
import { Badge, BarList, Card, Empty, ErrorState, PageHeader, Person, Segment, StatCard, StatusBadge } from '../ui';

interface Overview {
  range: number;
  generatedAt: string;
  kpis: {
    totalUsers: number;
    signups: { today: number; yesterday: number; range: number; prev: number };
    activeUsers: { today: number; range: number; prev: number };
    aiRequests: { today: number; yesterday: number; range: number; prev: number };
    revenue: { today: number; yesterday: number; range: number; prev: number; payments: number };
    aiTokens: { today: number; range: number; prev: number; accounts: number };
    openTickets: number;
  };
  userStatus: Record<string, number>;
  series: Array<{ date: string; signups: number; logins: number; revenue: number; aiRequests: number }>;
  featureUsage: Array<{ key: string; label: string; count: number; total: number }>;
  scores: { average: number; count: number; high: number; medium: number; low: number };
  keywordTrends: Array<{ keyword: string; count: number }>;
  providers: Array<{ provider: string; count: number }>;
  recent: {
    signups: Array<{ id: string; name: string; email: string; provider: string; createdAt: string }>;
    payments: Array<{ id: string; email: string; amount: number; status: string; createdAt: string }>;
    tickets: Array<{ id: string; number: number; name: string; email: string; subject: string; status: string; createdAt: string }>;
  };
}

type Metric = 'signups' | 'aiRequests' | 'logins' | 'revenue';
const METRICS: Array<{ value: Metric; label: string; color: string }> = [
  { value: 'signups', label: 'Sign-ups', color: '#2dc08d' },
  { value: 'aiRequests', label: 'AI requests', color: '#7c3aed' },
  { value: 'logins', label: 'Sign-ins', color: '#2563eb' },
  { value: 'revenue', label: 'Revenue', color: '#d97706' }
];

const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function Dashboard() {
  const { go, can } = useAdmin();
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const [metric, setMetric] = useState<Metric>('signups');
  const { data, error, loading, reload } = useApi<{ data: Overview }>('/analytics/overview', { range });
  const o = data?.data;

  // Live: refresh every 30 seconds while the page is open
  useEffect(() => {
    const id = setInterval(reload, 30000);
    return () => clearInterval(id);
  }, [reload]);

  const rangeLabel = `last ${range} days`;
  const metricInfo = METRICS.find((m) => m.value === metric)!;
  const fmt = (v: number) => (metric === 'revenue' ? money(v) : count(v));

  if (error && !o) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Card><ErrorState message={error} onRetry={reload} /></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={o ? <>Live from the database · updated {ago(o.generatedAt)}</> : 'Live from the database'}
        actions={
          <>
            <Segment value={range} onChange={setRange} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
            <button type="button" className="ad-btn icon" onClick={reload} aria-label="Refresh" disabled={loading}>
              <RefreshCw size={15} className={loading ? 'ad-spin' : ''} />
            </button>
          </>
        }
      />

      <div className="ad-grid cols-5">
        <StatCard label="New sign-ups" icon={<UserPlus size={16} />} loading={!o} value={count(o?.kpis.signups.range)} delta={o ? change(o.kpis.signups.range, o.kpis.signups.prev) : undefined} foot={`vs previous ${range} days`} />
        <StatCard label="Active users" tone="blue" icon={<Users size={16} />} loading={!o} value={count(o?.kpis.activeUsers.range)} delta={o ? change(o.kpis.activeUsers.range, o.kpis.activeUsers.prev) : undefined} foot={`vs previous ${range} days`} />
        <StatCard label="AI requests" tone="purple" icon={<Sparkles size={16} />} loading={!o} value={count(o?.kpis.aiRequests.range)} delta={o ? change(o.kpis.aiRequests.range, o.kpis.aiRequests.prev) : undefined} foot={`vs previous ${range} days`} />
        <StatCard label="AI tokens used" tone="purple" icon={<Coins size={16} />} loading={!o} value={count(o?.kpis.aiTokens.range)} delta={o ? change(o.kpis.aiTokens.range, o.kpis.aiTokens.prev) : undefined} foot={`${count(o?.kpis.aiTokens.today)} today · ${count(o?.kpis.aiTokens.accounts)} ${o?.kpis.aiTokens.accounts === 1 ? 'account' : 'accounts'}`} />
        <StatCard label="Revenue" tone="amber" icon={<CreditCard size={16} />} loading={!o} value={money(o?.kpis.revenue.range)} delta={o ? change(o.kpis.revenue.range, o.kpis.revenue.prev) : undefined} foot={`${count(o?.kpis.revenue.payments)} payments`} />
      </div>

      <div className="ad-grid wide-left">
        <Card
          title="Activity"
          description={`${metricInfo.label} per day, ${rangeLabel}`}
          actions={<Segment value={metric} onChange={setMetric} options={METRICS.map(({ value, label }) => ({ value, label }))} />}
        >
          <div className="ad-chart">
            {o && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={o.series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="ad-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={metricInfo.color} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={metricInfo.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => (metric === 'revenue' ? `₹${count(v)}` : count(v))} />
                  <Tooltip
                    content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="ad-recharts-tooltip">
                        <strong>{shortDate(String(label))}</strong>
                        {metricInfo.label}: {fmt(Number(payload[0].value))}
                      </div>
                    ) : null}
                  />
                  <Area type="monotone" dataKey={metric} stroke={metricInfo.color} strokeWidth={2} fill="url(#ad-area)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Today" description="Since midnight IST" bodyClass={false}>
          <ul className="ad-feed">
            <TodayRow label="Sign-ups" value={o ? count(o.kpis.signups.today) : '…'} sub={o ? `${count(o.kpis.signups.yesterday)} yesterday` : ''} />
            <TodayRow label="Active users" value={o ? count(o.kpis.activeUsers.today) : '…'} />
            <TodayRow label="AI requests" value={o ? count(o.kpis.aiRequests.today) : '…'} sub={o ? `${count(o.kpis.aiRequests.yesterday)} yesterday` : ''} />
            <TodayRow label="Revenue" value={o ? money(o.kpis.revenue.today) : '…'} sub={o ? `${money(o.kpis.revenue.yesterday)} yesterday` : ''} />
            <TodayRow
              label="Open tickets"
              value={o ? count(o.kpis.openTickets) : '…'}
              action={can('tickets.view') && o?.kpis.openTickets ? <button type="button" className="ad-link ad-small" onClick={() => go('tickets', { status: 'unresolved' })}>View</button> : undefined}
            />
            <TodayRow label="Total users" value={o ? count(o.kpis.totalUsers) : '…'} sub={o && (o.userStatus.suspended || o.userStatus.banned) ? `${count(o.userStatus.suspended || 0)} suspended · ${count(o.userStatus.banned || 0)} banned` : ''} />
          </ul>
        </Card>
      </div>

      <div className="ad-grid cols-2">
        <Card title="Feature usage" description={`AI requests per tool, ${rangeLabel}`} actions={<button type="button" className="ad-link ad-small" onClick={() => go('ai-activity')}>Details</button>}>
          {o && o.featureUsage.some((f) => f.count) ? (
            <BarList items={o.featureUsage.filter((f) => f.count).slice(0, 8).map((f) => ({ label: f.label, value: f.count }))} />
          ) : o ? <Empty icon={<Activity size={20} />} title="No AI requests yet" text={`Nobody used an AI tool in the ${rangeLabel}.`} /> : <div className="ad-skeleton" style={{ height: 180 }} />}
        </Card>

        <Card title="Resume scores" description={`ATS scans, ${rangeLabel}`}>
          {o && o.scores.count ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                <span className="ad-stat-value" style={{ margin: 0 }}>{o.scores.average}</span>
                <span className="ad-muted">average across {count(o.scores.count)} scans</span>
              </div>
              <BarList tone="purple" items={[
                { label: 'Strong (80+)', value: o.scores.high },
                { label: 'Fair (60–79)', value: o.scores.medium },
                { label: 'Weak (under 60)', value: o.scores.low }
              ]} />
              {o.keywordTrends.length > 0 && (
                <>
                  <div className="ad-section-title" style={{ marginTop: 20 }}>Most-missed keywords</div>
                  <div className="ad-chips">
                    {o.keywordTrends.map((k) => <Badge key={k.keyword} tone="gray">{k.keyword} · {k.count}</Badge>)}
                  </div>
                </>
              )}
            </>
          ) : o ? <Empty title="No scans yet" text={`No resumes were scanned in the ${rangeLabel}.`} /> : <div className="ad-skeleton" style={{ height: 180 }} />}
        </Card>
      </div>

      <div className="ad-grid cols-3">
        <Card title="Newest users" bodyClass={false} actions={can('users.view') && <button type="button" className="ad-link ad-small" onClick={() => go('users')}>All users</button>}>
          {o?.recent.signups.length ? (
            <ul className="ad-feed">
              {o.recent.signups.map((u) => (
                <li key={u.id}>
                  <div className="ad-feed-main"><Person name={u.name} email={u.email} onClick={can('users.view') ? () => go('users', { id: u.id }) : undefined} /></div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="ad-small">{providerLabel(u.provider)}</div>
                    <div className="ad-cell-sub">{ago(u.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty title={o ? 'No users yet' : 'Loading…'} />}
        </Card>

        <Card title="Latest payments" bodyClass={false} actions={can('payments.view') && <button type="button" className="ad-link ad-small" onClick={() => go('payments')}>All payments</button>}>
          {o?.recent.payments.length ? (
            <ul className="ad-feed">
              {o.recent.payments.map((p) => (
                <li key={p.id}>
                  <div className="ad-feed-main">
                    <div className="ad-cell-title">{money(p.amount)}</div>
                    <div className="ad-cell-sub">{p.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={p.status} />
                    <div className="ad-cell-sub">{date(p.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty title={o ? 'No payments yet' : 'Loading…'} text={o ? 'Paid plans are not live yet.' : undefined} />}
        </Card>

        <Card title="Latest support requests" bodyClass={false} actions={can('tickets.view') && <button type="button" className="ad-link ad-small" onClick={() => go('tickets')}>Inbox</button>}>
          {o?.recent.tickets.length ? (
            <ul className="ad-feed">
              {o.recent.tickets.map((t) => (
                <li key={t.id} style={{ cursor: can('tickets.view') ? 'pointer' : undefined }} onClick={can('tickets.view') ? () => go('tickets', { id: t.id }) : undefined}>
                  <span className="ad-stat-icon blue" style={{ width: 28, height: 28 }}><LifeBuoy size={14} /></span>
                  <div className="ad-feed-main">
                    <div className="ad-cell-title">#{t.number} {t.subject}</div>
                    <div className="ad-cell-sub">{t.name || t.email} · {ago(t.createdAt)}</div>
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          ) : <Empty title={o ? 'No support requests' : 'Loading…'} />}
        </Card>
      </div>
    </>
  );
}

function TodayRow({ label, value, sub, action }: { label: string; value: string; sub?: string; action?: ReactNode }) {
  return (
    <li>
      <div className="ad-feed-main">
        <div className="ad-muted">{label}</div>
        {sub && <div className="ad-cell-sub">{sub}</div>}
      </div>
      {action}
      <strong style={{ fontSize: '1.05rem', fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
    </li>
  );
}

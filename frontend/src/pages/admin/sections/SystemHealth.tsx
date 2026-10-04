import { useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Database, RefreshCw, Server, XCircle } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../hooks';
import { ago, count, dateTime, duration } from '../format';
import { Badge, Card, DataTable, Empty, ErrorState, Notice, PageHeader, StatCard, StatusBadge } from '../ui';

interface Health {
  server: { uptimeSec: number; node: string; platform: string; memoryMb: { rss: number; heapUsed: number; heapTotal: number }; inlineWorkers: boolean };
  database: { state: string; configured: boolean; pingMs?: number | null; name?: string; collections?: number; objects?: number; dataSizeMb?: number; storageSizeMb?: number };
  queue: Record<string, Record<string, number>> | null;
  metrics: {
    since: string;
    lastHour: { requests: number; errors: number; avgMs: number };
    last24h: { requests: number; errors: number; avgMs: number };
    perMinute: Array<{ minute: string; requests: number; errors: number; avgMs: number }>;
    slowestRoutes: Array<{ route: string; count: number; errors: number; avgMs: number; maxMs: number }>;
    recentErrors: Array<{ route: string; status: number; at: string }>;
  };
  integrations: Array<{ key: string; label: string; configured: boolean }>;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export default function SystemHealth() {
  const { data, error, loading, reload } = useApi<{ data: Health }>('/system/health');
  const h = data?.data;

  useEffect(() => {
    const id = setInterval(reload, 15000);
    return () => clearInterval(id);
  }, [reload]);

  if (error && !h) return <><PageHeader title="System health" /><Card><ErrorState message={error} onRetry={reload} /></Card></>;

  const errorRate = h && h.metrics.lastHour.requests ? (h.metrics.lastHour.errors / h.metrics.lastHour.requests) * 100 : 0;
  const dbOk = h?.database.state === 'connected';

  return (
    <>
      <PageHeader
        title="System health"
        description={h ? <>This server instance · request stats since {dateTime(h.metrics.since)} · refreshes every 15 seconds</> : 'This server instance'}
        actions={<button type="button" className="ad-btn icon" onClick={reload} aria-label="Refresh" disabled={loading}><RefreshCw size={15} className={loading ? 'ad-spin' : ''} /></button>}
      />
      {h && !dbOk && <Notice tone="red"><strong>Database {h.database.configured ? h.database.state : 'not configured'}.</strong> Sign-ins, saved documents and most of the admin panel need MongoDB.</Notice>}

      <div className="ad-grid cols-4" style={{ marginTop: h && !dbOk ? 16 : 0 }}>
        <StatCard label="API" tone="green" icon={<Server size={16} />} loading={!h} value={h ? 'Online' : ''} foot={h ? `Up ${duration(h.server.uptimeSec)} · ${h.server.platform}` : undefined} />
        <StatCard label="Database" tone={dbOk ? 'green' : 'red'} icon={<Database size={16} />} loading={!h} value={h ? (dbOk ? `${h.database.pingMs ?? '—'} ms` : h.database.state) : ''} foot={dbOk ? 'Ping time' : undefined} />
        <StatCard label="Requests, last hour" tone="blue" icon={<Activity size={16} />} loading={!h} value={count(h?.metrics.lastHour.requests)} foot={h ? `avg ${h.metrics.lastHour.avgMs} ms` : undefined} />
        <StatCard label="Server errors, last hour" tone={errorRate > 2 ? 'red' : 'green'} icon={<AlertTriangle size={16} />} loading={!h} value={count(h?.metrics.lastHour.errors)} foot={h ? `${errorRate.toFixed(1)}% of requests` : undefined} />
      </div>

      <div className="ad-grid wide-left">
        <Card title="Traffic" description="Requests per minute, last hour">
          <div className="ad-chart sm">
            {h && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={h.metrics.perMinute} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="minute" tickFormatter={time} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="ad-recharts-tooltip">
                      <strong>{time(String(label))}</strong>
                      {count(Number(payload[0].payload.requests))} requests · {count(Number(payload[0].payload.errors))} errors · {payload[0].payload.avgMs} ms avg
                    </div>
                  ) : null} />
                  <Area type="monotone" dataKey="requests" stroke="#2dc08d" strokeWidth={2} fill="#2dc08d" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="errors" stroke="#dc2626" strokeWidth={2} fill="#dc2626" fillOpacity={0.08} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card title="Services" description="Whether each key is set. Values are never shown." bodyClass={false}>
          <ul className="ad-feed">
            {(h?.integrations || []).map((i) => (
              <li key={i.key}>
                {i.configured ? <CheckCircle2 size={16} color="#2dc08d" /> : <XCircle size={16} color="#9ca3af" />}
                <div className="ad-feed-main">
                  <div className="ad-cell-title" style={{ fontWeight: 500 }}>{i.label}</div>
                  <div className="ad-cell-sub ad-mono">{i.key}</div>
                </div>
                {i.configured ? <Badge tone="green">Set</Badge> : <Badge tone="gray">Not set</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="ad-grid cols-2">
        <Card title="Database">
          {h?.database && dbOk ? (
            <dl className="ad-kv">
              <dt>Name</dt><dd>{h.database.name || '—'}</dd>
              <dt>Collections</dt><dd>{count(h.database.collections)}</dd>
              <dt>Documents</dt><dd>{count(h.database.objects)}</dd>
              <dt>Data size</dt><dd>{h.database.dataSizeMb ?? '—'} MB</dd>
              <dt>Storage size</dt><dd>{h.database.storageSizeMb ?? '—'} MB</dd>
            </dl>
          ) : <Empty icon={<Database size={20} />} title="No database details" />}
        </Card>
        <Card title="Auto Apply queue" description={h?.server.inlineWorkers ? 'Workers run inside this API process' : 'Workers run as a separate process'}>
          {h?.queue && Object.keys(h.queue).length ? (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Queue</th><th className="num">Queued</th><th className="num">Running</th><th className="num">Done</th><th className="num">Failed</th></tr></thead>
                <tbody>
                  {Object.entries(h.queue).map(([q, s]) => (
                    <tr key={q}>
                      <td className="ad-cell-title">{q}</td>
                      <td className="num">{count(s.queued)}</td>
                      <td className="num">{count(s.running)}</td>
                      <td className="num">{count(s.succeeded)}</td>
                      <td className="num" style={{ color: s.dead ? '#dc2626' : undefined }}>{count(s.dead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty icon={<Clock size={20} />} title="Queue is empty" text="No Auto Apply jobs have run yet." />}
        </Card>
      </div>

      <div className="ad-grid cols-2">
        <Card title="Slowest routes" description="Average response time since the server started" bodyClass={false}>
          <DataTable
            rows={h?.metrics.slowestRoutes}
            rowKey={(r) => r.route}
            empty={<Empty title="No requests yet" />}
            columns={[
              { key: 'route', header: 'Route', render: (r) => <span className="ad-mono">{r.route}</span> },
              { key: 'count', header: 'Calls', className: 'num', render: (r) => count(r.count) },
              { key: 'avg', header: 'Avg', className: 'num', render: (r) => `${count(r.avgMs)} ms` },
              { key: 'max', header: 'Max', className: 'num', render: (r) => <span className="muted">{count(r.maxMs)} ms</span> }
            ]}
          />
        </Card>
        <Card title="Recent server errors" bodyClass={false}>
          <DataTable
            rows={h?.metrics.recentErrors}
            rowKey={(r) => `${r.route}-${r.at}`}
            empty={<Empty icon={<CheckCircle2 size={20} />} title="No server errors" text="Nothing returned a 5xx since the server started." />}
            columns={[
              { key: 'route', header: 'Route', render: (r) => <span className="ad-mono">{r.route}</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status="failed" label={String(r.status)} /> },
              { key: 'at', header: 'When', render: (r) => <span className="muted">{ago(r.at)}</span> }
            ]}
          />
        </Card>
      </div>

      {h && (
        <p className="ad-hint" style={{ marginTop: 16 }}>
          Node {h.server.node} · memory {h.server.memoryMb.rss} MB (heap {h.server.memoryMb.heapUsed}/{h.server.memoryMb.heapTotal} MB). On hosts with several instances, request numbers cover only the instance that answered.
        </p>
      )}
    </>
  );
}

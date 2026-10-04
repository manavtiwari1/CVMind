import { useState } from 'react';
import { Inbox, LifeBuoy, Mail, Paperclip, RefreshCw, Send, StickyNote } from 'lucide-react';
import { api, downloadExport } from '../api';
import type { Paged } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { ago, dateTime } from '../format';
import type { ReactNode } from 'react';
import { Badge, DataTable, Drawer, Empty, ErrorState, Card, Notice, PageHeader, Pagination, SearchInput, Segment, Select, Spinner, StatusBadge, Tabs } from '../ui';

interface TicketRow {
  id: string;
  number: number;
  name: string;
  email: string;
  subject: string;
  status: string;
  priority: string;
  source: 'form' | 'email';
  // The email belongs to an account with a verified address
  senderVerified: boolean;
  assigneeId: string;
  assigneeName: string;
  messageCount: number;
  preview: string;
  lastActivityAt: string;
  createdAt: string;
}

interface TicketDetail extends TicketRow {
  messages: Array<{ id: string; kind: 'customer' | 'reply' | 'note'; authorName: string; body: string; emailed: boolean; attachments: number; viaEmail: boolean; createdAt: string }>;
  resolvedAt: string | null;
  user: { id: string; name: string; status: string; createdAt: string; emailVerified: boolean; riskScore: number; riskFlags: string[] } | null;
  emailConfigured: boolean;
  supportEmail: string;
}

type View = 'unresolved' | 'new' | 'open' | 'pending' | 'resolved' | 'mine' | 'all';

export default function Tickets() {
  const { params, go, can, refreshBadges } = useAdmin();
  const [view, setView] = useState<View>((params.status as View) || 'unresolved');
  const [q, setQ] = useState(params.q || '');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const query = {
    status: view === 'mine' || view === 'all' ? '' : view,
    assignee: view === 'mine' ? 'me' : '',
    priority,
    q: search,
    page,
    limit: 25
  };
  const { data, error, loading, reload } = useApi<Paged<TicketRow> & { counts: Record<string, number> }>('/tickets', query);
  const counts = data?.counts || {};
  const inbox = useApi<{ data: InboxStatus }>('/tickets/inbox');
  const { busy, run } = useAction();
  const syncNow = async () => {
    const ok = await run('sync', () => api<{ data: { created: number; added: number } }>('/tickets/inbox/sync', { method: 'POST' }));
    inbox.reload();
    if (ok) {
      reload();
      refreshBadges();
    }
  };
  const unresolved = (counts.new || 0) + (counts.open || 0) + (counts.pending || 0);

  return (
    <>
      <PageHeader
        title="Support"
        description="Contact form messages and emails to the support inbox land here as tickets. Reply by email, leave internal notes, and assign them to your team."
        actions={can('reports.export') && <button type="button" className="ad-btn" onClick={() => downloadExport('tickets', query)}>Export CSV</button>}
      />
      <InboxBar status={inbox.data?.data} syncing={busy === 'sync'} canSync={can('tickets.manage')} onSync={syncNow} />
      <Tabs<View>
        active={view}
        onChange={(v) => { setView(v); setPage(1); }}
        tabs={[
          { id: 'unresolved', label: 'Unresolved', count: unresolved },
          { id: 'new', label: 'New', count: counts.new || 0 },
          { id: 'open', label: 'Open', count: counts.open || 0 },
          { id: 'pending', label: 'Waiting on customer', count: counts.pending || 0 },
          { id: 'resolved', label: 'Resolved', count: counts.resolved || 0 },
          { id: 'mine', label: 'Assigned to me' },
          { id: 'all', label: 'All' }
        ]}
      />
      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search email, subject, message or #number" />
          <Select label="Priority" value={priority} onChange={(v) => { setPriority(v); setPage(1); }} options={[{ value: '', label: 'Any priority' }, { value: 'urgent', label: 'Urgent' }, { value: 'high', label: 'High' }, { value: 'normal', label: 'Normal' }, { value: 'low', label: 'Low' }]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(t) => t.id}
          onRowClick={(t) => go('tickets', { id: t.id })}
          empty={<Empty icon={<LifeBuoy size={20} />} title={view === 'unresolved' ? 'Inbox zero' : 'No tickets here'} text={view === 'unresolved' ? 'Every support request has been resolved.' : 'Try another tab or search.'} />}
          columns={[
            { key: 'ticket', header: 'Ticket', render: (t) => (
              <div style={{ maxWidth: 440 }}>
                <div className="ad-cell-title">
                  {t.source === 'email' && <Mail size={13} color="#6b7280" aria-label="From email" style={{ marginRight: 6 }} />}
                  #{t.number} · {t.subject}
                </div>
                <div className="ad-cell-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.preview}</div>
              </div>
            ) },
            { key: 'from', header: 'From', render: (t) => <div><div>{t.name || '—'} {!t.senderVerified && <Badge tone="amber">Unverified sender</Badge>}</div><div className="ad-cell-sub">{t.email}</div></div> },
            { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} label={t.status === 'pending' ? 'Waiting' : undefined} /> },
            { key: 'priority', header: 'Priority', render: (t) => t.priority === 'normal' ? <span className="muted">Normal</span> : <StatusBadge status={t.priority} /> },
            { key: 'assignee', header: 'Assignee', render: (t) => t.assigneeName || <span className="muted">Unassigned</span> },
            { key: 'activity', header: 'Last activity', render: (t) => <span className="muted" title={dateTime(t.lastActivityAt)}>{ago(t.lastActivityAt)}</span> }
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>
      {params.id && <TicketDrawer id={params.id} onClose={() => go('tickets')} onChanged={() => { reload(); refreshBadges(); }} />}
    </>
  );
}

function TicketDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { can, go } = useAdmin();
  const { data, error, reload } = useApi<{ data: TicketDetail }>(`/tickets/${id}`);
  const assignees = useApi<{ data: Array<{ id: string; name: string; role: string }> }>(can('tickets.manage') ? '/tickets/assignees' : null);
  const { busy, run } = useAction();
  const [kind, setKind] = useState<'reply' | 'note'>('reply');
  const [body, setBody] = useState('');
  const t = data?.data;
  const manage = can('tickets.manage');

  const update = async (patch: Record<string, string>, message: string) => {
    const ok = await run('update', () => api(`/tickets/${id}`, { method: 'PATCH', body: patch }), message);
    if (ok !== undefined) { reload(); onChanged(); }
  };

  const send = async () => {
    const ok = await run('send', () => api(`/tickets/${id}/messages`, { method: 'POST', body: { kind, body } }), kind === 'reply' ? 'Reply emailed' : 'Note added');
    if (ok !== undefined) { setBody(''); reload(); onChanged(); }
  };

  return (
    <Drawer
      title={t ? `#${t.number} · ${t.subject}` : 'Ticket'}
      subtitle={t ? <>{t.name} &lt;{t.email}&gt; · opened {dateTime(t.createdAt)}</> : undefined}
      onClose={onClose}
    >
      {error && !t ? <ErrorState message={error} onRetry={reload} /> : !t ? <div className="ad-empty"><Spinner size={20} /></div> : (
        <>
          <div className="ad-form-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div className="ad-field">
              <label htmlFor="t-status">Status</label>
              <select id="t-status" className="ad-select sm" value={t.status} disabled={!manage || busy === 'update'} onChange={(e) => update({ status: e.target.value }, 'Status updated')}>
                <option value="new">New</option>
                <option value="open">Open</option>
                <option value="pending">Waiting on customer</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="ad-field">
              <label htmlFor="t-priority">Priority</label>
              <select id="t-priority" className="ad-select sm" value={t.priority} disabled={!manage || busy === 'update'} onChange={(e) => update({ priority: e.target.value }, 'Priority updated')}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="ad-field">
              <label htmlFor="t-assignee">Assignee</label>
              <select id="t-assignee" className="ad-select sm" value={t.assigneeId} disabled={!manage || busy === 'update'} onChange={(e) => update({ assigneeId: e.target.value }, 'Ticket assigned')}>
                <option value="">Unassigned</option>
                {(assignees.data?.data || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                {t.assigneeId && !assignees.data?.data.some((a) => a.id === t.assigneeId) && <option value={t.assigneeId}>{t.assigneeName}</option>}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0' }}>
            {t.user ? (
              <>
                <Badge tone="green">CVMind user</Badge>
                {t.user.emailVerified ? <Badge tone="green">Verified email</Badge> : <Badge tone="amber">Unverified email</Badge>}
                {t.user.riskScore > 0 && <Badge tone={t.user.riskScore >= 50 ? 'red' : 'amber'}>Risk flagged</Badge>}
                {t.user.status !== 'active' && <StatusBadge status={t.user.status} />}
                {can('users.view') && <button type="button" className="ad-link ad-small" onClick={() => go('users', { id: t.user!.id })}>Open profile</button>}
              </>
            ) : <><Badge tone="gray">Not a registered user</Badge><Badge tone="amber">Unverified sender</Badge></>}
          </div>

          <div className="ad-thread">
            {t.messages.map((m) => (
              <div key={m.id} className={`ad-msg ${m.kind}`}>
                <div className="ad-msg-head">
                  <strong>{m.kind === 'customer' ? (m.authorName || t.email) : m.authorName}</strong>
                  <span>
                    {m.kind === 'customer' && m.viaEmail && 'By email · '}
                    {m.attachments > 0 && <><Paperclip size={11} /> {m.attachments} {m.attachments === 1 ? 'attachment' : 'attachments'} in Gmail · </>}
                    {m.kind === 'note' && 'Internal note · '}
                    {m.kind === 'reply' && (m.emailed ? 'Emailed · ' : 'Not emailed · ')}
                    {dateTime(m.createdAt)}
                  </span>
                </div>
                <div className="ad-msg-body">{m.body}</div>
              </div>
            ))}
          </div>

          {manage && (
            <>
              {kind === 'reply' && !t.emailConfigured && (
                <div style={{ marginTop: 16 }}>
                  <Notice tone="amber">Email isn't set up on the server (RESEND_API_KEY), so replies can't be sent. You can still add internal notes.</Notice>
                </div>
              )}
              <div className="ad-composer">
                <Segment value={kind} onChange={setKind} options={[{ value: 'reply', label: 'Reply by email' }, { value: 'note', label: 'Internal note' }]} />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={kind === 'reply' ? `Write to ${t.name || t.email}…` : 'Only your team sees this'}
                  aria-label={kind === 'reply' ? 'Reply' : 'Internal note'}
                />
                <div className="ad-composer-foot">
                  <span className="ad-hint">{kind === 'reply' ? `Sent to ${t.email}. Their reply goes to ${t.supportEmail}` : 'Not sent to the customer'}</span>
                  <button type="button" className="ad-btn primary sm" disabled={!body.trim() || busy === 'send' || (kind === 'reply' && !t.emailConfigured)} onClick={send}>
                    {busy === 'send' ? <Spinner size={13} /> : kind === 'reply' ? <Send size={13} /> : <StickyNote size={13} />}
                    {kind === 'reply' ? 'Send reply' : 'Add note'}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Drawer>
  );
}

interface InboxStatus {
  configured: boolean;
  address: string;
  lastSyncAt: string | null;
  lastError: string;
  lastErrorAt: string | null;
  lastCounts: { created: number; added: number } | null;
}

// Connection state of the support inbox (Gmail), with a manual "Check now"
function InboxBar({ status, syncing, canSync, onSync }: { status?: InboxStatus; syncing: boolean; canSync: boolean; onSync: () => void }) {
  if (!status) return null;
  if (!status.configured) {
    return (
      <div style={{ marginBottom: 16 }}>
        <Notice tone="amber">
          <strong>Connect the support inbox to see email replies here.</strong> Customers' replies go to {status.address}. To pull them in:
          turn on 2-Step Verification for that Google account, create an App Password at myaccount.google.com/apppasswords,
          then set <span className="ad-mono">SUPPORT_INBOX_APP_PASSWORD</span> on the server and restart it.
        </Notice>
      </div>
    );
  }
  // The latest attempt failed if its error is newer than the last good sync
  const failing = !!status.lastError && (!status.lastSyncAt || (!!status.lastErrorAt && status.lastErrorAt > status.lastSyncAt));
  const line: ReactNode = failing
    ? <>Couldn't read <strong>{status.address}</strong>: {status.lastError}</>
    : <>Connected to <strong>{status.address}</strong> · {status.lastSyncAt ? `checked ${ago(status.lastSyncAt)}` : 'not checked yet'}</>;
  return (
    <div className="ad-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 16 }}>
      <span className={`ad-stat-icon${failing ? ' red' : ''}`} style={{ width: 30, height: 30 }}><Inbox size={15} /></span>
      <span className="ad-small" style={{ flex: 1, minWidth: 0 }}>{line}</span>
      {canSync && (
        <button type="button" className="ad-btn sm" onClick={onSync} disabled={syncing}>
          {syncing ? <Spinner size={13} /> : <RefreshCw size={13} />} Check now
        </button>
      )}
    </div>
  );
}

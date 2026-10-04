import { useState } from 'react';
import { BadgeCheck, Ban, KeyRound, LogOut, Mail, MonitorSmartphone, PauseCircle, PlayCircle, Puzzle, Trash2, Users as UsersIcon } from 'lucide-react';
import { api, downloadExport } from '../api';
import type { Paged } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { ago, count, date, dateTime, money, providerLabel } from '../format';
import { Avatar, Badge, Card, ConfirmDialog, DataTable, Drawer, Empty, ErrorState, PageHeader, Pagination, SearchInput, Select, Spinner, StatusBadge } from '../ui';

interface UserRow {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: string;
  status: 'active' | 'suspended' | 'banned';
  statusReason: string;
  emailVerified: boolean;
  createdAt: string;
  lastLogin: string | null;
  loginCount: number;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  avatar: string;
  address: string;
  provider: string;
  status: 'active' | 'suspended' | 'banned';
  statusReason: string;
  statusUpdatedAt: string | null;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  sessionsRevokedAt: string | null;
  autoApplyAccess: boolean;
  usage: Array<{ key: string; label: string; count: number }>;
  works: Array<{ id: string; title: string; type: string; hidden: boolean; updatedAt: string }>;
  logins: Array<{ id: string; provider: string; createdAt: string }>;
  payments: Array<{ id: string; amount: number; status: string; transactionId: string; createdAt: string }>;
  sessions: Array<{ id: string; device: string; browser: string; os: string; ip: string; provider: string; createdAt: string; lastSeenAt: string; revoked: boolean }>;
  devices: Array<{ id: string; name: string; lastSeenAt: string | null; createdAt: string }>;
  tickets: Array<{ id: string; number: number; subject: string; status: string; createdAt: string }>;
}

export default function Users() {
  const { params, go, can } = useAdmin();
  const [q, setQ] = useState(params.q || '');
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [verified, setVerified] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const query = { q: search, status, provider, verified, page, limit: 25 };
  const { data, error, loading, reload } = useApi<Paged<UserRow>>('/users', query);
  const [exporting, setExporting] = useState(false);

  const openId = params.id;
  const setFilter = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone with a CVMind account. Open a user to see their activity, sessions and payments."
        actions={can('reports.export') && (
          <button type="button" className="ad-btn" disabled={exporting} onClick={async () => {
            setExporting(true);
            try { await downloadExport('users', { q: search, status, provider, verified }); } finally { setExporting(false); }
          }}>
            {exporting && <Spinner size={14} />} Export CSV
          </button>
        )}
      />
      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={setFilter(setQ)} placeholder="Search name, email or user ID" />
          <Select label="Status" value={status} onChange={setFilter(setStatus)} options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'banned', label: 'Banned' }]} />
          <Select label="Sign-in method" value={provider} onChange={setFilter(setProvider)} options={[{ value: '', label: 'All sign-in methods' }, { value: 'password', label: 'Email & password' }, { value: 'google', label: 'Google' }, { value: 'github', label: 'GitHub' }, { value: 'linkedin', label: 'LinkedIn' }]} />
          <Select label="Verification" value={verified} onChange={setFilter(setVerified)} options={[{ value: '', label: 'Verified or not' }, { value: 'true', label: 'Verified' }, { value: 'false', label: 'Not verified' }]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(u) => u.id}
          onRowClick={(u) => go('users', { id: u.id })}
          empty={<Empty icon={<UsersIcon size={20} />} title="No users found" text={search || status || provider || verified ? 'Try a different search or filter.' : 'Nobody has signed up yet.'} />}
          columns={[
            { key: 'user', header: 'User', render: (u) => (
              <span className="ad-person">
                <Avatar name={u.name} email={u.email} src={u.avatar} />
                <div>
                  <div className="ad-cell-title">{u.name || '—'} {u.emailVerified && <BadgeCheck size={14} color="#2dc08d" aria-label="Verified" style={{ verticalAlign: '-2px' }} />}</div>
                  <div className="ad-cell-sub">{u.email}</div>
                </div>
              </span>
            ) },
            { key: 'provider', header: 'Sign-in', render: (u) => providerLabel(u.provider) },
            { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
            { key: 'joined', header: 'Joined', render: (u) => <span title={dateTime(u.createdAt)}>{date(u.createdAt)}</span> },
            { key: 'last', header: 'Last sign-in', render: (u) => <span className="muted" title={dateTime(u.lastLogin)}>{u.lastLogin ? ago(u.lastLogin) : 'Never'}</span> },
            { key: 'logins', header: 'Sign-ins', className: 'num', render: (u) => count(u.loginCount) }
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>
      {openId && <UserDrawer id={openId} onClose={() => go('users', search ? { q: search } : {})} onChanged={reload} />}
    </>
  );
}

type Pending =
  | { kind: 'status'; status: 'active' | 'suspended' | 'banned' }
  | { kind: 'delete' }
  | { kind: 'revoke-all' }
  | { kind: 'reset' };

function UserDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { can, go } = useAdmin();
  const { data, error, reload } = useApi<{ data: UserDetail }>(`/users/${id}`);
  const { busy, run } = useAction();
  const [pending, setPending] = useState<Pending | null>(null);
  const u = data?.data;

  const after = () => { reload(); onChanged(); };

  const act = async (fn: () => Promise<unknown>, success: string, then = after) => {
    const ok = await run('action', fn, success);
    setPending(null);
    if (ok !== undefined) then();
  };

  return (
    <Drawer
      title={u ? (u.name || u.email) : 'User'}
      subtitle={u?.email}
      onClose={onClose}
    >
      {error && !u ? <ErrorState message={error} onRetry={reload} /> : !u ? <div className="ad-empty"><Spinner size={20} /></div> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <Avatar size="lg" name={u.name} email={u.email} src={u.avatar} />
            <div style={{ minWidth: 0 }}>
              <div className="ad-chips">
                <StatusBadge status={u.status} />
                {u.emailVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="gray">Not verified</Badge>}
                <Badge tone="blue">{providerLabel(u.provider)}</Badge>
                {u.autoApplyAccess && <Badge tone="purple">Auto Apply</Badge>}
              </div>
              <div className="ad-cell-sub" style={{ marginTop: 6 }}>Joined {date(u.createdAt)} · ID <span className="ad-mono">{u.id}</span></div>
            </div>
          </div>

          {u.status !== 'active' && (
            <div className={`ad-notice ${u.status === 'banned' ? 'red' : 'amber'}`} style={{ marginBottom: 16 }}>
              <Ban size={16} />
              <div><strong>{u.status === 'banned' ? 'Banned' : 'Suspended'}{u.statusUpdatedAt ? ` on ${date(u.statusUpdatedAt)}` : ''}.</strong>{u.statusReason && <> Reason: {u.statusReason}</>}</div>
            </div>
          )}

          {can('users.manage') && (
            <div className="ad-actions-row" style={{ marginBottom: 8 }}>
              {u.status === 'active' ? (
                <>
                  <button type="button" className="ad-btn sm" onClick={() => setPending({ kind: 'status', status: 'suspended' })}><PauseCircle size={14} /> Suspend</button>
                  <button type="button" className="ad-btn sm danger-outline" onClick={() => setPending({ kind: 'status', status: 'banned' })}><Ban size={14} /> Ban</button>
                </>
              ) : (
                <button type="button" className="ad-btn sm primary" onClick={() => setPending({ kind: 'status', status: 'active' })}><PlayCircle size={14} /> Reactivate</button>
              )}
              <button type="button" className="ad-btn sm" disabled={busy === 'action'} onClick={() => act(() => api(`/users/${u.id}/verify`, { method: 'POST', body: { verified: !u.emailVerified } }), u.emailVerified ? 'Marked as not verified' : 'Marked as verified')}>
                <BadgeCheck size={14} /> {u.emailVerified ? 'Unverify' : 'Verify'}
              </button>
              {u.provider === 'password' && (
                <button type="button" className="ad-btn sm" onClick={() => setPending({ kind: 'reset' })}><KeyRound size={14} /> Send password reset</button>
              )}
              {can('users.delete') && (
                <button type="button" className="ad-btn sm danger-outline" onClick={() => setPending({ kind: 'delete' })}><Trash2 size={14} /> Delete</button>
              )}
            </div>
          )}

          <div className="ad-section-title" style={{ marginTop: 22 }}>Profile</div>
          <dl className="ad-kv">
            <dt>Email</dt><dd>{u.email}</dd>
            <dt>Sign-in method</dt><dd>{providerLabel(u.provider)}</dd>
            {u.address && (<><dt>Address</dt><dd>{u.address}</dd></>)}
            <dt>Verified</dt><dd>{u.emailVerified ? (u.emailVerifiedAt ? `Yes, ${date(u.emailVerifiedAt)}` : 'Yes') : 'No'}</dd>
            <dt>Last signed out everywhere</dt><dd>{u.sessionsRevokedAt ? dateTime(u.sessionsRevokedAt) : 'Never'}</dd>
          </dl>

          <div className="ad-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Signed-in devices</span>
            {can('sessions.manage') && (u.sessions.some((s) => !s.revoked) || u.devices.length > 0) && (
              <button type="button" className="ad-btn sm" onClick={() => setPending({ kind: 'revoke-all' })} style={{ textTransform: 'none', letterSpacing: 0 }}><LogOut size={13} /> Sign out everywhere</button>
            )}
          </div>
          {u.sessions.filter((s) => !s.revoked).length === 0 && u.devices.length === 0 ? (
            <p className="ad-muted ad-small">No tracked sessions. Sessions are recorded for sign-ins from now on.</p>
          ) : (
            <ul className="ad-list">
              {u.sessions.filter((s) => !s.revoked).map((s) => (
                <li key={s.id}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <MonitorSmartphone size={16} color="#6b7280" />
                    <div>
                      <div className="ad-cell-title">{s.browser} on {s.os} <span className="ad-muted" style={{ fontWeight: 400 }}>· {s.device}</span></div>
                      <div className="ad-cell-sub">Active {ago(s.lastSeenAt)} · signed in {date(s.createdAt)}{s.ip && <> · IP {s.ip}</>}</div>
                    </div>
                  </div>
                  {can('sessions.manage') && (
                    <button type="button" className="ad-btn sm" disabled={busy === s.id} onClick={() => run(s.id, () => api(`/users/${u.id}/sessions/${s.id}`, { method: 'DELETE' }), 'Session signed out').then((ok) => ok !== undefined && reload())}>Sign out</button>
                  )}
                </li>
              ))}
              {u.devices.map((d) => (
                <li key={d.id}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Puzzle size={16} color="#6b7280" />
                    <div>
                      <div className="ad-cell-title">{d.name} <span className="ad-muted" style={{ fontWeight: 400 }}>· Chrome extension</span></div>
                      <div className="ad-cell-sub">Last used {ago(d.lastSeenAt)} · paired {date(d.createdAt)}</div>
                    </div>
                  </div>
                  {can('sessions.manage') && (
                    <button type="button" className="ad-btn sm" disabled={busy === d.id} onClick={() => run(d.id, () => api(`/users/${u.id}/devices/${d.id}`, { method: 'DELETE' }), 'Extension disconnected').then((ok) => ok !== undefined && reload())}>Disconnect</button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="ad-section-title">Feature usage (all time)</div>
          {u.usage.length ? (
            <div className="ad-chips">{u.usage.map((f) => <Badge key={f.key} tone="gray">{f.label} · {count(f.count)}</Badge>)}</div>
          ) : <p className="ad-muted ad-small">No AI tools used while signed in.</p>}

          <div className="ad-section-title">Saved documents ({u.works.length}{u.works.length === 50 ? '+' : ''})</div>
          {u.works.length ? (
            <ul className="ad-list">
              {u.works.slice(0, 8).map((w) => (
                <li key={w.id}>
                  <div>
                    <div className="ad-cell-title">{w.title}</div>
                    <div className="ad-cell-sub">{w.type} · updated {date(w.updatedAt)}</div>
                  </div>
                  {w.hidden && <Badge tone="red">Hidden</Badge>}
                </li>
              ))}
            </ul>
          ) : <p className="ad-muted ad-small">No saved documents.</p>}

          {u.payments.length > 0 && (
            <>
              <div className="ad-section-title">Payments</div>
              <ul className="ad-list">
                {u.payments.map((p) => (
                  <li key={p.id}>
                    <div>
                      <div className="ad-cell-title">{money(p.amount)}</div>
                      <div className="ad-cell-sub ad-mono">{p.transactionId} · {date(p.createdAt)}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {u.tickets.length > 0 && (
            <>
              <div className="ad-section-title">Support tickets</div>
              <ul className="ad-list">
                {u.tickets.map((t) => (
                  <li key={t.id}>
                    <div>
                      {can('tickets.view') ? <button type="button" className="ad-link" onClick={() => go('tickets', { id: t.id })}>#{t.number} {t.subject}</button> : <span className="ad-cell-title">#{t.number} {t.subject}</span>}
                      <div className="ad-cell-sub">{date(t.createdAt)}</div>
                    </div>
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="ad-section-title">Recent sign-ins</div>
          {u.logins.length ? (
            <ul className="ad-list">
              {u.logins.slice(0, 8).map((l) => (
                <li key={l.id}><span>{providerLabel(l.provider)}</span><span className="ad-muted">{dateTime(l.createdAt)}</span></li>
              ))}
            </ul>
          ) : <p className="ad-muted ad-small">No sign-ins recorded.</p>}
        </>
      )}

      {u && pending?.kind === 'status' && (
        <ConfirmDialog
          title={pending.status === 'active' ? `Reactivate ${u.name || u.email}?` : pending.status === 'suspended' ? `Suspend ${u.name || u.email}?` : `Ban ${u.name || u.email}?`}
          description={pending.status === 'active'
            ? 'They can sign in and use CVMind again.'
            : pending.status === 'suspended'
              ? 'They are signed out right away and see your reason when they try to sign in. You can reactivate them later.'
              : 'They are signed out right away and can no longer sign in. Their data is kept.'}
          confirmLabel={pending.status === 'active' ? 'Reactivate' : pending.status === 'suspended' ? 'Suspend user' : 'Ban user'}
          danger={pending.status !== 'active'}
          reason={pending.status === 'active' ? undefined : { label: 'Reason (shown to the user)', placeholder: 'e.g. Repeated spam in support requests', required: true }}
          busy={busy === 'action'}
          onClose={() => setPending(null)}
          onConfirm={(reason) => act(() => api(`/users/${u.id}/status`, { method: 'POST', body: { status: pending.status, reason } }), pending.status === 'active' ? 'User reactivated' : `User ${pending.status}`)}
        />
      )}
      {u && pending?.kind === 'reset' && (
        <ConfirmDialog
          title="Send a password reset link?"
          description={<>We'll email <strong>{u.email}</strong> a link to set a new password. It works for 1 hour.</>}
          confirmLabel="Send link"
          busy={busy === 'action'}
          onClose={() => setPending(null)}
          onConfirm={() => act(() => api(`/users/${u.id}/password-reset`, { method: 'POST' }), 'Reset link sent', () => {})}
        />
      )}
      {u && pending?.kind === 'revoke-all' && (
        <ConfirmDialog
          title="Sign out everywhere?"
          description="Every browser, the mobile app and the Chrome extension are signed out. The user can sign in again."
          confirmLabel="Sign out everywhere"
          danger
          busy={busy === 'action'}
          onClose={() => setPending(null)}
          onConfirm={() => act(async () => {
            await api(`/users/${u.id}/sessions/revoke-all`, { method: 'POST' });
            await Promise.all(u.devices.map((d) => api(`/users/${u.id}/devices/${d.id}`, { method: 'DELETE' })));
          }, 'Signed out everywhere')}
        />
      )}
      {u && pending?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete this account?"
          description="The account, saved documents and coding progress are deleted for good. This can't be undone."
          confirmLabel="Delete account"
          danger
          typeToConfirm={u.email}
          busy={busy === 'action'}
          onClose={() => setPending(null)}
          onConfirm={() => act(() => api(`/users/${u.id}`, { method: 'DELETE', body: { confirm: u.email } }), 'Account deleted', () => { onChanged(); onClose(); })}
        />
      )}
      {!can('users.manage') && u && (
        <p className="ad-muted ad-small" style={{ marginTop: 20 }}><Mail size={12} style={{ verticalAlign: '-2px' }} /> Your role can view users but not change them.</p>
      )}
    </Drawer>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckSquare, Copy, ExternalLink, Hash, HardDrive, Lock, Mail, Megaphone, Pin, Plus, RefreshCw, Send, Trash2, Users } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { ago, count, dateTime } from '../format';
import { Badge, BarList, Card, ConfirmDialog, DataTable, Empty, Modal, Notice, PageHeader, Pagination, SearchInput, Segment, Spinner, StatCard, Switch, Tabs } from '../ui';
import type { Tone } from '../ui';

// CVMind Team (team.cvmind.in): invitations, access, channels, announcements and moderation

type View = 'overview' | 'invitations' | 'access' | 'channels' | 'announcements' | 'moderation';

interface Person { id: string; name: string; username: string; roleLabel: string; active: boolean }
const usePeople = () => {
  const { data } = useApi<{ data: Person[] }>('/team/members');
  const map = new Map((data?.data || []).map((p) => [p.id, p]));
  return { list: data?.data || [], name: (id: string | null) => (id ? map.get(id)?.name || 'Former member' : '—') };
};

export default function TeamWorkspace() {
  const [view, setView] = useState<View>('overview');
  const overview = useApi<{ data: Overview }>('/team/overview');
  return (
    <>
      <PageHeader
        title="Team workspace"
        description="CVMind Team at team.cvmind.in: announcements, tasks and chat for the team. Invite people, decide who has access, and moderate it here."
        actions={<a className="ad-btn" href={overview.data?.data.appUrl || 'https://team.cvmind.in'} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open team.cvmind.in</a>}
      />
      <Tabs<View>
        active={view}
        onChange={setView}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'invitations', label: 'Invitations', count: overview.data?.data.pendingInvites || undefined },
          { id: 'access', label: 'Access' },
          { id: 'channels', label: 'Channels' },
          { id: 'announcements', label: 'Announcements' },
          { id: 'moderation', label: 'Moderation' }
        ]}
      />
      {view === 'overview' && <OverviewTab data={overview.data?.data} loading={overview.loading} />}
      {view === 'invitations' && <InvitationsTab onChanged={overview.reload} />}
      {view === 'access' && <AccessTab />}
      {view === 'channels' && <ChannelsTab />}
      {view === 'announcements' && <AnnouncementsTab />}
      {view === 'moderation' && <ModerationTab />}
    </>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
interface Overview {
  members: number; active7: number; overdue: number; pendingInvites: number; storageBytes: number; files: number; appUrl: string;
  messagesPerDay: Array<{ day: string; count: number }>;
  tasksByStatus: Record<string, number>;
}

const STATUS_LABELS: Record<string, string> = { todo: 'To do', in_progress: 'In progress', blocked: 'Blocked', submitted: 'Awaiting review', changes_requested: 'Changes requested', approved: 'Done' };
const R2_FREE_BYTES = 10 * 1024 * 1024 * 1024;
const gb = (bytes: number) => `${(bytes / 1024 / 1024 / 1024).toFixed(bytes > 1024 ** 3 ? 1 : 2)} GB`;

function OverviewTab({ data, loading }: { data?: Overview; loading: boolean }) {
  return (
    <>
      <div className="ad-grid cols-4">
        <StatCard label="People with access" value={count(data?.members)} icon={<Users size={18} />} loading={loading && !data} foot={<span>{count(data?.active7)} active this week</span>} />
        <StatCard label="Overdue tasks" value={count(data?.overdue)} icon={<CheckSquare size={18} />} tone={data?.overdue ? 'red' : 'green'} loading={loading && !data} />
        <StatCard label="Pending invitations" value={count(data?.pendingInvites)} icon={<Mail size={18} />} tone="purple" loading={loading && !data} />
        <StatCard label="File storage" value={data ? gb(data.storageBytes) : '—'} icon={<HardDrive size={18} />} tone="blue" loading={loading && !data} foot={<span>{count(data?.files)} files · {data ? Math.round((data.storageBytes / R2_FREE_BYTES) * 100) : 0}% of the 10 GB free tier</span>} />
      </div>
      <div className="ad-grid cols-2">
        <Card title="Messages per day" description="Last 30 days">
          {data && data.messagesPerDay.length
            ? <BarList items={data.messagesPerDay.slice(-14).reverse().map((d) => ({ label: new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: d.count }))} />
            : <Empty title="No messages yet" />}
        </Card>
        <Card title="Tasks by status">
          {data && Object.keys(data.tasksByStatus).length
            ? <BarList tone="purple" items={Object.entries(STATUS_LABELS).map(([k, label]) => ({ label, value: data.tasksByStatus[k] || 0 }))} />
            : <Empty title="No tasks yet" />}
        </Card>
      </div>
    </>
  );
}

// ── Invitations ──────────────────────────────────────────────────────────────
interface Invitation {
  id: string; adminId: string; name: string; email: string; username: string; role: string; roleLabel: string;
  invitedByName: string; status: 'sent' | 'failed' | 'accepted' | 'revoked'; lastError: string; resendCount: number;
  sentAt: string | null; acceptedAt: string | null; revokedAt: string | null; createdAt: string;
}
interface InviteRole { label: string; description: string; manager: boolean; teamOnly: boolean; leadership: boolean }
interface InvitationsResponse { data: Invitation[]; total: number; page: number; limit: number; counts: Record<string, number>; emailConfigured: boolean; roles: Record<string, InviteRole> }

const INVITE_TONE: Record<Invitation['status'], Tone> = { sent: 'blue', failed: 'red', accepted: 'green', revoked: 'gray' };
const INVITE_LABEL: Record<Invitation['status'], string> = { sent: 'Sent', failed: 'Failed', accepted: 'Accepted', revoked: 'Revoked' };

function InvitationsTab({ onChanged }: { onChanged: () => void }) {
  const { busy, run } = useAction();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const [inviting, setInviting] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const { data, error, loading, reload } = useApi<InvitationsResponse>('/team/invitations', { status, q: search, page });
  const refresh = () => { reload(); onChanged(); };

  const resend = (i: Invitation) => run(i.id, () => api(`/team/invitations/${i.id}/resend`, { method: 'POST' }), `New password emailed to ${i.email}`).then((ok) => ok !== undefined && refresh());

  return (
    <>
      {data && !data.emailConfigured && <Notice tone="amber">Email is not set up on this server (RESEND_API_KEY), so invitations will be marked Failed. Accounts are still created; share the details yourself or resend once email works.</Notice>}
      <Card
        bodyClass={false}
        title="Invitations"
        description="Add a teammate with their email and a temporary password. The invitation email goes out right away, and they choose their own password at first sign-in."
        actions={<button type="button" className="ad-btn primary sm" onClick={() => setInviting(true)}><Plus size={14} /> Invite teammate</button>}
      >
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, email or username" />
          <Segment<string>
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={(['', 'sent', 'failed', 'accepted', 'revoked'] as const).map((k) => ({ value: k, label: `${k ? INVITE_LABEL[k] : 'All'}${k && data?.counts[k] ? ` · ${data.counts[k]}` : ''}` }))}
          />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(i) => i.id}
          empty={<Empty icon={<Mail size={20} />} title="No invitations yet" text="Invite your first teammate to CVMind Team." />}
          columns={[
            { key: 'name', header: 'Name', render: (i) => <span><strong>{i.name || i.username}</strong><br /><span className="muted">@{i.username}</span></span> },
            { key: 'email', header: 'Email', render: (i) => i.email },
            { key: 'role', header: 'Role', render: (i) => i.roleLabel },
            { key: 'by', header: 'Invited by', render: (i) => <span className="muted">{i.invitedByName || '—'}</span> },
            { key: 'sent', header: 'Sent at', render: (i) => <span className="muted" title={dateTime(i.sentAt)}>{i.sentAt ? ago(i.sentAt) : '—'}{i.resendCount ? ` · resent ${i.resendCount}×` : ''}</span> },
            { key: 'status', header: 'Status', render: (i) => (
              <span title={i.status === 'failed' ? i.lastError : i.acceptedAt ? `Joined ${dateTime(i.acceptedAt)}` : undefined}>
                <Badge tone={INVITE_TONE[i.status]} dot>{INVITE_LABEL[i.status]}</Badge>
                {i.status === 'failed' && i.lastError && <><br /><span className="muted" style={{ fontSize: 12 }}>{i.lastError}</span></>}
              </span>
            ) },
            { key: 'actions', header: '', className: 'actions', render: (i) => (i.status === 'sent' || i.status === 'failed') && (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button type="button" className="ad-btn sm" disabled={busy === i.id || i.resendCount >= 5} onClick={() => resend(i)} title="Generate a new temporary password and email it again">{busy === i.id ? <Spinner size={13} /> : <RefreshCw size={13} />} Resend</button>
                <button type="button" className="ad-btn sm danger-outline" onClick={() => setRevoking(i)}>Revoke</button>
              </span>
            ) }
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>
      {inviting && data && <InviteForm roles={data.roles} emailConfigured={data.emailConfigured} onClose={() => setInviting(false)} onDone={() => { setInviting(false); refresh(); }} />}
      {revoking && (
        <ConfirmDialog
          title={`Revoke ${revoking.name || revoking.username}'s invitation?`}
          description="Their account is turned off and the details in the email stop working. You can invite them again later with a new username."
          confirmLabel="Revoke"
          danger
          busy={busy === 'revoke'}
          onClose={() => setRevoking(null)}
          onConfirm={async () => {
            const ok = await run('revoke', () => api(`/team/invitations/${revoking.id}`, { method: 'DELETE' }), 'Invitation revoked');
            setRevoking(null);
            if (ok !== undefined) refresh();
          }}
        />
      )}
    </>
  );
}

const ROLE_GROUPS: Array<{ label: string; match: (r: InviteRole) => boolean }> = [
  { label: 'Team members (CVMind Team only)', match: (r) => r.teamOnly },
  { label: 'Leadership (full access)', match: (r) => r.leadership },
  { label: 'Admin panel staff', match: (r) => !r.teamOnly && !r.leadership }
];

const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
};

function InviteForm({ roles, emailConfigured, onClose, onDone }: { roles: Record<string, InviteRole>; emailConfigured: boolean; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const firstTeamRole = Object.keys(roles).find((k) => roles[k].teamOnly);
  const [form, setForm] = useState({ name: '', email: '', username: '', role: firstTeamRole || Object.keys(roles)[0], password: generatePassword() });
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const set =(k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await run('invite', () => api<{ data: Invitation }>('/team/invitations', { method: 'POST', body: form }));
    if (!res) return;
    // The account exists even when the email fails; show the details here so they can be shared
    if (res.data.status === 'failed') setFailed(res.data.lastError || 'The email could not be sent.');
    else onDone();
  };

  if (failed !== null) {
    const details = `Website: team.cvmind.in\nUsername: ${form.username}\nTemporary password: ${form.password}`;
    return (
      <Modal title="Account created, but the email didn't go out" description={failed} onClose={onDone} footer={<>
        <button type="button" className="ad-btn" onClick={() => navigator.clipboard?.writeText(details).catch(() => {})}><Copy size={14} /> Copy details</button>
        <button type="button" className="ad-btn primary" onClick={onDone}>Done</button>
      </>}>
        <p className="muted" style={{ marginBottom: 12 }}>Share these with {form.name || form.username} privately, or press Resend in the Invitations table once email works.</p>
        <pre style={{ background: '#f6f7f9', border: '1px solid #e8ebef', borderRadius: 8, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>{details}</pre>
      </Modal>
    );
  }

  return (
    <Modal
      title="Invite a teammate"
      description={emailConfigured ? 'They get an email with the sign-in link, their username and this temporary password.' : 'Email is not set up, so you will need to share the details yourself.'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="ad-invite" className="ad-btn primary" disabled={busy === 'invite' || !form.email || form.username.length < 3 || form.password.length < 10}>
            {busy === 'invite' ? <Spinner size={14} /> : <Send size={14} />} Send invitation
          </button>
        </>
      }
    >
      <form id="ad-invite" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="iv-name">Full name</label>
            <input id="iv-name" className="ad-input" value={form.name} autoFocus onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, username: usernameTouched ? f.username : slug(e.target.value.split(' ')[0] || '') }))} />
          </div>
          <div className="ad-field">
            <label htmlFor="iv-user">Username</label>
            <input id="iv-user" className="ad-input" value={form.username} autoComplete="off" onChange={(e) => { setUsernameTouched(true); setForm((f) => ({ ...f, username: slug(e.target.value) })); }} />
          </div>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="iv-email">Email</label>
          <input id="iv-email" type="email" className="ad-input" value={form.email} onChange={set('email')} required placeholder="name@cvmind.in" />
        </div>
        <div className="ad-field">
          <label htmlFor="iv-role">Role</label>
          <select id="iv-role" className="ad-select" value={form.role} onChange={set('role')}>
            {ROLE_GROUPS.map((g) => {
              const entries = Object.entries(roles).filter(([, r]) => g.match(r));
              return entries.length > 0 && (
                <optgroup key={g.label} label={g.label}>
                  {entries.map(([key, r]) => <option key={key} value={key}>{r.teamOnly ? r.label : `${r.label}: ${r.description}`}</option>)}
                </optgroup>
              );
            })}
          </select>
          <span className="ad-hint">{roles[form.role]?.teamOnly
            ? 'Uses CVMind Team only: chat, tasks and announcements. They cannot open the admin panel.'
            : roles[form.role]?.leadership
              ? 'Full access: the whole admin panel, team and roles, and manages CVMind Team (tasks, reviews, announcements).'
              : 'Uses CVMind Team, and also gets the admin panel access shown for this role.'}</span>
        </div>
        <div className="ad-field">
          <label htmlFor="iv-pass">Temporary password</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="iv-pass" className="ad-input" value={form.password} onChange={set('password')} autoComplete="new-password" style={{ fontFamily: 'Menlo, Consolas, monospace' }} />
            <button type="button" className="ad-btn" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}><RefreshCw size={14} /> Generate</button>
          </div>
          <span className="ad-hint">At least 10 characters. They must change it the first time they sign in.</span>
        </div>
      </form>
    </Modal>
  );
}

// ── Access ───────────────────────────────────────────────────────────────────
interface AccessRow { id: string; name: string; username: string; email: string; roleLabel: string; role: string; active: boolean; chatAccess: boolean; mustChangePassword: boolean; lastSeenAt: string | null; lastLoginAt: string | null }

function AccessTab() {
  const { admin } = useAdmin();
  const { busy, run } = useAction();
  const { data, error, loading, reload } = useApi<{ data: AccessRow[] }>('/team/access');
  const toggle = (row: AccessRow, chatAccess: boolean) =>
    run(row.id, () => api(`/team/access/${row.id}`, { method: 'PATCH', body: { chatAccess } }), chatAccess ? `${row.name} can use CVMind Team` : `${row.name} was signed out of CVMind Team`).then((ok) => ok !== undefined && reload());
  return (
    <Card bodyClass={false} title="Who can use CVMind Team" description="Turning access off signs the person out of team.cvmind.in right away. Their admin panel access doesn't change; manage that in Team & roles.">
      <DataTable
        rows={data?.data}
        loading={loading}
        error={error}
        onRetry={reload}
        rowKey={(r) => r.id}
        columns={[
          { key: 'who', header: 'Person', render: (r) => <span><strong>{r.name}</strong><br /><span className="muted">@{r.username}{r.email ? ` · ${r.email}` : ''}</span></span> },
          { key: 'role', header: 'Role', render: (r) => r.roleLabel },
          { key: 'state', header: 'Account', render: (r) => !r.active ? <Badge tone="gray">Turned off</Badge> : r.mustChangePassword ? <Badge tone="amber">Hasn't signed in yet</Badge> : <Badge tone="green" dot>Active</Badge> },
          { key: 'seen', header: 'Last seen', render: (r) => <span className="muted">{r.lastSeenAt ? ago(r.lastSeenAt) : r.lastLoginAt ? ago(r.lastLoginAt) : 'Never'}</span> },
          { key: 'access', header: 'Team access', render: (r) => <Switch label={`${r.name} team access`} checked={r.chatAccess} disabled={busy === r.id || r.id === admin.id || !r.active} onChange={(v) => toggle(r, v)} /> }
        ]}
      />
    </Card>
  );
}

// ── Channels ─────────────────────────────────────────────────────────────────
interface ChannelRow { id: string; name: string; description: string; kind: 'public' | 'private'; archivedAt: string | null; lastMessageAt: string | null; createdAt: string; memberIds: string[] }

function ChannelsTab() {
  const { busy, run } = useAction();
  const people = usePeople();
  const { data, error, loading, reload } = useApi<{ data: ChannelRow[] }>('/team/manage/channels');
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<ChannelRow | null>(null);
  const patch = (c: ChannelRow, body: Record<string, unknown>, message: string) =>
    run(c.id, () => api(`/team/channels/${c.id}`, { method: 'PATCH', body }), message).then((ok) => ok !== undefined && reload());

  return (
    <>
      <Card bodyClass={false} title="Channels" description="Public channels are open to everyone on the team; private ones only to the people added (and managers). Direct messages are never shown here." actions={<button type="button" className="ad-btn primary sm" onClick={() => setCreating(true)}><Plus size={14} /> New channel</button>}>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(c) => c.id}
          empty={<Empty icon={<Hash size={20} />} title="No channels yet" text="#general is created the first time someone opens CVMind Team." />}
          columns={[
            { key: 'name', header: 'Channel', render: (c) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{c.kind === 'private' ? <Lock size={14} /> : <Hash size={14} />}<strong>{c.name}</strong>{c.archivedAt && <Badge tone="gray">Archived</Badge>}</span> },
            { key: 'desc', header: 'Description', render: (c) => <span className="muted">{c.description || '—'}</span> },
            { key: 'members', header: 'Members', render: (c) => <button type="button" className="ad-link" onClick={() => setMembers(c)}>{c.memberIds.length} {c.memberIds.length === 1 ? 'person' : 'people'}</button> },
            { key: 'active', header: 'Last message', render: (c) => <span className="muted">{c.lastMessageAt ? ago(c.lastMessageAt) : 'None'}</span> },
            { key: 'kind', header: 'Visibility', render: (c) => (
              <select className="ad-select sm" style={{ width: 'auto' }} value={c.kind} disabled={busy === c.id || c.name === 'general'} aria-label={`${c.name} visibility`} onChange={(e) => patch(c, { kind: e.target.value }, 'Visibility updated')}>
                <option value="public">Public</option><option value="private">Private</option>
              </select>
            ) },
            { key: 'actions', header: '', className: 'actions', render: (c) => c.name !== 'general' && (
              <button type="button" className="ad-btn sm" disabled={busy === c.id} onClick={() => patch(c, { archived: !c.archivedAt }, c.archivedAt ? 'Channel restored' : 'Channel archived')}>{c.archivedAt ? 'Restore' : 'Archive'}</button>
            ) }
          ]}
        />
      </Card>
      {creating && <NewChannel people={people.list} onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />}
      {members && <ChannelMembers channel={members} people={people.list} name={people.name} onClose={() => setMembers(null)} onChanged={() => { reload(); }} />}
    </>
  );
}

function NewChannel({ people, onClose, onDone }: { people: Person[]; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ name: '', description: '', kind: 'public' as 'public' | 'private', memberIds: [] as string[] });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('create', () => api('/team/channels', { method: 'POST', body: form }), `#${form.name} created`);
    if (ok !== undefined) onDone();
  };
  return (
    <Modal title="New channel" onClose={onClose} footer={<>
      <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="ad-new-channel" className="ad-btn primary" disabled={busy === 'create' || form.name.length < 2}>{busy === 'create' && <Spinner size={14} />} Create</button>
    </>}>
      <form id="ad-new-channel" onSubmit={submit}>
        <div className="ad-field">
          <label htmlFor="ch-name">Name</label>
          <input id="ch-name" className="ad-input" value={form.name} autoFocus placeholder="marketing" onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '') }))} />
        </div>
        <div className="ad-field">
          <label htmlFor="ch-desc">Description</label>
          <input id="ch-desc" className="ad-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="ad-field">
          <label htmlFor="ch-kind">Visibility</label>
          <select id="ch-kind" className="ad-select" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as 'public' | 'private' }))}>
            <option value="public">Public: anyone on the team can join</option>
            <option value="private">Private: only people you add</option>
          </select>
        </div>
        <fieldset className="ad-field" style={{ border: 0, padding: 0 }}>
          <legend style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Add people</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            {people.filter((p) => p.active).map((p) => (
              <label key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={form.memberIds.includes(p.id)} onChange={(e) => setForm((f) => ({ ...f, memberIds: e.target.checked ? [...f.memberIds, p.id] : f.memberIds.filter((x) => x !== p.id) }))} />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

function ChannelMembers({ channel, people, name, onClose, onChanged }: { channel: ChannelRow; people: Person[]; name: (id: string) => string; onClose: () => void; onChanged: () => void }) {
  const { busy, run } = useAction();
  const [memberIds, setMemberIds] = useState(channel.memberIds);
  const [adding, setAdding] = useState('');
  const add = async () => {
    const ok = await run('add', () => api(`/team/channels/${channel.id}/members`, { method: 'POST', body: { adminIds: [adding] } }), 'Added');
    if (ok !== undefined) { setMemberIds((m) => [...m, adding]); setAdding(''); onChanged(); }
  };
  const remove = async (id: string) => {
    const ok = await run(id, () => api(`/team/channels/${channel.id}/members/${id}`, { method: 'DELETE' }), 'Removed');
    if (ok !== undefined) { setMemberIds((m) => m.filter((x) => x !== id)); onChanged(); }
  };
  const general = channel.name === 'general';
  return (
    <Modal title={`#${channel.name} members`} onClose={onClose}>
      {!general && !channel.archivedAt && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select className="ad-select" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Add someone">
            <option value="">Add someone…</option>
            {people.filter((p) => p.active && !memberIds.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="button" className="ad-btn primary" disabled={!adding || busy === 'add'} onClick={add}>Add</button>
        </div>
      )}
      {general && <p className="muted" style={{ marginBottom: 10 }}>Everyone with team access is in #general.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {memberIds.map((id) => (
          <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{name(id)}</span>
            {!general && <button type="button" className="ad-btn sm danger-outline" disabled={busy === id} onClick={() => remove(id)}>Remove</button>}
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Announcements ────────────────────────────────────────────────────────────
interface AnnouncementRow { id: string; title: string; body: string; important: boolean; pinned: boolean; createdBy: string; ackCount: number; createdAt: string; editedAt: string | null }

function AnnouncementsTab() {
  const { busy, run } = useAction();
  const people = usePeople();
  const { data, error, loading, reload } = useApi<{ data: AnnouncementRow[] }>('/team/announcements', { limit: 50 });
  const [posting, setPosting] = useState(false);
  const [acks, setAcks] = useState<AnnouncementRow | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementRow | null>(null);
  const activeCount = people.list.filter((p) => p.active).length;
  const pin = (a: AnnouncementRow) => run(a.id, () => api(`/team/announcements/${a.id}`, { method: 'PATCH', body: { pinned: !a.pinned } }), a.pinned ? 'Unpinned' : 'Pinned').then((ok) => ok !== undefined && reload());

  return (
    <>
      <Card bodyClass={false} title="Announcements" description="Posted to everyone on CVMind Team, with a notification and an email. Important ones email even people who turned email off." actions={<button type="button" className="ad-btn primary sm" onClick={() => setPosting(true)}><Megaphone size={14} /> New announcement</button>}>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(a) => a.id}
          empty={<Empty icon={<Megaphone size={20} />} title="No announcements yet" />}
          columns={[
            { key: 'title', header: 'Announcement', render: (a) => <span><strong>{a.title}</strong> {a.important && <Badge tone="red">Important</Badge>} {a.pinned && <Badge tone="amber">Pinned</Badge>}<br /><span className="muted">{a.body.slice(0, 90)}{a.body.length > 90 ? '…' : ''}</span></span> },
            { key: 'by', header: 'Posted by', render: (a) => <span className="muted">{people.name(a.createdBy)} · {ago(a.createdAt)}</span> },
            { key: 'acks', header: 'Seen by', render: (a) => <button type="button" className="ad-link" onClick={() => setAcks(a)}>{a.ackCount}/{activeCount || '—'}</button> },
            { key: 'actions', header: '', className: 'actions', render: (a) => (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button type="button" className="ad-btn sm" disabled={busy === a.id} onClick={() => pin(a)}><Pin size={13} /> {a.pinned ? 'Unpin' : 'Pin'}</button>
                <button type="button" className="ad-btn sm danger-outline" onClick={() => setDeleting(a)}><Trash2 size={13} /></button>
              </span>
            ) }
          ]}
        />
      </Card>
      {posting && <PostAnnouncement onClose={() => setPosting(false)} onDone={() => { setPosting(false); reload(); }} />}
      {acks && <AckList announcement={acks} name={people.name} onClose={() => setAcks(null)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.title}”?`}
          description="It disappears for everyone. This is recorded in the audit log."
          confirmLabel="Delete"
          danger
          busy={busy === 'delete'}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const ok = await run('delete', () => api(`/team/announcements/${deleting.id}`, { method: 'DELETE' }), 'Announcement deleted');
            setDeleting(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </>
  );
}

function PostAnnouncement({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ title: '', body: '', important: false, pinned: false });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('post', () => api('/team/announcements', { method: 'POST', body: form }), 'Announcement posted');
    if (ok !== undefined) onDone();
  };
  return (
    <Modal title="New announcement" wide onClose={onClose} footer={<>
      <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="ad-ann" className="ad-btn primary" disabled={busy === 'post' || !form.title.trim() || !form.body.trim()}>{busy === 'post' && <Spinner size={14} />} Post to everyone</button>
    </>}>
      <form id="ad-ann" onSubmit={submit}>
        <div className="ad-field">
          <label htmlFor="an-t">Title</label>
          <input id="an-t" className="ad-input" value={form.title} maxLength={150} autoFocus onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="ad-field">
          <label htmlFor="an-b">Message</label>
          <textarea id="an-b" className="ad-textarea" style={{ minHeight: 160 }} value={form.body} maxLength={10000} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <span className="ad-hint">To attach files, post it from team.cvmind.in instead.</span>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}><input type="checkbox" checked={form.important} onChange={(e) => setForm((f) => ({ ...f, important: e.target.checked }))} /> Important (emails everyone)</label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.pinned} onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} /> Pin to the top</label>
      </form>
    </Modal>
  );
}

function AckList({ announcement, name, onClose }: { announcement: AnnouncementRow; name: (id: string) => string; onClose: () => void }) {
  const { data } = useApi<{ data: Array<{ adminId: string; ackedAt: string | null }>; total: number; acked: number }>(`/team/announcements/${announcement.id}/acks`);
  return (
    <Modal title={`Seen by ${data ? `${data.acked} of ${data.total}` : '…'}`} description={announcement.title} onClose={onClose}>
      {!data ? <Spinner /> : (
        <div className="ad-form-row">
          <div>
            <strong>Not yet</strong>
            {data.data.filter((x) => !x.ackedAt).map((x) => <div key={x.adminId} className="muted">{name(x.adminId)}</div>)}
          </div>
          <div>
            <strong>Acknowledged</strong>
            {data.data.filter((x) => x.ackedAt).map((x) => <div key={x.adminId}>{name(x.adminId)} <span className="muted">· {ago(x.ackedAt)}</span></div>)}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Moderation ───────────────────────────────────────────────────────────────
interface ModMessage { id: string; channelId: string; channelName: string; authorId: string; body: string; fileCount: number; createdAt: string }
interface ModFile { id: string; name: string; size: number; uploadedBy: string; channelName: string; createdAt: string }

function ModerationTab() {
  const { busy, run } = useAction();
  const people = usePeople();
  const [view, setView] = useState<'messages' | 'files'>('messages');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<{ data: Array<ModMessage & ModFile>; total: number; page: number; limit: number }>('/team/moderation', { view, q: search, page });
  const [removing, setRemoving] = useState<(ModMessage & ModFile) | null>(null);

  return (
    <>
      <Card bodyClass={false} title="Moderation" description="Recent messages and files in channels. Direct messages stay private and never appear here. Every removal is recorded in the audit log.">
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={view === 'files' ? 'Search file names' : 'Search messages'} />
          <Segment<'messages' | 'files'> value={view} onChange={(v) => { setView(v); setPage(1); }} options={[{ value: 'messages', label: 'Messages' }, { value: 'files', label: 'Files' }]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(r) => r.id}
          empty={<Empty title="Nothing to show" />}
          columns={view === 'messages' ? [
            { key: 'who', header: 'From', render: (m) => <span><strong>{people.name(m.authorId)}</strong><br /><span className="muted">#{m.channelName} · {ago(m.createdAt)}</span></span> },
            { key: 'body', header: 'Message', render: (m) => <span style={{ whiteSpace: 'pre-wrap' }}>{m.body.slice(0, 300) || <span className="muted">{m.fileCount} file(s)</span>}</span> },
            { key: 'actions', header: '', className: 'actions', render: (m) => <button type="button" className="ad-btn sm danger-outline" onClick={() => setRemoving(m)}><Trash2 size={13} /> Delete</button> }
          ] : [
            { key: 'name', header: 'File', render: (f) => <span><strong>{f.name}</strong><br /><span className="muted">{(f.size / 1024 / 1024).toFixed(1)} MB</span></span> },
            { key: 'who', header: 'Shared by', render: (f) => <span className="muted">{people.name(f.uploadedBy)} in #{f.channelName} · {ago(f.createdAt)}</span> },
            { key: 'actions', header: '', className: 'actions', render: (f) => <button type="button" className="ad-btn sm danger-outline" onClick={() => setRemoving(f)}><Trash2 size={13} /> Remove</button> }
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>
      {removing && (
        <ConfirmDialog
          title={view === 'files' ? `Remove ${removing.name}?` : 'Delete this message?'}
          description="It is removed for everyone in the channel."
          confirmLabel={view === 'files' ? 'Remove file' : 'Delete message'}
          danger
          reason={{ label: 'Reason (for the audit log)', placeholder: 'Shared customer data by mistake', required: true }}
          busy={busy === 'remove'}
          onClose={() => setRemoving(null)}
          onConfirm={async (reason) => {
            const path = `/team/moderation/${view === 'files' ? 'files' : 'messages'}/${removing.id}`;
            const ok = await run('remove', () => api(path, { method: 'DELETE', body: { reason } }), 'Removed');
            setRemoving(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </>
  );
}

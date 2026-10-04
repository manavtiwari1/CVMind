import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, KeyRound, Plus, UserCog } from 'lucide-react';
import { api } from '../api';
import type { AdminAccount } from '../api';
import { useAction, useAdmin, useApi } from '../hooks';
import { ago, date } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Empty, Modal, PageHeader, Person, Spinner, Switch, Tabs } from '../ui';
import MyPasswordForm from '../MyPasswordForm';

interface Member extends AdminAccount {
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
}
interface Role { label: string; description: string; permissions: string[] }
interface TeamResponse { data: Member[]; roles: Record<string, Role>; permissions: string[] }

const PERMISSION_LABELS: Record<string, string> = {
  'dashboard.view': 'See dashboards', 'users.view': 'View users', 'users.manage': 'Suspend, verify and reset users', 'users.delete': 'Delete user accounts',
  'sessions.manage': 'Sign users out', 'payments.view': 'View payments', 'payments.manage': 'Refund payments', 'coupons.manage': 'Manage coupons',
  'notifications.send': 'Send notifications', 'reports.export': 'Export reports', 'tickets.view': 'View support tickets', 'tickets.manage': 'Reply to and assign tickets',
  'content.manage': 'Edit site content', 'moderation.manage': 'Moderate content', 'orders.view': 'View applications', 'orders.manage': 'Fix applications and jobs',
  'partners.view': 'View companies', 'partners.manage': 'Verify and suspend companies', 'settings.view': 'View app config', 'settings.manage': 'Change feature switches and versions',
  'system.view': 'View system health', 'audit.view': 'View the audit log', 'team.manage': 'Manage the team and roles'
};

type View = 'members' | 'roles' | 'me';

export default function Team() {
  const [view, setView] = useState<View>('members');
  const { data, error, loading, reload } = useApi<TeamResponse>('/team');
  return (
    <>
      <PageHeader title="Team & roles" description="Give each person only the access their job needs. Changing someone's role or turning them off signs them out right away." />
      <Tabs<View> active={view} onChange={setView} tabs={[{ id: 'members', label: 'Members', count: data?.data.length }, { id: 'roles', label: 'Roles & permissions' }, { id: 'me', label: 'My password' }]} />
      {view === 'members' && <Members data={data} error={error} loading={loading} reload={reload} />}
      {view === 'roles' && data && <RoleMatrix data={data} />}
      {view === 'me' && <Card title="Change my password" description="If you signed in with the owner account from the server settings, that password keeps working too."><MyPasswordForm /></Card>}
    </>
  );
}

function Members({ data, error, loading, reload }: { data?: TeamResponse; error?: string; loading: boolean; reload: () => void }) {
  const { admin } = useAdmin();
  const { busy, run } = useAction();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const roles = data?.roles || {};

  const patch = (m: Member, body: Record<string, unknown>, message: string) =>
    run(m.id, () => api(`/team/${m.id}`, { method: 'PATCH', body }), message).then((ok) => ok !== undefined && reload());

  return (
    <>
      <Card
        bodyClass={false}
        title="Members"
        actions={<button type="button" className="ad-btn primary sm" onClick={() => setAdding(true)}><Plus size={14} /> Add member</button>}
      >
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(m) => m.id}
          empty={<Empty icon={<UserCog size={20} />} title="Only you so far" />}
          columns={[
            { key: 'who', header: 'Member', render: (m) => (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Person name={m.name} email={`@${m.username}${m.email ? ` · ${m.email}` : ''}`} />
                {m.id === admin.id && <Badge tone="purple">You</Badge>}
              </span>
            ) },
            { key: 'role', header: 'Role', render: (m) => (
              <select className="ad-select sm" style={{ width: 'auto' }} value={m.role} aria-label={`${m.name} role`} disabled={busy === m.id || m.id === admin.id} onChange={(e) => patch(m, { role: e.target.value }, 'Role updated')}>
                {Object.entries(roles).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}
              </select>
            ) },
            { key: 'last', header: 'Last sign-in', render: (m) => <span className="muted">{m.lastLoginAt ? ago(m.lastLoginAt) : 'Never'}</span> },
            { key: 'added', header: 'Added', render: (m) => <span className="muted">{date(m.createdAt)}</span> },
            { key: 'active', header: 'Active', render: (m) => <Switch label={`${m.name} active`} checked={m.active} disabled={busy === m.id || m.id === admin.id} onChange={(v) => patch(m, { active: v }, v ? 'Member turned on' : 'Member turned off and signed out')} /> },
            { key: 'actions', header: '', className: 'actions', render: (m) => m.id !== admin.id && (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button type="button" className="ad-btn sm" onClick={() => setResetting(m)}><KeyRound size={13} /> Reset password</button>
                <button type="button" className="ad-btn sm danger-outline" onClick={() => setRemoving(m)}>Remove</button>
              </span>
            ) }
          ]}
        />
      </Card>
      {adding && <AddMember roles={roles} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); reload(); }} />}
      {resetting && <ResetPassword member={resetting} onClose={() => setResetting(null)} onDone={() => { setResetting(null); reload(); }} />}
      {removing && (
        <ConfirmDialog
          title={`Remove ${removing.name}?`}
          description="They lose access immediately. Their past actions stay in the audit log."
          confirmLabel="Remove"
          danger
          busy={busy === 'remove'}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            const ok = await run('remove', () => api(`/team/${removing.id}`, { method: 'DELETE' }), 'Member removed');
            setRemoving(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </>
  );
}

function AddMember({ roles, onClose, onAdded }: { roles: Record<string, Role>; onClose: () => void; onAdded: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ name: '', username: '', email: '', role: 'support', password: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('add', () => api('/team', { method: 'POST', body: form }), `${form.name || form.username} added`);
    if (ok !== undefined) onAdded();
  };

  return (
    <Modal
      title="Add a team member"
      description="Share the username and password with them privately. They can change the password after signing in."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="ad-add-member" className="ad-btn primary" disabled={busy === 'add' || !form.username || form.password.length < 10}>{busy === 'add' && <Spinner size={14} />} Add member</button>
        </>
      }
    >
      <form id="ad-add-member" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="tm-name">Name</label>
            <input id="tm-name" className="ad-input" value={form.name} onChange={set('name')} autoFocus />
          </div>
          <div className="ad-field">
            <label htmlFor="tm-user">Username</label>
            <input id="tm-user" className="ad-input" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))} autoComplete="off" />
          </div>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="tm-email">Work email (optional)</label>
          <input id="tm-email" className="ad-input" type="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="ad-field">
          <label htmlFor="tm-role">Role</label>
          <select id="tm-role" className="ad-select" value={form.role} onChange={set('role')}>
            {Object.entries(roles).map(([key, r]) => <option key={key} value={key}>{r.label}: {r.description}</option>)}
          </select>
        </div>
        <div className="ad-field">
          <label htmlFor="tm-pass">Temporary password</label>
          <input id="tm-pass" className="ad-input" type="text" value={form.password} onChange={set('password')} autoComplete="new-password" />
          <span className="ad-hint">At least 10 characters.</span>
        </div>
      </form>
    </Modal>
  );
}

function ResetPassword({ member, onClose, onDone }: { member: Member; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [password, setPassword] = useState('');
  return (
    <Modal
      title={`Reset ${member.name}'s password`}
      description="They're signed out everywhere and need the new password to sign in."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="ad-btn primary" disabled={password.length < 10 || busy === 'reset'} onClick={async () => {
            const ok = await run('reset', () => api(`/team/${member.id}`, { method: 'PATCH', body: { password } }), 'Password reset');
            if (ok !== undefined) onDone();
          }}>{busy === 'reset' && <Spinner size={14} />} Reset password</button>
        </>
      }
    >
      <div className="ad-field">
        <label htmlFor="rp-pass">New password</label>
        <input id="rp-pass" className="ad-input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
        <span className="ad-hint">At least 10 characters.</span>
      </div>
    </Modal>
  );
}

function RoleMatrix({ data }: { data: TeamResponse }) {
  const roleKeys = Object.keys(data.roles);
  return (
    <Card title="What each role can do" description="Roles are fixed for now. Ask a developer if you need a new one." bodyClass={false}>
      <div className="ad-table-wrap">
        <table className="ad-table ad-matrix">
          <thead>
            <tr>
              <th>Permission</th>
              {roleKeys.map((r) => <th key={r}>{data.roles[r].label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.permissions.map((p) => (
              <tr key={p}>
                <td>{PERMISSION_LABELS[p] || p}</td>
                {roleKeys.map((r) => (
                  <td key={r}>{data.roles[r].permissions.includes(p) ? <Check size={16} color="#2dc08d" aria-label="Yes" /> : <span className="muted" aria-label="No">–</span>}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

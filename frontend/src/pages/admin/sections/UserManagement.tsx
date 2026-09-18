import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Ban, LogIn, Mail, Shield, Sparkles, Search, Users, UserCheck, UserX, Trash2, RefreshCw } from 'lucide-react';
import type { AdminStats, AdminUser, UserStatus } from '../types';

interface UserManagementProps {
  stats: AdminStats;
  subSection: string;
  secret: string;
  BACKEND: string;
}

// ── Shared user moderation state ─────────────────────────────────
interface UserActionsApi {
  actionBusy: string | null;
  setStatus: (user: AdminUser, status: UserStatus) => void;
  removeUser: (user: AdminUser) => void;
}

function useAdminUsers(secret: string, BACKEND: string) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError('');
      const res = await fetch(`${BACKEND}/api/admin/users`, { headers: { 'x-admin-secret': secret } });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load users.');
      setUsers(data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [BACKEND, secret]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const setStatus = async (user: AdminUser, status: UserStatus) => {
    let reason = '';
    if (status === 'active') {
      if (!window.confirm(`Reactivate ${user.email}? They will be able to sign in again.`)) return;
    } else {
      const verb = status === 'banned' ? 'banning' : 'suspending';
      const input = window.prompt(`Reason for ${verb} ${user.email}? (optional)`, user.statusReason || '');
      if (input === null) return;
      reason = input.trim();
    }
    setActionBusy(user.id);
    try {
      const res = await fetch(`${BACKEND}/api/admin/users/${encodeURIComponent(user.id)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ status, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Action failed.');
      setUsers(prev => prev.map(u => u.id === user.id
        ? { ...u, status, statusReason: status === 'active' ? '' : reason, statusUpdatedAt: new Date().toISOString() }
        : u));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setActionBusy(null);
    }
  };

  const removeUser = async (user: AdminUser) => {
    if (!window.confirm(`Permanently delete ${user.email}?\n\nThis removes the account and all saved documents. This cannot be undone.`)) return;
    setActionBusy(user.id);
    try {
      const res = await fetch(`${BACKEND}/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Delete failed.');
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setActionBusy(null);
    }
  };

  return { users, loading, error, actionBusy, fetchUsers, setStatus, removeUser };
}

function StatusBadge({ status }: { status: UserStatus }) {
  const cls = status === 'active' ? 'badge-green' : status === 'suspended' ? 'badge-amber' : 'badge-red';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function UserActions({ user, api }: { user: AdminUser; api: UserActionsApi }) {
  const busy = api.actionBusy === user.id;
  return (
    <div className="user-actions">
      {user.status !== 'active' && (
        <button className="btn-mod btn-mod-activate" disabled={busy} onClick={() => api.setStatus(user, 'active')}>
          <UserCheck size={12} /> Activate
        </button>
      )}
      {user.status === 'active' && (
        <button className="btn-mod btn-mod-suspend" disabled={busy} onClick={() => api.setStatus(user, 'suspended')}>
          <UserX size={12} /> Suspend
        </button>
      )}
      {user.status !== 'banned' && (
        <button className="btn-mod btn-mod-ban" disabled={busy} onClick={() => api.setStatus(user, 'banned')}>
          <Ban size={12} /> Ban
        </button>
      )}
      <button className="btn-mod btn-mod-delete" disabled={busy} title="Delete account permanently" onClick={() => api.removeUser(user)}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── All Users (registered accounts + moderation) ─────────────────
type StatusFilter = 'all' | UserStatus;

function AllUsers({ users, loading, error, api, onRefresh }: {
  users: AdminUser[];
  loading: boolean;
  error: string;
  api: UserActionsApi;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = users.filter(u => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const counts = {
    all: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    banned: users.filter(u => u.status === 'banned').length,
  };

  return (
    <div className="section-animate">
      <div className="section-header">
        <div className="section-header-left">
          <h2>All Users</h2>
          <p>Every registered account — suspend or ban spam and fake accounts</p>
        </div>
        <span className="panel-badge blue">{users.length} accounts</span>
      </div>

      <div className="table-controls">
        <div className="table-search">
          <Search size={13} className="table-search-icon" />
          <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="status-filter-group">
          {(['all', 'active', 'suspended', 'banned'] as StatusFilter[]).map(f => (
            <button
              key={f}
              className={`btn-access-toggle ${statusFilter === f ? 'btn-access-on' : 'btn-access-off'}`}
              onClick={() => setStatusFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
          <button className="btn-secondary" onClick={onRefresh} title="Refresh users">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {error && <div className="alert-error"><AlertTriangle size={14} /> {error}</div>}

      {loading ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <Users size={32} />
          <h4>Loading users…</h4>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <Users size={32} />
          <h4>No users found</h4>
          <p>{search || statusFilter !== 'all' ? 'No accounts match your filters.' : 'No registered accounts in the database yet.'}</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Provider</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td className="bold">
                    {u.name}
                    {u.statusReason && (
                      <div style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-3)', marginTop: 2 }}>
                        {u.statusReason}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>{u.email}</td>
                  <td>
                    <span className={`provider-badge ${
                      u.provider === 'google' ? 'badge-google'
                      : u.provider === 'github' ? 'badge-github'
                      : u.provider === 'linkedin' ? 'badge-linkedin'
                      : 'badge-password'
                    }`}>
                      {u.provider === 'google' ? 'Google OAuth'
                        : u.provider === 'github' ? 'GitHub OAuth'
                        : u.provider === 'linkedin' ? 'LinkedIn OAuth'
                        : 'Password Auth'}
                    </span>
                  </td>
                  <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                    {u.loginCount > 0 && <span style={{ color: 'var(--text-4)' }}> · {u.loginCount}×</span>}
                  </td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ textAlign: 'right' }}><UserActions user={u} api={api} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Suspended / Banned users ─────────────────────────────────────
function ModeratedUsers({ users, loading, api }: { users: AdminUser[]; loading: boolean; api: UserActionsApi }) {
  const moderated = users.filter(u => u.status !== 'active');

  return (
    <div className="section-animate">
      <div className="section-header">
        <div className="section-header-left">
          <h2>Suspended Users</h2>
          <p>Accounts restricted by moderation — suspended or banned</p>
        </div>
        <span className="panel-badge blue">{moderated.length} restricted</span>
      </div>

      {loading ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <UserX size={32} />
          <h4>Loading…</h4>
        </div>
      ) : moderated.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <UserX size={32} />
          <h4>No suspended users. Moderation queue is clear.</h4>
          <p>Suspend or ban accounts from the All Users tab to see them here.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Reason</th>
                <th>Since</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {moderated.map(u => (
                <tr key={u.id}>
                  <td className="bold">{u.name}</td>
                  <td style={{ color: 'var(--text-2)' }}>{u.email}</td>
                  <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{u.statusReason || '—'}</td>
                  <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>
                    {u.statusUpdatedAt ? new Date(u.statusUpdatedAt).toLocaleString() : 'N/A'}
                  </td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ textAlign: 'right' }}><UserActions user={u} api={api} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Access Manager (Whitelist + Auto Apply + Career Copilot) ─────
interface WhitelistEntry { id?: string; email: string; createdAt: string; source?: string }

function AccessManager({ secret, BACKEND }: { secret: string; BACKEND: string }) {
  const [emails, setEmails] = useState<WhitelistEntry[]>([]);
  const [autoApplyEmails, setAutoApplyEmails] = useState<Set<string>>(new Set());
  const [careerCopilotEmails, setCareerCopilotEmails] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [wlRes, aaRes, ccRes] = await Promise.all([
        fetch(`${BACKEND}/api/admin/whitelist`, { headers: { 'x-admin-secret': secret } }),
        fetch(`${BACKEND}/api/admin/auto-apply-access`, { headers: { 'x-admin-secret': secret } }),
        fetch(`${BACKEND}/api/admin/career-copilot-access`, { headers: { 'x-admin-secret': secret } }),
      ]);
      const [wlData, aaData, ccData] = await Promise.all([wlRes.json(), aaRes.json(), ccRes.json()]);
      if (wlData.emails) setEmails(wlData.emails);
      if (aaData.success) setAutoApplyEmails(new Set((aaData.data || []).map((x: { email: string }) => x.email)));
      if (ccData.success) setCareerCopilotEmails(new Set((ccData.data || []).map((x: { email: string }) => x.email)));
    } catch { setError('Failed to load access data.'); }
    finally { setLoading(false); }
  }, [BACKEND, secret]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${BACKEND}/api/admin/whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ email: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add email.');
      setSuccess(`Granted access to ${input.trim()}`);
      setInput('');
      fetchAll();
    } catch (e) { setError(e instanceof Error ? e.message : 'Add failed.'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (emailToDelete: string) => {
    if (!window.confirm(`Remove ${emailToDelete} from whitelist?`)) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await fetch(`${BACKEND}/api/admin/whitelist/${encodeURIComponent(emailToDelete)}`, {
        method: 'DELETE', headers: { 'x-admin-secret': secret },
      });
      setSuccess(`Removed ${emailToDelete}`);
      fetchAll();
    } catch { setError('Delete failed.'); }
    finally { setLoading(false); }
  };

  const toggleAutoApply = async (email: string, has: boolean) => {
    try {
      if (has) {
        await fetch(`${BACKEND}/api/admin/auto-apply-access/${encodeURIComponent(email)}`, { method: 'DELETE', headers: { 'x-admin-secret': secret } });
        setAutoApplyEmails(prev => { const s = new Set(prev); s.delete(email); return s; });
      } else {
        await fetch(`${BACKEND}/api/admin/auto-apply-access`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret }, body: JSON.stringify({ email }) });
        setAutoApplyEmails(prev => new Set([...prev, email]));
      }
    } catch { }
  };

  const toggleCareerCopilot = async (email: string, has: boolean) => {
    try {
      if (has) {
        await fetch(`${BACKEND}/api/admin/career-copilot-access/${encodeURIComponent(email)}`, { method: 'DELETE', headers: { 'x-admin-secret': secret } });
        setCareerCopilotEmails(prev => { const s = new Set(prev); s.delete(email); return s; });
      } else {
        await fetch(`${BACKEND}/api/admin/career-copilot-access`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret }, body: JSON.stringify({ email }) });
        setCareerCopilotEmails(prev => new Set([...prev, email]));
      }
    } catch { }
  };

  return (
    <div className="section-animate">
      <div className="section-header">
        <div className="section-header-left">
          <h2>Access Manager</h2>
          <p>Grant and revoke platform Pro access for Gmail addresses</p>
        </div>
        <span className="panel-badge blue">{emails.length} whitelisted</span>
      </div>

      <div className="glass-panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div className="panel-header-left"><Shield size={14} /><h3>Grant Pro Access</h3></div>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.55 }}>
            Users with these Gmail addresses receive full <strong>Pro Module Access</strong> — including Job Finder, Auto Apply Agent, and Career Copilot — without any manual code changes.
          </p>
          <form onSubmit={handleAdd} className="access-form">
            <div className="access-form-input">
              <Mail size={14} />
              <input
                type="email"
                placeholder="Enter Gmail address to grant access…"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading || !input.trim()}>
              {loading ? 'Processing…' : <><Sparkles size={14} /> Grant Access</>}
            </button>
          </form>
          {success && <div className="alert-success"><Sparkles size={14} /> {success}</div>}
          {error && <div className="alert-error"><AlertTriangle size={14} /> {error}</div>}
        </div>
      </div>

      {emails.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <Shield size={32} />
          <h4>No whitelisted users</h4>
          <p>Use the form above to grant Pro access to Gmail addresses.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Gmail Address</th>
                <th>Access Granted</th>
                <th style={{ textAlign: 'center' }}>Auto Apply</th>
                <th style={{ textAlign: 'center' }}>Career Copilot</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((item, idx) => {
                const emailStr = typeof item === 'string' ? item : item.email;
                const dateStr = typeof item === 'string' ? 'N/A' : item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A';
                const source = typeof item === 'string' ? 'database' : item.source || 'database';
                const hasAA = autoApplyEmails.has(emailStr);
                const hasCC = careerCopilotEmails.has(emailStr);
                return (
                  <tr key={item.id || emailStr || idx}>
                    <td className="bold">{emailStr}</td>
                    <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                      {source === 'database' ? dateStr : 'Permanent'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className={`btn-access-toggle ${hasAA ? 'btn-access-on' : 'btn-access-off'}`}
                        onClick={() => toggleAutoApply(emailStr, hasAA)}>
                        {hasAA ? '✓ Granted' : 'Grant'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className={`btn-access-toggle ${hasCC ? 'btn-access-on' : 'btn-access-off'}`}
                        onClick={() => toggleCareerCopilot(emailStr, hasCC)}>
                        {hasCC ? '✓ Granted' : 'Grant'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {source === 'database' ? (
                        <button className="btn-danger" onClick={() => handleDelete(emailStr)}>
                          Revoke
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-4)', background: 'var(--surface-3)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                          System
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Login Sessions ───────────────────────────────────────────────
function LoginSessions({ stats }: { stats: AdminStats }) {
  const [search, setSearch] = useState('');
  const logins = (stats.recentLogins || []).filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="section-animate">
      <div className="section-header">
        <div className="section-header-left">
          <h2>Login Sessions</h2>
          <p>Authentication history and session logs</p>
        </div>
        <span className="panel-badge blue">{logins.length} sessions</span>
      </div>

      <div className="table-controls">
        <div className="table-search">
          <Search size={13} className="table-search-icon" />
          <input placeholder="Search sessions…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {logins.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <LogIn size={32} />
          <h4>No sessions found</h4>
          <p>{search ? 'No sessions match your query.' : 'No login records in the database yet.'}</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Provider</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logins.map(u => {
                const providerLabel = u.provider === 'google' ? 'Google OAuth' : u.provider === 'github' ? 'GitHub OAuth' : u.provider === 'linkedin' ? 'LinkedIn OAuth' : u.provider === 'signup' ? 'New Sign Up' : 'Password Auth';
                const badgeCls = u.provider === 'google' ? 'badge-google' : u.provider === 'github' ? 'badge-github' : u.provider === 'linkedin' ? 'badge-linkedin' : u.provider === 'signup' ? 'badge-signup' : 'badge-password';
                return (
                  <tr key={u.id}>
                    <td className="bold">{u.name}</td>
                    <td style={{ color: 'var(--text-2)' }}>{u.email}</td>
                    <td><span className={`provider-badge ${badgeCls}`}>{providerLabel}</span></td>
                    <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>{new Date(u.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Waitlist / Premium / Deleted segments ────────────────────────
type UserSegmentType = 'waitlist' | 'premium' | 'deleted';

function UserSegment({ stats, type }: { stats: AdminStats; type: UserSegmentType }) {
  const rows = type === 'waitlist'
    ? (stats.contactMessages || []).map(row => ({
        id: row.id,
        name: row.name,
        detail: row.subject,
        status: 'Pending',
        createdAt: row.createdAt
      }))
    : type === 'premium'
      ? (stats.recentPayments || []).map(row => ({
          id: row.id,
          name: row.email,
          detail: row.transactionId,
          status: 'Premium',
          createdAt: row.createdAt
        }))
      : [];

  const config: Record<UserSegmentType, { title: string; desc: string; icon: ReactNode; empty: string }> = {
    waitlist: {
      title: 'Waitlist',
      desc: 'Pending, approved, rejected, and invited access requests',
      icon: <Mail size={32} />,
      empty: 'No waitlist-style contact requests yet.'
    },
    premium: {
      title: 'Premium Users',
      desc: 'Users with paid or manually granted Pro module access',
      icon: <UserCheck size={32} />,
      empty: 'No premium payment records yet.'
    },
    deleted: {
      title: 'Deleted Users',
      desc: 'Soft-deleted accounts awaiting retention cleanup',
      icon: <Trash2 size={32} />,
      empty: 'No deleted users in the retention queue.'
    }
  };

  const page = config[type];

  return (
    <div className="section-animate">
      <div className="section-header">
        <div className="section-header-left">
          <h2>{page.title}</h2>
          <p>{page.desc}</p>
        </div>
        <span className="panel-badge blue">{rows.length} records</span>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          {page.icon}
          <h4>{page.empty}</h4>
          <p>This module is wired into the admin architecture and ready for backend records.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Record</th>
                <th>Detail</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id || row.name}>
                  <td className="bold">{row.name}</td>
                  <td style={{ color: 'var(--text-2)' }}>{row.detail}</td>
                  <td><span className="badge badge-green">{row.status}</span></td>
                  <td className="mono" style={{ color: 'var(--text-3)' }}>{row.createdAt ? new Date(row.createdAt).toLocaleString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Router ───────────────────────────────────────────────────────
export default function UserManagement({ stats, subSection, secret, BACKEND }: UserManagementProps) {
  const [active, setActive] = useState(subSection || 'users-all');
  const { users, loading, error, actionBusy, fetchUsers, setStatus, removeUser } = useAdminUsers(secret, BACKEND);
  const api: UserActionsApi = { actionBusy, setStatus, removeUser };

  return (
    <div className="section-animate">
      <div className="tab-bar">
        {[
          { id: 'users-all', label: 'All Users', icon: <Users size={12} /> },
          { id: 'users-waitlist', label: 'Waitlist', icon: <Mail size={12} /> },
          { id: 'users-premium', label: 'Premium', icon: <UserCheck size={12} /> },
          { id: 'users-suspended', label: 'Suspended', icon: <UserX size={12} /> },
          { id: 'users-deleted', label: 'Deleted', icon: <Trash2 size={12} /> },
          { id: 'users-whitelist', label: 'Access Manager', icon: <Shield size={12} /> },
          { id: 'users-sessions', label: 'Login Sessions', icon: <LogIn size={12} /> },
        ].map(t => (
          <button key={t.id} className={`tab-btn${active === t.id ? ' active' : ''}`} onClick={() => setActive(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {active === 'users-all' && <AllUsers users={users} loading={loading} error={error} api={api} onRefresh={fetchUsers} />}
      {active === 'users-waitlist' && <UserSegment stats={stats} type="waitlist" />}
      {active === 'users-premium' && <UserSegment stats={stats} type="premium" />}
      {active === 'users-suspended' && <ModeratedUsers users={users} loading={loading} api={api} />}
      {active === 'users-deleted' && <UserSegment stats={stats} type="deleted" />}
      {active === 'users-whitelist' && <AccessManager secret={secret} BACKEND={BACKEND} />}
      {active === 'users-sessions' && <LoginSessions stats={stats} />}
    </div>
  );
}

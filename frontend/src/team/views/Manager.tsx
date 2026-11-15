import { lazy, Suspense, useEffect, useMemo } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import '../../pages/Admin.css';
import { setTokenSource } from '../../pages/admin/api';
import type { AdminAccount } from '../../pages/admin/api';
import { AdminContext, useApi } from '../../pages/admin/hooks';
import type { AdminContextValue } from '../../pages/admin/hooks';
import { ToastProvider } from '../../pages/admin/ui';
import type { Overview as OverviewData } from '../../pages/admin/sections/TeamWorkspace';
import { teamToken } from '../api';
import { go, hrefFor, useTeam } from '../store';
import { Spinner } from '../ui';

// The Manager portal: everything only managers do, in one place. Workspace and HR screens are the
// admin panel's own, run here with the manager's team token (the server accepts it for managers).
const ws = () => import('../../pages/admin/sections/TeamWorkspace');
const ops = () => import('../../pages/admin/sections/TeamOps');
const pick = <M,>(load: () => Promise<M>, key: keyof M) => lazy(() => load().then((m) => ({ default: m[key] as unknown as ComponentType })));

const Email = lazy(() => import('./Email'));
const OverviewTab = lazy(() => ws().then((m) => ({ default: m.OverviewTab })));
const SECTIONS: Record<string, LazyExoticComponent<ComponentType>> = {
  attendance: pick(ops, 'AttendanceTab'),
  checkins: pick(ops, 'CheckInsTab'),
  leave: pick(ops, 'LeaveTab'),
  meetings: pick(ops, 'MeetingsTab'),
  tasks: pick(ops, 'TasksTab'),
  invitations: lazy(() => ws().then((m) => ({ default: () => <m.InvitationsTab onChanged={() => {}} /> }))),
  access: pick(ws, 'AccessTab'),
  past: pick(() => import('../../pages/admin/sections/TeamPastMembers'), 'PastMembersTab'),
  email: Email,
  channels: pick(ws, 'ChannelsTab'),
  announcements: pick(ws, 'AnnouncementsTab'),
  moderation: pick(ws, 'ModerationTab'),
  'hr-people': lazy(() => import('../../pages/admin/sections/ErpPeople')),
  'hr-payroll': lazy(() => import('../../pages/admin/sections/ErpPayroll')),
  'hr-letters': lazy(() => import('../../pages/admin/sections/ErpLetters')),
  'hr-expenses': lazy(() => import('../../pages/admin/sections/ErpExpenses')),
  'hr-hiring': lazy(() => import('../../pages/admin/sections/ErpHiring')),
  'hr-assets': lazy(() => import('../../pages/admin/sections/ErpAssets')),
  'hr-finance': lazy(() => import('../../pages/admin/sections/ErpFinance')),
  'hr-settings': lazy(() => import('../../pages/admin/sections/ErpSettings'))
};

interface NavGroup { title: string; permission?: string; items: Array<{ id: string; label: string; permission?: string }> }
const NAV: NavGroup[] = [
  { title: 'Team', items: [{ id: 'overview', label: 'Overview' }, { id: 'attendance', label: 'Attendance' }, { id: 'checkins', label: 'Check-ins' }, { id: 'leave', label: 'Leave' }, { id: 'meetings', label: 'Meetings' }, { id: 'tasks', label: 'Tasks' }] },
  { title: 'People', items: [{ id: 'invitations', label: 'Invitations' }, { id: 'access', label: 'Access' }, { id: 'past', label: 'Past members' }, { id: 'email', label: 'Email' }] },
  { title: 'Workspace', items: [{ id: 'channels', label: 'Channels' }, { id: 'announcements', label: 'Announcements' }, { id: 'moderation', label: 'Moderation' }] },
  {
    title: 'HR', permission: 'hr.view', items: [
      { id: 'hr-people', label: 'People files' }, { id: 'hr-payroll', label: 'Payroll' }, { id: 'hr-letters', label: 'Letters' }, { id: 'hr-expenses', label: 'Expenses' },
      { id: 'hr-hiring', label: 'Hiring' }, { id: 'hr-assets', label: 'Assets' }, { id: 'hr-finance', label: 'Profit & loss', permission: 'finance.view' }, { id: 'hr-settings', label: 'HR settings' }
    ]
  }
];

// Admin panel section ids the HR screens link to → portal sections
const FROM_ADMIN: Record<string, string> = {
  'erp-people': 'hr-people', 'erp-payroll': 'hr-payroll', 'erp-letters': 'hr-letters', 'erp-expenses': 'hr-expenses', 'erp-hiring': 'hr-hiring',
  'erp-assets': 'hr-assets', 'erp-finance': 'hr-finance', 'erp-settings': 'hr-settings', 'team-workspace': 'overview'
};

function Overview() {
  const { data, loading } = useApi<{ data: OverviewData }>('/team/overview');
  return <OverviewTab data={data?.data} loading={loading} onOpen={(v) => go('manage', v)} />;
}

export default function Manager({ section, params }: { section: string; params: Record<string, string> }) {
  const { me } = useTeam();
  const can = (p?: string) => !p || me.permissions.includes(p);
  const groups = NAV.filter((g) => can(g.permission)).map((g) => ({ ...g, items: g.items.filter((i) => can(i.permission)) }));
  const ids = groups.flatMap((g) => g.items.map((i) => i.id));
  const active = ids.includes(section) ? section : 'overview';

  // The admin screens call the API with the manager's team token while the portal is open
  useEffect(() => {
    setTokenSource(teamToken);
    return () => setTokenSource(null);
  }, []);

  const ctx = useMemo<AdminContextValue>(() => ({
    admin: { id: me.id, username: me.username, name: me.name, email: me.email, role: me.role, roleLabel: me.roleLabel, permissions: me.permissions, teamManager: true } as AdminAccount,
    can: (p: string) => me.permissions.includes(p),
    go: (target: string, p?: Record<string, string>) => go('manage', FROM_ADMIN[target] || target, p || {}),
    params,
    refreshBadges: () => {}
  }), [me, params]);

  const Section = active === 'overview' ? Overview : SECTIONS[active];
  const label = groups.flatMap((g) => g.items).find((i) => i.id === active)?.label || 'Overview';

  return (
    <div className="tm-mgr">
      <nav className="tm-mgr-nav" aria-label="Manager portal">
        <p className="tm-mgr-title">Manager</p>
        {groups.map((g) => (
          <div key={g.title} className="tm-mgr-group">
            <span className="tm-mgr-group-title">{g.title}</span>
            {g.items.map((i) => (
              <a key={i.id} href={hrefFor('manage', i.id)} className={i.id === active ? 'active' : ''} aria-current={i.id === active ? 'page' : undefined}>{i.label}</a>
            ))}
          </div>
        ))}
      </nav>
      <section className="tm-mgr-main" aria-label={label}>
        <AdminContext.Provider value={ctx}>
          <div className={`ad-app ad-embed ${active === 'email' ? 'is-team' : ''}`}>
            <ToastProvider>
              <Suspense fallback={<div className="tm-mgr-loading"><Spinner size={20} /></div>}>
                <Section key={active} />
              </Suspense>
            </ToastProvider>
          </div>
        </AdminContext.Provider>
      </section>
    </div>
  );
}

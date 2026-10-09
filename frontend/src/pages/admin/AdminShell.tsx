import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType, FormEvent, LazyExoticComponent } from 'react';
import { ChevronRight, ExternalLink, KeyRound, LogOut, Menu, Search } from 'lucide-react';
import cvmindIcon from '../../assets/cvmind_icon.png';
import { api } from './api';
import type { AdminAccount } from './api';
import { AdminContext } from './hooks';
import { ALL_ITEMS, NAV } from './nav';
import { Avatar, Modal, Spinner, ToastProvider } from './ui';
import MyPasswordForm from './MyPasswordForm';

const SECTIONS: Record<string, LazyExoticComponent<ComponentType>> = {
  dashboard: lazy(() => import('./sections/Dashboard')),
  'ai-activity': lazy(() => import('./sections/AIActivity')),
  users: lazy(() => import('./sections/Users')),
  'user-activity': lazy(() => import('./sections/UserActivity')),
  access: lazy(() => import('./sections/AccessLists')),
  subscriptions: lazy(() => import('./sections/Subscriptions')),
  'job-finder': lazy(() => import('./sections/JobFinder')),
  payments: lazy(() => import('./sections/Payments')),
  invoices: lazy(() => import('./sections/Invoices')),
  refunds: lazy(() => import('./sections/RefundRequests')),
  coupons: lazy(() => import('./sections/Coupons')),
  orders: lazy(() => import('./sections/Orders')),
  partners: lazy(() => import('./sections/Partners')),
  tickets: lazy(() => import('./sections/Tickets')),
  notifications: lazy(() => import('./sections/Notifications')),
  content: lazy(() => import('./sections/Content')),
  moderation: lazy(() => import('./sections/Moderation')),
  reports: lazy(() => import('./sections/Reports')),
  system: lazy(() => import('./sections/SystemHealth')),
  audit: lazy(() => import('./sections/AuditLog')),
  settings: lazy(() => import('./sections/AppConfig')),
  team: lazy(() => import('./sections/Team'))
};

// #users/abc?tab=x → { section: 'users', params: { id: 'abc', tab: 'x' } }
function readHash(): { section: string; params: Record<string, string> } {
  const raw = window.location.hash.replace(/^#/, '');
  const [path, search = ''] = raw.split('?');
  const [section, id] = path.split('/');
  const params: Record<string, string> = Object.fromEntries(new URLSearchParams(search));
  if (id) params.id = decodeURIComponent(id);
  return { section: section || 'dashboard', params };
}

function writeHash(section: string, params: Record<string, string>) {
  const { id, ...rest } = params;
  const search = new URLSearchParams(rest).toString();
  const hash = `#${section}${id ? `/${encodeURIComponent(id)}` : ''}${search ? `?${search}` : ''}`;
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
}

interface AdminShellProps {
  admin: AdminAccount;
  onSignOut: () => void;
  setCurrentPage: (page: string) => void;
}

export default function AdminShell({ admin, onSignOut, setCurrentPage }: AdminShellProps) {
  const can = useCallback((p: string) => admin.permissions.includes(p), [admin.permissions]);
  const allowed = useMemo(() => ALL_ITEMS.filter((i) => can(i.permission)), [can]);

  const [route, setRoute] = useState(() => readHash());
  const [navOpen, setNavOpen] = useState(false);
  const [badges, setBadges] = useState<{ tickets?: number; reports?: number; refunds?: number }>({});
  const [badgeTick, setBadgeTick] = useState(0);
  const [search, setSearch] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const current = allowed.find((i) => i.id === route.section) || allowed[0];

  const go = useCallback((section: string, params: Record<string, string> = {}) => {
    writeHash(section, params);
    setRoute({ section, params });
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Sidebar badges, refreshed every minute and after actions that change them
  useEffect(() => {
    let cancelled = false;
    const load = () => api<{ data: { tickets?: number; reports?: number; refunds?: number } }>('/badges')
      .then((r) => { if (!cancelled) setBadges(r.data); })
      .catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [badgeTick]);

  const refreshBadges = useCallback(() => setBadgeTick((n) => n + 1), []);

  const ctx = useMemo(() => ({ admin, can, go, params: route.params, refreshBadges }), [admin, can, go, route.params, refreshBadges]);

  const Section = current ? SECTIONS[current.id] : null;

  // Global search: an email or name goes to Users, "#1234" to Support, a transaction id to Payments
  const runSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    if (/^#\d+$/.test(q) && can('tickets.view')) go('tickets', { q });
    else if (/^(TXN|UPI|PAY)-/i.test(q) && can('payments.view')) go('payments', { q });
    else if (can('users.view')) go('users', { q });
    setSearch('');
  };

  return (
    <AdminContext.Provider value={ctx}>
      <div className={`ad-app${navOpen ? ' nav-open' : ''}`}>
        {/* Inside .ad-app so toasts get the admin styles; they're fixed, so they don't take a grid cell */}
        <ToastProvider>
          <aside className="ad-sidebar" aria-label="Admin navigation">
            <div className="ad-brand">
              <img src={cvmindIcon} alt="" />
              <span className="ad-brand-name">CVMind</span>
              <span className="ad-brand-chip">Admin</span>
            </div>
            <nav className="ad-nav">
              {NAV.map((group) => {
                const items = group.items.filter((i) => can(i.permission));
                if (!items.length) return null;
                return (
                  <div className="ad-nav-group" key={group.label}>
                    <div className="ad-nav-label">{group.label}</div>
                    {items.map((item) => {
                      const Icon = item.icon;
                      const badge = item.badge ? badges[item.badge] : 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`ad-nav-item${current?.id === item.id ? ' active' : ''}`}
                          aria-current={current?.id === item.id ? 'page' : undefined}
                          onClick={() => go(item.id)}
                        >
                          <Icon size={17} />
                          {item.label}
                          {!!badge && <span className="ad-nav-badge" aria-label={`${badge} waiting`}>{badge > 99 ? '99+' : badge}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
            <div className="ad-sidebar-foot">
              <div className="ad-me">
                <Avatar name={admin.name} email={admin.username} />
                <div className="ad-me-text">
                  <div className="ad-me-name">{admin.name}</div>
                  <div className="ad-me-role">{admin.roleLabel}</div>
                </div>
                {admin.id !== 'env-owner' && (
                  <button type="button" className="ad-btn ghost icon sm" onClick={() => setChangingPassword(true)} title="Change my password" aria-label="Change my password">
                    <KeyRound size={15} />
                  </button>
                )}
                <button type="button" className="ad-btn ghost icon sm" onClick={onSignOut} title="Sign out" aria-label="Sign out">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </aside>
          <div className="ad-overlay" onClick={() => setNavOpen(false)} />

          <div className="ad-main">
            <header className="ad-topbar">
              <button type="button" className="ad-btn ghost icon ad-menu-btn" onClick={() => setNavOpen(true)} aria-label="Open menu">
                <Menu size={19} />
              </button>
              <div className="ad-crumbs">
                <span className="group">{current?.group}</span>
                <ChevronRight size={14} className="sep" />
                <strong>{current?.label}</strong>
              </div>
              {can('users.view') && (
                <form className="ad-topbar-search ad-search" onSubmit={runSearch} role="search">
                  <Search size={15} />
                  <input className="ad-input sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a user, #ticket or transaction ID" aria-label="Search the admin panel" />
                </form>
              )}
              <div className="ad-topbar-actions">
                <button type="button" className="ad-btn sm hide-sm" onClick={() => setCurrentPage('home')}>
                  <ExternalLink size={14} /> View site
                </button>
              </div>
            </header>

            <main className="ad-content">
              {Section ? (
                <Suspense fallback={<div className="ad-empty"><Spinner size={20} /></div>}>
                  <Section key={current!.id} />
                </Suspense>
              ) : (
                <div className="ad-empty"><strong>No sections available</strong><p>Your role doesn't include any admin sections. Ask an owner to change it.</p></div>
              )}
            </main>
          </div>
          {changingPassword && (
            <Modal title="Change my password" onClose={() => setChangingPassword(false)}>
              <MyPasswordForm onDone={() => setChangingPassword(false)} />
            </Modal>
          )}
        </ToastProvider>
      </div>
    </AdminContext.Provider>
  );
}

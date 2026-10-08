import {
  Activity, Bell, Building2, ClipboardList, CreditCard, Crown, FileDown, KeyRound, LayoutDashboard, LifeBuoy,
  PanelsTopLeft, ScrollText, ShieldAlert, SlidersHorizontal, Sparkles, TicketPercent, UserCheck, UserCog, Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  permission: string;
  badge?: 'tickets' | 'reports';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
      { id: 'ai-activity', label: 'AI activity', icon: Sparkles, permission: 'dashboard.view' }
    ]
  },
  {
    label: 'Users',
    items: [
      { id: 'users', label: 'Users', icon: Users, permission: 'users.view' },
      { id: 'user-activity', label: 'User activity', icon: UserCheck, permission: 'users.view' },
      { id: 'access', label: 'Access lists', icon: KeyRound, permission: 'users.view' }
    ]
  },
  {
    label: 'Business',
    items: [
      { id: 'subscriptions', label: 'Subscriptions', icon: Crown, permission: 'payments.view' },
      { id: 'payments', label: 'Payments', icon: CreditCard, permission: 'payments.view' },
      { id: 'coupons', label: 'Coupons', icon: TicketPercent, permission: 'coupons.manage' },
      { id: 'orders', label: 'Applications', icon: ClipboardList, permission: 'orders.view' },
      { id: 'partners', label: 'Companies', icon: Building2, permission: 'partners.view' }
    ]
  },
  {
    label: 'Engage',
    items: [
      { id: 'tickets', label: 'Support', icon: LifeBuoy, permission: 'tickets.view', badge: 'tickets' },
      { id: 'notifications', label: 'Notifications', icon: Bell, permission: 'notifications.send' }
    ]
  },
  {
    label: 'Content',
    items: [
      { id: 'content', label: 'Site content', icon: PanelsTopLeft, permission: 'content.manage' },
      { id: 'moderation', label: 'Moderation', icon: ShieldAlert, permission: 'moderation.manage', badge: 'reports' }
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'reports', label: 'Reports & exports', icon: FileDown, permission: 'reports.export' },
      { id: 'system', label: 'System health', icon: Activity, permission: 'system.view' },
      { id: 'audit', label: 'Audit log', icon: ScrollText, permission: 'audit.view' }
    ]
  },
  {
    label: 'Settings',
    items: [
      { id: 'settings', label: 'App config', icon: SlidersHorizontal, permission: 'settings.view' },
      { id: 'team', label: 'Team & roles', icon: UserCog, permission: 'team.manage' }
    ]
  }
];

export const ALL_ITEMS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

// Role-based access for the admin panel. Each route asks for one permission; the frontend
// receives the same list at login so it can hide what the role can't use.

export const PERMISSIONS = [
  'dashboard.view',
  'users.view', 'users.manage', 'users.delete',
  'sessions.manage',
  'payments.view', 'payments.manage',
  'coupons.manage',
  'notifications.send',
  'reports.export',
  'tickets.view', 'tickets.manage',
  'content.manage',
  'moderation.manage',
  'orders.view', 'orders.manage',
  'partners.view', 'partners.manage',
  'settings.view', 'settings.manage',
  'system.view',
  'audit.view',
  'team.manage'
];

const ALL = [...PERMISSIONS];

export const ROLES = {
  owner: { label: 'Owner', description: 'Full access, including the team and roles.', permissions: ALL },
  admin: {
    label: 'Admin',
    description: 'Everything except managing the team.',
    permissions: ALL.filter((p) => p !== 'team.manage')
  },
  support: {
    label: 'Support',
    description: 'Tickets, user lookup, sessions and moderation.',
    permissions: ['dashboard.view', 'users.view', 'users.manage', 'sessions.manage', 'tickets.view', 'tickets.manage', 'moderation.manage', 'orders.view', 'orders.manage', 'notifications.send']
  },
  finance: {
    label: 'Finance',
    description: 'Payments, refunds, coupons and exports.',
    permissions: ['dashboard.view', 'users.view', 'payments.view', 'payments.manage', 'coupons.manage', 'reports.export']
  },
  content: {
    label: 'Content',
    description: 'Site content, announcements and moderation.',
    permissions: ['dashboard.view', 'content.manage', 'moderation.manage', 'notifications.send', 'partners.view']
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to dashboards and lists.',
    permissions: ['dashboard.view', 'users.view', 'payments.view', 'tickets.view', 'orders.view', 'partners.view', 'settings.view', 'system.view']
  }
};

export const ROLE_KEYS = Object.keys(ROLES);

export function permissionsFor(role) {
  return ROLES[role]?.permissions || [];
}

export function can(role, permission) {
  return permissionsFor(role).includes(permission);
}

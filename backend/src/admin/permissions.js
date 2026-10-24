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
  'team.manage',
  // Manage CVMind Team (team.cvmind.in): invitations, channels, announcements, task review
  'teamchat.manage',
  // Placements portal (placements.cvmind.in): colleges, their logins and resume formats
  'colleges.view', 'colleges.manage'
];

const ALL = [...PERMISSIONS];

export const ROLES = {
  owner: { label: 'Owner', description: 'Full access, including the team and roles.', permissions: ALL },
  // Leadership: full access, same as the owner
  ceo: { label: 'Chief Executive Officer', description: 'Full access, including the team and roles.', permissions: ALL, leadership: true },
  cmo: { label: 'Chief Management Officer', description: 'Full access, including the team and roles.', permissions: ALL, leadership: true },
  cto: { label: 'Chief Technical Officer', description: 'Full access, including the team and roles.', permissions: ALL, leadership: true },
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
    permissions: ['dashboard.view', 'users.view', 'payments.view', 'tickets.view', 'orders.view', 'partners.view', 'colleges.view', 'settings.view', 'system.view']
  },
  // CVMind Team members: they use team.cvmind.in only and can't sign in to the admin panel
  content_intern: { label: 'Content Writing Intern', description: 'CVMind Team only. No admin panel access.', permissions: [], teamOnly: true },
  graphic_designer: { label: 'Graphic Designer', description: 'CVMind Team only. No admin panel access.', permissions: [], teamOnly: true },
  frontend_intern: { label: 'Frontend Developer Intern', description: 'CVMind Team only. No admin panel access.', permissions: [], teamOnly: true },
  fullstack_developer: { label: 'Full Stack Developer', description: 'CVMind Team only. No admin panel access.', permissions: [], teamOnly: true }
};

export const ROLE_KEYS = Object.keys(ROLES);

export function permissionsFor(role) {
  return ROLES[role]?.permissions || [];
}

// Roles with every permission (owner, CEO, CMO, CTO). The panel always keeps at least one active.
export const FULL_ACCESS_ROLES = Object.keys(ROLES).filter((k) => ROLES[k].permissions.includes('team.manage'));
export const isFullAccess = (role) => FULL_ACCESS_ROLES.includes(role);

// Roles that only open CVMind Team, never the admin panel
export const isTeamOnlyRole = (role) => !!ROLES[role]?.teamOnly;

export function can(role, permission) {
  return permissionsFor(role).includes(permission);
}

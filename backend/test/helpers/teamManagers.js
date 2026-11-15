// Manager access on CVMind Team is a per-person switch. Production turns it on once for the
// leadership accounts (seedTeamManagers); tests do the same whenever they sign in or add someone.
export async function makeLeadershipManagers() {
  const { AdminUser } = await import('../../src/admin/models.js');
  const { invalidateAdminCache } = await import('../../src/admin/auth.js');
  await AdminUser.updateMany({ role: { $in: ['owner', 'ceo', 'cmo', 'cto'] } }, { $set: { teamManager: true } });
  invalidateAdminCache();
}

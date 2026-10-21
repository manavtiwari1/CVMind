// Learn with Leo is "coming soon": only the accounts listed in LEARN_LEO_EMAILS can use it
// (comma-separated; "*" opens it to everyone). Without the variable only the test account has access.

const DEFAULT_EMAILS = 'test@cvmind.in';

function allowList() {
  return String(process.env.LEARN_LEO_EMAILS ?? DEFAULT_EMAILS)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function hasLeoAccess(email) {
  const list = allowList();
  if (list.includes('*')) return true;
  const clean = String(email || '').trim().toLowerCase();
  return !!clean && list.includes(clean);
}

export const COMING_SOON = { success: false, code: 'COMING_SOON', error: 'Learn with Leo is coming soon.' };

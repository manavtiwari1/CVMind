// Aptitude Tests are "coming soon": only the accounts listed in APTITUDE_EMAILS can use them
// (comma-separated; "*" opens them to everyone). Without the variable only the test account has access.

const DEFAULT_EMAILS = 'testaccount@cvmind.in';

function allowList() {
  return String(process.env.APTITUDE_EMAILS ?? DEFAULT_EMAILS)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function hasAptitudeAccess(email) {
  const list = allowList();
  if (list.includes('*')) return true;
  const clean = String(email || '').trim().toLowerCase();
  return !!clean && list.includes(clean);
}

export const COMING_SOON = { success: false, code: 'COMING_SOON', product: 'aptitude', error: 'Aptitude Tests are coming soon.' };

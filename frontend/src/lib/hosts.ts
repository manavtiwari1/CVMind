// www.cvmind.in serves the public site, app.cvmind.in the signed-in app. Both run the same
// build; these helpers decide which host a page belongs to. Anywhere else (localhost, Vercel
// previews, the Android WebView) there is no split and every page stays on the current origin.
// *.lvh.me resolves to 127.0.0.1, so www.lvh.me / app.lvh.me test the split locally.

// Pages that need sign-in; they live on the app host
export const APP_PAGES = ['prep', 'resume-editor', 'cover-letter-start', 'cover-letter-generator', 'cover-letter-editor', 'linkedin', 'linkedin-bio', 'linkedin-outreach', 'linkedin-post', 'proofreading', 'tailor', 'voice-prep', 'portfolio-gen', 'job-finder', 'career-courses', 'elevator-pitch', 'career-roadmap', 'auto-apply', 'account', 'my-documents', 'offer-negotiation', 'invite', 'learn-with-leo'];

// App-host pages that signed-out visitors can still use (the email link may open on another device)
export const PUBLIC_APP_PAGES = ['code-arena', 'cvmind-code-arena', 'verify-email', 'college-invite'];

// Paths the app host handles itself instead of sending them to www
const AUTH_PATHS = ['/sign-in', '/sign-up', '/login'];

const SPLIT_DOMAINS = ['cvmind.in', 'lvh.me'];

const hostname = () => window.location.hostname;

export function baseDomain(): string | null {
  const host = hostname();
  return SPLIT_DOMAINS.find(d => host === d || host.endsWith(`.${d}`)) ?? null;
}

export const isSplitHost = () => baseDomain() !== null;

export const isAppHost = () => isSplitHost() && hostname().startsWith('app.');

// team.cvmind.in is CVMind Team, the internal workspace. Without the split (localhost, previews)
// it opens at /team.
export const isTeamHost = () => (isSplitHost() && hostname().startsWith('team.')) || (!isSplitHost() && window.location.pathname.replace(/\/$/, '') === '/team');

// placements.cvmind.in is the college portal. Without the split it opens at /placements.
export const isPlacementsHost = () => (isSplitHost() && hostname().startsWith('placements.')) || (!isSplitHost() && window.location.pathname.replace(/\/$/, '') === '/placements');

const originFor = (sub: 'www' | 'app' | 'team' | 'placements') => {
  const base = baseDomain();
  if (!base) return window.location.origin;
  const { protocol, port } = window.location;
  return `${protocol}//${sub}.${base}${port ? `:${port}` : ''}`;
};

export const siteOrigin = () => originFor('www');
export const appOrigin = () => originFor('app');

// CVMind Team: team.cvmind.in, or /team where there is no host split (localhost, previews)
// The college placements portal
export const placementsUrl = () => (isSplitHost() ? `${originFor('placements')}/` : `${window.location.origin}/placements`);
export const teamUrl = () => (isSplitHost() ? `${originFor('team')}/` : `${window.location.origin}/team`);

export const isAppPage = (page: string) => APP_PAGES.includes(page) || PUBLIC_APP_PAGES.includes(page);

// Full URL of the page on the host it belongs to
export function urlForPage(page: string, search = ''): string {
  const origin = isAppPage(page) ? appOrigin() : siteOrigin();
  return `${origin}${page === 'home' ? '/' : `/${page}`}${search}`;
}

// True when the page belongs on the other host and navigating needs a full page load
export const isCrossHost = (page: string) => isSplitHost() && isAppPage(page) !== isAppHost();

// Where an address typed on this host should really live, or null to stay. Runs before React
// renders so visitors never see the wrong site flash.
export function hostRedirectTarget(signedIn: boolean): string | null {
  if (!isSplitHost() || isTeamHost() || isPlacementsHost()) return null;
  const { pathname, search, hash } = window.location;
  // /college-invite/<token> is the college invitation page
  const page = pathname.startsWith('/college-invite/') ? 'college-invite' : pathname.replace(/^\//, '');

  if (isAppHost()) {
    // Sign-in screens and OAuth/password-reset returns are handled on the app host
    const params = new URLSearchParams(search);
    if (AUTH_PATHS.includes(pathname) || params.has('oauthCode') || params.has('authError') || params.has('resetToken') || hash.includes('id_token')) return null;
    if (pathname === '/') return signedIn ? `${appOrigin()}/my-documents` : `${appOrigin()}/sign-in`;
    if (isAppPage(page)) return null;
    return `${siteOrigin()}${pathname}${search}${hash}`;
  }

  if (isAppPage(page)) return `${appOrigin()}${pathname}${search}${hash}`;
  return null;
}

// sessionStorage key for the GitHub/LinkedIn sign-in nonce: AuthModal sets it, App sends it back with the code
export const OAUTH_NONCE_KEY = 'cvmind_oauth_nonce';

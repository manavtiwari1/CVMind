// www.cvmind.in serves the public site, app.cvmind.in the signed-in app. Both run the same
// build; these helpers decide which host a page belongs to. Anywhere else (localhost, Vercel
// previews, the Android WebView) there is no split and every page stays on the current origin.
// *.lvh.me resolves to 127.0.0.1, so www.lvh.me / app.lvh.me test the split locally.

// Pages that need sign-in; they live on the app host
export const APP_PAGES = ['prep', 'resume-editor', 'linkedin', 'linkedin-bio', 'linkedin-outreach', 'linkedin-post', 'proofreading', 'tailor', 'voice-prep', 'portfolio-gen', 'job-finder', 'career-courses', 'elevator-pitch', 'career-roadmap', 'auto-apply', 'career-copilot', 'account', 'my-documents'];

// App-host pages that signed-out visitors can still use
export const PUBLIC_APP_PAGES = ['code-arena', 'cvmind-code-arena'];

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

const originFor = (sub: 'www' | 'app') => {
  const base = baseDomain();
  if (!base) return window.location.origin;
  const { protocol, port } = window.location;
  return `${protocol}//${sub}.${base}${port ? `:${port}` : ''}`;
};

export const siteOrigin = () => originFor('www');
export const appOrigin = () => originFor('app');

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
  if (!isSplitHost()) return null;
  const { pathname, search, hash } = window.location;
  const page = pathname.replace(/^\//, '');

  if (isAppHost()) {
    // Sign-in screens and OAuth/password-reset returns are handled on the app host
    const params = new URLSearchParams(search);
    if (AUTH_PATHS.includes(pathname) || params.has('oauthUser') || params.has('authError') || params.has('resetToken') || hash.includes('id_token')) return null;
    if (pathname === '/') return signedIn ? `${appOrigin()}/my-documents` : `${appOrigin()}/sign-in`;
    if (isAppPage(page)) return null;
    return `${siteOrigin()}${pathname}${search}${hash}`;
  }

  if (isAppPage(page)) return `${appOrigin()}${pathname}${search}${hash}`;
  return null;
}

export const portfolioSlug = (name?: string) => name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'portfolio';
export const suggestedUsername = (name?: string) => portfolioSlug(name).slice(0, 40).replace(/-$/, '');

// A published portfolio's address. Locally the backend serves it on lvh.me, which resolves to this machine.
export function siteUrl(username: string, baseUrl: string) {
  if (import.meta.env.DEV) {
    const port = new URL(baseUrl).port;
    return `http://${username}.portfolio.lvh.me${port ? `:${port}` : ''}/`;
  }
  return `https://${username}.portfolio.cvmind.in/`;
}

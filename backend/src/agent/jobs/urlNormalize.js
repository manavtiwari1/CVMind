const TRACKING_PARAM = /^(utm_.*|gh_src|lever-source|lever-origin|ref|source|src|trk|fbclid|gclid|mc_cid|mc_eid)$/i;

// Canonical form used to dedupe job links: https, no www, no tracking params or fragment, no trailing slash
export function normalizeJobUrl(raw) {
  let url;
  try {
    url = new URL(String(raw ?? '').trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  url.protocol = 'https:';
  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  // Lever's /apply page is the same posting as its description page
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/^(\/[^/]+\/[0-9a-f-]{36})\/apply$/i, '$1') || '/';
  return url.toString();
}

export function detectAts(normalizedUrl) {
  const url = new URL(normalizedUrl);
  const host = url.hostname;
  const parts = url.pathname.split('/').filter(Boolean);

  if (/(^|\.)greenhouse\.io$/.test(host)) {
    const jobsIndex = parts.indexOf('jobs');
    if (jobsIndex >= 1 && /^\d+$/.test(parts[jobsIndex + 1] || '')) {
      return { ats: 'greenhouse', boardToken: parts[jobsIndex - 1], jobId: parts[jobsIndex + 1] };
    }
    const boardToken = url.searchParams.get('for');
    const jobId = url.searchParams.get('token');
    if (parts[0] === 'embed' && boardToken && /^\d+$/.test(jobId || '')) return { ats: 'greenhouse', boardToken, jobId };
  }

  if (/^jobs\.(eu\.)?lever\.co$/.test(host) && parts.length >= 2 && /^[0-9a-f-]{36}$/i.test(parts[1])) {
    return { ats: 'lever', company: parts[0], postingId: parts[1], region: host.startsWith('jobs.eu.') ? 'eu' : 'global' };
  }

  if (/\.myworkdayjobs\.com$/.test(host) || /(^|\.)myworkdaysite\.com$/.test(host)) return { ats: 'workday' };
  return { ats: 'unknown' };
}

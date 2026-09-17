import { htmlToStructuredText } from '../../../services/parser.js';
import { FatalError } from '../../errors.js';
import { safeFetch, httpError, PAGE_HEADERS } from './http.js';

const MIN_DESCRIPTION_CHARS = 200;
const MAX_HTML_CHARS = 2_000_000;

// Career sites that support Google Jobs embed a schema.org JobPosting, the most reliable source on the page
export function extractJobPostingJsonLd(html) {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1].trim());
      const items = Array.isArray(data) ? data : Array.isArray(data['@graph']) ? data['@graph'] : [data];
      const job = items.find((item) => item && [].concat(item['@type']).includes('JobPosting'));
      if (job) return job;
    } catch {
      // Malformed JSON-LD blocks are common; try the next one
    }
  }
  return null;
}

function jsonLdLocation(job) {
  const place = [].concat(job?.jobLocation || [])[0];
  const address = place?.address || {};
  const country = typeof address.addressCountry === 'string' ? address.addressCountry : address.addressCountry?.name;
  return [address.addressLocality, address.addressRegion, country].filter((part) => typeof part === 'string' && part).join(', ');
}

export async function fetchGenericJob(url, { fetchImpl = fetch, lookup } = {}) {
  const res = await safeFetch(url, { headers: PAGE_HEADERS }, { fetchImpl, ...(lookup ? { lookup } : {}) });
  if (!res.ok) throw httpError(res.status, 'Could not open the job page');
  const contentType = res.headers.get('content-type') || '';
  if (!/html|text/i.test(contentType)) {
    throw new FatalError('That link is not a web page. Paste the job description instead.', { code: 'NOT_HTML' });
  }

  const html = (await res.text()).slice(0, MAX_HTML_CHARS);
  const jsonLd = extractJobPostingJsonLd(html);
  const pageTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const descriptionText = htmlToStructuredText(jsonLd?.description || html).slice(0, 40000);
  if (descriptionText.length < MIN_DESCRIPTION_CHARS) {
    throw new FatalError('Could not read a job description on that page (it may need a login or JavaScript). Paste the description instead.', { code: 'JOB_PAGE_EMPTY' });
  }

  return {
    title: htmlToStructuredText(jsonLd?.title || pageTitle),
    company: typeof jsonLd?.hiringOrganization === 'object' ? jsonLd.hiringOrganization?.name || '' : '',
    location: jsonLdLocation(jsonLd),
    workMode: jsonLd?.jobLocationType === 'TELECOMMUTE' ? 'remote' : undefined,
    descriptionText,
    applyUrl: url,
    atsQuestions: []
  };
}

import { htmlToStructuredText } from '../../../services/parser.js';
import { FatalError, RetryableError } from '../../errors.js';
import { httpError, titleCaseSlug } from './http.js';

const WORK_MODES = { remote: 'remote', hybrid: 'hybrid', onsite: 'onsite', 'on-site': 'onsite' };
const SALARY_PERIODS = { 'per-year-salary': 'year', 'per-month-salary': 'month', 'per-hour-wage': 'hour' };

export async function fetchLeverJob({ company, postingId, region }, { fetchImpl = fetch } = {}) {
  const host = region === 'eu' ? 'api.eu.lever.co' : 'api.lever.co';
  let res;
  try {
    res = await fetchImpl(`https://${host}/v0/postings/${encodeURIComponent(company)}/${encodeURIComponent(postingId)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
  } catch (err) {
    throw new RetryableError(`Could not reach Lever: ${err.message}`, { cause: err, code: 'NETWORK' });
  }
  if (res.status === 404) throw new FatalError('This Lever job is no longer posted.', { code: 'JOB_NOT_FOUND' });
  if (!res.ok) throw httpError(res.status, 'Lever returned an error');

  const data = await res.json();
  const lists = (data.lists || []).map((list) => [list.text, htmlToStructuredText(list.content)].filter(Boolean).join('\n'));
  const range = data.salaryRange;
  return {
    title: data.text || '',
    company: titleCaseSlug(company),
    location: data.categories?.location || '',
    descriptionText: [data.descriptionPlain || htmlToStructuredText(data.description), ...lists, data.additionalPlain].filter(Boolean).join('\n'),
    applyUrl: data.applyUrl || data.hostedUrl || '',
    workMode: WORK_MODES[String(data.workplaceType || '').toLowerCase()],
    salary: range && (range.min || range.max)
      ? { min: Number(range.min) || 0, max: Number(range.max) || 0, currency: String(range.currency || '').toUpperCase(), period: SALARY_PERIODS[range.interval] || 'year' }
      : null,
    atsQuestions: []
  };
}

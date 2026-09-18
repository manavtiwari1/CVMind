import { htmlToStructuredText } from '../../../services/parser.js';
import { FatalError, RetryableError } from '../../errors.js';
import { httpError, titleCaseSlug } from './http.js';

// Greenhouse returns job content as escaped HTML (&lt;p&gt;), so unescape before stripping tags
function unescapeHtml(text) {
  return String(text || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export async function fetchGreenhouseJob({ boardToken, jobId }, { fetchImpl = fetch } = {}) {
  let res;
  try {
    res = await fetchImpl(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs/${encodeURIComponent(jobId)}?questions=true`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) }
    );
  } catch (err) {
    throw new RetryableError(`Could not reach Greenhouse: ${err.message}`, { cause: err, code: 'NETWORK' });
  }
  if (res.status === 404) throw new FatalError('This Greenhouse job is no longer posted.', { code: 'JOB_NOT_FOUND' });
  if (!res.ok) throw httpError(res.status, 'Greenhouse returned an error');

  const data = await res.json();
  return {
    title: data.title || '',
    company: data.company_name || titleCaseSlug(boardToken),
    location: data.location?.name || '',
    descriptionText: htmlToStructuredText(unescapeHtml(data.content)),
    applyUrl: data.absolute_url || '',
    atsQuestions: (data.questions || []).map((question) => ({
      label: question.label || '',
      required: Boolean(question.required),
      fields: (question.fields || []).map((field) => ({
        name: field.name,
        type: field.type,
        options: (field.values || []).map((value) => value.label)
      }))
    }))
  };
}

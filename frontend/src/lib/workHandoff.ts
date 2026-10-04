// Opens a finished resume in the editor from a page on the other host.
// The resume report lives on www.cvmind.in and the editor on app.cvmind.in, so the in-memory
// loadedWork cannot cross; the work travels in the URL hash instead (like the cover letter drafts).
import type { SavedWork } from '../types/api';

const HASH_PREFIX = '#work=';

/** The work as a URL hash for the editor's address. */
export const workHash = (work: SavedWork) => `${HASH_PREFIX}${encodeURIComponent(JSON.stringify(work))}`;

/** A work that arrived in the URL from the other host; tidies the address. Null when there is none. */
export function takeWorkFromHash(): SavedWork | null {
  try {
    if (!window.location.hash.startsWith(HASH_PREFIX)) return null;
    const work = JSON.parse(decodeURIComponent(window.location.hash.slice(HASH_PREFIX.length)));
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    return work && typeof work.htmlContent === 'string' ? work : null;
  } catch {
    return null;
  }
}

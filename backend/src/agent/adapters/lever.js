import { BaseAdapter } from './base.js';

export class LeverAdapter extends BaseAdapter {
  static id = 'lever';
  static canServerSubmit = true;

  static matches(url) {
    return /(^|\.)lever\.co$/.test(new URL(url).hostname);
  }

  get applyUrl() {
    const url = this.job?.applyUrl || this.job?.url || '';
    if (/\/apply\/?$/.test(url)) return url;
    // Lever's form lives at <posting>/apply, but only append that to a bare posting path —
    // never to a URL that already points at a page (anything with a file extension or a query)
    try {
      const parsed = new URL(url);
      if (parsed.search || /\.[a-z0-9]+$/i.test(parsed.pathname)) return url;
    } catch {
      return url;
    }
    return `${url.replace(/\/+$/, '')}/apply`;
  }

  get knownMappings() {
    return [
      { selector: 'input[name="name"]', canonicalKey: 'full_name' },
      { selector: 'input[name="email"]', canonicalKey: 'email' },
      { selector: 'input[name="phone"]', canonicalKey: 'phone' },
      { selector: 'input[name="org"]', canonicalKey: 'current_company' },
      { selector: 'input[name="urls[LinkedIn]"]', canonicalKey: 'linkedin' },
      { selector: 'input[name="urls[GitHub]"]', canonicalKey: 'github' },
      { selector: 'input[name="urls[Portfolio]"]', canonicalKey: 'portfolio' },
      { selector: 'input[name="resume"]', canonicalKey: 'resume_file' }
    ];
  }

  get submitSelectors() {
    return ['button[type="submit"].postings-btn', 'button[data-qa="btn-submit"]', 'button[type="submit"]'];
  }
}

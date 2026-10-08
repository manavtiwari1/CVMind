import { BaseAdapter } from './base.js';

export class GreenhouseAdapter extends BaseAdapter {
  static id = 'greenhouse';
  static canServerSubmit = true;

  static matches(url) {
    return /(^|\.)greenhouse\.io$/.test(new URL(url).hostname);
  }

  get knownMappings() {
    return [
      { selector: '#first_name', canonicalKey: 'first_name' },
      { selector: '#last_name', canonicalKey: 'last_name' },
      { selector: '#email', canonicalKey: 'email' },
      { selector: '#phone', canonicalKey: 'phone' },
      { selector: '#resume', canonicalKey: 'resume_file' },
      { selector: 'input[name="job_application[urls][LinkedIn]"]', canonicalKey: 'linkedin' },
      { selector: 'input[autocomplete="given-name"]', canonicalKey: 'first_name' },
      { selector: 'input[autocomplete="family-name"]', canonicalKey: 'last_name' }
    ];
  }

  get submitSelectors() {
    return ['#submit_app', 'input[type="submit"][value*="Submit" i]', 'button[type="submit"]'];
  }

  // Newer boards hide the form behind an "Apply for this job" button
  async afterOpen() {
    const trigger = this.page.getByRole('button', { name: /apply (for this job|now)/i }).first();
    if (await trigger.count().catch(() => 0)) {
      await trigger.click({ timeout: 5000 }).catch(() => {});
      await this.page.waitForSelector('#first_name, input[name*="first_name"]', { timeout: 8000 }).catch(() => {});
    }
  }
}

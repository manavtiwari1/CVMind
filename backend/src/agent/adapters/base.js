import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The extension and the server fill forms with exactly the same code, so behaviour cannot drift apart
const SHARED_DIR = path.resolve(__dirname, '../../../../extension/shared');
const SHARED_SCRIPTS = ['formScanner.js', 'formFiller.js']
  .map((file) => fs.readFileSync(path.join(SHARED_DIR, file), 'utf8'));

const CAPTCHA_SELECTORS = [
  'iframe[src*="recaptcha"]',
  'iframe[src*="hcaptcha"]',
  'iframe[title*="captcha" i]',
  '.g-recaptcha:not([style*="display: none"])',
  '[data-sitekey]'
];
const CONFIRMATION_TEXT = /thank you|application (was )?(submitted|received)|we(’|')?ve received|successfully applied/i;

export class BaseAdapter {
  static id = 'generic';
  static canServerSubmit = false;
  static matches() { return false; }

  constructor({ page, job = null, timeoutMs = 30000 }) {
    this.page = page;
    this.job = job;
    this.timeoutMs = timeoutMs;
  }

  static async prepare(context) {
    for (const source of SHARED_SCRIPTS) await context.addInitScript({ content: source });
  }

  get applyUrl() {
    return this.job?.applyUrl || this.job?.url;
  }

  // Selectors this ATS is known to use, merged over the generic keyword rules
  get knownMappings() {
    return [];
  }

  get submitSelectors() {
    return ['button[type="submit"]', 'input[type="submit"]'];
  }

  async open() {
    await this.page.goto(this.applyUrl, { waitUntil: 'domcontentloaded', timeout: this.timeoutMs });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await this.afterOpen();
  }

  // Boards that show the description first need the apply form revealing
  async afterOpen() {}

  scan() {
    return this.page.evaluate(() => globalThis.CVMindScanner.scan());
  }

  // A stable summary of the form, used to notice the page changed between filling and submitting
  static fingerprint(descriptors) {
    const shape = descriptors.map((item) => `${item.selector}|${item.type}|${item.required ? 1 : 0}`).sort();
    return crypto.createHash('sha256').update(JSON.stringify(shape)).digest('hex');
  }

  async detectBlockers() {
    const [captcha, loginRequired] = await Promise.all([
      this.page.evaluate((selectors) => selectors.some((selector) => document.querySelector(selector)), CAPTCHA_SELECTORS),
      this.page.evaluate(() => Boolean(document.querySelector('input[type="password"]')) || /\/(login|signin|sign-in)/.test(location.pathname))
    ]);
    return { captcha, loginRequired, blocked: captcha || loginRequired };
  }

  /**
   * Applies the plan. Text, select and checkbox fields go through the shared filler in the page;
   * file uploads are done from Node because a Buffer cannot cross into the page context.
   */
  async fill(plan, { resumeFile } = {}) {
    const domItems = (plan.items || []).filter((item) => item.action !== 'upload');
    const result = await this.page.evaluate(
      (items) => globalThis.CVMindFiller.applyFillPlan({ items }, {}),
      domItems
    );

    for (const item of (plan.items || []).filter((entry) => entry.action === 'upload')) {
      if (!resumeFile) {
        result.failed.push({ selector: item.selector, label: item.label, reason: 'no_resume_file' });
        continue;
      }
      try {
        await this.page.locator(item.selector).first()
          .setInputFiles({ name: resumeFile.name, mimeType: resumeFile.mimeType, buffer: resumeFile.buffer });
        result.filled++;
      } catch (err) {
        result.failed.push({ selector: item.selector, label: item.label, reason: err.message.slice(0, 120) });
      }
    }
    return result;
  }

  // Confirms what actually landed in the form, so a silent failure is never mistaken for success
  async verify(plan) {
    const textItems = (plan.items || []).filter((item) => ['fill', 'answer'].includes(item.action));
    return this.page.evaluate((items) => items
      .map((item) => {
        const el = document.querySelector(item.selector);
        if (!el) return { selector: item.selector, label: item.label, reason: 'missing' };
        const actual = String(el.value || '').trim();
        return actual === String(item.value).trim() ? null : { selector: item.selector, label: item.label, reason: 'mismatch' };
      })
      .filter(Boolean), textItems);
  }

  screenshot() {
    return this.page.screenshot({ fullPage: true, type: 'png' });
  }

  async submit() {
    const button = await this.findSubmitButton();
    if (!button) return { confirmed: false, reason: 'no_submit_button' };

    // Wait for the navigation the click causes. Forms that submit via fetch never navigate,
    // so the wait is allowed to time out and the page is read either way.
    const navigation = this.page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => null);
    await button.click({ timeout: 10000 });
    await navigation;
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(1000);

    const text = await this.page.evaluate(() => document.body.innerText.slice(0, 4000)).catch(() => '');
    const confirmed = CONFIRMATION_TEXT.test(text);
    return { confirmed, text: confirmed ? text.match(CONFIRMATION_TEXT)?.[0] || '' : '', reason: confirmed ? null : 'no_confirmation' };
  }

  async findSubmitButton() {
    for (const selector of this.submitSelectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.count().catch(() => 0)) return locator;
    }
    const byText = this.page.getByRole('button', { name: /submit|send application|apply now/i }).first();
    return (await byText.count().catch(() => 0)) ? byText : null;
  }
}

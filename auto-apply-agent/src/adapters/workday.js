import { BaseAdapter } from './base.js';

/**
 * Workday is recognised so the agent can say something useful about it, but it never fills on
 * the server: nearly every tenant requires a candidate account, and the multi-step wizard keeps
 * its state server-side. Those applications go to the browser extension, where the user is
 * already signed in.
 */
export class WorkdayAdapter extends BaseAdapter {
  static id = 'workday';
  static canServerSubmit = false;
  static handoffReason = 'workday_account';

  static matches(url) {
    const host = new URL(url).hostname;
    return /\.myworkdayjobs\.com$/.test(host) || /\.myworkdaysite\.com$/.test(host) || /(^|\.)workday\.com$/.test(host);
  }
}

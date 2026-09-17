import { BaseAdapter } from './base.js';
import { GreenhouseAdapter } from './greenhouse.js';
import { LeverAdapter } from './lever.js';
import { WorkdayAdapter } from './workday.js';

export { BaseAdapter };

// Workday is listed so it is recognised and explained, not so it can be filled:
// its canServerSubmit is false, so it always hands off to the extension
const ADAPTERS = [GreenhouseAdapter, LeverAdapter, WorkdayAdapter];

// Server-side filling is opt-in per ATS so a misbehaving adapter can be switched off without a deploy
export function enabledAdapterIds() {
  const configured = process.env.AGENT_SERVER_ADAPTERS ?? 'greenhouse,lever,workday';
  return configured.split(',').map((id) => id.trim().toLowerCase()).filter(Boolean);
}

export function pickAdapter(url) {
  if (!url) return { AdapterClass: BaseAdapter, enabled: false, reason: 'no_url' };
  let match = null;
  try {
    match = ADAPTERS.find((Adapter) => Adapter.matches(url)) || null;
  } catch {
    return { AdapterClass: BaseAdapter, enabled: false, reason: 'bad_url' };
  }
  if (!match) return { AdapterClass: BaseAdapter, enabled: false, reason: 'unsupported_site' };
  if (!enabledAdapterIds().includes(match.id)) return { AdapterClass: match, enabled: false, reason: 'adapter_disabled' };
  return { AdapterClass: match, enabled: true, reason: null };
}

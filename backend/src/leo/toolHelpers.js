// Shared by Leo's tools (tools.js, careerTools.js, missions).

import { FREE_WEEKLY } from '../billing/plans.js';
import { isPro, featureAllowance, recordFeatureUse } from '../billing/service.js';
import { getSettings } from '../admin/settings.js';
import { hasProductAccess } from '../services/productGate.js';

export const clip = (value, max) => String(value ?? '').trim().slice(0, max);
export const list = (value, max = 8, chars = 300) => (Array.isArray(value) ? value : []).map((v) => clip(v, chars)).filter(Boolean).slice(0, max);

export const fn = (name, description, properties = {}, required = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } }
});
export const str = (description) => ({ type: 'string', description });

// A card telling the user what's needed instead of a result
export const blocked = (action, message) => ({ card: { type: 'locked', action, message }, summary: `Not run: ${message}` });

export const needResume = (ctx) => (ctx.resumeText.length < 50
  ? blocked('attach', 'Attach your resume (PDF, DOCX or TXT) with the paperclip button, then ask again.')
  : null);

// Checks a weekly free-use feature. Returns { stop } with a card, or { commit } to call once the tool worked.
export async function allowance(ctx, key) {
  if (!ctx.email) return { stop: blocked('signin', `Sign in to use the ${FREE_WEEKLY[key].label.toLowerCase()}. It's free.`) };
  try {
    if (await isPro(ctx.email)) return { commit: async () => {} };
    const used = await featureAllowance(ctx.email, key);
    if (used.used >= used.limit) {
      const { label, limit } = FREE_WEEKLY[key];
      return { stop: blocked('upgrade', `You've used your ${limit} free ${label.toLowerCase()}${limit === 1 ? '' : 's'} this week. CVMind Pro has unlimited use.`) };
    }
  } catch (err) {
    console.error('[leo] free-use check failed, allowing:', err.message);
  }
  return { commit: () => recordFeatureUse(ctx.email, key).catch((err) => console.error('[leo] free-use record failed:', err.message)) };
}

// Sign-in, the admin switch and the product lock, the same controls the feature's own page has
export async function featureRefused(ctx, feature, label) {
  if (!ctx.email) return blocked('signin', `Sign in free to use ${label}.`);
  const { features, productAccess } = await getSettings();
  if (features[feature] === false) return blocked('info', `${label} is switched off right now. Please try again later.`);
  if (productAccess.locked.includes(feature) && !(await hasProductAccess(ctx.email, feature))) {
    return blocked('info', `Your account doesn't have access to ${label} yet. Contact support to get access.`);
  }
  return null;
}

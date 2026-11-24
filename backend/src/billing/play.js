import crypto from 'crypto';
import { GoogleAuth } from 'google-auth-library';
import { PLANS } from './plans.js';
import { activatePlan } from './service.js';

// CVMind Pro bought in the Android app with Google Play Billing. The app sends the purchase token;
// this checks it with the Google Play Developer API, grants the same Pro pass as the website
// (activatePlan, source 'play'), then consumes the purchase so the pass can be bought again.
//
// Env: GOOGLE_PLAY_SERVICE_ACCOUNT  the service account JSON (Play Console → API access)
//      GOOGLE_PLAY_PACKAGE          optional, defaults to in.cvmind.app

export const PLAY_PACKAGE = () => process.env.GOOGLE_PLAY_PACKAGE || 'in.cvmind.app';

// Play product id → website plan (backend/src/billing/plans.js)
export const PLAY_PRODUCTS = {
  pro_monthly: 'monthly',
  pro_half_yearly: 'half-yearly',
  pro_yearly: 'yearly'
};

export const playConfigured = () => !!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;

/** What the app sets as obfuscatedAccountId, so a token can only be claimed by the account that paid */
export const playAccountId = (userId) => crypto.createHash('sha256').update(`cvmind:${userId}`).digest('hex').slice(0, 64);

let auth = null;
async function defaultAccessToken() {
  if (!auth) {
    auth = new GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
  }
  const token = await auth.getAccessToken();
  return typeof token === 'string' ? token : token?.token;
}

const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

export class PlayError extends Error {
  constructor(message, status = 400, code = 'PLAY_INVALID') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Verifies one purchase and grants Pro. Safe to call again with the same token (a retry after a
 * network drop): the grant is keyed on the Play order, and a consumed purchase is not consumed twice.
 * deps (for tests): getAccessToken, fetchImpl, activate
 */
export async function verifyPlayPurchase({ userId, email, productId, purchaseToken }, deps = {}) {
  const plan = PLAY_PRODUCTS[productId];
  if (!plan) throw new PlayError('Unknown product.');
  if (!purchaseToken || typeof purchaseToken !== 'string' || purchaseToken.length > 4096) throw new PlayError('Missing purchase token.');
  if (!deps.getAccessToken && !playConfigured()) throw new PlayError('Payments in the app are not available yet.', 503, 'PLAY_NOT_CONFIGURED');

  const getAccessToken = deps.getAccessToken || defaultAccessToken;
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  const activate = deps.activate || activatePlan;
  const url = `${API}/${PLAY_PACKAGE()}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;

  const accessToken = await getAccessToken();
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 404 || res.status === 400 || res.status === 410) throw new PlayError('This purchase was not found on Google Play.');
  if (!res.ok) throw new PlayError('Google Play did not answer. Please try again in a moment.', 502, 'PLAY_UNAVAILABLE');
  const p = await res.json();

  // 0 purchased, 1 cancelled, 2 pending (e.g. cash or UPI still processing)
  if (p.purchaseState === 2) throw new PlayError('Your payment is still being processed. Pro turns on as soon as it completes.', 409, 'PLAY_PENDING');
  if (p.purchaseState !== 0) throw new PlayError('This purchase was cancelled or refunded.');
  if (p.obfuscatedExternalAccountId && p.obfuscatedExternalAccountId !== playAccountId(userId)) {
    throw new PlayError('This purchase belongs to another account.', 403, 'PLAY_OTHER_ACCOUNT');
  }

  const orderId = `play:${p.orderId || crypto.createHash('sha256').update(purchaseToken).digest('hex').slice(0, 40)}`;
  const subscription = await activate({ email, plan, amount: PLANS[plan]?.price ?? 0, source: 'play', orderId, note: `Google Play ${productId}` });

  // Consume after granting, so a failure here can be retried without losing the purchase
  if (p.consumptionState !== 1) {
    const consumed = await fetchImpl(`${url}:consume`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
    if (!consumed.ok) console.error('[play] consume failed', consumed.status, orderId);
  }
  return { plan, subscription };
}

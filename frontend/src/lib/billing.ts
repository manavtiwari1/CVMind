import { API_BASE } from './apiBase';
import { authFetch } from './authFetch';
import { isProUser, readUser, saveUser } from './currentUser';

// CVMind Pro on the site: plans, the signed-in account's allowance, Cashfree checkout and the
// "upgrade" prompt. Prices and limits come from the server (backend/src/billing/plans.js).

export interface Plan { key: string; label: string; price: number; days: number }

export interface PlansInfo {
  plans: Plan[];
  freeWeekly: Record<string, { label: string; limit: number }>;
  tokenLimits: { free: number; pro: number };
  proTemplates: string[];
  payments: { enabled: boolean; mode: 'sandbox' | 'production' };
  launch?: { pricingOpensAt: string; paymentsOpenAt: string; now: string };
}

// ── Launch ───────────────────────────────────────────────────────────────────
// Kept in step with backend/src/billing/plans.js; the server's times replace these once loaded
export interface LaunchTimes { pricingOpensAt: number; paymentsOpenAt: number; offset: number }

export const FALLBACK_LAUNCH: LaunchTimes = {
  pricingOpensAt: Date.parse('2026-10-09T00:00:00+05:30'),
  paymentsOpenAt: Date.parse('2026-10-11T04:00:00+05:30'),
  offset: 0,
};

// Server times, plus how far this device's clock is off when that's more than a couple of minutes
// (the plans response can be up to a minute old, so smaller gaps are left alone)
export function launchTimes(info?: PlansInfo['launch']): LaunchTimes {
  if (!info) return FALLBACK_LAUNCH;
  const skew = Date.parse(info.now) - Date.now();
  return {
    pricingOpensAt: Date.parse(info.pricingOpensAt),
    paymentsOpenAt: Date.parse(info.paymentsOpenAt),
    offset: Math.abs(skew) > 2 * 60 * 1000 ? skew : 0,
  };
}

// e.g. "11 Oct, 12:00 am IST"
export const launchTimeText = (ms: number) => `${new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST`;

export interface BillingMe {
  pro: boolean;
  subscription: { plan: string; label: string; expiresAt: string; source: string } | null;
  tokens: { used: number; limit: number; resetsAt: string | null };
  weekly: Record<string, { label: string; limit: number; used: number }>;
}

// Resume templates that need Pro (kept in step with PRO_TEMPLATES on the server)
export const PRO_TEMPLATE_IDS = new Set(['cv-stylish', 'cv-hybrid', 'cv-portrait', 'cv-terracotta', 'cv-spotlight', 'cv-studio', 'cv-ledger']);

// Cover letter designs that need Pro (kept in step with PRO_LETTER_TEMPLATES on the server)
export const PRO_LETTER_IDS = new Set(['cl-navy-tan', 'cl-dots', 'cl-hex', 'cl-clean', 'cl-serif-center']);

export const isProTemplate = (id?: string | null) => !!id && (PRO_TEMPLATE_IDS.has(id) || PRO_LETTER_IDS.has(id));

export const userIsPro = () => isProUser(readUser());

// False (and shows the upgrade dialog) when a free account picks a Pro template or design
export function canUseTemplate(id?: string | null) {
  if (!isProTemplate(id) || userIsPro()) return true;
  requestUpgrade('template');
  return false;
}

// ── Upgrade prompt ───────────────────────────────────────────────────────────
// Fired when a free account hits a Pro-only feature or a limit; App shows the upgrade dialog
export const UPGRADE_EVENT = 'cvmind-upgrade-required';

export type UpgradeReason = 'template' | 'branding' | 'limit' | 'tokens';

export interface UpgradeDetail { reason: UpgradeReason; message?: string }

export function requestUpgrade(reason: UpgradeReason, message?: string) {
  window.dispatchEvent(new CustomEvent<UpgradeDetail>(UPGRADE_EVENT, { detail: { reason, message } }));
}

// ── API ──────────────────────────────────────────────────────────────────────
let plansPromise: Promise<PlansInfo> | null = null;

export function loadPlans(): Promise<PlansInfo> {
  if (!plansPromise) {
    plansPromise = fetch(`${API_BASE}/api/billing/plans`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('plans unavailable'))))
      .catch((err) => { plansPromise = null; throw err; });
  }
  return plansPromise;
}

export async function loadBillingMe(): Promise<BillingMe> {
  const res = await authFetch(`${API_BASE}/api/billing/me`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not load your plan.');
  syncProFlag(data.pro);
  return data;
}

// Keeps the stored session's Pro badge in step with the server
export function syncProFlag(pro: boolean) {
  const user = readUser();
  if (!user || isProUser(user) === pro) return;
  saveUser({ ...user, isPro: pro, plan: pro ? 'pro' : undefined });
}

// ── Cashfree checkout ────────────────────────────────────────────────────────
interface CashfreeInstance { checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown> }
declare global { interface Window { Cashfree?: (opts: { mode: string }) => CashfreeInstance } }

let sdkPromise: Promise<void> | null = null;
function loadCashfreeSdk(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { sdkPromise = null; reject(new Error('Could not load the payment page. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

// Creates the order and opens Cashfree's payment page. Resolves { paid: true } when a coupon
// covered the full price (no payment needed); otherwise the page redirects to Cashfree.
export async function startCheckout({ plan, phone, couponCode }: { plan: string; phone: string; couponCode?: string }): Promise<{ paid: boolean }> {
  const res = await authFetch(`${API_BASE}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, phone, couponCode: couponCode || undefined, name: readUser()?.name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not start the payment. Please try again.');
  if (data.paid) {
    await loadBillingMe().catch(() => {});
    return { paid: true };
  }
  await loadCashfreeSdk();
  if (!window.Cashfree) throw new Error('Could not load the payment page. Please try again.');
  await window.Cashfree({ mode: data.mode }).checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_self' });
  return { paid: false };
}

// After Cashfree sends the buyer back: 'paid' | 'pending' | 'failed'
export async function verifyOrder(orderId: string): Promise<{ status: string; expiresAt: string | null }> {
  const res = await authFetch(`${API_BASE}/api/billing/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not confirm the payment yet.');
  if (data.status === 'paid') syncProFlag(true);
  return data;
}

export const formatInr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// ── Refund requests ──────────────────────────────────────────────────────────
// Payments are non-refundable. A running Monthly plan can be cancelled with a refund request for a
// genuine reason; the team reviews it by hand (backend/src/billing/refunds.js).
export interface RefundRequestView {
  status: 'pending' | 'approved' | 'rejected';
  plan: string;
  amount: number;
  category: string;
  createdAt: string;
  decidedAt: string | null;
  note: string;
}

export interface RefundStatus {
  canRequest: boolean;
  plan: { label: string; amount: number; paidAt: string; expiresAt: string | null } | null;
  request: RefundRequestView | null;
  categories: Record<string, string>;
  minDetails: number;
  activeSource?: 'cashfree' | 'admin' | 'coupon' | null;
}

export async function loadRefundStatus(): Promise<RefundStatus> {
  const res = await authFetch(`${API_BASE}/api/billing/refund-request`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not load this right now.');
  return data;
}

export async function requestRefund(body: { category: string; details: string; acknowledged: boolean }): Promise<RefundRequestView> {
  const res = await authFetch(`${API_BASE}/api/billing/refund-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not send your request. Please try again.');
  return data.request;
}

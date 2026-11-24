import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { api } from './api';

// CVMind Pro in the app. The passes and prices are the website's (GET /api/billing/plans); on
// Android they are bought with Google Play Billing (expo-iap) and confirmed by the backend
// (POST /api/billing/play/verify), which turns Pro on for the account everywhere.

export interface Plan { key: string; label: string; price: number; days: number }
export interface PlansPayload {
  plans: Plan[];
  proTemplates?: string[];
  proLetterTemplates?: string[];
  play?: { enabled: boolean; products: Record<string, string> };
}

export function usePlans() {
  return useQuery({ queryKey: ['billing-plans'], queryFn: () => api<PlansPayload>('/api/billing/plans', { anonymous: true }), staleTime: 60 * 60 * 1000 });
}

/** Play product id for a website plan key ('monthly' → 'pro_monthly') */
export const productFor = (plans: PlansPayload | undefined, planKey: string) =>
  Object.entries(plans?.play?.products || {}).find(([, key]) => key === planKey)?.[0] ?? null;

export const playBillingReady = (plans: PlansPayload | undefined) => Platform.OS === 'android' && !!plans?.play?.enabled;

type IapPurchase = { productId: string; purchaseToken?: string | null; purchaseTokenAndroid?: string | null };

async function verify(purchase: IapPurchase) {
  const purchaseToken = purchase.purchaseToken || purchase.purchaseTokenAndroid;
  if (!purchaseToken) throw new Error('Google Play did not return the purchase. Please try again.');
  return api<{ pro: boolean; plan: string; expiresAt: string | null }>('/api/billing/play/verify', {
    method: 'POST',
    body: { productId: purchase.productId, purchaseToken },
  });
}

/**
 * Buys one Pro pass. Resolves when the backend has turned Pro on; rejects with a message to show,
 * or with { cancelled: true } when the person closed the Play sheet.
 */
export async function buyPro(productId: string, playAccountId: string): Promise<{ plan: string; expiresAt: string | null }> {
  const iap = await import('expo-iap');
  await iap.initConnection();
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      updated.remove();
      failed.remove();
      fn();
    };
    const updated = iap.purchaseUpdatedListener(async (purchase) => {
      if (purchase.productId !== productId) return;
      try {
        const res = await verify(purchase as IapPurchase);
        // The backend consumed it already; this tells Play the app is done with it too
        await iap.finishTransaction({ purchase, isConsumable: true }).catch(() => {});
        finish(() => resolve({ plan: res.plan, expiresAt: res.expiresAt }));
      } catch (err) {
        finish(() => reject(err));
      }
    });
    const failed = iap.purchaseErrorListener((error) => {
      const cancelled = /cancel/i.test(String((error as { code?: string }).code ?? '')) || /cancel/i.test(error.message ?? '');
      finish(() => reject(cancelled ? { cancelled: true } : new Error(error.message || 'The purchase did not go through.')));
    });
    iap
      .requestPurchase({ type: 'in-app', request: { google: { skus: [productId], obfuscatedAccountId: playAccountId } } })
      .catch((err: Error) => finish(() => reject(err)));
  });
}

/** Finds Play purchases that were paid but never confirmed (app closed mid-way) and confirms them */
export async function restorePurchases(): Promise<number> {
  const iap = await import('expo-iap');
  await iap.initConnection();
  const owned = (await iap.getAvailablePurchases()) as unknown as IapPurchase[];
  let restored = 0;
  for (const p of owned || []) {
    if (!p.productId?.startsWith('pro_')) continue;
    try {
      await verify(p);
      await iap.finishTransaction({ purchase: p as never, isConsumable: true }).catch(() => {});
      restored += 1;
    } catch {
      /* not ours or already used */
    }
  }
  return restored;
}

/** Prices Google Play shows for this phone (₹ with taxes), by product id */
export async function playPrices(productIds: string[]): Promise<Record<string, string>> {
  try {
    const iap = await import('expo-iap');
    await iap.initConnection();
    const products = (await iap.fetchProducts({ skus: productIds, type: 'in-app' })) as { id: string; displayPrice: string }[] | null;
    return Object.fromEntries((products || []).map((p) => [p.id, p.displayPrice]));
  } catch {
    return {};
  }
}

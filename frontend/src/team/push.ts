import { api } from './api';
import { isSplitHost } from '../lib/hosts';

// Browser push for CVMind Team: a service worker at /team-sw.js shows notifications even when the
// app is closed. On iPhone this only works once the app is added to the Home Screen (iOS 16.4+).

const SW_URL = '/team-sw.js';
// team.cvmind.in owns the whole origin; on localhost and previews the app lives at /team
const scope = () => (isSplitHost() ? '/' : '/team');

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

// Registers the worker once per page load; a tapped notification can ask an open window to navigate
export function registerTeamWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  if (!registration) {
    registration = navigator.serviceWorker.register(SW_URL, { scope: scope() }).catch(() => null);
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'open' && typeof e.data.url === 'string') window.location.href = e.data.url;
    });
  }
  return registration;
}

const keyBytes = (base64: string) => {
  const raw = atob((base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function currentSubscription() {
  const reg = await registerTeamWorker();
  return reg ? reg.pushManager.getSubscription() : null;
}

// 'on' (this browser gets pushes), 'off', 'denied' (blocked in browser settings) or 'unsupported'
export async function pushState(): Promise<'on' | 'off' | 'denied' | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return (await currentSubscription()) ? 'on' : 'off';
}

// Asks for permission (only ever from a tap) and registers this browser with the server
export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser does not support notifications.');
  const { enabled, publicKey } = await api<{ enabled: boolean; publicKey: string }>('/push/key');
  if (!enabled) throw new Error('Browser notifications are not set up on the server yet.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Notifications are blocked. Allow them for this site in your browser settings.' : 'Notifications were not allowed.');
  const reg = await registerTeamWorker();
  if (!reg) throw new Error('Could not start notifications in this browser.');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await api('/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } });
}

// Stops pushes to this browser. Called on sign-out too, so the next person here doesn't get them.
export async function disablePush() {
  const sub = await currentSubscription().catch(() => null);
  if (!sub) return;
  await api('/push/subscribe', { method: 'DELETE', body: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

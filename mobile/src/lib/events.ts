// A tiny app-wide event bus. The API client announces refusals here (like the website's window events
// in frontend/src/lib/authFetch.ts) and the root layout reacts: sign-in, verify email, upgrade.

export type AppEvent =
  | { type: 'auth-required'; message?: string }
  | { type: 'verify-required' }
  | { type: 'upgrade-required'; reason: 'limit' | 'tokens' | 'learn-leo'; message?: string }
  | { type: 'coming-soon'; product: string };

type Listener = (event: AppEvent) => void;
const listeners = new Set<Listener>();

export function emit(event: AppEvent) {
  listeners.forEach((l) => l(event));
}

export function onAppEvent(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

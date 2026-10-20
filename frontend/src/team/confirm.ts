// In-app replacement for window.confirm: `if (!(await confirmDialog({ ... }))) return;`
// ConfirmHost (ui.tsx), mounted once in the team app, shows the request.

export interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

type Pending = ConfirmRequest & { resolve: (ok: boolean) => void };

let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function confirmDialog(request: ConfirmRequest): Promise<boolean> {
  pending?.resolve(false);
  return new Promise((resolve) => {
    pending = { ...request, resolve };
    emit();
  });
}

export function answerConfirm(ok: boolean) {
  const current = pending;
  pending = null;
  current?.resolve(ok);
  emit();
}

export const currentConfirm = () => pending;

export function subscribeConfirm(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { AdminAccount } from './api';

type Query = Record<string, string | number | boolean | undefined | null>;

interface ApiState<T> {
  key: string;
  data?: T;
  error?: string;
}

// Loads `path` and reloads when the path or query changes. Old data stays on screen while the next page loads.
// Pass path = null to skip loading.
export function useApi<T>(path: string | null, query?: Query) {
  const [reloadToken, setReloadToken] = useState(0);
  const key = path ? JSON.stringify([path, query || {}, reloadToken]) : '';
  const [state, setState] = useState<ApiState<T>>({ key: '' });

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path, { query })
      .then((data) => { if (!cancelled) setState({ key, data }); })
      .catch((err: Error) => { if (!cancelled) setState((prev) => ({ key, data: prev.data, error: err.message })); });
    return () => { cancelled = true; };
    // `key` captures path, query and reloadToken
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);
  const isCurrent = state.key === key;
  return {
    data: state.data,
    error: isCurrent ? state.error : undefined,
    loading: !!path && !isCurrent,
    reload
  };
}

// Debounced copy of a value, for search boxes
export function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

// Runs an async action with a busy flag and toast on success/failure
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback(async <R,>(id: string, fn: () => Promise<R>, success?: string): Promise<R | undefined> => {
    setBusy(id);
    try {
      const result = await fn();
      if (success) toast(success);
      return result;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong.', 'error');
      return undefined;
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [toast]);

  return { busy, run };
}

// ── Toasts ───────────────────────────────────────────────────────────────────
export type ToastFn = (message: string, tone?: 'success' | 'error') => void;
export const ToastContext = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastContext);

// ── Signed-in admin ──────────────────────────────────────────────────────────
export interface AdminContextValue {
  admin: AdminAccount;
  can: (permission: string) => boolean;
  go: (section: string, params?: Record<string, string>) => void;
  params: Record<string, string>;
  refreshBadges: () => void;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside the admin shell');
  return ctx;
}

import { useSyncExternalStore } from 'react';
import { api } from './api';

// Which messages I saved for later, shared by every message in the app
let ids = new Set<string>();
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function loadSaved() {
  if (loaded) return;
  loaded = true;
  api<{ data: string[] }>('/saved/ids').then((r) => { ids = new Set(r.data); emit(); }).catch(() => { loaded = false; });
}

export function useSaved(messageId: string) {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => ids.has(messageId));
}

export async function toggleSaved(messageId: string, saved: boolean) {
  await api(`/messages/${messageId}/save`, { method: 'POST', body: { saved } });
  ids = new Set(ids);
  if (saved) ids.add(messageId); else ids.delete(messageId);
  emit();
}

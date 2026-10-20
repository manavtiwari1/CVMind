import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Channel, Person, TeamAccount } from './api';
import { getSocket } from './socket';

// ── Routing (hash based, so every path works on any static host) ────────────
export interface Route { view: string; id: string; params: Record<string, string> }

export function readRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, search = ''] = raw.split('?');
  const [view, id = ''] = path.split('/');
  return { view: view || 'home', id: decodeURIComponent(id), params: Object.fromEntries(new URLSearchParams(search)) };
}

export function hrefFor(view: string, id = '', params: Record<string, string> = {}) {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return `#/${view}${id ? `/${encodeURIComponent(id)}` : ''}${search ? `?${search}` : ''}`;
}

export function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (view: string, id = '', params: Record<string, string> = {}) => {
  window.location.hash = hrefFor(view, id, params);
};

// ── Workspace state (provided by TeamProvider) ───────────────────────────────
export type Toast = (message: string, tone?: 'ok' | 'error') => void;

export interface TeamState {
  me: TeamAccount;
  setMe: (me: TeamAccount) => void;
  manager: boolean;
  people: Map<string, Person>;
  person: (id: string | null | undefined) => Person | undefined;
  nameOf: (id: string | null | undefined) => string;
  channels: Channel[];
  reloadChannels: () => Promise<void>;
  reloadPeople: () => Promise<void>;
  unreadNotifications: number;
  reloadNotifications: () => void;
  live: boolean;
  toast: Toast;
  signOut: () => void;
}

export const TeamContext = createContext<TeamState | null>(null);

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam must be used inside TeamProvider');
  return ctx;
}

// "Riya, Aman" for a DM, from the signed-in person's point of view
export function useDmName() {
  const { me, nameOf } = useTeam();
  return (c: Channel) => {
    const others = (c.memberIds || []).filter((id) => id !== me.id);
    return others.length ? others.map(nameOf).join(', ') : `${nameOf(me.id)} (you)`;
  };
}

// ── Live events ──────────────────────────────────────────────────────────────
// While the socket is down the provider calls every registered poll function on a timer
export const POLL_MS = 15000;
const pollHandlers = new Set<() => void>();
export const runPollHandlers = () => pollHandlers.forEach((fn) => fn());

type Handler = (payload: Record<string, string>) => void;

// Subscribes to a live event. While the socket is down, `onPoll` (if given) runs every 15 s instead.
export function useTeamEvent(event: string, handler: Handler, onPoll?: () => void) {
  const ref = useRef(handler);
  const pollRef = useRef(onPoll);
  useEffect(() => {
    ref.current = handler;
    pollRef.current = onPoll;
  });
  useEffect(() => {
    const socket = getSocket();
    const fn = (payload: Record<string, string>) => ref.current(payload || {});
    socket?.on(event, fn);
    const poll = () => pollRef.current?.();
    pollHandlers.add(poll);
    return () => {
      socket?.off(event, fn);
      pollHandlers.delete(poll);
    };
  }, [event]);
}

// Loads `path` (null to skip) and reloads when it or the query changes
export function useLoad<T>(path: string | null, query?: Record<string, string | number | undefined>) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: '' });
  const [tick, setTick] = useState(0);
  const key = path ? JSON.stringify([path, query || {}, tick]) : '';
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path, { query })
      .then((data) => { if (!cancelled) setState({ key, data }); })
      .catch((err: Error) => { if (!cancelled) setState((prev) => ({ key, data: prev.data, error: err.message })); });
    return () => { cancelled = true; };
    // `key` covers path, query and tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data: state.data, error: state.key === key ? state.error : undefined, loading: !!path && state.key !== key, reload };
}

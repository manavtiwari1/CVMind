import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import type { Channel, Person, TeamAccount } from './api';
import { connectSocket, disconnectSocket, getSocket } from './socket';
import { POLL_MS, runPollHandlers, TeamContext } from './store';
import type { Toast } from './store';

export default function TeamProvider({ me: initialMe, token, toast, signOut, children }: { me: TeamAccount; token: string; toast: Toast; signOut: () => void; children: ReactNode }) {
  const [me, setMe] = useState(initialMe);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [channels, setChannels] = useState<Channel[]>([]);
  const [unreadNotifications, setUnread] = useState(0);
  const [live, setLive] = useState(false);
  const meId = useRef(me.id);

  const reloadPeople = useCallback(async () => {
    const { data } = await api<{ data: Person[] }>('/members');
    setPeople(new Map(data.map((p) => [p.id, p])));
  }, []);

  const reloadChannels = useCallback(async () => {
    const { data } = await api<{ data: Channel[] }>('/channels');
    setChannels(data);
  }, []);

  const reloadNotifications = useCallback(() => {
    api<{ unread: number }>('/notifications', { query: { unread: 1 } }).then((r) => setUnread(r.unread)).catch(() => {});
  }, []);

  // One socket per signed-in session, with the live updates the whole app cares about.
  // Everything loads (and reloads) when it connects.
  useEffect(() => {
    const socket = connectSocket(token);
    const refreshAll = () => {
      reloadChannels().catch(() => {});
      reloadPeople().catch(() => {});
      reloadNotifications();
    };
    socket.on('connect', () => { setLive(true); refreshAll(); });
    socket.on('disconnect', () => setLive(false));
    socket.on('connect_error', () => setLive(false));
    socket.on('presence', ({ adminId, state }: { adminId: string; state: Person['presence'] }) => {
      setPeople((prev) => {
        const p = prev.get(adminId);
        if (!p || p.presence === state) return prev;
        const next = new Map(prev);
        next.set(adminId, { ...p, presence: state, lastSeenAt: state === 'offline' ? new Date().toISOString() : p.lastSeenAt });
        return next;
      });
    });
    socket.on('notification.new', () => setUnread((n) => n + 1));
    socket.on('channel.updated', () => { reloadChannels().catch(() => {}); });
    socket.on('message.created', ({ authorId, parentId }: { authorId?: string; parentId?: string | null }) => {
      if (!parentId && authorId !== meId.current) reloadChannels().catch(() => {});
    });
    // First load, without waiting for the socket (it may never connect)
    const first = setTimeout(refreshAll, 0);
    return () => {
      clearTimeout(first);
      disconnectSocket();
    };
  }, [token, reloadChannels, reloadPeople, reloadNotifications]);

  // Without a live connection, refresh on a timer
  useEffect(() => {
    if (live) return;
    const id = setInterval(() => {
      reloadChannels().catch(() => {});
      reloadNotifications();
      runPollHandlers();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [live, reloadChannels, reloadNotifications]);

  // Away after 10 minutes without activity
  useEffect(() => {
    let away = false;
    let timer: ReturnType<typeof setTimeout>;
    const mark = (value: boolean) => {
      if (away === value) return;
      away = value;
      getSocket()?.emit('presence:away', value);
    };
    const active = () => {
      mark(false);
      clearTimeout(timer);
      timer = setTimeout(() => mark(true), 10 * 60 * 1000);
    };
    active();
    const events = ['mousemove', 'keydown', 'touchstart', 'focus'];
    events.forEach((e) => window.addEventListener(e, active, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, active));
    };
  }, []);

  // "(3) CVMind Team" in the tab title
  useEffect(() => {
    document.title = unreadNotifications ? `(${unreadNotifications}) CVMind Team` : 'CVMind Team';
  }, [unreadNotifications]);

  const person = useCallback((id: string | null | undefined) => (id ? people.get(id) : undefined), [people]);
  const nameOf = useCallback((id: string | null | undefined) => (id ? people.get(id)?.name || 'Former member' : 'Someone'), [people]);

  return (
    <TeamContext.Provider value={{
      me, setMe, manager: me.permissions.includes('teamchat.manage'), people, person, nameOf, channels, reloadChannels, reloadPeople,
      unreadNotifications, reloadNotifications, live, toast, signOut
    }}>
      {children}
    </TeamContext.Provider>
  );
}

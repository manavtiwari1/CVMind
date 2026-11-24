import { useSyncExternalStore } from 'react';

// The side menu and the Leo screen share one thing: which chat is open.
// The menu asks for a chat (or a fresh one); the Leo screen does the loading and reports back.

type Request = { kind: 'open'; id: string } | { kind: 'new' };

let openId: string | null = null;
const watchers = new Set<() => void>();
let handler: ((req: Request) => void) | null = null;

export function setOpenChat(id: string | null) {
  if (id === openId) return;
  openId = id;
  watchers.forEach((w) => w());
}

export function useOpenChat() {
  return useSyncExternalStore(
    (cb) => {
      watchers.add(cb);
      return () => {
        watchers.delete(cb);
      };
    },
    () => openId,
  );
}

/** The Leo screen registers itself here while it's mounted */
export function handleChatRequests(fn: (req: Request) => void) {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

export const requestChat = (id: string) => handler?.({ kind: 'open', id });
export const requestNewChat = () => handler?.({ kind: 'new' });

import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { TEAM_API, teamToken } from './api';

let socket: Socket | null = null;

export function connectSocket(token: string) {
  socket?.disconnect();
  // Every handshake sends the latest stored token (see refreshSocketAuth)
  socket = io(TEAM_API, { path: '/team-socket', auth: (cb) => cb({ token: teamToken() || token }), transports: ['websocket', 'polling'], reconnectionDelayMax: 10000 });
  return socket;
}

// After a password change renews this tab's token: reconnect now with it. The server re-checks each socket's
// handshake token and closes ones signed out by the change, and socket.io does not reconnect after that.
export function refreshSocketAuth() {
  socket?.disconnect().connect();
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export const getSocket = () => socket;

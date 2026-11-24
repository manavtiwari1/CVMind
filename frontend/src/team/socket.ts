import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { TEAM_API, teamToken } from './api';

let socket: Socket | null = null;

export function connectSocket(token: string) {
  socket?.disconnect();
  // Reconnects use the latest stored token, so a password change (which renews this tab's token) keeps chat live
  socket = io(TEAM_API, { path: '/team-socket', auth: (cb) => cb({ token: teamToken() || token }), transports: ['websocket', 'polling'], reconnectionDelayMax: 10000 });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export const getSocket = () => socket;

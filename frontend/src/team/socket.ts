import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { TEAM_API } from './api';

let socket: Socket | null = null;

export function connectSocket(token: string) {
  socket?.disconnect();
  socket = io(TEAM_API, { path: '/team-socket', auth: { token }, transports: ['websocket', 'polling'], reconnectionDelayMax: 10000 });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export const getSocket = () => socket;

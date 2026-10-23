import { Server } from 'socket.io';
import { adminFromToken } from '../auth.js';
import { AdminUser } from '../models.js';
import { channelFor } from './access.js';
import { TeamChannel, TeamChannelMember } from './models.js';
import { registerMeetingHandlers } from './meetRealtime.js';

// Socket.IO for the team app. Events carry ids and small hints; the client loads the record over
// REST, where the access checks live. Rooms: u:<adminId> (one person), c:<channelId>, m:<meetingId>
// (a live call), team (everyone).

let io = null;
// adminId → { sockets, away }
const presence = new Map();
const RECHECK_MS = 30 * 1000;

export const TEAM_SOCKET_PATH = '/team-socket';

const ALLOWED_ORIGINS = [/^https:\/\/team\.cvmind\.in$/, /^https?:\/\/team\.lvh\.me(:\d+)?$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

export function presenceOf(adminId) {
  const p = presence.get(String(adminId));
  if (!p || p.sockets === 0) return 'offline';
  return p.away ? 'away' : 'online';
}

function broadcastPresence(adminId) {
  io?.to('team').emit('presence', { adminId, state: presenceOf(adminId) });
}

// Every channel room this person should receive live messages for
async function memberChannelIds(adminId) {
  const rows = await TeamChannelMember.find({ adminId }, { channelId: 1 }).lean();
  const live = await TeamChannel.find({ _id: { $in: rows.map((r) => r.channelId) }, archivedAt: null }, { _id: 1 }).lean();
  return live.map((c) => String(c._id));
}

export function attachTeamRealtime(httpServer, { origins = ALLOWED_ORIGINS } = {}) {
  io = new Server(httpServer, { path: TEAM_SOCKET_PATH, cors: { origin: origins } });

  io.use(async (socket, next) => {
    try {
      const admin = await adminFromToken(String(socket.handshake.auth?.token || ''), 'team');
      if (!admin || !admin.chatAccess || admin.mustChangePassword) return next(new Error('unauthorized'));
      socket.data.admin = admin;
      socket.data.token = String(socket.handshake.auth.token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const admin = socket.data.admin;
    const id = String(admin.id);
    socket.join([`u:${id}`, 'team']);

    const p = presence.get(id) || { sockets: 0, away: false };
    p.sockets += 1;
    p.away = false;
    presence.set(id, p);
    broadcastPresence(id);

    // A revoked session, removed access or deactivated account closes the socket within RECHECK_MS
    const recheck = setInterval(async () => {
      const fresh = await adminFromToken(socket.data.token, 'team').catch(() => null);
      if (!fresh || !fresh.chatAccess) socket.disconnect(true);
    }, RECHECK_MS);

    // Watch a channel you're reading but haven't joined (a public channel, or a private one as a manager)
    socket.on('channel:watch', async ({ channelId } = {}, ack) => {
      try {
        await channelFor(admin, channelId);
        socket.join(`c:${channelId}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on('typing', ({ channelId, parentId } = {}) => {
      if (!channelId || !socket.rooms.has(`c:${channelId}`)) return;
      socket.to(`c:${channelId}`).emit('typing', { channelId, parentId: parentId || null, adminId: id, name: admin.name });
    });

    socket.on('presence:away', (away) => {
      const entry = presence.get(id);
      if (!entry) return;
      entry.away = !!away;
      broadcastPresence(id);
    });

    registerMeetingHandlers(io, socket);

    // Handlers are registered before this await, so nothing the client sends right away is lost
    memberChannelIds(id).then((ids) => ids.forEach((channelId) => socket.join(`c:${channelId}`))).catch(() => {});

    socket.on('disconnect', async () => {
      clearInterval(recheck);
      const entry = presence.get(id);
      if (entry) entry.sockets = Math.max(0, entry.sockets - 1);
      if (!entry || entry.sockets === 0) {
        presence.delete(id);
        await AdminUser.updateOne({ _id: id }, { lastSeenAt: new Date() }).catch(() => {});
        broadcastPresence(id);
      }
    });
  });

  return io;
}

export function closeTeamRealtime() {
  io?.close();
  io = null;
  presence.clear();
}

// No-ops without a socket server (Vercel, tests that don't attach one)
export const emitToChannel = (channelId, event, payload) => io?.to(`c:${channelId}`).emit(event, payload);
export const emitToUser = (adminId, event, payload) => io?.to(`u:${adminId}`).emit(event, payload);
export const emitToTeam = (event, payload) => io?.to('team').emit(event, payload);
export const emitToMeeting = (meetingId, event, payload) => io?.to(`m:${meetingId}`).emit(event, payload);
export const joinChannelRoom = (adminId, channelId) => io?.in(`u:${adminId}`).socketsJoin(`c:${channelId}`);
export const leaveChannelRoom = (adminId, channelId) => io?.in(`u:${adminId}`).socketsLeave(`c:${channelId}`);
export const disconnectUser = (adminId) => io?.in(`u:${adminId}`).disconnectSockets(true);

import { Server } from 'socket.io';
import { adminFromToken } from '../auth.js';
import { AdminUser } from '../models.js';
import { channelFor, meetingFor } from './access.js';
import { TeamChannel, TeamChannelMember } from './models.js';
import { isInCall, registerMeetingHandlers, setCallListener } from './meetRealtime.js';

// Socket.IO for the team app. Events carry ids and small hints; the client loads the record over
// REST, where the access checks live. Rooms: u:<adminId> (one person), c:<channelId>, m:<meetingId>
// (a live call), team (everyone).

let io = null;
// adminId → { sockets, away }
const presence = new Map();
const RECHECK_MS = 30 * 1000;

export const TEAM_SOCKET_PATH = '/team-socket';

const ALLOWED_ORIGINS = [/^https:\/\/team\.cvmind\.in$/, /^https?:\/\/team\.lvh\.me(:\d+)?$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

// Status a person sets themselves: busy, dnd (do not disturb) or away, until a time or until changed.
// adminId → { state, until }
const availability = new Map();
export const AVAILABILITY = ['auto', 'busy', 'dnd', 'away'];

export function availabilityOf(adminId) {
  const a = availability.get(String(adminId));
  if (!a || a.state === 'auto') return 'auto';
  if (a.until && a.until <= Date.now()) {
    availability.delete(String(adminId));
    return 'auto';
  }
  return a.state;
}

// offline · dnd · busy · in_meeting · away · online
export function presenceOf(adminId) {
  const p = presence.get(String(adminId));
  if (!p || p.sockets === 0) return 'offline';
  const set = availabilityOf(adminId);
  if (set === 'dnd' || set === 'busy') return set;
  if (isInCall(adminId)) return 'in_meeting';
  if (set === 'away') return 'away';
  return p.away ? 'away' : 'online';
}

// Do not disturb: no push notifications (in-app notifications still arrive)
export const isDoNotDisturb = (adminId) => availabilityOf(adminId) === 'dnd';

export function broadcastPresence(adminId) {
  io?.to('team').emit('presence', { adminId: String(adminId), state: presenceOf(adminId) });
}

export function setAvailability(adminId, state, until = null) {
  if (state === 'auto') availability.delete(String(adminId));
  else availability.set(String(adminId), { state, until: until ? +new Date(until) : null });
  broadcastPresence(adminId);
}
setCallListener(broadcastPresence);

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
    // A status set earlier (busy, do not disturb) survives restarts through the account record
    if (!availability.has(id) && admin.availability && admin.availability !== 'auto') {
      const until = admin.availabilityUntil ? +new Date(admin.availabilityUntil) : null;
      if (!until || until > Date.now()) availability.set(id, { state: admin.availability, until });
    }
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

    // Declining an incoming direct call tells the caller
    socket.on('call:decline', async ({ meetingId } = {}) => {
      try {
        const meeting = await meetingFor(admin, meetingId);
        if (meeting.status !== 'live') return;
        io.to(`u:${meeting.hostId}`).emit('call.declined', { meetingId: String(meeting._id), by: { id, name: admin.name } });
        // Stop it ringing on this person's other devices
        io.to(`u:${id}`).emit('call.stopped', { meetingId: String(meeting._id) });
      } catch {
        /* not their call */
      }
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
  availability.clear();
}

// No-ops without a socket server (Vercel, tests that don't attach one)
export const emitToChannel = (channelId, event, payload) => io?.to(`c:${channelId}`).emit(event, payload);
export const emitToUser = (adminId, event, payload) => io?.to(`u:${adminId}`).emit(event, payload);
export const emitToTeam = (event, payload) => io?.to('team').emit(event, payload);
export const emitToMeeting = (meetingId, event, payload) => io?.to(`m:${meetingId}`).emit(event, payload);
export const joinChannelRoom = (adminId, channelId) => io?.in(`u:${adminId}`).socketsJoin(`c:${channelId}`);
export const leaveChannelRoom = (adminId, channelId) => io?.in(`u:${adminId}`).socketsLeave(`c:${channelId}`);
export const disconnectUser = (adminId) => io?.in(`u:${adminId}`).disconnectSockets(true);

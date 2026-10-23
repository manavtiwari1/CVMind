import { isManager, meetingFor, oid, sameId } from './access.js';
import { TeamMeeting, TeamMeetingCaption, TeamMeetingMessage } from './models.js';
import { cancelEmptyEnd, emitMeetingUpdate, endMeeting, MEET_MAX_PEOPLE, publicMeeting, scheduleEmptyEnd, startMeeting } from './meetings.js';

// Live meeting rooms, in memory (one API server). Each browser in a meeting is a peer, keyed by
// socket id. The server relays WebRTC offers, answers and ICE candidates between two peers and
// broadcasts small state changes; audio and video never pass through it.

// meetingId → { peers: Map(socketId → peer), hostId, recording, removed: Set(adminId) }
const rooms = new Map();

export const livePeers = (meetingId) => [...(rooms.get(String(meetingId))?.peers.values() || [])];

export const REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '😮'];
const MAX_SIGNAL_CHARS = 30000;
const MAX_CHAT = 1000;
const MAX_CAPTION = 500;

const roomName = (meetingId) => `m:${meetingId}`;
const ok = (ack, data = {}) => ack?.({ ok: true, ...data });
const fail = (ack, error, code = '') => ack?.({ ok: false, error, code });

let ioRef = null;

// Ending a meeting empties its room; the browsers hear meet:ended and hang up
export function closeMeetingRoom(meetingId) {
  rooms.delete(String(meetingId));
  ioRef?.in(roomName(meetingId)).socketsLeave(roomName(meetingId));
}

export function registerMeetingHandlers(io, socket) {
  ioRef = io;
  const admin = socket.data.admin;
  const me = String(admin.id);
  let current = null;
  let lastReaction = 0;

  // This socket's room and peer, if it is still in a meeting (it may have been removed)
  const mine = () => {
    const room = current && rooms.get(current);
    const peer = room?.peers.get(socket.id);
    return peer ? { room, peer, meetingId: current } : null;
  };
  const canHost = (room) => sameId(room.hostId, me) || isManager(admin);

  async function leave() {
    const at = mine();
    current = null;
    if (!at) return;
    const { room, meetingId } = at;
    room.peers.delete(socket.id);
    socket.leave(roomName(meetingId));
    io.to(roomName(meetingId)).emit('meet:peer-left', { socketId: socket.id });
    if (room.recording?.socketId === socket.id) {
      room.recording = null;
      io.to(roomName(meetingId)).emit('meet:recording', { on: false });
    }
    const peers = [...room.peers.values()];
    if (!peers.length) {
      rooms.delete(meetingId);
      scheduleEmptyEnd(meetingId);
    } else if (!peers.some((p) => sameId(p.adminId, room.hostId))) {
      // The host left: a manager in the meeting takes over, else whoever joined first
      const next = peers.filter((p) => p.manager).sort((a, b) => a.joinedAt - b.joinedAt)[0] || peers.sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostId = next.adminId;
      await TeamMeeting.updateOne({ _id: meetingId }, { hostId: oid(next.adminId) }).catch(() => {});
      io.to(roomName(meetingId)).emit('meet:host', { hostId: next.adminId });
    }
    const fresh = await TeamMeeting.findById(meetingId).lean().catch(() => null);
    if (fresh) emitMeetingUpdate(fresh);
  }

  socket.on('meet:join', async ({ meetingId, mic = true, cam = true } = {}, ack) => {
    try {
      const meeting = await meetingFor(admin, meetingId);
      const id = String(meeting._id);
      if (meeting.status === 'ended' || meeting.status === 'cancelled') return fail(ack, 'This meeting has ended.', 'ENDED');
      const room = rooms.get(id) || { peers: new Map(), hostId: String(meeting.hostId), recording: null, removed: new Set() };
      if (room.removed.has(me) && !isManager(admin)) return fail(ack, 'The host removed you from this meeting.', 'REMOVED');
      if (room.peers.size >= MEET_MAX_PEOPLE && !room.peers.has(socket.id)) return fail(ack, `This meeting is full. Up to ${MEET_MAX_PEOPLE} people can join.`, 'FULL');
      if (current && current !== id) await leave();
      rooms.set(id, room);
      const peer = { socketId: socket.id, adminId: me, name: admin.name, manager: isManager(admin), mic: !!mic, cam: !!cam, screen: false, hand: false, joinedAt: Date.now() };
      room.peers.set(socket.id, peer);
      current = id;
      socket.join(roomName(id));
      cancelEmptyEnd(id);
      if (meeting.status === 'scheduled') await startMeeting(id, me);
      await TeamMeeting.updateOne({ _id: id }, { $addToSet: { participantIds: oid(me) } });
      const fresh = await TeamMeeting.findById(id).lean();
      ok(ack, {
        selfId: socket.id,
        peers: [...room.peers.values()].filter((p) => p.socketId !== socket.id),
        hostId: room.hostId,
        recording: room.recording ? { by: room.recording.by } : null,
        meeting: publicMeeting(fresh)
      });
      socket.to(roomName(id)).emit('meet:peer-joined', peer);
      emitMeetingUpdate(fresh);
    } catch (err) {
      fail(ack, err?.status === 404 ? 'Meeting not found.' : 'Could not join the meeting.');
    }
  });

  socket.on('meet:leave', (_, ack) => { leave().then(() => ok(ack), () => ok(ack)); });
  socket.on('disconnect', () => { leave().catch(() => {}); });

  // WebRTC setup, relayed to one other peer in the same meeting
  socket.on('meet:signal', ({ to, data } = {}) => {
    const at = mine();
    if (!at || !at.room.peers.has(to) || !data) return;
    if (JSON.stringify(data).length > MAX_SIGNAL_CHARS) return;
    io.to(to).emit('meet:signal', { from: socket.id, data });
  });

  socket.on('meet:state', (state = {}) => {
    const at = mine();
    if (!at) return;
    for (const key of ['mic', 'cam', 'screen', 'hand']) if (typeof state[key] === 'boolean') at.peer[key] = state[key];
    const { mic, cam, screen, hand } = at.peer;
    socket.to(roomName(at.meetingId)).emit('meet:state', { socketId: socket.id, mic, cam, screen, hand });
  });

  socket.on('meet:reaction', ({ emoji } = {}) => {
    const at = mine();
    if (!at || !REACTIONS.includes(emoji) || Date.now() - lastReaction < 300) return;
    lastReaction = Date.now();
    io.to(roomName(at.meetingId)).emit('meet:reaction', { socketId: socket.id, adminId: me, emoji });
  });

  socket.on('meet:chat', async ({ body } = {}, ack) => {
    const at = mine();
    const text = String(body || '').trim();
    if (!at) return fail(ack, 'You are not in this meeting.');
    if (!text) return fail(ack, 'Write a message.');
    if (text.length > MAX_CHAT) return fail(ack, `Messages can be up to ${MAX_CHAT} characters.`);
    const msg = await TeamMeetingMessage.create({ meetingId: at.meetingId, authorId: me, body: text });
    io.to(roomName(at.meetingId)).emit('meet:chat', { id: String(msg._id), authorId: me, body: text, createdAt: msg.createdAt });
    ok(ack);
  });

  // Live captions from the speaker's own browser; final lines are kept for Leo's notes
  socket.on('meet:caption', async ({ text, final } = {}) => {
    const at = mine();
    const line = String(text || '').trim().slice(0, MAX_CAPTION);
    if (!at || !line || !at.peer.mic) return;
    socket.to(roomName(at.meetingId)).emit('meet:caption', { socketId: socket.id, adminId: me, text: line, final: !!final });
    if (final) await TeamMeetingCaption.create({ meetingId: at.meetingId, adminId: me, text: line }).catch(() => {});
  });

  // Host controls. Managers can always use them.
  socket.on('meet:host', async ({ action, target, on } = {}, ack) => {
    const at = mine();
    if (!at) return fail(ack, 'You are not in this meeting.');
    const { room, meetingId } = at;
    if (!canHost(room)) return fail(ack, 'Only the host can do this.');
    const victim = target ? room.peers.get(target) : null;
    if (action === 'end') {
      await endMeeting(meetingId, me);
      return ok(ack);
    }
    if (action === 'record') {
      room.recording = on ? { by: me, socketId: socket.id } : null;
      io.to(roomName(meetingId)).emit('meet:recording', { on: !!on, by: me });
      return ok(ack);
    }
    if (!victim) return fail(ack, 'That person is no longer in the meeting.');
    if (action === 'mute') {
      io.to(target).emit('meet:muted', { by: me });
    } else if (action === 'lower-hand') {
      victim.hand = false;
      io.to(roomName(meetingId)).emit('meet:state', { socketId: target, mic: victim.mic, cam: victim.cam, screen: victim.screen, hand: false });
    } else if (action === 'remove') {
      if (sameId(victim.adminId, me)) return fail(ack, 'Use Leave to leave the meeting.');
      room.removed.add(victim.adminId);
      io.to(target).emit('meet:removed', { by: me });
      room.peers.delete(target);
      io.in(target).socketsLeave(roomName(meetingId));
      io.to(roomName(meetingId)).emit('meet:peer-left', { socketId: target });
    } else {
      return fail(ack, 'Unknown action.');
    }
    ok(ack);
  });
}

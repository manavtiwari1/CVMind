import express from 'express';
import { AdminUser } from '../../models.js';
import { audit } from '../../audit.js';
import { clean, handle, httpError, isId } from '../../util.js';
import { channelFor, isManager, meetingFor, oid, requireTeam, sameId, visibleMeetingFilter } from '../access.js';
import { attachFiles } from '../files.js';
import { TeamMeeting, TeamMeetingMessage } from '../models.js';
import { dmMemberIds, emailInvites, emitMeetingUpdate, endMeeting, meetingTime, notesSettled, postMeetingMessage, publicMeeting, scheduleEmptyEnd, writeNotes } from '../meetings.js';
import { notify, teamPeopleFilter } from '../notify.js';

const router = express.Router();
const team = requireTeam();
const manage = requireTeam({ manage: true });

const MAX_TITLE = 120;
const MAX_INVITEES = 50;
// Someone who starts a meeting and never joins: it ends after this long
const UNJOINED_END_MS = 5 * 60 * 1000;

const canHost = (admin, meeting) => sameId(meeting.hostId, admin.id) || isManager(admin);

async function teamPeople(ids) {
  const list = [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(isId);
  if (list.length > MAX_INVITEES) throw httpError(400, `Invite up to ${MAX_INVITEES} people.`);
  if (!list.length) return [];
  const found = await AdminUser.find({ _id: { $in: list }, ...teamPeopleFilter }, { _id: 1 }).lean();
  if (found.length !== list.length) throw httpError(400, 'One of the invitees is not on CVMind Team.');
  return list;
}

function parseSchedule(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.scheduledAt !== undefined) {
    const at = new Date(body.scheduledAt);
    if (isNaN(at)) throw httpError(400, 'Pick a date and time.');
    if (at < new Date(Date.now() - 5 * 60 * 1000)) throw httpError(400, 'Pick a time in the future.');
    out.scheduledAt = at;
  }
  if (!partial || body.durationMin !== undefined) {
    const d = Number(body.durationMin ?? 30);
    if (!Number.isFinite(d) || d < 15 || d > 240) throw httpError(400, 'A meeting can be 15 minutes to 4 hours long.');
    out.durationMin = Math.round(d);
  }
  return out;
}

// ── List ─────────────────────────────────────────────────────────────────────
router.get('/meetings', team, handle(async (req, res) => {
  const filter = await visibleMeetingFilter(req.admin);
  const scope = ['live', 'upcoming', 'past'].includes(req.query.scope) ? req.query.scope : 'upcoming';
  if (isId(req.query.channelId)) {
    await channelFor(req.admin, req.query.channelId);
    filter.channelId = oid(req.query.channelId);
  }
  let sort = { scheduledAt: 1 };
  if (scope === 'live') filter.status = 'live';
  if (scope === 'upcoming') filter.status = 'scheduled';
  if (scope === 'past') { filter.status = 'ended'; sort = { endedAt: -1 }; }
  // The calendar asks for one month of scheduled meetings
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  if ((from && !isNaN(from)) || (to && !isNaN(to))) {
    filter.scheduledAt = { ...(from && !isNaN(from) ? { $gte: from } : {}), ...(to && !isNaN(to) ? { $lt: to } : {}) };
    delete filter.status;
    filter.status = { $ne: 'cancelled' };
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  const rows = await TeamMeeting.find(filter).sort(sort).limit(limit).lean();
  res.json({ success: true, data: rows.map(publicMeeting) });
}));

// ── Start now, or schedule (managers) ────────────────────────────────────────
router.post('/meetings', team, handle(async (req, res) => {
  const body = req.body || {};
  const title = clean(body.title, MAX_TITLE);
  const scheduled = !!body.scheduledAt;
  let channel = null;
  if (body.channelId) {
    ({ channel } = await channelFor(req.admin, body.channelId, { write: true }));
  }

  if (scheduled) {
    if (!isManager(req.admin)) throw httpError(403, 'Only managers can schedule meetings.');
    const { scheduledAt, durationMin } = parseSchedule(body);
    const inviteeIds = (await teamPeople(body.inviteeIds)).filter((id) => !sameId(id, req.admin.id));
    if (!inviteeIds.length && !channel) throw httpError(400, 'Invite at least one person, or pick a channel.');
    const meeting = await TeamMeeting.create({
      title: title || 'Team meeting', channelId: channel?._id || null, createdBy: req.admin.id, hostId: req.admin.id,
      scheduledAt, durationMin, inviteeIds, status: 'scheduled'
    });
    await postMeetingMessage(meeting, req.admin.id, `Meeting scheduled: ${meeting.title}, ${meetingTime(scheduledAt)} IST`);
    await notify(inviteeIds, { type: 'meeting_scheduled', actorId: req.admin.id, refType: 'meeting', refId: meeting._id, channelId: meeting.channelId, preview: `${meeting.title} · ${meetingTime(scheduledAt)}` });
    await emailInvites(meeting, inviteeIds);
    await audit(req, 'teamchat.meeting_scheduled', { targetType: 'team_meeting', targetId: meeting._id, targetLabel: meeting.title, details: { scheduledAt, invitees: inviteeIds.length } });
    emitMeetingUpdate(meeting);
    return res.json({ success: true, data: publicMeeting(meeting.toObject()) });
  }

  // On the spot, in a channel or DM you belong to (anyone can)
  if (!channel) throw httpError(400, 'Start a meeting from a channel or a direct message.');
  const { member } = await channelFor(req.admin, channel._id);
  if (!member && channel.kind !== 'public') throw httpError(403, 'Join the channel to start a meeting in it.');
  // One live meeting per channel: starting again joins the one already running
  const running = await TeamMeeting.findOne({ channelId: channel._id, status: 'live' }).lean();
  if (running) return res.json({ success: true, data: publicMeeting(running), existing: true });
  const meeting = await TeamMeeting.create({
    title: title || (channel.kind === 'dm' ? 'Call' : `#${channel.name} meeting`),
    channelId: channel._id, createdBy: req.admin.id, hostId: req.admin.id, status: 'live', startedAt: new Date()
  });
  await postMeetingMessage(meeting, req.admin.id, 'Meeting started');
  if (channel.kind === 'dm') await notify(await dmMemberIds(channel._id), { type: 'meeting_started', actorId: req.admin.id, refType: 'meeting', refId: meeting._id, channelId: channel._id, preview: 'Tap to join the call' });
  scheduleEmptyEnd(meeting._id, UNJOINED_END_MS);
  emitMeetingUpdate(meeting);
  res.json({ success: true, data: publicMeeting(meeting.toObject()) });
}));

// ── One meeting ──────────────────────────────────────────────────────────────
router.get('/meetings/:id', team, handle(async (req, res) => {
  const meeting = await meetingFor(req.admin, req.params.id);
  res.json({ success: true, data: publicMeeting(meeting.toObject()), canHost: canHost(req.admin, meeting), canEdit: isManager(req.admin) && meeting.status === 'scheduled' });
}));

// Change a scheduled meeting (managers)
router.patch('/meetings/:id', manage, handle(async (req, res) => {
  const meeting = await meetingFor(req.admin, req.params.id);
  if (meeting.status !== 'scheduled') throw httpError(400, 'Only a meeting that hasn\'t started can be changed.');
  const body = req.body || {};
  if (body.title !== undefined) meeting.title = clean(body.title, MAX_TITLE) || 'Team meeting';
  const times = parseSchedule(body, { partial: true });
  const moved = times.scheduledAt && +times.scheduledAt !== +meeting.scheduledAt;
  Object.assign(meeting, times);
  if (moved) meeting.reminderSentAt = null;
  let added = [];
  if (body.inviteeIds !== undefined) {
    const next = (await teamPeople(body.inviteeIds)).filter((id) => !sameId(id, meeting.hostId));
    const before = meeting.inviteeIds.map(String);
    added = next.filter((id) => !before.includes(id));
    meeting.inviteeIds = next;
  }
  await meeting.save();
  const base = { actorId: req.admin.id, refType: 'meeting', refId: meeting._id, channelId: meeting.channelId, preview: `${meeting.title} · ${meetingTime(meeting.scheduledAt)}` };
  await notify(added, { ...base, type: 'meeting_scheduled' });
  const stayed = meeting.inviteeIds.map(String).filter((id) => !added.includes(id));
  if (moved) {
    await notify(stayed, { ...base, type: 'meeting_moved' });
    await emailInvites(meeting, stayed, { updated: true });
  }
  await emailInvites(meeting, added);
  emitMeetingUpdate(meeting);
  res.json({ success: true, data: publicMeeting(meeting.toObject()) });
}));

router.post('/meetings/:id/cancel', manage, handle(async (req, res) => {
  const meeting = await meetingFor(req.admin, req.params.id);
  if (meeting.status !== 'scheduled') throw httpError(400, 'Only a meeting that hasn\'t started can be cancelled.');
  meeting.status = 'cancelled';
  await meeting.save();
  await postMeetingMessage(meeting, req.admin.id, `Meeting cancelled: ${meeting.title}`);
  await notify(meeting.inviteeIds, { type: 'meeting_cancelled', actorId: req.admin.id, refType: 'meeting', refId: meeting._id, channelId: meeting.channelId, preview: `${meeting.title} · ${meetingTime(meeting.scheduledAt)}` });
  await audit(req, 'teamchat.meeting_cancelled', { targetType: 'team_meeting', targetId: meeting._id, targetLabel: meeting.title });
  emitMeetingUpdate(meeting);
  res.json({ success: true, data: publicMeeting(meeting.toObject()) });
}));

// End for everyone (the host or a manager)
router.post('/meetings/:id/end', team, handle(async (req, res) => {
  const meeting = await meetingFor(req.admin, req.params.id);
  if (!canHost(req.admin, meeting)) throw httpError(403, 'Only the host can end the meeting for everyone.');
  if (meeting.status !== 'live') throw httpError(400, 'This meeting is not running.');
  const ended = await endMeeting(meeting._id, req.admin.id);
  res.json({ success: true, data: publicMeeting((ended || meeting).toObject()) });
}));

// ── Connection servers ───────────────────────────────────────────────────────
// STUN finds a direct path between browsers; when strict networks block it, Cloudflare's TURN
// relays the media. TURN credentials are short-lived and made per request.
const STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
let turnFetch = (...args) => fetch(...args);
export const setTurnFetch = (fn) => { turnFetch = fn || ((...args) => fetch(...args)); };

export async function iceServers() {
  const { CF_TURN_KEY_ID, CF_TURN_API_TOKEN } = process.env;
  if (!CF_TURN_KEY_ID || !CF_TURN_API_TOKEN) return { iceServers: STUN, turn: false };
  try {
    const res = await turnFetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${CF_TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CF_TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 6 * 60 * 60 })
    });
    if (!res.ok) throw new Error(`TURN ${res.status}`);
    const json = await res.json();
    const servers = Array.isArray(json.iceServers) ? json.iceServers : json.iceServers ? [json.iceServers] : [];
    return { iceServers: [...STUN, ...servers], turn: servers.length > 0 };
  } catch (err) {
    console.error('[team] TURN credentials failed:', err.message);
    return { iceServers: STUN, turn: false };
  }
}

router.get('/meetings/:id/ice', team, handle(async (req, res) => {
  const meeting = await meetingFor(req.admin, req.params.id);
  if (meeting.status === 'ended' || meeting.status === 'cancelled') throw httpError(400, 'This meeting has ended.');
  res.json({ success: true, ...(await iceServers()) });
}));

// ── Chat, recording and notes ────────────────────────────────────────────────
router.get('/meetings/:id/chat', team, handle(async (req, res) => {
  const meeting = await meetingFor(req.admin, req.params.id);
  const rows = await TeamMeetingMessage.find({ meetingId: meeting._id }).sort({ createdAt: 1 }).limit(1000).lean();
  res.json({ success: true, data: rows.map((m) => ({ id: String(m._id), authorId: String(m.authorId), body: m.body, createdAt: m.createdAt })) });
}));

// The host's browser records the call and uploads it; this links the upload to the meeting
router.post('/meetings/:id/recording', team, handle(async (req, res) => {
  const meeting = await meetingFor(req.admin, req.params.id);
  if (!canHost(req.admin, meeting) && !meeting.participantIds.some((p) => sameId(p, req.admin.id))) throw httpError(403, 'Only the host can save a recording.');
  const [fileId] = await attachFiles(req.admin, [req.body?.fileId], { scope: 'meeting', scopeId: meeting._id, type: 'recording', id: meeting._id }, { max: 1 });
  if (!fileId) throw httpError(400, 'Upload the recording first.');
  meeting.recordingFileIds.push(fileId);
  await meeting.save();
  await postMeetingMessage(meeting, req.admin.id, 'Recording saved. Find it in Media or on the meeting page.');
  await notify(meeting.participantIds, { type: 'meeting_recording', actorId: req.admin.id, refType: 'meeting', refId: meeting._id, channelId: meeting.channelId, preview: meeting.title });
  emitMeetingUpdate(meeting);
  res.json({ success: true, data: publicMeeting(meeting.toObject()) });
}));

// Write (or rewrite) Leo's notes for an ended meeting
router.post('/meetings/:id/notes', team, handle(async (req, res) => {
  const meeting = await meetingFor(req.admin, req.params.id);
  if (!canHost(req.admin, meeting)) throw httpError(403, 'Only the host can ask Leo for notes.');
  if (meeting.status !== 'ended') throw httpError(400, 'Notes are written after the meeting ends.');
  await notesSettled();
  const done = await writeNotes(meeting._id);
  if (!done) throw httpError(400, 'Nothing was said or written in this meeting, so there is nothing to summarise.');
  res.json({ success: true, data: publicMeeting(done.toObject()) });
}));

export default router;

import { AdminUser } from '../models.js';
import { emailConfigured, escapeHtml, renderEmail, sendEmail } from '../mailer.js';
import { TeamChannelMember, TeamMeeting, TeamMeetingCaption, TeamMeetingMessage, TeamMessage } from './models.js';
import { notify, TEAM_APP_URL } from './notify.js';
import { emitToChannel, emitToMeeting, emitToUser } from './realtime.js';
import { closeMeetingRoom, livePeers } from './meetRealtime.js';

// Meetings run browser to browser (a WebRTC mesh), so each person sends their video to everyone
// else. Six people is the most that still works on ordinary upload speeds.
export const MEET_MAX_PEOPLE = 6;
// An empty meeting ends on its own after this long
const EMPTY_END_MS = 2 * 60 * 1000;
const REMINDER_LEAD_MS = 10 * 60 * 1000;
const MAX_TRANSCRIPT_CHARS = 60000;

const str = (v) => (v ? String(v) : null);

export function publicMeeting(m) {
  const peers = livePeers(String(m._id));
  return {
    id: String(m._id),
    title: m.title,
    channelId: str(m.channelId),
    createdBy: String(m.createdBy),
    hostId: String(m.hostId),
    scheduledAt: m.scheduledAt || null,
    durationMin: m.durationMin,
    inviteeIds: (m.inviteeIds || []).map(String),
    status: m.status,
    startedAt: m.startedAt || null,
    endedAt: m.endedAt || null,
    participantIds: (m.participantIds || []).map(String),
    liveIds: [...new Set(peers.map((p) => p.adminId))],
    recordingFileIds: (m.recordingFileIds || []).map(String),
    notes: m.notes?.status && m.notes.status !== 'none'
      ? { status: m.notes.status, summary: m.notes.summary, decisions: m.notes.decisions || [], actionItems: m.notes.actionItems || [], openQuestions: m.notes.openQuestions || [], error: m.notes.error || '', at: m.notes.at }
      : null,
    createdAt: m.createdAt
  };
}

// Everyone who should see a change to the meeting live: its channel, its invitees and host
export function emitMeetingUpdate(m) {
  const payload = { meetingId: String(m._id), channelId: str(m.channelId), status: m.status };
  if (m.channelId) emitToChannel(String(m.channelId), 'meeting.updated', payload);
  for (const id of new Set([String(m.hostId), String(m.createdBy), ...(m.inviteeIds || []).map(String)])) emitToUser(id, 'meeting.updated', payload);
}

// Meeting updates in the channel: the first is a message of its own, the rest reply in its thread
export async function postMeetingMessage(meeting, actorId, body) {
  if (!meeting.channelId) return null;
  const parentId = meeting.threadMessageId || null;
  const msg = await TeamMessage.create({ channelId: meeting.channelId, authorId: actorId, kind: 'system', meetingId: meeting._id, parentId, body });
  if (parentId) {
    await TeamMessage.updateOne({ _id: parentId }, { $inc: { replyCount: 1 }, lastReplyAt: msg.createdAt });
  } else {
    await TeamMeeting.updateOne({ _id: meeting._id }, { threadMessageId: msg._id });
    meeting.threadMessageId = msg._id;
  }
  emitToChannel(String(meeting.channelId), 'message.created', { channelId: String(meeting.channelId), messageId: String(msg._id), parentId: parentId ? String(parentId) : null, authorId: String(actorId) });
  return msg;
}

// The first person in a scheduled meeting starts it; an instant meeting starts when created
export async function startMeeting(meetingId, actorId) {
  const meeting = await TeamMeeting.findOneAndUpdate(
    { _id: meetingId, status: 'scheduled' },
    { status: 'live', startedAt: new Date() },
    { new: true }
  );
  if (!meeting) return null;
  await postMeetingMessage(meeting, actorId, `Meeting started${meeting.title ? `: ${meeting.title}` : ''}`);
  emitMeetingUpdate(meeting);
  return meeting;
}

const minutes = (a, b) => Math.max(1, Math.round((+b - +a) / 60000));

// Ends a live meeting for everyone, once; then Leo writes the notes from the captions and chat
export async function endMeeting(meetingId, actorId = null) {
  cancelEmptyEnd(meetingId);
  const meeting = await TeamMeeting.findOneAndUpdate(
    { _id: meetingId, status: 'live' },
    { status: 'ended', endedAt: new Date() },
    { new: true }
  );
  if (!meeting) return null;
  emitToMeeting(String(meeting._id), 'meet:ended', { meetingId: String(meeting._id) });
  closeMeetingRoom(meeting._id);
  const took = meeting.startedAt ? ` after ${minutes(meeting.startedAt, meeting.endedAt)} min` : '';
  await postMeetingMessage(meeting, actorId || meeting.hostId, `Meeting ended${took}`);
  emitMeetingUpdate(meeting);
  // In the background, so ending never waits for the AI
  lastNotes = writeNotes(meeting._id).catch((err) => console.error('[team] meeting notes failed:', err.message));
  return meeting;
}

let lastNotes = Promise.resolve();
export const notesSettled = () => lastNotes;

// ── Ending empty meetings ────────────────────────────────────────────────────
const emptyTimers = new Map();
export function scheduleEmptyEnd(meetingId, ms = EMPTY_END_MS) {
  cancelEmptyEnd(meetingId);
  const timer = setTimeout(() => {
    emptyTimers.delete(String(meetingId));
    if (!livePeers(String(meetingId)).length) endMeeting(meetingId).catch(() => {});
  }, ms);
  timer.unref?.();
  emptyTimers.set(String(meetingId), timer);
}
export function cancelEmptyEnd(meetingId) {
  const t = emptyTimers.get(String(meetingId));
  if (t) clearTimeout(t);
  emptyTimers.delete(String(meetingId));
}

// ── Leo notes ────────────────────────────────────────────────────────────────
async function transcriptOf(meetingId) {
  const [captions, chat] = await Promise.all([
    TeamMeetingCaption.find({ meetingId }).sort({ at: 1 }).limit(5000).lean(),
    TeamMeetingMessage.find({ meetingId }).sort({ createdAt: 1 }).limit(1000).lean()
  ]);
  const ids = [...new Set([...captions.map((c) => String(c.adminId)), ...chat.map((c) => String(c.authorId))])];
  const people = new Map((await AdminUser.find({ _id: { $in: ids } }, { name: 1, username: 1 }).lean()).map((a) => [String(a._id), a]));
  const who = (id) => { const p = people.get(String(id)); return p ? `${p.name || p.username} (@${p.username})` : 'Someone'; };
  const time = (d) => new Date(d).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  const lines = [
    ...captions.map((c) => ({ at: c.at, line: `[${time(c.at)}] ${who(c.adminId)} said: ${c.text}` })),
    ...chat.map((m) => ({ at: m.createdAt, line: `[${time(m.createdAt)}] ${who(m.authorId)} wrote in chat: ${m.body}` }))
  ].sort((a, b) => +a.at - +b.at).map((l) => l.line).join('\n');
  // Long meetings keep the most recent part
  return { text: lines.length > MAX_TRANSCRIPT_CHARS ? lines.slice(-MAX_TRANSCRIPT_CHARS) : lines, captions: captions.length };
}

export async function writeNotes(meetingId) {
  const meeting = await TeamMeeting.findById(meetingId);
  if (!meeting) return null;
  const { text, captions } = await transcriptOf(meeting._id);
  if (!text.trim() || text.split('\n').length < 2) {
    meeting.notes = { status: 'none' };
    await meeting.save();
    return null;
  }
  const { askLeo, cleanSummary, useLeo } = await import('./routes/leo.js');
  meeting.notes = { status: 'pending' };
  await meeting.save();
  try {
    await useLeo(String(meeting.hostId));
    const out = await askLeo({
      maxTokens: 2000,
      systemInstruction: `You are Leo, the assistant inside CVMind Team. Write meeting notes from an automatic transcript${captions ? '' : ' (chat only; nobody was transcribed)'}. The transcript comes from speech recognition and may have mistakes or Hindi words in Latin script; write the notes in clear English. Only include what was said. Name people by their @username in action items.`,
      prompt: `Meeting: ${meeting.title || 'Team meeting'}\n\nTranscript, oldest first:\n${text}`,
      responseSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: '3-6 sentences' },
          decisions: { type: 'array', items: { type: 'string' } },
          actionItems: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, owner: { type: 'string' } } } },
          openQuestions: { type: 'array', items: { type: 'string' } }
        },
        required: ['summary', 'decisions', 'actionItems', 'openQuestions']
      }
    });
    meeting.notes = { status: 'ready', ...cleanSummary(out), at: new Date() };
  } catch (err) {
    meeting.notes = { status: 'failed', error: err.message || 'Leo could not write the notes.', at: new Date() };
  }
  await meeting.save();
  if (meeting.notes.status === 'ready') {
    await postMeetingMessage(meeting, meeting.hostId, `Leo's meeting notes: ${meeting.notes.summary}`);
    await notify(meeting.participantIds, { type: 'meeting_notes', refType: 'meeting', refId: meeting._id, channelId: meeting.channelId, preview: meeting.title || meeting.notes.summary });
  }
  emitMeetingUpdate(meeting);
  return meeting;
}

// ── Scheduling: invites and reminders ────────────────────────────────────────
export const meetingTime = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export async function emailInvites(meeting, inviteeIds, { updated = false } = {}) {
  if (!emailConfigured() || !inviteeIds.length) return;
  const [people, host] = await Promise.all([
    AdminUser.find({ _id: { $in: inviteeIds }, active: true, chatAccess: { $ne: false }, email: { $gt: '' } }).lean(),
    AdminUser.findById(meeting.hostId, { name: 1, username: 1 }).lean()
  ]);
  const when = `${meetingTime(meeting.scheduledAt)} IST · ${meeting.durationMin} min`;
  for (const p of people) {
    try {
      await sendEmail({
        to: p.email,
        subject: `${updated ? 'Updated: ' : ''}${meeting.title || 'Team meeting'} · ${meetingTime(meeting.scheduledAt)}`,
        html: renderEmail({
          preheader: `${host?.name || 'Your manager'} invited you to a meeting on CVMind Team.`,
          eyebrow: 'Meeting invite',
          title: meeting.title || 'Team meeting',
          greetingName: p.name || p.username,
          body: `${escapeHtml(host?.name || host?.username || 'Your manager')} ${updated ? 'changed' : 'scheduled'} a meeting on CVMind Team.`,
          htmlBlock: `<p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111827">${escapeHtml(when)}</p>`,
          ctaLabel: 'Open the meeting',
          ctaUrl: `${TEAM_APP_URL}/#/meet/${meeting._id}`,
          footerReason: 'You get this because you were invited to a meeting on CVMind Team.'
        })
      });
    } catch (err) {
      console.error('[team] meeting invite email failed:', err.message);
    }
  }
}

// In-app and push reminder 10 minutes before a scheduled meeting (checked every minute)
export async function sendMeetingReminders(now = new Date()) {
  const due = await TeamMeeting.find({ status: 'scheduled', reminderSentAt: null, scheduledAt: { $gt: new Date(+now - 5 * 60 * 1000), $lte: new Date(+now + REMINDER_LEAD_MS) } }).lean();
  for (const m of due) {
    const claimed = await TeamMeeting.updateOne({ _id: m._id, reminderSentAt: null }, { reminderSentAt: now });
    if (!claimed.modifiedCount) continue;
    const people = [...new Set([String(m.hostId), ...m.inviteeIds.map(String)])];
    await notify(people, { type: 'meeting_soon', refType: 'meeting', refId: m._id, channelId: m.channelId, preview: `${m.title || 'Team meeting'} at ${new Date(m.scheduledAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })}` });
  }
  return { reminded: due.length };
}

// People told when someone starts a meeting on the spot: the others in a DM (a channel only gets the live banner)
export async function dmMemberIds(channelId) {
  return (await TeamChannelMember.find({ channelId }, { adminId: 1 }).lean()).map((m) => String(m.adminId));
}

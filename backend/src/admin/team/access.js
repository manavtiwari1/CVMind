import mongoose from 'mongoose';
import { adminFromToken, dbReady } from '../auth.js';
import { httpError, isId } from '../util.js';
import { TeamChannel, TeamChannelMember, TeamMeeting, TeamTask } from './models.js';

export const MANAGE = 'teamchat.manage';
export const isManager = (admin) => !!admin?.permissions?.includes(MANAGE);

export const oid = (id) => new mongoose.Types.ObjectId(String(id));
export const sameId = (a, b) => String(a) === String(b);

// Guard for every team-app route. Accepts team tokens; with { manage: true } also needs teamchat.manage.
// Until the invited person sets their own password, only the profile and password routes work.
// Manager routes (and adminPanel: true) also accept an admin panel token, so the panel's Team
// workspace section can use them; panel sessions skip the team-only checks.
export function requireTeam({ manage = false, allowPasswordChange = false, adminPanel = false } = {}) {
  return async (req, res, next) => {
    try {
      if (!(await dbReady())) return res.status(503).json({ success: false, error: 'CVMind Team needs the database. Try again in a minute.' });
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      let admin = await adminFromToken(token, 'team');
      const fromPanel = !admin && (manage || adminPanel);
      if (fromPanel) admin = await adminFromToken(token, 'admin');
      if (!admin || admin.id === 'env-owner') return res.status(401).json({ success: false, code: 'TEAM_AUTH', error: 'Your session has ended. Please sign in again.' });
      if (!fromPanel && !admin.chatAccess) return res.status(403).json({ success: false, code: 'TEAM_NO_ACCESS', error: 'Your access to CVMind Team has been removed. Contact your manager.' });
      if (!fromPanel && admin.mustChangePassword && !allowPasswordChange) return res.status(403).json({ success: false, code: 'TEAM_SET_PASSWORD', error: 'Set your own password to continue.' });
      if (manage && !isManager(admin)) return res.status(403).json({ success: false, code: 'TEAM_FORBIDDEN', error: 'Only managers can do this.' });
      req.admin = admin;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Channels this person can read: public ones, and private channels and DMs they belong to.
// Managers can read every channel except DMs, which stay private to their members.
export async function readableChannelIds(admin) {
  const memberships = await TeamChannelMember.find({ adminId: admin.id }, { channelId: 1 }).lean();
  const mine = memberships.map((m) => m.channelId);
  const filter = isManager(admin)
    ? { $or: [{ kind: { $in: ['public', 'private'] } }, { _id: { $in: mine } }] }
    : { $or: [{ kind: 'public' }, { _id: { $in: mine } }] };
  const channels = await TeamChannel.find(filter, { _id: 1 }).lean();
  return channels.map((c) => c._id);
}

// The channel if this person can read it, else a 404 (never a 403, so ids can't be probed)
export async function channelFor(admin, channelId, { write = false } = {}) {
  if (!isId(channelId)) throw httpError(404, 'Channel not found.');
  const channel = await TeamChannel.findById(channelId).lean();
  if (!channel) throw httpError(404, 'Channel not found.');
  const member = await TeamChannelMember.findOne({ channelId: channel._id, adminId: admin.id }).lean();
  const canRead = channel.kind === 'public' || !!member || (channel.kind === 'private' && isManager(admin));
  if (!canRead) throw httpError(404, 'Channel not found.');
  if (write && channel.archivedAt) throw httpError(400, 'This channel is archived.');
  return { channel, member };
}

export const canSeeTask = (admin, task) =>
  isManager(admin) || sameId(task.createdBy, admin.id) || task.assigneeIds.some((a) => sameId(a, admin.id));

export async function taskFor(admin, taskId) {
  if (!isId(taskId)) throw httpError(404, 'Task not found.');
  const task = await TeamTask.findById(taskId);
  if (!task || !canSeeTask(admin, task)) throw httpError(404, 'Task not found.');
  return task;
}

// Tasks this person can see, as a Mongo filter
export const visibleTaskFilter = (admin) => (isManager(admin) ? {} : { $or: [{ assigneeIds: oid(admin.id) }, { createdBy: oid(admin.id) }] });

// ── Meetings ─────────────────────────────────────────────────────────────────
// A channel meeting is open to everyone who can read the channel (a DM's only to its members);
// a scheduled meeting also to its invitees; one without a channel to its invitees and managers.
export async function canJoinMeeting(admin, meeting) {
  if (!meeting) return false;
  if (sameId(meeting.hostId, admin.id) || sameId(meeting.createdBy, admin.id)) return true;
  if ((meeting.inviteeIds || []).some((i) => sameId(i, admin.id))) return true;
  if (meeting.channelId) return channelFor(admin, meeting.channelId).then(() => true, () => false);
  return isManager(admin);
}

// The meeting if this person can join it, else a 404 (never a 403, so ids can't be probed)
export async function meetingFor(admin, meetingId) {
  if (!isId(meetingId)) throw httpError(404, 'Meeting not found.');
  const meeting = await TeamMeeting.findById(meetingId);
  if (!meeting || !(await canJoinMeeting(admin, meeting))) throw httpError(404, 'Meeting not found.');
  return meeting;
}

// Meetings this person can see, as a Mongo filter
export async function visibleMeetingFilter(admin) {
  const me = oid(admin.id);
  const or = [{ channelId: { $in: await readableChannelIds(admin) } }, { inviteeIds: me }, { hostId: me }, { createdBy: me }];
  if (isManager(admin)) or.push({ channelId: null });
  return { $or: or };
}

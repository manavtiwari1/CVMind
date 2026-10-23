import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { AdminUser } from '../../models.js';
import { invalidateAdminCache } from '../../auth.js';
import { audit } from '../../audit.js';
import { emailConfigured, escapeHtml, renderEmail, sendEmail } from '../../mailer.js';
import { createAdminMember } from '../../members.js';
import { FULL_ACCESS_ROLES, ROLES, isFullAccess } from '../../permissions.js';
import { clean, escapeRegex, handle, httpError, isId, paging } from '../../util.js';
import { MANAGE, oid, requireTeam } from '../access.js';
import { publicFile } from '../files.js';
import { INVITE_STATUSES, TeamChannel, TeamChannelMember, TeamFile, TeamInvitation, TeamLeave, TeamMeeting, TeamMessage, TeamStandup, TeamTask } from '../models.js';
import { istDay, isWorkingDay, TEAM_APP_URL } from '../notify.js';
import { disconnectUser, emitToChannel } from '../realtime.js';

// Managing CVMind Team from the admin panel (and the team app's manager screens).
// Same team token as the app, so a manager can do this from either place.
const router = express.Router();
const manage = requireTeam({ manage: true });

const MAX_RESENDS = 5;
// Roles that can manage the workspace (owner, admin, CEO, CMO, CTO). Only someone who can manage
// the admin team (team.manage) may invite a person into one of these, so an admin can't create an owner.
const PRIVILEGED_ROLES = Object.keys(ROLES).filter((k) => ROLES[k].permissions.includes(MANAGE));

const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `team-invite:${req.admin?.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, error: 'You have sent a lot of invitations. Try again in an hour.' })
});

export const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(14), (b) => alphabet[b % alphabet.length]).join('');
};

function inviteEmail({ name, username, password, invitedBy, role }) {
  const rows = [['Website', TEAM_APP_URL.replace(/^https?:\/\//, '')], ['Username', username], ['Temporary password', password]]
    .map(([k, v]) => `<tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #eef0f3;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:8px 12px;font-size:15px;color:#111827;font-weight:700;border-bottom:1px solid #eef0f3;font-family:Menlo,Consolas,monospace">${escapeHtml(v)}</td></tr>`)
    .join('');
  return renderEmail({
    preheader: `${invitedBy} invited you to CVMind Team.`,
    eyebrow: 'You are invited',
    title: 'Join CVMind Team',
    greetingName: name || username,
    body: `${invitedBy} added you to CVMind Team as ${ROLES[role]?.label || role}. It is where the team gets announcements, tasks, and chats.\n\nSign in with these details:`,
    htmlBlock: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e8ebef;border-radius:10px;border-collapse:separate">${rows}</table>`,
    ctaLabel: 'Open CVMind Team',
    ctaUrl: TEAM_APP_URL,
    note: 'You will be asked to choose your own password the first time you sign in. Do not share this email.',
    footerReason: 'You get this because a CVMind manager invited you to the team workspace.'
  });
}

// Sends (or re-sends) the invitation and records the result on the invitation
async function deliver(invitation, password, invitedByName) {
  try {
    await sendEmail({
      to: invitation.email,
      subject: `${invitedByName} invited you to CVMind Team`,
      html: inviteEmail({ name: invitation.name, username: invitation.username, password, invitedBy: invitedByName, role: invitation.role })
    });
    invitation.status = 'sent';
    invitation.lastError = '';
  } catch (err) {
    invitation.status = 'failed';
    invitation.lastError = String(err.message || 'The email could not be sent.').slice(0, 300);
  }
  invitation.sentAt = new Date();
  await invitation.save();
  return invitation;
}

function publicInvitation(i) {
  return {
    id: String(i._id),
    adminId: String(i.adminId),
    name: i.name,
    email: i.email,
    username: i.username,
    role: i.role,
    roleLabel: ROLES[i.role]?.label || i.role,
    invitedBy: i.invitedBy ? String(i.invitedBy) : null,
    invitedByName: i.invitedByName,
    status: i.status,
    lastError: i.lastError,
    resendCount: i.resendCount,
    sentAt: i.sentAt,
    acceptedAt: i.acceptedAt,
    revokedAt: i.revokedAt,
    createdAt: i.createdAt
  };
}

// Owner and Admin stay for existing accounts (the env owner is always 'owner'), but new people are
// invited with a leadership, staff or team role instead
const NOT_INVITABLE = ['owner', 'admin'];

const canInviteRole = (admin, role) => !PRIVILEGED_ROLES.includes(role) || admin.permissions.includes('team.manage');

// ── Invitations ──────────────────────────────────────────────────────────────
router.get('/invitations', manage, handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query, { defaultLimit: 50 });
  const filter = {};
  if (INVITE_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { username: rx }];
  }
  const [rows, total, counts] = await Promise.all([
    TeamInvitation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    TeamInvitation.countDocuments(filter),
    TeamInvitation.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }])
  ]);
  res.json({
    success: true,
    data: rows.map(publicInvitation),
    total,
    page,
    limit,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    emailConfigured: emailConfigured(),
    roles: Object.fromEntries(Object.entries(ROLES)
      .filter(([k]) => !NOT_INVITABLE.includes(k) && canInviteRole(req.admin, k))
      .map(([k, r]) => [k, { label: r.label, description: r.description, manager: r.permissions.includes(MANAGE), teamOnly: !!r.teamOnly, leadership: !!r.leadership }]))
  });
}));

router.post('/invitations', manage, inviteLimiter, handle(async (req, res) => {
  const role = clean(req.body?.role, 20) || 'support';
  if (NOT_INVITABLE.includes(role)) throw httpError(400, 'Pick a leadership, staff or team role.');
  if (!canInviteRole(req.admin, role)) throw httpError(403, 'Only someone with full access can invite a manager or a leadership role.');
  const password = String(req.body?.password || '');
  const member = await createAdminMember({ ...req.body, role, password }, { requireEmail: true, extra: { chatAccess: true, mustChangePassword: true } });
  const invitation = new TeamInvitation({
    adminId: member._id, email: member.email, name: member.name, username: member.username, role,
    invitedBy: req.admin.id, invitedByName: req.admin.name || req.admin.username
  });
  await deliver(invitation, password, invitation.invitedByName);
  await audit(req, 'teamchat.invite_sent', { targetType: 'admin', targetId: member._id, targetLabel: member.username, details: { email: member.email, role, emailed: invitation.status === 'sent' } });
  res.json({ success: true, data: publicInvitation(invitation) });
}));

async function openInvitation(req) {
  if (!isId(req.params.id)) throw httpError(404, 'Invitation not found.');
  const invitation = await TeamInvitation.findById(req.params.id);
  if (!invitation) throw httpError(404, 'Invitation not found.');
  if (!canInviteRole(req.admin, invitation.role)) throw httpError(403, 'Only someone with full access can change invitations for managers and leadership.');
  return invitation;
}

// New temporary password, old sessions signed out, email sent again
router.post('/invitations/:id/resend', manage, inviteLimiter, handle(async (req, res) => {
  const invitation = await openInvitation(req);
  if (invitation.status === 'accepted') throw httpError(400, 'They have already joined. Reset their password from Team & roles instead.');
  if (invitation.status === 'revoked') throw httpError(400, 'This invitation was revoked. Send a new one.');
  if (invitation.resendCount >= MAX_RESENDS) throw httpError(400, `This invitation was already re-sent ${MAX_RESENDS} times.`);
  const member = await AdminUser.findById(invitation.adminId);
  if (!member) throw httpError(404, 'That account no longer exists.');
  const password = generatePassword();
  member.passwordHash = await bcrypt.hash(password, 10);
  member.mustChangePassword = true;
  member.tokenVersion = (member.tokenVersion || 0) + 1;
  await member.save();
  invalidateAdminCache(String(member._id));
  disconnectUser(String(member._id));
  invitation.resendCount += 1;
  await deliver(invitation, password, req.admin.name || req.admin.username);
  await audit(req, 'teamchat.invite_resent', { targetType: 'admin', targetId: member._id, targetLabel: member.username, details: { emailed: invitation.status === 'sent' } });
  res.json({ success: true, data: publicInvitation(invitation) });
}));

// Revoking an invitation that wasn't accepted turns the account off
router.delete('/invitations/:id', manage, handle(async (req, res) => {
  const invitation = await openInvitation(req);
  if (invitation.status === 'accepted') throw httpError(400, 'They have already joined. Turn off their access instead.');
  if (invitation.status === 'revoked') return res.json({ success: true, data: publicInvitation(invitation) });
  const member = await AdminUser.findById(invitation.adminId);
  if (member) {
    if (isFullAccess(member.role) && (await AdminUser.countDocuments({ role: { $in: FULL_ACCESS_ROLES }, active: true, _id: { $ne: member._id } })) === 0) {
      throw httpError(400, 'There must always be at least one active owner.');
    }
    member.active = false;
    member.tokenVersion = (member.tokenVersion || 0) + 1;
    await member.save();
    invalidateAdminCache(String(member._id));
    disconnectUser(String(member._id));
  }
  invitation.status = 'revoked';
  invitation.revokedAt = new Date();
  await invitation.save();
  await audit(req, 'teamchat.invite_revoked', { targetType: 'admin', targetId: invitation.adminId, targetLabel: invitation.username });
  res.json({ success: true, data: publicInvitation(invitation) });
}));

// ── Access ───────────────────────────────────────────────────────────────────
router.get('/access', manage, handle(async (req, res) => {
  const people = await AdminUser.find({}, { passwordHash: 0 }).sort({ createdAt: 1 }).lean();
  res.json({
    success: true,
    data: people.map((a) => ({
      id: String(a._id), name: a.name || a.username, username: a.username, email: a.email, role: a.role, roleLabel: ROLES[a.role]?.label || a.role,
      active: a.active !== false, chatAccess: a.chatAccess !== false, mustChangePassword: !!a.mustChangePassword, lastSeenAt: a.lastSeenAt || null, lastLoginAt: a.lastLoginAt || null
    }))
  });
}));

// Turning team access off closes their team-app sessions right away; the admin panel is unaffected
router.patch('/access/:adminId', manage, handle(async (req, res) => {
  if (!isId(req.params.adminId)) throw httpError(404, 'Person not found.');
  if (req.params.adminId === req.admin.id) throw httpError(400, "You can't change your own access.");
  if (typeof req.body?.chatAccess !== 'boolean') throw httpError(400, 'Say whether they should have access.');
  const member = await AdminUser.findById(req.params.adminId);
  if (!member) throw httpError(404, 'Person not found.');
  if (PRIVILEGED_ROLES.includes(member.role) && !req.admin.permissions.includes('team.manage')) throw httpError(403, 'Only someone with full access can change access for managers and leadership.');
  member.chatAccess = req.body.chatAccess;
  await member.save();
  invalidateAdminCache(String(member._id));
  if (!member.chatAccess) disconnectUser(String(member._id));
  await audit(req, member.chatAccess ? 'teamchat.access_granted' : 'teamchat.access_removed', { targetType: 'admin', targetId: member._id, targetLabel: member.username });
  res.json({ success: true });
}));

// ── Overview ─────────────────────────────────────────────────────────────────
router.get('/overview', manage, handle(async (req, res) => {
  const now = new Date();
  const since30 = new Date(+now - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(+now - 7 * 24 * 60 * 60 * 1000);
  const today = istDay(now);
  const [members, active7, perDay, byStatus, overdue, storage, pendingInvites, checkedIn, pendingLeave, onLeave, liveMeetings, upcomingMeetings] = await Promise.all([
    AdminUser.countDocuments({ active: true, chatAccess: { $ne: false } }),
    AdminUser.countDocuments({ active: true, chatAccess: { $ne: false }, $or: [{ lastSeenAt: { $gte: since7 } }, { lastLoginAt: { $gte: since7 } }] }),
    TeamMessage.aggregate([
      { $match: { createdAt: { $gte: since30 }, kind: 'user' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, n: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    TeamTask.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    TeamTask.countDocuments({ status: { $ne: 'approved' }, dueAt: { $lt: now } }),
    TeamFile.aggregate([{ $match: { status: { $ne: 'deleted' } } }, { $group: { _id: null, bytes: { $sum: '$size' }, files: { $sum: 1 } } }]),
    TeamInvitation.countDocuments({ status: { $in: ['sent', 'failed'] } }),
    TeamStandup.countDocuments({ day: today }),
    TeamLeave.countDocuments({ status: 'pending' }),
    TeamLeave.countDocuments({ status: 'approved', kind: { $ne: 'wfh' }, from: { $lte: today }, to: { $gte: today } }),
    TeamMeeting.countDocuments({ status: 'live' }),
    TeamMeeting.countDocuments({ status: 'scheduled', scheduledAt: { $gte: now } })
  ]);
  res.json({
    success: true,
    data: {
      members, active7, overdue, pendingInvites,
      today, workingDay: isWorkingDay(today), checkedIn, pendingLeave, onLeave, liveMeetings, upcomingMeetings,
      messagesPerDay: perDay.map((d) => ({ day: d._id, count: d.n })),
      tasksByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
      storageBytes: storage[0]?.bytes || 0,
      files: storage[0]?.files || 0,
      appUrl: TEAM_APP_URL
    }
  });
}));

// ── Channels (all, including archived) ───────────────────────────────────────
router.get('/manage/channels', manage, handle(async (req, res) => {
  const channels = await TeamChannel.find({ kind: { $in: ['public', 'private'] } }).sort({ archivedAt: 1, name: 1 }).lean();
  const members = await TeamChannelMember.find({ channelId: { $in: channels.map((c) => c._id) } }, { channelId: 1, adminId: 1 }).lean();
  const byChannel = new Map();
  for (const m of members) {
    const k = String(m.channelId);
    if (!byChannel.has(k)) byChannel.set(k, []);
    byChannel.get(k).push(String(m.adminId));
  }
  res.json({
    success: true,
    data: channels.map((c) => ({
      id: String(c._id), name: c.name, description: c.description, kind: c.kind, archivedAt: c.archivedAt, lastMessageAt: c.lastMessageAt, createdAt: c.createdAt,
      memberIds: byChannel.get(String(c._id)) || []
    }))
  });
}));

// ── Moderation ───────────────────────────────────────────────────────────────
// Recent messages and files in channels (never DMs)
router.get('/moderation', manage, handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query, { defaultLimit: 30 });
  const channels = await TeamChannel.find({ kind: { $in: ['public', 'private'] } }, { name: 1 }).lean();
  const names = new Map(channels.map((c) => [String(c._id), c.name]));
  if (req.query.view === 'files') {
    const filter = { status: 'ready', scope: 'channel', scopeId: { $in: channels.map((c) => c._id) } };
    if (req.query.q) filter.name = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
    const [rows, total] = await Promise.all([TeamFile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), TeamFile.countDocuments(filter)]);
    return res.json({ success: true, data: rows.map((f) => ({ ...publicFile(f), channelName: names.get(String(f.scopeId)) || '' })), total, page, limit });
  }
  const filter = { kind: 'user', deletedAt: null, channelId: { $in: channels.map((c) => c._id) } };
  if (isId(req.query.channelId)) filter.channelId = oid(req.query.channelId);
  if (req.query.q) filter.body = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
  const [rows, total] = await Promise.all([TeamMessage.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).lean(), TeamMessage.countDocuments(filter)]);
  res.json({
    success: true,
    data: rows.map((m) => ({ id: String(m._id), channelId: String(m.channelId), channelName: names.get(String(m.channelId)) || '', authorId: String(m.authorId), body: m.body, fileCount: m.fileIds.length, createdAt: m.createdAt })),
    total,
    page,
    limit
  });
}));

// Same as deleting from the team app, but reachable with an admin panel session
router.delete('/moderation/messages/:id', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Message not found.');
  const message = await TeamMessage.findById(req.params.id);
  if (!message) throw httpError(404, 'Message not found.');
  const channel = await TeamChannel.findOne({ _id: message.channelId, kind: { $in: ['public', 'private'] } }).lean();
  if (!channel) throw httpError(404, 'Message not found.');
  if (!message.deletedAt) {
    message.deletedAt = new Date();
    message.deletedBy = req.admin.id;
    message.pinnedAt = null;
    await message.save();
    await TeamFile.updateMany({ _id: { $in: message.fileIds } }, { status: 'deleted', deletedAt: new Date() });
    if (message.parentId) await TeamMessage.updateOne({ _id: message.parentId, replyCount: { $gt: 0 } }, { $inc: { replyCount: -1 } });
    await audit(req, 'teamchat.message_moderated', {
      targetType: 'team_message', targetId: message._id, targetLabel: `#${channel.name}`,
      details: { authorId: String(message.authorId), reason: clean(req.body?.reason, 200), excerpt: message.body.slice(0, 120) }
    });
    emitToChannel(String(channel._id), 'message.deleted', { channelId: String(channel._id), messageId: String(message._id), parentId: message.parentId ? String(message.parentId) : null });
  }
  res.json({ success: true });
}));

router.delete('/moderation/files/:id', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'File not found.');
  const file = await TeamFile.findOne({ _id: req.params.id, scope: 'channel', status: 'ready' });
  if (!file) throw httpError(404, 'File not found.');
  file.status = 'deleted';
  file.deletedAt = new Date();
  await file.save();
  await audit(req, 'teamchat.file_moderated', { targetType: 'team_file', targetId: file._id, targetLabel: file.name, details: { reason: clean(req.body?.reason, 200), uploadedBy: String(file.uploadedBy) } });
  res.json({ success: true });
}));

export default router;

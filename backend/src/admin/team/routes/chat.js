import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { AdminUser } from '../../models.js';
import { audit } from '../../audit.js';
import { clean, handle, httpError, isId } from '../../util.js';
import { channelFor, isManager, oid, readableChannelIds, requireTeam, sameId } from '../access.js';
import { attachFiles, softDeleteFiles } from '../files.js';
import { TeamChannel, TeamChannelMember, TeamMessage } from '../models.js';
import { channelLabel, notify, parseMentions, teamPeopleFilter } from '../notify.js';
import { emitToChannel, emitToTeam, joinChannelRoom, leaveChannelRoom } from '../realtime.js';
import { filesFor, publicMessage } from '../serialize.js';

const router = express.Router();
const team = requireTeam();
const manage = requireTeam({ manage: true });

export const MAX_MESSAGE = 4000;
const PAGE = 50;
const MAX_DM_PEOPLE = 8;
// "Seen by" is shown in DMs and in channels this small
const SEEN_BY_MAX_MEMBERS = 10;

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => `team-msg:${req.admin?.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, error: 'You are sending messages too fast. Wait a moment.' })
});

export const channelName = (value) => clean(value, 40).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');

// #general exists from the start and everyone with team access is in it
export async function ensureGeneral(adminId) {
  let general = await TeamChannel.findOne({ name: 'general' });
  if (!general) {
    try {
      general = await TeamChannel.create({ name: 'general', kind: 'public', description: 'Company-wide chat for the whole team.' });
    } catch {
      general = await TeamChannel.findOne({ name: 'general' });
    }
  }
  if (adminId && general && !general.archivedAt) {
    await TeamChannelMember.updateOne({ channelId: general._id, adminId }, { $setOnInsert: { lastReadAt: new Date(0) } }, { upsert: true }).catch(() => {});
  }
  return general;
}

async function addMembers(channel, adminIds, addedBy) {
  for (const adminId of adminIds) {
    const res = await TeamChannelMember.updateOne({ channelId: channel._id, adminId }, { $setOnInsert: { addedBy, lastReadAt: new Date() } }, { upsert: true });
    if (res.upsertedCount) joinChannelRoom(String(adminId), String(channel._id));
  }
}

async function validPeople(ids) {
  const clean = [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(isId);
  if (!clean.length) return [];
  const people = await AdminUser.find({ _id: { $in: clean }, ...teamPeopleFilter }, { _id: 1 }).lean();
  if (people.length !== clean.length) throw httpError(400, 'One of those people is not on CVMind Team.');
  return clean;
}

async function unreadCount(channelId, adminId, since) {
  return TeamMessage.countDocuments({ channelId, parentId: null, deletedAt: null, authorId: { $ne: oid(adminId) }, createdAt: { $gt: since } });
}

function publicChannel(c, extra = {}) {
  return {
    id: String(c._id),
    name: c.name || '',
    description: c.description || '',
    kind: c.kind,
    createdBy: c.createdBy ? String(c.createdBy) : null,
    lastMessageAt: c.lastMessageAt || null,
    archivedAt: c.archivedAt || null,
    ...extra
  };
}

// ── Channels ─────────────────────────────────────────────────────────────────
router.get('/channels', team, handle(async (req, res) => {
  await ensureGeneral(req.admin.id);
  const ids = await readableChannelIds(req.admin);
  const [channels, memberships] = await Promise.all([
    TeamChannel.find({ _id: { $in: ids }, archivedAt: null }).sort({ name: 1 }).lean(),
    TeamChannelMember.find({ adminId: req.admin.id }).lean()
  ]);
  const mine = new Map(memberships.map((m) => [String(m.channelId), m]));
  // DMs and private channels list their people, so the client can name a DM and show "Seen by"
  const smallIds = channels.filter((c) => c.kind !== 'public').map((c) => c._id);
  const smallMembers = await TeamChannelMember.find({ channelId: { $in: smallIds } }, { channelId: 1, adminId: 1 }).lean();
  const peopleOf = new Map();
  for (const m of smallMembers) {
    const k = String(m.channelId);
    if (!peopleOf.has(k)) peopleOf.set(k, []);
    peopleOf.get(k).push(String(m.adminId));
  }

  const data = await Promise.all(channels.map(async (c) => {
    const m = mine.get(String(c._id));
    return publicChannel(c, {
      joined: !!m,
      muted: !!m?.muted,
      lastReadAt: m?.lastReadAt || null,
      unread: m ? await unreadCount(c._id, req.admin.id, m.lastReadAt) : 0,
      memberIds: peopleOf.get(String(c._id)) || null
    });
  }));
  res.json({ success: true, data });
}));

router.post('/channels', manage, handle(async (req, res) => {
  const name = channelName(req.body?.name);
  if (name.length < 2) throw httpError(400, 'Channel names need at least 2 letters or numbers.');
  const kind = req.body?.kind === 'private' ? 'private' : 'public';
  if (await TeamChannel.exists({ name })) throw httpError(409, `#${name} already exists.`);
  const channel = await TeamChannel.create({ name, kind, description: clean(req.body?.description, 250), createdBy: req.admin.id });
  const people = await validPeople(req.body?.memberIds);
  await addMembers(channel, [req.admin.id, ...people], req.admin.id);
  await notify(people, { type: 'added_to_channel', actorId: req.admin.id, refType: 'channel', refId: channel._id, channelId: channel._id, preview: `#${name}` });
  await audit(req, 'teamchat.channel_created', { targetType: 'team_channel', targetId: channel._id, targetLabel: `#${name}`, details: { kind } });
  res.json({ success: true, data: publicChannel(channel.toObject(), { joined: true, unread: 0 }) });
}));

router.get('/channels/:id', team, handle(async (req, res) => {
  const { channel, member } = await channelFor(req.admin, req.params.id);
  const members = await TeamChannelMember.find({ channelId: channel._id }, { adminId: 1, lastReadAt: 1 }).lean();
  const showReads = channel.kind === 'dm' || members.length <= SEEN_BY_MAX_MEMBERS;
  res.json({
    success: true,
    data: publicChannel(channel, {
      joined: !!member,
      muted: !!member?.muted,
      lastReadAt: member?.lastReadAt || null,
      memberIds: members.map((m) => String(m.adminId)),
      reads: showReads ? members.map((m) => ({ adminId: String(m.adminId), lastReadAt: m.lastReadAt })) : null
    })
  });
}));

router.patch('/channels/:id', manage, handle(async (req, res) => {
  const { channel } = await channelFor(req.admin, req.params.id);
  if (channel.kind === 'dm') throw httpError(400, 'Direct messages cannot be changed.');
  const update = {};
  const changes = {};
  if (req.body?.name !== undefined) {
    const name = channelName(req.body.name);
    if (name.length < 2) throw httpError(400, 'Channel names need at least 2 letters or numbers.');
    if (channel.name === 'general' && name !== 'general') throw httpError(400, '#general cannot be renamed.');
    if (name !== channel.name && (await TeamChannel.exists({ name }))) throw httpError(409, `#${name} already exists.`);
    update.name = name;
    changes.name = { from: channel.name, to: name };
  }
  if (req.body?.description !== undefined) update.description = clean(req.body.description, 250);
  if (req.body?.kind === 'public' || req.body?.kind === 'private') {
    if (channel.name === 'general' && req.body.kind === 'private') throw httpError(400, '#general stays public.');
    update.kind = req.body.kind;
    changes.kind = { from: channel.kind, to: req.body.kind };
  }
  if (typeof req.body?.archived === 'boolean') {
    if (channel.name === 'general' && req.body.archived) throw httpError(400, '#general cannot be archived.');
    update.archivedAt = req.body.archived ? new Date() : null;
    changes.archived = req.body.archived;
  }
  const updated = await TeamChannel.findByIdAndUpdate(channel._id, update, { new: true }).lean();
  emitToChannel(String(channel._id), 'channel.updated', { channelId: String(channel._id) });
  // Visibility changes affect people outside the channel too (it appears in or leaves their list)
  if (changes.kind || changes.archived !== undefined) emitToTeam('channel.updated', { channelId: String(channel._id) });
  await audit(req, 'teamchat.channel_updated', { targetType: 'team_channel', targetId: channel._id, targetLabel: `#${updated.name}`, details: changes });
  res.json({ success: true, data: publicChannel(updated) });
}));

router.post('/channels/:id/join', team, handle(async (req, res) => {
  const { channel } = await channelFor(req.admin, req.params.id, { write: true });
  if (channel.kind !== 'public') throw httpError(400, 'Ask a manager to add you to this channel.');
  await addMembers(channel, [req.admin.id], req.admin.id);
  res.json({ success: true });
}));

router.post('/channels/:id/leave', team, handle(async (req, res) => {
  const { channel } = await channelFor(req.admin, req.params.id);
  if (channel.name === 'general') throw httpError(400, 'Everyone stays in #general.');
  await TeamChannelMember.deleteOne({ channelId: channel._id, adminId: req.admin.id });
  leaveChannelRoom(req.admin.id, String(channel._id));
  res.json({ success: true });
}));

router.post('/channels/:id/members', manage, handle(async (req, res) => {
  const { channel } = await channelFor(req.admin, req.params.id, { write: true });
  if (channel.kind === 'dm') throw httpError(400, 'Start a new group message instead.');
  const people = await validPeople(req.body?.adminIds);
  await addMembers(channel, people, req.admin.id);
  await notify(people, { type: 'added_to_channel', actorId: req.admin.id, refType: 'channel', refId: channel._id, channelId: channel._id, preview: `#${channel.name}` });
  emitToChannel(String(channel._id), 'channel.updated', { channelId: String(channel._id) });
  await audit(req, 'teamchat.channel_members_added', { targetType: 'team_channel', targetId: channel._id, targetLabel: `#${channel.name}`, details: { adminIds: people } });
  res.json({ success: true });
}));

router.delete('/channels/:id/members/:adminId', manage, handle(async (req, res) => {
  const { channel } = await channelFor(req.admin, req.params.id);
  if (channel.kind === 'dm') throw httpError(400, 'Direct messages cannot be changed.');
  if (channel.name === 'general') throw httpError(400, 'Everyone stays in #general.');
  if (!isId(req.params.adminId)) throw httpError(404, 'Member not found.');
  await TeamChannelMember.deleteOne({ channelId: channel._id, adminId: req.params.adminId });
  leaveChannelRoom(req.params.adminId, String(channel._id));
  emitToChannel(String(channel._id), 'channel.updated', { channelId: String(channel._id) });
  await audit(req, 'teamchat.channel_member_removed', { targetType: 'team_channel', targetId: channel._id, targetLabel: `#${channel.name}`, details: { adminId: req.params.adminId } });
  res.json({ success: true });
}));

router.patch('/channels/:id/me', team, handle(async (req, res) => {
  const { channel, member } = await channelFor(req.admin, req.params.id);
  if (!member) throw httpError(400, 'Join the channel first.');
  if (typeof req.body?.muted === 'boolean') await TeamChannelMember.updateOne({ _id: member._id }, { muted: req.body.muted });
  res.json({ success: true, channelId: String(channel._id) });
}));

// Marks the channel read up to now
router.post('/channels/:id/read', team, handle(async (req, res) => {
  const { channel, member } = await channelFor(req.admin, req.params.id);
  if (!member) return res.json({ success: true });
  const at = new Date();
  await TeamChannelMember.updateOne({ _id: member._id }, { lastReadAt: at });
  emitToChannel(String(channel._id), 'read', { channelId: String(channel._id), adminId: req.admin.id, at });
  res.json({ success: true, at });
}));

// ── Direct messages ──────────────────────────────────────────────────────────
router.post('/dm', team, handle(async (req, res) => {
  const others = (await validPeople(req.body?.adminIds)).filter((id) => !sameId(id, req.admin.id));
  if (!others.length) throw httpError(400, 'Pick at least one person.');
  if (others.length + 1 > MAX_DM_PEOPLE) throw httpError(400, `Group messages can have up to ${MAX_DM_PEOPLE} people.`);
  const people = [req.admin.id, ...others].map(String).sort();
  const dmKey = people.join(',');
  let channel = await TeamChannel.findOne({ dmKey });
  if (!channel) {
    try {
      channel = await TeamChannel.create({ kind: 'dm', dmKey, createdBy: req.admin.id });
    } catch {
      channel = await TeamChannel.findOne({ dmKey });
    }
    await addMembers(channel, people, req.admin.id);
  }
  res.json({ success: true, data: publicChannel(channel.toObject(), { joined: true, unread: 0, memberIds: people }) });
}));

// ── Messages ─────────────────────────────────────────────────────────────────
async function sendPage(rows, res, extra = {}) {
  const files = await filesFor(rows);
  res.json({ success: true, data: rows.map((m) => publicMessage(m, files)), ...extra });
}

// Newest first in pages of 50 (?before=<id> for older), or ?around=<id> to open history at a message
router.get('/channels/:id/messages', team, handle(async (req, res) => {
  const { channel } = await channelFor(req.admin, req.params.id);
  const base = { channelId: channel._id, parentId: null };
  if (isId(req.query.around)) {
    const half = PAGE / 2;
    const [older, newer] = await Promise.all([
      TeamMessage.find({ ...base, _id: { $lte: oid(req.query.around) } }).sort({ _id: -1 }).limit(half + 1).lean(),
      TeamMessage.find({ ...base, _id: { $gt: oid(req.query.around) } }).sort({ _id: 1 }).limit(half + 1).lean()
    ]);
    const rows = [...newer.slice(0, half).reverse(), ...older.slice(0, half)];
    return sendPage(rows, res, { hasMore: older.length > half, hasNewer: newer.length > half });
  }
  const filter = isId(req.query.before) ? { ...base, _id: { $lt: oid(req.query.before) } } : base;
  const rows = await TeamMessage.find(filter).sort({ _id: -1 }).limit(PAGE + 1).lean();
  return sendPage(rows.slice(0, PAGE), res, { hasMore: rows.length > PAGE, hasNewer: false });
}));

async function messageFor(admin, id) {
  if (!isId(id)) throw httpError(404, 'Message not found.');
  const message = await TeamMessage.findById(id);
  if (!message) throw httpError(404, 'Message not found.');
  const access = await channelFor(admin, message.channelId);
  return { message, ...access };
}

router.get('/messages/:id', team, handle(async (req, res) => {
  const { message } = await messageFor(req.admin, req.params.id);
  const files = await filesFor([message]);
  res.json({ success: true, data: publicMessage(message.toObject(), files) });
}));

router.get('/messages/:id/replies', team, handle(async (req, res) => {
  const { message } = await messageFor(req.admin, req.params.id);
  const rows = await TeamMessage.find({ parentId: message._id }).sort({ _id: 1 }).limit(500).lean();
  const files = await filesFor([message, ...rows]);
  res.json({ success: true, parent: publicMessage(message.toObject(), files), data: rows.map((m) => publicMessage(m, files)) });
}));

router.get('/channels/:id/pins', team, handle(async (req, res) => {
  const { channel } = await channelFor(req.admin, req.params.id);
  const rows = await TeamMessage.find({ channelId: channel._id, pinnedAt: { $ne: null }, deletedAt: null }).sort({ pinnedAt: -1 }).limit(50).lean();
  return sendPage(rows, res);
}));

router.post('/channels/:id/messages', team, messageLimiter, handle(async (req, res) => {
  let { channel, member } = await channelFor(req.admin, req.params.id, { write: true });
  const body = String(req.body?.body ?? '').trim();
  if (body.length > MAX_MESSAGE) throw httpError(400, `Messages can be up to ${MAX_MESSAGE} characters.`);
  const fileIdsIn = Array.isArray(req.body?.fileIds) ? req.body.fileIds : [];
  if (!body && !fileIdsIn.length) throw httpError(400, 'Write a message or attach a file.');

  if (!member) {
    // Writing in a public channel joins it; private channels and DMs need a member
    if (channel.kind !== 'public') throw httpError(403, 'Only members of this channel can post here.');
    await addMembers(channel, [req.admin.id], req.admin.id);
    member = { adminId: req.admin.id };
  }

  let parent = null;
  if (req.body?.parentId) {
    if (!isId(req.body.parentId)) throw httpError(404, 'Message not found.');
    parent = await TeamMessage.findOne({ _id: req.body.parentId, channelId: channel._id, parentId: null });
    if (!parent) throw httpError(404, 'Message not found.');
  }

  const mentions = await parseMentions(body, { channelId: channel._id, allowChannel: isManager(req.admin) });
  const message = new TeamMessage({ channelId: channel._id, authorId: req.admin.id, body, parentId: parent?._id || null, mentions });
  message.fileIds = await attachFiles(req.admin, fileIdsIn, { scope: 'channel', scopeId: channel._id, type: 'message', id: message._id });
  await message.save();

  const now = message.createdAt;
  await TeamChannel.updateOne({ _id: channel._id }, { lastMessageAt: now });
  await TeamChannelMember.updateOne({ channelId: channel._id, adminId: req.admin.id }, { lastReadAt: now });
  if (parent) await TeamMessage.updateOne({ _id: parent._id }, { $inc: { replyCount: 1 }, lastReplyAt: now });

  // Notifications: mentions first, then DMs and thread participants who weren't mentioned
  const preview = body || `Sent ${message.fileIds.length} file${message.fileIds.length === 1 ? '' : 's'}`;
  const where = await channelLabel(channel._id);
  const base = { actorId: req.admin.id, refType: 'message', refId: message._id, channelId: channel._id };
  // Mentions only reach people who can read the channel
  const readers = channel.kind === 'public' ? null : new Set((await TeamChannelMember.find({ channelId: channel._id }, { adminId: 1 }).lean()).map((m) => String(m.adminId)));
  const mentioned = mentions.filter((id) => !readers || readers.has(id));
  await notify(mentioned, { ...base, type: 'mention', preview: `${where}: ${preview}` });
  const already = new Set(mentioned);
  if (channel.kind === 'dm') {
    await notify([...readers].filter((id) => !already.has(id)), { ...base, type: 'dm', preview });
  } else if (parent) {
    const repliers = await TeamMessage.distinct('authorId', { parentId: parent._id });
    const participants = [String(parent.authorId), ...repliers.map(String)].filter((id) => !already.has(id) && (!readers || readers.has(id)));
    await notify(participants, { ...base, type: 'thread_reply', preview: `${where}: ${preview}` });
  }

  emitToChannel(String(channel._id), 'message.created', { channelId: String(channel._id), messageId: String(message._id), parentId: parent ? String(parent._id) : null, authorId: req.admin.id });
  const files = await filesFor([message]);
  res.json({ success: true, data: publicMessage(message.toObject(), files) });
}));

router.patch('/messages/:id', team, handle(async (req, res) => {
  const { message, channel } = await messageFor(req.admin, req.params.id);
  if (!sameId(message.authorId, req.admin.id) || message.kind !== 'user') throw httpError(403, 'You can only edit your own messages.');
  if (message.deletedAt) throw httpError(400, 'This message was deleted.');
  const body = String(req.body?.body ?? '').trim();
  if (!body && !message.fileIds.length) throw httpError(400, 'A message cannot be empty.');
  if (body.length > MAX_MESSAGE) throw httpError(400, `Messages can be up to ${MAX_MESSAGE} characters.`);
  const before = new Set(message.mentions.map(String));
  message.body = body;
  message.editedAt = new Date();
  message.mentions = await parseMentions(body, { channelId: channel._id, allowChannel: isManager(req.admin) });
  await message.save();
  const added = message.mentions.map(String).filter((id) => !before.has(id));
  await notify(added, { type: 'mention', actorId: req.admin.id, refType: 'message', refId: message._id, channelId: channel._id, preview: `${await channelLabel(channel._id)}: ${body}` });
  emitToChannel(String(channel._id), 'message.updated', { channelId: String(channel._id), messageId: String(message._id), parentId: message.parentId ? String(message.parentId) : null });
  const files = await filesFor([message]);
  res.json({ success: true, data: publicMessage(message.toObject(), files) });
}));

router.delete('/messages/:id', team, handle(async (req, res) => {
  const { message, channel } = await messageFor(req.admin, req.params.id);
  const own = sameId(message.authorId, req.admin.id);
  if (!own && !isManager(req.admin)) throw httpError(403, 'You can only delete your own messages.');
  if (message.deletedAt) return res.json({ success: true });
  message.deletedAt = new Date();
  message.deletedBy = req.admin.id;
  message.pinnedAt = null;
  await message.save();
  await softDeleteFiles(message.fileIds);
  if (message.parentId) await TeamMessage.updateOne({ _id: message.parentId, replyCount: { $gt: 0 } }, { $inc: { replyCount: -1 } });
  if (!own) {
    await audit(req, 'teamchat.message_moderated', {
      targetType: 'team_message', targetId: message._id, targetLabel: channel.kind === 'dm' ? 'direct message' : `#${channel.name}`,
      details: { authorId: String(message.authorId), reason: clean(req.body?.reason, 200), excerpt: message.body.slice(0, 120) }
    });
  }
  emitToChannel(String(channel._id), 'message.deleted', { channelId: String(channel._id), messageId: String(message._id), parentId: message.parentId ? String(message.parentId) : null });
  res.json({ success: true });
}));

// Toggles one emoji reaction for the caller
router.post('/messages/:id/reactions', team, handle(async (req, res) => {
  const { message, channel } = await messageFor(req.admin, req.params.id);
  const emoji = String(req.body?.emoji || '').trim();
  if (!emoji || emoji.length > 16 || /[\s<>]/.test(emoji)) throw httpError(400, 'Pick an emoji.');
  if (message.deletedAt) throw httpError(400, 'This message was deleted.');
  const me = String(req.admin.id);
  let reaction = message.reactions.find((r) => r.emoji === emoji);
  if (!reaction) {
    if (message.reactions.length >= 20) throw httpError(400, 'This message has too many different reactions.');
    message.reactions.push({ emoji, adminIds: [] });
    reaction = message.reactions[message.reactions.length - 1];
  }
  const has = reaction.adminIds.some((id) => String(id) === me);
  reaction.adminIds = has ? reaction.adminIds.filter((id) => String(id) !== me) : [...reaction.adminIds, me];
  message.reactions = message.reactions.filter((r) => r.adminIds.length);
  await message.save();
  emitToChannel(String(channel._id), 'message.updated', { channelId: String(channel._id), messageId: String(message._id), parentId: message.parentId ? String(message.parentId) : null });
  res.json({ success: true, reacted: !has });
}));

router.post('/messages/:id/pin', team, handle(async (req, res) => {
  const { message, channel, member } = await messageFor(req.admin, req.params.id);
  if (!member && !isManager(req.admin)) throw httpError(403, 'Join the channel to pin messages.');
  if (message.deletedAt || message.parentId) throw httpError(400, 'Only messages in the channel can be pinned.');
  const pin = req.body?.pinned !== false;
  message.pinnedAt = pin ? new Date() : null;
  message.pinnedBy = pin ? req.admin.id : null;
  await message.save();
  emitToChannel(String(channel._id), 'message.updated', { channelId: String(channel._id), messageId: String(message._id), parentId: null });
  res.json({ success: true, pinned: pin });
}));

export default router;

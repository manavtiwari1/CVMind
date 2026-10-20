import express from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { AdminUser } from '../../models.js';
import { invalidateAdminCache, loginAdmin, toPublicAdmin } from '../../auth.js';
import { audit } from '../../audit.js';
import { clean, dateRange, escapeRegex, handle, httpError, isEmail, isId, paging } from '../../util.js';
import { ROLES } from '../../permissions.js';
import { isManager, MANAGE, oid, readableChannelIds, requireTeam, visibleTaskFilter } from '../access.js';
import { attachFiles, canOpenFile, checkUploadScope, newFileKey, publicFile, visibleFileFilter } from '../files.js';
import { TeamAnnouncement, TeamChannel, TeamChannelMember, TeamFile, TeamInvitation, TeamMessage, TeamNotification, TeamSubmission, TeamTask } from '../models.js';
import { teamPeopleFilter } from '../notify.js';
import { presenceOf } from '../realtime.js';
import { filesFor, publicNotification, publicTask } from '../serialize.js';
import { FILE_TYPES, IMAGE_TYPES, MAX_AVATAR_BYTES, MAX_FILE_BYTES, fileTypeError, headObject, presignDownload, presignUpload, removeObject } from '../storage.js';
import { ensureGeneral } from './chat.js';

const router = express.Router();
const team = requireTeam();
const panel = requireTeam({ adminPanel: true });
const profile = requireTeam({ allowPasswordChange: true });

const SESSION_MS = 12 * 60 * 60 * 1000;
const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000;

const limiter = (windowMs, limit, key, error) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  ...(key ? { keyGenerator: (req) => `${key}:${req.admin?.id}` } : {}),
  handler: (req, res) => res.status(429).json({ success: false, error })
});
const loginLimiter = limiter(15 * 60 * 1000, 10, null, 'Too many sign-in attempts. Please wait 15 minutes and try again.');
const uploadLimiter = limiter(60 * 1000, 20, 'team-upload', 'Too many uploads at once. Wait a moment and try again.');

function publicPerson(a) {
  return {
    id: String(a._id),
    name: a.name || a.username,
    username: a.username,
    email: a.email || '',
    role: a.role,
    roleLabel: ROLES[a.role]?.label || a.role,
    manager: !!ROLES[a.role]?.permissions.includes(MANAGE),
    active: a.active !== false && a.chatAccess !== false,
    statusText: a.statusText || '',
    avatarFileId: a.avatarFileId ? String(a.avatarFileId) : null,
    presence: presenceOf(a._id),
    lastSeenAt: a.lastSeenAt || null
  };
}

// ── Session ──────────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, handle(async (req, res) => {
  const { username, password, remember } = req.body || {};
  const result = await loginAdmin(username, password, { kind: 'team', ttlMs: remember ? REMEMBER_MS : SESSION_MS });
  if (!result) return res.status(401).json({ success: false, error: 'Wrong username or password.' });
  if (!result.admin.chatAccess) return res.status(403).json({ success: false, error: 'Your access to CVMind Team has been removed. Contact your manager.' });
  const accepted = await TeamInvitation.findOneAndUpdate({ adminId: result.admin.id, status: { $in: ['sent', 'failed'] } }, { status: 'accepted', acceptedAt: new Date() });
  if (accepted) {
    req.admin = result.admin;
    await audit(req, 'teamchat.invite_accepted', { targetType: 'admin', targetId: result.admin.id, targetLabel: result.admin.username });
  }
  res.json({ success: true, token: result.token, admin: result.admin });
}));

router.get('/me', profile, handle(async (req, res) => {
  if (!req.admin.mustChangePassword) await ensureGeneral(req.admin.id);
  res.json({ success: true, admin: req.admin, manager: isManager(req.admin) });
}));

router.patch('/me', profile, handle(async (req, res) => {
  const update = {};
  if (req.body?.name !== undefined) {
    const name = clean(req.body.name, 80);
    if (!name) throw httpError(400, 'Enter your name.');
    update.name = name;
  }
  if (req.body?.email !== undefined) {
    const email = clean(req.body.email, 120).toLowerCase();
    if (email && !isEmail(email)) throw httpError(400, 'Enter a valid email address.');
    if (email && (await AdminUser.exists({ email, _id: { $ne: req.admin.id } }))) throw httpError(409, 'Someone on the team already uses that email.');
    update.email = email;
  }
  if (typeof req.body?.notifyEmail === 'boolean') update.notifyEmail = req.body.notifyEmail;
  if (req.body?.statusText !== undefined) update.statusText = clean(req.body.statusText, 80);
  if (req.body?.avatarFileId !== undefined) {
    if (req.body.avatarFileId === null) {
      update.avatarFileId = null;
    } else {
      const [id] = await attachFiles(req.admin, [req.body.avatarFileId], { scope: 'avatar', type: 'avatar', id: oid(req.admin.id) }, { max: 1 });
      update.avatarFileId = id;
    }
  }
  const admin = await AdminUser.findByIdAndUpdate(req.admin.id, update, { new: true }).lean();
  invalidateAdminCache(req.admin.id);
  res.json({ success: true, admin: toPublicAdmin(admin) });
}));

router.post('/me/password', profile, handle(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (String(newPassword || '').length < 10) throw httpError(400, 'Use at least 10 characters for the new password.');
  if (String(newPassword) === String(currentPassword)) throw httpError(400, 'Choose a password different from the temporary one.');
  const admin = await AdminUser.findById(req.admin.id);
  if (!admin || !(await bcrypt.compare(String(currentPassword || ''), admin.passwordHash))) throw httpError(400, 'Your current password is not correct.');
  admin.passwordHash = await bcrypt.hash(String(newPassword), 10);
  admin.mustChangePassword = false;
  await admin.save();
  invalidateAdminCache(String(admin._id));
  await audit(req, 'admin.password_changed', { targetType: 'admin', targetId: admin._id, targetLabel: admin.username, details: { from: 'team' } });
  await ensureGeneral(String(admin._id));
  res.json({ success: true, admin: toPublicAdmin(admin) });
}));

// ── People ───────────────────────────────────────────────────────────────────
// Everyone, including former members, so old messages still show a name; the directory shows active ones
router.get('/members', panel, handle(async (req, res) => {
  const people = await AdminUser.find({}, { passwordHash: 0, tokenVersion: 0 }).sort({ name: 1, username: 1 }).lean();
  res.json({ success: true, data: people.map(publicPerson) });
}));

// ── Home ─────────────────────────────────────────────────────────────────────
router.get('/home', team, handle(async (req, res) => {
  const me = oid(req.admin.id);
  const now = new Date();
  const weekAhead = new Date(+now + 7 * 24 * 60 * 60 * 1000);
  const open = { assigneeIds: me, status: { $ne: 'approved' } };
  const [mine, announcements, mentions, dmChannels] = await Promise.all([
    TeamTask.find({ ...open, $or: [{ dueAt: { $lte: weekAhead } }, { status: 'changes_requested' }] }).sort({ dueAt: 1 }).limit(50).lean(),
    TeamAnnouncement.find().sort({ pinned: -1, createdAt: -1 }).limit(3).lean(),
    TeamNotification.find({ adminId: me, type: { $in: ['mention', 'dm'] } }).sort({ createdAt: -1 }).limit(8).lean(),
    TeamChannel.find({ kind: 'dm', _id: { $in: (await TeamChannelMember.find({ adminId: me }, { channelId: 1 }).lean()).map((m) => m.channelId) } }, { _id: 1 }).lean()
  ]);
  const unreadDms = await TeamChannelMember.find({ adminId: me, channelId: { $in: dmChannels.map((c) => c._id) } }).lean()
    .then((rows) => Promise.all(rows.map(async (m) => ({
      channelId: String(m.channelId),
      unread: await TeamMessage.countDocuments({ channelId: m.channelId, parentId: null, deletedAt: null, authorId: { $ne: me }, createdAt: { $gt: m.lastReadAt } })
    }))))
    .then((rows) => rows.filter((r) => r.unread > 0));

  let manager = null;
  if (isManager(req.admin)) {
    const [awaitingReview, teamOverdue] = await Promise.all([
      TeamTask.find({ status: 'submitted' }).sort({ updatedAt: 1 }).limit(20).lean(),
      TeamTask.countDocuments({ status: { $ne: 'approved' }, dueAt: { $lt: now } })
    ]);
    manager = { awaitingReview: awaitingReview.map((t) => publicTask(t)), teamOverdue };
  }
  const files = await filesFor(mine);
  res.json({
    success: true,
    tasks: mine.map((t) => publicTask(t, files)),
    announcements: announcements.map((a) => ({ id: String(a._id), title: a.title, important: a.important, pinned: a.pinned, createdAt: a.createdAt, acked: a.acks.some((x) => String(x.adminId) === req.admin.id) })),
    mentions: mentions.map(publicNotification),
    unreadDms,
    manager
  });
}));

// ── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications', team, handle(async (req, res) => {
  const filter = { adminId: oid(req.admin.id) };
  if (isId(req.query.before)) filter._id = { $lt: oid(req.query.before) };
  if (req.query.unread === '1') filter.readAt = null;
  const [rows, unread] = await Promise.all([
    TeamNotification.find(filter).sort({ _id: -1 }).limit(31).lean(),
    TeamNotification.countDocuments({ adminId: oid(req.admin.id), readAt: null })
  ]);
  res.json({ success: true, data: rows.slice(0, 30).map(publicNotification), hasMore: rows.length > 30, unread });
}));

router.post('/notifications/read', team, handle(async (req, res) => {
  const filter = { adminId: oid(req.admin.id), readAt: null };
  if (req.body?.all) {
    // everything
  } else if (isId(req.body?.id)) {
    filter._id = oid(req.body.id);
  } else if (isId(req.body?.taskId)) {
    filter.taskId = oid(req.body.taskId);
  } else if (isId(req.body?.channelId)) {
    filter.channelId = oid(req.body.channelId);
  } else if (isId(req.body?.refId)) {
    filter.refId = oid(req.body.refId);
  } else {
    throw httpError(400, 'Nothing to mark as read.');
  }
  const result = await TeamNotification.updateMany(filter, { readAt: new Date() });
  res.json({ success: true, updated: result.modifiedCount });
}));

// ── Search ───────────────────────────────────────────────────────────────────
router.get('/search', team, handle(async (req, res) => {
  const q = clean(req.query.q, 80);
  if (q.length < 2) return res.json({ success: true, messages: [], tasks: [], announcements: [], files: [], people: [] });
  const rx = new RegExp(escapeRegex(q), 'i');
  const messageFilter = { body: rx, deletedAt: null, kind: 'user', channelId: { $in: await readableChannelIds(req.admin) } };
  if (isId(req.query.channelId)) messageFilter.channelId = { $in: messageFilter.channelId.$in.filter((id) => String(id) === req.query.channelId) };
  if (isId(req.query.from)) messageFilter.authorId = oid(req.query.from);
  Object.assign(messageFilter, dateRange({ from: req.query.after, to: req.query.until }));

  const [messages, tasks, announcements, files, people] = await Promise.all([
    TeamMessage.find(messageFilter).sort({ _id: -1 }).limit(20).lean(),
    TeamTask.find({ $and: [visibleTaskFilter(req.admin), { $or: [{ title: rx }, { description: rx }] }] }).sort({ updatedAt: -1 }).limit(10).lean(),
    TeamAnnouncement.find({ $or: [{ title: rx }, { body: rx }] }).sort({ createdAt: -1 }).limit(5).lean(),
    visibleFileFilter(req.admin).then((f) => TeamFile.find({ ...f, name: rx }).sort({ createdAt: -1 }).limit(10).lean()),
    AdminUser.find({ ...teamPeopleFilter, $or: [{ name: rx }, { username: rx }] }, { passwordHash: 0 }).limit(8).lean()
  ]);
  res.json({
    success: true,
    messages: messages.map((m) => ({ id: String(m._id), channelId: String(m.channelId), parentId: m.parentId ? String(m.parentId) : null, authorId: String(m.authorId), body: m.body.slice(0, 300), createdAt: m.createdAt })),
    tasks: tasks.map((t) => ({ id: String(t._id), title: t.title, status: t.status, dueAt: t.dueAt })),
    announcements: announcements.map((a) => ({ id: String(a._id), title: a.title, createdAt: a.createdAt })),
    files: files.map(publicFile),
    people: people.map(publicPerson)
  });
}));

// ── Files ────────────────────────────────────────────────────────────────────
router.post('/files/upload-url', team, uploadLimiter, handle(async (req, res) => {
  const name = clean(req.body?.name, 180).replace(/[\\/]/g, '_');
  const mime = clean(req.body?.mime, 120).toLowerCase();
  const size = Number(req.body?.size);
  const scope = clean(req.body?.scope, 20);
  const scopeId = req.body?.scopeId && isId(req.body.scopeId) ? req.body.scopeId : null;
  if (!name) throw httpError(400, 'The file needs a name.');
  const typeError = fileTypeError(name, mime);
  if (typeError) throw httpError(400, typeError);
  if (!Number.isFinite(size) || size <= 0) throw httpError(400, 'The file is empty.');
  const max = scope === 'avatar' ? MAX_AVATAR_BYTES : MAX_FILE_BYTES;
  if (scope === 'avatar' && !IMAGE_TYPES.includes(mime)) throw httpError(400, 'Profile photos must be PNG or JPG.');
  if (size > max) throw httpError(400, `File is larger than ${Math.round(max / 1024 / 1024)} MB.`);
  if (scope === 'channel' && !scopeId) throw httpError(400, 'Pick a channel.');
  await checkUploadScope(req.admin, scope, scopeId);

  const key = newFileKey(name);
  const uploadUrl = await presignUpload(key, mime);
  const file = await TeamFile.create({ key, name, mime, size, uploadedBy: req.admin.id, scope, scopeId });
  res.json({ success: true, file: publicFile(file), uploadUrl, headers: { 'Content-Type': mime } });
}));

// Called after the browser's PUT to R2 finishes: checks what actually arrived
router.post('/files/:id/complete', team, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'File not found.');
  const file = await TeamFile.findOne({ _id: req.params.id, uploadedBy: req.admin.id });
  if (!file) throw httpError(404, 'File not found.');
  if (file.status === 'ready') return res.json({ success: true, file: publicFile(file) });
  if (file.status !== 'pending') throw httpError(400, 'This upload was cancelled.');
  const stored = await headObject(file.key);
  if (!stored) throw httpError(400, 'The upload did not finish. Try again.');
  const max = file.scope === 'avatar' ? MAX_AVATAR_BYTES : MAX_FILE_BYTES;
  const typeOk = String(stored.mime || '').split(';')[0].toLowerCase() === file.mime && !!FILE_TYPES[file.mime];
  if (stored.size !== file.size || stored.size > max || !typeOk) {
    await removeObject(file.key).catch(() => {});
    await file.deleteOne();
    throw httpError(400, stored.size > max ? `File is larger than ${Math.round(max / 1024 / 1024)} MB.` : 'The uploaded file does not match what was sent. Try again.');
  }
  file.status = 'ready';
  await file.save();
  res.json({ success: true, file: publicFile(file) });
}));

// A short-lived link to open or download the file
router.get('/files/:id', team, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'File not found.');
  const file = await TeamFile.findById(req.params.id).lean();
  if (!(await canOpenFile(req.admin, file))) throw httpError(404, 'File not found.');
  const url = await presignDownload(file, req.query.download === '1');
  res.json({ success: true, url, file: publicFile(file) });
}));

const MEDIA_TYPES = {
  image: IMAGE_TYPES,
  pdf: ['application/pdf'],
  doc: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  text: ['text/plain']
};

router.get('/media', team, handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query, { defaultLimit: 40, maxLimit: 100 });
  const filter = await visibleFileFilter(req.admin);
  if (MEDIA_TYPES[req.query.type]) filter.mime = { $in: MEDIA_TYPES[req.query.type] };
  if (['channel', 'task', 'announcement'].includes(req.query.scope)) {
    filter.$and = [{ scope: req.query.scope }, ...(isId(req.query.scopeId) ? [{ scopeId: oid(req.query.scopeId) }] : [])];
  }
  if (isId(req.query.uploadedBy)) filter.uploadedBy = oid(req.query.uploadedBy);
  Object.assign(filter, dateRange(req.query));
  const [rows, total] = await Promise.all([
    TeamFile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    TeamFile.countDocuments(filter)
  ]);
  // Where each file was shared, so "Go to message/task" can open it
  const messageIds = rows.filter((f) => f.attachedTo?.type === 'message').map((f) => f.attachedTo.id);
  const messages = new Map((await TeamMessage.find({ _id: { $in: messageIds } }, { parentId: 1 }).lean()).map((m) => [String(m._id), m]));
  const submissionIds = rows.filter((f) => f.attachedTo?.type === 'submission').map((f) => f.attachedTo.id);
  const submissions = new Map((await TeamSubmission.find({ _id: { $in: submissionIds } }, { version: 1 }).lean()).map((s) => [String(s._id), s]));
  res.json({
    success: true,
    data: rows.map((f) => ({
      ...publicFile(f),
      parentId: messages.get(String(f.attachedTo?.id))?.parentId ? String(messages.get(String(f.attachedTo.id)).parentId) : null,
      version: submissions.get(String(f.attachedTo?.id))?.version || null
    })),
    total,
    page,
    limit
  });
}));

export default router;

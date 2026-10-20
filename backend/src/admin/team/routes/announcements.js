import express from 'express';
import { AdminUser } from '../../models.js';
import { audit } from '../../audit.js';
import { emailConfigured, renderEmail, sendEmailBatch } from '../../mailer.js';
import { clean, handle, httpError, isId, paging } from '../../util.js';
import { requireTeam, sameId } from '../access.js';
import { attachFiles, softDeleteFiles } from '../files.js';
import { TeamAnnouncement } from '../models.js';
import { notify, TEAM_APP_URL, teamPeopleFilter } from '../notify.js';
import { emitToTeam } from '../realtime.js';
import { filesFor, publicAnnouncement } from '../serialize.js';

const router = express.Router();
const team = requireTeam();
const panel = requireTeam({ adminPanel: true });
const manage = requireTeam({ manage: true });

const MAX_TITLE = 150;
const MAX_BODY = 10000;

async function announcementFor(id) {
  if (!isId(id)) throw httpError(404, 'Announcement not found.');
  const a = await TeamAnnouncement.findById(id);
  if (!a) throw httpError(404, 'Announcement not found.');
  return a;
}

// Emails everyone on the team. Important announcements go to everyone; others respect the email setting.
async function emailAnnouncement(a, author) {
  if (!emailConfigured()) return;
  const people = await AdminUser.find({ ...teamPeopleFilter, email: { $gt: '' }, ...(a.important ? {} : { notifyEmail: { $ne: false } }) }).lean();
  const recipients = people.filter((p) => !sameId(p._id, author.id));
  if (!recipients.length) return;
  const messages = recipients.map((p) => ({
    to: p.email,
    subject: `${a.important ? 'Important: ' : ''}${a.title}`,
    html: renderEmail({
      preheader: a.body.slice(0, 120),
      eyebrow: a.important ? 'Important announcement' : 'Announcement',
      title: a.title,
      greetingName: p.name || p.username,
      body: a.body,
      ctaLabel: 'Read and acknowledge',
      ctaUrl: `${TEAM_APP_URL}/#/announcements/${a._id}`,
      afterword: `Posted by ${author.name || author.username}.`,
      footerReason: 'You get this because you are on CVMind Team.'
    })
  }));
  const result = await sendEmailBatch(messages).catch((err) => ({ failed: messages.length, errors: [err.message] }));
  if (result.failed) console.error('[team] announcement emails failed:', result.failed, result.errors?.[0]);
}

router.get('/announcements', panel, handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query, { defaultLimit: 20, maxLimit: 50 });
  const [rows, total] = await Promise.all([
    TeamAnnouncement.find().sort({ pinned: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    TeamAnnouncement.countDocuments()
  ]);
  const files = await filesFor(rows);
  res.json({ success: true, data: rows.map((a) => publicAnnouncement(a, req.admin.id, files)), total, page, limit });
}));

router.get('/announcements/:id', panel, handle(async (req, res) => {
  const a = await announcementFor(req.params.id);
  const files = await filesFor([a]);
  res.json({ success: true, data: publicAnnouncement(a.toObject(), req.admin.id, files) });
}));

// Who has and hasn't acknowledged (managers)
router.get('/announcements/:id/acks', manage, handle(async (req, res) => {
  const a = await announcementFor(req.params.id);
  const people = await AdminUser.find(teamPeopleFilter, { _id: 1 }).lean();
  const acked = new Map(a.acks.map((x) => [String(x.adminId), x.at]));
  res.json({
    success: true,
    data: people.map((p) => ({ adminId: String(p._id), ackedAt: acked.get(String(p._id)) || null })),
    total: people.length,
    acked: people.filter((p) => acked.has(String(p._id))).length
  });
}));

router.post('/announcements', manage, handle(async (req, res) => {
  const title = clean(req.body?.title, MAX_TITLE);
  const body = String(req.body?.body ?? '').trim().slice(0, MAX_BODY);
  if (!title) throw httpError(400, 'Give the announcement a title.');
  if (!body) throw httpError(400, 'Write the announcement.');
  const a = new TeamAnnouncement({ title, body, important: !!req.body?.important, pinned: !!req.body?.pinned, createdBy: req.admin.id, acks: [{ adminId: req.admin.id, at: new Date() }] });
  a.fileIds = await attachFiles(req.admin, req.body?.fileIds, { scope: 'announcement', type: 'announcement', id: a._id }, { max: 5 });
  await a.save();

  const people = await AdminUser.find(teamPeopleFilter, { _id: 1 }).lean();
  await notify(people.map((p) => String(p._id)), { type: 'announcement', actorId: req.admin.id, refType: 'announcement', refId: a._id, preview: title });
  emitToTeam('announcement.created', { announcementId: String(a._id) });
  await audit(req, 'teamchat.announcement_posted', { targetType: 'team_announcement', targetId: a._id, targetLabel: title, details: { important: a.important } });
  // Emails go out after the response so posting stays fast
  emailAnnouncement(a.toObject(), req.admin).catch(() => {});

  const files = await filesFor([a]);
  res.json({ success: true, data: publicAnnouncement(a.toObject(), req.admin.id, files) });
}));

router.patch('/announcements/:id', manage, handle(async (req, res) => {
  const a = await announcementFor(req.params.id);
  if (req.body?.title !== undefined) {
    const title = clean(req.body.title, MAX_TITLE);
    if (!title) throw httpError(400, 'Give the announcement a title.');
    if (title !== a.title) { a.title = title; a.editedAt = new Date(); }
  }
  if (req.body?.body !== undefined) {
    const body = String(req.body.body ?? '').trim().slice(0, MAX_BODY);
    if (!body) throw httpError(400, 'Write the announcement.');
    if (body !== a.body) { a.body = body; a.editedAt = new Date(); }
  }
  if (typeof req.body?.pinned === 'boolean') a.pinned = req.body.pinned;
  if (typeof req.body?.important === 'boolean') a.important = req.body.important;
  await a.save();
  emitToTeam('announcement.updated', { announcementId: String(a._id) });
  const files = await filesFor([a]);
  res.json({ success: true, data: publicAnnouncement(a.toObject(), req.admin.id, files) });
}));

router.delete('/announcements/:id', manage, handle(async (req, res) => {
  const a = await announcementFor(req.params.id);
  await a.deleteOne();
  await softDeleteFiles(a.fileIds);
  await audit(req, 'teamchat.announcement_deleted', { targetType: 'team_announcement', targetId: a._id, targetLabel: a.title });
  emitToTeam('announcement.updated', { announcementId: String(a._id) });
  res.json({ success: true });
}));

router.post('/announcements/:id/ack', team, handle(async (req, res) => {
  const a = await announcementFor(req.params.id);
  await TeamAnnouncement.updateOne({ _id: a._id, 'acks.adminId': { $ne: req.admin.id } }, { $push: { acks: { adminId: req.admin.id, at: new Date() } } });
  emitToTeam('announcement.updated', { announcementId: String(a._id) });
  res.json({ success: true });
}));

// Toggles one emoji reaction
router.post('/announcements/:id/reactions', team, handle(async (req, res) => {
  const a = await announcementFor(req.params.id);
  const emoji = String(req.body?.emoji || '').trim();
  if (!emoji || emoji.length > 16 || /[\s<>]/.test(emoji)) throw httpError(400, 'Pick an emoji.');
  const me = String(req.admin.id);
  let reaction = a.reactions.find((r) => r.emoji === emoji);
  if (!reaction) {
    a.reactions.push({ emoji, adminIds: [] });
    reaction = a.reactions[a.reactions.length - 1];
  }
  const has = reaction.adminIds.some((id) => String(id) === me);
  reaction.adminIds = has ? reaction.adminIds.filter((id) => String(id) !== me) : [...reaction.adminIds, me];
  a.reactions = a.reactions.filter((r) => r.adminIds.length);
  await a.save();
  emitToTeam('announcement.updated', { announcementId: String(a._id) });
  res.json({ success: true, reacted: !has });
}));

export default router;

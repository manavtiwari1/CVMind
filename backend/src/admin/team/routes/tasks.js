import express from 'express';
import { AdminUser } from '../../models.js';
import { audit } from '../../audit.js';
import { clean, handle, httpError, isId, paging } from '../../util.js';
import { channelFor, isManager, MANAGE, oid, requireTeam, sameId, taskFor, visibleTaskFilter } from '../access.js';
import { attachFiles, softDeleteFiles } from '../files.js';
import { TASK_PRIORITIES, TeamChannel, TeamFile, TeamMessage, TeamSubmission, TeamTask, TeamTaskActivity, TeamTaskComment } from '../models.js';
import { notify, parseMentions, teamPeopleFilter } from '../notify.js';
import { emitToChannel, emitToUser } from '../realtime.js';
import { filesFor, publicComment, publicSubmission, publicTask } from '../serialize.js';
import { ROLES } from '../../permissions.js';

const router = express.Router();
const team = requireTeam();
const manage = requireTeam({ manage: true });

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;
const MAX_COMMENT = 4000;
const MAX_NOTE = 2000;
const MAX_TASK_FILES = 5;
// Statuses an assignee moves a task through by hand; Submitted and the review results come from actions
const WORK_STATUSES = ['todo', 'in_progress', 'blocked'];
const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
// Start of today in India, as a UTC Date
const istDayStart = (now = new Date()) => new Date(Math.floor((+now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS);

function parseDue(value) {
  if (value === null || value === '') return null;
  const d = new Date(value);
  if (isNaN(d)) throw httpError(400, 'Pick a valid due date.');
  return d;
}

async function teamPeople(ids) {
  const clean = [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(isId);
  if (!clean.length) return [];
  const found = await AdminUser.find({ _id: { $in: clean }, ...teamPeopleFilter }, { _id: 1 }).lean();
  if (found.length !== clean.length) throw httpError(400, 'One of the assignees is not on CVMind Team.');
  return clean;
}

const managerIds = async () => {
  const roles = Object.entries(ROLES).filter(([, r]) => r.permissions.includes(MANAGE)).map(([k]) => k);
  return (await AdminUser.find({ role: { $in: roles }, ...teamPeopleFilter }, { _id: 1 }).lean()).map((a) => String(a._id));
};

const log = (taskId, actorId, type, from = null, to = null) => TeamTaskActivity.create({ taskId, actorId, type, from, to });

// Everyone on a task gets live updates of it
function emitTask(task) {
  const people = new Set([String(task.createdBy), ...task.assigneeIds.map(String)]);
  for (const id of people) emitToUser(id, 'task.updated', { taskId: String(task._id) });
}

// Mentions in a task only reach people who can see it
const onTask = (task, ids) => ids.filter((id) => sameId(id, task.createdBy) || task.assigneeIds.some((a) => sameId(a, id)));

// ── List ─────────────────────────────────────────────────────────────────────
router.get('/tasks', team, handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query, { defaultLimit: 50 });
  const view = ['mine', 'created', 'all'].includes(req.query.view) ? req.query.view : 'mine';
  const me = oid(req.admin.id);
  const filter = { ...visibleTaskFilter(req.admin) };
  if (view === 'mine') filter.assigneeIds = me;
  if (view === 'created') filter.createdBy = me;
  if (view === 'all' && !isManager(req.admin)) throw httpError(403, 'Only managers can see every task.');

  if (req.query.status === 'open') filter.status = { $ne: 'approved' };
  else if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  if (isId(req.query.assignee)) filter.assigneeIds = view === 'mine' ? me : oid(req.query.assignee);
  if (TASK_PRIORITIES.includes(req.query.priority)) filter.priority = req.query.priority;

  const now = new Date();
  const today = istDayStart(now);
  if (req.query.due === 'overdue') Object.assign(filter, { dueAt: { $lt: now }, status: { $ne: 'approved' } });
  if (req.query.due === 'today') filter.dueAt = { $gte: today, $lt: new Date(+today + DAY_MS) };
  if (req.query.due === 'week') filter.dueAt = { $gte: today, $lt: new Date(+today + 7 * DAY_MS) };
  if (req.query.due === 'none') filter.dueAt = null;

  // Sorted in the database through a computed key, so every page is in order. Tasks without a
  // due date go last when sorting by due date.
  const sortKey = req.query.sort === 'updated' ? { updatedAt: -1 }
    : req.query.sort === 'priority' ? { _rank: 1, dueSort: 1 }
      : { dueSort: 1, updatedAt: -1 };
  const [rows, total] = await Promise.all([
    TeamTask.aggregate([
      { $match: filter },
      { $addFields: {
        dueSort: { $ifNull: ['$dueAt', new Date(8.64e15)] },
        _rank: { $switch: { branches: Object.entries(PRIORITY_RANK).map(([p, r]) => ({ case: { $eq: ['$priority', p] }, then: r })), default: 9 } }
      } },
      { $sort: sortKey },
      { $skip: skip },
      { $limit: limit }
    ]),
    TeamTask.countDocuments(filter)
  ]);
  const files = await filesFor(rows);
  res.json({ success: true, data: rows.map((t) => publicTask(t, files)), total, page, limit });
}));

// ── Create ───────────────────────────────────────────────────────────────────
router.post('/tasks', team, handle(async (req, res) => {
  const title = clean(req.body?.title, MAX_TITLE);
  if (!title) throw httpError(400, 'Give the task a title.');
  const description = String(req.body?.description ?? '').trim().slice(0, MAX_DESCRIPTION);
  const priority = TASK_PRIORITIES.includes(req.body?.priority) ? req.body.priority : 'normal';
  const dueAt = req.body?.dueAt ? parseDue(req.body.dueAt) : null;

  let assigneeIds = await teamPeople(req.body?.assigneeIds);
  if (!isManager(req.admin)) {
    // Members plan their own work only
    if (assigneeIds.some((id) => !sameId(id, req.admin.id))) throw httpError(403, 'Only managers can assign tasks to other people.');
    assigneeIds = [req.admin.id];
  }
  if (!assigneeIds.length) throw httpError(400, 'Assign the task to at least one person.');

  let source = null;
  if (req.body?.sourceMessageId) {
    if (!isId(req.body.sourceMessageId)) throw httpError(404, 'Message not found.');
    source = await TeamMessage.findById(req.body.sourceMessageId).lean();
    if (!source || source.deletedAt) throw httpError(404, 'Message not found.');
    await channelFor(req.admin, source.channelId);
  }

  const task = new TeamTask({
    title, description, priority, dueAt, assigneeIds, createdBy: req.admin.id,
    sourceMessageId: source?._id || null, sourceChannelId: source?.channelId || null
  });
  task.fileIds = await attachFiles(req.admin, req.body?.fileIds, { scope: 'task', scopeId: null, type: 'task', id: task._id, setScopeId: task._id }, { max: MAX_TASK_FILES });
  await task.save();
  await log(task._id, req.admin.id, 'created', null, { title, assigneeIds });

  await notify(assigneeIds, { type: 'task_assigned', actorId: req.admin.id, refType: 'task', refId: task._id, taskId: task._id, preview: title });
  const mentioned = onTask(task, await parseMentions(description)).filter((id) => !assigneeIds.includes(id));
  await notify(mentioned, { type: 'mention', actorId: req.admin.id, refType: 'task', refId: task._id, taskId: task._id, preview: title });

  // "Task created → …" in the thread of the message it came from
  if (source) {
    const parentId = source.parentId || source._id;
    const note = await TeamMessage.create({ channelId: source.channelId, authorId: req.admin.id, kind: 'system', parentId, taskId: task._id, body: `Task created: ${title}` });
    await TeamMessage.updateOne({ _id: parentId }, { $inc: { replyCount: 1 }, lastReplyAt: note.createdAt });
    emitToChannel(String(source.channelId), 'message.created', { channelId: String(source.channelId), messageId: String(note._id), parentId: String(parentId), authorId: req.admin.id });
  }

  emitTask(task);
  const files = await filesFor([task]);
  res.json({ success: true, data: publicTask(task.toObject(), files) });
}));

// ── Detail ───────────────────────────────────────────────────────────────────
router.get('/tasks/:id', team, handle(async (req, res) => {
  const task = await taskFor(req.admin, req.params.id);
  const [submissions, activity] = await Promise.all([
    TeamSubmission.find({ taskId: task._id }).sort({ version: -1 }).lean(),
    TeamTaskActivity.find({ taskId: task._id }).sort({ createdAt: 1 }).limit(300).lean()
  ]);
  let source = null;
  if (task.sourceMessageId) {
    const msg = await TeamMessage.findById(task.sourceMessageId).lean();
    const channel = msg ? await TeamChannel.findById(msg.channelId, { name: 1, kind: 1 }).lean() : null;
    // Only shown to people who can read where it came from
    const readable = msg && channel && (await channelFor(req.admin, msg.channelId).then(() => true, () => false));
    if (readable) source = { messageId: String(msg._id), channelId: String(msg.channelId), channelName: channel.kind === 'dm' ? '' : channel.name, excerpt: msg.deletedAt ? '' : msg.body.slice(0, 200), authorId: String(msg.authorId) };
  }
  const files = await filesFor([task, ...submissions]);
  res.json({
    success: true,
    data: publicTask(task.toObject(), files),
    submissions: submissions.map((s) => publicSubmission(s, files)),
    activity: activity.map((a) => ({ id: String(a._id), actorId: String(a.actorId), type: a.type, from: a.from, to: a.to, createdAt: a.createdAt })),
    source,
    canReview: isManager(req.admin),
    canEdit: isManager(req.admin) || sameId(task.createdBy, req.admin.id)
  });
}));

// ── Update ───────────────────────────────────────────────────────────────────
router.patch('/tasks/:id', team, handle(async (req, res) => {
  const task = await taskFor(req.admin, req.params.id);
  const manager = isManager(req.admin);
  const creator = sameId(task.createdBy, req.admin.id);
  const assignee = task.assigneeIds.some((a) => sameId(a, req.admin.id));
  const canEdit = manager || creator;
  const body = req.body || {};
  const actor = req.admin.id;
  const changes = [];

  if (body.title !== undefined || body.description !== undefined || body.priority !== undefined || body.dueAt !== undefined || body.assigneeIds !== undefined) {
    if (!canEdit) throw httpError(403, 'Only the person who created the task or a manager can change it.');
  }
  if (body.title !== undefined) {
    const title = clean(body.title, MAX_TITLE);
    if (!title) throw httpError(400, 'Give the task a title.');
    if (title !== task.title) { changes.push(['title', task.title, title]); task.title = title; }
  }
  let newMentions = [];
  if (body.description !== undefined) {
    const description = String(body.description ?? '').trim().slice(0, MAX_DESCRIPTION);
    if (description !== task.description) {
      const before = new Set(await parseMentions(task.description));
      newMentions = (await parseMentions(description)).filter((id) => !before.has(id));
      changes.push(['description', null, null]);
      task.description = description;
    }
  }
  if (body.priority !== undefined && TASK_PRIORITIES.includes(body.priority) && body.priority !== task.priority) {
    changes.push(['priority', task.priority, body.priority]);
    task.priority = body.priority;
  }
  if (body.dueAt !== undefined) {
    const dueAt = parseDue(body.dueAt);
    if (String(dueAt?.getTime() ?? '') !== String(task.dueAt?.getTime() ?? '')) {
      changes.push(['due', task.dueAt, dueAt]);
      task.dueAt = dueAt;
      task.dueSoonNotifiedAt = null;
    }
  }
  let added = [];
  let removed = [];
  if (body.assigneeIds !== undefined) {
    let next = await teamPeople(body.assigneeIds);
    if (!manager && next.some((id) => !sameId(id, actor))) throw httpError(403, 'Only managers can assign tasks to other people.');
    if (!next.length) throw httpError(400, 'Assign the task to at least one person.');
    const before = task.assigneeIds.map(String);
    added = next.filter((id) => !before.includes(id));
    removed = before.filter((id) => !next.includes(id));
    if (added.length || removed.length) {
      changes.push(['assignees', before, next]);
      task.assigneeIds = next;
    }
  }

  if (body.status !== undefined && body.status !== task.status) {
    const to = body.status;
    // Someone planning their own work can tick it off; managers can close any task
    const selfTask = creator && task.assigneeIds.length === 1 && assignee;
    if (to === 'approved') {
      if (!manager && !selfTask) throw httpError(403, 'Submit your work so a manager can approve it.');
    } else if (!WORK_STATUSES.includes(to)) {
      throw httpError(400, 'Use Submit work, or ask a manager to review it.');
    } else if (!assignee && !canEdit) {
      throw httpError(403, 'Only the people on this task can change its status.');
    }
    if (to === 'blocked') {
      const reason = clean(body.blockedReason, 300);
      if (!reason) throw httpError(400, 'Say what is blocking the task.');
      task.blockedReason = reason;
    } else {
      task.blockedReason = '';
    }
    changes.push(['status', task.status, to]);
    task.status = to;
    task.completedAt = to === 'approved' ? new Date() : null;
  }

  if (!changes.length) return res.json({ success: true, data: publicTask(task.toObject(), await filesFor([task])) });
  await task.save();
  for (const [type, from, to] of changes) await log(task._id, actor, type, from, to);

  const base = { actorId: actor, refType: 'task', refId: task._id, taskId: task._id, preview: task.title };
  await notify(added, { ...base, type: 'task_assigned' });
  await notify(removed, { ...base, type: 'task_unassigned' });
  const stayed = task.assigneeIds.map(String).filter((id) => !added.includes(id));
  if (changes.some(([t]) => t === 'due' || t === 'title' || t === 'priority')) await notify(stayed, { ...base, type: 'task_updated' });
  if (changes.some(([t]) => t === 'status')) await notify([String(task.createdBy), ...stayed], { ...base, type: 'task_updated', preview: `${task.title}: ${task.status.replace('_', ' ')}` });
  await notify(onTask(task, newMentions), { ...base, type: 'mention' });
  if (changes.some(([t]) => t === 'status' || t === 'assignees')) {
    await audit(req, 'teamchat.task_updated', { targetType: 'team_task', targetId: task._id, targetLabel: task.title, details: Object.fromEntries(changes.filter(([t]) => t === 'status' || t === 'assignees').map(([t, f, to]) => [t, { from: f, to }])) });
  }
  emitTask(task);
  for (const id of removed) emitToUser(id, 'task.updated', { taskId: String(task._id) });
  res.json({ success: true, data: publicTask(task.toObject(), await filesFor([task])) });
}));

router.delete('/tasks/:id', manage, handle(async (req, res) => {
  const task = await taskFor(req.admin, req.params.id);
  await Promise.all([
    TeamTask.deleteOne({ _id: task._id }),
    TeamTaskComment.deleteMany({ taskId: task._id }),
    TeamSubmission.deleteMany({ taskId: task._id }),
    TeamTaskActivity.deleteMany({ taskId: task._id })
  ]);
  const fileIds = (await TeamFile.find({ scope: 'task', scopeId: task._id }, { _id: 1 }).lean()).map((f) => f._id);
  await softDeleteFiles(fileIds);
  await audit(req, 'teamchat.task_deleted', { targetType: 'team_task', targetId: task._id, targetLabel: task.title });
  emitTask(task);
  res.json({ success: true });
}));

// ── Comments ─────────────────────────────────────────────────────────────────
router.get('/tasks/:id/comments', team, handle(async (req, res) => {
  const task = await taskFor(req.admin, req.params.id);
  const rows = await TeamTaskComment.find({ taskId: task._id }).sort({ createdAt: 1 }).limit(500).lean();
  const files = await filesFor(rows);
  res.json({ success: true, data: rows.map((c) => publicComment(c, files)) });
}));

router.post('/tasks/:id/comments', team, handle(async (req, res) => {
  const task = await taskFor(req.admin, req.params.id);
  const body = String(req.body?.body ?? '').trim();
  if (body.length > MAX_COMMENT) throw httpError(400, `Comments can be up to ${MAX_COMMENT} characters.`);
  const fileIds = Array.isArray(req.body?.fileIds) ? req.body.fileIds : [];
  if (!body && !fileIds.length) throw httpError(400, 'Write a comment or attach a file.');
  const mentions = onTask(task, await parseMentions(body));
  const comment = new TeamTaskComment({ taskId: task._id, authorId: req.admin.id, body, mentions });
  comment.fileIds = await attachFiles(req.admin, fileIds, { scope: 'task', scopeId: task._id, type: 'comment', id: comment._id }, { max: MAX_TASK_FILES });
  await comment.save();
  await TeamTask.updateOne({ _id: task._id }, { updatedAt: new Date() });

  const base = { actorId: req.admin.id, refType: 'task', refId: task._id, taskId: task._id, preview: `${task.title}: ${body || 'sent a file'}` };
  await notify(mentions, { ...base, type: 'mention' });
  const people = [String(task.createdBy), ...task.assigneeIds.map(String)].filter((id) => !mentions.includes(id));
  await notify(people, { ...base, type: 'task_comment' });
  emitTask(task);
  const files = await filesFor([comment]);
  res.json({ success: true, data: publicComment(comment.toObject(), files) });
}));

// ── Submissions and review ───────────────────────────────────────────────────
router.post('/tasks/:id/submissions', team, handle(async (req, res) => {
  const task = await taskFor(req.admin, req.params.id);
  if (!task.assigneeIds.some((a) => sameId(a, req.admin.id))) throw httpError(403, 'Only the people assigned to this task can submit work.');
  if (task.status === 'approved') throw httpError(400, 'This task is already approved.');
  if (task.status === 'submitted') throw httpError(400, 'Your last submission is still waiting for review.');
  const note = String(req.body?.note ?? '').trim().slice(0, MAX_NOTE);
  const fileIdsIn = Array.isArray(req.body?.fileIds) ? req.body.fileIds : [];
  if (!fileIdsIn.length) throw httpError(400, 'Attach at least one file.');

  const last = await TeamSubmission.findOne({ taskId: task._id }).sort({ version: -1 }).lean();
  const submission = new TeamSubmission({
    taskId: task._id, authorId: req.admin.id, version: (last?.version || 0) + 1, note,
    late: !!task.dueAt && new Date() > task.dueAt
  });
  submission.fileIds = await attachFiles(req.admin, fileIdsIn, { scope: 'task', scopeId: task._id, type: 'submission', id: submission._id }, { max: MAX_TASK_FILES });
  await submission.save();
  const from = task.status;
  task.status = 'submitted';
  task.blockedReason = '';
  await task.save();
  await log(task._id, req.admin.id, 'submitted', from, { version: submission.version });

  // The person who created it reviews; if a member created it, managers do
  const creator = await AdminUser.findById(task.createdBy, { role: 1 }).lean();
  const creatorManages = !!ROLES[creator?.role]?.permissions.includes(MANAGE);
  const reviewers = creatorManages ? [String(task.createdBy)] : await managerIds();
  await notify(reviewers, { type: 'submission', actorId: req.admin.id, refType: 'task', refId: task._id, taskId: task._id, preview: `${task.title} (v${submission.version}${submission.late ? ', late' : ''})` });
  emitTask(task);
  const files = await filesFor([submission]);
  res.json({ success: true, data: publicSubmission(submission.toObject(), files) });
}));

router.post('/submissions/:id/review', manage, handle(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Submission not found.');
  const submission = await TeamSubmission.findById(req.params.id);
  if (!submission) throw httpError(404, 'Submission not found.');
  const task = await taskFor(req.admin, submission.taskId);
  const latest = await TeamSubmission.findOne({ taskId: task._id }).sort({ version: -1 }).lean();
  if (!sameId(latest._id, submission._id)) throw httpError(400, 'Only the latest submission can be reviewed.');
  if (submission.review.status !== 'pending') throw httpError(400, 'This submission was already reviewed.');
  const decision = req.body?.decision;
  if (!['approve', 'changes'].includes(decision)) throw httpError(400, 'Choose Approve or Request changes.');
  const comment = String(req.body?.comment ?? '').trim().slice(0, MAX_COMMENT);
  if (decision === 'changes' && !comment) throw httpError(400, 'Say what needs to change.');

  submission.review = { status: decision === 'approve' ? 'approved' : 'changes_requested', by: req.admin.id, comment, at: new Date() };
  await submission.save();
  const from = task.status;
  task.status = decision === 'approve' ? 'approved' : 'changes_requested';
  task.completedAt = decision === 'approve' ? new Date() : null;
  await task.save();
  await log(task._id, req.admin.id, decision === 'approve' ? 'approved' : 'changes_requested', from, { version: submission.version, comment });
  await audit(req, 'teamchat.submission_reviewed', { targetType: 'team_task', targetId: task._id, targetLabel: task.title, details: { version: submission.version, decision } });
  await notify(task.assigneeIds, {
    type: decision === 'approve' ? 'review_approved' : 'review_changes', actorId: req.admin.id, refType: 'task', refId: task._id, taskId: task._id,
    preview: decision === 'approve' ? task.title : `${task.title}: ${comment}`
  });
  emitTask(task);
  const files = await filesFor([submission]);
  res.json({ success: true, data: publicSubmission(submission.toObject(), files) });
}));

export default router;

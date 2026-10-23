import express from 'express';
import { AdminUser } from '../../models.js';
import { handle, httpError, isId } from '../../util.js';
import { callDeepSeek } from '../../../services/gemini.js';
import { channelFor, isManager, oid, requireTeam } from '../access.js';
import { TASK_PRIORITIES, TeamAiUsage, TeamLeave, TeamMessage, TeamStandup, TeamSubmission, TeamTask } from '../models.js';
import { istDay, isWorkingDay, teamPeopleFilter } from '../notify.js';

// Leo in CVMind Team: channel summaries, task drafts from a message, and progress reports.
// Leo only reads what the person asking can already see.
const router = express.Router();
const team = requireTeam();
const manage = requireTeam({ manage: true });

export const LEO_DAILY_LIMIT = 30;
const MAX_MESSAGES = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

// Tests swap in a fake model
let model = callDeepSeek;
export const setLeoModel = (fn) => { model = fn || callDeepSeek; };

// Counts one Leo call against today's limit, or refuses once it is used up
export async function useLeo(adminId) {
  const day = istDay();
  try {
    const row = await TeamAiUsage.findOneAndUpdate(
      { adminId, day, count: { $lt: LEO_DAILY_LIMIT } },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    return LEO_DAILY_LIMIT - row.count;
  } catch (err) {
    // The upsert collides with today's row once the count reached the limit
    if (err?.code === 11000) throw httpError(429, `You've used Leo ${LEO_DAILY_LIMIT} times today. It resets at midnight.`);
    throw err;
  }
}

export async function askLeo(args) {
  try {
    return await model({ temperature: 0.2, maxTokens: 1500, ...args });
  } catch (err) {
    console.error('[team] Leo failed:', err.message);
    throw httpError(502, 'Leo could not answer just now. Try again in a minute.');
  }
}

// "Riya (@riya): text" lines, oldest first, for the model
async function transcript(messages) {
  const ids = [...new Set(messages.map((m) => String(m.authorId)))];
  const people = new Map((await AdminUser.find({ _id: { $in: ids } }, { name: 1, username: 1 }).lean()).map((a) => [String(a._id), a]));
  return messages.map((m) => {
    const p = people.get(String(m.authorId));
    const when = new Date(m.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    return `[${when}] ${p ? `${p.name || p.username} (@${p.username})` : 'Someone'}: ${m.body}`;
  }).join('\n');
}

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '2-5 sentences on what was discussed' },
    decisions: { type: 'array', items: { type: 'string' } },
    actionItems: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, owner: { type: 'string', description: 'the @username responsible, or empty' } } } },
    openQuestions: { type: 'array', items: { type: 'string' } }
  },
  required: ['summary', 'decisions', 'actionItems', 'openQuestions']
};

const list = (v, max = 12) => (Array.isArray(v) ? v : []).slice(0, max);
const str = (v, max = 600) => String(v ?? '').trim().slice(0, max);

export function cleanSummary(out) {
  return {
    summary: str(out?.summary, 1500),
    decisions: list(out?.decisions).map((d) => str(d)).filter(Boolean),
    actionItems: list(out?.actionItems).map((a) => ({ text: str(a?.text ?? a), owner: str(a?.owner, 60).replace(/^@/, '') })).filter((a) => a.text),
    openQuestions: list(out?.openQuestions).map((q) => str(q)).filter(Boolean)
  };
}

// ── Summarise a channel or a thread ──────────────────────────────────────────
router.post('/leo/summary', team, handle(async (req, res) => {
  const { channel } = await channelFor(req.admin, req.body?.channelId);
  let messages;
  if (req.body?.threadId) {
    if (!isId(req.body.threadId)) throw httpError(404, 'Thread not found.');
    const parent = await TeamMessage.findOne({ _id: req.body.threadId, channelId: channel._id }).lean();
    if (!parent) throw httpError(404, 'Thread not found.');
    const replies = await TeamMessage.find({ parentId: parent._id, deletedAt: null, kind: 'user' }).sort({ createdAt: -1 }).limit(MAX_MESSAGES - 1).lean();
    messages = [parent, ...replies.reverse()].filter((m) => !m.deletedAt);
  } else {
    messages = (await TeamMessage.find({ channelId: channel._id, parentId: null, deletedAt: null, kind: 'user' }).sort({ createdAt: -1 }).limit(MAX_MESSAGES).lean()).reverse();
  }
  messages = messages.filter((m) => m.body?.trim());
  if (messages.length < 2) throw httpError(400, 'There is not enough here to summarise yet.');
  const remaining = await useLeo(req.admin.id);

  const where = channel.kind === 'dm' ? 'a direct message' : `the #${channel.name} channel`;
  const out = await askLeo({
    systemInstruction: `You are Leo, the assistant inside CVMind Team, an internal workspace. Summarise ${req.body?.threadId ? 'a thread in' : 'recent messages in'} ${where} for a teammate catching up. Be factual and brief; only use what the messages say. Name people by their @username in action items.`,
    prompt: `Messages, oldest first:\n${await transcript(messages)}`,
    responseSchema: SUMMARY_SCHEMA
  });
  res.json({ success: true, data: { ...cleanSummary(out), messageCount: messages.length, from: messages[0].createdAt, to: messages.at(-1).createdAt }, remaining });
}));

// ── Draft a task from a message ──────────────────────────────────────────────
router.post('/leo/task-draft', team, handle(async (req, res) => {
  if (req.admin.teamOnly) throw httpError(403, 'Only managers and staff can create tasks.');
  if (!isId(req.body?.messageId)) throw httpError(404, 'Message not found.');
  const message = await TeamMessage.findById(req.body.messageId).lean();
  if (!message || message.deletedAt) throw httpError(404, 'Message not found.');
  const { channel } = await channelFor(req.admin, message.channelId);
  // A little context: the messages just before it (in the thread, if it's a reply)
  const before = await TeamMessage.find({ channelId: channel._id, parentId: message.parentId || null, deletedAt: null, kind: 'user', createdAt: { $lt: message.createdAt } })
    .sort({ createdAt: -1 }).limit(6).lean();
  const people = await AdminUser.find(teamPeopleFilter, { name: 1, username: 1 }).lean();
  const remaining = await useLeo(req.admin.id);

  const now = new Date();
  const out = await askLeo({
    systemInstruction: 'You are Leo, the assistant inside CVMind Team. Turn a chat message into one clear task. The title is a short imperative (under 80 characters). The description lists what to do and anything the message says about it, in plain sentences or short bullet lines. Only suggest a due date when the messages mention one. Suggest assignees only from the people list, by username.',
    prompt: [
      `Now (India time): ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
      `People: ${people.map((p) => `@${p.username} (${p.name || p.username})`).join(', ')}`,
      before.length ? `Earlier messages:\n${await transcript(before.reverse())}` : '',
      `The message to turn into a task:\n${await transcript([message])}`
    ].filter(Boolean).join('\n\n'),
    responseSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: TASK_PRIORITIES },
        dueAt: { type: ['string', 'null'], description: 'ISO 8601 in India time (+05:30), or null' },
        assignees: { type: 'array', items: { type: 'string', description: 'username' } }
      },
      required: ['title', 'description', 'priority', 'dueAt', 'assignees']
    }
  });

  const byName = new Map(people.map((p) => [p.username.toLowerCase(), String(p._id)]));
  let assigneeIds = [...new Set(list(out?.assignees, 10).map((u) => byName.get(String(u).replace(/^@/, '').toLowerCase())).filter(Boolean))];
  // Members plan only their own work
  if (!isManager(req.admin)) assigneeIds = [req.admin.id];
  const due = out?.dueAt ? new Date(out.dueAt) : null;
  res.json({
    success: true,
    data: {
      title: str(out?.title, 200) || str(message.body.split('\n')[0], 120),
      description: str(out?.description, 5000),
      priority: TASK_PRIORITIES.includes(out?.priority) ? out.priority : 'normal',
      dueAt: due && !isNaN(due) && due > now ? due.toISOString() : null,
      assigneeIds
    },
    remaining
  });
}));

// ── Progress report (managers) ───────────────────────────────────────────────
router.get('/leo/report', manage, handle(async (req, res) => {
  if (!isId(req.query.adminId)) throw httpError(400, 'Pick a person.');
  const person = await AdminUser.findById(req.query.adminId, { name: 1, username: 1, role: 1 }).lean();
  if (!person) throw httpError(404, 'Person not found.');
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(+to - 7 * DAY_MS);
  if (isNaN(from) || isNaN(to) || from >= to) throw httpError(400, 'Pick a valid date range.');
  if (+to - +from > 62 * DAY_MS) throw httpError(400, 'A report can cover up to two months.');
  const id = oid(person._id);
  const [fromDay, toDay] = [istDay(from), istDay(to)];

  const [completed, open, submissions, standups, leaves] = await Promise.all([
    TeamTask.find({ assigneeIds: id, completedAt: { $gte: from, $lte: to } }).lean(),
    TeamTask.find({ assigneeIds: id, status: { $ne: 'approved' } }).lean(),
    TeamSubmission.find({ authorId: id, createdAt: { $gte: from, $lte: to } }).lean(),
    TeamStandup.find({ adminId: id, day: { $gte: fromDay, $lte: toDay } }).sort({ day: 1 }).lean(),
    TeamLeave.find({ adminId: id, status: 'approved', from: { $lte: toDay }, to: { $gte: fromDay } }).lean()
  ]);

  const workingDays = [];
  for (let d = new Date(`${fromDay}T00:00:00Z`); d <= new Date(`${toDay}T00:00:00Z`); d = new Date(+d + DAY_MS)) {
    const day = d.toISOString().slice(0, 10);
    if (isWorkingDay(day) && !leaves.some((l) => l.kind !== 'wfh' && l.from <= day && l.to >= day)) workingDays.push(day);
  }
  const onTime = completed.filter((t) => !t.dueAt || t.completedAt <= t.dueAt).length;
  const reviewed = submissions.filter((s) => s.review?.status && s.review.status !== 'pending');
  const stats = {
    completed: completed.length,
    completedOnTime: onTime,
    completedLate: completed.length - onTime,
    submissions: submissions.length,
    approved: reviewed.filter((s) => s.review.status === 'approved').length,
    changesRequested: reviewed.filter((s) => s.review.status === 'changes_requested').length,
    openTasks: open.length,
    overdue: open.filter((t) => t.dueAt && t.dueAt < new Date()).length,
    checkIns: standups.length,
    workingDays: workingDays.length,
    blockers: standups.filter((s) => s.blockers).length,
    leaveDays: leaves.reduce((n, l) => n + Math.max(0, Math.min(+new Date(`${l.to}T00:00:00Z`), +new Date(`${toDay}T00:00:00Z`)) - Math.max(+new Date(`${l.from}T00:00:00Z`), +new Date(`${fromDay}T00:00:00Z`))) / DAY_MS + 1, 0)
  };

  const remaining = await useLeo(req.admin.id);
  const lines = (rows, fn) => rows.slice(0, 40).map(fn).join('\n') || '(none)';
  const out = await askLeo({
    systemInstruction: 'You are Leo, the assistant inside CVMind Team. Write a short, fair progress report on one team member for their manager. Use only the data given. Be specific about tasks and patterns; no praise or criticism the data does not support.',
    prompt: [
      `Person: ${person.name || person.username} (@${person.username})`,
      `Period: ${fromDay} to ${toDay}`,
      `Numbers: ${JSON.stringify(stats)}`,
      `Tasks completed:\n${lines(completed, (t) => `- ${t.title} (due ${t.dueAt ? istDay(t.dueAt) : 'none'}, done ${istDay(t.completedAt)})`)}`,
      `Open tasks:\n${lines(open, (t) => `- ${t.title} [${t.status}]${t.dueAt ? ` due ${istDay(t.dueAt)}` : ''}${t.blockedReason ? `, blocked: ${t.blockedReason}` : ''}`)}`,
      `Review feedback:\n${lines(reviewed.filter((s) => s.review.comment), (s) => `- ${s.review.status}: ${s.review.comment}`)}`,
      `Check-ins:\n${lines(standups, (s) => `- ${s.day}: did "${s.done}"; doing "${s.doing}"${s.blockers ? `; blocked "${s.blockers}"` : ''}`)}`
    ].join('\n\n'),
    responseSchema: {
      type: 'object',
      properties: {
        headline: { type: 'string', description: 'one sentence' },
        highlights: { type: 'array', items: { type: 'string' } },
        concerns: { type: 'array', items: { type: 'string' } },
        suggestions: { type: 'array', items: { type: 'string' } }
      },
      required: ['headline', 'highlights', 'concerns', 'suggestions']
    }
  });
  res.json({
    success: true,
    data: {
      adminId: String(person._id), from: fromDay, to: toDay, stats,
      headline: str(out?.headline, 400),
      highlights: list(out?.highlights, 8).map((x) => str(x)).filter(Boolean),
      concerns: list(out?.concerns, 8).map((x) => str(x)).filter(Boolean),
      suggestions: list(out?.suggestions, 6).map((x) => str(x)).filter(Boolean)
    },
    remaining
  });
}));

// How many Leo calls are left today
router.get('/leo/usage', team, handle(async (req, res) => {
  const row = await TeamAiUsage.findOne({ adminId: req.admin.id, day: istDay() }).lean();
  res.json({ success: true, limit: LEO_DAILY_LIMIT, remaining: Math.max(0, LEO_DAILY_LIMIT - (row?.count || 0)) });
}));

export default router;

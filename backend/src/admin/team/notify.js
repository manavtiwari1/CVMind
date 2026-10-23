import { AdminUser, AppSetting } from '../models.js';
import { emailConfigured, escapeHtml, renderEmail, sendEmail } from '../mailer.js';
import { ROLES } from '../permissions.js';
import { MANAGE, sameId } from './access.js';
import { pushConfigured, sendPush } from './push.js';
import { emitToUser } from './realtime.js';
import { TeamChannel, TeamChannelMember, TeamLeave, TeamNotification, TeamStandup, TeamTask } from './models.js';

export const TEAM_APP_URL = (process.env.TEAM_APP_URL || 'https://team.cvmind.in').replace(/\/$/, '');

const DIGEST_DELAY_MS = 30 * 60 * 1000;
const WORKER_INTERVAL_MS = 10 * 60 * 1000;
const DUE_SOON_MS = 2 * 60 * 60 * 1000;
// 09:00 IST is 03:30 UTC
const REMINDER_UTC_MINUTES = 3 * 60 + 30;
// 10:30 IST is 05:00 UTC
const STANDUP_UTC_MINUTES = 5 * 60;

// People who can use the team app right now
export const teamPeopleFilter = { active: true, chatAccess: { $ne: false } };

// "@riya please check, @channel FYI" → admin ids of the mentioned people (and everyone in the channel
// for @channel / @here, which only managers may use)
export async function parseMentions(body, { channelId = null, allowChannel = false } = {}) {
  const names = [...new Set([...String(body || '').matchAll(/(^|[^\w@.])@([a-z0-9._-]{2,40})/gi)].map((m) => m[2].toLowerCase()))];
  if (!names.length) return [];
  const ids = new Set();
  if (allowChannel && channelId && names.some((n) => n === 'channel' || n === 'here')) {
    const members = await TeamChannelMember.find({ channelId }, { adminId: 1 }).lean();
    members.forEach((m) => ids.add(String(m.adminId)));
  }
  const people = await AdminUser.find({ username: { $in: names }, ...teamPeopleFilter }, { _id: 1 }).lean();
  people.forEach((p) => ids.add(String(p._id)));
  return [...ids];
}

// Stores one notification per recipient (never the actor) and pushes it live
export async function notify(recipientIds, { type, actorId = null, refType = '', refId = null, channelId = null, taskId = null, preview = '' }) {
  const ids = [...new Set((recipientIds || []).map(String))].filter((id) => !actorId || !sameId(id, actorId));
  if (!ids.length) return;
  // A muted channel only lets mentions through
  let muted = new Set();
  if (channelId && type !== 'mention') {
    const rows = await TeamChannelMember.find({ channelId, adminId: { $in: ids }, muted: true }, { adminId: 1 }).lean();
    muted = new Set(rows.map((r) => String(r.adminId)));
  }
  const docs = ids.filter((id) => !muted.has(id)).map((adminId) => ({
    adminId, type, actorId, refType, refId, channelId, taskId, preview: String(preview || '').slice(0, 200)
  }));
  if (!docs.length) return;
  const created = await TeamNotification.insertMany(docs);
  for (const n of created) emitToUser(String(n.adminId), 'notification.new', { id: String(n._id), type: n.type });
  // Push runs in the background so it never slows down the request that caused it
  lastPush = pushNotifications(created).catch((err) => console.error('[team] push failed:', err.message));
}

// The latest background push, so tests can wait for it
let lastPush = Promise.resolve();
export const pushSettled = () => lastPush;

// The app link a notification opens (hash routes, relative to the app)
export function notificationPath(n) {
  if (n.taskId) return `#/tasks/${n.taskId}`;
  if (n.refType === 'meeting' && n.refId) return `#/meet/${n.refId}`;
  if (n.type === 'standup_blocker') return '#/checkin?tab=team';
  if (n.refType === 'standup') return '#/checkin';
  if (n.type === 'leave_requested') return '#/checkin?tab=requests';
  if (n.refType === 'leave') return '#/checkin?tab=leave';
  if (n.refType === 'announcement' && n.refId) return `#/announcements/${n.refId}`;
  if (n.channelId && n.refType === 'message' && n.refId) return `#/chat/${n.channelId}?m=${n.refId}`;
  if (n.channelId) return `#/chat/${n.channelId}`;
  return '#/home';
}

async function pushNotifications(created) {
  if (!pushConfigured()) return;
  const actorIds = [...new Set(created.map((n) => String(n.actorId || '')).filter(Boolean))];
  const actors = new Map((await AdminUser.find({ _id: { $in: actorIds } }, { name: 1, username: 1 }).lean()).map((a) => [String(a._id), a.name || a.username]));
  await sendPush(created.map((n) => {
    const who = n.actorId ? actors.get(String(n.actorId)) : '';
    return {
      adminId: n.adminId,
      payload: {
        title: who ? `${who} ${notificationLabel(n.type)}` : notificationLabel(n.type),
        body: n.preview || 'Open CVMind Team to see it.',
        url: notificationPath(n),
        // Updates from the same task or chat replace each other instead of piling up
        tag: n.taskId ? `task-${n.taskId}` : n.channelId ? `chat-${n.channelId}` : `n-${n._id}`,
        id: String(n._id)
      }
    };
  }));
}

const LABELS = {
  mention: 'mentioned you',
  dm: 'sent you a message',
  thread_reply: 'replied in a thread',
  task_assigned: 'assigned you a task',
  task_unassigned: 'removed you from a task',
  task_updated: 'updated a task',
  task_comment: 'commented on a task',
  submission: 'submitted work',
  review_approved: 'approved your work',
  review_changes: 'asked for changes',
  announcement: 'posted an announcement',
  task_due_soon: 'Task due soon',
  added_to_channel: 'added you to a channel',
  standup_reminder: 'Time for your daily check-in',
  standup_blocker: 'reported a blocker in their check-in',
  leave_requested: 'requested leave',
  leave_approved: 'approved your leave',
  leave_declined: 'declined your leave',
  meeting_started: 'started a call',
  meeting_scheduled: 'invited you to a meeting',
  meeting_moved: 'moved a meeting',
  meeting_cancelled: 'cancelled a meeting',
  meeting_soon: 'Meeting starts in 10 minutes',
  meeting_notes: "Leo's meeting notes are ready",
  meeting_recording: 'saved a meeting recording'
};
export const notificationLabel = (type) => LABELS[type] || 'New activity';

// Emails a digest of notifications left unread for 30 minutes, at most one email per person per run
export async function sendNotificationDigests(now = new Date()) {
  if (!emailConfigured()) return { sent: 0 };
  const pending = await TeamNotification.find({ readAt: null, emailedAt: null, createdAt: { $lte: new Date(now - DIGEST_DELAY_MS) } })
    .sort({ createdAt: 1 }).limit(2000).lean();
  if (!pending.length) return { sent: 0 };

  const byPerson = new Map();
  for (const n of pending) {
    const key = String(n.adminId);
    if (!byPerson.has(key)) byPerson.set(key, []);
    byPerson.get(key).push(n);
  }
  const people = await AdminUser.find({ _id: { $in: [...byPerson.keys()] } }).lean();
  const actorIds = [...new Set(pending.map((n) => String(n.actorId || '')).filter(Boolean))];
  const actors = new Map((await AdminUser.find({ _id: { $in: actorIds } }, { name: 1, username: 1 }).lean()).map((a) => [String(a._id), a.name || a.username]));

  let sent = 0;
  for (const person of people) {
    const items = byPerson.get(String(person._id));
    const ids = items.map((n) => n._id);
    const wantsEmail = person.active && person.chatAccess !== false && person.notifyEmail !== false && person.email;
    if (wantsEmail) {
      const rows = items.slice(0, 10).map((n) => {
        const who = n.actorId ? actors.get(String(n.actorId)) || 'Someone' : '';
        const line = who ? `${who} ${notificationLabel(n.type)}` : notificationLabel(n.type);
        return `<tr><td style="padding:8px 0;border-bottom:1px solid #eef0f3;font-size:14px;line-height:1.5;color:#374151"><strong style="color:#111827">${escapeHtml(line)}</strong>${n.preview ? `<br>${escapeHtml(n.preview)}` : ''}</td></tr>`;
      }).join('');
      const more = items.length > 10 ? `<p style="margin:8px 0 16px;font-size:13px;color:#6b7280">and ${items.length - 10} more</p>` : '';
      try {
        await sendEmail({
          to: person.email,
          subject: `You have ${items.length} unread update${items.length === 1 ? '' : 's'} on CVMind Team`,
          html: renderEmail({
            preheader: 'Here is what you missed on CVMind Team.',
            eyebrow: 'CVMind Team',
            title: 'You have unread updates',
            greetingName: person.name || person.username,
            body: 'Here is what happened while you were away.',
            htmlBlock: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px">${rows}</table>${more}`,
            ctaLabel: 'Open CVMind Team',
            ctaUrl: TEAM_APP_URL,
            footerReason: 'You get this because email notifications are on in your CVMind Team profile.'
          })
        });
        sent += 1;
      } catch (err) {
        console.error('[team] digest email failed:', err.message);
        continue;
      }
    }
    // Marked either way, so someone with email off isn't re-checked every run
    await TeamNotification.updateMany({ _id: { $in: ids } }, { emailedAt: new Date() });
  }
  return { sent };
}

// In-app reminder 2 hours before a task is due
export async function sendDueSoonReminders(now = new Date()) {
  const tasks = await TeamTask.find({
    status: { $nin: ['approved', 'submitted'] },
    dueAt: { $gt: now, $lte: new Date(+now + DUE_SOON_MS) },
    dueSoonNotifiedAt: null
  }).lean();
  for (const task of tasks) {
    await notify(task.assigneeIds, { type: 'task_due_soon', refType: 'task', refId: task._id, taskId: task._id, preview: task.title });
    await TeamTask.updateOne({ _id: task._id }, { dueSoonNotifiedAt: now });
  }
  return { reminded: tasks.length };
}

const fmtDue = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Daily 09:00 IST email: tasks due in the next 24 hours and overdue tasks, per person
export async function sendDailyTaskReminders(now = new Date()) {
  if (!emailConfigured()) return { sent: 0 };
  const open = await TeamTask.find({ status: { $nin: ['approved', 'submitted'] }, dueAt: { $ne: null, $lte: new Date(+now + 24 * 60 * 60 * 1000) } }).lean();
  const byPerson = new Map();
  for (const task of open) {
    for (const id of task.assigneeIds) {
      const key = String(id);
      if (!byPerson.has(key)) byPerson.set(key, []);
      byPerson.get(key).push(task);
    }
  }
  const people = await AdminUser.find({ _id: { $in: [...byPerson.keys()] }, ...teamPeopleFilter, email: { $gt: '' } }).lean();
  let sent = 0;
  for (const person of people) {
    const tasks = byPerson.get(String(person._id)).sort((a, b) => a.dueAt - b.dueAt);
    const overdue = tasks.filter((t) => t.dueAt < now);
    const soon = tasks.filter((t) => t.dueAt >= now);
    const list = (title, rows, color) => rows.length
      ? `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${color}">${title}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${rows.map((t) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eef0f3;font-size:14px;color:#111827">${escapeHtml(t.title)}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #eef0f3;font-size:13px;color:#6b7280;white-space:nowrap">${escapeHtml(fmtDue(t.dueAt))}</td></tr>`).join('')}</table>`
      : '';
    try {
      await sendEmail({
        to: person.email,
        subject: overdue.length ? `${overdue.length} overdue task${overdue.length === 1 ? '' : 's'} on CVMind Team` : `${soon.length} task${soon.length === 1 ? '' : 's'} due today`,
        html: renderEmail({
          preheader: 'Your tasks for today on CVMind Team.',
          eyebrow: 'Daily reminder',
          title: 'Your tasks for today',
          greetingName: person.name || person.username,
          htmlBlock: list('Overdue', overdue, '#dc2626') + list('Due in the next 24 hours', soon, '#111827'),
          ctaLabel: 'Open my tasks',
          ctaUrl: `${TEAM_APP_URL}/#/tasks`,
          footerReason: 'You get this daily when you have tasks due or overdue on CVMind Team.'
        })
      });
      sent += 1;
    } catch (err) {
      console.error('[team] reminder email failed:', err.message);
    }
  }
  return { sent };
}

// Runs `job` once per day, after `utcMinutes` past midnight UTC. The last run day is stored under
// `key` so a restart (or a second server) doesn't run it twice.
async function onceADay(key, utcMinutes, job, now = new Date()) {
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (minutes < utcMinutes) return;
  const day = now.toISOString().slice(0, 10);
  const claimed = await AppSetting.findOneAndUpdate(
    { key, value: { $ne: day } },
    { value: day, updatedBy: 'team-worker' },
    { new: true }
  ).catch(() => null);
  if (!claimed) {
    // First run ever: create the row, claiming today
    const exists = await AppSetting.exists({ key });
    if (exists) return;
    await AppSetting.create({ key, value: day, updatedBy: 'team-worker' });
  }
  await job(now);
}

// ── Check-ins ────────────────────────────────────────────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
// The India date of a moment, "YYYY-MM-DD"
export const istDay = (now = new Date()) => new Date(+now + IST_OFFSET_MS).toISOString().slice(0, 10);
// Mon–Sat are working days; Sunday is off
export const isWorkingDay = (day) => new Date(`${day}T00:00:00Z`).getUTCDay() !== 0;

// Everyone who can use the team app (never the .env owner, which has no account)
export const teamPeople = () => AdminUser.find(teamPeopleFilter, { _id: 1, name: 1, username: 1, role: 1 }).sort({ name: 1, username: 1 }).lean();

export const managerIds = async () => {
  const roles = Object.entries(ROLES).filter(([, r]) => r.permissions.includes(MANAGE)).map(([k]) => k);
  return (await AdminUser.find({ role: { $in: roles }, ...teamPeopleFilter }, { _id: 1 }).lean()).map((a) => String(a._id));
};

// 10:30 IST on working days: an in-app nudge for everyone who hasn't checked in and isn't on leave
export async function sendStandupReminders(now = new Date()) {
  const day = istDay(now);
  if (!isWorkingDay(day)) return { reminded: 0 };
  const [people, posted, leaves] = await Promise.all([
    teamPeople(),
    TeamStandup.find({ day }, { adminId: 1 }).lean(),
    TeamLeave.find({ status: 'approved', from: { $lte: day }, to: { $gte: day } }, { adminId: 1, kind: 1 }).lean()
  ]);
  // Working from home still means checking in
  const skip = new Set([...posted.map((s) => String(s.adminId)), ...leaves.filter((l) => l.kind !== 'wfh').map((l) => String(l.adminId))]);
  const ids = people.map((p) => String(p._id)).filter((id) => !skip.has(id));
  await notify(ids, { type: 'standup_reminder', refType: 'standup', preview: 'Post your check-in for today' });
  return { reminded: ids.length };
}

let timer = null;
export function startTeamJobs() {
  if (timer) return;
  const tick = async () => {
    try {
      await sendDueSoonReminders();
      const { spawnRecurringTasks } = await import('./recurring.js');
      await spawnRecurringTasks();
      await sendNotificationDigests();
      await onceADay('team.dailyReminderDay', REMINDER_UTC_MINUTES, sendDailyTaskReminders);
      await onceADay('team.standupReminderDay', STANDUP_UTC_MINUTES, sendStandupReminders);
      const { sweepPendingFiles } = await import('./files.js');
      await sweepPendingFiles();
    } catch (err) {
      console.error('[team] background job failed:', err.message);
    }
  };
  timer = setInterval(tick, WORKER_INTERVAL_MS);
  timer.unref?.();
  // Meeting reminders go out 10 minutes before, so they're checked every minute
  const meetings = setInterval(async () => {
    try {
      const { sendMeetingReminders } = await import('./meetings.js');
      await sendMeetingReminders();
    } catch (err) {
      console.error('[team] meeting reminders failed:', err.message);
    }
  }, 60 * 1000);
  meetings.unref?.();
  setTimeout(tick, 15 * 1000).unref?.();
}

// Name of a channel for emails and previews: "#general" or "a direct message"
export async function channelLabel(channelId) {
  const c = await TeamChannel.findById(channelId, { name: 1, kind: 1 }).lean();
  return !c ? '' : c.kind === 'dm' ? 'a direct message' : `#${c.name}`;
}

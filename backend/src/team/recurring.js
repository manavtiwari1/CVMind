import { TeamTask, TeamTaskActivity } from './models.js';
import { notify } from './notify.js';
import { emitToUser } from './realtime.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// The due date one step later: +1 day, +7 days or the same day next month
export function nextDue(dueAt, freq) {
  const d = new Date(dueAt);
  if (freq === 'daily') return new Date(+d + DAY_MS);
  if (freq === 'weekly') return new Date(+d + 7 * DAY_MS);
  const next = new Date(d);
  next.setUTCMonth(next.getUTCMonth() + 1);
  // 31 Jan → 28 Feb, not 3 Mar
  if (next.getUTCDate() !== d.getUTCDate()) next.setUTCDate(0);
  return next;
}

// When a repeating task's due date passes, makes its next copy: same people and details, a fresh
// checklist. Missed steps (the server was down) are skipped so only one upcoming copy appears.
export async function spawnRecurringTasks(now = new Date()) {
  let spawned = 0;
  for (;;) {
    // Claimed one at a time, so two servers never make the same copy
    const task = await TeamTask.findOneAndUpdate(
      { 'recurrence.freq': { $ne: null }, nextSpawnedAt: null, dueAt: { $ne: null, $lte: now } },
      { $set: { nextSpawnedAt: now } },
      { new: true }
    ).lean();
    if (!task) break;
    let dueAt = nextDue(task.dueAt, task.recurrence.freq);
    while (dueAt <= now) dueAt = nextDue(dueAt, task.recurrence.freq);
    if (task.recurrence.until && dueAt > task.recurrence.until) continue;

    const copy = await TeamTask.create({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assigneeIds: task.assigneeIds,
      createdBy: task.createdBy,
      dueAt,
      checklist: (task.checklist || []).map((c) => ({ text: c.text })),
      recurrence: task.recurrence,
      recurrenceOf: task.recurrenceOf || task._id
    });
    await TeamTaskActivity.create({ taskId: copy._id, actorId: task.createdBy, type: 'repeated', from: String(task._id), to: null });
    await notify(task.assigneeIds, { type: 'task_assigned', actorId: task.createdBy, refType: 'task', refId: copy._id, taskId: copy._id, preview: task.title });
    for (const id of new Set([String(task.createdBy), ...task.assigneeIds.map(String)])) emitToUser(id, 'task.updated', { taskId: String(copy._id) });
    spawned += 1;
  }
  return { spawned };
}

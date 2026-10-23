import express from 'express';
import { audit } from '../../audit.js';
import { handle, httpError, isId } from '../../util.js';
import { isManager, oid, requireTeam, sameId } from '../access.js';
import { LEAVE_KINDS, TeamLeave, TeamStandup } from '../models.js';
import { istDay, isWorkingDay, managerIds, notify, teamPeople } from '../notify.js';

const router = express.Router();
const team = requireTeam();
const manage = requireTeam({ manage: true });

const MAX_FIELD = 1500;
const MAX_REASON = 500;
const MAX_LEAVE_DAYS = 60;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const text = (v, max) => String(v ?? '').trim().slice(0, max);
const addDays = (day, n) => new Date(+new Date(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const daysBetween = (from, to) => Math.round((+new Date(`${to}T00:00:00Z`) - +new Date(`${from}T00:00:00Z`)) / DAY_MS);

function parseDay(value, label) {
  const day = String(value || '');
  if (!DAY_RE.test(day) || isNaN(new Date(`${day}T00:00:00Z`))) throw httpError(400, `Pick a valid ${label}.`);
  return day;
}

const publicStandup = (s) => s && ({ id: String(s._id), adminId: String(s.adminId), day: s.day, done: s.done, doing: s.doing, blockers: s.blockers, createdAt: s.createdAt, updatedAt: s.updatedAt });
const publicLeave = (l) => ({
  id: String(l._id), adminId: String(l.adminId), from: l.from, to: l.to, kind: l.kind, reason: l.reason, status: l.status,
  reviewedBy: l.reviewedBy ? String(l.reviewedBy) : null, reviewComment: l.reviewComment, reviewedAt: l.reviewedAt, createdAt: l.createdAt
});

// Approved leave covering `day`, for each person → Map(adminId → leave)
async function leaveOn(day, adminIds = null) {
  const rows = await TeamLeave.find({ status: 'approved', from: { $lte: day }, to: { $gte: day }, ...(adminIds ? { adminId: { $in: adminIds } } : {}) }).lean();
  return new Map(rows.map((l) => [String(l.adminId), l]));
}

// ── Check-in ─────────────────────────────────────────────────────────────────
router.get('/checkin', team, handle(async (req, res) => {
  const today = istDay();
  const [mine, leave] = await Promise.all([
    TeamStandup.findOne({ adminId: req.admin.id, day: today }).lean(),
    leaveOn(today, [oid(req.admin.id)])
  ]);
  const onLeave = leave.get(req.admin.id);
  res.json({ success: true, today, workingDay: isWorkingDay(today), data: publicStandup(mine) || null, leave: onLeave ? publicLeave(onLeave) : null });
}));

// One check-in per person per India day; posting again the same day updates it
router.put('/checkin', team, handle(async (req, res) => {
  const today = istDay();
  const done = text(req.body?.done, MAX_FIELD);
  const doing = text(req.body?.doing, MAX_FIELD);
  const blockers = text(req.body?.blockers, MAX_FIELD);
  if (!done && !doing) throw httpError(400, 'Write what you did or what you are doing today.');
  const before = await TeamStandup.findOne({ adminId: req.admin.id, day: today }).lean();
  const standup = await TeamStandup.findOneAndUpdate(
    { adminId: req.admin.id, day: today },
    { $set: { done, doing, blockers } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  // Managers hear about a new or changed blocker, not every edit
  if (blockers && blockers !== (before?.blockers || '')) {
    await notify(await managerIds(), { type: 'standup_blocker', actorId: req.admin.id, refType: 'standup', refId: standup._id, preview: blockers });
  }
  res.json({ success: true, data: publicStandup(standup) });
}));

// Everyone's check-ins for a day, plus who hasn't posted and who is on leave (managers)
router.get('/checkins', manage, handle(async (req, res) => {
  const day = req.query.day ? parseDay(req.query.day, 'day') : istDay();
  const [people, rows, leaves] = await Promise.all([teamPeople(), TeamStandup.find({ day }).sort({ createdAt: 1 }).lean(), leaveOn(day)]);
  const posted = new Set(rows.map((r) => String(r.adminId)));
  res.json({
    success: true,
    day,
    workingDay: isWorkingDay(day),
    data: rows.map(publicStandup),
    missing: people.map((p) => String(p._id)).filter((id) => !posted.has(id) && !(leaves.has(id) && leaves.get(id).kind !== 'wfh')),
    leave: [...leaves.values()].map(publicLeave)
  });
}));

// Past check-ins: your own, or anyone's for managers
router.get('/checkins/history', team, handle(async (req, res) => {
  const adminId = isId(req.query.adminId) ? String(req.query.adminId) : req.admin.id;
  if (!sameId(adminId, req.admin.id) && !isManager(req.admin)) throw httpError(403, 'You can only see your own check-ins.');
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 90);
  const filter = { adminId: oid(adminId), ...(req.query.before && DAY_RE.test(req.query.before) ? { day: { $lt: req.query.before } } : {}) };
  const rows = await TeamStandup.find(filter).sort({ day: -1 }).limit(limit).lean();
  res.json({ success: true, data: rows.map(publicStandup), hasMore: rows.length === limit });
}));

// ── Attendance ───────────────────────────────────────────────────────────────
// A person × day grid for one month. Cells: present, wfh, casual, sick, missing, off (Sunday),
// today (not posted yet) and future.
router.get('/attendance', manage, handle(async (req, res) => {
  const today = istDay();
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : today.slice(0, 7);
  const first = `${month}-01`;
  const next = new Date(`${first}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const last = addDays(next.toISOString().slice(0, 10), -1);
  const days = Array.from({ length: daysBetween(first, last) + 1 }, (_, i) => addDays(first, i));

  const [people, standups, leaves] = await Promise.all([
    teamPeople(),
    TeamStandup.find({ day: { $gte: first, $lte: last } }, { adminId: 1, day: 1 }).lean(),
    TeamLeave.find({ status: 'approved', from: { $lte: last }, to: { $gte: first } }).lean()
  ]);
  const posted = new Set(standups.map((s) => `${s.adminId}:${s.day}`));
  const cell = (id, day) => {
    if (day > today) return 'future';
    const leave = leaves.find((l) => sameId(l.adminId, id) && l.from <= day && l.to >= day);
    const checkedIn = posted.has(`${id}:${day}`);
    if (leave && leave.kind !== 'wfh') return leave.kind;
    if (checkedIn) return leave ? 'wfh' : 'present';
    if (!isWorkingDay(day)) return 'off';
    return day === today ? 'today' : 'missing';
  };
  res.json({
    success: true,
    month,
    days: days.map((day) => ({ day, working: isWorkingDay(day) })),
    people: people.map((p) => {
      const id = String(p._id);
      const cells = days.map((day) => cell(id, day));
      return { id, cells, present: cells.filter((c) => c === 'present' || c === 'wfh').length, missing: cells.filter((c) => c === 'missing').length };
    })
  });
}));

// ── Leave ────────────────────────────────────────────────────────────────────
router.get('/leaves', team, handle(async (req, res) => {
  const scope = req.query.scope === 'team' ? 'team' : 'mine';
  if (scope === 'team' && !isManager(req.admin)) throw httpError(403, 'Only managers can see everyone\'s leave.');
  const filter = scope === 'mine' ? { adminId: oid(req.admin.id) } : {};
  if (['pending', 'approved', 'declined', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
  const rows = await TeamLeave.find(filter).sort({ from: -1, createdAt: -1 }).limit(200).lean();
  res.json({ success: true, data: rows.map(publicLeave) });
}));

router.post('/leaves', team, handle(async (req, res) => {
  const from = parseDay(req.body?.from, 'start date');
  const to = parseDay(req.body?.to || req.body?.from, 'end date');
  if (to < from) throw httpError(400, 'The end date must be on or after the start date.');
  if (daysBetween(from, to) + 1 > MAX_LEAVE_DAYS) throw httpError(400, `A request can cover up to ${MAX_LEAVE_DAYS} days.`);
  // Sick leave is often asked for after the fact, but not long after
  if (from < addDays(istDay(), -30)) throw httpError(400, 'Leave can be requested for up to 30 days in the past.');
  const kind = LEAVE_KINDS.includes(req.body?.kind) ? req.body.kind : null;
  if (!kind) throw httpError(400, 'Pick casual, sick or work from home.');
  const reason = text(req.body?.reason, MAX_REASON);
  const overlap = await TeamLeave.exists({ adminId: req.admin.id, status: { $in: ['pending', 'approved'] }, from: { $lte: to }, to: { $gte: from } });
  if (overlap) throw httpError(400, 'You already have leave on some of these days.');

  // A manager's own leave needs no approval
  const manager = isManager(req.admin);
  const leave = await TeamLeave.create({
    adminId: req.admin.id, from, to, kind, reason,
    ...(manager ? { status: 'approved', reviewedBy: req.admin.id, reviewedAt: new Date() } : {})
  });
  if (!manager) await notify(await managerIds(), { type: 'leave_requested', actorId: req.admin.id, refType: 'leave', refId: leave._id, preview: `${from === to ? from : `${from} to ${to}`}${reason ? `: ${reason}` : ''}` });
  res.json({ success: true, data: publicLeave(leave.toObject()) });
}));

router.delete('/leaves/:id', team, handle(async (req, res) => {
  const leave = isId(req.params.id) ? await TeamLeave.findById(req.params.id) : null;
  if (!leave || !sameId(leave.adminId, req.admin.id)) throw httpError(404, 'Leave request not found.');
  if (leave.status !== 'pending') throw httpError(400, 'Only a pending request can be cancelled. Ask your manager to change an approved one.');
  leave.status = 'cancelled';
  await leave.save();
  res.json({ success: true, data: publicLeave(leave.toObject()) });
}));

router.post('/leaves/:id/review', manage, handle(async (req, res) => {
  const leave = isId(req.params.id) ? await TeamLeave.findById(req.params.id) : null;
  if (!leave) throw httpError(404, 'Leave request not found.');
  if (sameId(leave.adminId, req.admin.id)) throw httpError(403, 'Another manager reviews your own leave.');
  const decision = req.body?.decision;
  if (!['approve', 'decline', 'cancel'].includes(decision)) throw httpError(400, 'Choose Approve or Decline.');
  // Approved leave can be withdrawn later (plans change); pending leave gets a decision
  if (decision === 'cancel' ? leave.status !== 'approved' : leave.status !== 'pending') throw httpError(400, 'This request was already reviewed.');
  leave.status = decision === 'approve' ? 'approved' : decision === 'decline' ? 'declined' : 'cancelled';
  leave.reviewedBy = req.admin.id;
  leave.reviewComment = text(req.body?.comment, MAX_REASON);
  leave.reviewedAt = new Date();
  await leave.save();
  await audit(req, 'teamchat.leave_reviewed', { targetType: 'team_leave', targetId: leave._id, details: { decision, from: leave.from, to: leave.to } });
  await notify([String(leave.adminId)], {
    type: decision === 'approve' ? 'leave_approved' : 'leave_declined', actorId: req.admin.id, refType: 'leave', refId: leave._id,
    preview: `${leave.from === leave.to ? leave.from : `${leave.from} to ${leave.to}`}${leave.reviewComment ? `: ${leave.reviewComment}` : ''}`
  });
  res.json({ success: true, data: publicLeave(leave.toObject()) });
}));

export default router;

import { AdminUser } from '../admin/models.js';
import { ROLES } from '../admin/permissions.js';
import { istDay, notify, teamPeopleFilter } from '../admin/team/notify.js';
import { ErpProfile } from './models.js';

// Daily ERP reminders, run from the Team background worker (admin/team/notify.js → startTeamJobs).

const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

// Everyone on the team whose role can manage HR
export async function hrManagerIds() {
  const roles = Object.entries(ROLES).filter(([, r]) => r.permissions.includes('hr.manage')).map(([k]) => k);
  return (await AdminUser.find({ role: { $in: roles }, ...teamPeopleFilter }, { _id: 1 }).lean()).map((a) => String(a._id));
}

// 7 days before an internship/contract end or a probation end: the reporting manager and HR hear about it.
// Each date is reminded once; changing the date makes a new reminder.
export async function sendHrReminders(now = new Date()) {
  const inAWeek = addDays(istDay(now), 7);
  const due = await ErpProfile.find({
    lastWorkingDay: { $in: ['', null] },
    $or: [{ endDate: inAWeek }, { probationEndDate: inAWeek }]
  }).lean();
  if (!due.length) return { reminded: 0 };
  const hr = await hrManagerIds();
  const people = new Map((await AdminUser.find({ _id: { $in: due.map((p) => p.adminId) }, active: true }, { name: 1, username: 1 }).lean()).map((a) => [String(a._id), a.name || a.username]));
  let reminded = 0;
  for (const p of due) {
    const name = people.get(String(p.adminId));
    if (!name) continue;
    for (const [kind, day, words] of [['end', p.endDate, 'ends'], ['probation', p.probationEndDate, 'probation ends']]) {
      if (day !== inAWeek) continue;
      const key = `${kind}:${day}`;
      if ((p.remindersSent || []).includes(key)) continue;
      const claimed = await ErpProfile.updateOne({ _id: p._id, remindersSent: { $ne: key } }, { $push: { remindersSent: key } });
      if (!claimed.modifiedCount) continue;
      const to = [...new Set([...hr, ...(p.managerId ? [String(p.managerId)] : [])])].filter((id) => id !== String(p.adminId));
      await notify(to, { type: kind === 'end' ? 'hr_end_soon' : 'hr_probation_soon', refType: 'hr', refId: p.adminId, preview: `${name}'s ${words} on ${day}` });
      reminded += 1;
    }
  }
  return { reminded };
}

import { AdminUser, AppSetting } from '../models.js';

// Team ID cards: employees get CVM/EMP/0001, interns get CVM/INTERNS/0001. Each series has its own
// counter, so numbers are never reused, even after someone leaves. Managers can also set a number
// by hand (and so put someone in the other series); a hand-set number is never changed automatically.
const SERIES = {
  emp: { prefix: 'CVM/EMP/', counter: 'counter.idcard.emp' },
  intern: { prefix: 'CVM/INTERNS/', counter: 'counter.idcard.intern' }
};
export const ID_PATTERN = /^CVM\/(EMP|INTERNS)\/(\d{4})$/;

export const idSeries = (role) => (String(role || '').includes('intern') ? 'intern' : 'emp');
const matchesSeries = (idNumber, role) => !!idNumber && idNumber.startsWith(SERIES[idSeries(role)].prefix);
const format = (series, n) => `${SERIES[series].prefix}${String(n).padStart(4, '0')}`;

// The next free number in a series; skips any number a manager already gave by hand
async function nextNumber(series) {
  for (;;) {
    const row = await AppSetting.findOneAndUpdate({ key: SERIES[series].counter }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' }).lean();
    const idNumber = format(series, Number(row.value || 1));
    if (!(await AdminUser.exists({ idNumber }))) return idNumber;
  }
}

// Gives a number to everyone who has none (oldest member first), and a new one to anyone whose
// role moved between intern and employee. After the first run this is one small query.
export async function assignIdNumbers() {
  const people = await AdminUser.find({}, { role: 1, idNumber: 1, idManual: 1, createdAt: 1 }).sort({ createdAt: 1, _id: 1 }).lean();
  for (const p of people) {
    if (p.idManual && p.idNumber) continue;
    if (matchesSeries(p.idNumber, p.role)) continue;
    const idNumber = await nextNumber(idSeries(p.role));
    // Only if nobody else assigned one in the meantime
    await AdminUser.updateOne({ _id: p._id, idNumber: p.idNumber || '' }, { $set: { idNumber } });
  }
}

// A manager sets someone's number by hand. Returns an error message, or null when it's saved.
export async function setIdNumber(adminId, value) {
  const idNumber = String(value || '').trim().toUpperCase();
  const match = ID_PATTERN.exec(idNumber);
  if (!match) return 'Use the format CVM/EMP/0001 or CVM/INTERNS/0001.';
  if (Number(match[2]) < 1) return 'Numbers start at 0001.';
  const holder = await AdminUser.findOne({ idNumber }, { _id: 1, name: 1, username: 1 }).lean();
  if (holder && String(holder._id) !== String(adminId)) return `${holder.name || holder.username} already has ${idNumber}.`;
  await AdminUser.updateOne({ _id: adminId }, { $set: { idNumber, idManual: true } });
  // Automatic numbers continue after the highest hand-set one
  const series = match[1] === 'EMP' ? 'emp' : 'intern';
  const key = SERIES[series].counter;
  const row = await AppSetting.findOne({ key }).lean();
  if (Number(row?.value || 0) < Number(match[2])) await AppSetting.findOneAndUpdate({ key }, { $set: { value: Number(match[2]) } }, { upsert: true });
  return null;
}

import { AdminUser, AppSetting } from '../models.js';

// Team ID cards: employees get CVM/EMP/0001, interns get CVM/INTERNS/0001. Each series has its own
// counter, so numbers are never reused, even after someone leaves.
const SERIES = {
  emp: { prefix: 'CVM/EMP/', counter: 'counter.idcard.emp' },
  intern: { prefix: 'CVM/INTERNS/', counter: 'counter.idcard.intern' }
};

export const idSeries = (role) => (String(role || '').includes('intern') ? 'intern' : 'emp');
const matchesSeries = (idNumber, role) => !!idNumber && idNumber.startsWith(SERIES[idSeries(role)].prefix);

async function nextNumber(series) {
  const { prefix, counter } = SERIES[series];
  const row = await AppSetting.findOneAndUpdate({ key: counter }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' }).lean();
  return `${prefix}${String(Number(row.value || 1)).padStart(4, '0')}`;
}

// Gives a number to everyone who has none (oldest member first), and a new one to anyone whose
// role moved between intern and employee. After the first run this is one small query.
export async function assignIdNumbers() {
  const people = await AdminUser.find({}, { role: 1, idNumber: 1, createdAt: 1 }).sort({ createdAt: 1, _id: 1 }).lean();
  for (const p of people) {
    if (matchesSeries(p.idNumber, p.role)) continue;
    const idNumber = await nextNumber(idSeries(p.role));
    // Only if nobody else assigned one in the meantime
    await AdminUser.updateOne({ _id: p._id, idNumber: p.idNumber || '' }, { $set: { idNumber } });
  }
}

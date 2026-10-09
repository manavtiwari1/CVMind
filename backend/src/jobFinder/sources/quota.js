import { AppSetting } from '../../admin/models.js';

// Call allowances for the paid or rate-limited job APIs, counted in AppSetting so every server
// instance shares them. A key names one provider and one period, e.g. "jobFinder.jsearch.2026-10".

export const monthKey = (provider, now = new Date()) => `jobFinder.${provider}.${now.toISOString().slice(0, 7)}`;
export const dayKey = (provider, now = new Date()) => `jobFinder.${provider}.${now.toISOString().slice(0, 10)}`;

/** Takes one call from the allowance under `key`; false once `cap` calls were made */
export async function takeCall(key, cap) {
  if (!cap) return false;
  try {
    const row = await AppSetting.findOneAndUpdate(
      { key, value: { $lt: cap } },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: 'after' }
    ).lean();
    return Boolean(row);
  } catch (err) {
    // The upsert collides with the existing row once its value is at the cap
    if (err.code === 11000) return false;
    throw err;
  }
}

/** Gives back a call taken by takeCall, when a second allowance then refused */
export const returnCall = (key) => AppSetting.updateOne({ key, value: { $gt: 0 } }, { $inc: { value: -1 } });

export async function callsMade(key) {
  const row = await AppSetting.findOne({ key }).lean();
  return Number(row?.value) || 0;
}

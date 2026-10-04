import Preferences from '../models/Preferences.js';
import { DEFAULT_PREFERENCES } from './schema.js';

export function toPreferences(doc) {
  const { _id, __v, userId, ...rest } = doc;
  return {
    ...structuredClone(DEFAULT_PREFERENCES),
    ...rest,
    defaultResumeProfileId: rest.defaultResumeProfileId ? String(rest.defaultResumeProfileId) : null
  };
}

// Saved preferences merged over defaults, or null when the user has never saved any
export async function getPreferences(userId) {
  const doc = await Preferences.findOne({ userId: String(userId) }).lean();
  return doc ? toPreferences(doc) : null;
}

// A preferences default overrides isDefault when picking a resume, so making another resume the
// default (or deleting the chosen one) clears it; otherwise the user's latest choice would be ignored.
// Never upserts: whether preferences exist decides onboarding.
export function clearPreferredResume(userId, resumeProfileId = null) {
  const filter = { userId: String(userId), defaultResumeProfileId: resumeProfileId ?? { $ne: null } };
  return Preferences.updateOne(filter, { $set: { defaultResumeProfileId: null } });
}

export async function savePreferences(userId, update) {
  const doc = await Preferences.findOneAndUpdate(
    { userId: String(userId) },
    { $set: update },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();
  return toPreferences(doc);
}

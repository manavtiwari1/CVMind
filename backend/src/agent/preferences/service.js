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

export async function savePreferences(userId, update) {
  const doc = await Preferences.findOneAndUpdate(
    { userId: String(userId) },
    { $set: update },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();
  return toPreferences(doc);
}

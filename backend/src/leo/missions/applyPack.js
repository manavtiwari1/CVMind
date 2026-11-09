// Finding a job's apply pack from the page the extension is on. Kept apart from jobHunt.js, which
// pulls in the AI services and db.js (which connects when imported); the extension routes need neither.

import { normalizeJobUrl } from '@cvmind/auto-apply-agent/jobs/urlNormalize.js';
import { LeoMission } from '../models.js';

/** The apply pack for this page, or null. Only this user's missions are searched. */
export async function packForUrl(userId, url) {
  const applyKey = normalizeJobUrl(String(url || ''));
  if (!applyKey) return null;
  const mission = await LeoMission.findOne({ userId, 'steps.card.applyKey': applyKey }).sort({ updatedAt: -1 }).select('steps').lean();
  return mission?.steps.find((s) => s.card?.applyKey === applyKey)?.card || null;
}

/** The pack's cover letter as plain text, for a form's cover letter box. */
export const packLetterText = (pack) => [pack.letter.greeting, ...pack.letter.paragraphs, `${pack.letter.closing}\n${pack.letter.name}`].filter(Boolean).join('\n\n');

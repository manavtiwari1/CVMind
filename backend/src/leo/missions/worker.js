// Leo Agent Mode, Phase 4: missions keep running when the browser goes away. A run belongs to the
// server, and a browser only listens to it. After a restart, the sweep picks up any mission whose
// lease ran out and carries on from its first unfinished step.

import { EventEmitter } from 'node:events';
import { LeoConversation } from '../models.js';
import { getProfile } from '../careerProfile.js';
import { getSettings } from '../../admin/settings.js';
import { recordMissionUsage } from '../service.js';
import { reclaimStale, runMission } from './index.js';
import { sendDueReminders } from '../reminders.js';

const SWEEP_MS = 60 * 1000;

const bus = new EventEmitter();
bus.setMaxListeners(0);

/** Listens to a running mission. Returns the function that stops listening. */
export function listenToMission(id, send) {
  const key = String(id);
  bus.on(key, send);
  return () => bus.off(key, send);
}

/**
 * Runs a claimed mission to its next resting point. signal is for hosts that can't work after the
 * response ends (serverless): there a closed tab pauses the mission.
 */
export async function launchMission(mission, { signal } = {}) {
  const started = Date.now();
  const key = String(mission._id);
  const [{ leo }, conversation, profile] = await Promise.all([
    getSettings(),
    LeoConversation.findOne({ _id: mission.conversationId, userId: mission.userId }).select('resumeText').lean(),
    getProfile(mission.userId)
  ]);
  const send = (event, data) => bus.emit(key, event, data);
  const { tokens, status } = await runMission(mission, { resumeText: conversation?.resumeText || profile?.masterResumeText || '', send, signal });
  if (status !== 'deleted') await recordMissionUsage({ mission, tokens, status, settings: leo, latencyMs: Date.now() - started }).catch((err) => console.error('[leo] mission usage log failed:', err.message));
  send('done', { status });
  return status;
}

/** One pass of the background work. Never throws. */
export async function leoWorkerTick({ launch = launchMission } = {}) {
  try {
    for (const mission of await reclaimStale()) {
      launch(mission).catch((err) => console.error('[leo] resumed mission failed:', err.message));
    }
  } catch (err) {
    console.error('[leo] mission sweep failed:', err.message);
  }
  try {
    await sendDueReminders();
  } catch (err) {
    console.error('[leo] reminder run failed:', err.message);
  }
}

let timer = null;
export function startLeoWorker() {
  if (timer) return;
  timer = setInterval(leoWorkerTick, SWEEP_MS);
  timer.unref?.();
}

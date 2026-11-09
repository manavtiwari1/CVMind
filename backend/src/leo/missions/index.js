// Missions: one goal, several CVMind tools, run in order after a single Start tap
// (PRD: Leo Agent Mode). The chat model writes the plan with plan_mission; after that no model
// decides anything. This file checks the plan, runs the steps, saves after each one and stops
// wherever the user has to check or approve something.
//
// Turn the whole thing off with the 'leo-agent' feature switch.

import crypto from 'node:crypto';
import { LeoMission } from '../models.js';
import { runTool, TOOL_DEFINITIONS, TOOL_META } from '../tools.js';
import { mergeFacts, getProfile, profileCard } from '../careerProfile.js';
import { CAREER_TOOL_DEFINITIONS } from '../careerTools.js';
import { LIVE_FIELDS, withLiveText } from '../liveText.js';
import { createReminder, openReminders } from '../reminders.js';
import { saveAlertSettings } from '../../growth/alerts.js';
import { packStepsFor, prepareApplyPack, rankJobs } from './jobHunt.js';
import { connectCard, connectorById, connectorForTool, getConnected } from '../connectors.js';
import { DRAFT_PROPERTIES } from '../flows/resume.js';
import { CUSTOM_LOOK } from '../../portfolio/generate.js';
import { getSettings } from '../../admin/settings.js';
import { FeatureUse } from '../../billing/models.js';
import { WEEK_MS } from '../../billing/plans.js';
import { isPro, featureAllowance, recordFeatureUse } from '../../billing/service.js';
import { runWithAiContext } from '../../billing/aiContext.js';

const MAX_STEPS = 8;
const MAX_ARGS_CHARS = 14000;
const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_EXPIRES_MS = 7 * DAY_MS;
// Renewed every minute while a run is alive, so a mission left by a dead server is free again soon
const LEASE_MS = 3 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;
// Counted in FeatureUse, so deleting a chat doesn't give a mission back
const MISSION_FEATURE = 'mission';

const clip = (value, max) => String(value ?? '').trim().slice(0, max);
const httpError = (status, message, code = '') => Object.assign(new Error(message), { status, code });
const blocked = (action, message) => ({ card: { type: 'locked', action, message }, summary: `Not run: ${message}` });

// Tests and later phases add tools here; a tool in this list wins over tools.js
let extraTools = {};
export function setMissionTools(tools) {
  extraTools = tools || {};
}

const metaFor = (name) => {
  if (Object.hasOwn(extraTools, name)) return extraTools[name].meta;
  return Object.hasOwn(TOOL_META, name) ? TOOL_META[name] : null;
};

// Steps only the job hunt adds; plan_mission can't ask for them
const JOB_HUNT_TOOLS = { rank_jobs: rankJobs, prepare_apply_pack: prepareApplyPack };

const runStepTool = (step, ctx) => {
  if (Object.hasOwn(extraTools, step.tool)) return extraTools[step.tool].run(step.args, ctx);
  if (Object.hasOwn(JOB_HUNT_TOOLS, step.tool)) return runJobHuntStep(step, ctx);
  return runTool({ name: step.tool, arguments: JSON.stringify(step.args || {}) }, ctx);
};

async function runJobHuntStep(step, ctx) {
  const run = JOB_HUNT_TOOLS[step.tool];
  const fields = Object.hasOwn(LIVE_FIELDS, step.tool) ? LIVE_FIELDS[step.tool] : null;
  try {
    return await (fields && ctx.progress ? withLiveText(fields, ctx, () => run(step.args, ctx)) : run(step.args, ctx));
  } catch (err) {
    console.error(`[leo] ${step.tool} failed:`, err.message);
    return { card: { type: 'error', message: "That didn't work just now." }, summary: 'The step failed.' };
  }
}

const publicStep = (s) => ({
  id: s.id,
  tool: s.tool,
  title: s.title,
  detail: s.detail,
  risk: s.risk,
  review: !!s.review,
  status: s.status,
  card: s.card || null,
  needsReview: !!s.review && s.status === 'done' && !s.reviewedAt
});

export const publicMission = (m) => ({
  id: String(m._id),
  status: m.status,
  goal: m.goal,
  pausedReason: m.pausedReason,
  message: m.message,
  pendingStepId: m.pendingStepId,
  steps: (m.steps || []).filter((s) => s.status !== 'removed').map(publicStep),
  quota: m.quota,
  tokensUsed: m.tokensUsed,
  tokenCap: m.tokenCap
});

// How many missions this account can still start, and its token cap per mission
export async function missionQuota(email, leo) {
  const pro = await isPro(email);
  const limit = pro ? leo.proDailyMissions : leo.freeWeeklyMissions;
  const since = new Date(Date.now() - (pro ? DAY_MS : WEEK_MS));
  const used = await FeatureUse.countDocuments({ email: String(email).trim().toLowerCase(), feature: MISSION_FEATURE, createdAt: { $gt: since } });
  return { pro, limit, used, left: Math.max(0, limit - used), period: pro ? 'day' : 'week', tokenCap: pro ? leo.proMissionTokenCap : leo.freeMissionTokenCap };
}

// A review or a paused mission nobody came back to for 7 days closes, and its work stays (R21)
async function expireStale(userId) {
  await LeoMission.updateMany(
    { userId, active: true, status: { $in: ['waiting_review', 'paused'] }, updatedAt: { $lt: new Date(Date.now() - REVIEW_EXPIRES_MS) } },
    { $set: { status: 'stopped', active: false, pausedReason: 'expired', pendingStepId: '', message: 'This mission closed after 7 days without a reply. Everything finished is saved.', updatedAt: new Date() } }
  );
}

// A short line of what a step will use, for the plan card
function detailFor(args) {
  const value = Object.values(args).find((v) => typeof v === 'string' && v.trim());
  return clip(value, 120);
}

// Turns the model's plan into steps. Returns { steps } or { problem } to tell the model what to fix.
async function buildSteps(input, ctx, quota) {
  const raw = Array.isArray(input.steps) ? input.steps : [];
  if (raw.length < 2) return { problem: 'A plan needs at least 2 steps. For one tool, call that tool directly.' };
  if (raw.length > MAX_STEPS) return { problem: `A plan can have at most ${MAX_STEPS} steps. Keep the most useful ones.` };

  const left = {};
  const steps = [];
  for (const item of raw) {
    const tool = clip(item?.tool, 60);
    const meta = metaFor(tool);
    if (!meta) return { problem: `${tool || 'That tool'} can't be used in a mission.` };
    if (ctx.blockedTools?.has(tool)) return { problem: `${tool} isn't connected. Call request_connector with id "${connectorForTool(tool).id}".` };
    let args = item?.args && typeof item.args === 'object' && !Array.isArray(item.args) ? item.args : {};
    if (tool === 'build_portfolio') args = { theme: CUSTOM_LOOK, wishes: 'No preference', ...args };
    if (JSON.stringify(args).length > MAX_ARGS_CHARS) return { problem: `The details for ${tool} are too long.` };
    const needed = [...TOOL_DEFINITIONS, ...CAREER_TOOL_DEFINITIONS].find((d) => d.function.name === tool)?.function.parameters.required || [];
    const missing = needed.filter((key) => !clip(args[key], 20));
    if (missing.length) return { problem: `${tool} still needs: ${missing.join(', ')}. Ask the user for it, then plan again.` };
    if (meta.needsResume && ctx.resumeText.length < 50) return { needResume: true };

    // Steps past a free weekly limit show as locked instead of failing halfway
    let locked = false;
    if (meta.limit && !quota.pro) {
      if (left[meta.limit] === undefined) {
        try {
          const { used, limit } = await featureAllowance(ctx.email, meta.limit);
          left[meta.limit] = limit - used;
        } catch {
          left[meta.limit] = Infinity;
        }
      }
      locked = left[meta.limit] <= 0;
      left[meta.limit] -= 1;
    }

    steps.push({
      id: crypto.randomUUID().slice(0, 12),
      tool,
      title: clip(item?.title, 100) || tool.replace(/_/g, ' '),
      detail: detailFor(args),
      args,
      risk: meta.risk,
      review: item?.review === true,
      status: locked ? 'locked' : 'pending',
      card: null,
      summary: ''
    });
  }
  if (steps.every((s) => s.status === 'locked')) return { allLocked: true };
  return { steps };
}

// What every kind of mission checks before a plan is saved. Returns { stop } or { quota }.
async function canPlan(ctx) {
  const { security } = await getSettings();
  if (security.requireEmailVerification && ctx.emailVerified === false) return { stop: blocked('info', 'Please verify your email address to let Leo run a mission.') };

  await expireStale(ctx.userId);
  const active = await LeoMission.findOne({ userId: ctx.userId, active: true }).lean();
  if (active) {
    return {
      stop: {
        card: { type: 'mission', id: String(active._id), mission: publicMission(active) },
        summary: 'Not planned: a mission is already open, and its card is shown. In one sentence, ask them to finish or stop it first.'
      }
    };
  }

  const quota = await missionQuota(ctx.email, ctx.settings);
  if (quota.left <= 0) {
    return { stop: quota.pro
      ? blocked('info', `You've started your ${quota.limit} mission${quota.limit === 1 ? '' : 's'} for today. You can start another tomorrow.`)
      : blocked('upgrade', `You've used your ${quota.limit} free mission${quota.limit === 1 ? '' : 's'} this week. CVMind Pro has more.`) };
  }
  return { quota };
}

const savePlan = async (ctx, goal, steps, quota) => {
  const mission = await LeoMission.create({
    userId: ctx.userId,
    email: ctx.email,
    conversationId: ctx.conversationId,
    goal: clip(goal, 300),
    steps,
    quota: { left: quota.left, limit: quota.limit, period: quota.period },
    tokenCap: quota.tokenCap
  });
  return {
    card: { type: 'mission', id: String(mission._id), mission: publicMission(mission) },
    summary: 'The plan card is shown. In one short sentence, ask them to check it and tap Start. Nothing runs until they do, and a typed yes does not start it.'
  };
};

// The plan_mission tool: saves a plan and shows its card. Nothing runs yet.
async function planMission(args, ctx) {
  const { stop, quota } = await canPlan(ctx);
  if (stop) return stop;
  const built = await buildSteps(args || {}, ctx, quota);
  if (built.needResume) return blocked('attach', 'Attach your resume (PDF, DOCX or TXT) with the paperclip button, then ask again.');
  if (built.allLocked) return blocked('upgrade', "This week's free uses for these steps are finished. CVMind Pro has unlimited use.");
  if (built.problem) return { card: null, summary: `Not planned: ${built.problem}` };
  return savePlan(ctx, args.goal, built.steps, quota);
}

// The plan_job_hunt tool: find and rank jobs, wait for the user's picks, then prepare each one
async function planJobHunt(args, ctx) {
  const { stop, quota } = await canPlan(ctx);
  if (stop) return stop;
  if (ctx.resumeText.length < 50) return blocked('attach', 'Attach your resume (PDF, DOCX or TXT) with the paperclip button, then ask again.');
  const role = clip(args.role, 100);
  if (!role) return { card: null, summary: 'Not planned: ask which role they want.' };
  const place = clip(args.location, 80);
  return savePlan(ctx, clip(args.goal, 300) || `${role} jobs${place ? ` in ${place}` : ''}`, [{
    id: crypto.randomUUID().slice(0, 12),
    tool: 'rank_jobs',
    title: 'Find and rank real jobs for you',
    detail: [role, clip(args.company, 60), place].filter(Boolean).join(' · '),
    args: { role, location: place, company: clip(args.company, 60), remote: args.remote === true },
    risk: 'read',
    review: true,
    status: 'pending',
    card: null,
    summary: ''
  }], quota);
}

/** Missions left running by a server that died, claimed for this one. */
export async function reclaimStale(now = new Date()) {
  const stale = await LeoMission.find({ status: 'running', leaseUntil: { $lt: now } }).select('_id').limit(50).lean();
  const claimed = [];
  for (const { _id } of stale) {
    const mission = await claim({ _id, status: 'running', leaseUntil: { $lt: now } });
    if (mission) claimed.push(mission);
  }
  return claimed;
}

// Takes the mission for this run; only one run can hold it. Null when its state doesn't allow that.
async function claim(filter, set = {}) {
  const now = new Date();
  try {
    return await LeoMission.findOneAndUpdate(filter, {
      $set: { status: 'running', active: true, stopRequested: false, pausedReason: '', message: '', pendingStepId: '', leaseUntil: new Date(now.getTime() + LEASE_MS), updatedAt: now, ...set }
    }, { returnDocument: 'after' }).lean();
  } catch (err) {
    if (err.code === 11000) throw httpError(409, 'You already have a mission open. Finish or stop it first.', 'MISSION_ACTIVE');
    throw err;
  }
}

async function owned(id, userId) {
  const mission = await LeoMission.findOne({ _id: id, userId }).lean();
  if (!mission) throw httpError(404, 'Mission not found.');
  return mission;
}

export const getMission = async (id, userId) => publicMission(await owned(id, userId));

// Start tap. removeSteps: the steps the user took off the plan.
export async function startMission({ id, userId, email, leo, removeSteps = [] }) {
  await expireStale(userId);
  const mission = await owned(id, userId);
  if (mission.status !== 'planned') throw httpError(409, 'This mission has already started.', 'MISSION_STATE');
  const quota = await missionQuota(email, leo);
  if (quota.left <= 0) throw httpError(402, `You've used your ${quota.limit} mission${quota.limit === 1 ? '' : 's'} for this ${quota.period}.`, 'MISSION_LIMIT');

  const remove = new Set(Array.isArray(removeSteps) ? removeSteps.map(String) : []);
  const steps = mission.steps.map((s) => (remove.has(s.id) && s.status === 'pending' ? { ...s, status: 'removed' } : s));
  if (!steps.some((s) => s.status === 'pending')) throw httpError(400, 'Keep at least one step.');

  const started = await claim({ _id: id, userId, status: 'planned' }, { steps, startedAt: new Date(), tokenCap: quota.tokenCap });
  if (!started) throw httpError(409, 'This mission has already started.', 'MISSION_STATE');
  await recordFeatureUse(email, MISSION_FEATURE);
  return started;
}

// Continue after a closed tab or a failed step. A mission that hit its token cap stays paused.
export async function continueMission({ id, userId }) {
  await owned(id, userId);
  const now = new Date();
  const mission = await claim({
    _id: id,
    userId,
    $or: [{ status: 'paused', pausedReason: { $ne: 'cap' } }, { status: 'running', leaseUntil: { $lt: now } }]
  });
  if (!mission) throw httpError(409, "This mission can't be continued right now.", 'MISSION_STATE');
  return mission;
}

// The only way past a review: a tap on the card, naming the step that is waiting (R14)
export async function approveStep({ id, userId, stepId, picks }) {
  const current = await owned(id, userId);
  const wanted = clip(stepId, 20);
  if (current.status !== 'waiting_review' || !wanted || current.pendingStepId !== wanted) throw httpError(409, 'That step is not waiting for you.', 'MISSION_STATE');
  const now = new Date();
  const steps = current.steps.map((s) => {
    if (s.id !== wanted) return s;
    return s.status === 'awaiting_approval' ? { ...s, status: 'pending', approvedAt: now } : { ...s, reviewedAt: now };
  });
  // The job hunt's review is the user picking jobs: each pick becomes a step
  const waiting = current.steps.find((s) => s.id === wanted);
  if (waiting.tool === 'rank_jobs') steps.push(...packStepsFor(waiting, picks));
  const mission = await claim({ _id: id, userId, status: 'waiting_review', pendingStepId: wanted }, { steps });
  if (!mission) throw httpError(409, 'That step is not waiting for you.', 'MISSION_STATE');
  return mission;
}

// Stop tap. A running mission finishes the step in hand, then stops.
export async function stopMission({ id, userId }) {
  const mission = await owned(id, userId);
  if (['done', 'stopped'].includes(mission.status)) return publicMission(mission);
  if (mission.status === 'running' && mission.leaseUntil > new Date()) {
    await LeoMission.updateOne({ _id: id, status: 'running' }, { $set: { stopRequested: true } });
    return publicMission(await owned(id, userId));
  }
  await LeoMission.updateOne({ _id: id, userId }, {
    $set: { status: 'stopped', active: false, pendingStepId: '', stopRequested: false, message: 'Stopped. Everything finished so far is saved.', updatedAt: new Date() }
  });
  return publicMission(await owned(id, userId));
}

/**
 * Runs a claimed mission until it finishes or has to wait. Streams through send(event, data):
 *   step { step }       — a step changed
 *   progress { stepId, text } — the words a running step is writing
 *   mission { mission } — the mission reached a resting state
 * A closed tab (signal) lets the step in hand finish, so what it cost isn't wasted, then pauses.
 * Mission tokens are counted here and kept off the user's chat budget. Returns { tokens, status }.
 */
export async function runMission(mission, { resumeText, send, signal }) {
  const ai = { email: mission.email, tokens: 0, charge: async () => {} };
  // Keeps the lease while a long step works, and stops with the run
  const heartbeat = setInterval(() => {
    LeoMission.updateOne({ _id: mission._id, status: 'running' }, { $set: { leaseUntil: new Date(Date.now() + LEASE_MS) } }).catch(() => {});
  }, HEARTBEAT_MS);
  heartbeat.unref?.();
  const earlier = mission.tokensUsed || 0;
  const spent = () => earlier + ai.tokens;
  const ctx = {
    email: mission.email,
    resumeText: clip(resumeText, 15000),
    userId: mission.userId,
    conversationId: mission.conversationId,
    viaButton: false,
    flow: null,
    setFlow() {},
    summaryShown: false
  };

  const save = (patch = {}) => {
    const now = Date.now();
    return LeoMission.updateOne({ _id: mission._id }, { $set: { steps: mission.steps, tokensUsed: spent(), updatedAt: new Date(now), leaseUntil: new Date(now + LEASE_MS), ...patch } });
  };
  const rest = async (status, patch = {}) => {
    Object.assign(mission, { status, tokensUsed: spent() }, patch);
    await save({ status, ...patch });
    send('mission', { mission: publicMission(mission) });
    return { tokens: ai.tokens, status };
  };
  const stepChanged = async (step) => {
    await save();
    send('step', { step: publicStep(step) });
  };

  const drive = async () => {
    for (const step of mission.steps) {
      if (['done', 'removed', 'locked'].includes(step.status)) continue;

      const live = await LeoMission.findById(mission._id).select('stopRequested').lean();
      if (!live) return { tokens: ai.tokens, status: 'deleted' };
      if (live.stopRequested) return rest('stopped', { active: false, stopRequested: false, message: 'Stopped. Everything finished so far is saved.' });
      if (signal?.aborted) return rest('paused', { pausedReason: 'closed', message: 'Paused when the chat closed. Finished steps are saved.' });
      if (spent() >= mission.tokenCap) return rest('paused', { pausedReason: 'cap', message: 'This mission reached its AI limit. Everything finished so far is saved.' });

      if (step.risk === 'external' && !step.approvedAt) {
        step.status = 'awaiting_approval';
        return rest('waiting_review', { pendingStepId: step.id, message: `Waiting for your OK: ${step.title}.` });
      }

      step.status = 'running';
      await stepChanged(step);
      ctx.progress = (data) => send('progress', { stepId: step.id, ...data });
      let result = await runStepTool(step, ctx);
      if (result.card?.type === 'error') result = await runStepTool(step, ctx);
      step.card = result.card || null;
      step.summary = clip(result.summary, 1500);

      if (result.card?.type === 'error') {
        step.status = 'failed';
        await stepChanged(step);
        return rest('paused', { pausedReason: 'failed', message: `"${step.title}" didn't work after a retry. Try again, or stop and keep what's finished.` });
      }
      // A locked card, or a tool that ran nothing and only left a note
      if (result.card?.type === 'locked' || !result.card) {
        step.status = 'blocked';
        await stepChanged(step);
        return rest('paused', { pausedReason: 'blocked', message: result.card?.message || `"${step.title}" couldn't run. Stop the mission, or try again.` });
      }

      step.status = 'done';
      await stepChanged(step);
      if (step.review && !step.reviewedAt && result.review !== false) return rest('waiting_review', { pendingStepId: step.id, message: step.tool === 'rank_jobs' ? 'Pick the jobs you want Leo to prepare.' : `Check this result, then approve it to go on: ${step.title}.` });
    }
    return rest('done', { active: false, message: 'Mission complete. Everything is saved here in this chat.' });
  };

  try {
    return await runWithAiContext(ai, drive);
  } catch (err) {
    console.error('[leo] mission run failed:', err.message);
    await rest('paused', { pausedReason: 'failed', message: 'Something went wrong. Finished steps are saved. You can try again.' }).catch(() => {});
    return { tokens: ai.tokens, status: 'paused' };
  } finally {
    clearInterval(heartbeat);
  }
}

// ── Tools the chat model calls ──────────────────────────────────────────────
const fn = (name, description, properties = {}, required = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } }
});

export const agentToolDefinitions = (blocked = new Set()) => [
  fn('request_connector', 'Ask the user to connect a CVMind tool that is not connected yet. Shows a Connect button; their request runs as soon as they tap it.', {
    id: { type: 'string', description: 'The connector id.' }
  }, ['id']),
  fn('plan_mission', 'Plan a job that needs two or more CVMind tools, and show it as a plan card. Nothing runs until the user taps Start.', {
    goal: { type: 'string', description: 'What the user wants, in their words.' },
    steps: {
      type: 'array',
      description: `The steps in order, 2 to ${MAX_STEPS}.`,
      items: {
        type: 'object',
        properties: {
          tool: { type: 'string', enum: [...Object.keys(TOOL_META), ...Object.keys(extraTools)].filter((name) => !blocked.has(name)) },
          title: { type: 'string', description: 'Short step name the user reads, in their language.' },
          args: { type: 'object', description: 'The arguments that tool takes, filled in now, using only what the user said.' },
          review: { type: 'boolean', description: 'True when the user should check this result before the next step uses it.' }
        },
        required: ['tool', 'title', 'args']
      }
    }
  }, ['goal', 'steps']),
  fn('update_career_profile', 'Save details the user told you about themselves so you never ask again. Call it when they state or correct a lasting fact, or ask you to remember one. Tell them what you saved.', {
    fields: { type: 'object', description: 'Only the fields the user just gave or corrected.', properties: DRAFT_PROPERTIES },
    replace: { type: 'array', items: { type: 'string', enum: ['education', 'experience', 'projects', 'skills', 'achievements'] }, description: 'List fields to replace instead of add to, when the user corrects a list.' }
  }, ['fields']),
  fn('show_career_profile', 'Show what Leo has saved about the user, with buttons to edit or delete it. Use it when they ask what you know about them, or ask to change or delete it.'),
  fn('plan_job_hunt', 'Start a job hunt: find and rank real jobs, let the user pick, then prepare a tailored resume, cover letter and referral message for each pick. Use it when they want a job or to apply, not when they only want to see listings.', {
    goal: { type: 'string', description: 'What the user wants, in their words.' },
    role: { type: 'string', description: 'The role, e.g. "React developer".' },
    location: { type: 'string', description: 'City, if they named one.' },
    company: { type: 'string', description: 'Company, if they named one.' },
    remote: { type: 'boolean', description: 'True when they want remote work.' }
  }, ['role']),
  fn('set_job_alerts', 'Turn job alert emails on or off, only when the user asks. Daily needs CVMind Pro.', {
    enabled: { type: 'boolean' },
    frequency: { type: 'string', enum: ['weekly', 'daily'] }
  }, ['enabled']),
  fn('set_reminder', 'Email the user a reminder at a time they asked for, e.g. before an interview. Only when they ask.', {
    text: { type: 'string', description: 'What to remind them about, in their words.' },
    when: { type: 'string', description: 'When, as an ISO 8601 date and time with the +05:30 offset unless they said otherwise.' }
  }, ['text', 'when']),
  fn('show_reminders', 'Show the reminders the user has set, with a Cancel button on each.'),
  ...CAREER_TOOL_DEFINITIONS
];

export const AGENT_TOOL_STATUS = {
  plan_mission: 'Planning the steps',
  request_connector: 'Checking your connectors',
  update_career_profile: 'Saving to your Career Profile',
  show_career_profile: 'Opening your Career Profile',
  plan_job_hunt: 'Planning your job hunt',
  set_job_alerts: 'Updating your job alerts',
  set_reminder: 'Setting your reminder',
  show_reminders: 'Opening your reminders'
};

export const isAgentTool = (name) => Object.hasOwn(AGENT_TOOL_STATUS, name);

const RUNNERS = {
  plan_mission: planMission,

  async request_connector(args, ctx) {
    const connector = connectorById(clip(args.id, 40));
    if (!connector) return { card: null, summary: 'There is no connector with that id.' };
    if ((await getConnected(ctx.userId)).includes(connector.id)) return { card: null, summary: `${connector.label} is already connected. Use its tools.` };
    return connectCard(connector);
  },

  plan_job_hunt: planJobHunt,

  async set_job_alerts(args, ctx) {
    try {
      const alerts = await saveAlertSettings(ctx.userId, ctx.email, { enabled: args.enabled === true, ...(args.frequency ? { frequency: args.frequency } : {}) });
      const message = alerts.enabled ? `Job alerts are on, ${alerts.frequency}. Every email has an unsubscribe link.` : 'Job alerts are off.';
      return { card: { type: 'profile_note', message, page: 'job-finder' }, summary: message };
    } catch (err) {
      if (err.status === 402) return blocked('upgrade', err.message);
      throw err;
    }
  },

  async set_reminder(args, ctx) {
    const { reminder, problem } = await createReminder({ userId: ctx.userId, email: ctx.email, name: ctx.firstName, text: args.text, when: args.when });
    if (problem) return { card: null, summary: `Not set: ${problem}` };
    return { card: { type: 'reminders', items: [reminder] }, summary: 'The reminder is set and shown on the card with a Cancel button. Confirm it in one short sentence.' };
  },

  async show_reminders(args, ctx) {
    return { card: { type: 'reminders', items: await openReminders(ctx.userId) }, summary: 'Their reminders are on the card. Say so in one short sentence.' };
  },

  async update_career_profile(args, ctx) {
    const replace = (Array.isArray(args.replace) ? args.replace : []).map(String);
    const { changed } = await mergeFacts(ctx.userId, args.fields, 'chat', replace);
    if (!changed.length) return { card: null, summary: 'Nothing new to save.' };
    return {
      card: { type: 'profile_note', message: `Saved to your Career Profile: ${changed.join(', ')}.` },
      summary: `Saved: ${changed.join(', ')}.`
    };
  },

  async show_career_profile(args, ctx) {
    const profile = await getProfile(ctx.userId);
    return { card: profileCard(profile), summary: 'The saved profile is shown as a card with Edit and Delete buttons. Only those buttons delete it. Say so in one short sentence.' };
  }
};

export async function runAgentTool(name, args, ctx) {
  return RUNNERS[name](args || {}, ctx);
}

import mongoose from 'mongoose';
import { LeoConversation, LeoTurn } from './models.js';
import { AGENT_PROMPT, PERSONA, PROMPT_VERSION } from './persona.js';
import { streamChat } from './llm.js';
import { TOOL_DEFINITIONS, TOOL_STATUS, runTool, looksCard, looksListedInText } from './tools.js';
import {
  FLOW_TOOL_DEFINITIONS, FLOW_TOOL_STATUS, isFlowTool, runFlowTool, flowPrompt, publicFlow, beginTurn, endTurn
} from './flows/index.js';
import { AGENT_TOOL_STATUS, agentToolDefinitions, isAgentTool, runAgentTool } from './missions/index.js';
import { getProfile, profilePrompt } from './careerProfile.js';
import { MAX_RESUME_CHARS } from './limits.js';
import { blockedToolsFor, connectCard, connectorForTool, connectorPrompt } from './connectors.js';

export { MAX_RESUME_CHARS };

// Earlier turns sent back to the model with each new message
const HISTORY_TURNS = 8;
export const MAX_MESSAGE_CHARS = 4000;
// Model calls per message: tool rounds, then a final reply without tools
const MAX_ROUNDS = 3;
const MAX_TOOLS_PER_ROUND = 2;

// Tests swap the model call for a fake stream
let stream = streamChat;
export function setLeoStream(fn) {
  stream = fn || streamChat;
}

const clip = (value, max) => String(value ?? '').trim().slice(0, max);
const firstName = (name) => clip(name, 60).split(/\s+/)[0] || '';

// The per-user part of the system prompt: who the user is and what they attached
export function buildContext({ user, resume, profile = null }) {
  const lines = [];
  const name = firstName(user?.name);
  if (name) lines.push(`The user's first name is ${name}.`);
  else if (!user) lines.push('The user is not signed in. Tailoring, cover letters, interview questions and portfolios need a free account; the tool will ask them to sign in.');
  const text = clip(resume?.text, MAX_RESUME_CHARS);
  if (text.length >= 50) {
    lines.push(`The user attached their resume${resume.name ? ` ("${clip(resume.name, 120)}")` : ''}:\n<data>\n${text.replace(/<\/?data>/gi, '')}\n</data>`);
  } else if (!profile?.masterResumeText) {
    lines.push('No resume is attached.');
  }
  // The saved resume reaches the tools but not the prompt, so it doesn't cost tokens on every message
  const saved = profilePrompt(profile);
  if (saved) lines.push(saved);
  return lines.join('\n');
}

export const turnCost = (usage, prices) =>
  (usage.tokensIn * (prices.inputPricePerM || 0) + usage.tokensOut * (prices.outputPricePerM || 0)) / 1e6;

// The user's conversation, or a new one when id is missing or isn't theirs
export async function openConversation({ userId, conversationId }) {
  if (conversationId && mongoose.isValidObjectId(conversationId)) {
    const existing = await LeoConversation.findOne({ _id: conversationId, userId, deletedAt: null });
    if (existing) return existing;
  }
  return LeoConversation.create({ userId, page: 'chat' });
}

// What the model sees of a past assistant turn: its words plus what its tools found. Flow tools are
// left out: the live draft is in the system prompt, and replaying their notes every turn taught the
// model to copy them into its replies.
const pastReply = (reply, toolCalls = []) => {
  const found = toolCalls.filter((t) => !isFlowTool(t?.name)).map((t) => t?.summary).filter(Boolean);
  return [reply, found.length ? `[Tool results shown to the user: ${found.join(' | ')}]` : ''].filter(Boolean).join('\n');
};

async function savedHistory(conversationId) {
  const turns = await LeoTurn.find({ conversationId, deletedAt: null })
    .sort({ createdAt: -1 }).limit(HISTORY_TURNS).select('prompt reply toolCalls').lean();
  return turns.reverse().flatMap((t) => [
    { role: 'user', content: t.prompt },
    { role: 'assistant', content: pastReply(t.reply, t.toolCalls) || '…' }
  ]);
}

// Signed-out visitors keep their chat in the browser and send it back with each message
export function guestHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-HISTORY_TURNS * 2)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({ role: m.role, content: clip(m.content, MAX_MESSAGE_CHARS) || '…' }));
}

// Runs a tool call, flow and agent tools included. Never throws: failures come back as an error card.
async function execute(call, ctx) {
  // Leo isn't offered these tools; this stops a call that names one anyway
  if (ctx.blockedTools.has(call.name)) return connectCard(connectorForTool(call.name));
  if (!isFlowTool(call.name) && !isAgentTool(call.name)) return runTool(call, ctx);
  let args = {};
  try { args = call.arguments ? JSON.parse(call.arguments) : {}; } catch { /* bad JSON: run with defaults */ }
  try {
    if (isAgentTool(call.name)) {
      const result = await runAgentTool(call.name, args, ctx);
      // Later tools in this turn see what was just saved
      if (call.name === 'update_career_profile') ctx.profile = await getProfile(ctx.userId);
      return result;
    }
    return await runFlowTool(call.name, args, ctx);
  } catch (err) {
    console.error(`[leo] flow tool ${call.name} failed:`, err.message);
    return { card: { type: 'error', message: "That didn't work just now. Please try again in a moment." }, summary: `The tool failed: ${clip(err.message, 200)}` };
  }
}

/**
 * Runs one chat turn. Streams through send(event, data):
 *   delta { text }            — Leo's words as they arrive
 *   tool  { id, name, label } — a tool started
 *   progress { id, stage | html | reset } — a long tool showing its work (a portfolio being built)
 *   card  { id, card }        — a tool's result (see leo/tools.js, leo/flows)
 *   flow  { flow }            — the guided flow changed (the browser keeps it for guests)
 *   done  { turnId, stopReason } or error { code, error }
 * Signed-in turns are saved to the conversation; guest turns (conversation null) are not.
 *
 * flows: guided flows are on ('leo-flows' switch). flow: the open flow (normalized), or null.
 * preCalls: tool calls a card tap asked for, run before the model speaks.
 * agent: missions and the Career Profile are on ('leo-agent' switch). profile: the user's saved one.
 * notes: cards to show before the reply, such as a resume just saved to the profile.
 */
export async function runTurn({ user, email, conversation, history = [], message, resume, settings, signal, send, flows: flowsWanted = false, flow = null, preCalls = [], viaButton = false, flowBefore: savedFlow, agent = false, profile = null, notes = [], connected = null }) {
  const started = Date.now();
  // A card tap changes the flow before the turn starts; savedFlow is how it looked before that,
  // so the change is still saved
  const flowBefore = savedFlow ?? JSON.stringify(flow);
  const useAgent = agent && !!user && !!conversation;
  // connected is null when there's nothing to enforce: guests, Agent Mode off, or the lookup failed
  const blockedTools = useAgent && connected ? blockedToolsFor(connected) : new Set();
  const flows = flowsWanted && !blockedTools.has('start_flow');
  const system = [PERSONA, buildContext({ user, resume, profile: useAgent ? profile : null })];
  if (useAgent) {
    if (connected) system.push(connectorPrompt(connected));
    system.push(AGENT_PROMPT, `The time now is ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })} IST.`);
    const { mock } = conversation;
    if (mock) system.push(`A mock interview is open: question ${mock.at + 1} of ${mock.questions.length}. Unless the user clearly asks something else, their message is their answer: pass it word for word to answer_mock_interview. If they want to stop, call it with stop set.`);
  }
  if (flows) {
    beginTurn(flow);
    system.push(flowPrompt(flow));
  }
  const messages = [
    { role: 'system', content: system.join('\n\n') },
    ...(conversation ? await savedHistory(String(conversation._id)) : guestHistory(history)),
    { role: 'user', content: message }
  ];
  const tools = [...TOOL_DEFINITIONS, ...(flows ? FLOW_TOOL_DEFINITIONS : []), ...(useAgent ? agentToolDefinitions(blockedTools) : [])].filter((t) => !blockedTools.has(t.function.name));
  const attached = clip(resume?.text, MAX_RESUME_CHARS);
  const saved = useAgent ? clip(profile?.masterResumeText, MAX_RESUME_CHARS) : '';
  const ctx = {
    email: user ? email : null,
    resumeText: attached.length >= 50 ? attached : saved,
    // The resume comes from the Career Profile, not from a file attached to this chat
    usingSavedResume: attached.length < 50 && saved.length >= 50,
    userId: conversation?.userId || 'guest',
    conversationId: conversation ? String(conversation._id) : 'guest',
    viaButton,
    flow,
    setFlow(next) { ctx.flow = next; },
    summaryShown: false,
    agent: useAgent,
    blockedTools,
    profile: useAgent ? profile : null,
    settings,
    emailVerified: user ? user.emailVerified !== false : false,
    firstName: firstName(user?.name)
  };

  let reply = '';
  const usage = { tokensIn: 0, tokensOut: 0 };
  const toolLog = [];
  for (const card of notes) {
    send('card', { id: 'profile_note', card });
    toolLog.push({ name: 'save_resume', card, summary: 'Saved the attached resume to the Career Profile.' });
  }
  let model = settings.model;
  let stopReason = '';
  let nudged = false;

  const runCalls = async (calls) => {
    for (const call of calls) {
      send('tool', { id: call.id, name: call.name, label: TOOL_STATUS[call.name] || FLOW_TOOL_STATUS[call.name] || AGENT_TOOL_STATUS[call.name] || 'Working on it' });
      ctx.progress = (data) => send('progress', { id: call.id, ...data });
      const result = await execute(call, ctx);
      ctx.progress = null;
      if (signal?.aborted) throw new Error('aborted');
      if (result.card) send('card', { id: call.id, card: result.card });
      toolLog.push({ name: call.name, card: result.card, summary: clip(result.summary, 1500) });
      messages.push({ role: 'tool', tool_call_id: call.id, content: result.summary || 'Done.' });
    }
  };

  try {
    // A card tap's tool calls run first, as if the model had asked for them
    const tapped = preCalls.map((c, i) => ({ id: `tap_${i}`, name: c.name, arguments: JSON.stringify(c.arguments || {}) }));
    if (tapped.length) {
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: tapped.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } }))
      });
      await runCalls(tapped);
    }

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const lastRound = round === MAX_ROUNDS - 1;
      let text = '';
      let calls = [];
      let skipped = [];
      let claudeContent;
      for await (const event of stream({ model: settings.model, messages, maxTokens: settings.maxTokens, tools: lastRound ? undefined : tools, pastTools: tools, signal })) {
        if (event.type === 'text') {
          // A new round's words start a new paragraph
          const delta = !text && reply ? `\n\n${event.delta}` : event.delta;
          text += event.delta;
          reply += delta;
          send('delta', { text: delta });
        } else if (event.type === 'done') {
          usage.tokensIn += event.usage?.tokensIn || 0;
          usage.tokensOut += event.usage?.tokensOut || 0;
          model = event.model || model;
          calls = (event.toolCalls || []).slice(0, MAX_TOOLS_PER_ROUND);
          skipped = (event.toolCalls || []).slice(MAX_TOOLS_PER_ROUND);
          claudeContent = event.claudeContent;
          stopReason = event.finishReason === 'length' ? 'length' : '';
        }
      }
      if (!calls.length) {
        // Mid-flow the model sometimes says its piece before the tool, then nothing after it;
        // one more round lets it ask the next question instead of leaving the user hanging
        const hanging = flows && !text.trim() && toolLog.length && ctx.flow?.step === 'collect' && !nudged && round < MAX_ROUNDS - 1;
        if (!hanging) break;
        nudged = true;
        messages.push({ role: 'system', content: 'Continue your reply: ask the next question now, in one or two short sentences.' });
        continue;
      }

      messages.push({
        role: 'assistant',
        content: text || null,
        tool_calls: calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments || '{}' } })),
        ...(claudeContent ? { claudeContent } : {})
      });
      await runCalls(calls);
      // Claude needs an answer for every tool it asked for, including the ones over the limit
      if (claudeContent) for (const c of skipped) messages.push({ role: 'tool', tool_call_id: c.id, content: 'Not run: too many tools at once. Ask again if it is still needed.' });
    }
  } catch (err) {
    stopReason = signal?.aborted ? 'aborted' : 'error';
    if (!signal?.aborted) console.error('[leo] model call failed:', err.message);
  }

  if (!signal?.aborted && looksListedInText(reply, toolLog)) {
    const card = looksCard();
    send('card', { id: 'portfolio_looks', card });
    toolLog.push({ name: 'build_portfolio', card, summary: 'Showed the looks as buttons.' });
  }

  // The draft decides when it's complete, not the model: show the summary if it was missed
  if (flows && ctx.flow && !signal?.aborted) {
    const card = endTurn(ctx.flow, ctx);
    if (card) {
      send('card', { id: 'flow_summary', card });
      toolLog.push({ name: 'update_draft', card, summary: 'Draft complete; summary card shown for the user to confirm.' });
    }
  }
  const flowChanged = flows && JSON.stringify(ctx.flow) !== flowBefore;
  if (flowChanged && ctx.flow) ctx.flow.updatedAt = new Date();
  if (flowChanged) send('flow', { flow: publicFlow(ctx.flow) });

  let turnId = null;
  if (conversation) {
    const turn = await LeoTurn.create({
      conversationId: String(conversation._id),
      userId: conversation.userId,
      email,
      page: 'chat',
      prompt: message,
      reply,
      toolCalls: toolLog,
      model,
      promptVersion: PROMPT_VERSION,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      costUsd: turnCost(usage, settings),
      latencyMs: Date.now() - started,
      stopReason
    });
    turnId = String(turn._id);
    await LeoConversation.updateOne(
      { _id: conversation._id },
      { $set: { updatedAt: new Date(), ...(conversation.title ? {} : { title: clip(message, 80) }), ...(flowChanged ? { flow: ctx.flow } : {}) } }
    );
  } else if (mongoose.connection.readyState === 1) {
    // Guest turns: only usage and cost are kept, never what the visitor wrote
    await LeoTurn.create({
      conversationId: 'guest',
      userId: 'guest',
      page: 'chat',
      toolCalls: toolLog.map((t) => ({ name: t.name })),
      model,
      promptVersion: PROMPT_VERSION,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      costUsd: turnCost(usage, settings),
      latencyMs: Date.now() - started,
      stopReason
    }).catch((err) => console.error('[leo] guest usage log failed:', err.message));
  }

  if (stopReason === 'error' && !reply && !toolLog.length) {
    send('error', { code: 'LEO_FAILED', error: "Leo couldn't answer just now. Please try again in a moment." });
  } else {
    send('done', { turnId, stopReason });
  }
  checkBudget(settings).catch((err) => console.error('[leo] budget check failed:', err.message));
  return { turnId, reply, toolLog, usage, flow: ctx.flow };
}

// One row per mission run, in the same table as chat turns, so the admin AI activity list and the
// budget alert include missions. It has no chat of its own, so it never shows in a thread.
// The provider split isn't known at this level, so all tokens are priced as input.
export async function recordMissionUsage({ mission, tokens, status, settings, latencyMs }) {
  await LeoTurn.create({
    conversationId: `mission:${mission._id}`,
    userId: mission.userId,
    email: mission.email,
    page: 'mission',
    prompt: mission.goal,
    reply: status,
    toolCalls: (mission.steps || []).filter((s) => s.status === 'done').map((s) => ({ name: s.tool })),
    model: settings.model,
    promptVersion: PROMPT_VERSION,
    tokensIn: tokens,
    costUsd: turnCost({ tokensIn: tokens, tokensOut: 0 }, settings),
    latencyMs,
    stopReason: status === 'done' ? '' : status
  });
  await checkBudget(settings);
}

// Warns once per day (per server instance) when today's Leo spend crosses the budget in settings
let budgetAlertDay = '';
async function checkBudget(settings) {
  if (!settings.dailyBudgetUsd) return;
  const day = new Date().toISOString().slice(0, 10);
  if (budgetAlertDay === day) return;
  const [row] = await LeoTurn.aggregate([
    { $match: { createdAt: { $gte: new Date(`${day}T00:00:00.000Z`) } } },
    { $group: { _id: null, total: { $sum: '$costUsd' } } }
  ]);
  if ((row?.total || 0) >= settings.dailyBudgetUsd) {
    budgetAlertDay = day;
    console.error(`[leo] ALERT: today's Leo AI spend is $${row.total.toFixed(2)}, over the $${settings.dailyBudgetUsd} daily budget.`);
  }
}

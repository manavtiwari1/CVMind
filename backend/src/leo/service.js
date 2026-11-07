import mongoose from 'mongoose';
import { LeoConversation, LeoTurn } from './models.js';
import { PERSONA, PROMPT_VERSION } from './persona.js';
import { streamChat } from './llm.js';
import { TOOL_DEFINITIONS, TOOL_STATUS, runTool } from './tools.js';

// Earlier turns sent back to the model with each new message
const HISTORY_TURNS = 8;
export const MAX_MESSAGE_CHARS = 4000;
// Resume text kept in the prompt; enough for a two-page resume
export const MAX_RESUME_CHARS = 15000;
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
export function buildContext({ user, resume }) {
  const lines = [];
  const name = firstName(user?.name);
  if (name) lines.push(`The user's first name is ${name}.`);
  else if (!user) lines.push('The user is not signed in. Tailoring and cover letters need a free account; the tool will ask them to sign in.');
  const text = clip(resume?.text, MAX_RESUME_CHARS);
  if (text.length >= 50) {
    lines.push(`The user attached their resume${resume.name ? ` ("${clip(resume.name, 120)}")` : ''}:\n<data>\n${text.replace(/<\/?data>/gi, '')}\n</data>`);
  } else {
    lines.push('No resume is attached.');
  }
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

// What the model sees of a past assistant turn: its words plus what its tools found
const pastReply = (reply, toolCalls = []) => {
  const found = toolCalls.map((t) => t?.summary).filter(Boolean);
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

/**
 * Runs one chat turn. Streams through send(event, data):
 *   delta { text }            — Leo's words as they arrive
 *   tool  { id, name, label } — a tool started
 *   card  { id, card }        — a tool's result (see leo/tools.js)
 *   done  { turnId, stopReason } or error { code, error }
 * Signed-in turns are saved to the conversation; guest turns (conversation null) are not.
 */
export async function runTurn({ user, email, conversation, history = [], message, resume, settings, signal, send }) {
  const started = Date.now();
  const messages = [
    { role: 'system', content: `${PERSONA}\n\n${buildContext({ user, resume })}` },
    ...(conversation ? await savedHistory(String(conversation._id)) : guestHistory(history)),
    { role: 'user', content: message }
  ];
  const ctx = { email: user ? email : null, resumeText: clip(resume?.text, MAX_RESUME_CHARS) };

  let reply = '';
  const usage = { tokensIn: 0, tokensOut: 0 };
  const toolLog = [];
  let model = settings.model;
  let stopReason = '';

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const lastRound = round === MAX_ROUNDS - 1;
      let text = '';
      let calls = [];
      for await (const event of stream({ model: settings.model, messages, maxTokens: settings.maxTokens, tools: lastRound ? undefined : TOOL_DEFINITIONS, signal })) {
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
          stopReason = event.finishReason === 'length' ? 'length' : '';
        }
      }
      if (!calls.length) break;

      messages.push({
        role: 'assistant',
        content: text || null,
        tool_calls: calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments || '{}' } }))
      });
      for (const call of calls) {
        send('tool', { id: call.id, name: call.name, label: TOOL_STATUS[call.name] || 'Working on it' });
        const result = await runTool(call, ctx);
        if (signal?.aborted) throw new Error('aborted');
        if (result.card) send('card', { id: call.id, card: result.card });
        toolLog.push({ name: call.name, card: result.card, summary: clip(result.summary, 1500) });
        messages.push({ role: 'tool', tool_call_id: call.id, content: result.summary || 'Done.' });
      }
    }
  } catch (err) {
    stopReason = signal?.aborted ? 'aborted' : 'error';
    if (!signal?.aborted) console.error('[leo] model call failed:', err.message);
  }

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
      { $set: { updatedAt: new Date(), ...(conversation.title ? {} : { title: clip(message, 80) }) } }
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
  return { turnId, reply, toolLog, usage };
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

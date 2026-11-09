// Claude client. Serves every AI feature except the five that stay on DeepSeek:
// AI Proofreading, Offer Negotiation, LinkedIn Profile PDF Audit, Bio & Banner, Outreach & DM.

import Anthropic from '@anthropic-ai/sdk';
import { chargeAiUsage } from '../billing/aiContext.js';
import { logAiCall } from '../billing/aiCalls.js';

export const claudeModel = () => process.env.CLAUDE_MODEL || 'claude-opus-5-5';
export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

// Reasoning counts against this limit too, so it has to be far above the reply's own length.
// Only tokens actually written are billed.
const MAX_OUTPUT_TOKENS = 64000;

let client = null;
function getClient() {
  if (!claudeConfigured()) throw new Error('ANTHROPIC_API_KEY is not configured on the server.');
  client ||= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// A request Claude declines is re-run on another model inside the same call. Haiku has no such fallback.
const fallbackParams = (model) => (/haiku/i.test(model)
  ? {}
  : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });

export function openClaudeStream({ model = claudeModel(), system, messages, tools, toolChoice, effort = 'medium', maxTokens = MAX_OUTPUT_TOKENS, signal }) {
  return getClient().beta.messages.stream({
    model,
    max_tokens: maxTokens,
    output_config: { effort },
    messages,
    ...(system ? { system } : {}),
    ...(tools?.length ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    ...fallbackParams(model)
  }, signal ? { signal } : undefined);
}

export const claudeTokens = (usage = {}) => ({
  tokensIn: (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0),
  tokensOut: usage.output_tokens || 0
});

// One full reply as text. Streams underneath so long replies don't hit HTTP timeouts.
// onText gets the reply's words as they are written.
export async function completeClaude({ system, prompt, effort, onText }) {
  const stream = openClaudeStream({ system, messages: [{ role: 'user', content: prompt }], effort });
  if (onText) stream.on('text', (delta) => onText(delta));
  const message = await stream.finalMessage();
  chargeAiUsage(claudeTokens(message.usage));
  logAiCall({ provider: 'claude', model: message.model, ...claudeTokens(message.usage) });
  if (message.stop_reason === 'refusal') throw new Error('The AI declined this request.');
  return {
    text: message.content.filter((block) => block.type === 'text').map((block) => block.text).join('').trim(),
    truncated: message.stop_reason === 'max_tokens'
  };
}

// The JSON value in a reply, ignoring code fences or stray words around it
export function parseClaudeJson(text) {
  const start = text.search(/[{[]/);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start === -1 || end < start) throw new Error('The AI did not return JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

// Leo's tools are written in the OpenAI function format
export const toClaudeTools = (tools = []) => tools.map(({ function: fn }) => ({
  name: fn.name,
  description: fn.description || '',
  input_schema: fn.parameters || { type: 'object', properties: {} }
}));

// Leo's OpenAI-format conversation as Claude's { system, messages }. An assistant turn Claude wrote
// carries its original blocks in claudeContent: thinking blocks must go back unchanged.
export function toClaudeRequest(conversation) {
  const messages = [];
  const addUserBlock = (block) => {
    const last = messages.at(-1);
    if (last?.role === 'user') last.content.push(block);
    else messages.push({ role: 'user', content: [block] });
  };

  const [first, ...rest] = conversation;
  const system = first?.role === 'system' ? first.content : undefined;

  for (const m of system === undefined ? conversation : rest) {
    if (m.role === 'tool') {
      addUserBlock({ type: 'tool_result', tool_use_id: m.tool_call_id, content: String(m.content || 'Done.') });
    } else if (m.role === 'assistant') {
      messages.push({ role: 'assistant', content: m.claudeContent || assistantBlocks(m) });
    } else {
      // Later system notes (a nudge between rounds) go in as ordinary text
      addUserBlock({ type: 'text', text: String(m.content || '…') });
    }
  }
  return { system, messages };
}

function assistantBlocks(m) {
  const blocks = m.content ? [{ type: 'text', text: String(m.content) }] : [];
  for (const call of m.tool_calls || []) {
    let input = {};
    try { input = JSON.parse(call.function.arguments || '{}'); } catch { /* bad JSON: send no arguments */ }
    blocks.push({ type: 'tool_use', id: call.id, name: call.function.name, input });
  }
  return blocks.length ? blocks : [{ type: 'text', text: '…' }];
}

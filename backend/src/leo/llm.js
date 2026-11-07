// Streaming chat client for Leo. Every provider here speaks the OpenAI chat completions format:
// DeepSeek (the default, same key as the other AI features), Gemini through its OpenAI-compatible
// endpoint, or any endpoint set in LEO_LLM_BASE_URL (e.g. a fine-tuned Leo model later).

import { chargeAiUsage } from '../billing/aiContext.js';

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// Which endpoint and key serve this model. Throws when no key is configured.
export function resolveProvider(model) {
  if (process.env.LEO_LLM_BASE_URL && process.env.LEO_LLM_API_KEY) {
    return { url: `${process.env.LEO_LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`, key: process.env.LEO_LLM_API_KEY, model };
  }
  const wantsGemini = /^gemini/i.test(model);
  if (!wantsGemini && process.env.DEEPSEEK_API_KEY) return { url: DEEPSEEK_URL, key: process.env.DEEPSEEK_API_KEY, model };
  if (process.env.GEMINI_API_KEY) {
    return { url: GEMINI_URL, key: process.env.GEMINI_API_KEY, model: wantsGemini ? model : process.env.GEMINI_MODEL || 'gemini-3.5-flash' };
  }
  throw Object.assign(new Error('Leo has no AI key configured on the server.'), { code: 'LEO_NOT_CONFIGURED' });
}

// Rough count for providers that don't report usage on streamed replies
export const estimateTokens = (text) => Math.ceil(String(text || '').length / 4);

// Yields { type: 'text', delta } as the reply streams, then { type: 'done', usage, finishReason, model, toolCalls }.
// With `tools` (OpenAI function format) the model may ask for tool calls instead of, or after, text;
// they arrive in pieces and are returned whole in toolCalls: [{ id, name, arguments }].
export async function* streamChat({ model, messages, maxTokens = 600, temperature = 0.5, tools, signal }) {
  const provider = resolveProvider(model);
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      ...(tools?.length ? { tools, tool_choice: 'auto' } : {})
    }),
    signal
  });
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Leo model error ${response.status}: ${detail.slice(0, 300)}`);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let usage = null;
  let finishReason = '';
  let text = '';
  const calls = [];

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      let event;
      try { event = JSON.parse(data); } catch { continue; }
      if (event.usage) usage = event.usage;
      const choice = event.choices?.[0];
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      for (const part of choice?.delta?.tool_calls || []) {
        const i = part.index ?? calls.length;
        calls[i] ||= { id: '', name: '', arguments: '' };
        if (part.id) calls[i].id = part.id;
        if (part.function?.name) calls[i].name += part.function.name;
        if (part.function?.arguments) calls[i].arguments += part.function.arguments;
      }
      const delta = choice?.delta?.content;
      if (delta) {
        text += delta;
        yield { type: 'text', delta };
      }
    }
  }

  const promptChars = messages.reduce((n, m) => n + String(m.content || '').length, 0);
  const spent = {
    tokensIn: usage?.prompt_tokens ?? Math.ceil(promptChars / 4),
    tokensOut: usage?.completion_tokens ?? estimateTokens(text + calls.map((c) => c.arguments).join(''))
  };
  chargeAiUsage(spent);
  const toolCalls = calls.filter((c) => c?.name).map((c, i) => ({ ...c, id: c.id || `call_${i}` }));
  yield { type: 'done', model: provider.model, finishReason, usage: spent, toolCalls };
}

// One JSON reply, not streamed. Returns { data, usage, model }; throws when the reply isn't JSON.
export async function completeJson({ model, messages, maxTokens = 300, temperature = 0.2, signal }) {
  const provider = resolveProvider(model);
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    }),
    signal
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Leo model error ${response.status}: ${detail.slice(0, 300)}`);
  }
  const result = await response.json();
  const text = String(result.choices?.[0]?.message?.content || '').trim().replace(/^```(?:json)?\s*|```$/g, '');
  const promptChars = messages.reduce((n, m) => n + String(m.content || '').length, 0);
  const spent = {
    tokensIn: result.usage?.prompt_tokens ?? Math.ceil(promptChars / 4),
    tokensOut: result.usage?.completion_tokens ?? estimateTokens(text)
  };
  chargeAiUsage(spent);
  return { data: JSON.parse(text), model: provider.model, usage: spent };
}

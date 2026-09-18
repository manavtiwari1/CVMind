import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { RetryableError, FatalError } from '../errors.js';

export { RetryableError, FatalError };

// Model IDs are env-configurable because Gemini retires models often (gemini-1.5-flash is gone)
export const getModel = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash';
export const getEmbedModel = () => process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
export const getEmbedDims = () => Number(process.env.GEMINI_EMBED_DIMS) || 768;

const EMBED_BATCH_SIZE = 100;

let defaultClient = null;

export function getClient(apiKey) {
  // A user-supplied key (x-gemini-key) gets its own client; the server key client is shared
  if (apiKey) return new GoogleGenAI({ apiKey });
  if (!process.env.GEMINI_API_KEY) {
    throw new FatalError('GEMINI_API_KEY is not configured.', { code: 'AI_NOT_CONFIGURED' });
  }
  if (!defaultClient) defaultClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return defaultClient;
}

export function classifyError(err) {
  if (err instanceof RetryableError || err instanceof FatalError) return err;
  const status = Number(err?.status ?? err?.code) || Number(String(err?.message || '').match(/\b(4\d\d|5\d\d)\b/)?.[1]);
  const networkCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_SOCKET'];
  const isNetwork = err?.name === 'AbortError'
    || networkCodes.includes(err?.cause?.code || err?.code)
    || /fetch failed|timed? ?out/i.test(String(err?.message || ''));

  if (status === 429 || status >= 500 || isNetwork) {
    return new RetryableError(`Gemini request failed: ${err?.message || err}`, { cause: err, code: status ? `HTTP_${status}` : 'NETWORK' });
  }
  return new FatalError(`Gemini request failed: ${err?.message || err}`, { cause: err, code: status ? `HTTP_${status}` : 'UNKNOWN' });
}

export function toGeminiJsonSchema(schema) {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema);
  return jsonSchema;
}

function parseJsonText(text) {
  try {
    return JSON.parse(String(text || '').replace(/```json\n?|```\n?/g, '').trim());
  } catch {
    return undefined;
  }
}

const REPAIR_NOTE = 'Your previous response did not match the required JSON schema:';

// Plain prompts get the note appended; multipart contents (e.g. an attached PDF) get it as an extra text part
function withRepairNote(base, issues) {
  const note = `${REPAIR_NOTE}\n${issues}\nReturn only corrected JSON.`;
  if (typeof base === 'string') return `${base}\n\n${note}`;
  return base.map((content, i) => (i === base.length - 1 ? { ...content, parts: [...content.parts, { text: note }] } : content));
}

// Structured JSON generation validated against a zod schema, with one repair attempt on mismatch
export async function generateStructured({ schema, prompt, contents: baseContents, system, temperature = 0.2, apiKey, client, model }) {
  const ai = client || getClient(apiKey);
  const config = {
    temperature,
    responseMimeType: 'application/json',
    responseJsonSchema: toGeminiJsonSchema(schema),
    ...(system ? { systemInstruction: system } : {})
  };

  const base = baseContents ?? prompt;
  let contents = base;
  let issues = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    try {
      response = await ai.models.generateContent({ model: model || getModel(), contents, config });
    } catch (err) {
      throw classifyError(err);
    }

    const parsed = parseJsonText(response?.text);
    if (parsed === undefined) {
      issues = 'The response was not valid JSON.';
    } else {
      const result = schema.safeParse(parsed);
      if (result.success) return result.data;
      issues = z.prettifyError(result.error);
    }
    contents = withRepairNote(base, issues);
  }

  throw new FatalError(`Gemini output did not match schema: ${issues}`, { code: 'SCHEMA_MISMATCH' });
}

export function l2normalize(values) {
  const vec = Float32Array.from(values);
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

// Vectors are unit length, so cosine similarity is the dot product
export function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export async function embedTexts(texts, { taskType = 'SEMANTIC_SIMILARITY', apiKey, client, model, dims } = {}) {
  if (!texts.length) return [];
  const ai = client || getClient(apiKey);
  const vectors = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    let response;
    try {
      response = await ai.models.embedContent({
        model: model || getEmbedModel(),
        contents: batch,
        config: { taskType, outputDimensionality: dims || getEmbedDims() }
      });
    } catch (err) {
      throw classifyError(err);
    }
    const embeddings = response?.embeddings || [];
    if (embeddings.length !== batch.length) {
      throw new RetryableError(`Expected ${batch.length} embeddings, got ${embeddings.length}.`, { code: 'EMBED_COUNT_MISMATCH' });
    }
    // gemini-embedding-001 only returns unit vectors at full size, so normalize truncated ones
    for (const e of embeddings) vectors.push(l2normalize(e.values));
  }

  return vectors;
}

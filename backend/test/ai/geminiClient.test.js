import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  generateStructured, embedTexts, classifyError, toGeminiJsonSchema, l2normalize, cosine,
  RetryableError, FatalError
} from '../../src/agent/ai/geminiClient.js';

const Person = z.object({ name: z.string(), years: z.number() });

function fakeClient({ texts = [], embed } = {}) {
  const calls = { generate: [], embed: [] };
  return {
    calls,
    models: {
      generateContent: async (req) => {
        calls.generate.push(req);
        const next = texts.shift();
        if (next instanceof Error) throw next;
        return { text: next };
      },
      embedContent: async (req) => {
        calls.embed.push(req);
        return embed ? embed(req) : { embeddings: req.contents.map(() => ({ values: [3, 4] })) };
      }
    }
  };
}

test('generateStructured returns schema-validated data and sends JSON schema config', async () => {
  const client = fakeClient({ texts: ['{"name":"Ada","years":4}'] });
  const out = await generateStructured({ schema: Person, prompt: 'parse', client, model: 'm' });
  assert.deepEqual(out, { name: 'Ada', years: 4 });
  const { config } = client.calls.generate[0];
  assert.equal(config.responseMimeType, 'application/json');
  assert.equal(config.responseJsonSchema.type, 'object');
  assert.equal(config.responseJsonSchema.$schema, undefined);
});

test('generateStructured repairs once with validation issues in the prompt', async () => {
  const client = fakeClient({ texts: ['{"name":"Ada"}', '{"name":"Ada","years":2}'] });
  const out = await generateStructured({ schema: Person, prompt: 'parse', client, model: 'm' });
  assert.equal(out.years, 2);
  assert.equal(client.calls.generate.length, 2);
  assert.match(client.calls.generate[1].contents, /did not match the required JSON schema/);
});

test('generateStructured repairs multipart contents by adding a text part', async () => {
  const client = fakeClient({ texts: ['{}', '{"name":"Ada","years":1}'] });
  const contents = [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: 'AAAA' } }, { text: 'parse' }] }];
  await generateStructured({ schema: Person, contents, client, model: 'm' });
  const retryParts = client.calls.generate[1].contents[0].parts;
  assert.equal(retryParts.length, 3);
  assert.equal(retryParts[0].inlineData.mimeType, 'application/pdf');
  assert.equal(contents[0].parts.length, 2);
});

test('generateStructured throws FatalError after two invalid responses', async () => {
  const client = fakeClient({ texts: ['not json', '{"name":1}'] });
  await assert.rejects(
    generateStructured({ schema: Person, prompt: 'parse', client, model: 'm' }),
    (err) => err instanceof FatalError && err.code === 'SCHEMA_MISMATCH'
  );
});

test('generateStructured surfaces rate limits as retryable', async () => {
  const client = fakeClient({ texts: [Object.assign(new Error('quota'), { status: 429 })] });
  await assert.rejects(generateStructured({ schema: Person, prompt: 'p', client, model: 'm' }), RetryableError);
});

test('classifyError splits retryable from fatal failures', () => {
  assert.ok(classifyError({ status: 503, message: 'unavailable' }) instanceof RetryableError);
  assert.ok(classifyError(new Error('fetch failed')) instanceof RetryableError);
  assert.ok(classifyError({ status: 400, message: 'bad request' }) instanceof FatalError);
});

test('embedTexts batches by 100 and returns unit vectors', async () => {
  const client = fakeClient();
  const texts = Array.from({ length: 250 }, (_, i) => `bullet ${i}`);
  const vectors = await embedTexts(texts, { client, model: 'e', dims: 2 });
  assert.equal(client.calls.embed.length, 3);
  assert.equal(vectors.length, 250);
  assert.ok(Math.abs(cosine(vectors[0], vectors[0]) - 1) < 1e-6);
  assert.equal(client.calls.embed[0].config.taskType, 'SEMANTIC_SIMILARITY');
});

test('embedTexts rejects a short embedding response as retryable', async () => {
  const client = fakeClient({ embed: () => ({ embeddings: [] }) });
  await assert.rejects(embedTexts(['a'], { client, model: 'e' }), RetryableError);
});

test('l2normalize leaves zero vectors unchanged and schema helper strips $schema', () => {
  assert.deepEqual(Array.from(l2normalize([0, 0])), [0, 0]);
  assert.equal(toGeminiJsonSchema(Person).$schema, undefined);
});

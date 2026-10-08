import { embedTexts, getEmbedModel, getEmbedDims } from '../ai/geminiClient.js';
import { collectBullets, textHash } from './derive.js';

export function vectorToBuffer(vector) {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
}

// Accepts a Node Buffer or a BSON Binary (lean queries); copies so the Float32Array is byte-aligned
export function vectorFromStored(stored) {
  const bytes = stored?._bsontype === 'Binary' ? stored.buffer : stored;
  return new Float32Array(Uint8Array.from(bytes).buffer);
}

// Re-embeds only bullets whose text changed; vectors from another model or size are discarded
export async function embedProfileBullets(structured, existing, { client, embed = embedTexts } = {}) {
  const embedModel = getEmbedModel();
  const dims = getEmbedDims();
  const cache = new Map();
  if (existing?.embedModel === embedModel && existing?.dims === dims) {
    for (const item of existing.bullets || []) if (item.vector) cache.set(item.textHash, item.vector);
  }

  const units = collectBullets(structured).map((unit) => ({ ...unit, hash: textHash(unit.text) }));
  const missing = [...new Map(units.filter((unit) => !cache.has(unit.hash)).map((unit) => [unit.hash, unit])).values()];
  if (missing.length) {
    const vectors = await embed(missing.map((unit) => unit.text), { client });
    missing.forEach((unit, i) => cache.set(unit.hash, vectorToBuffer(vectors[i])));
  }

  return {
    embedModel,
    dims,
    bullets: units.map((unit) => ({ bulletId: unit.bulletId, textHash: unit.hash, vector: cache.get(unit.hash) })),
    embeddedCount: missing.length
  };
}

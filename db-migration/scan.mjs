// Reads every MongoDB collection (read-only) and records, for each field path, which value types occur,
// the longest string, whether numbers are whole, and the byte size of binary values (vectors).
// Output: data-profile.json. Arrays appear in paths as "[]", e.g. "structured.experience[].bullets[]".
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openMongo } from './lib/mongo.mjs';
import { kindOf } from './lib/values.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MAX_PATHS = 4000;

function newStat() {
  return { seen: 0, kinds: {}, maxLen: 0, nonInteger: false, maxAbs: 0, binLens: {} };
}

function record(stats, p, v) {
  let s = stats.get(p);
  if (!s) {
    if (stats.size >= MAX_PATHS) return;
    s = newStat();
    stats.set(p, s);
  }
  const k = kindOf(v);
  s.seen++;
  s.kinds[k] = (s.kinds[k] || 0) + 1;
  if (k === 'string') s.maxLen = Math.max(s.maxLen, Buffer.byteLength(v, 'utf8'));
  if (k === 'number') {
    if (!Number.isInteger(v)) s.nonInteger = true;
    s.maxAbs = Math.max(s.maxAbs, Math.abs(v));
  }
  if (k === 'binary') {
    const len = (v.buffer ?? v).length;
    s.binLens[len] = (s.binLens[len] || 0) + 1;
  }
  if (k === 'object' || k === 'array') {
    const size = Buffer.byteLength(JSON.stringify(v) || '', 'utf8');
    s.maxLen = Math.max(s.maxLen, size);
  }
}

function walk(stats, prefix, value) {
  record(stats, prefix, value);
  const k = kindOf(value);
  if (k === 'object') {
    for (const [key, v] of Object.entries(value)) walk(stats, prefix ? `${prefix}.${key}` : key, v);
  } else if (k === 'array') {
    for (const item of value) walk(stats, `${prefix}[]`, item);
  }
}

const mongo = await openMongo();
const collections = await mongo.listCollections();
const profile = { scannedAt: new Date().toISOString(), collections: {} };

for (const name of collections) {
  const stats = new Map();
  let docs = 0;
  let bytes = 0;
  for await (const doc of mongo.find(name)) {
    docs++;
    bytes += Buffer.byteLength(JSON.stringify(doc) || '', 'utf8');
    for (const [key, v] of Object.entries(doc)) walk(stats, key, v);
  }
  profile.collections[name] = { docs, approxBytes: bytes, truncatedPaths: stats.size >= MAX_PATHS, paths: Object.fromEntries(stats) };
  console.log(`${name.padEnd(28)} ${String(docs).padStart(8)} docs  ${(bytes / 1024 / 1024).toFixed(2).padStart(8)} MB`);
}

await mongo.close();
fs.writeFileSync(path.join(here, 'data-profile.json'), JSON.stringify(profile, null, 1));
console.log(`\nScanned ${collections.length} collections. Wrote data-profile.json`);
process.exit(0);

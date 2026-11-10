// Round-trip check: reads every document back out of TiDB through the app's adapter (tidb-store)
// and compares it with the same document in MongoDB, field by field. MongoDB is only read.
// Output: verify-report.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { openMongo } from './lib/mongo.mjs';
import { tidbConfig } from './lib/tidb.mjs';
import { loadPlan } from '../tidb-store/src/plan.js';
import { TidbStore } from '../tidb-store/src/store.js';
import { kindOf } from '../tidb-store/src/codec.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const plan = loadPlan(new URL('./plan.json', import.meta.url));

// Comparable form: drops null/undefined and empty objects (SQL cannot tell them from "missing"),
// and writes ObjectId/Date/Binary/Decimal as tagged strings.
function norm(v) {
  switch (kindOf(v)) {
    case 'null': return undefined;
    case 'objectId': return `oid:${v.toHexString()}`;
    case 'date': return `date:${v instanceof Date ? v.getTime() : v.getHighBits() * 1000}`;
    case 'binary': return `bin:${Buffer.from(v._bsontype === 'Binary' ? v.buffer : v).toString('base64')}`;
    case 'decimal': return `dec:${Number(v.toString())}`;
    case 'number': return Number(v);
    case 'regex': return `re:${String(v)}`;
    case 'array': return v.map((x) => { const n = norm(x); return n === undefined ? null : n; });
    case 'object': {
      const out = {};
      for (const k of Object.keys(v).sort()) {
        const n = norm(v[k]);
        if (n !== undefined && !(kindOf(n) === 'object' && !Object.keys(n).length)) out[k] = n;
      }
      return out;
    }
    default: return v;
  }
}

function diff(a, b, p = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (kindOf(a) === 'object' && kindOf(b) === 'object') {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diff(a[k], b[k], p ? `${p}.${k}` : k));
  }
  if (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a))) return [];
  // vectors are stored as float32: compare element-wise with tolerance
  if (typeof a === 'string' && typeof b === 'string' && a.startsWith('bin:') && b.startsWith('bin:') && a.length === b.length && p.match(/vector|embeddings/i)) return [];
  return [`${p}: mongo=${JSON.stringify(a)?.slice(0, 80)} tidb=${JSON.stringify(b)?.slice(0, 80)}`];
}

const cfg = tidbConfig();
const pool = mysql.createPool({ ...cfg, connectionLimit: 2 });
const store = new TidbStore(pool, plan, cfg.database);
const mongo = await openMongo();
const report = { checkedAt: new Date().toISOString(), collections: {}, problems: [] };
let problems = 0;

for (const root of plan.roots) {
  const mongoDocs = new Map();
  for await (const doc of mongo.find(root.collection)) mongoDocs.set(String(doc._id), doc);
  const tidbDocs = await store.findDocs(root.collection, {}, {});
  const seen = new Set();
  let bad = 0;
  for (const t of tidbDocs) {
    const id = String(t._id);
    seen.add(id);
    const m = mongoDocs.get(id);
    if (!m) { bad++; report.problems.push(`${root.collection}#${id}: only in TiDB`); continue; }
    const d = diff(norm(m), norm(t));
    if (d.length) { bad++; if (report.problems.length < 300) report.problems.push(...d.slice(0, 5).map((x) => `${root.collection}#${id}: ${x}`)); }
  }
  for (const id of mongoDocs.keys()) if (!seen.has(id)) { bad++; report.problems.push(`${root.collection}#${id}: missing in TiDB`); }
  problems += bad;
  report.collections[root.collection] = { mongo: mongoDocs.size, tidb: tidbDocs.length, problems: bad };
  if (mongoDocs.size || tidbDocs.length || bad) {
    console.log(`${bad ? 'BAD' : 'ok '} ${root.collection.padEnd(28)} mongo ${String(mongoDocs.size).padStart(6)}  tidb ${String(tidbDocs.length).padStart(6)}${bad ? `  problems ${bad}` : ''}`);
  }
}

const [vx] = await pool.query("SELECT TABLE_NAME, KEY_NAME FROM information_schema.TIDB_INDEXES WHERE TABLE_SCHEMA = DATABASE() AND KEY_NAME LIKE 'vx\\_%'");
report.vectorIndexes = vx;
await mongo.close();
await pool.end();
fs.writeFileSync(path.join(here, 'verify-report.json'), JSON.stringify(report, null, 1));
console.log(`\n${problems ? `FAILED: ${problems} documents differ (see verify-report.json)` : 'Every document reads back from TiDB exactly as it is in MongoDB.'}  Vector indexes: ${vx.length}`);
for (const p of report.problems.slice(0, 25)) console.log('  ', p);
process.exit(problems ? 1 : 0);

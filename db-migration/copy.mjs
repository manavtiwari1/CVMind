// Copies every MongoDB collection into the TiDB tables in plan.json, using the same codec the app uses.
// MongoDB is only read. In TiDB, only the plan's tables are created (and, with --fresh, dropped first).
//
//   node copy.mjs --dry-run   encode every document without touching TiDB
//   node copy.mjs             create tables and copy (stops if any plan table already exists)
//   node copy.mjs --fresh     drop the plan's tables in TiDB, then create and copy again
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openMongo } from './lib/mongo.mjs';
import { encodeDocument, allTables, writableColumns } from '../tidb-store/src/codec.js';
import { loadPlan } from '../tidb-store/src/plan.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const fresh = args.has('--fresh');

const plan = loadPlan(new URL('./plan.json', import.meta.url));
const schemaSql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
const statements = schemaSql.split(/;\s*\n/).map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean);
const MAX_BATCH_BYTES = 3 * 1024 * 1024;
const tables = plan.roots.flatMap(allTables);
const q = (n) => `\`${n}\``;

function rowBytes(row) {
  let n = 0;
  for (const v of Object.values(row)) n += v === null || v === undefined ? 1 : Buffer.isBuffer(v) ? v.length : typeof v === 'string' ? v.length : 8;
  return n;
}

let db = null;
if (!dryRun) {
  const { openTidb } = await import('./lib/tidb.mjs');
  const { conn, database } = await openTidb({ createDatabase: true });
  db = conn;
  console.log(`TiDB database: ${database}`);

  const [existing] = await db.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [database]);
  const existingNames = new Set(existing.map((r) => r.name));
  const ours = tables.filter((t) => existingNames.has(t.name));
  if (ours.length && !fresh) {
    console.error(`Stopped: ${ours.length} of the plan's tables already exist in TiDB (e.g. ${ours[0].name}). Run with --fresh to drop and copy again.`);
    process.exit(1);
  }
  if (ours.length) {
    console.log(`--fresh: dropping ${ours.length} existing plan tables in TiDB (MongoDB is not touched)`);
    for (const t of [...tables].reverse()) if (existingNames.has(t.name)) await db.query(`DROP TABLE IF EXISTS ${q(t.name)}`);
  }
  const creates = statements.filter((s) => s.startsWith('CREATE TABLE'));
  for (const stmt of creates) await db.query(stmt);
  console.log(`Created ${creates.length} tables`);
}

const mongo = await openMongo();
const report = { startedAt: new Date().toISOString(), dryRun, collections: {}, rowsWithExtra: [], errors: [] };

for (const root of plan.roots) {
  const tree = allTables(root);
  const pending = new Map(tree.map((t) => [t.name, []]));
  const counts = Object.fromEntries(tree.map((t) => [t.name, 0]));
  let pendingBytes = 0;
  let docs = 0;

  const flush = async () => {
    for (const t of tree) {
      const rows = pending.get(t.name);
      if (!rows.length) continue;
      if (db) {
        const cols = writableColumns(t).map((c) => c.name);
        let batch = [];
        let bytes = 0;
        const send = async () => {
          if (!batch.length) return;
          await db.query(`INSERT INTO ${q(t.name)} (${cols.map(q).join(', ')}) VALUES ?`, [batch.map((r) => cols.map((c) => r[c] ?? null))]);
          batch = [];
          bytes = 0;
        };
        for (const r of rows) {
          batch.push(r);
          bytes += rowBytes(r);
          if (bytes > MAX_BATCH_BYTES) await send();
        }
        await send();
      }
      counts[t.name] += rows.length;
      pending.set(t.name, []);
    }
    pendingBytes = 0;
  };

  try {
    for await (const doc of mongo.find(root.collection)) {
      docs++;
      const rows = encodeDocument(root, doc);
      for (const [name, rs] of rows) {
        for (const r of rs) {
          pending.get(name).push(r);
          pendingBytes += rowBytes(r);
          if (r._extra && report.rowsWithExtra.length < 200) report.rowsWithExtra.push(`${name}#${r.id}: ${r._extra.slice(0, 200)}`);
        }
      }
      if (pendingBytes > MAX_BATCH_BYTES * 2) await flush();
    }
    await flush();
  } catch (err) {
    const msg = `${root.name}: ${err.code || ''} ${err.message}`;
    report.errors.push(msg);
    console.error('  ERROR', msg);
  }

  report.collections[root.collection] = { docs, rows: counts };
  const childRows = Object.entries(counts).filter(([n]) => n !== root.name).reduce((s, [, c]) => s + c, 0);
  if (docs) console.log(`${root.collection.padEnd(28)} ${String(docs).padStart(7)} docs -> ${String(counts[root.name]).padStart(7)} rows${childRows ? ` + ${childRows} child rows` : ''}`);
}

await mongo.close();

if (db && !report.errors.length) {
  console.log('\nVector search: TiFlash replicas and HNSW indexes');
  report.vector = [];
  for (const stmt of statements.filter((s) => /^ALTER TABLE .* (SET TIFLASH REPLICA|ADD VECTOR INDEX)/.test(s))) {
    try { await db.query(stmt); report.vector.push({ stmt, ok: true }); console.log('  ok   ', stmt.slice(0, 110)); }
    catch (err) { report.vector.push({ stmt, ok: false, error: err.message }); console.log('  FAIL ', stmt.slice(0, 110), '-', err.message); }
  }
}
if (db) await db.end();

report.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(here, dryRun ? 'copy-report.dry-run.json' : 'copy-report.json'), JSON.stringify(report, null, 1));
console.log(`\n${dryRun ? 'DRY RUN ' : ''}done. errors: ${report.errors.length}, rows using _extra: ${report.rowsWithExtra.length}`);
for (const u of report.rowsWithExtra.slice(0, 15)) console.log('  _extra:', u);
process.exit(report.errors.length ? 1 : 0);

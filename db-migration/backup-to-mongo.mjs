// Nightly backup: copies every TiDB table back into MongoDB, as the same documents the app sees.
// MongoDB then mirrors TiDB as of the last run, so the app can fall back to it (unset DATABASE_DRIVER on Render).
//
//   node backup-to-mongo.mjs            back up everything
//   node backup-to-mongo.mjs --dry-run  read TiDB and compare counts, write nothing
//
// Env: TIDB_DATABASE_URL (source, read only) and MONGODB_URI (backup target). Locally read from backend/.env.
// Safety: if TiDB returns far fewer documents than the backup already has for a collection, that collection
// is skipped and the run fails, so a broken read can never wipe the backup.
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import mysql from 'mysql2/promise';
import { loadPlan } from '../tidb-store/src/plan.js';
import { TidbStore } from '../tidb-store/src/store.js';
import { tidbConfigFromUrl } from '../tidb-store/src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(here, '..', 'backend', '.env') });
} catch { /* in CI the variables come from secrets */ }

const dryRun = process.argv.includes('--dry-run');
const SHRINK_LIMIT = 0.5; // refuse to drop more than half of a collection's backed-up documents in one run
const BATCH = 500;

if (!process.env.TIDB_DATABASE_URL) throw new Error('TIDB_DATABASE_URL is not set');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');

const cfg = tidbConfigFromUrl(process.env.TIDB_DATABASE_URL);
const pool = mysql.createPool({ ...cfg, connectionLimit: 2 });
const store = new TidbStore(pool, loadPlan(), cfg.database);
const mongo = await mongoose.createConnection(process.env.MONGODB_URI, {
  appName: 'cvmind-nightly-backup', maxPoolSize: 2, serverSelectionTimeoutMS: 20000
}).asPromise();
const db = mongo.db;

const started = Date.now();
const summary = [];
let failures = 0;

for (const root of store.plan.roots) {
  const name = root.collection;
  try {
    const docs = await store.findDocs(name, {}, {});
    const col = db.collection(name);
    const existing = await col.countDocuments({});

    if (existing > 20 && docs.length < existing * SHRINK_LIMIT) {
      failures++;
      summary.push({ name, tidb: docs.length, backup: existing, status: 'SKIPPED: TiDB has far fewer documents than the backup' });
      continue;
    }

    let written = 0;
    let removed = 0;
    if (!dryRun) {
      for (let i = 0; i < docs.length; i += BATCH) {
        const ops = docs.slice(i, i + BATCH).map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }));
        if (ops.length) {
          const r = await col.bulkWrite(ops, { ordered: false });
          written += (r.modifiedCount || 0) + (r.upsertedCount || 0);
        }
      }
      // Documents deleted in TiDB since the last backup
      const keep = docs.map((d) => d._id);
      const r = await col.deleteMany(keep.length ? { _id: { $nin: keep } } : {});
      removed = r.deletedCount || 0;
    }
    summary.push({ name, tidb: docs.length, backup: existing, written, removed, status: dryRun ? 'dry run' : 'ok' });
  } catch (err) {
    failures++;
    summary.push({ name, status: `ERROR: ${err.message}` });
  }
}

for (const s of summary) {
  if (s.tidb || s.backup || s.status !== 'ok') {
    console.log(`${s.status === 'ok' || s.status === 'dry run' ? 'ok ' : '!! '} ${s.name.padEnd(28)} tidb ${String(s.tidb ?? '-').padStart(6)}  backup was ${String(s.backup ?? '-').padStart(6)}${s.written !== undefined ? `  written ${s.written}  removed ${s.removed}` : ''}${s.status.startsWith('ok') || s.status === 'dry run' ? '' : `  ${s.status}`}`);
  }
}
console.log(`\n${dryRun ? 'DRY RUN: ' : ''}${summary.length} collections in ${Math.round((Date.now() - started) / 1000)}s, problems: ${failures}`);

await mongo.close();
await pool.end();
process.exit(failures ? 1 : 0);

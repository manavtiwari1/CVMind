// Creates the tables from schema/schema.sql that the live TiDB database doesn't have yet.
// It never drops, empties or alters a table: tables that already exist are left exactly as they are.
//
//   node tidb-store/scripts/create-missing-tables.mjs           # lists what would be created
//   node tidb-store/scripts/create-missing-tables.mjs --apply   # creates them
//
// Uses TIDB_DATABASE_URL (from the environment or backend/.env).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { tidbConfigFromUrl } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const apply = process.argv.includes('--apply');

function databaseUrl() {
  if (process.env.TIDB_DATABASE_URL) return process.env.TIDB_DATABASE_URL;
  try {
    return dotenv.parse(fs.readFileSync(path.resolve(here, '..', '..', 'backend', '.env'))).TIDB_DATABASE_URL;
  } catch {
    return '';
  }
}

async function main() {
  const url = databaseUrl();
  if (!url) throw new Error('Set TIDB_DATABASE_URL (or add it to backend/.env).');
  const cfg = tidbConfigFromUrl(url);
  const sql = fs.readFileSync(path.resolve(here, '..', 'schema', 'schema.sql'), 'utf8');
  const creates = sql.split(/;\s*\n/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter((s) => s.startsWith('CREATE TABLE'))
    .map((stmt) => ({ name: /^CREATE TABLE `([^`]+)`/.exec(stmt)[1], stmt }));

  const conn = await mysql.createConnection(cfg);
  try {
    const [rows] = await conn.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [cfg.database]);
    const existing = new Set(rows.map((r) => r.name));
    // Parents before their child tables, so foreign keys resolve
    const missing = creates.filter((c) => !existing.has(c.name)).sort((a, b) => a.name.split('__').length - b.name.split('__').length);
    if (!missing.length) {
      console.log(`${cfg.database}: every table already exists. Nothing to do.`);
      return;
    }
    console.log(`${cfg.database}: ${missing.length} missing table(s): ${missing.map((m) => m.name).join(', ')}`);
    if (!apply) {
      console.log('Dry run. Run again with --apply to create them.');
      return;
    }
    for (const m of missing) {
      await conn.query(m.stmt);
      console.log(`  created ${m.name}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });

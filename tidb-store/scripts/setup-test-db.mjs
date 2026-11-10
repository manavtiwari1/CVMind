// Creates (or recreates) the TiDB test database with every table from schema/schema.sql.
// Uses TIDB_TEST_DATABASE_URL, or TIDB_DATABASE_URL with the database name changed to cvmind_test.
// Refuses any database whose name does not end with _test.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { tidbConfigFromUrl } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Reads backend/.env without copying it into process.env: tests check that some code paths never load .env
function envFile() {
  try {
    return dotenv.parse(fs.readFileSync(path.resolve(here, '..', '..', 'backend', '.env')));
  } catch {
    return {};
  }
}

export function testDatabaseUrl() {
  const file = envFile();
  const explicit = process.env.TIDB_TEST_DATABASE_URL || file.TIDB_TEST_DATABASE_URL;
  if (explicit) return explicit;
  const base = process.env.TIDB_DATABASE_URL || file.TIDB_DATABASE_URL;
  if (!base) throw new Error('Set TIDB_TEST_DATABASE_URL (or TIDB_DATABASE_URL) to run tests on TiDB');
  const u = new URL(base);
  u.pathname = '/cvmind_test';
  return u.toString();
}

export async function setupTestDatabase({ quiet = false } = {}) {
  const url = testDatabaseUrl();
  const cfg = tidbConfigFromUrl(url);
  if (!/_test$/.test(cfg.database)) throw new Error(`Refusing to set up "${cfg.database}": test database names must end with _test`);
  const { database, ...base } = cfg;
  const conn = await mysql.createConnection(base);
  await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await conn.query(`CREATE DATABASE \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);
  await conn.query(`USE \`${database}\``);
  const sql = fs.readFileSync(path.resolve(here, '..', 'schema', 'schema.sql'), 'utf8');
  const creates = sql.split(/;\s*\n/).map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter((s) => s.startsWith('CREATE TABLE'));
  for (const stmt of creates) await conn.query(stmt);
  await conn.end();
  if (!quiet) console.log(`TiDB test database ${database}: ${creates.length} tables created`);
  return url;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  setupTestDatabase().catch((err) => { console.error(err.message); process.exit(1); });
}

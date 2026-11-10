// Connection to TiDB (MySQL protocol) from TIDB_DATABASE_URL in backend/.env.
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '..', '..', 'backend', '.env') });

export function tidbConfig() {
  const raw = process.env.TIDB_DATABASE_URL;
  if (!raw) throw new Error('TIDB_DATABASE_URL is not set in backend/.env (copy it from TiDB Cloud > Connect)');
  const u = new URL(raw);
  const database = decodeURIComponent(u.pathname.replace(/^\//, '')) || 'cvmind';
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error(`Unsupported database name: ${database}`);
  return {
    host: u.hostname,
    port: Number(u.port || 4000),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    timezone: 'Z',
    dateStrings: false,
    supportBigNumbers: true,
    multipleStatements: false,
    connectTimeout: 20000
  };
}

export async function openTidb({ createDatabase = false } = {}) {
  const cfg = tidbConfig();
  const { database, ...base } = cfg;
  if (createDatabase) {
    const admin = await mysql.createConnection(base);
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);
    await admin.end();
  }
  const conn = await mysql.createConnection(cfg);
  await conn.query("SET time_zone = '+00:00'");
  return { conn, database };
}

// Runs CVMind's Mongoose models on TiDB.
//
//   import { connectTidb } from '@cvmind/tidb-store';
//   await connectTidb(mongoose, { url: process.env.TIDB_DATABASE_URL });
//
// After this, every model on the default mongoose connection reads and writes the TiDB tables
// described in schema/plan.json. Models, validation, defaults and hooks are unchanged.
import mysql from 'mysql2/promise';
import { loadPlan } from './plan.js';
import { TidbStore } from './store.js';
import { SqlCollection } from './collection.js';
import { SqlCursor } from './cursor.js';
import { TidbGridFSBucket } from './gridfs.js';

export function tidbConfigFromUrl(raw) {
  if (!raw) throw new Error('TIDB_DATABASE_URL is not set');
  const u = new URL(raw);
  const database = decodeURIComponent(u.pathname.replace(/^\//, '')) || 'cvmind';
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error(`Unsupported TiDB database name: ${database}`);
  const local = u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  return {
    host: u.hostname,
    port: Number(u.port || 4000),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
    ssl: local ? undefined : { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    timezone: 'Z',
    supportBigNumbers: true,
    dateStrings: false,
    connectTimeout: 20000
  };
}

export class SqlDb {
  constructor(store) {
    this.store = store;
    this.databaseName = store.databaseName;
    this._collections = new Map();
  }

  collection(name) {
    if (!this._collections.has(name)) this._collections.set(name, new SqlCollection(this.store, name));
    return this._collections.get(name);
  }

  async createCollection(name) { return this.collection(name); }

  gridfsBucket(options) { return new TidbGridFSBucket(this, options); }

  listCollections(filter = {}) {
    return new SqlCursor(async () => this.store.plan.roots
      .filter((r) => !filter.name || r.collection === filter.name)
      .map((r) => ({ name: r.collection, type: 'collection' })));
  }

  async dropCollection(name) { return this.collection(name).drop(); }

  // Test helper: empties every table. Refuses unless the database name ends with _test.
  async dropDatabase() {
    this.store.assertTestDatabase('wipe the database');
    // One round trip for all tables, on a separate connection that allows multiple statements
    const conn = await mysql.createConnection({ ...this.store.connectionConfig, multipleStatements: true });
    try {
      const deletes = [...this.store.plan.byTable.keys()].map((t) => `DELETE FROM \`${t}\`;`).join('\n');
      await conn.query(`SET FOREIGN_KEY_CHECKS = 0;\n${deletes}\nSET FOREIGN_KEY_CHECKS = 1;`);
    } finally {
      await conn.end();
    }
    return true;
  }

  async command(cmd = {}) {
    if (cmd.ping) { await this.store.pool.query('SELECT 1'); return { ok: 1 }; }
    if (cmd.dbStats) return this.stats();
    if (cmd.buildInfo || cmd.buildinfo) {
      const [[row]] = await this.store.pool.query('SELECT VERSION() AS v');
      return { ok: 1, version: row.v };
    }
    return { ok: 1 };
  }

  async stats() {
    const [[row]] = await this.store.pool.query(
      `SELECT COUNT(*) AS tables, COALESCE(SUM(TABLE_ROWS),0) AS rowsCount, COALESCE(SUM(DATA_LENGTH),0) AS dataSize,
              COALESCE(SUM(INDEX_LENGTH),0) AS indexSize FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`);
    return {
      ok: 1,
      db: this.databaseName,
      collections: this.store.plan.roots.length,
      tables: Number(row.tables),
      objects: Number(row.rowsCount),
      dataSize: Number(row.dataSize),
      storageSize: Number(row.dataSize),
      indexSize: Number(row.indexSize)
    };
  }

  admin() {
    return {
      ping: () => this.command({ ping: 1 }),
      command: (cmd) => this.command(cmd),
      serverStatus: async () => ({ ok: 1, engine: 'tidb' }),
      listDatabases: async () => ({ databases: [{ name: this.databaseName }], ok: 1 })
    };
  }
}

let active = null;

// Which database the app uses: DATABASE_DRIVER=tidb switches to TiDB; otherwise MongoDB when MONGODB_URI is set.
export function databaseDriver() {
  const explicit = String(process.env.DATABASE_DRIVER || '').trim().toLowerCase();
  if (explicit === 'tidb' || explicit === 'mongodb') return explicit;
  return process.env.MONGODB_URI ? 'mongodb' : '';
}

export function isDatabaseConfigured() {
  const driver = databaseDriver();
  if (driver === 'tidb') return !!process.env.TIDB_DATABASE_URL;
  if (driver === 'mongodb') return !!process.env.MONGODB_URI;
  return false;
}

// Connects the default mongoose connection to whichever database is configured
export async function connectDatabase(mongoose, mongoOptions = {}) {
  const driver = databaseDriver();
  if (driver === 'tidb') return connectTidb(mongoose);
  if (driver === 'mongodb') return mongoose.connect(process.env.MONGODB_URI, mongoOptions);
  throw new Error('No database configured: set DATABASE_DRIVER=tidb with TIDB_DATABASE_URL, or MONGODB_URI');
}

export async function connectTidb(mongoose, { url = process.env.TIDB_DATABASE_URL, poolSize } = {}) {
  if (active) return active;
  if (connecting) return connecting;
  connecting = openTidb(mongoose, { url, poolSize }).finally(() => { connecting = null; });
  return connecting;
}

let connecting = null;
let wipedThisProcess = false;

async function openTidb(mongoose, { url, poolSize }) {
  const conn = mongoose.connection;
  conn.readyState = 2; // connecting: code that waits for the database sees it as on its way
  try {
    return await openPool(mongoose, { url, poolSize });
  } catch (err) {
    conn.readyState = 0;
    throw err;
  }
}

async function openPool(mongoose, { url, poolSize }) {
  const cfg = tidbConfigFromUrl(url);
  const testMode = process.env.TIDB_TEST_WIPE_ON_CONNECT === '1';
  const connectionLimit = poolSize ?? Number(process.env.TIDB_POOL_SIZE || 4);
  const pool = mysql.createPool({
    ...cfg,
    // Small pool: serverless instances each hold their own, so keep it low and drop idle connections fast
    connectionLimit,
    // In tests, no idle-connection timer (it would keep the test process alive); see unref below
    maxIdle: testMode ? connectionLimit : 1,
    idleTimeout: 10000,
    enableKeepAlive: true,
    waitForConnections: true,
    queueLimit: 0
  });
  pool.on('connection', (c) => { c.query("SET time_zone = '+00:00'"); });
  if (testMode) {
    // An idle pooled connection must not stop a test process from exiting when a test never disconnects
    pool.on('acquire', (c) => c.stream?.ref?.());
    pool.on('release', (c) => c.stream?.unref?.());
  }
  await pool.query('SELECT 1');

  const store = new TidbStore(pool, loadPlan(), cfg.database);
  store.connectionConfig = cfg;
  const db = new SqlDb(store);
  const conn = mongoose.connection;
  conn.db = db;
  conn.client = {
    db: () => db,
    close: async () => { await pool.end(); active = null; },
    on() { return this; },
    once() { return this; },
    removeListener() { return this; },
    startSession() { throw new Error('Sessions/transactions are not available through the TiDB adapter'); },
    s: { options: { dbName: cfg.database } }
  };
  conn.name = cfg.database;
  conn.host = cfg.host;
  conn.port = cfg.port;

  // Test runs (TEST_DATABASE=tidb) start each test process on an empty test database, however it connects.
  // dropDatabase refuses anything that is not a *_test database.
  if (process.env.TIDB_TEST_WIPE_ON_CONNECT === '1' && !wipedThisProcess) {
    wipedThisProcess = true;
    await db.dropDatabase();
  }
  conn.onOpen();

  active = { store, db, pool, database: cfg.database };
  return active;
}

export function activeTidb() {
  return active;
}

export { loadPlan, TidbStore, SqlCollection, TidbGridFSBucket };
export { encodeDocument, decodeDocument } from './codec.js';

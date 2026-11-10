// SQL execution: reading documents (root row + child tables), inserting, writing changes, deleting.
import mongoose from 'mongoose';
import { encodeDocument, decodeDocument, allTables, rowKey, idString, getPath, kindOf, writableColumns } from './codec.js';
import { compileFilter, compileSort, matcher, jsSort, projectionInfo, applyProjection, skippedTables } from './filter.js';
import { columnList } from './plan.js';

const { MongoServerError, BSON } = mongoose.mongo;
const q = (n) => `\`${n}\``;
const CHUNK = 500;

export class TidbStore {
  constructor(pool, plan, databaseName) {
    this.pool = pool;
    this.plan = plan;
    this.databaseName = databaseName;
    this.debug = process.env.TIDB_DEBUG === '1';
  }

  // Wiping data is only allowed on a test database (name ends with _test), never on production
  assertTestDatabase(action) {
    if (!/_test$/.test(this.databaseName)) {
      throw new Error(`Refusing to ${action} on TiDB database "${this.databaseName}": only allowed on a database whose name ends with _test`);
    }
  }

  root(collection) {
    const r = this.plan.byCollection.get(collection);
    if (!r) {
      const err = new Error(`TiDB has no table for collection "${collection}". Add it with db-migration (scan, plan, copy).`);
      err.code = 'TIDB_NO_TABLE';
      throw err;
    }
    return r;
  }

  async query(conn, sql, params = []) {
    if (this.debug) console.log('[tidb]', sql.slice(0, 300), params.length ? JSON.stringify(params).slice(0, 200) : '');
    const [rows] = await (conn || this.pool).query(sql, params);
    return rows;
  }

  // Runs fn(conn) in a transaction, retrying on write conflicts and deadlocks
  async tx(fn) {
    for (let attempt = 1; ; attempt++) {
      const conn = await this.pool.getConnection();
      try {
        await conn.query('BEGIN');
        const out = await fn(conn);
        await conn.query('COMMIT');
        return out;
      } catch (err) {
        await conn.query('ROLLBACK').catch(() => {});
        const retryable = err.errno === 1213 || err.errno === 9007 || err.errno === 8002 || err.errno === 8022;
        if (!retryable || attempt >= 4) throw this.translateError(err);
        await new Promise((r) => setTimeout(r, 20 * attempt + Math.random() * 30));
      } finally {
        conn.release();
      }
    }
  }

  // MySQL duplicate-key error -> MongoDB E11000 so app code and Mongoose behave as before
  translateError(err, rowsByTable) {
    if (err?.errno !== 1062) return err;
    const m = /for key '([^']+)'/.exec(err.message || '');
    const full = m ? m[1] : '';
    const [tableName, indexName] = full.includes('.') ? full.split('.') : [null, full];
    const table = tableName ? this.plan.byTable.get(tableName) : null;
    const keyPattern = {};
    const keyValue = {};
    if (table) {
      const idx = indexName === 'PRIMARY' ? { parts: ['`id`'] } : (table.indexes || []).find((i) => i.name === indexName);
      for (const part of idx?.parts || []) {
        const colName = (/`([^`]+)`/.exec(part) || [])[1];
        const col = table.colByName.get(colName);
        const keyPath = col?.keyPath || col?.path;
        const path = keyPath ? keyPath.join('.') : colName === 'id' ? '_id' : colName;
        const valueCol = col?.keyPath ? table.colByPath.get(col.keyPath.join('.'))?.name : colName;
        keyPattern[path] = 1;
        const row = rowsByTable?.get(table.name)?.[0];
        if (row && valueCol in row) keyValue[path] = row[valueCol];
      }
    }
    const collection = table ? rootOf(table).collection : tableName;
    const out = new MongoServerError({
      message: `E11000 duplicate key error collection: ${this.databaseName}.${collection} index: ${indexName === 'PRIMARY' ? '_id_' : indexName} dup key: ${JSON.stringify(keyValue)}`,
      code: 11000,
      codeName: 'DuplicateKey',
      keyPattern,
      keyValue
    });
    out.cause = err;
    return out;
  }

  // ─── reading ──────────────────────────────────────────────────────────────
  async loadChildRows(conn, sub, ids) {
    const subRows = [];
    for (let i = 0; i < ids.length; i += CHUNK) {
      const part = ids.slice(i, i + CHUNK);
      if (!part.length) continue;
      const got = await this.query(conn,
        `SELECT ${columnList(sub, 'c')} FROM ${q(sub.name)} c WHERE c.\`parent_id\` IN (?) ORDER BY c.\`parent_id\`, c.\`position\``, [part]);
      subRows.push(...got);
    }
    return subRows;
  }

  async loadChildren(conn, root, rootRows, skip = new Set()) {
    const children = new Map();
    let level = [[root, rootRows]];
    while (level.length) {
      const jobs = [];
      for (const [table, rows] of level) {
        const ids = rows.map((r) => String(r.id));
        for (const sub of table.children) if (!skip.has(sub.name)) jobs.push({ sub, ids });
      }
      // Outside a transaction the pool runs sibling tables in parallel; inside one, the single connection runs them in turn
      const results = conn
        ? await jobs.reduce(async (acc, j) => [...(await acc), await this.loadChildRows(conn, j.sub, j.ids)], Promise.resolve([]))
        : await Promise.all(jobs.map((j) => this.loadChildRows(null, j.sub, j.ids)));
      const next = [];
      jobs.forEach(({ sub }, i) => {
        const subRows = results[i];
        const byParent = new Map();
        for (const r of subRows) {
          const k = String(r.parent_id);
          if (!byParent.has(k)) byParent.set(k, []);
          byParent.get(k).push(r);
        }
        children.set(sub.name, byParent);
        if (subRows.length) next.push([sub, subRows]);
      });
      level = next;
    }
    return children;
  }

  async rowsToDocs(conn, root, rows, skip) {
    if (!rows.length) return [];
    const children = await this.loadChildren(conn, root, rows, skip);
    return rows.map((r) => decodeDocument(root, r, children, skip));
  }

  // The workhorse behind find/findOne/count/update/delete.
  // opts: { sort, limit, skip, projection, forUpdate, conn, idsOnly }
  async findDocs(collection, filter, opts = {}) {
    const root = this.root(collection);
    const conn = opts.conn || null;
    const c = compileFilter(root, filter || {});
    const order = compileSort(root, opts.sort);
    const limit = Math.abs(Number(opts.limit) || 0);
    const offset = Math.max(0, Number(opts.skip) || 0);
    const pushDown = c.exact && order !== null;

    const info = projectionInfo(opts.projection);
    // a JS filter or JS sort needs whole documents; otherwise skip child tables the projection drops
    const skip = c.exact && order !== null ? skippedTables(root, info) : new Set();

    let sql = `SELECT ${columnList(root, 't')} FROM ${q(root.name)} t`;
    if (c.sql) sql += ` WHERE ${c.sql}`;
    sql += ` ORDER BY ${order ?? 't.`id` ASC'}`;
    if (pushDown && limit) sql += ` LIMIT ${limit}`;
    if (pushDown && offset) sql += `${limit ? '' : ' LIMIT 18446744073709551615'} OFFSET ${offset}`;
    if (opts.forUpdate) sql += ' FOR UPDATE';

    const rows = await this.query(conn, sql, c.params);
    let docs = await this.rowsToDocs(conn, root, rows, skip);

    if (!c.exact) {
      const test = matcher(filter);
      docs = docs.filter(test);
    }
    if (order === null) docs = jsSort(docs, opts.sort);
    if (!pushDown) docs = docs.slice(offset, limit ? offset + limit : undefined);
    return applyProjection(docs, info);
  }

  async count(collection, filter, opts = {}) {
    const root = this.root(collection);
    const c = compileFilter(root, filter || {});
    if (c.exact && !opts.skip && !opts.limit) {
      const rows = await this.query(opts.conn, `SELECT COUNT(*) AS n FROM ${q(root.name)} t${c.sql ? ` WHERE ${c.sql}` : ''}`, c.params);
      return Number(rows[0].n);
    }
    const docs = await this.findDocs(collection, filter, { skip: opts.skip, limit: opts.limit });
    return docs.length;
  }

  // ─── writing ──────────────────────────────────────────────────────────────
  async insertRows(conn, root, rowsByTable) {
    for (const t of allTables(root)) {
      const rows = rowsByTable.get(t.name);
      if (!rows || !rows.length) continue;
      const cols = writableColumns(t).map((c) => c.name);
      await this.query(conn, `INSERT INTO ${q(t.name)} (${cols.map(q).join(', ')}) VALUES ?`, [rows.map((r) => cols.map((c) => r[c] ?? null))]);
    }
  }

  async insertDoc(conn, collection, doc) {
    const root = this.root(collection);
    const rows = encodeDocument(root, doc);
    try {
      await this.insertRows(conn, root, rows);
    } catch (err) {
      throw this.translateError(err, rows);
    }
  }

  // Writes the difference between two versions of a document (same _id)
  async writeChanges(conn, collection, before, after) {
    const root = this.root(collection);
    const oldRows = encodeDocument(root, before);
    const newRows = encodeDocument(root, after);
    const id = idString(after._id);
    let changed = false;
    try {
      const o = oldRows.get(root.name)[0];
      const n = newRows.get(root.name)[0];
      const sets = writableColumns(root).filter((c) => c.name !== 'id' && rowKey(o[c.name] ?? null) !== rowKey(n[c.name] ?? null));
      if (sets.length) {
        changed = true;
        await this.query(conn, `UPDATE ${q(root.name)} SET ${sets.map((c) => `${q(c.name)} = ?`).join(', ')} WHERE \`id\` = ?`,
          [...sets.map((c) => n[c.name] ?? null), id]);
      }
      for (const sub of root.children) {
        const subtree = allTables(sub);
        const same = subtree.every((t) => rowKey(oldRows.get(t.name) || []) === rowKey(newRows.get(t.name) || []));
        if (same) continue;
        changed = true;
        // deleting the direct child rows cascades to grandchildren
        await this.query(conn, `DELETE FROM ${q(sub.name)} WHERE \`parent_id\` = ?`, [id]);
        await this.insertRows(conn, sub, newRows);
      }
    } catch (err) {
      throw this.translateError(err, newRows);
    }
    return changed;
  }

  async deleteIds(conn, collection, ids) {
    const root = this.root(collection);
    let n = 0;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const res = await this.query(conn, `DELETE FROM ${q(root.name)} WHERE \`id\` IN (?)`, [ids.slice(i, i + CHUNK)]);
      n += res.affectedRows || 0;
    }
    return n;
  }
}

function rootOf(t) {
  let cur = t;
  while (cur.parentTable) cur = cur.parentTable;
  return cur;
}

export { BSON, getPath, kindOf };

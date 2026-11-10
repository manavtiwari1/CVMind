// TiDB-backed replacement for the MongoDB driver's Collection (the subset Mongoose and CVMind use).
import { Aggregator } from 'mingo';
import mongoose from 'mongoose';
import { SqlCursor } from './cursor.js';
import { applyUpdate, newDocForUpsert } from './update.js';
import { projectionInfo, applyProjection } from './filter.js';
import { kindOf, getPath, ejsonText } from './codec.js';

const { BSON } = mongoose.mongo;
const { ObjectId } = BSON;

// Deep copy that keeps ObjectId, Date, Binary and Decimal128 types
const clone = (doc) => BSON.deserialize(BSON.serialize(doc, { ignoreUndefined: true }), { promoteBuffers: true });

const ack = (extra) => ({ acknowledged: true, ...extra });

export class SqlCollection {
  constructor(store, name) {
    this.store = store;
    this.collectionName = name;
    this.dbName = store.databaseName;
    this.namespace = `${store.databaseName}.${name}`;
  }

  // ─── reads ────────────────────────────────────────────────────────────────
  find(filter = {}, options = {}) {
    return new SqlCursor((opts) => this.store.findDocs(this.collectionName, filter, opts), options);
  }

  async findOne(filter = {}, options = {}) {
    const docs = await this.store.findDocs(this.collectionName, filter, { ...options, limit: 1 });
    return docs[0] ?? null;
  }

  async countDocuments(filter = {}, options = {}) {
    return this.store.count(this.collectionName, filter, options);
  }

  async estimatedDocumentCount() {
    return this.store.count(this.collectionName, {});
  }

  async distinct(key, filter = {}) {
    const docs = await this.store.findDocs(this.collectionName, filter, {});
    const seen = new Map();
    const add = (v) => {
      if (v === undefined) return;
      if (Array.isArray(v)) { v.forEach(add); return; }
      const k = ejsonText({ v });
      if (!seen.has(k)) seen.set(k, v);
    };
    const walk = (cur, segs) => {
      if (!segs.length) { add(cur); return; }
      if (Array.isArray(cur)) { cur.forEach((x) => walk(x, segs)); return; }
      if (kindOf(cur) !== 'object') return;
      walk(cur[segs[0]], segs.slice(1));
    };
    for (const d of docs) walk(d, key.split('.'));
    return [...seen.values()];
  }

  aggregate(pipeline = [], options = {}) {
    return new SqlCursor(async () => {
      const first = pipeline[0];
      const prefilter = first && first.$match && !JSON.stringify(Object.keys(first.$match)).includes('$text') ? first.$match : {};
      const docs = await this.store.findDocs(this.collectionName, prefilter, {});
      return new Aggregator(pipeline, { collation: options.collation }).run(docs);
    }, {});
  }

  // ─── inserts ──────────────────────────────────────────────────────────────
  async insertOne(doc, options = {}) {
    if (doc._id === undefined) doc._id = new ObjectId();
    await this.store.tx((conn) => this.store.insertDoc(conn, this.collectionName, doc));
    return ack({ insertedId: doc._id });
  }

  async insertMany(docs, options = {}) {
    const ordered = options.ordered !== false;
    const insertedIds = {};
    const writeErrors = [];
    let insertedCount = 0;
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      if (doc._id === undefined) doc._id = new ObjectId();
      try {
        await this.store.tx((conn) => this.store.insertDoc(conn, this.collectionName, doc));
        insertedIds[i] = doc._id;
        insertedCount++;
      } catch (err) {
        if (ordered) throw bulkError(err, [{ index: i, err }], { insertedCount, insertedIds });
        writeErrors.push({ index: i, err });
      }
    }
    if (writeErrors.length) throw bulkError(writeErrors[0].err, writeErrors, { insertedCount, insertedIds });
    return ack({ insertedCount, insertedIds });
  }

  // ─── updates ──────────────────────────────────────────────────────────────
  // Locks the matching rows, applies the update in JS, writes only what changed.
  async _update(filter, update, options, { multi }) {
    const run = () => this.store.tx(async (conn) => {
      const docs = await this.store.findDocs(this.collectionName, filter, {
        conn, forUpdate: true, sort: options.sort, limit: multi ? 0 : 1
      });
      if (!docs.length) {
        if (!options.upsert) return { matched: 0, modified: 0, before: null, after: null };
        const created = newDocForUpsert(filter, update, options.arrayFilters);
        await this.store.insertDoc(conn, this.collectionName, created);
        return { matched: 0, modified: 0, upsertedId: created._id, before: null, after: created };
      }
      let modified = 0;
      let first = null;
      for (const doc of docs) {
        const before = clone(doc);
        applyUpdate(doc, update, { filter, arrayFilters: options.arrayFilters });
        if (await this.store.writeChanges(conn, this.collectionName, before, doc)) modified++;
        if (!first) first = { before, after: doc };
      }
      return { matched: docs.length, modified, ...first };
    });
    try {
      return await run();
    } catch (err) {
      // MongoDB retries an upsert that lost a race on a unique key; so do we, once
      if (options.upsert && err.code === 11000) return run();
      throw err;
    }
  }

  async updateOne(filter, update, options = {}) {
    const r = await this._update(filter, update, options, { multi: false });
    return ack({ matchedCount: r.matched, modifiedCount: r.modified, upsertedCount: r.upsertedId ? 1 : 0, upsertedId: r.upsertedId ?? null });
  }

  async updateMany(filter, update, options = {}) {
    const r = await this._update(filter, update, options, { multi: true });
    return ack({ matchedCount: r.matched, modifiedCount: r.modified, upsertedCount: r.upsertedId ? 1 : 0, upsertedId: r.upsertedId ?? null });
  }

  async replaceOne(filter, replacement, options = {}) {
    return this.updateOne(filter, stripId(replacement), options);
  }

  async findOneAndUpdate(filter, update, options = {}) {
    const r = await this._update(filter, update, options, { multi: false });
    const raw = options.returnDocument === 'after' ? r.after : r.before;
    const value = raw ? applyProjection([raw], projectionInfo(options.projection))[0] : null;
    if (options.includeResultMetadata) {
      return {
        value,
        ok: 1,
        lastErrorObject: { n: r.matched || (r.upsertedId ? 1 : 0), updatedExisting: r.matched > 0, ...(r.upsertedId ? { upserted: r.upsertedId } : {}) }
      };
    }
    return value;
  }

  async findOneAndReplace(filter, replacement, options = {}) {
    return this.findOneAndUpdate(filter, stripId(replacement), options);
  }

  // ─── deletes ──────────────────────────────────────────────────────────────
  async _delete(filter, options, multi) {
    return this.store.tx(async (conn) => {
      const docs = await this.store.findDocs(this.collectionName, filter, { conn, forUpdate: true, sort: options.sort, limit: multi ? 0 : 1 });
      if (!docs.length) return { deleted: 0, doc: null };
      const ids = docs.map((d) => (kindOf(d._id) === 'objectId' ? d._id.toHexString() : String(d._id)));
      const deleted = await this.store.deleteIds(conn, this.collectionName, ids);
      return { deleted, doc: docs[0] };
    });
  }

  async deleteOne(filter = {}, options = {}) {
    const r = await this._delete(filter, options, false);
    return ack({ deletedCount: r.deleted });
  }

  async deleteMany(filter = {}, options = {}) {
    const r = await this._delete(filter, options, true);
    return ack({ deletedCount: r.deleted });
  }

  async findOneAndDelete(filter = {}, options = {}) {
    const r = await this._delete(filter, options, false);
    const value = r.doc ? applyProjection([r.doc], projectionInfo(options.projection))[0] : null;
    if (options.includeResultMetadata) return { value, ok: 1, lastErrorObject: { n: r.deleted } };
    return value;
  }

  // ─── bulk ─────────────────────────────────────────────────────────────────
  async bulkWrite(ops, options = {}) {
    const ordered = options.ordered !== false;
    const res = { insertedCount: 0, matchedCount: 0, modifiedCount: 0, deletedCount: 0, upsertedCount: 0, insertedIds: {}, upsertedIds: {} };
    const writeErrors = [];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const [kind, spec] = Object.entries(op)[0];
      try {
        if (kind === 'insertOne') {
          const doc = spec.document ?? spec;
          const r = await this.insertOne(doc);
          res.insertedCount++;
          res.insertedIds[i] = r.insertedId;
        } else if (kind === 'updateOne' || kind === 'updateMany' || kind === 'replaceOne') {
          const update = kind === 'replaceOne' ? stripId(spec.replacement) : spec.update;
          const r = await this._update(spec.filter, update, { upsert: spec.upsert, arrayFilters: spec.arrayFilters, sort: spec.sort }, { multi: kind === 'updateMany' });
          res.matchedCount += r.matched;
          res.modifiedCount += r.modified;
          if (r.upsertedId) { res.upsertedCount++; res.upsertedIds[i] = r.upsertedId; }
        } else if (kind === 'deleteOne' || kind === 'deleteMany') {
          const r = await this._delete(spec.filter, {}, kind === 'deleteMany');
          res.deletedCount += r.deleted;
        } else {
          throw new Error(`bulkWrite: unsupported operation ${kind}`);
        }
      } catch (err) {
        if (ordered) throw bulkError(err, [{ index: i, err }], res);
        writeErrors.push({ index: i, err });
      }
    }
    if (writeErrors.length) throw bulkError(writeErrors[0].err, writeErrors, res);
    return { ...res, ok: 1, isOk: () => true, hasWriteErrors: () => false, getWriteErrors: () => [] };
  }

  // ─── indexes and admin: indexes live in the TiDB schema, so these are no-ops ──
  async createIndex(spec, options = {}) { return options.name || Object.keys(spec || {}).map((k) => `${k}_1`).join('_'); }
  async createIndexes() { return []; }
  async dropIndex() { return { ok: 1 }; }
  async dropIndexes() { return true; }
  listIndexes() { return new SqlCursor(async () => [{ v: 2, key: { _id: 1 }, name: '_id_' }]); }
  async indexes() { return [{ v: 2, key: { _id: 1 }, name: '_id_' }]; }
  async indexExists() { return false; }
  async indexInformation() { return { _id_: [['_id', 1]] }; }
  async options() { return {}; }
  async isCapped() { return false; }

  async drop() {
    this.store.assertTestDatabase('drop a collection');
    await this.store.query(null, `DELETE FROM \`${this.store.root(this.collectionName).name}\``);
    return true;
  }

  watch() {
    throw new Error('Change streams are not available on TiDB');
  }
}

function stripId(doc) {
  if (kindOf(doc) !== 'object') return doc;
  const { _id, ...rest } = doc;
  return rest;
}

function bulkError(first, writeErrors, result) {
  const err = first;
  err.writeErrors = writeErrors.map(({ index, err: e }) => ({ index, code: e.code, errmsg: e.message, err: { index, code: e.code, errmsg: e.message } }));
  err.result = result;
  err.insertedDocs = [];
  return err;
}

export { getPath };

// Converts MongoDB-style documents to rows of the TiDB tables in schema/plan.json, and back.
// Used by the app at runtime and by db-migration when copying, so both always agree.
//
// Encoding rules
//  - scalar columns hold the value in its SQL type (ObjectId -> 24-char hex, Boolean -> 0/1, Date -> DATETIME)
//  - lists of plain values (strings, ids, numbers, booleans, dates) -> plain JSON arrays, so they can be indexed
//  - every other JSON column (Mixed, Map, irregular data) -> relaxed Extended JSON, so ObjectIds and Dates survive
//  - lists of objects -> child table rows (id = "<parentId>/<position>")
//  - anything without a column -> the row's `_extra` JSON, merged back on read. Nothing is dropped.
import mongoose from 'mongoose';

const { BSON } = mongoose.mongo;
const { EJSON, ObjectId, Decimal128 } = BSON;

export function kindOf(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'bigint') return 'number';
  if (v instanceof Date) return 'date';
  if (Array.isArray(v)) return 'array';
  if (v instanceof RegExp) return 'regex';
  const bson = v._bsontype;
  if (bson === 'ObjectId' || bson === 'ObjectID') return 'objectId';
  if (bson === 'Binary' || Buffer.isBuffer(v) || v instanceof Uint8Array) return 'binary';
  if (bson === 'Decimal128') return 'decimal';
  if (bson === 'Long' || bson === 'Int32' || bson === 'Double') return 'number';
  if (bson === 'Timestamp') return 'date';
  if (bson === 'UUID') return 'string';
  if (bson === 'BSONRegExp') return 'regex';
  if (typeof v === 'object') return 'object';
  return 'unknown';
}

const isObj = (v) => kindOf(v) === 'object';

// Mongoose documents, subdocuments and arrays -> plain values (what the MongoDB driver does via toBSON()).
// Hydrated subdocuments carry internal back-references (__parentArray, $__) that must never be stored.
export function toPlainValue(v) {
  if (v === null || v === undefined || typeof v !== 'object') return v;
  if (v._bsontype || v instanceof Date || Buffer.isBuffer(v) || v instanceof RegExp || v instanceof Uint8Array) return v;
  if (typeof v.toBSON === 'function') return toPlainValue(v.toBSON());
  if (Array.isArray(v)) return v.map(toPlainValue);
  if (v instanceof Map) return new Map([...v].map(([k, x]) => [k, toPlainValue(x)]));
  const out = {};
  for (const [k, x] of Object.entries(v)) if (x !== undefined) out[k] = toPlainValue(x);
  return out;
}
const PLAIN_LIST = new Set(['String', 'ObjectId', 'Number', 'Boolean', 'Date', 'UUID']);

export function isPlainList(col) {
  return col.mode === 'json' && col.isList && PLAIN_LIST.has(col.listOf);
}

export class EncodeError extends Error {}

export function getPath(obj, segs) {
  let cur = obj;
  for (const s of segs) {
    if (cur === null || cur === undefined) return undefined;
    if (!isObj(cur)) return { __notObject: true, value: cur };
    cur = cur[s];
  }
  return cur;
}

export function setPath(obj, segs, value) {
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (!isObj(cur[segs[i]])) cur[segs[i]] = {};
    cur = cur[segs[i]];
  }
  cur[segs[segs.length - 1]] = value;
}

function deepMerge(target, src) {
  for (const [k, v] of Object.entries(src)) {
    if (isObj(v) && isObj(target[k])) deepMerge(target[k], v);
    else target[k] = v;
  }
  return target;
}

export function idString(v) {
  const k = kindOf(v);
  if (k === 'objectId') return v.toHexString();
  if (k === 'null') return null;
  return String(v);
}

const toDate = (v) => (v instanceof Date ? v : new Date(Number(v.getHighBits()) * 1000));

export function ejsonText(v) {
  return EJSON.stringify(v, { relaxed: true });
}

export function fromEjson(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    // mysql2 parses JSON columns; a top-level JSON string arrives as a JS string already
    return v;
  }
  return EJSON.deserialize(v, { relaxed: true });
}

function plainListItem(col, item, where) {
  const k = kindOf(item);
  if (k === 'null') return null;
  switch (col.listOf) {
    case 'ObjectId': case 'String': case 'UUID':
      if (k === 'objectId') return item.toHexString();
      if (k === 'string') return item;
      break;
    case 'Number': if (k === 'number') return Number(item); break;
    case 'Boolean': if (k === 'boolean') return item; break;
    case 'Date': if (k === 'date') return toDate(item).toISOString(); break;
    default: break;
  }
  throw new EncodeError(`${where}: list ${col.name} of ${col.listOf} cannot hold a ${k}`);
}

// Encodes one value for its column. Throws EncodeError when the value does not fit the column type.
export function encodeValue(col, v, where = col.name) {
  const k = kindOf(v);
  if (k === 'null') return null;
  const fail = () => { throw new EncodeError(`${where}: column ${col.name} (${col.type}) cannot take a ${k} value`); };
  switch (col.mode) {
    case 'json':
      if (isPlainList(col)) {
        if (k !== 'array') fail();
        return JSON.stringify(v.map((item) => plainListItem(col, item, where)));
      }
      return ejsonText(v);
    case 'vector': {
      if (k !== 'binary') fail();
      const bytes = Uint8Array.from(v._bsontype === 'Binary' ? v.buffer : v);
      const dims = Number((/VECTOR\((\d+)\)/.exec(col.type) || [])[1]);
      // A vector of another size (a different embedding model or test data) cannot go in this column;
      // throwing sends it to _extra, where it is kept as-is
      if (dims && bytes.length !== dims * 4) throw new EncodeError(`${where}: vector has ${bytes.length / 4} dimensions, column holds ${dims}`);
      const f = new Float32Array(bytes.buffer, 0, Math.floor(bytes.length / 4));
      return `[${Array.from(f).join(',')}]`;
    }
    case 'String': case 'UUID': case 'ObjectId':
      if (k === 'objectId') return v.toHexString();
      if (k === 'string') return v;
      return fail();
    case 'Number': case 'BigInt': {
      if (k !== 'number') fail();
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) fail();
      return n;
    }
    case 'Boolean': if (k !== 'boolean') fail(); return v ? 1 : 0;
    case 'Date': {
      if (k !== 'date') fail();
      const d = toDate(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    case 'Buffer':
      if (k !== 'binary') fail();
      // A Node Buffer's .buffer is its whole shared memory pool; only BSON Binary keeps its bytes in .buffer
      if (Buffer.isBuffer(v)) return v;
      return Buffer.from(v._bsontype === 'Binary' ? v.buffer : v);
    case 'Decimal128': if (k !== 'decimal' && k !== 'number') fail(); return v.toString();
    default: return fail();
  }
}

// Decodes a value read from TiDB (as mysql2 returns it) into what MongoDB would have returned.
export function decodeValue(col, v) {
  if (v === null || v === undefined) return undefined;
  switch (col.mode) {
    case 'json':
      if (isPlainList(col)) {
        if (!Array.isArray(v)) return fromEjson(v);
        if (col.listOf === 'ObjectId') return v.map((x) => (typeof x === 'string' && ObjectId.isValid(x) && x.length === 24 ? new ObjectId(x) : x));
        if (col.listOf === 'Date') return v.map((x) => (x === null ? null : new Date(x)));
        return v;
      }
      return fromEjson(v);
    case 'vector': {
      const nums = String(v).replace(/^\[|\]$/g, '').split(',').filter((s) => s.trim() !== '').map(Number);
      return Buffer.from(new Float32Array(nums).buffer);
    }
    case 'ObjectId':
      return typeof v === 'string' && v.length === 24 && ObjectId.isValid(v) ? new ObjectId(v) : v;
    case 'String': case 'UUID': return Buffer.isBuffer(v) ? v.toString('utf8') : String(v);
    case 'Number': case 'BigInt': return Number(v);
    case 'Boolean': return Number(v) === 1 || v === true;
    case 'Date': return v instanceof Date ? v : new Date(v);
    case 'Buffer': return Buffer.isBuffer(v) ? v : Buffer.from(v);
    case 'Decimal128': return Decimal128.fromString(String(v));
    default: return v;
  }
}

const STRUCTURAL = new Set(['childId', 'parentId', 'position', 'extra', 'generated']);

// Columns the app writes (generated columns are computed by TiDB)
export function writableColumns(table) {
  return table.columns.filter((c) => c.mode !== 'generated');
}

// ─── document -> rows ───────────────────────────────────────────────────────
// Returns Map<tableName, rowObject[]> (rows keyed by column name), parents before children.
export function encodeDocument(root, input) {
  const doc = toPlainValue(input);
  const rows = new Map();
  const push = (t, r) => { if (!rows.has(t.name)) rows.set(t.name, []); rows.get(t.name).push(r); };
  const pk = idString(doc._id);
  if (!pk) throw new EncodeError(`${root.name}: document has no _id`);

  function mapRow(table, obj, rowPk, parentPk, position) {
    const row = {};
    const consumed = new Set();
    const extra = {};
    for (const col of table.columns) {
      if (col.mode === 'childId') { row.id = rowPk; continue; }
      if (col.mode === 'parentId') { row.parent_id = parentPk; continue; }
      if (col.mode === 'position') { row.position = position; continue; }
      if (col.mode === 'extra' || col.mode === 'generated') continue;
      const key = col.path.join('.');
      const raw = getPath(obj, col.path);
      if (raw && raw.__notObject) { row[col.name] = null; continue; } // the non-object parent is caught as unplaced below
      consumed.add(key);
      if (table.kind === 'root' && col.name === 'id') { row.id = rowPk; continue; }
      // SQL NULL cannot tell `null` from "missing"; MongoDB can, and app code checks `=== null`. Record explicit nulls.
      if (raw === null) { row[col.name] = null; setPath(extra, col.path, null); continue; }
      try {
        row[col.name] = encodeValue(col, raw, `${table.name}#${rowPk}.${key}`);
      } catch (err) {
        if (!(err instanceof EncodeError)) throw err;
        row[col.name] = null;
        setPath(extra, col.path, raw);
      }
    }

    for (const sub of table.children) {
      const key = sub.sourcePath.join('.');
      const arr = getPath(obj, sub.sourcePath);
      if (arr === null) { consumed.add(key); setPath(extra, sub.sourcePath, null); continue; }
      if (arr === undefined || (arr && arr.__notObject)) continue;
      consumed.add(key);
      if (!Array.isArray(arr) || arr.some((item) => !isObj(item))) {
        setPath(extra, sub.sourcePath, arr); // irregular list: keep it whole in _extra
        continue;
      }
      // An empty list has no rows; record that it exists so reading gives [] (and a missing list stays missing)
      if (!arr.length) setPath(extra, sub.sourcePath, []);
      arr.forEach((item, i) => mapRow(sub, item, `${rowPk}/${i}`, rowPk, i));
    }

    collectUnplaced(obj, [], consumed, extra);
    row._extra = Object.keys(extra).length ? ejsonText(extra) : null;
    push(table, row);
  }

  // Parents must be inserted before children; register tables in tree order first
  for (const t of allTables(root)) rows.set(t.name, []);
  mapRow(root, doc, pk, null, null);
  return rows;
}

function collectUnplaced(obj, prefix, consumed, extra) {
  for (const [k, v] of Object.entries(obj)) {
    const segs = [...prefix, k];
    const p = segs.join('.');
    if (consumed.has(p)) continue;
    if (v === undefined) continue;
    // an object field that is null (e.g. `salary: null`) has no column of its own
    if (v === null) { setPath(extra, segs, null); continue; }
    if (isObj(v)) {
      // descend only if some column lives below; otherwise keep the whole object
      if ([...consumed].some((c) => c.startsWith(`${p}.`))) collectUnplaced(v, segs, consumed, extra);
      else if (Object.keys(v).length) setPath(extra, segs, v);
      continue;
    }
    setPath(extra, segs, v);
  }
}

// ─── rows -> document ───────────────────────────────────────────────────────
// rootRow: row object from SELECT; children: Map<tableName, Map<parentId, row[]>>
export function decodeDocument(root, rootRow, children = new Map(), skip = new Set()) {
  return buildObj(root, rootRow, children, skip);
}

function buildObj(table, row, children, skip) {
  const obj = {};
  for (const col of table.columns) {
    if (STRUCTURAL.has(col.mode)) continue;
    if (!(col.name in row)) continue;
    const v = decodeValue(col, row[col.name]);
    if (v === undefined) continue;
    setPath(obj, col.path, v);
  }
  for (const sub of table.children) {
    if (skip.has(sub.name)) continue;
    const items = children.get(sub.name)?.get(String(row.id)) || [];
    if (items.length) setPath(obj, sub.sourcePath, items.map((r) => buildObj(sub, r, children, skip)));
  }
  if (row._extra !== null && row._extra !== undefined) {
    const extra = fromEjson(row._extra);
    if (isObj(extra)) deepMerge(obj, extra);
  }
  return obj;
}

export function allTables(t) {
  return [t, ...t.children.flatMap(allTables)];
}

// Stable comparison key for an encoded row (used to skip unchanged writes)
export function rowKey(row) {
  return JSON.stringify(row, (k, v) => {
    if (v instanceof Date) return `D:${v.getTime()}`;
    if (v && v.type === 'Buffer' && Array.isArray(v.data)) return `B:${Buffer.from(v.data).toString('base64')}`;
    return v;
  });
}

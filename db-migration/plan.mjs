// Designs the MySQL/TiDB tables from the Mongoose models (schema-dump.json) and the real data (data-profile.json).
// Output: plan.json (used by copy/verify) and schema.sql (for review).
//
// Rules
//  - One table per collection; Mongo _id becomes `id` (primary key).
//  - Nested objects are flattened into columns: contact.email -> contact__email.
//  - Arrays of objects become child tables with parent_id -> parent.id (ON DELETE CASCADE) and position.
//  - Arrays of plain values, Mixed and Map fields become JSON columns.
//  - Embedding vectors (Float32 x 768) become VECTOR(768) columns with an HNSW cosine index.
//  - Any field whose real data does not fit one type is kept as JSON so nothing is lost.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { models } = JSON.parse(fs.readFileSync(path.join(here, 'schema-dump.json'), 'utf8'));
const profile = JSON.parse(fs.readFileSync(path.join(here, 'data-profile.json'), 'utf8'));
const DEFAULT_DIMS = Number(process.env.GEMINI_EMBED_DIMS || 768);
const notes = [];

// ─── helpers ────────────────────────────────────────────────────────────────
const snake = (s) => s
  .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
  .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
  .replace(/[^A-Za-z0-9_]/g, '_')
  .toLowerCase();

function ident(name) {
  if (name.length <= 64) return name;
  const h = crypto.createHash('sha1').update(name).digest('hex').slice(0, 8);
  return `${name.slice(0, 55)}_${h}`;
}

const q = (n) => `\`${n}\``;

function newNode() {
  return { schema: null, stats: null, children: new Map(), item: null };
}

function child(node, seg) {
  if (seg === '[]') return (node.item ||= newNode());
  if (!node.children.has(seg)) node.children.set(seg, newNode());
  return node.children.get(seg);
}

function splitDataPath(p) {
  const segs = [];
  for (const part of p.split('.')) {
    const m = part.match(/^([^[]*)((?:\[\])*)$/);
    if (m[1]) segs.push(m[1]);
    for (let i = 0; i < m[2].length / 2; i++) segs.push('[]');
  }
  return segs;
}

function insertSchema(root, fields) {
  for (const [p, d] of Object.entries(fields)) {
    let n = root;
    for (const seg of p.split('.')) n = child(n, seg);
    n.schema = n.schema || d;
    if (d.instance === 'Array') {
      const item = child(n, '[]');
      if (d.items?.instance === 'Subdocument') {
        item.schema ||= { instance: 'Subdocument' };
        insertSchema(item, d.items.fields || {});
      } else if (d.items) {
        item.schema ||= d.items;
        if (d.items.items) child(item, '[]').schema ||= d.items.items;
      }
    } else if (d.instance === 'Embedded' && d.fields) {
      insertSchema(n, d.fields);
    }
  }
}

function insertData(root, paths) {
  for (const [p, s] of Object.entries(paths)) {
    let n = root;
    for (const seg of splitDataPath(p)) n = child(n, seg);
    n.stats = s;
  }
}

const nonNullKinds = (n) => Object.keys(n.stats?.kinds || {}).filter((k) => k !== 'null');

// Kinds of data a scalar column of a given Mongoose type can take without loss
const ACCEPTS = {
  String: ['string', 'objectId'],
  ObjectId: ['objectId', 'string'],
  UUID: ['string'],
  Number: ['number'],
  Boolean: ['boolean'],
  Date: ['date'],
  Buffer: ['binary'],
  Decimal128: ['decimal', 'number'],
  BigInt: ['number']
};
const KIND_TO_INSTANCE = { string: 'String', objectId: 'ObjectId', number: 'Number', boolean: 'Boolean', date: 'Date', binary: 'Buffer', decimal: 'Decimal128' };

// ─── decide what each node becomes ──────────────────────────────────────────
function isVectorLeaf(segs, n) {
  const lens = Object.keys(n.stats?.binLens || {}).map(Number);
  const named = segs.some((s) => /embed|vector/i.test(s));
  if (!named) return null;
  if (lens.length === 1 && lens[0] % 4 === 0) return lens[0] / 4;
  if (lens.length === 0) return DEFAULT_DIMS;
  return null;
}

const SHORT_FIELD = /(^|_)(id|ids)$|Id$|(status|provider|type|kind|role|plan|currency|country|code|os|browser|device|source|channel|locale|lang|language|method|state|stage|period|mode|tier|level|hash|token|jti|slug|ip|email|phone|name|username|city|platform|version|model|color|colour|icon|emoji|format|template|theme|category|priority|timezone|tz|cycle|gateway|action|event|outcome|reason|label)$/i;

function scalarType(instance, n, indexed, segs) {
  if (segs.length === 1 && segs[0] === '__v') return 'INT';
  const s = n.stats || {};
  const sch = n.schema || {};
  switch (instance) {
    case 'ObjectId':
      return s.maxLen > 24 ? 'VARCHAR(64)' : 'VARCHAR(24)';
    case 'String':
    case 'UUID': {
      const declared = Number(sch.maxlength) || 0;
      if (indexed) {
        const need = Math.max(declared, s.maxLen || 0);
        return need <= 255 ? 'VARCHAR(255)' : need <= 768 ? 'VARCHAR(768)' : 'MEDIUMTEXT';
      }
      if (Array.isArray(sch.enum) && sch.enum.length) {
        const longest = Math.max(...sch.enum.map((e) => String(e ?? '').length), s.maxLen || 0);
        return longest <= 64 ? 'VARCHAR(64)' : 'VARCHAR(255)';
      }
      if (declared && declared <= 255 && (s.maxLen || 0) <= 255) return 'VARCHAR(255)';
      // Short labels and identifiers by name, as long as no current value is longer than 255
      const last = segs[segs.length - 1] || '';
      if ((s.maxLen || 0) <= 255 && SHORT_FIELD.test(last)) return 'VARCHAR(255)';
      if (declared && declared <= 2000 && (s.maxLen || 0) <= 2000) return 'VARCHAR(2000)';
      return 'MEDIUMTEXT';
    }
    case 'Number':
    case 'BigInt':
      return 'DOUBLE';
    case 'Boolean':
      return 'BOOLEAN';
    case 'Date':
      return 'DATETIME(3)';
    case 'Decimal128':
      return 'DECIMAL(38,10)';
    case 'Buffer': {
      const dims = isVectorLeaf(segs, n);
      if (dims) return `VECTOR(${dims})`;
      return 'LONGBLOB';
    }
    default:
      return 'JSON';
  }
}

function makeTable(name, kind, parent) {
  return { name: ident(name), kind, parent: parent?.name || null, columns: [], children: [], indexes: [], pathMap: {} };
}

function addColumn(table, base, def) {
  let name = ident(base);
  let i = 2;
  while (table.columns.some((c) => c.name.toLowerCase() === name.toLowerCase())) name = ident(`${base}_${i++}`);
  const col = { name, ...def };
  table.columns.push(col);
  return col;
}

// Emits the columns for node `n`. `segs` is the path relative to `table`'s row object.
function emit(n, segs, table, ctx) {
  const key = [...ctx.prefix, ...segs].join('.');
  const inst = n.schema?.instance;
  const kinds = nonNullKinds(n);
  const asJson = (why) => {
    const col = addColumn(table, colName(segs, table), { path: segs, mode: 'json', type: 'JSON', nullable: true });
    table.pathMap[key] = col.name;
    if (why) notes.push(`${table.name}.${col.name}: kept as JSON (${why})`);
  };

  if (inst === 'Mixed' || inst === 'Map') return asJson();

  const looksArray = inst === 'Array' || kinds.includes('array');
  if (looksArray) {
    if (kinds.some((k) => k !== 'array')) return asJson('values are sometimes a list and sometimes not');
    const item = n.item || newNode();
    const itemKinds = nonNullKinds(item);
    const itemIsObject = item.schema?.instance === 'Subdocument' || (itemKinds.length > 0 && itemKinds.every((k) => k === 'object') && !item.schema);
    if (itemIsObject && itemKinds.every((k) => k === 'object') && item.schema?.instance !== 'Mixed') {
      const sub = makeTable(`${table.name}__${snake(segs.join('_'))}`, 'child', table);
      sub.sourcePath = segs;
      table.children.push(sub);
      table.pathMap[key] = { childTable: sub.name };
      emitRowColumns(item, sub, { ...ctx, prefix: [...ctx.prefix, ...segs] });
      return;
    }
    const col = addColumn(table, colName(segs, table), { path: segs, mode: 'json', type: 'JSON', nullable: true, isList: true });
    const itemInst = item.schema?.instance || (itemKinds.length === 1 ? KIND_TO_INSTANCE[itemKinds[0]] : null);
    col.listOf = itemInst || 'Mixed';
    table.pathMap[key] = col.name;
    return;
  }

  const objectish = inst === 'Embedded' || (!n.schema && (kinds.includes('object') || (n.children.size > 0 && kinds.length === 0)));
  if (objectish || (!inst && n.children.size > 0)) {
    if (kinds.some((k) => k !== 'object')) return asJson('values are sometimes an object and sometimes not');
    if (n.children.size === 0) return asJson();
    if (!n.schema && !hasSchemaBelow(n) && n.children.size > 40) return asJson('free-form keys');
    for (const [seg, c] of n.children) emit(c, [...segs, seg], table, ctx);
    return;
  }

  // scalar leaf
  let instance = inst && ACCEPTS[inst] ? inst : null;
  if (!instance) {
    if (kinds.length === 0) instance = inst || 'String';
    else if (kinds.length === 1 && KIND_TO_INSTANCE[kinds[0]]) instance = KIND_TO_INSTANCE[kinds[0]];
    else if (kinds.every((k) => k === 'string' || k === 'objectId')) instance = 'String';
    else return asJson(`mixed value types: ${kinds.join(', ')}`);
  }
  const bad = kinds.filter((k) => !(ACCEPTS[instance] || []).includes(k));
  if (bad.length) return asJson(`schema says ${instance} but data has ${bad.join(', ')}`);

  const indexed = ctx.indexed.has(key);
  const type = scalarType(instance, n, indexed, segs);
  if (indexed && type === 'MEDIUMTEXT') notes.push(`${table.name}: ${key} is indexed in Mongo but values are too long for an index; index skipped`);
  const isId = segs.length === 1 && segs[0] === '_id';
  const col = addColumn(table, colName(segs, table), {
    path: segs,
    mode: type.startsWith('VECTOR') ? 'vector' : instance,
    type,
    nullable: !(isId && table.kind === 'root'),
    ref: n.schema?.ref || null,
    enum: Array.isArray(n.schema?.enum) ? n.schema.enum : undefined
  });
  table.pathMap[key] = col.name;
}

function hasSchemaBelow(n) {
  if (n.schema) return true;
  for (const c of n.children.values()) if (hasSchemaBelow(c)) return true;
  return n.item ? hasSchemaBelow(n.item) : false;
}

function colName(segs, table) {
  if (segs.length === 1 && segs[0] === '_id') return table.kind === 'root' ? 'id' : 'mongo_id';
  if (segs.length === 1 && segs[0] === '__v') return 'doc_version';
  return segs.map(snake).join('__');
}

function emitRowColumns(n, table, ctx) {
  if (table.kind === 'child') {
    table.columns.push({ name: 'id', mode: 'childId', type: 'VARCHAR(255)', nullable: false });
    table.columns.push({ name: 'parent_id', mode: 'parentId', type: table.parentKeyType, nullable: false });
    table.columns.push({ name: 'position', mode: 'position', type: 'INT', nullable: false });
  }
  const order = [...n.children.keys()].sort((a, b) => (a === '_id' ? -1 : b === '_id' ? 1 : 0));
  for (const seg of order) emit(n.children.get(seg), [seg], table, ctx);
  // Catch-all for values with no column (fields added to a model later, free-form data); merged back on read
  table.columns.push({ name: '_extra', mode: 'extra', type: 'JSON', nullable: true });
  for (const sub of table.children) sub.parentKeyType = table.kind === 'root' ? table.columns.find((c) => c.name === 'id').type : 'VARCHAR(255)';
  for (const sub of table.children) {
    const pk = sub.columns.find((c) => c.name === 'parent_id');
    if (pk) pk.type = sub.parentKeyType;
  }
}

// ─── indexes ────────────────────────────────────────────────────────────────
function indexedPaths(modelList) {
  const set = new Set();
  for (const m of modelList) {
    for (const [fields] of m.indexes) for (const f of Object.keys(fields)) set.add(f);
    for (const [p, d] of Object.entries(m.fields)) if (d.ref) set.add(p);
  }
  return set;
}

function findColumn(table, key) {
  const hit = table.pathMap[key];
  if (typeof hit === 'string') return { table, column: table.columns.find((c) => c.name === hit) };
  for (const sub of table.children) {
    const r = findColumn(sub, key);
    if (r) return r;
  }
  return null;
}

function allTables(t) {
  return [t, ...t.children.flatMap(allTables)];
}

function addIndexes(root, modelList) {
  const seen = new Set();
  for (const m of modelList) {
    for (const [fields, opts = {}] of m.indexes) {
      const keys = Object.keys(fields);
      if (keys.some((k) => fields[k] === 'text')) { notes.push(`${root.name}: text index on ${keys.join(', ')} skipped (use LIKE or TiDB full-text search)`); continue; }
      if (keys.some((k) => fields[k] === '2dsphere' || fields[k] === 'hashed')) { notes.push(`${root.name}: ${JSON.stringify(fields)} index skipped`); continue; }
      const cols = keys.map((k) => findColumn(root, k));
      if (cols.some((c) => !c)) { notes.push(`${root.name}: index ${keys.join(', ')} skipped (field has no column)`); continue; }
      const target = cols[0].table;
      if (cols.some((c) => c.table !== target)) { notes.push(`${root.name}: index ${keys.join(', ')} spans a child table; skipped`); continue; }

      if (opts.expireAfterSeconds !== undefined && keys.length === 1 && target === root) {
        const c = cols[0].column;
        if (c.type.startsWith('DATETIME') && root.children.length === 0) {
          root.ttl = { column: c.name, seconds: opts.expireAfterSeconds };
        } else {
          notes.push(`${root.name}: TTL on ${keys[0]} not applied (needs a plain date column on a table without child tables); rows will not auto-expire`);
        }
      }

      const parts = [];
      let ok = true;
      for (const { column } of cols) {
        if (column.type === 'JSON' && column.isList && (column.listOf === 'String' || column.listOf === 'ObjectId')) {
          // TiDB allows one multi-valued (array) part per index, composite or not
          if (parts.some((p) => p.includes(' ARRAY'))) { ok = false; break; }
          parts.push(`(CAST(${q(column.name)} AS CHAR(255) ARRAY))`);
        } else if (/^(VARCHAR|DOUBLE|BOOLEAN|DATETIME|INT|DECIMAL)/.test(column.type)) {
          parts.push(q(column.name));
        } else { ok = false; break; }
      }
      if (!ok) { notes.push(`${target.name}: index ${keys.join(', ')} skipped (column type ${cols.map((c) => c.column.type).join(', ')} cannot be indexed)`); continue; }

      // A filter that only skips missing/non-string values matches MySQL UNIQUE, which already allows many NULLs
      const pfe = opts.partialFilterExpression;
      const onlyTypeFilter = pfe && keys.length === 1 && Object.keys(pfe).length === 1 && pfe[keys[0]]
        && JSON.stringify(pfe[keys[0]]) === JSON.stringify({ $type: 'string' });
      // Other partial unique indexes: a generated column holds the key only when the filter matches, and is UNIQUE
      if (opts.unique && pfe && !onlyTypeFilter) {
        const cond = keys.length === 1 && target === root ? partialFilterSql(root, pfe) : null;
        if (cond) {
          const keyCol = cols[0].column;
          const genName = ident(`_uq_${keyCol.name}`);
          const type = /^VARCHAR/.test(keyCol.type) ? keyCol.type : 'VARCHAR(255)';
          root.columns.push({ name: genName, mode: 'generated', type, nullable: true, generatedAs: `(CASE WHEN ${cond} THEN ${q(keyCol.name)} END)`, keyPath: keyCol.path });
          root.indexes.push({ name: ident(`uq_${keyCol.name}_partial`), unique: true, parts: [q(genName)] });
          notes.push(`${root.name}: partial unique index on ${keys[0]} (${JSON.stringify(pfe)}) enforced through generated column ${genName}`);
          continue;
        }
      }
      const unique = !!opts.unique && (!pfe || onlyTypeFilter);
      if (opts.unique && !unique) notes.push(`${target.name}: unique index on ${keys.join(', ')} has a Mongo filter (${JSON.stringify(pfe)}) that SQL cannot express; created as a normal index`);
      const sig = `${target.name}|${parts.join(',')}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      if (parts.length === 1 && parts[0] === q('id') && target === root) continue;
      const name = ident(`${unique ? 'uq' : 'ix'}_${cols.map((c) => c.column.name).join('_')}`);
      target.indexes.push({ name, unique, parts });
    }
  }
  // Every reference field gets a plain index for joins, and child tables are indexed by parent
  for (const t of allTables(root)) {
    for (const c of t.columns) {
      if (c.ref && !t.indexes.some((i) => i.parts[0] === q(c.name)) && /^VARCHAR/.test(c.type)) {
        t.indexes.push({ name: ident(`ix_${c.name}`), unique: false, parts: [q(c.name)] });
      }
      if (c.mode === 'vector') t.vectorIndexes = [...(t.vectorIndexes || []), c.name];
    }
  }
}

// Mongo partial filter -> SQL condition over the root table's columns (the forms CVMind uses), or null
function partialFilterSql(root, pfe) {
  const parts = [];
  for (const [field, cond] of Object.entries(pfe)) {
    const hit = findColumn(root, field);
    if (!hit || hit.table !== root) return null;
    const ref = q(hit.column.name);
    const lit = (v) => (typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
    if (cond === null || typeof cond !== 'object') { parts.push(`${ref} = ${lit(cond)}`); continue; }
    for (const [op, v] of Object.entries(cond)) {
      if (op === '$gt') parts.push(`${ref} > ${lit(v)}`);
      else if (op === '$gte') parts.push(`${ref} >= ${lit(v)}`);
      else if (op === '$eq') parts.push(`${ref} = ${lit(v)}`);
      else if (op === '$in' && Array.isArray(v) && v.length) parts.push(`${ref} IN (${v.map(lit).join(', ')})`);
      else if (op === '$type' && v === 'string') parts.push(`${ref} IS NOT NULL`);
      else if (op === '$exists' && v === true) parts.push(`${ref} IS NOT NULL`);
      else return null;
    }
  }
  return parts.length ? parts.join(' AND ') : null;
}

// ─── build all tables ───────────────────────────────────────────────────────
const byCollection = {};
for (const [name, m] of Object.entries(models)) (byCollection[m.collection] ||= []).push({ name, ...m });

const collections = [...new Set([...Object.keys(profile.collections), ...Object.keys(byCollection)])].sort();
const roots = [];

for (const coll of collections) {
  const modelList = byCollection[coll] || [];
  const data = profile.collections[coll];
  const tree = newNode();
  for (const m of modelList) insertSchema(tree, m.fields);
  // GridFS has a fixed layout even when the bucket is empty
  if (coll.endsWith('.chunks')) insertSchema(tree, { files_id: { instance: 'ObjectId' }, n: { instance: 'Number' }, data: { instance: 'Buffer' } });
  if (coll.endsWith('.files')) insertSchema(tree, { length: { instance: 'Number' }, chunkSize: { instance: 'Number' }, uploadDate: { instance: 'Date' }, filename: { instance: 'String' } });
  if (data) insertData(tree, data.paths);
  if (!tree.children.has('_id')) child(tree, '_id').schema = { instance: 'ObjectId' };

  const root = makeTable(snake(coll.replace(/\./g, '_')), 'root', null);
  root.collection = coll;
  root.models = modelList.map((m) => m.name);
  root.docs = data?.docs ?? 0;
  root.gridfs = /\.(files|chunks)$/.test(coll);
  if (!modelList.length) notes.push(`${root.name}: no Mongoose model; columns inferred from the data`);
  emitRowColumns(tree, root, { prefix: [], indexed: indexedPaths(modelList) });
  addIndexes(root, modelList);
  if (coll.endsWith('.chunks')) root.indexes.push({ name: 'uq_files_id_n', unique: true, parts: [q('files_id'), q('n')] });
  roots.push(root);
}

// ─── SQL ────────────────────────────────────────────────────────────────────
function tableSql(t) {
  const lines = t.columns.map((c) => {
    if (c.generatedAs) return `  ${q(c.name)} ${c.type} GENERATED ALWAYS AS ${c.generatedAs} VIRTUAL`;
    const comment = c.ref ? ` COMMENT 'ref: ${c.ref}'` : '';
    return `  ${q(c.name)} ${c.type}${c.nullable ? ' NULL' : ' NOT NULL'}${comment}`;
  });
  lines.push(`  PRIMARY KEY (${q('id')})`);
  for (const i of t.indexes) lines.push(`  ${i.unique ? 'UNIQUE ' : ''}KEY ${q(i.name)} (${i.parts.join(', ')})`);
  if (t.kind === 'child') {
    lines.push(`  KEY ${q(ident(`ix_${t.name}_parent`))} (${q('parent_id')}, ${q('position')})`);
    lines.push(`  CONSTRAINT ${q(ident(`fk_${t.name}`))} FOREIGN KEY (${q('parent_id')}) REFERENCES ${q(t.parent)} (${q('id')}) ON DELETE CASCADE`);
  }
  let sql = `CREATE TABLE ${q(t.name)} (\n${lines.join(',\n')}\n) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`;
  // TTL starts OFF so rows are not removed between copy and verify; turn on at cutover (see README)
  if (t.ttl) sql += `\n  TTL = ${q(t.ttl.column)} + INTERVAL ${t.ttl.seconds} SECOND TTL_ENABLE = 'OFF'`;
  return `${sql};`;
}

function vectorSql(t) {
  return (t.vectorIndexes || []).map((c) =>
    `ALTER TABLE ${q(t.name)} ADD VECTOR INDEX ${q(ident(`vx_${c}`))} ((VEC_COSINE_DISTANCE(${q(c)}))) USING HNSW;`);
}

const ordered = roots.flatMap(allTables);
const create = ordered.map(tableSql);
const vectors = ordered.flatMap(vectorSql);
const header = `-- CVMind: MongoDB -> TiDB (MySQL-compatible) schema
-- Generated by db-migration/plan.mjs on ${new Date().toISOString()}
-- ${roots.length} collections -> ${ordered.length} tables (${ordered.length - roots.length} child tables for lists of objects)
`;
const sql = `${header}\n${create.join('\n\n')}\n\n-- Vector search (TiDB): HNSW indexes on embedding columns. TiFlash replicas are needed first.\n${ordered.filter((t) => t.vectorIndexes?.length).map((t) => `ALTER TABLE ${q(t.name)} SET TIFLASH REPLICA 1;`).join('\n')}\n${vectors.join('\n')}\n`;

const strip = (t) => ({ ...t, pathMap: undefined, children: t.children.map(strip) });
const planJson = JSON.stringify({ generatedAt: new Date().toISOString(), tables: roots.map(strip), notes }, null, 1);
fs.writeFileSync(path.join(here, 'plan.json'), planJson);
fs.writeFileSync(path.join(here, 'schema.sql'), sql);
// The app reads the same plan at runtime (tidb-store)
const storeDir = path.resolve(here, '..', 'tidb-store', 'schema');
fs.mkdirSync(storeDir, { recursive: true });
fs.writeFileSync(path.join(storeDir, 'plan.json'), planJson);
fs.writeFileSync(path.join(storeDir, 'schema.sql'), sql);

const totalCols = ordered.reduce((n, t) => n + t.columns.length, 0);
console.log(`${roots.length} collections -> ${ordered.length} tables, ${totalCols} columns, ${ordered.reduce((n, t) => n + t.indexes.length, 0)} indexes, ${vectors.length} vector indexes`);
console.log(`${notes.length} notes:`);
for (const n of notes) console.log('  -', n);

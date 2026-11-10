// MongoDB filter -> SQL WHERE, sort -> ORDER BY, and projection.
//
// compileFilter returns { sql, params, exact }:
//  - sql is a condition every matching document satisfies (null = no condition)
//  - exact=false means sql may also let through some non-matching documents, so the caller
//    must check each document with the full filter in JS (mingo). Results are always the same as MongoDB.
import { Query, Aggregator } from 'mingo';
import { kindOf, isPlainList, encodeValue, EncodeError, getPath } from './codec.js';

const q = (n) => `\`${n}\``;
const TRUE = { sql: null, params: [], exact: true };
const LOOSE = { sql: null, params: [], exact: false };

const isOperatorObject = (v) => kindOf(v) === 'object' && Object.keys(v).length > 0 && Object.keys(v).every((k) => k.startsWith('$'));

function param(col, v) {
  try {
    const out = encodeValue(col, v);
    return { ok: out !== null, value: out };
  } catch (err) {
    if (err instanceof EncodeError) return { ok: false };
    throw err;
  }
}

function listItemParam(col, v) {
  const k = kindOf(v);
  if ((col.listOf === 'ObjectId' || col.listOf === 'String' || col.listOf === 'UUID') && (k === 'objectId' || k === 'string')) {
    return { ok: true, value: k === 'objectId' ? v.toHexString() : v };
  }
  if (col.listOf === 'Number' && k === 'number') return { ok: true, value: Number(v) };
  if (col.listOf === 'Boolean' && k === 'boolean') return { ok: true, value: v };
  return { ok: false };
}

const SCALAR_SQL = /^(VARCHAR|DOUBLE|BOOLEAN|DATETIME|INT|DECIMAL|MEDIUMTEXT)/;

function scalarCondition(col, ref, cond) {
  if (!SCALAR_SQL.test(col.type)) return LOOSE;
  const eq = (v) => {
    const k = kindOf(v);
    if (k === 'null') return { sql: `${ref} IS NULL`, params: [], exact: true };
    if (k === 'regex' || k === 'array' || k === 'object') return LOOSE;
    const p = param(col, v);
    if (!p.ok) return LOOSE;
    return { sql: `${ref} = ?`, params: [p.value], exact: true };
  };
  if (!isOperatorObject(cond)) return eq(cond);

  const parts = [];
  const params = [];
  let exact = true;
  const add = (r) => { if (r.sql) { parts.push(r.sql); params.push(...r.params); } exact = exact && r.exact; };

  for (const [op, v] of Object.entries(cond)) {
    switch (op) {
      case '$eq': add(eq(v)); break;
      case '$ne': {
        if (kindOf(v) === 'null') { add({ sql: `${ref} IS NOT NULL`, params: [], exact: true }); break; }
        const r = eq(v);
        if (!r.exact || !r.sql) { exact = false; break; }
        add({ sql: `(${ref} IS NULL OR NOT (${r.sql}))`, params: r.params, exact: true });
        break;
      }
      case '$in':
      case '$nin': {
        if (!Array.isArray(v)) { exact = false; break; }
        const hasNull = v.some((x) => kindOf(x) === 'null');
        const vals = [];
        let ok = true;
        for (const x of v) {
          if (kindOf(x) === 'null') continue;
          const k = kindOf(x);
          if (k === 'regex' || k === 'array' || k === 'object') { ok = false; break; }
          const p = param(col, x);
          if (!p.ok) { ok = false; break; }
          vals.push(p.value);
        }
        if (!ok) { exact = false; break; }
        if (op === '$in') {
          const ors = [];
          if (vals.length) ors.push(`${ref} IN (${vals.map(() => '?').join(', ')})`);
          if (hasNull) ors.push(`${ref} IS NULL`);
          add({ sql: ors.length ? `(${ors.join(' OR ')})` : 'FALSE', params: vals, exact: true });
        } else {
          const notIn = vals.length ? `${ref} NOT IN (${vals.map(() => '?').join(', ')})` : null;
          if (hasNull) add({ sql: notIn ? `(${ref} IS NOT NULL AND ${notIn})` : `${ref} IS NOT NULL`, params: vals, exact: true });
          else add({ sql: notIn ? `(${ref} IS NULL OR ${notIn})` : null, params: vals, exact: true });
        }
        break;
      }
      case '$gt': case '$gte': case '$lt': case '$lte': {
        const k = kindOf(v);
        if (k === 'null' || k === 'regex' || k === 'array' || k === 'object') { exact = false; break; }
        const p = param(col, v);
        if (!p.ok) { exact = false; break; }
        const sym = { $gt: '>', $gte: '>=', $lt: '<', $lte: '<=' }[op];
        add({ sql: `${ref} ${sym} ?`, params: [p.value], exact: true });
        break;
      }
      case '$exists':
        // missing and null are both NULL in SQL: `$exists: false` narrows safely, `true` is checked in JS
        if (!v) add({ sql: `${ref} IS NULL`, params: [], exact: false });
        else exact = false;
        break;
      default:
        exact = false; // $regex, $options, $not, $type, $size, $all, $elemMatch, $mod ... checked in JS
    }
  }
  return { sql: parts.length ? parts.join(' AND ') : null, params, exact };
}

function listCondition(col, ref, cond) {
  if (!isPlainList(col)) return LOOSE;
  const member = (v) => {
    const p = listItemParam(col, v);
    if (!p.ok) return LOOSE;
    return { sql: `? MEMBER OF(${ref})`, params: [p.value], exact: true };
  };
  if (!isOperatorObject(cond)) {
    const k = kindOf(cond);
    if (k === 'null' || k === 'array' || k === 'object' || k === 'regex') return LOOSE;
    return member(cond);
  }
  const parts = [];
  const params = [];
  let exact = true;
  for (const [op, v] of Object.entries(cond)) {
    if (op === '$eq') {
      const r = member(v);
      if (r.sql) { parts.push(r.sql); params.push(...r.params); }
      exact = exact && r.exact;
    } else if (op === '$in' && Array.isArray(v) && v.length) {
      const items = [];
      let ok = true;
      for (const x of v) { const p = listItemParam(col, x); if (!p.ok) { ok = false; break; } items.push(p.value); }
      if (!ok) { exact = false; continue; }
      parts.push(`JSON_OVERLAPS(${ref}, CAST(? AS JSON))`);
      params.push(JSON.stringify(items));
    } else if (op === '$all' && Array.isArray(v) && v.length) {
      const items = [];
      let ok = true;
      for (const x of v) { const p = listItemParam(col, x); if (!p.ok) { ok = false; break; } items.push(p.value); }
      if (!ok) { exact = false; continue; }
      parts.push(`JSON_CONTAINS(${ref}, CAST(? AS JSON))`);
      params.push(JSON.stringify(items));
    } else {
      exact = false;
    }
  }
  return { sql: parts.length ? parts.join(' AND ') : null, params, exact };
}

// Positive conditions only: a negation on a list-of-objects field has "no element matches" semantics
function isPositive(cond) {
  if (!isOperatorObject(cond)) return kindOf(cond) !== 'null';
  return Object.entries(cond).every(([op, v]) => ['$eq', '$in', '$gt', '$gte', '$lt', '$lte'].includes(op) && kindOf(v) !== 'null'
    && !(op === '$in' && Array.isArray(v) && v.some((x) => kindOf(x) === 'null')));
}

let aliasSeq = 0;

function fieldCondition(table, alias, path, cond) {
  const col = table.colByPath.get(path);
  if (col && col.mode !== 'extra') {
    const ref = `${alias}.${q(col.name)}`;
    if (col.mode === 'json') return listCondition(col, ref, cond);
    if (col.mode === 'vector' || col.mode === 'Buffer') return LOOSE;
    return scalarCondition(col, ref, cond);
  }
  // A field inside a list of objects: EXISTS on the child table
  for (const sub of table.children) {
    const prefix = sub.sourcePath.join('.');
    if (path === prefix) return LOOSE;
    if (!path.startsWith(`${prefix}.`)) continue;
    const rest = path.slice(prefix.length + 1);
    if (/^\d+(\.|$)/.test(rest) || !isPositive(cond)) return LOOSE;
    const a = `c${++aliasSeq}`;
    const inner = fieldCondition(sub, a, rest, cond);
    if (!inner.sql) return LOOSE;
    return {
      sql: `EXISTS (SELECT 1 FROM ${q(sub.name)} ${a} WHERE ${a}.\`parent_id\` = ${alias}.\`id\` AND ${inner.sql})`,
      params: inner.params,
      exact: inner.exact
    };
  }
  return LOOSE;
}

export function compileFilter(table, filter, alias = 't') {
  if (!filter || kindOf(filter) !== 'object') return TRUE;
  const parts = [];
  const params = [];
  let exact = true;
  const add = (r) => { if (r.sql) { parts.push(r.sql); params.push(...r.params); } exact = exact && r.exact; };

  for (const [key, cond] of Object.entries(filter)) {
    if (key === '$and') {
      if (!Array.isArray(cond)) { exact = false; continue; }
      for (const sub of cond) add(compileFilter(table, sub, alias));
    } else if (key === '$or') {
      if (!Array.isArray(cond) || !cond.length) { exact = false; continue; }
      const branches = cond.map((sub) => compileFilter(table, sub, alias));
      if (branches.every((b) => b.exact)) {
        if (branches.some((b) => !b.sql)) continue; // one branch is always true
        add({ sql: `(${branches.map((b) => `(${b.sql})`).join(' OR ')})`, params: branches.flatMap((b) => b.params), exact: true });
      } else if (branches.every((b) => b.sql)) {
        // each branch is a superset, so their OR is too
        add({ sql: `(${branches.map((b) => `(${b.sql})`).join(' OR ')})`, params: branches.flatMap((b) => b.params), exact: false });
      } else {
        exact = false;
      }
    } else if (key.startsWith('$')) {
      exact = false; // $nor, $expr, $where, $text, $comment
    } else {
      add(fieldCondition(table, alias, key, cond));
    }
  }
  return { sql: parts.length ? parts.join(' AND ') : null, params, exact };
}

export function normalizeSort(sort) {
  if (!sort) return null;
  if (typeof sort === 'string') {
    const out = {};
    for (const part of sort.split(/\s+/).filter(Boolean)) out[part.replace(/^-/, '')] = part.startsWith('-') ? -1 : 1;
    return out;
  }
  if (sort instanceof Map) return Object.fromEntries(sort);
  if (Array.isArray(sort)) {
    if (sort.length === 2 && typeof sort[0] === 'string' && !Array.isArray(sort[1])) return { [sort[0]]: sort[1] };
    return Object.fromEntries(sort.map((s) => (Array.isArray(s) ? s : [s, 1])));
  }
  return sort;
}

const dir = (v) => (v === -1 || v === '-1' || v === 'desc' || v === 'descending' ? -1 : 1);

// Returns an ORDER BY clause, or null when the sort cannot run in SQL (then sort in JS)
export function compileSort(table, sort, alias = 't') {
  const s = normalizeSort(sort);
  const keys = s ? Object.keys(s) : [];
  const parts = [];
  for (const k of keys) {
    const col = table.colByPath.get(k);
    if (!col || !SCALAR_SQL.test(col.type) || col.mode === 'json') return null;
    if (typeof s[k] === 'object') return null; // $meta
    parts.push(`${alias}.${q(col.name)} ${dir(s[k]) === -1 ? 'DESC' : 'ASC'}`);
  }
  if (!keys.includes('_id')) parts.push(`${alias}.\`id\` ASC`);
  return parts.join(', ');
}

export function matcher(filter) {
  if (!filter || !Object.keys(filter).length) return () => true;
  const query = new Query(filter, { useStrictMode: true });
  return (doc) => query.test(doc);
}

export function jsSort(docs, sort) {
  const s = normalizeSort(sort);
  if (!s || !Object.keys(s).length) return docs;
  return new Aggregator([{ $sort: Object.fromEntries(Object.entries(s).map(([k, v]) => [k, dir(v)])) }]).run(docs);
}

// ─── projection ─────────────────────────────────────────────────────────────
// Returns the part of `src` on path `segs`, keeping its shape: pick({a:{b:1,c:2}}, ['a','b']) -> {a:{b:1}}.
// Lists are projected element by element, like MongoDB.
function pick(src, segs) {
  if (Array.isArray(src)) return src.filter((x) => kindOf(x) === 'object').map((x) => pick(x, segs) ?? {});
  if (kindOf(src) !== 'object') return undefined;
  const [head, ...rest] = segs;
  if (!(head in src)) return undefined;
  if (!rest.length) return { [head]: src[head] };
  const inner = pick(src[head], rest);
  return inner === undefined ? undefined : { [head]: inner };
}

function mergeInto(target, part) {
  for (const [k, v] of Object.entries(part)) {
    if (kindOf(v) === 'object' && kindOf(target[k]) === 'object') mergeInto(target[k], v);
    else if (Array.isArray(v) && Array.isArray(target[k])) target[k] = target[k].map((x, i) => (kindOf(x) === 'object' && kindOf(v[i]) === 'object' ? mergeInto(x, v[i]) : x));
    else target[k] = v;
  }
  return target;
}

function drop(obj, segs) {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) { obj.forEach((x) => drop(x, segs)); return; }
  if (kindOf(obj) !== 'object') return;
  const [head, ...rest] = segs;
  if (!rest.length) { delete obj[head]; return; }
  drop(obj[head], rest);
}

export function projectionInfo(projection) {
  if (!projection || kindOf(projection) !== 'object') return null;
  const entries = Object.entries(projection);
  if (!entries.length) return null;
  if (entries.some(([, v]) => kindOf(v) === 'object' || typeof v === 'string')) return { mode: 'mingo', projection };
  const nonId = entries.filter(([k]) => k !== '_id');
  const inclusion = nonId.length ? nonId.some(([, v]) => v === 1 || v === true) : false;
  const idOff = projection._id === 0 || projection._id === false;
  return {
    mode: inclusion ? 'include' : 'exclude',
    paths: (inclusion ? nonId.filter(([, v]) => v) : entries.filter(([, v]) => !v)).map(([k]) => k),
    idOff
  };
}

export function applyProjection(docs, info) {
  if (!info) return docs;
  if (info.mode === 'mingo') return new Query({}).find(docs, info.projection).all();
  if (info.mode === 'exclude') {
    for (const d of docs) for (const p of info.paths) drop(d, p.split('.'));
    return docs;
  }
  return docs.map((d) => {
    const out = {};
    if (!info.idOff && d._id !== undefined) out._id = d._id;
    for (const p of info.paths) {
      const part = pick(d, p.split('.'));
      if (part !== undefined) mergeInto(out, part);
    }
    return out;
  });
}

// Child tables a projection makes unnecessary (e.g. `-embeddings` skips the vector tables)
export function skippedTables(root, info) {
  const skip = new Set();
  if (!info || info.mode === 'mingo') return skip;
  const walk = (t) => {
    for (const sub of t.children) {
      const full = fullSourcePath(sub);
      const needed = info.mode === 'exclude'
        ? !info.paths.some((p) => full === p || full.startsWith(`${p}.`))
        : info.paths.some((p) => full === p || full.startsWith(`${p}.`) || p.startsWith(`${full}.`));
      if (!needed) { for (const x of [sub, ...descendants(sub)]) skip.add(x.name); } else walk(sub);
    }
  };
  walk(root);
  return skip;
}

function descendants(t) {
  return t.children.flatMap((c) => [c, ...descendants(c)]);
}

export function fullSourcePath(t) {
  const segs = [];
  for (let cur = t; cur && cur.sourcePath; cur = cur.parentTable) segs.unshift(...cur.sourcePath);
  return segs.join('.');
}

export { getPath };

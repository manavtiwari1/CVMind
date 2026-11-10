// Applies MongoDB update documents in JS (via mingo), and builds the new document for upserts.
import { update as mingoUpdate, Query } from 'mingo';
import mongoose from 'mongoose';
import { kindOf, getPath, setPath, toPlainValue } from './codec.js';

const { ObjectId } = mongoose.mongo.BSON;
const OPTS = { cloneMode: 'none' };

export function isOperatorUpdate(update) {
  return kindOf(update) === 'object' && Object.keys(update).some((k) => k.startsWith('$'));
}

// Mutates `doc`. Returns true when something changed.
export function applyUpdate(doc, rawUpdate, { isInsert = false, filter, arrayFilters } = {}) {
  const update = toPlainValue(rawUpdate);
  if (Array.isArray(update)) {
    const err = new Error('Aggregation-pipeline updates are not supported on TiDB; use update operators');
    err.code = 'TIDB_UNSUPPORTED';
    throw err;
  }
  if (!isOperatorUpdate(update)) {
    // replacement document: keep _id
    const id = doc._id;
    for (const k of Object.keys(doc)) delete doc[k];
    Object.assign(doc, update, { _id: id });
    return true;
  }
  const { $setOnInsert, ...ops } = update;
  // MongoDB de-duplicates `$addToSet: {$each}` even when the field did not exist; mingo needs an empty list to do so
  if (ops.$addToSet) {
    for (const path of Object.keys(ops.$addToSet)) {
      if (getPath(doc, path.split('.')) === undefined) setPath(doc, path.split('.'), []);
    }
  }
  let changed = false;
  if (Object.keys(ops).length) {
    const resolved = positionalCondition(ops, filter) ? resolvePositional(doc, ops, filter) : ops;
    const paths = mingoUpdate(doc, resolved, arrayFilters || [], undefined, OPTS);
    changed = paths.length > 0;
  }
  if (isInsert && $setOnInsert && Object.keys($setOnInsert).length) {
    mingoUpdate(doc, { $set: $setOnInsert }, [], undefined, OPTS);
    changed = true;
  }
  return changed;
}

// The positional `$` operator needs the query that matched the array element
function positionalCondition(ops, filter) {
  const usesPositional = Object.values(ops).some((o) => kindOf(o) === 'object' && Object.keys(o).some((p) => /\.\$(\.|$)/.test(p)));
  return usesPositional ? filter : undefined;
}

// Index of the first element of doc[arrayPath] that the filter's conditions on that list match (MongoDB's `$`)
function matchedIndex(doc, arrayPath, filter) {
  const arr = getPath(doc, arrayPath.split('.'));
  if (!Array.isArray(arr) || kindOf(filter) !== 'object') return -1;
  const conds = {};
  const collect = (f) => {
    for (const [k, v] of Object.entries(f || {})) {
      if (k === '$and' && Array.isArray(v)) v.forEach(collect);
      else if (k === arrayPath && kindOf(v) === 'object' && v.$elemMatch) Object.assign(conds, v.$elemMatch);
      else if (k.startsWith(`${arrayPath}.`)) conds[k.slice(arrayPath.length + 1)] = v;
    }
  };
  collect(filter);
  if (!Object.keys(conds).length) return -1;
  const q = new Query(conds);
  return arr.findIndex((el) => kindOf(el) === 'object' && q.test(el));
}

// Rewrites `list.$.field` paths to `list.<index>.field`. mingo rejects several `$` paths in one update
// as conflicting, while MongoDB allows them.
function resolvePositional(doc, ops, filter) {
  const out = {};
  for (const [op, spec] of Object.entries(ops)) {
    if (kindOf(spec) !== 'object') { out[op] = spec; continue; }
    out[op] = {};
    for (const [p, v] of Object.entries(spec)) {
      const m = /^(.+?)\.\$(\.|$)(.*)$/.exec(p);
      if (!m) { out[op][p] = v; continue; }
      const idx = matchedIndex(doc, m[1], filter);
      if (idx < 0) {
        const err = new Error(`The positional operator did not find the match needed from the query for ${p}`);
        err.code = 2;
        throw err;
      }
      out[op][`${m[1]}.${idx}${m[3] ? `.${m[3]}` : ''}`] = v;
    }
  }
  return out;
}

// Equality conditions in a filter become fields of a document created by an upsert (like MongoDB)
export function seedFromFilter(filter, out = {}) {
  if (kindOf(filter) !== 'object') return out;
  for (const [k, v] of Object.entries(filter)) {
    if (k === '$and' && Array.isArray(v)) { for (const sub of v) seedFromFilter(sub, out); continue; }
    if (k.startsWith('$')) continue;
    const kind = kindOf(v);
    if (kind === 'object' && Object.keys(v).length && Object.keys(v).every((x) => x.startsWith('$'))) {
      if ('$eq' in v) setPath(out, k.split('.'), v.$eq);
      continue;
    }
    if (kind === 'regex') continue;
    setPath(out, k.split('.'), v);
  }
  return out;
}

export function newDocForUpsert(filter, update, arrayFilters) {
  const doc = seedFromFilter(filter);
  applyUpdate(doc, update, { isInsert: true, filter, arrayFilters });
  if (doc._id === undefined) doc._id = new ObjectId();
  return doc;
}

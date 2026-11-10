// Loads every Mongoose model without connecting to MongoDB and writes their shapes to schema-dump.json.
// Read-only: it never opens a database connection.
process.env.MONGODB_URI = '';
process.env.INLINE_WORKERS = 'false';

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mongoose from 'mongoose';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const modelFiles = fs.readFileSync(path.join(here, 'model-files.txt'), 'utf8')
  .split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

const failed = [];
for (const rel of modelFiles) {
  try {
    await import(pathToFileURL(path.join(root, rel)).href);
  } catch (err) {
    failed.push({ file: rel, error: err.message });
  }
}

function describeType(st) {
  const out = { instance: st.instance };
  const o = st.options || {};
  for (const k of ['required', 'unique', 'index', 'sparse', 'ref', 'maxlength', 'minlength', 'min', 'max', 'lowercase', 'trim', 'select']) {
    if (o[k] !== undefined && typeof o[k] !== 'function') out[k] = o[k];
  }
  if (Array.isArray(o.enum)) out.enum = o.enum;
  else if (o.enum && Array.isArray(o.enum.values)) out.enum = o.enum.values;
  if (o.default !== undefined) out.default = typeof o.default === 'function' ? '[fn]' : o.default;
  return out;
}

function describeSchema(schema) {
  const fields = {};
  schema.eachPath((p, st) => {
    const d = describeType(st);
    if (st.instance === 'Array') {
      if (st.schema) {
        d.items = { instance: 'Subdocument', fields: describeSchema(st.schema) };
      } else {
        const caster = st.embeddedSchemaType || st.caster;
        d.items = caster ? describeType(caster) : { instance: 'Mixed' };
        if (caster?.instance === 'Array') {
          const inner = caster.embeddedSchemaType || caster.caster;
          d.items.items = inner ? describeType(inner) : { instance: 'Mixed' };
        }
      }
    } else if (st.instance === 'Embedded' && st.schema) {
      d.fields = describeSchema(st.schema);
    } else if (st.instance === 'Map') {
      const v = st.$__schemaType;
      d.values = v ? describeType(v) : { instance: 'Mixed' };
    }
    fields[p] = d;
  });
  return fields;
}

const models = {};
for (const name of Object.keys(mongoose.models).sort()) {
  const m = mongoose.models[name];
  models[name] = {
    collection: m.collection.collectionName,
    timestamps: !!m.schema.options.timestamps,
    strict: m.schema.options.strict,
    fields: describeSchema(m.schema),
    indexes: m.schema.indexes()
  };
}

fs.writeFileSync(path.join(here, 'schema-dump.json'), JSON.stringify({ models, failed }, null, 2));
console.log(`models: ${Object.keys(models).length}, failed files: ${failed.length}`);
for (const f of failed) console.log('  FAILED', f.file, '-', f.error);
process.exit(0);

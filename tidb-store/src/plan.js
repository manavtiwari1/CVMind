// Loads schema/plan.json (written by db-migration/plan.mjs) and indexes it for lookups.
import fs from 'fs';
import { createRequire } from 'module';
import { allTables } from './codec.js';

// require() so serverless bundlers (Vercel) always ship plan.json with the function
const require = createRequire(import.meta.url);
let cached = null;

export function loadPlan(file) {
  if (cached && !file) return cached;
  const raw = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : require('../schema/plan.json');
  const byCollection = new Map();
  const byTable = new Map();

  for (const root of raw.tables) {
    for (const t of allTables(root)) {
      byTable.set(t.name, t);
      t.colByPath = new Map();
      t.colByName = new Map();
      for (const c of t.columns) {
        t.colByName.set(c.name, c);
        if (c.path) t.colByPath.set(c.path.join('.'), c);
      }
      for (const sub of t.children) sub.parentTable = t;
    }
    byCollection.set(root.collection, root);
  }

  const plan = { generatedAt: raw.generatedAt, roots: raw.tables, byCollection, byTable };
  if (!file) cached = plan;
  return plan;
}

export function columnList(table, alias = 't', skipColumns = null) {
  return table.columns
    .filter((c) => c.mode !== 'generated' && (!skipColumns || !skipColumns.has(c.name)))
    .map((c) => (c.type.startsWith('VECTOR') ? `CAST(${alias}.\`${c.name}\` AS CHAR) AS \`${c.name}\`` : `${alias}.\`${c.name}\``))
    .join(', ');
}

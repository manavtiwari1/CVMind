# MongoDB → TiDB copy

One-off copy of CVMind's MongoDB data into structured TiDB (MySQL-compatible) tables, with vector search on the embeddings.

- **MongoDB is only read.** The scripts call `listCollections`, `countDocuments` and `find` and nothing else. The connection is named `cvmind-migration-readonly` with a pool of 2.
- **The app is not changed.** The site still runs on MongoDB until its code is moved over.
- In TiDB, only the tables in `plan.json` are created, or dropped and recreated with `--fresh`.

## Setup

Add the TiDB connection string to `backend/.env` (TiDB Cloud → your instance → **Connect**):

```
TIDB_DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/cvmind
```

## Steps

```
cd db-migration
npm install
npm run introspect   # Mongoose models -> schema-dump.json (no DB connection)
npm run scan         # reads MongoDB -> data-profile.json (field types, lengths; no values)
npm run plan         # -> plan.json + schema.sql (review this)
npm run copy:dry     # maps every document without TiDB; must end with 0 errors, 0 left out
npm run copy         # creates tables, copies data, adds vector indexes  (--fresh to redo)
npm run verify       # compares every row and value with MongoDB
```

Re-run `scan` and `plan` if models or data change before the copy.

## How documents become tables

| MongoDB | TiDB |
|---|---|
| collection | table (same name, snake_case) |
| `_id` | `id` VARCHAR(24) primary key |
| nested object `contact.email` | column `contact__email` |
| list of objects (checklist, messages, bullets) | child table `parent__field` with `id`, `parent_id` (FK, ON DELETE CASCADE), `position` |
| list of plain values, Mixed, Map | JSON column (string/id lists keep a multi-valued index where Mongo had one) |
| embedding vector (Float32 × 768) | `VECTOR(768)` + HNSW cosine index |
| GridFS (`resumeFiles.files/chunks`) | `resume_files_files` + `resume_files_chunks` (LONGBLOB) |
| TTL index | TiDB TTL, created **OFF** |

## At cutover (when the app moves to TiDB)

1. Run `copy --fresh` and `verify` again for the latest data.
2. Turn TTL on for each TTL table: `ALTER TABLE <t> TTL_ENABLE = 'ON';` (list: `grep -n TTL schema.sql`).
3. Four Mongo unique indexes with filters became plain indexes (see `plan.json` → notes). The app must keep enforcing them.

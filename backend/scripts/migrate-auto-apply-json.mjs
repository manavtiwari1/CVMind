// Migrates backend/data/auto_apply_applications.json into MongoDB (AgentApplication + JobPosting + events).
// Dry run by default; pass --apply to write. Re-running skips applications that were already migrated.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { migrateLegacyApplications } from '../src/agent/migrations/legacyApplications.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const legacyFile = path.join(__dirname, '../data/auto_apply_applications.json');
const dryRun = !process.argv.includes('--apply');

if (!fs.existsSync(legacyFile)) {
  console.log('No legacy applications file found; nothing to migrate.');
  process.exit(0);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required.');
  process.exit(1);
}

const legacyApps = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
await mongoose.connect(process.env.MONGODB_URI);

const users = mongoose.connection.db.collection('users');
const userExists = async (id) => mongoose.isValidObjectId(id)
  && Boolean(await users.findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { _id: 1 } }));

const report = await migrateLegacyApplications(Array.isArray(legacyApps) ? legacyApps : [], { dryRun, userExists });
console.log(JSON.stringify({ dryRun, ...report }, null, 2));
if (dryRun) console.log('Dry run only. Re-run with --apply to write these changes.');

await mongoose.disconnect();

// One-time migration for mandatory email verification: accounts that signed up with Google, GitHub or
// LinkedIn are marked verified (the provider confirmed the address); password accounts stay unverified and
// are asked to click a link the next time they use a gated feature.
// Dry run by default; pass --apply to write. Safe to re-run: verified accounts are left alone.
// Updates MongoDB when MONGODB_URI is set, otherwise the local JSON database.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonDbFile = path.join(__dirname, '../data/resumetrics-db.json');
const dryRun = !process.argv.includes('--apply');
const SOCIAL = ['google', 'github', 'linkedin'];

const isSocial = (u) => SOCIAL.includes(u.provider) || (!u.provider && u.isGoogleUser === true);

if (process.env.MONGODB_URI) {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection('users');
  const filter = {
    emailVerified: { $ne: true },
    $or: [{ provider: { $in: SOCIAL } }, { provider: { $in: ['', null] }, isGoogleUser: true }]
  };
  const toVerify = await users.countDocuments(filter);
  const passwordUnverified = await users.countDocuments({ emailVerified: { $ne: true }, $nor: filter.$or });
  if (!dryRun) await users.updateMany(filter, { $set: { emailVerified: true, emailVerifiedAt: new Date() } });
  console.log(JSON.stringify({ dryRun, store: 'mongodb', socialAccountsVerified: toVerify, passwordAccountsLeftUnverified: passwordUnverified }, null, 2));
  await mongoose.disconnect();
} else if (fs.existsSync(jsonDbFile)) {
  const db = JSON.parse(fs.readFileSync(jsonDbFile, 'utf8'));
  const pending = (db.users || []).filter((u) => !u.emailVerified);
  const social = pending.filter(isSocial);
  if (!dryRun) {
    const now = new Date().toISOString();
    for (const u of social) { u.emailVerified = true; u.emailVerifiedAt = now; }
    fs.writeFileSync(jsonDbFile, JSON.stringify(db, null, 2));
  }
  console.log(JSON.stringify({ dryRun, store: 'json', socialAccountsVerified: social.length, passwordAccountsLeftUnverified: pending.length - social.length }, null, 2));
} else {
  console.log('No MONGODB_URI and no local JSON database; nothing to migrate.');
}
if (dryRun) console.log('Dry run only. Re-run with --apply to write these changes.');

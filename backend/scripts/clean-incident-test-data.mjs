// Safe cleanup script for the 24 Nov incident test artifacts.
// Run with --dry-run first to inspect matches:
//   node scripts/clean-incident-test-data.mjs --dry-run
// Run with --execute to perform the deletion:
//   node scripts/clean-incident-test-data.mjs --execute

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase, databaseDriver } from '@cvmind/tidb-store';
import { AdminUser } from '../src/admin/models.js';
import { TeamAnnouncement } from '../src/admin/team/models.js';
import { CollegeTemplate } from '../src/college/models.js';

dotenv.config();

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

console.log(`=== CV Mind Incident Test Data Cleanup ===`);
console.log(`Mode: ${isDryRun ? 'DRY RUN (no data will be deleted)' : 'LIVE EXECUTION (deleting matches)'}`);
console.log(`Database Driver: ${databaseDriver() || 'default'}`);

await connectDatabase(mongoose);
console.log(`Connected to database.\n`);

// 1. Clean 22 test admin accounts created with @cvmind.test or 'owner'
const adminFilter = {
  $or: [
    { email: { $regex: /@cvmind\.test$/i } },
    { email: { $regex: /@example\.com$/i } },
    { username: 'owner' }
  ]
};
const testAdmins = await AdminUser.find(adminFilter).select('_id username email role createdAt');
console.log(`[1] Found ${testAdmins.length} test Admin accounts:`);
testAdmins.forEach(a => console.log(`  - ${a.username} (${a.email}) [${a.role}] created ${a.createdAt}`));

// 2. Clean fake college templates
const templateFilter = {
  name: { $in: ['XYZ University', 'ABC College', 'Sample College', 'Test University'] }
};
const testTemplates = await CollegeTemplate.find(templateFilter).select('_id name collegeId');
console.log(`\n[2] Found ${testTemplates.length} fake College templates:`);
testTemplates.forEach(t => console.log(`  - ${t.name}`));

// 3. Clean fake team announcements
const announcementFilter = {
  title: { $regex: /diwali/i }
};
const testAnnouncements = await TeamAnnouncement.find(announcementFilter).select('_id title createdAt');
console.log(`\n[3] Found ${testAnnouncements.length} test Announcements:`);
testAnnouncements.forEach(an => console.log(`  - ${an.title}`));

// 4. Clean fake users (User model in db.js)
const userSchema = new mongoose.Schema({
  email: String,
  banned: Boolean,
  name: String,
  createdAt: Date
}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const KNOWN_TEST_EMAILS = [
  'riya@gmail.com',
  'kabir@gmail.com',
  'stranger@gmail.com',
  'nobody@gmail.com'
];
const userFilter = {
  $or: [
    { email: { $regex: /@cvmind\.test$/i } },
    { email: { $regex: /@example\.com$/i } },
    { email: { $in: KNOWN_TEST_EMAILS }, banned: true }
  ]
};
const testUsers = await User.find(userFilter).select('_id email name banned createdAt');
console.log(`\n[4] Found ${testUsers.length} test Users:`);
testUsers.slice(0, 15).forEach(u => console.log(`  - ${u.email} (banned: ${u.banned})`));
if (testUsers.length > 15) console.log(`  ... and ${testUsers.length - 15} more`);

if (isDryRun) {
  console.log(`\n[DRY RUN COMPLETE] To delete these entries, run:`);
  console.log(`  node scripts/clean-incident-test-data.mjs --execute\n`);
  process.exit(0);
}

// EXECUTE DELETION
console.log(`\nExecuting deletion...`);
if (testAdmins.length > 0) {
  const res = await AdminUser.deleteMany(adminFilter);
  console.log(`✓ Deleted ${res.deletedCount} Admin accounts.`);
}
if (testTemplates.length > 0) {
  const res = await CollegeTemplate.deleteMany(templateFilter);
  console.log(`✓ Deleted ${res.deletedCount} fake College templates.`);
}
if (testAnnouncements.length > 0) {
  const res = await TeamAnnouncement.deleteMany(announcementFilter);
  console.log(`✓ Deleted ${res.deletedCount} fake Announcements.`);
}
if (testUsers.length > 0) {
  const res = await User.deleteMany(userFilter);
  console.log(`✓ Deleted ${res.deletedCount} test Users.`);
}

console.log(`\n=== Cleanup Complete! ===\n`);
process.exit(0);

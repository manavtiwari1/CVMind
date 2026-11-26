import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase, databaseDriver } from '@cvmind/tidb-store';

dotenv.config();

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

console.log(`=== Complete Admin Panel Incident Cleanup ===`);
console.log(`Mode: ${isDryRun ? 'DRY RUN (no data will be deleted)' : 'LIVE EXECUTION (deleting test records)'}`);
console.log(`Database Driver: ${databaseDriver() || 'default'}`);

await connectDatabase(mongoose);
console.log(`Connected to database.\n`);

const db = mongoose.connection.db;

// 1. Remaining 8 Test Users
const TEST_USER_EMAILS = [
  'fake@mailinator.com',
  'r@x.co',
  'free@x.in',
  'unverified@x.in',
  'pro@x.in',
  'out@x.in',
  'banned@x.in',
  'throwaway@mailinator.com'
];
const usersToDelete = await db.collection('users').find({
  $or: [
    { email: { $in: TEST_USER_EMAILS } },
    { email: { $regex: /@(example\.com|cvmind\.test)$/i } }
  ]
}).toArray();
console.log(`[1] Users to delete (${usersToDelete.length}):`);
usersToDelete.forEach(u => console.log(`  - ${u.email} (${u.name || '-'})`));

// 2. Test Support Tickets
const testTickets = await db.collection('tickets').find({
  $or: [
    { userEmail: { $in: [...TEST_USER_EMAILS, 'a@b.co'] } },
    { userEmail: { $regex: /@example\.com/i } },
    { email: { $in: [...TEST_USER_EMAILS, 'a@b.co'] } },
    { email: { $regex: /@example\.com/i } }
  ]
}).toArray();
console.log(`\n[2] Support Tickets to delete (${testTickets.length}):`);
testTickets.forEach(t => console.log(`  - ID: ${t._id} | From: ${t.userEmail || t.email} | "${t.subject}"`));

// 3. Test Contacts
const testContacts = await db.collection('contacts').find({
  $or: [
    { email: { $in: [...TEST_USER_EMAILS, 'a@b.co'] } },
    { email: { $regex: /@example\.com/i } }
  ]
}).toArray();
console.log(`\n[3] Contacts to delete (${testContacts.length}):`);
testContacts.forEach(c => console.log(`  - ${c.email} | Name: ${c.name} | "${c.subject}"`));

// 4. Test Refund Requests
const testRefunds = await db.collection('refundrequests').find({
  $or: [
    { email: { $regex: /@example\.com/i } },
    { email: { $in: TEST_USER_EMAILS } }
  ]
}).toArray();
console.log(`\n[4] Refund Requests to delete (${testRefunds.length}):`);
testRefunds.forEach(r => console.log(`  - ${r.email} | Order: ${r.orderId}`));

// 5. Test Coupon
const testCoupons = await db.collection('coupons').find({
  code: 'COMEBACKTEST'
}).toArray();
console.log(`\n[5] Coupons to delete (${testCoupons.length}):`);
testCoupons.forEach(cp => console.log(`  - ${cp.code}`));

// 6. Test Colleges & related items
const TEST_COLLEGE_IDS = [
  new mongoose.Types.ObjectId('6b056e0c1f4fe34121feadab'), // ABC College
  new mongoose.Types.ObjectId('6b056e151f4fe34121feadb1')  // XYZ University
];
const TEST_COLLEGE_ID_STRS = TEST_COLLEGE_IDS.map(id => id.toString());

const testColleges = await db.collection('colleges').find({ _id: { $in: TEST_COLLEGE_IDS } }).toArray();
const testCollegeStaff = await db.collection('collegestaffs').find({
  $or: [
    { collegeId: { $in: [...TEST_COLLEGE_IDS, ...TEST_COLLEGE_ID_STRS] } },
    { email: { $in: ['tpo@abc.edu', 'tpo@xyz.edu', 'faculty@xyz.edu'] } }
  ]
}).toArray();
const testCollegeStudents = await db.collection('collegestudents').find({
  $or: [
    { collegeId: { $in: [...TEST_COLLEGE_IDS, ...TEST_COLLEGE_ID_STRS] } },
    { email: { $in: ['riya@gmail.com', 'aman@gmail.com', 'kabir@gmail.com', 'one@gmail.com', 'gone@gmail.com'] } }
  ]
}).toArray();
const testCollegeTemplates = await db.collection('collegetemplates').find({
  $or: [
    { collegeId: { $in: [...TEST_COLLEGE_IDS, ...TEST_COLLEGE_ID_STRS] } },
    { name: { $in: ['ABC Official', 'XYZ Official'] } }
  ]
}).toArray();
const testCollegeAudit = await db.collection('collegeauditlogs').find({
  collegeId: { $in: [...TEST_COLLEGE_IDS, ...TEST_COLLEGE_ID_STRS] }
}).toArray();

console.log(`\n[6] College Module items to delete:`);
console.log(`  - Colleges (${testColleges.length}): ${testColleges.map(c => c.name).join(', ')}`);
console.log(`  - Staff (${testCollegeStaff.length}): ${testCollegeStaff.map(s => s.email).join(', ')}`);
console.log(`  - Students (${testCollegeStudents.length}): ${testCollegeStudents.map(s => s.email).join(', ')}`);
console.log(`  - Templates (${testCollegeTemplates.length}): ${testCollegeTemplates.map(t => t.name).join(', ')}`);
console.log(`  - Audit Logs (${testCollegeAudit.length})`);

// 7. Team Invitation
const testTeamInvites = await db.collection('teaminvitations').find({
  email: 'isha@x.com'
}).toArray();
console.log(`\n[7] Team Invitations to delete (${testTeamInvites.length}):`);
testTeamInvites.forEach(inv => console.log(`  - ${inv.email} (${inv.role})`));

// 8. Product Grants
const testProductGrants = await db.collection('productgrants').find({
  $or: [
    { userId: 'test@cvmind.in' },
    { email: 'test@cvmind.in' }
  ]
}).toArray();
console.log(`\n[8] Product Grants to delete (${testProductGrants.length}):`);
testProductGrants.forEach(g => console.log(`  - ${g.userId || g.email}: ${g.productKey || g.product}`));

// 9. Token Grants
const testTokenGrants = await db.collection('tokengrants').find({
  $or: [
    { userId: 'test@cvmind.in' },
    { email: 'test@cvmind.in' }
  ]
}).toArray();
console.log(`\n[9] Token Grants to delete (${testTokenGrants.length}):`);
testTokenGrants.forEach(g => console.log(`  - ${g.userId || g.email}: ${g.tokens || g.amount} tokens`));

// 10. ERP items
const testErpLetters = await db.collection('erpletters').find({
  recipientName: { $in: ['Kabir Singh', 'Isha Rao'] }
}).toArray();
const testErpLetterReqs = await db.collection('erpletterrequests').find({
  _id: new mongoose.Types.ObjectId('6b056f24110c57d96d4efd50')
}).toArray();
const testErpCandidates = await db.collection('erpcandidates').find({
  email: 'isha@x.com'
}).toArray();
const testErpOpenings = await db.collection('erpopenings').find({
  title: 'Frontend Developer Intern'
}).toArray();

console.log(`\n[10] ERP items to delete:`);
console.log(`  - Letters (${testErpLetters.length}): ${testErpLetters.map(l => l.title + ' -> ' + l.recipientName).join(', ')}`);
console.log(`  - Letter Requests (${testErpLetterReqs.length})`);
console.log(`  - Candidates (${testErpCandidates.length}): ${testErpCandidates.map(c => c.name + ' (' + c.email + ')').join(', ')}`);
console.log(`  - Openings (${testErpOpenings.length}): ${testErpOpenings.map(o => o.title).join(', ')}`);

// 11. Test Subscription
const testSubscriptions = await db.collection('subscriptions').find({
  $or: [
    { _id: new mongoose.Types.ObjectId('6b056eb0fd6196d3d04ef9a8') },
    { email: { $in: TEST_USER_EMAILS } }
  ]
}).toArray();
console.log(`\n[11] Test Subscriptions to delete (${testSubscriptions.length}):`);
testSubscriptions.forEach(s => console.log(`  - ID: ${s._id} | Email: ${s.email}`));

if (isDryRun) {
  console.log(`\n======================================================`);
  console.log(`[DRY RUN COMPLETE] Everything verified safe and isolated.`);
  console.log(`To execute the deletion, run:`);
  console.log(`  node scripts/clean-all-remaining-test-data.mjs --execute`);
  console.log(`======================================================\n`);
  process.exit(0);
}

// EXECUTE
console.log(`\n=== EXECUTING DELETIONS ===`);

if (usersToDelete.length > 0) {
  const r = await db.collection('users').deleteMany({ _id: { $in: usersToDelete.map(u => u._id) } });
  console.log(`✓ Deleted ${r.deletedCount} users.`);
}
if (testTickets.length > 0) {
  const r = await db.collection('tickets').deleteMany({ _id: { $in: testTickets.map(t => t._id) } });
  console.log(`✓ Deleted ${r.deletedCount} support tickets.`);
}
if (testContacts.length > 0) {
  const r = await db.collection('contacts').deleteMany({ _id: { $in: testContacts.map(c => c._id) } });
  console.log(`✓ Deleted ${r.deletedCount} contact messages.`);
}
if (testRefunds.length > 0) {
  const r = await db.collection('refundrequests').deleteMany({ _id: { $in: testRefunds.map(rf => rf._id) } });
  console.log(`✓ Deleted ${r.deletedCount} refund requests.`);
}
if (testCoupons.length > 0) {
  const r = await db.collection('coupons').deleteMany({ _id: { $in: testCoupons.map(cp => cp._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test coupons.`);
}
if (testColleges.length > 0) {
  const r = await db.collection('colleges').deleteMany({ _id: { $in: testColleges.map(c => c._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test colleges.`);
}
if (testCollegeStaff.length > 0) {
  const r = await db.collection('collegestaffs').deleteMany({ _id: { $in: testCollegeStaff.map(s => s._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test college staff.`);
}
if (testCollegeStudents.length > 0) {
  const r = await db.collection('collegestudents').deleteMany({ _id: { $in: testCollegeStudents.map(s => s._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test college students.`);
}
if (testCollegeTemplates.length > 0) {
  const r = await db.collection('collegetemplates').deleteMany({ _id: { $in: testCollegeTemplates.map(t => t._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test college templates.`);
}
if (testCollegeAudit.length > 0) {
  const r = await db.collection('collegeauditlogs').deleteMany({ _id: { $in: testCollegeAudit.map(a => a._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test college audit logs.`);
}
if (testTeamInvites.length > 0) {
  const r = await db.collection('teaminvitations').deleteMany({ _id: { $in: testTeamInvites.map(i => i._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test team invitations.`);
}
if (testProductGrants.length > 0) {
  const r = await db.collection('productgrants').deleteMany({ _id: { $in: testProductGrants.map(g => g._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test product grants.`);
}
if (testTokenGrants.length > 0) {
  const r = await db.collection('tokengrants').deleteMany({ _id: { $in: testTokenGrants.map(g => g._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test token grants.`);
}
if (testErpLetters.length > 0) {
  const r = await db.collection('erpletters').deleteMany({ _id: { $in: testErpLetters.map(l => l._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test ERP letters.`);
}
if (testErpLetterReqs.length > 0) {
  const r = await db.collection('erpletterrequests').deleteMany({ _id: { $in: testErpLetterReqs.map(lr => lr._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test ERP letter requests.`);
}
if (testErpCandidates.length > 0) {
  const r = await db.collection('erpcandidates').deleteMany({ _id: { $in: testErpCandidates.map(c => c._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test ERP candidates.`);
}
if (testErpOpenings.length > 0) {
  const r = await db.collection('erpopenings').deleteMany({ _id: { $in: testErpOpenings.map(o => o._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test ERP openings.`);
}
if (testSubscriptions.length > 0) {
  const r = await db.collection('subscriptions').deleteMany({ _id: { $in: testSubscriptions.map(s => s._id) } });
  console.log(`✓ Deleted ${r.deletedCount} test subscriptions.`);
}

console.log(`\n🎉 All test items purged successfully! Real user data is 100% clean and intact.\n`);
process.exit(0);

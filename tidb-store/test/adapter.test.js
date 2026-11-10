// Integration tests: CVMind's real Mongoose models running on the TiDB test database (cvmind_test).
// Run: node --test tidb-store/test/  (needs TIDB_DATABASE_URL in backend/.env; uses <db>_test only)
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { setupTestDatabase, testDatabaseUrl } from '../scripts/setup-test-db.mjs';

let User;
let TeamTask;
let ResumeProfile;
let gridfs;

before(async () => {
  if (process.env.TIDB_SKIP_SETUP !== '1') await setupTestDatabase({ quiet: true });
  process.env.DATABASE_DRIVER = 'tidb';
  process.env.TIDB_DATABASE_URL = testDatabaseUrl();
  const { connectTidb } = await import('../src/index.js');
  await connectTidb(mongoose);
  await import('../../backend/src/db.js');
  ({ TeamTask } = await import('../../backend/src/admin/team/models.js'));
  ({ default: ResumeProfile } = await import('../../auto-apply-agent/src/models/ResumeProfile.js'));
  gridfs = await import('../../auto-apply-agent/src/storage/gridfs.js');
  User = mongoose.models.User;
});

after(async () => { await mongoose.disconnect(); });

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), TeamTask.deleteMany({}), ResumeProfile.deleteMany({})]);
});

const newUser = (email, extra = {}) => User.create({ email, name: email.split('@')[0], password: 'x', ...extra });

test('create, findOne by _id and by email, defaults applied', async () => {
  const u = await newUser('a@cvmind.in', { riskFlags: ['disposable_email'] });
  const byId = await User.findById(u._id);
  assert.equal(byId.email, 'a@cvmind.in');
  assert.ok(byId._id instanceof mongoose.Types.ObjectId);
  assert.equal(byId.status, 'active');
  assert.equal(byId.emailVerified, false);
  assert.deepEqual([...byId.riskFlags], ['disposable_email']);
  assert.ok(byId.createdAt instanceof Date);
  const lean = await User.findOne({ email: 'a@cvmind.in' }).lean();
  assert.equal(String(lean._id), String(u._id));
  assert.equal(lean.verificationFailures, 0);
});

test('filters: $in, $ne, $or, $gt, regex, list membership; sort, skip, limit', async () => {
  for (let i = 0; i < 6; i++) await newUser(`u${i}@x.com`, { riskScore: i, status: i % 2 ? 'suspended' : 'active', riskFlags: i === 3 ? ['vpn'] : [] });
  assert.equal(await User.countDocuments({ status: 'active' }), 3);
  assert.equal(await User.countDocuments({ status: { $ne: 'active' } }), 3);
  assert.equal(await User.countDocuments({ riskScore: { $gt: 3 } }), 2);
  assert.equal(await User.countDocuments({ $or: [{ riskScore: 0 }, { email: 'u5@x.com' }] }), 2);
  assert.equal(await User.countDocuments({ email: { $in: ['u1@x.com', 'u2@x.com', 'nope'] } }), 2);
  assert.equal(await User.countDocuments({ email: /^u[0-2]@/ }), 3);
  assert.equal(await User.countDocuments({ riskFlags: 'vpn' }), 1);
  const page = await User.find({}).sort({ riskScore: -1 }).skip(1).limit(2).lean();
  assert.deepEqual(page.map((d) => d.riskScore), [4, 3]);
  const jsSorted = await User.find({ email: /x\.com$/ }).sort({ riskScore: 1 }).limit(2).lean();
  assert.deepEqual(jsSorted.map((d) => d.riskScore), [0, 1]);
});

test('select: exclusion and inclusion', async () => {
  await newUser('sel@x.com');
  const noPw = await User.findOne({ email: 'sel@x.com' }).select('-password').lean();
  assert.equal(noPw.password, undefined);
  assert.equal(noPw.name, 'sel');
  const only = await User.findOne({ email: 'sel@x.com' }).select('email').lean();
  assert.deepEqual(Object.keys(only).sort(), ['_id', 'email']);
});

test('unique email gives a MongoDB-style E11000 error', async () => {
  await newUser('dup@x.com');
  await assert.rejects(newUser('dup@x.com'), (err) => err.code === 11000 && /duplicate key/.test(err.message));
});

test('updates: $set, $inc, Map field, updateMany counts', async () => {
  const u = await newUser('up@x.com');
  const r = await User.updateOne({ _id: u._id }, { $set: { name: 'Up' }, $inc: { verificationFailures: 2 } });
  assert.equal(r.matchedCount, 1);
  assert.equal(r.modifiedCount, 1);
  const same = await User.updateOne({ _id: u._id }, { $set: { name: 'Up' } });
  assert.equal(same.modifiedCount, 0);
  await User.updateOne({ _id: u._id }, { $set: { 'usageMap.resume_check': 3 } });
  const got = await User.findById(u._id);
  assert.equal(got.name, 'Up');
  assert.equal(got.verificationFailures, 2);
  assert.equal(got.usageMap.get('resume_check'), 3);
  await newUser('up2@x.com');
  const many = await User.updateMany({ email: /up/ }, { $set: { status: 'suspended' } });
  assert.equal(many.matchedCount, 2);
});

test('findOneAndUpdate: upsert with $setOnInsert, returns the new document', async () => {
  const doc = await User.findOneAndUpdate(
    { email: 'new@x.com' },
    { $set: { name: 'New' }, $setOnInsert: { password: 'p' } },
    { upsert: true, new: true }
  );
  assert.equal(doc.email, 'new@x.com');
  assert.equal(doc.password, 'p');
  const again = await User.findOneAndUpdate({ email: 'new@x.com' }, { $set: { name: 'Again' }, $setOnInsert: { password: 'q' } }, { upsert: true, new: true });
  assert.equal(again.name, 'Again');
  assert.equal(again.password, 'p');
  assert.equal(await User.countDocuments({ email: 'new@x.com' }), 1);
});

test('lists of objects: child table rows through create, save, $push, $pull, positional $', async () => {
  const creator = new mongoose.Types.ObjectId();
  const a = new mongoose.Types.ObjectId();
  const task = await TeamTask.create({ title: 'Ship', createdBy: creator, assigneeIds: [a], checklist: [{ text: 'one' }, { text: 'two' }] });
  const loaded = await TeamTask.findById(task._id);
  assert.deepEqual(loaded.checklist.map((c) => c.text), ['one', 'two']);
  assert.ok(loaded.checklist[0]._id instanceof mongoose.Types.ObjectId);

  loaded.checklist[1].done = true;
  loaded.checklist.push({ text: 'three' });
  loaded.status = 'in_progress';
  await loaded.save();
  const saved = await TeamTask.findById(task._id).lean();
  assert.deepEqual(saved.checklist.map((c) => [c.text, c.done]), [['one', false], ['two', true], ['three', false]]);
  assert.equal(saved.status, 'in_progress');

  await TeamTask.updateOne({ _id: task._id }, { $pull: { checklist: { text: 'one' } } });
  await TeamTask.updateOne({ _id: task._id, 'checklist.text': 'three' }, { $set: { 'checklist.$.done': true } });
  const after = await TeamTask.findById(task._id).lean();
  assert.deepEqual(after.checklist.map((c) => [c.text, c.done]), [['two', true], ['three', true]]);

  assert.equal(await TeamTask.countDocuments({ 'checklist.text': 'three' }), 1);
  assert.equal(await TeamTask.countDocuments({ assigneeIds: a, status: 'in_progress' }), 1);
  assert.equal(await TeamTask.countDocuments({ assigneeIds: { $in: [new mongoose.Types.ObjectId()] } }), 0);
});

test('deleteOne removes child rows too', async () => {
  const task = await TeamTask.create({ title: 'Gone', createdBy: new mongoose.Types.ObjectId(), checklist: [{ text: 'x' }] });
  await TeamTask.deleteOne({ _id: task._id });
  assert.equal(await TeamTask.findById(task._id), null);
  const [[row]] = await mongoose.connection.db.store.pool.query('SELECT COUNT(*) AS n FROM `teamtasks__checklist` WHERE parent_id = ?', [String(task._id)]);
  assert.equal(Number(row.n), 0);
});

test('distinct, aggregate, cursor, insertMany, bulkWrite', async () => {
  await User.insertMany([
    { email: 'g1@x.com', name: 'g1', password: 'x', status: 'active' },
    { email: 'g2@x.com', name: 'g2', password: 'x', status: 'banned' },
    { email: 'g3@x.com', name: 'g3', password: 'x', status: 'banned' }
  ]);
  assert.deepEqual((await User.distinct('status')).sort(), ['active', 'banned']);
  const groups = await User.aggregate([{ $match: { email: /^g/ } }, { $group: { _id: '$status', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  assert.deepEqual(groups, [{ _id: 'active', n: 1 }, { _id: 'banned', n: 2 }]);
  const seen = [];
  for await (const d of User.find({ status: 'banned' }).sort({ email: 1 }).cursor()) seen.push(d.email);
  assert.deepEqual(seen, ['g2@x.com', 'g3@x.com']);
  const res = await User.bulkWrite([
    { updateOne: { filter: { email: 'g1@x.com' }, update: { $set: { name: 'G1' } } } },
    { deleteOne: { filter: { email: 'g3@x.com' } } }
  ]);
  assert.equal(res.modifiedCount, 1);
  assert.equal(res.deletedCount, 1);
  assert.equal(await User.countDocuments({ email: /^g/ }), 2);
});

test('embedding vectors round-trip as Float32 buffers', async () => {
  const userId = new mongoose.Types.ObjectId();
  const vec = new Float32Array(768).map((_, i) => Math.sin(i) / 10);
  const created = await ResumeProfile.create({
    userId,
    label: 'v',
    source: 'upload',
    embeddings: { embedModel: 'gemini-embedding-001', dims: 768, bullets: [{ bulletId: 'b1', textHash: 'h', vector: Buffer.from(vec.buffer) }] }
  });
  const got = await ResumeProfile.findById(created._id).lean();
  // read it the way the app does
  const { vectorFromStored } = await import('../../auto-apply-agent/src/resume/embeddings.js');
  const back = vectorFromStored(got.embeddings.bullets[0].vector);
  assert.equal(back.length, 768);
  assert.ok(Math.abs(back[100] - vec[100]) < 1e-6);
  const without = await ResumeProfile.findById(created._id).select('-embeddings').lean();
  assert.equal(without.embeddings, undefined);
});

test('GridFS-compatible file storage', async () => {
  const data = Buffer.alloc(600 * 1024, 7);
  const id = await gridfs.uploadBuffer(gridfs.BUCKETS.resumeFiles, data, { filename: 'cv.pdf', contentType: 'application/pdf', metadata: { userId: 'u1' } });
  const back = await gridfs.downloadBuffer(gridfs.BUCKETS.resumeFiles, id);
  assert.equal(back.length, data.length);
  assert.ok(back.equals(data));
  assert.equal(await gridfs.deleteFile(gridfs.BUCKETS.resumeFiles, id), true);
  assert.equal(await gridfs.deleteFile(gridfs.BUCKETS.resumeFiles, id), false);
});

test('refuses to wipe a non-test database', async () => {
  const { TidbStore } = await import('../src/store.js');
  const store = new TidbStore(null, mongoose.connection.db.store.plan, 'cvmind');
  assert.throws(() => store.assertTestDatabase('wipe'), /only allowed on a database whose name ends with _test/);
});

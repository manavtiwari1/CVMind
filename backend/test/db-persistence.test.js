import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Every feature must really land in MongoDB. db.js reads MONGODB_URI at import time,
// so the in-memory server is started first and db.js is imported afterwards.
let mongod;
let db;
let mongoose;

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('cvmind_test');
  db = await import('../src/db.js');
  mongoose = (await import('mongoose')).default;
});

after(async () => {
  await mongoose?.disconnect();
  await mongod?.stop();
});

test('feature logs are stored in MongoDB with the user id', async () => {
  const userId = 'user-123';
  const email = 'dev@example.com';

  await db.saveScan({ fileName: 'cv.pdf', fileType: 'application/pdf', fileSize: 10, evaluation: { score: 72, summary: 's', atsKeywords: { missing: ['Docker'] } }, userId });
  await db.saveFix({ fileName: 'cv.pdf', priorScore: 72, userId });
  await db.saveTailorLog({ fileName: 'cv.pdf', fileSize: 10, score: 80, jobDescription: 'jd', matchedSkills: ['a'], missingSkills: ['b'], userId });
  await db.savePrepLog({ fileName: 'cv.pdf', fileSize: 10, questionsCount: 5, userId });
  await db.saveProofreadLog({ email, userId, industry: 'Tech', charCount: 120, issuesCount: 4 });
  await db.saveLinkedinLog({ email, userId, score: 65 });
  await db.saveLinkedinBioLog({ email, userId, jobTitle: 'SDE' });
  await db.saveLinkedinOutreachLog({ email, userId, jobTitle: 'SDE' });
  await db.saveLinkedinPostLog({ email, userId, topic: 'launch' });
  await db.saveCareerCoursesLog({ email, userId, jobTitle: 'SDE' });
  await db.saveElevatorPitchLog({ email, userId, jobTitle: 'SDE' });
  await db.saveCareerRoadmapLog({ email, userId });
  await db.saveVoicePrepLog({ email, userId, jobTitle: 'SDE', score: 7.5 });
  await db.savePortfolioGenLog({ email, userId, theme: 'ocean' });
  await db.saveJobFinderLog({ email, userId, jobsCount: 3, jobDescription: 'backend', jobType: 'Remote' });

  const stats = await db.getAdminStats();
  assert.equal(stats.totalScans, 1);
  assert.equal(stats.totalFixes, 1);
  assert.equal(stats.totalTailors, 1);
  assert.equal(stats.totalPreps, 1);
  assert.equal(stats.totalProofreads, 1);
  assert.equal(stats.totalLinkedins, 1);
  assert.equal(stats.totalLinkedinBios, 1);
  assert.equal(stats.totalLinkedinOutreachs, 1);
  assert.equal(stats.totalLinkedinPosts, 1);
  assert.equal(stats.totalCareerCourses, 1);
  assert.equal(stats.totalElevatorPitches, 1);
  assert.equal(stats.totalCareerRoadmaps, 1);
  assert.equal(stats.totalVoicePreps, 1);
  assert.equal(stats.totalPortfolioGens, 1);
  assert.equal(stats.totalJobFinders, 1);

  const scan = await mongoose.model('Scan').findOne();
  assert.equal(scan.userId, userId);
});

test('works are saved and read back per user', async () => {
  const saved = await db.saveWork({ userId: 'u1', title: 'Resume Check', type: 'resume-check', templateId: 'resume-checker', htmlContent: '{"a":1}' });
  const list = await db.getUserWorks('u1');
  assert.equal(list.length, 1);
  assert.equal(String(list[0]._id), String(saved._id));
  assert.equal((await db.getUserWorks('someone-else')).length, 0);
  assert.equal(await db.getWorkById('not-an-object-id'), null);
});

test('coding profile starts empty and tracks real submissions', async () => {
  const fresh = await db.getUserCodingProfile('coder-1');
  assert.deepEqual(fresh.solvedProblemIds, []);
  assert.equal(fresh.totalSubmissions, 0);
  assert.equal(fresh.streak, 0);

  await db.saveCodingSubmission({ userId: 'coder-1', problemId: 'two-sum', language: 'javascript', code: 'x', verdict: 'Accepted' });
  const p = await db.updateUserCodingProfile('coder-1', { problemId: 'two-sum', verdict: 'Accepted' });
  assert.deepEqual(p.solvedProblemIds, ['two-sum']);
  assert.equal(p.totalSubmissions, 1);
  assert.equal(p.streak, 1);
  assert.equal((await db.getUserCodingSubmissions('coder-1')).length, 1);
});

test('contact messages are stored and password reset tokens resolve', async () => {
  const msg = await db.saveContactMessage({ name: 'A', email: 'a@b.co', subject: '', message: 'hi' });
  assert.ok(msg.id);

  const user = await db.createUser({ email: 'r@x.co', name: 'R', password: 'hash' });
  await db.saveUserResetToken('r@x.co', 'tok123', Date.now() + 60000);
  const found = await db.findUserByResetToken('tok123');
  assert.equal(found.email, 'r@x.co');
  assert.ok(user.id);
});

test('coding progress, drafts and reset work per user', async () => {
  const uid = 'coder-2';
  await db.saveCodingSubmission({ userId: uid, kind: 'run', problemId: 'two-sum', language: 'python', code: 'r', verdict: 'Accepted' });
  await db.saveCodingSubmission({ userId: uid, problemId: 'two-sum', language: 'python', code: 's', verdict: 'Wrong Answer' });
  await db.updateUserCodingProfile(uid, { problemId: 'two-sum', verdict: 'Wrong Answer' });
  await db.saveCodingSubmission({ userId: uid, problemId: 'two-sum', language: 'python', code: 's2', verdict: 'Accepted' });
  await db.updateUserCodingProfile(uid, { problemId: 'two-sum', verdict: 'Accepted' });

  await db.saveCodingDraft({ userId: uid, problemId: 'two-sum', language: 'python', code: 'v1' });
  await db.saveCodingDraft({ userId: uid, problemId: 'two-sum', language: 'python', code: 'v2' });

  const progress = await db.getUserCodingProgress(uid);
  assert.equal(progress.submissions.length, 2, 'sample runs are not part of the history');
  assert.ok(progress.solved['two-sum'].at > 0);
  assert.equal(progress.solved['two-sum'].language, 'python');
  assert.equal(progress.drafts.length, 1);
  assert.equal(progress.drafts[0].code, 'v2');

  // another user sees nothing of it
  const other = await db.getUserCodingProgress('coder-3');
  assert.equal(other.submissions.length, 0);
  assert.deepEqual(other.solved, {});

  await db.deleteCodingDraft({ userId: uid, problemId: 'two-sum', language: 'python' });
  assert.equal((await db.getUserCodingProgress(uid)).drafts.length, 0);

  await db.resetUserCodingProgress(uid);
  const after = await db.getUserCodingProgress(uid);
  assert.equal(after.submissions.length, 0);
  assert.deepEqual(after.solved, {});
});

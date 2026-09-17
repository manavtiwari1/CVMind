import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import ResumeProfile from '../../src/agent/models/ResumeProfile.js';
import QueueJob from '../../src/agent/models/QueueJob.js';
import ApplicationEvent from '../../src/agent/models/ApplicationEvent.js';
import { importUploadedResume, importCvmindWork } from '../../src/agent/resume/intake.js';
import { downloadBuffer, BUCKETS } from '../../src/agent/storage/gridfs.js';
import { startTestMongo } from '../helpers/mongo.js';

let mongo;

before(async () => { mongo = await startTestMongo([ResumeProfile, QueueJob, ApplicationEvent]); });
after(async () => { await mongo.stop(); });
beforeEach(async () => { await mongo.reset(); });

const fileOf = (text, name = 'resume.txt') => {
  const buffer = Buffer.from(text);
  return { buffer, originalname: name, mimetype: 'text/plain', size: buffer.length };
};

test('stores the file, queues parsing and logs where the upload came from', async () => {
  const { profile, deduped } = await importUploadedResume({ userId: 'user-a', file: fileOf('Ada resume'), label: 'Resume Checker – resume.txt', via: 'resume_checker' });

  assert.equal(deduped, false);
  assert.equal(profile.source, 'upload');
  assert.equal(profile.label, 'Resume Checker – resume.txt');
  assert.equal(profile.isDefault, true);
  assert.equal((await downloadBuffer(BUCKETS.resumeFiles, profile.originalFileRef.gridFsId)).toString(), 'Ada resume');

  const job = await QueueJob.findOne({ type: 'resume.parse' }).lean();
  assert.equal(job.payload.resumeProfileId, String(profile._id));
  const event = await ApplicationEvent.findOne({ type: 'resume.uploaded' }).lean();
  assert.equal(event.data.via, 'resume_checker');
});

test('identical bytes reuse the existing profile instead of creating another', async () => {
  const first = await importUploadedResume({ userId: 'user-a', file: fileOf('Same resume') });
  const again = await importUploadedResume({ userId: 'user-a', file: fileOf('Same resume', 'renamed.txt') });

  assert.equal(again.deduped, true);
  assert.equal(String(again.profile._id), String(first.profile._id));
  assert.equal(await ResumeProfile.countDocuments({ userId: 'user-a' }), 1);
  assert.equal(await QueueJob.countDocuments({ type: 'resume.parse' }), 1);
});

test('makeDefault moves the default to the new upload, including a re-upload of an older file', async () => {
  const older = await importUploadedResume({ userId: 'user-a', file: fileOf('Older resume') });
  const agentUpload = await importUploadedResume({ userId: 'user-a', file: fileOf('Agent tab resume') });
  assert.equal(agentUpload.profile.isDefault, false, 'uploads without makeDefault keep the current default');

  await importUploadedResume({ userId: 'user-a', file: fileOf('Checker resume'), makeDefault: true });
  const defaults = await ResumeProfile.find({ userId: 'user-a', isDefault: true }).lean();
  assert.equal(defaults.length, 1);
  assert.equal(defaults[0].originalFileRef.size, Buffer.byteLength('Checker resume'));

  await importUploadedResume({ userId: 'user-a', file: fileOf('Older resume'), makeDefault: true });
  const afterReupload = await ResumeProfile.find({ userId: 'user-a', isDefault: true }).lean();
  assert.deepEqual(afterReupload.map((p) => String(p._id)), [String(older.profile._id)]);
});

test('each user keeps their own default', async () => {
  await importUploadedResume({ userId: 'user-a', file: fileOf('A resume'), makeDefault: true });
  await importUploadedResume({ userId: 'user-b', file: fileOf('B resume'), makeDefault: true });
  assert.equal(await ResumeProfile.countDocuments({ isDefault: true }), 2);
});

const work = (html, title = 'Builder resume') => ({ _id: 'work-a', userId: 'user-a', type: 'resume', title, htmlContent: html, updatedAt: new Date('2026-09-01') });

test('dashboard resumes import once, and only re-parse when their content changed', async () => {
  const first = await importCvmindWork({ userId: 'user-a', workId: 'work-a', work: work('<p>v1</p>') });
  assert.equal(first.deduped, false);
  assert.equal(first.profile.source, 'cvmind');
  assert.equal(first.profile.isDefault, true);

  const same = await importCvmindWork({ userId: 'user-a', workId: 'work-a', work: work('<p>v1</p>') });
  assert.equal(same.deduped, true);
  assert.equal(String(same.profile._id), String(first.profile._id));

  const changed = await importCvmindWork({ userId: 'user-a', workId: 'work-a', work: work('<p>v2</p>', 'Renamed') });
  assert.equal(changed.deduped, false);
  assert.equal(String(changed.profile._id), String(first.profile._id));
  assert.equal(changed.profile.label, 'Renamed');
  assert.equal(changed.profile.status, 'queued');
  assert.equal(await ResumeProfile.countDocuments({ userId: 'user-a' }), 1);
  assert.deepEqual((await ApplicationEvent.find({}).sort({ createdAt: 1 }).lean()).map((e) => e.type), ['resume.imported', 'resume.resynced']);
});

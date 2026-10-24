import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Placements portal (placements.cvmind.in). The core promise: one college never sees another
// college's students. Two colleges, ABC and XYZ, are set up and XYZ tries every route on ABC's data.
let mongod;
let server;
let base;
let mongoose;
let models;
let collegeRouter;
let signToken;
let isPro;
const emails = [];

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_college_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = 're_test_key';

  // Capture Resend calls (single and batch); everything else goes through
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('api.resend.com')) {
      const body = JSON.parse(init.body);
      const list = Array.isArray(body) ? body : [body];
      emails.push(...list);
      const data = Array.isArray(body) ? { data: list.map((_, i) => ({ id: `e-${emails.length}-${i}` })) } : { id: `e-${emails.length}` };
      return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, init);
  };

  const express = (await import('express')).default;
  const http = await import('http');
  mongoose = (await import('mongoose')).default;
  const adminRouter = (await import('../../src/admin/router.js')).default;
  collegeRouter = (await import('../../src/college/router.js')).default;
  const studentRouter = (await import('../../src/routes/collegeStudent.js')).default;
  const { setPdfRenderer } = await import('../../src/college/routes/vetting.js');
  ({ signToken } = await import('../../src/services/authToken.js'));
  ({ isPro } = await import('../../src/billing/service.js'));
  models = await import('../../src/college/models.js');
  setPdfRenderer(async (html) => Buffer.from(`%PDF-1.4 ${html.length}`));

  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));
  await Promise.all(models.COLLEGE_MODELS.map((m) => m.syncIndexes()));

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/admin', adminRouter);
  app.use('/api/college', collegeRouter);
  app.use('/', studentRouter);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

async function call(path, { method = 'GET', token, body, raw = false } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (raw) return { status: res.status, headers: res.headers, buffer: Buffer.from(await res.arrayBuffer()) };
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}
const college = (path, opts) => call(`/api/college${path}`, opts);

const lastEmailTo = (to) => [...emails].reverse().find((e) => e.to.includes(to));
const passwordIn = (email) => email.html.match(/Temporary password<\/td><td[^>]*>([^<]+)</)[1];
const inviteTokenIn = (email) => email.html.match(/college-invite\/([A-Za-z0-9_-]+)/)[1];

const Work = () => mongoose.model('Work');
const Scan = () => mongoose.model('Scan');
const LinkedinLog = () => mongoose.model('LinkedinLog');
const User = () => mongoose.model('User');

async function makeUser(email) {
  const user = await User().create({ email, name: email.split('@')[0], password: 'x', emailVerified: false });
  return { id: String(user._id), email, token: signToken({ sub: user._id, kind: 'user', email }) };
}

// Sets up a college from the admin panel and signs its admin in with their own password
async function setupCollege(adminToken, name, tpoEmail) {
  const res = await call('/api/admin/colleges', { method: 'POST', token: adminToken, body: { name, adminEmail: tpoEmail, adminName: `${name} TPO`, seats: 3, endsAt: new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10) } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.emailSent, true);
  const temp = passwordIn(lastEmailTo(tpoEmail));
  const login = await college('/login', { method: 'POST', body: { email: tpoEmail, password: temp } });
  assert.equal(login.status, 200);
  const blocked = await college('/students', { token: login.body.token });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'COLLEGE_SET_PASSWORD');
  const changed = await college('/me/password', { method: 'POST', token: login.body.token, body: { currentPassword: temp, newPassword: `${name}-strong-pass-1` } });
  assert.equal(changed.status, 200);
  // The temporary-password token is revoked by the change
  assert.equal((await college('/me', { token: login.body.token })).status, 401);
  return { id: res.body.college.id, token: changed.body.token, password: `${name}-strong-pass-1` };
}

async function invite(token, rows) {
  const res = await college('/students/import', { method: 'POST', token, body: { rows } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}

async function join(student, user) {
  const token = inviteTokenIn(lastEmailTo(student));
  const res = await call(`/api/college-invite/${token}/accept`, { method: 'POST', token: user.token, body: { consent: true } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
}

const S = {};

test('CVMind admin sets up two colleges; each admin must change the temporary password', async () => {
  const owner = (await call('/api/admin/login', { method: 'POST', body: { username: 'owner', password: 'owner-password-123' } })).body.token;
  S.owner = owner;
  S.abc = await setupCollege(owner, 'ABC College', 'tpo@abc.edu');
  S.xyz = await setupCollege(owner, 'XYZ University', 'tpo@xyz.edu');

  const dup = await call('/api/admin/colleges', { method: 'POST', token: owner, body: { name: 'Other', adminEmail: 'tpo@abc.edu', endsAt: '2030-01-01' } });
  assert.equal(dup.status, 409);
  const list = await call('/api/admin/colleges', { token: owner });
  assert.equal(list.body.total, 2);
});

test('roster import checks rows, seats and other colleges, and invites by email', async () => {
  const preview = await college('/students/preview', { method: 'POST', token: S.abc.token, body: { rows: [
    { email: 'riya@gmail.com', name: 'Riya', rollNo: 'A01', branch: 'CSE', batch: '2026' },
    { email: 'not-an-email' },
    { email: 'RIYA@gmail.com' }
  ] } });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.valid, 1);
  assert.deepEqual(preview.body.errors.map((e) => e.error), ['Not a valid email.', 'Listed twice in this upload.']);

  const result = await invite(S.abc.token, [
    { email: 'riya@gmail.com', name: 'Riya', rollNo: 'A01', branch: 'CSE', batch: '2026' },
    { email: 'aman@gmail.com', name: 'Aman', rollNo: 'A02', branch: 'ECE', batch: '2026' }
  ]);
  assert.equal(result.invited, 2);
  assert.match(lastEmailTo('riya@gmail.com').subject, /ABC College invited you/);

  // XYZ can't take a student who is on ABC's list, and isn't told which college has them
  const taken = await invite(S.xyz.token, [{ email: 'riya@gmail.com' }, { email: 'kabir@gmail.com', name: 'Kabir', rollNo: 'X01', branch: 'CSE' }]);
  assert.equal(taken.invited, 1);
  assert.equal(taken.errors[0].error, 'Already linked to another institution.');
  assert.doesNotMatch(JSON.stringify(taken), /ABC/);

  // Seats: ABC has 3, two are used
  const full = await invite(S.abc.token, [{ email: 'one@gmail.com' }, { email: 'two@gmail.com' }]);
  assert.equal(full.invited, 1);
  assert.equal(full.errors[0].error, 'No seats left on your plan.');
});

test('students join only with the invited email and consent; joining gives Pro', async () => {
  S.riya = await makeUser('riya@gmail.com');
  S.kabir = await makeUser('kabir@gmail.com');
  const stranger = await makeUser('stranger@gmail.com');
  const token = inviteTokenIn(lastEmailTo('riya@gmail.com'));

  const info = await call(`/api/college-invite/${token}`);
  assert.equal(info.body.college.name, 'ABC College');
  assert.equal(info.body.email, 'ri**@gmail.com');

  const wrong = await call(`/api/college-invite/${token}/accept`, { method: 'POST', token: stranger.token, body: { consent: true } });
  assert.equal(wrong.status, 403);
  const noConsent = await call(`/api/college-invite/${token}/accept`, { method: 'POST', token: S.riya.token, body: {} });
  assert.equal(noConsent.status, 400);

  assert.equal(await isPro('riya@gmail.com'), false);
  await join('riya@gmail.com', S.riya);
  assert.equal(await isPro('riya@gmail.com'), true);
  assert.equal((await User().findById(S.riya.id).lean()).emailVerified, true);
  // The link is single-use
  assert.equal((await call(`/api/college-invite/${token}`)).status, 404);

  await join('kabir@gmail.com', S.kabir);
  const rows = await models.CollegeStudent.find({ status: 'joined' }).lean();
  S.riyaStudentId = String(rows.find((r) => r.email === 'riya@gmail.com')._id);
  S.kabirStudentId = String(rows.find((r) => r.email === 'kabir@gmail.com')._id);
  S.amanStudentId = String((await models.CollegeStudent.findOne({ email: 'aman@gmail.com' }).lean())._id);

  // Their work in CVMind
  const now = Date.now();
  S.riyaResume = await Work().create({ userId: S.riya.id, title: 'Riya SDE Resume', type: 'resume', templateId: 'modern', htmlContent: '<div>Riya resume content for the PDF</div>', updatedAt: new Date(now - 60000) });
  await Work().create({ userId: S.riya.id, title: 'ATS check', type: 'resume-check', templateId: 'x', htmlContent: JSON.stringify({ resumeText: 'secret text', evaluation: { score: 81 } }) });
  await Scan().create({ userId: S.riya.id, fileName: 'r.pdf', fileType: 'pdf', fileSize: 1, score: 62, createdAt: new Date(now - 120000) });
  await Scan().create({ userId: S.riya.id, fileName: 'r.pdf', fileType: 'pdf', fileSize: 1, score: 81 });
  await LinkedinLog().create({ userId: S.riya.id, email: 'riya@gmail.com', score: 70 });
  S.kabirResume = await Work().create({ userId: S.kabir.id, title: 'Kabir Resume', type: 'resume', templateId: 'modern', htmlContent: '<div>Kabir resume content here</div>' });
  await Scan().create({ userId: S.kabir.id, fileName: 'k.pdf', fileType: 'pdf', fileSize: 1, score: 55 });
});

test('the college dashboard shows its joined students with scores', async () => {
  const list = await college('/students', { token: S.abc.token });
  assert.equal(list.status, 200);
  const riya = list.body.data.find((r) => r.email === 'riya@gmail.com');
  assert.equal(riya.stats.atsScore, 81);
  assert.equal(riya.stats.linkedinScore, 70);
  assert.equal(riya.stats.resumeCount, 1);
  assert.equal(riya.stats.reviewStatus, 'not_reviewed');
  // Invited, not joined: no data at all
  assert.equal(list.body.data.find((r) => r.email === 'aman@gmail.com').stats, undefined);
  assert.equal((await college(`/students/${S.amanStudentId}`, { token: S.abc.token })).status, 404);

  const detail = await college(`/students/${S.riyaStudentId}`, { token: S.abc.token });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.scans.length, 2);
  const check = detail.body.works.find((w) => w.type === 'resume-check');
  const report = await college(`/students/${S.riyaStudentId}/works/${check.id}`, { token: S.abc.token });
  assert.equal(report.body.work.evaluation.score, 81);
  assert.doesNotMatch(JSON.stringify(report.body), /secret text/);
});

test('review, minimum score rule, staleness after an edit, and downloads', async () => {
  const path = `/students/${S.riyaStudentId}/works/${S.riyaResume._id}`;
  const needsComment = await college(`${path}/review`, { method: 'POST', token: S.abc.token, body: { status: 'changes_requested' } });
  assert.equal(needsComment.status, 400);
  const asked = await college(`${path}/review`, { method: 'POST', token: S.abc.token, body: { status: 'changes_requested', comment: 'Add your internship.' } });
  assert.equal(asked.body.review.state, 'changes_requested');
  assert.match(lastEmailTo('riya@gmail.com').subject, /asked for changes/);

  const approved = await college(`${path}/review`, { method: 'POST', token: S.abc.token, body: { status: 'approved' } });
  assert.equal(approved.body.review.state, 'approved');

  // Minimum ATS 75: Riya (81, approved) is eligible
  await college('/settings', { method: 'PATCH', token: S.abc.token, body: { minAtsScore: 75 } });
  let eligible = await college('/students?eligible=true', { token: S.abc.token });
  assert.deepEqual(eligible.body.data.map((r) => r.email), ['riya@gmail.com']);

  const pdf = await college('/downloads/resume', { method: 'POST', token: S.abc.token, body: { studentId: S.riyaStudentId }, raw: true });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.match(pdf.headers.get('content-disposition'), /A01_Riya/);

  const zip = await college('/downloads/zip', { method: 'POST', token: S.abc.token, body: { eligible: true }, raw: true });
  assert.equal(zip.status, 200);
  const JSZip = (await import('jszip')).default;
  const files = Object.keys((await JSZip.loadAsync(zip.buffer)).files);
  assert.deepEqual(files, ['A01_Riya.pdf']);

  // The student sees the review on their account
  const mine = await call('/api/user/college', { token: S.riya.token });
  assert.equal(mine.body.college.name, 'ABC College');
  assert.equal(mine.body.reviews[0].state, 'approved');
  assert.equal(mine.body.reviews[0].comments[0].text, 'Add your internship.');

  // Editing the resume after approval makes the review stale and the student not eligible
  await Work().updateOne({ _id: S.riyaResume._id }, { updatedAt: new Date() });
  eligible = await college('/students?eligible=true', { token: S.abc.token });
  assert.equal(eligible.body.data.length, 0);
  const row = (await college('/students', { token: S.abc.token })).body.data.find((r) => r.email === 'riya@gmail.com');
  assert.equal(row.stats.reviewStatus, 'stale');
  await college(`${path}/review`, { method: 'POST', token: S.abc.token, body: { status: 'approved' } });
});

test('college resume formats reach only that college\'s students', async () => {
  const html = '<div class="abc-format"><h1>{{name}}</h1><p>ABC College official resume format</p></div>';
  const added = await call(`/api/admin/colleges/${S.abc.id}/templates`, { method: 'POST', token: S.owner, body: { name: 'ABC Official', html } });
  assert.equal(added.status, 201);
  await call(`/api/admin/colleges/${S.xyz.id}/templates`, { method: 'POST', token: S.owner, body: { name: 'XYZ Official', html: html.replace(/ABC/g, 'XYZ') } });

  const riya = await call('/api/user/college/templates', { token: S.riya.token });
  assert.deepEqual(riya.body.data.map((t) => t.name), ['ABC Official']);
  assert.equal(riya.body.data[0].id, `college:${added.body.template.id}`);
  const kabir = await call('/api/user/college/templates', { token: S.kabir.token });
  assert.deepEqual(kabir.body.data.map((t) => t.name), ['XYZ Official']);
  const outsider = await makeUser('nobody@gmail.com');
  assert.deepEqual((await call('/api/user/college/templates', { token: outsider.token })).body.data, []);

  // Requiring the college format: Riya's approved resume uses another template, so she isn't eligible
  await college('/settings', { method: 'PATCH', token: S.abc.token, body: { requireCollegeFormat: true } });
  assert.equal((await college('/students?eligible=true', { token: S.abc.token })).body.data.length, 0);
  await college('/settings', { method: 'PATCH', token: S.abc.token, body: { requireCollegeFormat: false } });
});

// ── Isolation: XYZ tries every route against ABC ─────────────────────────────
const ISOLATION = {
  'POST /login': async () => {
    // Signing in never crosses colleges: ABC's admin password doesn't open XYZ and vice versa
    const res = await college('/login', { method: 'POST', body: { email: 'tpo@xyz.edu', password: S.abc.password } });
    assert.equal(res.status, 401);
  },
  'GET /me': async () => {
    const res = await college('/me', { token: S.xyz.token });
    assert.equal(res.body.college.id, S.xyz.id);
  },
  'PATCH /me': async () => {
    const res = await college('/me', { method: 'PATCH', token: S.xyz.token, body: { name: 'XYZ TPO', collegeId: S.abc.id } });
    assert.equal(res.status, 200);
    assert.equal(String((await models.CollegeStaff.findOne({ email: 'tpo@xyz.edu' }).lean()).collegeId), S.xyz.id);
  },
  'POST /me/password': async () => {
    const res = await college('/me/password', { method: 'POST', token: S.xyz.token, body: { currentPassword: S.abc.password, newPassword: 'whatever-12345' } });
    assert.equal(res.status, 400);
  },
  'GET /staff': async () => {
    const res = await college('/staff', { token: S.xyz.token });
    assert.ok(res.body.data.every((s) => !s.email.endsWith('@abc.edu')));
  },
  'POST /staff': async () => {
    const res = await college('/staff', { method: 'POST', token: S.xyz.token, body: { email: 'faculty@xyz.edu', name: 'F', collegeId: S.abc.id } });
    assert.equal(res.status, 201);
    const row = await models.CollegeStaff.findOne({ email: 'faculty@xyz.edu' }).lean();
    assert.equal(String(row.collegeId), S.xyz.id);
    S.xyzStaffId = String(row._id);
  },
  'POST /staff/:id/reset': async () => {
    const abcAdmin = await models.CollegeStaff.findOne({ email: 'tpo@abc.edu' }).lean();
    assert.equal((await college(`/staff/${abcAdmin._id}/reset`, { method: 'POST', token: S.xyz.token })).status, 404);
  },
  'DELETE /staff/:id': async () => {
    const abcAdmin = await models.CollegeStaff.findOne({ email: 'tpo@abc.edu' }).lean();
    assert.equal((await college(`/staff/${abcAdmin._id}`, { method: 'DELETE', token: S.xyz.token })).status, 404);
    assert.equal((await college('/me', { token: S.abc.token })).status, 200);
  },
  'PATCH /settings': async () => {
    await college('/settings', { method: 'PATCH', token: S.xyz.token, body: { minAtsScore: 10, collegeId: S.abc.id } });
    assert.equal((await models.College.findById(S.abc.id).lean()).settings.minAtsScore, 75);
  },
  'GET /templates': async () => {
    const res = await college('/templates', { token: S.xyz.token });
    assert.deepEqual(res.body.data.map((t) => t.name), ['XYZ Official']);
  },
  'GET /audit': async () => {
    const res = await college('/audit?limit=100', { token: S.xyz.token });
    assert.doesNotMatch(JSON.stringify(res.body), /riya@gmail\.com|tpo@abc\.edu|ABC College/);
  },
  'POST /students/preview': async () => {
    const res = await college('/students/preview', { method: 'POST', token: S.xyz.token, body: { rows: [{ email: 'riya@gmail.com' }] } });
    assert.equal(res.body.errors[0].error, 'Already linked to another institution.');
  },
  'POST /students/import': async () => {
    const res = await college('/students/import', { method: 'POST', token: S.xyz.token, body: { rows: [{ email: 'aman@gmail.com' }] } });
    assert.equal(res.body.invited, 0);
  },
  'PATCH /students/:id': async () => {
    assert.equal((await college(`/students/${S.riyaStudentId}`, { method: 'PATCH', token: S.xyz.token, body: { name: 'Hacked' } })).status, 404);
  },
  'POST /students/:id/resend': async () => {
    assert.equal((await college(`/students/${S.amanStudentId}/resend`, { method: 'POST', token: S.xyz.token })).status, 404);
  },
  'DELETE /students/:id': async () => {
    assert.equal((await college(`/students/${S.riyaStudentId}`, { method: 'DELETE', token: S.xyz.token })).status, 404);
    assert.equal((await models.CollegeStudent.findById(S.riyaStudentId).lean()).status, 'joined');
  },
  'GET /overview': async () => {
    const res = await college('/overview', { token: S.xyz.token });
    assert.equal(res.body.data.joined, 1);
    assert.deepEqual(res.body.data.byBranch.map((b) => b.name), ['CSE']);
    assert.equal(res.body.data.approved, 0);
  },
  'GET /students': async () => {
    const all = await college('/students?status=all', { token: S.xyz.token });
    assert.deepEqual(all.body.data.map((r) => r.email), ['kabir@gmail.com']);
    const search = await college('/students?q=riya', { token: S.xyz.token });
    assert.equal(search.body.data.length, 0);
  },
  'GET /students/export.csv': async () => {
    const res = await college('/students/export.csv?status=all', { token: S.xyz.token });
    assert.match(res.body, /kabir@gmail\.com/);
    assert.doesNotMatch(res.body, /riya|aman/);
  },
  'GET /students/:id': async () => {
    assert.equal((await college(`/students/${S.riyaStudentId}`, { token: S.xyz.token })).status, 404);
  },
  'GET /students/:id/works/:workId': async () => {
    assert.equal((await college(`/students/${S.riyaStudentId}/works/${S.riyaResume._id}`, { token: S.xyz.token })).status, 404);
    // Own student + another college's resume
    assert.equal((await college(`/students/${S.kabirStudentId}/works/${S.riyaResume._id}`, { token: S.xyz.token })).status, 404);
  },
  'POST /students/:id/works/:workId/review': async () => {
    for (const sid of [S.riyaStudentId, S.kabirStudentId]) {
      assert.equal((await college(`/students/${sid}/works/${S.riyaResume._id}/review`, { method: 'POST', token: S.xyz.token, body: { status: 'approved' } })).status, 404);
    }
  },
  'POST /students/:id/works/:workId/comments': async () => {
    for (const sid of [S.riyaStudentId, S.kabirStudentId]) {
      assert.equal((await college(`/students/${sid}/works/${S.riyaResume._id}/comments`, { method: 'POST', token: S.xyz.token, body: { text: 'hi' } })).status, 404);
    }
  },
  'POST /downloads/resume': async () => {
    assert.equal((await college('/downloads/resume', { method: 'POST', token: S.xyz.token, body: { studentId: S.riyaStudentId } })).status, 404);
    assert.equal((await college('/downloads/resume', { method: 'POST', token: S.xyz.token, body: { studentId: S.kabirStudentId, workId: String(S.riyaResume._id) } })).status, 404);
  },
  'POST /downloads/zip': async () => {
    const res = await college('/downloads/zip', { method: 'POST', token: S.xyz.token, body: { studentIds: [S.riyaStudentId] } });
    assert.equal(res.status, 400);
  }
};

function routesOf(router, prefix = '') {
  const out = [];
  for (const layer of router.stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) out.push(`${method.toUpperCase()} ${prefix}${layer.route.path}`);
    } else if (layer.handle?.stack) {
      out.push(...routesOf(layer.handle, prefix));
    }
  }
  return out;
}

test('every placements route has an isolation check', () => {
  const routes = routesOf(collegeRouter);
  assert.ok(routes.length > 20);
  const missing = routes.filter((r) => !ISOLATION[r]);
  assert.deepEqual(missing, [], 'Add these routes to the ISOLATION checks in this file');
});

test('XYZ cannot reach ABC through any route', async () => {
  for (const [route, check] of Object.entries(ISOLATION)) {
    await check().catch((err) => { err.message = `${route}: ${err.message}`; throw err; });
  }
});

test('tokens of other kinds do not open the portal, and portal tokens open nothing else', async () => {
  assert.equal((await college('/students', { token: S.riya.token })).status, 401);
  assert.equal((await college('/students', { token: S.owner })).status, 401);
  assert.equal((await call('/api/user/college', { token: S.abc.token })).status, 401);
  assert.equal((await call('/api/admin/colleges', { token: S.abc.token })).status, 401);
});

test('a student who leaves is gone from the dashboard at once', async () => {
  const left = await call('/api/user/college/leave', { method: 'POST', token: S.kabir.token });
  assert.equal(left.status, 200);
  assert.equal((await college(`/students/${S.kabirStudentId}`, { token: S.xyz.token })).status, 404);
  assert.equal(await isPro('kabir@gmail.com'), false);
  // Now another college may invite them
  const res = await invite(S.abc.token, [{ email: 'kabir@gmail.com' }]);
  assert.ok(res.errors.every((e) => e.error !== 'Already linked to another institution.'));
});

test('deleting a student account ends the college link and its reviews', async () => {
  await invite(S.xyz.token, [{ email: 'gone@gmail.com', name: 'Gone', rollNo: 'X09' }]);
  const gone = await makeUser('gone@gmail.com');
  await join('gone@gmail.com', gone);
  const row = await models.CollegeStudent.findOne({ email: 'gone@gmail.com', status: 'joined' }).lean();
  const work = await Work().create({ userId: gone.id, title: 'Gone CV', type: 'resume', templateId: 'x', htmlContent: '<div>Gone resume body text</div>' });
  await Scan().create({ userId: gone.id, fileName: 'g.pdf', fileType: 'pdf', fileSize: 1, score: 70 });
  await college(`/students/${row._id}/works/${work._id}/review`, { method: 'POST', token: S.xyz.token, body: { status: 'approved' } });

  const { deleteAccount } = await import('../../src/db.js');
  await deleteAccount(gone.id);

  assert.equal((await college(`/students/${row._id}`, { token: S.xyz.token })).status, 404);
  const after = await models.CollegeStudent.findById(row._id).lean();
  assert.equal(after.status, 'left');
  assert.equal(after.userId, '');
  assert.equal(await models.ResumeReview.countDocuments({ studentId: row._id }), 0);
});

test('removed staff and suspended colleges are signed out at once', async () => {
  const staffEmail = lastEmailTo('faculty@xyz.edu');
  const login = await college('/login', { method: 'POST', body: { email: 'faculty@xyz.edu', password: passwordIn(staffEmail) } });
  assert.equal(login.status, 200);
  assert.equal((await college(`/staff/${S.xyzStaffId}`, { method: 'DELETE', token: S.xyz.token })).status, 200);
  assert.equal((await college('/me', { token: login.body.token })).status, 401);

  await call(`/api/admin/colleges/${S.xyz.id}`, { method: 'PATCH', token: S.owner, body: { status: 'suspended' } });
  assert.equal((await college('/me', { token: S.xyz.token })).body.code, 'COLLEGE_CLOSED');
  await call(`/api/admin/colleges/${S.xyz.id}`, { method: 'PATCH', token: S.owner, body: { status: 'active' } });
  assert.equal((await college('/me', { token: S.xyz.token })).status, 200);
});

test('after the contract ends: read-only for 30 days, students lose Pro, then closed', async () => {
  const day = 864e5;
  await models.College.updateOne({ _id: S.abc.id }, { 'contract.endsAt': new Date(Date.now() - 2 * day) });
  assert.equal(await isPro('riya@gmail.com'), false);
  assert.equal((await college('/students', { token: S.abc.token })).status, 200);
  const write = await college('/settings', { method: 'PATCH', token: S.abc.token, body: { minAtsScore: 50 } });
  assert.equal(write.body.code, 'COLLEGE_READ_ONLY');

  await models.College.updateOne({ _id: S.abc.id }, { 'contract.endsAt': new Date(Date.now() - 31 * day) });
  assert.equal((await college('/students', { token: S.abc.token })).body.code, 'COLLEGE_CLOSED');
});

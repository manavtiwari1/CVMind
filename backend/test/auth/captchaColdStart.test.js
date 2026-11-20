import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import crypto from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';

// After a quiet spell the host stops the server, and the next visitor wakes it up. The database
// connects a few seconds after the first requests arrive, so a captcha drawn in that window is kept
// in the server's memory, while the sign-in that follows arrives once the database is up. That
// sign-in used to fail with "Captcha verification failed" even with the right code.
const onTidb = process.env.TEST_DATABASE === 'tidb';

let mongod;
let server;
let base;
let mongoose;
let dbPort;
let ensureMongoConnection;
let createUser;

const freePort = () => new Promise((resolve) => {
  const probe = net.createServer().listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});

before(async () => {
  if (onTidb) return;
  dbPort = await freePort();
  // Nothing listens on this port yet, so the app starts while its database is unreachable
  process.env.MONGODB_URI = `mongodb://127.0.0.1:${dbPort}/cvmind_captcha_cold_test`;
  process.env.NODE_ENV = 'test';
  process.env.RESEND_API_KEY = '';
  // Every captcha code becomes "AAAAA", so the test knows the answer to a code kept in memory
  crypto.randomInt = () => 0;

  mongoose = (await import('mongoose')).default;
  const app = (await import('../../src/index.js')).default;
  ({ ensureMongoConnection, createUser } = await import('../../src/db.js'));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

test('a captcha drawn while the database is still connecting works once it has connected', { skip: onTidb && 'starts a MongoDB server late, which the TiDB test setup cannot do' }, async () => {
  assert.notEqual(mongoose.connection.readyState, 1, 'the database is not up yet');
  const [kept, other] = await Promise.all([call('/api/auth/captcha'), call('/api/auth/captcha')]);
  assert.equal(kept.status, 200);
  assert.equal(other.status, 200);

  mongod = await MongoMemoryServer.create({ instance: { port: dbPort, launchTimeout: 60000 } });
  // The first connection attempt may have given up while nothing was listening; the app tries again
  const deadline = Date.now() + 30000;
  while (mongoose.connection.readyState !== 1) {
    assert.ok(Date.now() < deadline, 'the database connected');
    await ensureMongoConnection();
    await new Promise((r) => setTimeout(r, 100));
  }

  const bcrypt = (await import('bcryptjs')).default;
  const email = 'early-riser@example.com';
  const password = 'right-password';
  await createUser({ email, name: 'Early Riser', password: await bcrypt.hash(password, 10), isGoogleUser: false });
  const login = (captchaId, captchaAnswer) => call('/api/auth/login', { method: 'POST', body: { email, password, captchaId, captchaAnswer } });

  const signedIn = await login(kept.body.captchaId, 'AAAAA');
  assert.equal(signedIn.status, 200, signedIn.body?.error);
  assert.ok(signedIn.body.user.token);

  const reused = await login(kept.body.captchaId, 'AAAAA');
  assert.equal(reused.status, 400, 'each code works once');
  assert.equal(reused.body.captchaFailed, true);

  const wrong = await login(other.body.captchaId, 'BBBBB');
  assert.equal(wrong.status, 400, 'a code kept in memory still has to be typed right');
  assert.equal(wrong.body.captchaFailed, true);
});

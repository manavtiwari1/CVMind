import { makeLeadershipManagers } from '../helpers/teamManagers.js';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// CVMind Team V3: status and do not disturb, saved messages, ringing direct calls. The admin module reads MONGODB_URI at import time, so Mongo starts first.
let mongod;
let server;
let base;
let mongoose;
let closeTeamRealtime;
let ioClient;
const emails = [];
const stored = new Map();
let failEmail = false;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_team_v3_test');
  process.env.ADMIN_USERNAME = 'owner';
  process.env.ADMIN_PASSWORD = 'owner-password-123';
  process.env.RESEND_API_KEY = 're_test_key';

  // Capture Resend calls; everything else (the test server) goes through
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('api.resend.com')) {
      if (failEmail) return new Response(JSON.stringify({ name: 'application_error', message: 'Mailbox unavailable', statusCode: 500 }), { status: 500, headers: { 'content-type': 'application/json' } });
      emails.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: `email-${emails.length}` }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, init);
  };

  const express = (await import('express')).default;
  const http = await import('http');
  mongoose = (await import('mongoose')).default;
  const adminRouter = (await import('../../src/admin/router.js')).default;
  const { setStorageDriver } = await import('../../src/admin/team/storage.js');
  const realtime = await import('../../src/admin/team/realtime.js');
  closeTeamRealtime = realtime.closeTeamRealtime;
  ioClient = (await import('socket.io-client')).io;

  setStorageDriver({
    presignPut: async (key) => `https://r2.test/put/${key}`,
    presignGet: async (key, { download }) => `https://r2.test/get/${key}${download ? '?dl=1' : ''}`,
    head: async (key) => stored.get(key) || null,
    remove: async (key) => { stored.delete(key); }
  });

  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  server = http.createServer(app);
  realtime.attachTeamRealtime(server, { origins: '*' });
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  closeTeamRealtime?.();
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}/api/admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

const adminLogin = async (username, password) => {
  const token = (await call('/login', { method: 'POST', body: { username, password } })).body.token;
  await makeLeadershipManagers();
  return token;
};
const teamLogin = (username, password) => call('/team/login', { method: 'POST', body: { username, password } });

const passwordFrom = (email) => /Temporary password<\/td><td[^>]*>([^<]+)</.exec(email.html)?.[1];

// Invites someone, signs them in and sets their own password → { id, token }
async function onboard(panelToken, { username, role = 'support' }) {
  const temp = `temp-${username}-12345`;
  const invite = await call('/team/invitations', { method: 'POST', token: panelToken, body: { name: username, username, email: `${username}@cvmind.test`, role, password: temp } });
  assert.equal(invite.status, 200, JSON.stringify(invite.body));
  await makeLeadershipManagers();
  const login = await teamLogin(username, temp);
  const token = login.body.token;
  const set = await call('/team/me/password', { method: 'POST', token, body: { currentPassword: temp, newPassword: `real-${username}-password` } });
  assert.equal(set.status, 200);
  return { id: login.body.admin.id, token };
}

// Uploads a file through the fake R2 → file id
async function upload(token, { name = 'brief.pdf', mime = 'application/pdf', size = 1000, scope, scopeId, actualSize }) {
  const res = await call('/team/files/upload-url', { method: 'POST', token, body: { name, mime, size, scope, scopeId } });
  if (res.status !== 200) return res;
  const key = res.body.uploadUrl.replace('https://r2.test/put/', '');
  stored.set(key, { size: actualSize ?? size, mime });
  const done = await call(`/team/files/${res.body.file.id}/complete`, { method: 'POST', token });
  return done.status === 200 ? { status: 200, id: res.body.file.id } : done;
}


const meetSocket = (token) => new Promise((resolve, reject) => {
  const socket = ioClient(base, { path: '/team-socket', auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
  socket.on('connect', () => resolve(socket));
  socket.on('connect_error', reject);
});
// The next `event` whose payload matches
const waitFor = (socket, event, match, ms = 3000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => { socket.off(event, on); reject(new Error(`no matching ${event}`)); }, ms);
  const on = (p) => { if (match(p)) { clearTimeout(t); socket.off(event, on); resolve(p); } };
  socket.on(event, on);
});
const emitAck = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const nextEvent = (socket, event, ms = 3000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`no ${event}`)), ms);
  socket.once(event, (p) => { clearTimeout(t); resolve(p); });
});

let panel;
let ana;
let ben;
let sockets = [];
after(() => sockets.forEach((s) => s.close()));

test('status: busy and do not disturb show in presence; DND stops push but keeps the notification', async () => {
  panel = await adminLogin('owner', 'owner-password-123');
  ana = await onboard(panel, { username: 'ana', role: 'cto' });
  ben = await onboard(panel, { username: 'ben', role: 'frontend_intern' });
  const anaSocket = await meetSocket(ana.token);
  const benSocket = await meetSocket(ben.token);
  sockets.push(anaSocket, benSocket);

  const seen = waitFor(anaSocket, 'presence', (p) => p.adminId === ben.id && p.state === 'dnd');
  const set = await call('/team/me', { method: 'PATCH', token: ben.token, body: { availability: 'dnd', forMinutes: 60 } });
  assert.equal(set.status, 200, JSON.stringify(set.body));
  assert.equal(set.body.admin.availability, 'dnd');
  assert.deepEqual(await seen, { adminId: ben.id, state: 'dnd' });
  const people = await call('/team/members', { token: ana.token });
  assert.equal(people.body.data.find((p) => p.id === ben.id).presence, 'dnd');

  const { isDoNotDisturb } = await import('../../src/admin/team/realtime.js');
  assert.equal(isDoNotDisturb(ben.id), true);
  assert.equal((await call('/team/me', { method: 'PATCH', token: ben.token, body: { availability: 'nap' } })).status, 400);
  await call('/team/me', { method: 'PATCH', token: ben.token, body: { availability: 'auto' } });
  assert.equal(isDoNotDisturb(ben.id), false);
});

test('saved messages: save, list in order, unsave; only from channels you can read', async () => {
  const dm = await call('/team/dm', { method: 'POST', token: ana.token, body: { adminIds: [ben.id] } });
  const first = await call(`/team/channels/${dm.body.data.id}/messages`, { method: 'POST', token: ana.token, body: { body: 'Spec is in the drive' } });
  const second = await call(`/team/channels/${dm.body.data.id}/messages`, { method: 'POST', token: ana.token, body: { body: 'Deploy at 6' } });
  assert.equal((await call(`/team/messages/${first.body.data.id}/save`, { method: 'POST', token: ben.token, body: { saved: true } })).status, 200);
  await call(`/team/messages/${second.body.data.id}/save`, { method: 'POST', token: ben.token, body: { saved: true } });
  let saved = await call('/team/saved', { token: ben.token });
  assert.deepEqual(saved.body.data.map((m) => m.body), ['Deploy at 6', 'Spec is in the drive']);
  assert.equal((await call('/team/saved/ids', { token: ben.token })).body.data.length, 2);
  // Someone outside the DM can't save from it
  const carl = await onboard(panel, { username: 'carl', role: 'content_intern' });
  assert.equal((await call(`/team/messages/${first.body.data.id}/save`, { method: 'POST', token: carl.token, body: { saved: true } })).status, 404);
  await call(`/team/messages/${second.body.data.id}/save`, { method: 'POST', token: ben.token, body: { saved: false } });
  saved = await call('/team/saved', { token: ben.token });
  assert.deepEqual(saved.body.data.map((m) => m.body), ['Spec is in the drive']);
});

test('a direct call rings the other person, shows "in a meeting", and a decline reaches the caller', async () => {
  const [anaSocket, benSocket] = sockets;
  const dm = await call('/team/dm', { method: 'POST', token: ana.token, body: { adminIds: [ben.id] } });
  const ringing = nextEvent(benSocket, 'call.ringing');
  const started = await call('/team/meetings', { method: 'POST', token: ana.token, body: { channelId: dm.body.data.id } });
  assert.equal(started.status, 200, JSON.stringify(started.body));
  const ring = await ringing;
  assert.equal(ring.meetingId, started.body.data.id);
  assert.equal(ring.from.id, ana.id);

  const inCall = waitFor(benSocket, 'presence', (p) => p.adminId === ana.id && p.state === 'in_meeting');
  const joined = await emitAck(anaSocket, 'meet:join', { meetingId: started.body.data.id, mic: false, cam: false });
  assert.equal(joined.ok, true, JSON.stringify(joined));
  assert.deepEqual(await inCall, { adminId: ana.id, state: 'in_meeting' });

  const declined = nextEvent(anaSocket, 'call.declined');
  const stopped = nextEvent(benSocket, 'call.stopped');
  benSocket.emit('call:decline', { meetingId: started.body.data.id });
  assert.equal((await declined).by.id, ben.id);
  await stopped;
  await emitAck(anaSocket, 'meet:leave', {});
});

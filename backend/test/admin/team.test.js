import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';

// CVMind Team (team.cvmind.in). The admin module reads MONGODB_URI at import time, so Mongo starts first.
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
  process.env.MONGODB_URI = mongod.getUri('cvmind_team_test');
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

const adminLogin = async (username, password) => (await call('/login', { method: 'POST', body: { username, password } })).body.token;
const teamLogin = (username, password) => call('/team/login', { method: 'POST', body: { username, password } });

const passwordFrom = (email) => /Temporary password<\/td><td[^>]*>([^<]+)</.exec(email.html)?.[1];

// Invites someone, signs them in and sets their own password → { id, token }
async function onboard(panelToken, { username, role = 'support' }) {
  const temp = `temp-${username}-12345`;
  const invite = await call('/team/invitations', { method: 'POST', token: panelToken, body: { name: username, username, email: `${username}@cvmind.test`, role, password: temp } });
  assert.equal(invite.status, 200, JSON.stringify(invite.body));
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

let ownerPanel;
let owner;
let riya;
let aman;
let priya;

test('an invitation creates the account, emails the sign-in details, and forces a new password', async () => {
  ownerPanel = await adminLogin('owner', 'owner-password-123');
  owner = await onboard(ownerPanel, { username: 'founder', role: 'ceo' });

  const invite = await call('/team/invitations', { method: 'POST', token: ownerPanel, body: { name: 'Riya', username: 'riya', email: 'riya@cvmind.test', role: 'cmo', password: 'riya-temp-pass-1' } });
  assert.equal(invite.status, 200);
  assert.equal(invite.body.data.status, 'sent');

  const mail = emails.at(-1);
  assert.deepEqual(mail.to, ['riya@cvmind.test']);
  assert.match(mail.html, /team\.cvmind\.in/);
  assert.equal(passwordFrom(mail), 'riya-temp-pass-1');

  // A team token can't open the admin panel, and an unchanged password blocks the app
  const login = await teamLogin('riya@cvmind.test', 'riya-temp-pass-1');
  assert.equal(login.status, 200);
  assert.equal(login.body.admin.mustChangePassword, true);
  assert.equal((await call('/me', { token: login.body.token })).status, 401);
  const blocked = await call('/team/channels', { token: login.body.token });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'TEAM_SET_PASSWORD');

  const set = await call('/team/me/password', { method: 'POST', token: login.body.token, body: { currentPassword: 'riya-temp-pass-1', newPassword: 'riya-own-password' } });
  assert.equal(set.status, 200);
  riya = { id: login.body.admin.id, token: login.body.token };
  assert.equal((await call('/team/channels', { token: riya.token })).status, 200);

  const list = await call('/team/invitations', { token: ownerPanel });
  assert.equal(list.body.data.find((i) => i.username === 'riya').status, 'accepted');
});

test('a failed email keeps the account, and resend rotates the password', async () => {
  failEmail = true;
  const invite = await call('/team/invitations', { method: 'POST', token: ownerPanel, body: { name: 'Aman', username: 'aman', email: 'aman@cvmind.test', role: 'content', password: 'aman-temp-pass-1' } });
  failEmail = false;
  assert.equal(invite.body.data.status, 'failed');
  assert.match(invite.body.data.lastError, /Mailbox unavailable/);

  const resent = await call(`/team/invitations/${invite.body.data.id}/resend`, { method: 'POST', token: ownerPanel });
  assert.equal(resent.body.data.status, 'sent');
  const newPassword = passwordFrom(emails.at(-1));
  assert.ok(newPassword && newPassword !== 'aman-temp-pass-1');
  assert.equal((await teamLogin('aman', 'aman-temp-pass-1')).status, 401);
  const login = await teamLogin('aman', newPassword);
  assert.equal(login.status, 200);
  await call('/team/me/password', { method: 'POST', token: login.body.token, body: { currentPassword: newPassword, newPassword: 'aman-own-password' } });
  aman = { id: login.body.admin.id, token: login.body.token };

  priya = await onboard(ownerPanel, { username: 'priya', role: 'support' });
});

test('owner and admin are no longer offered for invites; only full-access people invite leadership', async () => {
  const roles = (await call('/team/invitations', { token: ownerPanel })).body.roles;
  assert.ok(roles.ceo && roles.cmo && roles.cto && roles.content_intern);
  assert.equal(roles.owner, undefined);
  assert.equal(roles.admin, undefined);
  assert.equal((await call('/team/invitations', { method: 'POST', token: ownerPanel, body: { name: 'O', username: 'new-owner', email: 'o@cvmind.test', role: 'owner', password: 'owner-pass-12345' } })).status, 400);

  // An Admin (made in Team & roles) manages the workspace but can't create leadership
  await call('/team', { method: 'POST', token: ownerPanel, body: { name: 'Sam', username: 'sam', email: 'sam@cvmind.test', role: 'admin', password: 'sam-password-123' } });
  const sam = (await teamLogin('sam', 'sam-password-123')).body.token;
  const res = await call('/team/invitations', { method: 'POST', token: sam, body: { name: 'X', username: 'sneaky', email: 'x@cvmind.test', role: 'ceo', password: 'sneaky-pass-123' } });
  assert.equal(res.status, 403);
  const samRoles = (await call('/team/invitations', { token: sam })).body.roles;
  assert.equal(samRoles.ceo, undefined, 'leadership roles are hidden from people who cannot invite them');
  const member = await call('/team/invitations', { method: 'POST', token: aman.token, body: { name: 'Y', username: 'y-user', email: 'y@cvmind.test', role: 'support', password: 'y-pass-12345' } });
  assert.equal(member.status, 403, 'members cannot invite');
});

test('leadership roles have full access to the admin panel and manage the workspace', async () => {
  const me = await call('/me', { token: await adminLogin('riya', 'riya-own-password') });
  assert.equal(me.body.admin.roleLabel, 'Chief Management Officer');
  assert.ok(me.body.admin.permissions.includes('team.manage'));
  assert.ok(me.body.admin.permissions.includes('teamchat.manage'));
});

test('team-only roles use CVMind Team but never the admin panel', async () => {
  const intern = await onboard(ownerPanel, { username: 'neha', role: 'content_intern' });
  assert.equal((await call('/team/channels', { token: intern.token })).status, 200);
  const panelLogin = await call('/login', { method: 'POST', body: { username: 'neha', password: 'real-neha-password' } });
  assert.equal(panelLogin.status, 403);
  assert.equal(panelLogin.body.code, 'TEAM_ONLY');
  assert.equal(panelLogin.body.token, undefined);
  const members = await call('/team/members', { token: intern.token });
  const me = members.body.data.find((p) => p.id === intern.id);
  assert.equal(me.roleLabel, 'Content Writing Intern');
  assert.equal(me.manager, false);
  // Interns receive tasks but can't create any, not even for themselves
  assert.equal((await call('/team/tasks', { method: 'POST', token: intern.token, body: { title: 'x', assigneeIds: [owner.id] } })).status, 403);
  assert.equal((await call('/team/tasks', { method: 'POST', token: intern.token, body: { title: 'my own', assigneeIds: [intern.id] } })).status, 403);
  const assigned = await call('/team/tasks', { method: 'POST', token: owner.token, body: { title: 'Intern work', assigneeIds: [intern.id] } });
  assert.equal(assigned.status, 200);
  const file = await upload(intern.token, { scope: 'task', scopeId: assigned.body.data.id });
  assert.equal((await call(`/team/tasks/${assigned.body.data.id}/submissions`, { method: 'POST', token: intern.token, body: { note: 'Done', fileIds: [file.id] } })).status, 200, 'interns can still submit work');
});

test('revoking an unaccepted invitation turns the account off', async () => {
  const invite = await call('/team/invitations', { method: 'POST', token: ownerPanel, body: { name: 'Temp', username: 'temp', email: 'temp@cvmind.test', role: 'viewer', password: 'temp-pass-1234' } });
  const revoked = await call(`/team/invitations/${invite.body.data.id}`, { method: 'DELETE', token: ownerPanel });
  assert.equal(revoked.body.data.status, 'revoked');
  assert.equal((await teamLogin('temp', 'temp-pass-1234')).status, 401);
});

let marketing;
test('private channels and DMs stay private', async () => {
  const created = await call('/team/channels', { method: 'POST', token: riya.token, body: { name: 'Marketing', kind: 'private', memberIds: [priya.id] } });
  assert.equal(created.status, 200);
  marketing = created.body.data;
  assert.equal(marketing.name, 'marketing');

  // Aman isn't a member: the channel is invisible, its messages 404, and he can't post
  const amanList = await call('/team/channels', { token: aman.token });
  assert.ok(!amanList.body.data.some((c) => c.id === marketing.id));
  assert.ok(amanList.body.data.some((c) => c.name === 'general'));
  assert.equal((await call(`/team/channels/${marketing.id}/messages`, { token: aman.token })).status, 404);
  assert.equal((await call(`/team/channels/${marketing.id}/messages`, { method: 'POST', token: aman.token, body: { body: 'hi' } })).status, 404);
  assert.equal((await call('/team/channels', { method: 'POST', token: aman.token, body: { name: 'mine' } })).status, 403);

  // A DM between Aman and Priya: Riya (a manager) can't read it
  const dm = await call('/team/dm', { method: 'POST', token: aman.token, body: { adminIds: [priya.id] } });
  const again = await call('/team/dm', { method: 'POST', token: priya.token, body: { adminIds: [aman.id] } });
  assert.equal(dm.body.data.id, again.body.data.id, 'the same people reopen the same DM');
  await call(`/team/channels/${dm.body.data.id}/messages`, { method: 'POST', token: aman.token, body: { body: 'secret plan' } });
  assert.equal((await call(`/team/channels/${dm.body.data.id}/messages`, { token: riya.token })).status, 404);
  const search = await call('/team/search?q=secret', { token: riya.token });
  assert.equal(search.body.messages.length, 0);
  const priyaNotes = await call('/team/notifications', { token: priya.token });
  assert.ok(priyaNotes.body.data.some((n) => n.type === 'dm'));
});

test('mentions notify, threads count replies, reactions toggle', async () => {
  const general = (await call('/team/channels', { token: riya.token })).body.data.find((c) => c.name === 'general');
  const sent = await call(`/team/channels/${general.id}/messages`, { method: 'POST', token: riya.token, body: { body: 'Hey @aman can you check the banner?' } });
  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body.data.mentions, [aman.id]);
  const notes = await call('/team/notifications', { token: aman.token });
  assert.ok(notes.body.data.some((n) => n.type === 'mention' && n.refId === sent.body.data.id));

  const reply = await call(`/team/channels/${general.id}/messages`, { method: 'POST', token: aman.token, body: { body: 'On it', parentId: sent.body.data.id } });
  assert.equal(reply.status, 200);
  const thread = await call(`/team/messages/${sent.body.data.id}/replies`, { token: riya.token });
  assert.equal(thread.body.parent.replyCount, 1);
  assert.equal(thread.body.data[0].body, 'On it');
  const riyaNotes = await call('/team/notifications', { token: riya.token });
  assert.ok(riyaNotes.body.data.some((n) => n.type === 'thread_reply'));

  const r1 = await call(`/team/messages/${sent.body.data.id}/reactions`, { method: 'POST', token: aman.token, body: { emoji: '👍' } });
  assert.equal(r1.body.reacted, true);
  let msg = await call(`/team/messages/${sent.body.data.id}`, { token: riya.token });
  assert.deepEqual(msg.body.data.reactions, [{ emoji: '👍', adminIds: [aman.id] }]);
  await call(`/team/messages/${sent.body.data.id}/reactions`, { method: 'POST', token: aman.token, body: { emoji: '👍' } });
  msg = await call(`/team/messages/${sent.body.data.id}`, { token: riya.token });
  assert.deepEqual(msg.body.data.reactions, []);

  // Only the author edits; a manager can delete (moderation is audited)
  assert.equal((await call(`/team/messages/${sent.body.data.id}`, { method: 'PATCH', token: aman.token, body: { body: 'x' } })).status, 403);
  assert.equal((await call(`/team/messages/${reply.body.data.id}`, { method: 'DELETE', token: priya.token })).status, 403);
  assert.equal((await call(`/team/messages/${reply.body.data.id}`, { method: 'DELETE', token: riya.token })).status, 200);
  const audit = await call('/audit?action=teamchat.message_moderated', { token: ownerPanel });
  assert.equal(audit.body.data.length, 1);
});

test('history pages never repeat or skip a message', async () => {
  const { TeamMessage } = await import('../../src/admin/team/models.js');
  const channel = await call('/team/channels', { method: 'POST', token: riya.token, body: { name: 'history' } });
  const id = channel.body.data.id;
  await TeamMessage.insertMany(Array.from({ length: 120 }, (_, i) => ({ channelId: id, authorId: riya.id, body: `m${i}` })));
  const seen = [];
  let before = '';
  for (let page = 0; page < 5; page++) {
    const res = await call(`/team/channels/${id}/messages${before ? `?before=${before}` : ''}`, { token: riya.token });
    seen.push(...res.body.data.map((m) => m.body));
    if (!res.body.hasMore) break;
    before = res.body.data.at(-1).id;
  }
  assert.equal(seen.length, 120);
  assert.equal(new Set(seen).size, 120);
  assert.equal(seen[0], 'm119');
});

test('uploads check type and size, and files only open for people who can see them', async () => {
  assert.equal((await upload(priya.token, { name: 'run.exe', mime: 'application/x-msdownload', scope: 'channel', scopeId: marketing.id })).status, 400);
  assert.equal((await upload(priya.token, { name: 'big.pdf', size: 21 * 1024 * 1024, scope: 'channel', scopeId: marketing.id })).status, 400);
  assert.equal((await upload(priya.token, { name: 'fake.pdf', mime: 'image/png', scope: 'channel', scopeId: marketing.id })).status, 400, 'extension must match type');
  const mismatch = await upload(priya.token, { name: 'brief.pdf', size: 1000, actualSize: 30 * 1024 * 1024, scope: 'channel', scopeId: marketing.id });
  assert.equal(mismatch.status, 400, 'a bigger file than declared is rejected after upload');
  assert.equal((await upload(aman.token, { scope: 'channel', scopeId: marketing.id })).status, 404, 'no uploads into channels you cannot see');

  const ok = await upload(priya.token, { name: 'Brief.pdf', size: 19 * 1024 * 1024, scope: 'channel', scopeId: marketing.id });
  assert.equal(ok.status, 200);
  const sent = await call(`/team/channels/${marketing.id}/messages`, { method: 'POST', token: priya.token, body: { body: 'Brief attached', fileIds: [ok.id] } });
  assert.equal(sent.body.data.files[0].name, 'Brief.pdf');
  // The same file can't be attached twice
  assert.equal((await call(`/team/channels/${marketing.id}/messages`, { method: 'POST', token: priya.token, body: { fileIds: [ok.id] } })).status, 400);

  assert.equal((await call(`/team/files/${ok.id}`, { token: riya.token })).status, 200);
  assert.equal((await call(`/team/files/${ok.id}`, { token: aman.token })).status, 404);
  const amanMedia = await call('/team/media', { token: aman.token });
  assert.ok(!amanMedia.body.data.some((f) => f.id === ok.id));
  const priyaMedia = await call('/team/media?type=pdf', { token: priya.token });
  assert.ok(priyaMedia.body.data.some((f) => f.id === ok.id));
});

test('assign with @-tags, submit, request changes, resubmit and approve', async () => {
  // Members plan only their own work
  assert.equal((await call('/team/tasks', { method: 'POST', token: aman.token, body: { title: 'x', assigneeIds: [priya.id] } })).status, 403);

  const created = await call('/team/tasks', { method: 'POST', token: riya.token, body: { title: 'Write blog on ATS tips', description: 'cc @priya', assigneeIds: [aman.id], priority: 'high', dueAt: new Date(Date.now() - 60_000).toISOString() } });
  assert.equal(created.status, 200);
  const task = created.body.data;
  const amanNotes = (await call('/team/notifications', { token: aman.token })).body.data;
  assert.ok(amanNotes.some((n) => n.type === 'task_assigned' && n.taskId === task.id));
  // Priya was mentioned but isn't on the task, so she gets nothing that leaks it
  const priyaNotes = (await call('/team/notifications', { token: priya.token })).body.data;
  assert.ok(!priyaNotes.some((n) => n.taskId === task.id));
  assert.equal((await call(`/team/tasks/${task.id}`, { token: priya.token })).status, 404);

  // An assignee can't approve their own work
  assert.equal((await call(`/team/tasks/${task.id}`, { method: 'PATCH', token: aman.token, body: { status: 'approved' } })).status, 403);
  assert.equal((await call(`/team/tasks/${task.id}`, { method: 'PATCH', token: aman.token, body: { status: 'in_progress' } })).status, 200);

  assert.equal((await call(`/team/tasks/${task.id}/submissions`, { method: 'POST', token: aman.token, body: { note: 'no file' } })).status, 400);
  const v1file = await upload(aman.token, { name: 'ats-tips.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', scope: 'task', scopeId: task.id });
  const v1 = await call(`/team/tasks/${task.id}/submissions`, { method: 'POST', token: aman.token, body: { note: 'Draft', fileIds: [v1file.id] } });
  assert.equal(v1.status, 200);
  assert.equal(v1.body.data.version, 1);
  assert.equal(v1.body.data.late, true);
  const riyaNotes = (await call('/team/notifications', { token: riya.token })).body.data;
  assert.ok(riyaNotes.some((n) => n.type === 'submission' && n.taskId === task.id));

  assert.equal((await call(`/team/submissions/${v1.body.data.id}/review`, { method: 'POST', token: aman.token, body: { decision: 'approve' } })).status, 403);
  assert.equal((await call(`/team/submissions/${v1.body.data.id}/review`, { method: 'POST', token: riya.token, body: { decision: 'changes' } })).status, 400, 'changes need a comment');
  const changes = await call(`/team/submissions/${v1.body.data.id}/review`, { method: 'POST', token: riya.token, body: { decision: 'changes', comment: 'Add 2 examples' } });
  assert.equal(changes.body.data.review.status, 'changes_requested');

  const v2file = await upload(aman.token, { name: 'ats-tips-v2.pdf', scope: 'task', scopeId: task.id });
  const v2 = await call(`/team/tasks/${task.id}/submissions`, { method: 'POST', token: aman.token, body: { note: 'Added examples', fileIds: [v2file.id] } });
  assert.equal(v2.body.data.version, 2);
  // The old version can't be reviewed any more
  assert.equal((await call(`/team/submissions/${v1.body.data.id}/review`, { method: 'POST', token: riya.token, body: { decision: 'approve' } })).status, 400);
  const approved = await call(`/team/submissions/${v2.body.data.id}/review`, { method: 'POST', token: riya.token, body: { decision: 'approve' } });
  assert.equal(approved.status, 200);

  const detail = await call(`/team/tasks/${task.id}`, { token: aman.token });
  assert.equal(detail.body.data.status, 'approved');
  assert.ok(detail.body.data.completedAt);
  assert.deepEqual(detail.body.submissions.map((s) => s.version), [2, 1]);
  assert.deepEqual(detail.body.activity.map((a) => a.type), ['created', 'status', 'submitted', 'changes_requested', 'submitted', 'approved']);
  const audit = await call('/audit?action=teamchat.submission_reviewed', { token: ownerPanel });
  assert.equal(audit.body.data.length, 2);

  const mine = await call('/team/tasks?view=mine&status=approved', { token: aman.token });
  assert.ok(mine.body.data.some((t) => t.id === task.id));
});

test('a task made from a message links back and posts in its thread', async () => {
  const general = (await call('/team/channels', { token: riya.token })).body.data.find((c) => c.name === 'general');
  const msg = await call(`/team/channels/${general.id}/messages`, { method: 'POST', token: priya.token, body: { body: 'We need LinkedIn banners by Monday' } });
  const task = await call('/team/tasks', { method: 'POST', token: riya.token, body: { title: 'Design LinkedIn banners', assigneeIds: [priya.id], sourceMessageId: msg.body.data.id } });
  assert.equal(task.body.data.sourceMessageId, msg.body.data.id);
  const thread = await call(`/team/messages/${msg.body.data.id}/replies`, { token: priya.token });
  assert.equal(thread.body.data[0].kind, 'system');
  assert.equal(thread.body.data[0].taskId, task.body.data.id);
  const detail = await call(`/team/tasks/${task.body.data.id}`, { token: priya.token });
  assert.equal(detail.body.source.excerpt, 'We need LinkedIn banners by Monday');
});

test('announcements reach everyone and track acknowledgements', async () => {
  const before = emails.length;
  assert.equal((await call('/team/announcements', { method: 'POST', token: aman.token, body: { title: 'x', body: 'y' } })).status, 403);
  const posted = await call('/team/announcements', { method: 'POST', token: ownerPanel, body: { title: 'Office closed on Diwali', body: 'Enjoy the holidays.', important: true, pinned: true } });
  assert.equal(posted.status, 200, 'the admin panel can post');
  const id = posted.body.data.id;
  await new Promise((r) => setTimeout(r, 200));
  assert.ok(emails.length > before, 'important announcements are emailed');
  assert.ok((await call('/team/notifications', { token: aman.token })).body.data.some((n) => n.type === 'announcement'));

  await call(`/team/announcements/${id}/ack`, { method: 'POST', token: aman.token });
  await call(`/team/announcements/${id}/ack`, { method: 'POST', token: aman.token });
  const acks = await call(`/team/announcements/${id}/acks`, { token: riya.token });
  assert.equal(acks.body.data.find((a) => a.adminId === aman.id).ackedAt !== null, true);
  assert.equal(acks.body.data.find((a) => a.adminId === priya.id).ackedAt, null);
  const list = await call('/team/announcements', { token: aman.token });
  assert.equal(list.body.data[0].acked, true);
});

test('sockets need a valid team session and only join channels the person can read', async () => {
  const connect = (token) => new Promise((resolve) => {
    const socket = ioClient(base, { path: '/team-socket', auth: { token }, transports: ['websocket'], reconnection: false });
    socket.on('connect', () => resolve({ socket, ok: true }));
    socket.on('connect_error', () => resolve({ socket, ok: false }));
  });

  const bad = await connect('not-a-token');
  assert.equal(bad.ok, false);
  bad.socket.close();
  const panelToken = await connect(ownerPanel);
  assert.equal(panelToken.ok, false, 'admin panel tokens do not open the team socket');
  panelToken.socket.close();

  const { socket, ok } = await connect(aman.token);
  assert.equal(ok, true);
  const watch = await new Promise((resolve) => socket.emit('channel:watch', { channelId: marketing.id }, resolve));
  assert.equal(watch.ok, false);

  // Live delivery to a member
  const priyaSocket = (await connect(priya.token)).socket;
  const got = new Promise((resolve) => priyaSocket.on('message.created', resolve));
  await new Promise((r) => setTimeout(r, 100));
  await call(`/team/channels/${marketing.id}/messages`, { method: 'POST', token: riya.token, body: { body: 'live?' } });
  const event = await got;
  assert.equal(event.channelId, marketing.id);

  // Removing access closes their sockets and blocks the API
  const closed = new Promise((resolve) => socket.on('disconnect', resolve));
  await call(`/team/access/${aman.id}`, { method: 'PATCH', token: ownerPanel, body: { chatAccess: false } });
  await closed;
  const denied = await call('/team/channels', { token: aman.token });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, 'TEAM_NO_ACCESS');
  priyaSocket.close();
});

test('the admin panel can moderate channel messages but never sees DMs', async () => {
  const general = (await call('/team/channels', { token: riya.token })).body.data.find((c) => c.name === 'general');
  const msg = await call(`/team/channels/${general.id}/messages`, { method: 'POST', token: priya.token, body: { body: 'oops, customer phone 98xxxx' } });
  const feed = await call('/team/moderation', { token: ownerPanel });
  assert.ok(feed.body.data.some((m) => m.id === msg.body.data.id));
  assert.ok(!feed.body.data.some((m) => m.body === 'secret plan'), 'DMs never show up in moderation');
  assert.equal((await call(`/team/moderation/messages/${msg.body.data.id}`, { method: 'DELETE', token: ownerPanel, body: { reason: 'customer data' } })).status, 200);
  const after = await call(`/team/messages/${msg.body.data.id}`, { token: priya.token });
  assert.ok(after.body.data.deletedAt);
  assert.equal(after.body.data.body, '');
  // A team member's token can't use the moderation routes
  assert.equal((await call('/team/moderation', { token: priya.token })).status, 403);
});

test('people edit their own profile', async () => {
  const res = await call('/team/me', { method: 'PATCH', token: priya.token, body: { name: 'Priya Nair', statusText: 'On leave till Friday', notifyEmail: false } });
  assert.equal(res.status, 200);
  assert.equal(res.body.admin.statusText, 'On leave till Friday');
  assert.equal((await call('/team/me', { method: 'PATCH', token: priya.token, body: { email: 'aman@cvmind.test' } })).status, 409, 'emails stay unique');
  assert.equal((await call('/team/me', { method: 'PATCH', token: priya.token, body: { email: 'not-an-email' } })).status, 400);
  const changed = await call('/team/me', { method: 'PATCH', token: priya.token, body: { email: 'Priya.Nair@CVMind.test' } });
  assert.equal(changed.body.admin.email, 'priya.nair@cvmind.test');
  assert.equal((await teamLogin('priya.nair@cvmind.test', 'real-priya-password')).status, 200, 'can sign in with the new email');
  const members = await call('/team/members', { token: riya.token });
  assert.equal(members.body.data.find((p) => p.id === priya.id).name, 'Priya Nair');
  // The admin panel's own team routes still work alongside
  assert.equal((await call('/team', { token: ownerPanel })).status, 200);
});

test('the owner can switch their own title to CEO without losing access', async () => {
  const me = (await call('/me', { token: ownerPanel })).body.admin;
  assert.equal((await call(`/team/${me.id}`, { method: 'PATCH', token: ownerPanel, body: { role: 'support' } })).status, 400, 'never below full access');
  const res = await call(`/team/${me.id}`, { method: 'PATCH', token: ownerPanel, body: { role: 'ceo' } });
  assert.equal(res.status, 200);
  // Same access, so the current session keeps working
  assert.equal((await call('/me', { token: ownerPanel })).body.admin.roleLabel, 'Chief Executive Officer');
  // Signing in again with the .env credentials keeps the CEO title
  const again = await adminLogin('owner', 'owner-password-123');
  assert.equal((await call('/me', { token: again })).body.admin.role, 'ceo');
});

test('overview counts for the admin panel', async () => {
  const res = await call('/team/overview', { token: ownerPanel });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.members >= 4);
  assert.ok(res.body.data.files >= 1);
  assert.equal((await call('/team/overview', { token: priya.token })).status, 403);
});

let kabir;
// priya is staff (support); new sign-ins are kept to one because of the login rate limit
test('checklists: assignees tick items, interns cannot add them', async () => {
  const staff = priya;
  const panel = await adminLogin('owner', 'owner-password-123');
  const intern = await onboard(panel, { username: 'kabir', role: 'frontend_intern' });
  kabir = intern;
  const other = await call('/team/tasks', { method: 'POST', token: riya.token, body: { title: 'Not yours', assigneeIds: [staff.id], checklist: ['One'] } });
  const created = await call('/team/tasks', { method: 'POST', token: riya.token, body: { title: 'Landing page', assigneeIds: [intern.id, staff.id], checklist: ['Hero', ' ', 'Footer'] } });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const task = created.body.data;
  assert.deepEqual(task.checklist.map((c) => c.text), ['Hero', 'Footer']);

  const ticked = await call(`/team/tasks/${task.id}/checklist/${task.checklist[0].id}`, { method: 'PATCH', token: intern.token, body: { done: true } });
  assert.equal(ticked.status, 200);
  assert.equal(ticked.body.data.checklist[0].done, true);
  assert.equal(ticked.body.data.checklist[0].doneBy, intern.id);

  assert.equal((await call(`/team/tasks/${task.id}/checklist`, { method: 'POST', token: intern.token, body: { text: 'Extra' } })).status, 403);
  assert.equal((await call(`/team/tasks/${task.id}/checklist/${task.checklist[1].id}`, { method: 'DELETE', token: intern.token })).status, 403);
  assert.equal((await call(`/team/tasks/${task.id}/checklist`, { method: 'POST', token: staff.token, body: { text: 'Mobile layout' } })).status, 200, 'staff assignees can add items');
  // Someone not on the task can't see it, so can't tick it either
  const o = other.body.data;
  assert.equal((await call(`/team/tasks/${o.id}/checklist/${o.checklist[0].id}`, { method: 'PATCH', token: intern.token, body: { done: true } })).status, 404);

  const detail = await call(`/team/tasks/${task.id}`, { token: riya.token });
  assert.ok(detail.body.activity.some((a) => a.type === 'checklist_done'));
  assert.equal((await call(`/team/tasks/${task.id}`, { method: 'PATCH', token: intern.token, body: { recurrence: { freq: 'daily' } } })).status, 403);
});

test('a repeating task makes its next copy when the due date passes, and stopping it stops the series', async () => {
  const { spawnRecurringTasks, nextDue } = await import('../../src/admin/team/recurring.js');
  assert.equal(nextDue('2026-01-31T12:00:00Z', 'monthly').toISOString(), '2026-02-28T12:00:00.000Z');

  assert.equal((await call('/team/tasks', { method: 'POST', token: riya.token, body: { title: 'No date', assigneeIds: [priya.id], recurrence: { freq: 'daily' } } })).status, 400);
  const due = new Date(Date.now() - 60_000);
  const created = await call('/team/tasks', { method: 'POST', token: riya.token, body: { title: 'Daily report', assigneeIds: [priya.id], dueAt: due.toISOString(), recurrence: { freq: 'daily' }, checklist: ['Numbers'] } });
  assert.equal(created.status, 200);
  const first = created.body.data;
  await call(`/team/tasks/${first.id}/checklist/${first.checklist[0].id}`, { method: 'PATCH', token: priya.token, body: { done: true } });

  const run = await spawnRecurringTasks();
  assert.equal(run.spawned, 1);
  assert.equal((await spawnRecurringTasks()).spawned, 0, 'a copy is made only once');

  const copies = (await call('/team/tasks?view=mine&status=&limit=100', { token: priya.token })).body.data.filter((t) => t.title === 'Daily report');
  assert.equal(copies.length, 2);
  const copy = copies.find((t) => t.id !== first.id);
  assert.equal(copy.recurrenceOf, first.id);
  assert.equal(copy.checklist[0].done, false, 'the checklist starts fresh');
  assert.equal(new Date(copy.dueAt).getTime(), due.getTime() + 24 * 60 * 60 * 1000);

  // Stopping the copy stops the series
  const stopped = await call(`/team/tasks/${copy.id}`, { method: 'PATCH', token: riya.token, body: { recurrence: null } });
  assert.equal(stopped.status, 200);
  assert.equal(stopped.body.data.recurrence, null);
  assert.equal((await call(`/team/tasks/${first.id}`, { token: riya.token })).body.data.recurrence, null);
});

test('the calendar loads tasks due in a date range', async () => {
  const at = new Date('2030-05-15T06:00:00Z');
  await call('/team/tasks', { method: 'POST', token: riya.token, body: { title: 'May launch', assigneeIds: [priya.id], dueAt: at.toISOString() } });
  const may = await call('/team/tasks?view=all&status=&from=2030-05-01T00:00:00Z&to=2030-06-01T00:00:00Z', { token: riya.token });
  assert.deepEqual(may.body.data.map((t) => t.title), ['May launch']);
  const june = await call('/team/tasks?view=all&status=&from=2030-06-01T00:00:00Z&to=2030-07-01T00:00:00Z', { token: riya.token });
  assert.equal(june.body.data.length, 0);
});

test('daily check-in: one per day, blockers reach managers, managers see everyone', async () => {
  const first = await call('/team/checkin', { method: 'PUT', token: priya.token, body: { done: 'Replied to tickets', doing: 'Refund emails' } });
  assert.equal(first.status, 200);
  const again = await call('/team/checkin', { method: 'PUT', token: priya.token, body: { done: 'Replied to tickets', doing: 'Refund emails', blockers: 'Need access to Razorpay' } });
  assert.equal(again.body.data.id, first.body.data.id, 'posting again updates the same check-in');
  assert.equal((await call('/team/checkin', { method: 'PUT', token: priya.token, body: { blockers: 'only blockers' } })).status, 400);

  const mine = await call('/team/checkin', { token: priya.token });
  assert.equal(mine.body.data.blockers, 'Need access to Razorpay');
  const riyaNotes = (await call('/team/notifications', { token: riya.token })).body.data;
  assert.ok(riyaNotes.some((n) => n.type === 'standup_blocker' && n.preview === 'Need access to Razorpay'));

  assert.equal((await call('/team/checkins', { token: priya.token })).status, 403, 'members only see their own');
  const day = await call('/team/checkins', { token: riya.token });
  assert.ok(day.body.data.some((s) => s.adminId === priya.id));
  assert.ok(!day.body.missing.includes(priya.id));
  assert.ok(day.body.missing.includes(riya.id));

  assert.equal((await call(`/team/checkins/history?adminId=${riya.id}`, { token: priya.token })).status, 403);
  assert.equal((await call('/team/checkins/history', { token: priya.token })).body.data.length, 1);
});

test('leave: members request, another manager decides, managers\' own leave is approved', async () => {
  const { istDay } = await import('../../src/admin/team/notify.js');
  const today = istDay();
  const later = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const asked = await call('/team/leaves', { method: 'POST', token: priya.token, body: { from: later, to: later, kind: 'casual', reason: 'Family function' } });
  assert.equal(asked.status, 200);
  assert.equal(asked.body.data.status, 'pending');
  assert.equal((await call('/team/leaves', { method: 'POST', token: priya.token, body: { from: later, to: later, kind: 'sick' } })).status, 400, 'no overlapping requests');
  assert.ok((await call('/team/notifications', { token: riya.token })).body.data.some((n) => n.type === 'leave_requested'));

  assert.equal((await call(`/team/leaves/${asked.body.data.id}/review`, { method: 'POST', token: priya.token, body: { decision: 'approve' } })).status, 403);
  assert.equal((await call('/team/leaves?scope=team', { token: priya.token })).status, 403);
  const approved = await call(`/team/leaves/${asked.body.data.id}/review`, { method: 'POST', token: riya.token, body: { decision: 'approve', comment: 'Enjoy' } });
  assert.equal(approved.body.data.status, 'approved');
  assert.ok((await call('/team/notifications', { token: priya.token })).body.data.some((n) => n.type === 'leave_approved'));
  assert.equal((await call(`/team/leaves/${asked.body.data.id}`, { method: 'DELETE', token: priya.token })).status, 400, 'approved leave is not cancelled by the member');

  // The CEO is off sick today: approved straight away, and can't review their own
  const own = await call('/team/leaves', { method: 'POST', token: owner.token, body: { from: today, to: today, kind: 'sick' } });
  assert.equal(own.body.data.status, 'approved');
  assert.equal((await call(`/team/leaves/${own.body.data.id}/review`, { method: 'POST', token: owner.token, body: { decision: 'cancel' } })).status, 403);
});

test('the 10:30 reminder skips people who checked in or are on leave; attendance shows it', async () => {
  const { istDay, isWorkingDay, sendStandupReminders } = await import('../../src/admin/team/notify.js');
  const today = istDay();
  const before = (await call('/team/notifications', { token: riya.token })).body.data.filter((n) => n.type === 'standup_reminder').length;
  const run = await sendStandupReminders();
  if (isWorkingDay(today)) {
    assert.ok(run.reminded >= 1);
    assert.equal((await call('/team/notifications', { token: riya.token })).body.data.filter((n) => n.type === 'standup_reminder').length, before + 1);
    assert.ok(!(await call('/team/notifications', { token: priya.token })).body.data.some((n) => n.type === 'standup_reminder'), 'checked in');
    assert.ok(!(await call('/team/notifications', { token: owner.token })).body.data.some((n) => n.type === 'standup_reminder'), 'on sick leave');
  } else {
    assert.equal(run.reminded, 0, 'no reminder on Sunday');
  }

  const grid = await call(`/team/attendance?month=${today.slice(0, 7)}`, { token: riya.token });
  assert.equal(grid.status, 200);
  const col = grid.body.days.findIndex((d) => d.day === today);
  assert.equal(grid.body.people.find((p) => p.id === priya.id).cells[col], 'present');
  assert.equal(grid.body.people.find((p) => p.id === owner.id).cells[col], 'sick');
  assert.equal((await call('/team/attendance', { token: priya.token })).status, 403);
});

test('browser push: reaches each device, respects the setting, and forgets dead devices', async () => {
  const { setPushSender } = await import('../../src/admin/team/push.js');
  const { pushSettled } = await import('../../src/admin/team/notify.js');
  const sent = [];
  let fail = null;
  setPushSender(async (subscription, body) => {
    if (fail) throw Object.assign(new Error('gone'), { statusCode: fail });
    sent.push({ endpoint: subscription.endpoint, ...JSON.parse(body) });
  });

  assert.equal((await call('/team/push/key', { token: priya.token })).body.enabled, false, 'off without VAPID keys');
  process.env.VAPID_PUBLIC_KEY = 'test-public-key';
  process.env.VAPID_PRIVATE_KEY = 'test-private-key';
  try {
    assert.equal((await call('/team/push/key', { token: priya.token })).body.publicKey, 'test-public-key');
    assert.equal((await call('/team/push/subscribe', { method: 'POST', token: priya.token, body: { subscription: { endpoint: 'http://insecure' } } })).status, 400);
    const device = { endpoint: 'https://push.test/priya-phone', keys: { p256dh: 'p', auth: 'a' } };
    assert.equal((await call('/team/push/subscribe', { method: 'POST', token: priya.token, body: { subscription: device } })).status, 200);

    const task = await call('/team/tasks', { method: 'POST', token: riya.token, body: { title: 'Push me', assigneeIds: [priya.id] } });
    await pushSettled();
    const msg = sent.find((m) => m.endpoint === device.endpoint);
    assert.ok(msg, 'pushed to the phone');
    assert.match(msg.title, /assigned you a task/);
    assert.equal(msg.body, 'Push me');
    assert.equal(msg.url, `#/tasks/${task.body.data.id}`);

    // Turned off in Profile → nothing is sent
    await call('/team/me', { method: 'PATCH', token: priya.token, body: { notifyPush: false } });
    sent.length = 0;
    await call('/team/tasks', { method: 'POST', token: riya.token, body: { title: 'Quiet', assigneeIds: [priya.id] } });
    await pushSettled();
    assert.equal(sent.length, 0);

    // A device the push service no longer knows is removed
    await call('/team/me', { method: 'PATCH', token: priya.token, body: { notifyPush: true } });
    fail = 410;
    await call('/team/tasks', { method: 'POST', token: riya.token, body: { title: 'Gone', assigneeIds: [priya.id] } });
    await pushSettled();
    const mongooseLib = (await import('mongoose')).default;
    assert.equal(await mongooseLib.model('TeamPushSubscription').countDocuments({ endpoint: device.endpoint }), 0);
  } finally {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  }
});

test('Leo summarises what you can read, drafts tasks for staff, reports for managers, and has a daily limit', async () => {
  const { setLeoModel } = await import('../../src/admin/team/routes/leo.js');
  const prompts = [];
  setLeoModel(async ({ prompt, systemInstruction }) => {
    prompts.push(prompt);
    if (/Turn a chat message into one clear task/.test(systemInstruction)) return { title: 'Fix the pricing page', description: 'Update the Pro price', priority: 'high', dueAt: '2099-01-01T18:00:00+05:30', assignees: ['@priya', 'nobody'] };
    if (/progress report/.test(systemInstruction)) return { headline: 'Steady week', highlights: ['Closed tickets'], concerns: [], suggestions: ['Keep going'] };
    return { summary: 'They discussed pricing.', decisions: ['Pro stays at 299'], actionItems: [{ text: 'Update the page', owner: '@priya' }], openQuestions: [] };
  });
  try {
    const channels = (await call('/team/channels', { token: riya.token })).body.data;
    const general = channels.find((c) => c.kind === 'public');
    const first = await call(`/team/channels/${general.id}/messages`, { method: 'POST', token: riya.token, body: { body: 'Pro plan price stays at 299' } });
    await call(`/team/channels/${general.id}/messages`, { method: 'POST', token: owner.token, body: { body: '@priya please update the pricing page by Friday' } });

    const summary = await call('/team/leo/summary', { method: 'POST', token: priya.token, body: { channelId: general.id } });
    assert.equal(summary.status, 200, JSON.stringify(summary.body));
    assert.equal(summary.body.data.summary, 'They discussed pricing.');
    assert.deepEqual(summary.body.data.actionItems, [{ text: 'Update the page', owner: 'priya' }]);
    assert.match(prompts.at(-1), /Pro plan price stays at 299/);

    // A DM between two other people stays private from Leo too
    const dm = await call('/team/dm', { method: 'POST', token: riya.token, body: { adminIds: [owner.id] } });
    assert.equal((await call('/team/leo/summary', { method: 'POST', token: priya.token, body: { channelId: dm.body.data.id } })).status, 404);

    // Drafts: staff get themselves as assignee, managers get the suggested people; interns can't
    const asStaff = await call('/team/leo/task-draft', { method: 'POST', token: priya.token, body: { messageId: first.body.data.id } });
    assert.equal(asStaff.status, 200);
    assert.deepEqual(asStaff.body.data.assigneeIds, [priya.id]);
    const asManager = await call('/team/leo/task-draft', { method: 'POST', token: riya.token, body: { messageId: first.body.data.id } });
    assert.deepEqual(asManager.body.data.assigneeIds, [priya.id], 'unknown usernames are dropped');
    assert.equal(asManager.body.data.priority, 'high');
    assert.equal((await call('/team/leo/task-draft', { method: 'POST', token: kabir.token, body: { messageId: first.body.data.id } })).status, 403);

    const report = await call(`/team/leo/report?adminId=${priya.id}`, { token: riya.token });
    assert.equal(report.status, 200);
    assert.equal(report.body.data.headline, 'Steady week');
    assert.equal(report.body.data.stats.checkIns, 1);
    assert.equal((await call(`/team/leo/report?adminId=${riya.id}`, { token: priya.token })).status, 403);

    // The 31st call of the day is refused
    const mongooseLib = (await import('mongoose')).default;
    const { istDay } = await import('../../src/admin/team/notify.js');
    await mongooseLib.model('TeamAiUsage').updateOne({ adminId: priya.id, day: istDay() }, { count: 30 });
    const limited = await call('/team/leo/summary', { method: 'POST', token: priya.token, body: { channelId: general.id } });
    assert.equal(limited.status, 429);
    assert.equal((await call('/team/leo/usage', { token: priya.token })).body.remaining, 0);
  } finally {
    setLeoModel(null);
  }
});

// ── Meetings ─────────────────────────────────────────────────────────────────
const meetSocket = (token) => new Promise((resolve, reject) => {
  const socket = ioClient(base, { path: '/team-socket', auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
  socket.on('connect', () => resolve(socket));
  socket.on('connect_error', reject);
});
const emitAck = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const nextEvent = (socket, event, ms = 3000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`no ${event}`)), ms);
  socket.once(event, (p) => { clearTimeout(t); resolve(p); });
});

test('only managers schedule meetings; invitees and managers can open them', async () => {
  const at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  assert.equal((await call('/team/meetings', { method: 'POST', token: priya.token, body: { title: 'Sync', scheduledAt: at, inviteeIds: [kabir.id] } })).status, 403);
  assert.equal((await call('/team/meetings', { method: 'POST', token: kabir.token, body: { title: 'Sync', scheduledAt: at, inviteeIds: [priya.id] } })).status, 403);

  const made = await call('/team/meetings', { method: 'POST', token: riya.token, body: { title: 'Design review', scheduledAt: at, durationMin: 45, inviteeIds: [kabir.id] } });
  assert.equal(made.status, 200, JSON.stringify(made.body));
  const m = made.body.data;
  assert.equal(m.status, 'scheduled');
  assert.ok((await call('/team/notifications', { token: kabir.token })).body.data.some((n) => n.type === 'meeting_scheduled' && n.refId === m.id));
  assert.ok((await call('/team/meetings?scope=upcoming', { token: kabir.token })).body.data.some((x) => x.id === m.id));
  assert.equal((await call(`/team/meetings/${m.id}`, { token: priya.token })).status, 404, 'not invited, not a manager');
  assert.equal((await call(`/team/meetings/${m.id}`, { token: owner.token })).status, 200, 'managers can open any meeting');
  assert.equal((await call(`/team/meetings/${m.id}`, { method: 'PATCH', token: kabir.token, body: { title: 'x' } })).status, 403);

  const moved = await call(`/team/meetings/${m.id}`, { method: 'PATCH', token: owner.token, body: { scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() } });
  assert.equal(moved.status, 200);
  const { sendMeetingReminders } = await import('../../src/admin/team/meetings.js');
  await sendMeetingReminders();
  assert.equal((await sendMeetingReminders()).reminded, 0, 'one reminder only');
  assert.ok((await call('/team/notifications', { token: kabir.token })).body.data.some((n) => n.type === 'meeting_soon'));
  assert.equal((await call(`/team/meetings/${m.id}/cancel`, { method: 'POST', token: riya.token })).body.data.status, 'cancelled');
});

test('a live meeting: join, relay setup, reactions, chat, captions, host controls, cap and end', async () => {
  const { setLeoModel } = await import('../../src/admin/team/routes/leo.js');
  const { notesSettled } = await import('../../src/admin/team/meetings.js');
  setLeoModel(async () => ({ summary: 'We agreed to ship Friday.', decisions: ['Ship Friday'], actionItems: [{ text: 'Write release notes', owner: 'priya' }], openQuestions: [] }));
  const sockets = [];
  try {
    const general = (await call('/team/channels', { token: priya.token })).body.data.find((c) => c.kind === 'public');
    const started = await call('/team/meetings', { method: 'POST', token: priya.token, body: { channelId: general.id } });
    assert.equal(started.status, 200, JSON.stringify(started.body));
    const meeting = started.body.data;
    assert.equal(meeting.status, 'live');
    assert.equal((await call('/team/meetings', { method: 'POST', token: riya.token, body: { channelId: general.id } })).body.data.id, meeting.id, 'one live meeting per channel');

    const ice = await call(`/team/meetings/${meeting.id}/ice`, { token: priya.token });
    assert.equal(ice.body.turn, false);
    assert.ok(ice.body.iceServers[0].urls[0].startsWith('stun:'));

    const p = await meetSocket(priya.token);
    const r = await meetSocket(riya.token);
    const k = await meetSocket(kabir.token);
    sockets.push(p, r, k);
    const pj = await emitAck(p, 'meet:join', { meetingId: meeting.id });
    assert.equal(pj.ok, true, JSON.stringify(pj));
    assert.equal(pj.hostId, priya.id);
    const joined = nextEvent(p, 'meet:peer-joined');
    const rj = await emitAck(r, 'meet:join', { meetingId: meeting.id });
    assert.equal(rj.peers.length, 1);
    assert.equal((await joined).adminId, riya.id);

    // Offers and answers go to one peer only
    const signal = nextEvent(p, 'meet:signal');
    r.emit('meet:signal', { to: pj.selfId, data: { type: 'offer', sdp: 'v=0' } });
    assert.deepEqual((await signal), { from: rj.selfId, data: { type: 'offer', sdp: 'v=0' } });

    const reaction = nextEvent(r, 'meet:reaction');
    p.emit('meet:reaction', { emoji: '🎉' });
    assert.equal((await reaction).emoji, '🎉');
    assert.equal((await emitAck(r, 'meet:chat', { body: 'Can everyone see my screen?' })).ok, true);
    p.emit('meet:caption', { text: 'Let us ship on Friday', final: true });
    await new Promise((res) => setTimeout(res, 150));
    assert.equal((await call(`/team/meetings/${meeting.id}/chat`, { token: priya.token })).body.data[0].body, 'Can everyone see my screen?');

    // Host controls: not for an intern; the host can remove someone, who then cannot come back
    const kj = await emitAck(k, 'meet:join', { meetingId: meeting.id });
    assert.equal(kj.ok, true);
    assert.equal((await emitAck(k, 'meet:host', { action: 'mute', target: pj.selfId })).ok, false);
    const removed = nextEvent(k, 'meet:removed');
    assert.equal((await emitAck(p, 'meet:host', { action: 'remove', target: kj.selfId })).ok, true);
    await removed;
    assert.equal((await emitAck(k, 'meet:join', { meetingId: meeting.id })).code, 'REMOVED');

    // Six at most (each browser counts)
    const extra = [];
    for (let i = 0; i < 4; i++) {
      const s = await meetSocket(owner.token);
      sockets.push(s);
      extra.push(await emitAck(s, 'meet:join', { meetingId: meeting.id }));
    }
    assert.ok(extra.every((x) => x.ok));
    const seventh = await meetSocket(owner.token);
    sockets.push(seventh);
    assert.equal((await emitAck(seventh, 'meet:join', { meetingId: meeting.id })).code, 'FULL');

    // The host leaves: the earliest manager (Riya) takes over
    const handover = nextEvent(r, 'meet:host');
    await emitAck(p, 'meet:leave', {});
    assert.equal((await handover).hostId, riya.id);

    // Riya ends it for everyone; Leo writes notes into the channel thread
    const ended = nextEvent(r, 'meet:ended');
    assert.equal((await emitAck(r, 'meet:host', { action: 'end' })).ok, true);
    await ended;
    await notesSettled();
    const after = (await call(`/team/meetings/${meeting.id}`, { token: priya.token })).body.data;
    assert.equal(after.status, 'ended');
    assert.equal(after.notes.status, 'ready');
    assert.deepEqual(after.notes.actionItems, [{ text: 'Write release notes', owner: 'priya' }]);
    assert.ok(after.participantIds.includes(kabir.id));
    assert.ok((await call('/team/notifications', { token: priya.token })).body.data.some((n) => n.type === 'meeting_notes'));
    const { body: channelHistory } = await call(`/team/channels/${general.id}/messages`, { token: priya.token });
    const parent = channelHistory.data.find((msg) => msg.meetingId === meeting.id);
    assert.ok(parent && parent.replyCount >= 2, 'ended and notes reply in the meeting thread');
  } finally {
    sockets.forEach((s) => s.close());
    setLeoModel(null);
  }
});

test('recordings: the host uploads, people who can open the meeting see it in Media', async () => {
  const general = (await call('/team/channels', { token: riya.token })).body.data.find((c) => c.kind === 'public');
  const meeting = (await call('/team/meetings', { method: 'POST', token: riya.token, body: { channelId: general.id } })).body.data;
  const bad = await upload(riya.token, { name: 'call.pdf', mime: 'application/pdf', scope: 'meeting', scopeId: meeting.id });
  assert.equal(bad.status, 400, 'only video');
  assert.equal((await upload(priya.token, { name: 'call.webm', mime: 'video/webm', size: 5_000_000, scope: 'meeting', scopeId: meeting.id })).status, 403, 'not the host');
  const big = await upload(riya.token, { name: 'call.webm', mime: 'video/webm', size: 2 * 1024 * 1024 * 1024, scope: 'meeting', scopeId: meeting.id });
  assert.equal(big.status, 400, 'over 1 GB');
  const file = await upload(riya.token, { name: 'call.webm', mime: 'video/webm', size: 300 * 1024 * 1024, scope: 'meeting', scopeId: meeting.id });
  assert.equal(file.status, 200, JSON.stringify(file.body));
  const saved = await call(`/team/meetings/${meeting.id}/recording`, { method: 'POST', token: riya.token, body: { fileId: file.id } });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.data.recordingFileIds, [file.id]);
  const media = await call('/team/media?type=video', { token: priya.token });
  assert.ok(media.body.data.some((f) => f.id === file.id));
  assert.equal((await call(`/team/files/${file.id}`, { token: priya.token })).status, 200);
  await call(`/team/meetings/${meeting.id}/end`, { method: 'POST', token: riya.token });
});

test('TURN credentials come from Cloudflare when configured', async () => {
  const { iceServers, setTurnFetch } = await import('../../src/admin/team/routes/meetings.js');
  process.env.CF_TURN_KEY_ID = 'key';
  process.env.CF_TURN_API_TOKEN = 'token';
  let asked = '';
  setTurnFetch(async (url) => { asked = url; return new Response(JSON.stringify({ iceServers: [{ urls: ['turn:turn.cloudflare.com:3478'], username: 'u', credential: 'c' }] }), { status: 200 }); });
  try {
    const out = await iceServers();
    assert.equal(out.turn, true);
    assert.match(asked, /turn\/keys\/key\/credentials\/generate-ice-servers/);
    assert.equal(out.iceServers.at(-1).username, 'u');
    setTurnFetch(async () => new Response('nope', { status: 500 }));
    assert.equal((await iceServers()).turn, false, 'falls back to STUN');
  } finally {
    delete process.env.CF_TURN_KEY_ID;
    delete process.env.CF_TURN_API_TOKEN;
    setTurnFetch(null);
  }
});

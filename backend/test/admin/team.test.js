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
  owner = await onboard(ownerPanel, { username: 'founder', role: 'owner' });

  const invite = await call('/team/invitations', { method: 'POST', token: ownerPanel, body: { name: 'Riya', username: 'riya', email: 'riya@cvmind.test', role: 'admin', password: 'riya-temp-pass-1' } });
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

test('only someone who manages the admin team can invite an owner or admin', async () => {
  // Riya is an Admin: she manages the workspace but not the admin team
  const res = await call('/team/invitations', { method: 'POST', token: riya.token, body: { name: 'X', username: 'sneaky', email: 'x@cvmind.test', role: 'owner', password: 'sneaky-pass-123' } });
  assert.equal(res.status, 403);
  const member = await call('/team/invitations', { method: 'POST', token: aman.token, body: { name: 'Y', username: 'y-user', email: 'y@cvmind.test', role: 'support', password: 'y-pass-12345' } });
  assert.equal(member.status, 403, 'members cannot invite');
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
  const members = await call('/team/members', { token: riya.token });
  assert.equal(members.body.data.find((p) => p.id === priya.id).name, 'Priya Nair');
  // The admin panel's own team routes still work alongside
  assert.equal((await call('/team', { token: ownerPanel })).status, 200);
});

test('overview counts for the admin panel', async () => {
  const res = await call('/team/overview', { token: ownerPanel });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.members >= 4);
  assert.ok(res.body.data.files >= 1);
  assert.equal((await call('/team/overview', { token: priya.token })).status, 403);
});

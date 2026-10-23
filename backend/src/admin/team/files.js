import crypto from 'crypto';
import { httpError, isId } from '../util.js';
import { canJoinMeeting, canSeeTask, channelFor, isManager, meetingFor, readableChannelIds, sameId, visibleMeetingFilter, visibleTaskFilter } from './access.js';
import { TeamFile, TeamMeeting, TeamTask } from './models.js';
import { removeObject, storageConfigured } from './storage.js';

const PENDING_TTL_MS = 60 * 60 * 1000;
const UNATTACHED_TTL_MS = 24 * 60 * 60 * 1000;

export const newFileKey = (name) => {
  const ext = String(name).split('.').pop().toLowerCase();
  return `team/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
};

export const publicFile = (f) => ({
  id: String(f._id),
  name: f.name,
  mime: f.mime,
  size: f.size,
  uploadedBy: String(f.uploadedBy),
  scope: f.scope,
  scopeId: f.scopeId ? String(f.scopeId) : null,
  attachedTo: f.attachedTo?.type ? { type: f.attachedTo.type, id: String(f.attachedTo.id) } : null,
  createdAt: f.createdAt
});

// Checks that the uploader can put a file in this scope (a channel they can write in, a task they can see)
export async function checkUploadScope(admin, scope, scopeId) {
  if (scope === 'channel') {
    await channelFor(admin, scopeId, { write: true });
  } else if (scope === 'task') {
    // No task id yet: files for a task being created
    if (!scopeId) return;
    if (!isId(scopeId)) throw httpError(404, 'Task not found.');
    const task = await TeamTask.findById(scopeId).lean();
    if (!task || !canSeeTask(admin, task)) throw httpError(404, 'Task not found.');
  } else if (scope === 'announcement') {
    if (!isManager(admin)) throw httpError(403, 'Only managers can post announcements.');
  } else if (scope === 'meeting') {
    // Recordings: the host's browser (or a manager's) uploads them
    const meeting = await meetingFor(admin, scopeId);
    if (!sameId(meeting.hostId, admin.id) && !isManager(admin)) throw httpError(403, 'Only the host can save a recording.');
  } else if (scope !== 'avatar') {
    throw httpError(400, 'Pick where the file is going.');
  }
}

// Ties uploaded files to the record they were sent with. Each file must be the caller's own,
// finished uploading, not used anywhere else yet, and uploaded for this same scope.
// Files for a task that doesn't exist yet are uploaded with no scopeId; pass setScopeId to fill it in.
export async function attachFiles(admin, fileIds, { scope, scopeId = null, type, id, setScopeId }, { max = 10 } = {}) {
  const ids = [...new Set((Array.isArray(fileIds) ? fileIds : []).map(String))].filter(isId);
  if (!ids.length) return [];
  if (ids.length > max) throw httpError(400, `Attach up to ${max} files.`);
  const files = await TeamFile.find({ _id: { $in: ids } }).lean();
  const ok = files.length === ids.length && files.every((f) => sameId(f.uploadedBy, admin.id) && f.status === 'ready'
    && !f.attachedTo?.type && f.scope === scope && String(f.scopeId || '') === String(scopeId || ''));
  if (!ok) throw httpError(400, 'One of the files is not ready or belongs somewhere else. Upload it again.');
  await TeamFile.updateMany({ _id: { $in: ids } }, { attachedTo: { type, id }, ...(setScopeId ? { scopeId: setScopeId } : {}) });
  return ids;
}

// Can this person open the file?
export async function canOpenFile(admin, file) {
  if (!file || file.status !== 'ready') return false;
  if (!file.attachedTo?.type) return sameId(file.uploadedBy, admin.id);
  if (file.scope === 'announcement' || file.scope === 'avatar') return true;
  if (file.scope === 'channel') {
    try {
      await channelFor(admin, file.scopeId);
      return true;
    } catch {
      return false;
    }
  }
  if (file.scope === 'task') {
    const task = await TeamTask.findById(file.scopeId).lean();
    return !!task && canSeeTask(admin, task);
  }
  if (file.scope === 'meeting') return canJoinMeeting(admin, await TeamMeeting.findById(file.scopeId).lean());
  return false;
}

// Mongo filter for every attached file this person can open (the media library)
export async function visibleFileFilter(admin) {
  const [channelIds, tasks, meetings] = await Promise.all([
    readableChannelIds(admin),
    TeamTask.find(visibleTaskFilter(admin), { _id: 1 }).lean(),
    visibleMeetingFilter(admin).then((f) => TeamMeeting.find(f, { _id: 1 }).lean())
  ]);
  return {
    status: 'ready',
    'attachedTo.type': { $ne: null },
    $or: [
      { scope: 'announcement' },
      { scope: 'channel', scopeId: { $in: channelIds } },
      { scope: 'task', scopeId: { $in: tasks.map((t) => t._id) } },
      { scope: 'meeting', scopeId: { $in: meetings.map((m) => m._id) } }
    ]
  };
}

export async function softDeleteFiles(ids) {
  if (!ids?.length) return;
  await TeamFile.updateMany({ _id: { $in: ids } }, { status: 'deleted', deletedAt: new Date() });
}

// Removes uploads that never finished, files never attached to anything, and deleted files after 30 days
export async function sweepPendingFiles(now = new Date()) {
  if (!storageConfigured()) return { removed: 0 };
  const stale = await TeamFile.find({
    $or: [
      { status: 'pending', createdAt: { $lt: new Date(now - PENDING_TTL_MS) } },
      { status: 'ready', 'attachedTo.type': null, createdAt: { $lt: new Date(now - UNATTACHED_TTL_MS) } },
      { status: 'deleted', deletedAt: { $lt: new Date(now - 30 * 24 * 60 * 60 * 1000) } }
    ]
  }).limit(500).lean();
  for (const f of stale) {
    await removeObject(f.key).catch(() => {});
    await TeamFile.deleteOne({ _id: f._id });
  }
  return { removed: stale.length };
}

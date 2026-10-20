import { publicFile } from './files.js';
import { TeamFile } from './models.js';

const str = (v) => (v ? String(v) : null);

// Loads every file referenced by a list of records in one query → Map(id → public file)
export async function filesFor(records) {
  const ids = records.flatMap((r) => r.fileIds || []);
  if (!ids.length) return new Map();
  const files = await TeamFile.find({ _id: { $in: ids }, status: 'ready' }).lean();
  return new Map(files.map((f) => [String(f._id), publicFile(f)]));
}

const pick = (ids, files) => (ids || []).map((id) => files.get(String(id))).filter(Boolean);

export function publicMessage(m, files = new Map()) {
  const deleted = !!m.deletedAt;
  return {
    id: String(m._id),
    channelId: String(m.channelId),
    authorId: String(m.authorId),
    body: deleted ? '' : m.body,
    kind: m.kind || 'user',
    parentId: str(m.parentId),
    replyCount: m.replyCount || 0,
    lastReplyAt: m.lastReplyAt || null,
    mentions: (m.mentions || []).map(String),
    reactions: deleted ? [] : (m.reactions || []).filter((r) => r.adminIds?.length).map((r) => ({ emoji: r.emoji, adminIds: r.adminIds.map(String) })),
    files: deleted ? [] : pick(m.fileIds, files),
    taskId: str(m.taskId),
    pinnedAt: m.pinnedAt || null,
    editedAt: m.editedAt || null,
    deletedAt: m.deletedAt || null,
    createdAt: m.createdAt
  };
}

export function publicTask(t, files = new Map()) {
  return {
    id: String(t._id),
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeIds: (t.assigneeIds || []).map(String),
    createdBy: String(t.createdBy),
    dueAt: t.dueAt || null,
    sourceMessageId: str(t.sourceMessageId),
    sourceChannelId: str(t.sourceChannelId),
    files: pick(t.fileIds, files),
    blockedReason: t.blockedReason || '',
    completedAt: t.completedAt || null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  };
}

export function publicSubmission(s, files = new Map()) {
  return {
    id: String(s._id),
    taskId: String(s.taskId),
    authorId: String(s.authorId),
    version: s.version,
    note: s.note,
    files: pick(s.fileIds, files),
    late: !!s.late,
    review: { status: s.review?.status || 'pending', by: str(s.review?.by), comment: s.review?.comment || '', at: s.review?.at || null },
    createdAt: s.createdAt
  };
}

export function publicComment(c, files = new Map()) {
  return { id: String(c._id), taskId: String(c.taskId), authorId: String(c.authorId), body: c.body, mentions: (c.mentions || []).map(String), files: pick(c.fileIds, files), createdAt: c.createdAt };
}

export function publicAnnouncement(a, adminId, files = new Map()) {
  return {
    id: String(a._id),
    title: a.title,
    body: a.body,
    important: !!a.important,
    pinned: !!a.pinned,
    files: pick(a.fileIds, files),
    createdBy: String(a.createdBy),
    ackCount: (a.acks || []).length,
    acked: (a.acks || []).some((x) => String(x.adminId) === String(adminId)),
    reactions: (a.reactions || []).filter((r) => r.adminIds?.length).map((r) => ({ emoji: r.emoji, adminIds: r.adminIds.map(String) })),
    editedAt: a.editedAt || null,
    createdAt: a.createdAt
  };
}

export function publicNotification(n) {
  return {
    id: String(n._id),
    type: n.type,
    actorId: str(n.actorId),
    refType: n.refType,
    refId: str(n.refId),
    channelId: str(n.channelId),
    taskId: str(n.taskId),
    preview: n.preview,
    readAt: n.readAt || null,
    createdAt: n.createdAt
  };
}

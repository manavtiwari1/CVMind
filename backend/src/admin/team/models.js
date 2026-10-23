import mongoose from 'mongoose';

const { Schema } = mongoose;
const Id = Schema.Types.ObjectId;

// CVMind Team (team.cvmind.in): the internal workspace for admin panel accounts.
// Every person reference is an AdminUser id.

export const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'submitted', 'changes_requested', 'approved'];
export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
export const TASK_REPEATS = ['daily', 'weekly', 'monthly'];

// Public and private channels have a unique name; DMs have a dmKey (the sorted member ids) instead
const channelSchema = new Schema({
  name: { type: String },
  description: { type: String, default: '' },
  kind: { type: String, enum: ['public', 'private', 'dm'], required: true },
  dmKey: { type: String },
  createdBy: { type: Id, default: null },
  lastMessageAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null }
}, { timestamps: true });
channelSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { name: { $type: 'string' } } });
channelSchema.index({ dmKey: 1 }, { unique: true, partialFilterExpression: { dmKey: { $type: 'string' } } });
export const TeamChannel = mongoose.models.TeamChannel || mongoose.model('TeamChannel', channelSchema);

const channelMemberSchema = new Schema({
  channelId: { type: Id, required: true },
  adminId: { type: Id, required: true },
  addedBy: { type: Id, default: null },
  lastReadAt: { type: Date, default: () => new Date() },
  muted: { type: Boolean, default: false }
}, { timestamps: true });
channelMemberSchema.index({ channelId: 1, adminId: 1 }, { unique: true });
channelMemberSchema.index({ adminId: 1 });
export const TeamChannelMember = mongoose.models.TeamChannelMember || mongoose.model('TeamChannelMember', channelMemberSchema);

const messageSchema = new Schema({
  channelId: { type: Id, required: true },
  authorId: { type: Id, required: true },
  body: { type: String, default: '' },
  // 'system' messages are written by the app, e.g. "Task created → …"
  kind: { type: String, enum: ['user', 'system'], default: 'user' },
  parentId: { type: Id, default: null },
  replyCount: { type: Number, default: 0 },
  lastReplyAt: { type: Date, default: null },
  mentions: [{ type: Id }],
  reactions: [{ _id: false, emoji: String, adminIds: [{ type: Id }] }],
  fileIds: [{ type: Id }],
  taskId: { type: Id, default: null },
  pinnedAt: { type: Date, default: null },
  pinnedBy: { type: Id, default: null },
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: Id, default: null }
}, { timestamps: true });
// History pages by _id (it grows with time), so a cursor never skips or repeats a message
messageSchema.index({ channelId: 1, parentId: 1, _id: -1 });
messageSchema.index({ parentId: 1, _id: 1 });
messageSchema.index({ channelId: 1, pinnedAt: -1 });
export const TeamMessage = mongoose.models.TeamMessage || mongoose.model('TeamMessage', messageSchema);

const announcementSchema = new Schema({
  title: { type: String, required: true },
  body: { type: String, default: '' },
  important: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  fileIds: [{ type: Id }],
  createdBy: { type: Id, required: true },
  acks: [{ _id: false, adminId: Id, at: Date }],
  reactions: [{ _id: false, emoji: String, adminIds: [{ type: Id }] }],
  editedAt: { type: Date, default: null }
}, { timestamps: true });
announcementSchema.index({ pinned: -1, createdAt: -1 });
export const TeamAnnouncement = mongoose.models.TeamAnnouncement || mongoose.model('TeamAnnouncement', announcementSchema);

const taskSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: TASK_STATUSES, default: 'todo' },
  priority: { type: String, enum: TASK_PRIORITIES, default: 'normal' },
  assigneeIds: [{ type: Id }],
  createdBy: { type: Id, required: true },
  dueAt: { type: Date, default: null },
  sourceMessageId: { type: Id, default: null },
  sourceChannelId: { type: Id, default: null },
  fileIds: [{ type: Id }],
  blockedReason: { type: String, default: '' },
  completedAt: { type: Date, default: null },
  // Set when the "due in 2 hours" reminder went out; cleared when the due date changes
  dueSoonNotifiedAt: { type: Date, default: null },
  checklist: [{
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
    doneBy: { type: Id, default: null },
    doneAt: { type: Date, default: null }
  }],
  // A repeating task: the next copy is made when this one's due date passes
  recurrence: {
    freq: { type: String, enum: [...TASK_REPEATS, null], default: null },
    until: { type: Date, default: null }
  },
  // The first task of a repeating series, and when this copy's successor was made
  recurrenceOf: { type: Id, default: null },
  nextSpawnedAt: { type: Date, default: null }
}, { timestamps: true });
taskSchema.index({ status: 1, dueAt: 1 });
taskSchema.index({ 'recurrence.freq': 1, nextSpawnedAt: 1, dueAt: 1 });
taskSchema.index({ assigneeIds: 1, status: 1 });
taskSchema.index({ createdBy: 1, updatedAt: -1 });
export const TeamTask = mongoose.models.TeamTask || mongoose.model('TeamTask', taskSchema);

const submissionSchema = new Schema({
  taskId: { type: Id, required: true },
  authorId: { type: Id, required: true },
  version: { type: Number, required: true },
  note: { type: String, default: '' },
  fileIds: [{ type: Id }],
  late: { type: Boolean, default: false },
  review: {
    status: { type: String, enum: ['pending', 'approved', 'changes_requested'], default: 'pending' },
    by: { type: Id, default: null },
    comment: { type: String, default: '' },
    at: { type: Date, default: null }
  }
}, { timestamps: true });
submissionSchema.index({ taskId: 1, version: 1 }, { unique: true });
export const TeamSubmission = mongoose.models.TeamSubmission || mongoose.model('TeamSubmission', submissionSchema);

const taskCommentSchema = new Schema({
  taskId: { type: Id, required: true },
  authorId: { type: Id, required: true },
  body: { type: String, default: '' },
  mentions: [{ type: Id }],
  fileIds: [{ type: Id }]
}, { timestamps: true });
taskCommentSchema.index({ taskId: 1, createdAt: 1 });
export const TeamTaskComment = mongoose.models.TeamTaskComment || mongoose.model('TeamTaskComment', taskCommentSchema);

// Who changed what on a task, shown as the task's activity log
const taskActivitySchema = new Schema({
  taskId: { type: Id, required: true },
  actorId: { type: Id, required: true },
  type: { type: String, required: true },
  from: { type: Schema.Types.Mixed, default: null },
  to: { type: Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now }
});
taskActivitySchema.index({ taskId: 1, createdAt: 1 });
export const TeamTaskActivity = mongoose.models.TeamTaskActivity || mongoose.model('TeamTaskActivity', taskActivitySchema);

// A file in R2. `scope` decides who can open it: a channel's readers, a task's people, everyone
// (announcements, avatars), or only the uploader until it's attached to something.
const fileSchema = new Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  mime: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: Id, required: true },
  scope: { type: String, enum: ['channel', 'task', 'announcement', 'avatar'], required: true },
  scopeId: { type: Id, default: null },
  attachedTo: {
    type: { type: String, enum: ['message', 'task', 'comment', 'submission', 'announcement', 'avatar', null], default: null },
    id: { type: Id, default: null }
  },
  status: { type: String, enum: ['pending', 'ready', 'deleted'], default: 'pending' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });
fileSchema.index({ status: 1, scope: 1, scopeId: 1, createdAt: -1 });
fileSchema.index({ uploadedBy: 1, createdAt: -1 });
export const TeamFile = mongoose.models.TeamFile || mongoose.model('TeamFile', fileSchema);

const notificationSchema = new Schema({
  adminId: { type: Id, required: true },
  type: { type: String, required: true },
  actorId: { type: Id, default: null },
  // What opening the notification shows
  refType: { type: String, default: '' },
  refId: { type: Id, default: null },
  channelId: { type: Id, default: null },
  taskId: { type: Id, default: null },
  preview: { type: String, default: '' },
  readAt: { type: Date, default: null },
  emailedAt: { type: Date, default: null }
}, { timestamps: true });
notificationSchema.index({ adminId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ readAt: 1, emailedAt: 1, createdAt: 1 });
export const TeamNotification = mongoose.models.TeamNotification || mongoose.model('TeamNotification', notificationSchema);

export const INVITE_STATUSES = ['sent', 'failed', 'accepted', 'revoked'];

const invitationSchema = new Schema({
  adminId: { type: Id, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  username: { type: String, default: '' },
  role: { type: String, required: true },
  invitedBy: { type: Id, default: null },
  invitedByName: { type: String, default: '' },
  status: { type: String, enum: INVITE_STATUSES, default: 'sent' },
  lastError: { type: String, default: '' },
  resendCount: { type: Number, default: 0 },
  sentAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null }
}, { timestamps: true });
invitationSchema.index({ status: 1, createdAt: -1 });
invitationSchema.index({ adminId: 1 });
export const TeamInvitation = mongoose.models.TeamInvitation || mongoose.model('TeamInvitation', invitationSchema);

// ── Daily check-ins and leave ────────────────────────────────────────────────
// `day` is the India date, "YYYY-MM-DD"
const standupSchema = new Schema({
  adminId: { type: Id, required: true },
  day: { type: String, required: true },
  done: { type: String, default: '' },
  doing: { type: String, default: '' },
  blockers: { type: String, default: '' }
}, { timestamps: true });
standupSchema.index({ adminId: 1, day: 1 }, { unique: true });
standupSchema.index({ day: 1 });
export const TeamStandup = mongoose.models.TeamStandup || mongoose.model('TeamStandup', standupSchema);

export const LEAVE_KINDS = ['casual', 'sick', 'wfh'];
export const LEAVE_STATUSES = ['pending', 'approved', 'declined', 'cancelled'];

const leaveSchema = new Schema({
  adminId: { type: Id, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  kind: { type: String, enum: LEAVE_KINDS, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: LEAVE_STATUSES, default: 'pending' },
  reviewedBy: { type: Id, default: null },
  reviewComment: { type: String, default: '' },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });
leaveSchema.index({ adminId: 1, from: 1 });
leaveSchema.index({ status: 1, from: 1 });
export const TeamLeave = mongoose.models.TeamLeave || mongoose.model('TeamLeave', leaveSchema);

import mongoose from 'mongoose';

const { Schema } = mongoose;

// Admin panel collections. The user-facing collections (User, Scan, Work, …) live in db.js.

// A team member who can sign in to the admin panel. The first owner is seeded from
// ADMIN_USERNAME / ADMIN_PASSWORD; everyone else is invited from the Team section.
const adminUserSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  email: { type: String, default: '', lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true },
  active: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
  // Bumped to sign this admin out everywhere (role change, deactivation, password reset)
  tokenVersion: { type: Number, default: 0 }
}, { timestamps: true });
export const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);

// One row per meaningful admin action
const adminAuditLogSchema = new Schema({
  actorId: { type: String, default: '' },
  actorName: { type: String, default: '' },
  actorRole: { type: String, default: '' },
  action: { type: String, required: true, index: true },
  targetType: { type: String, default: '' },
  targetId: { type: String, default: '' },
  targetLabel: { type: String, default: '' },
  details: { type: Schema.Types.Mixed, default: null },
  ip: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
});
export const AdminAuditLog = mongoose.models.AdminAuditLog || mongoose.model('AdminAuditLog', adminAuditLogSchema);

// Key/value app configuration (feature flags, maintenance, version gates)
const appSettingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, default: null },
  updatedBy: { type: String, default: '' }
}, { timestamps: true });
export const AppSetting = mongoose.models.AppSetting || mongoose.model('AppSetting', appSettingSchema);

// Support tickets. Messages sent through the contact form become tickets.
const ticketMessageSchema = new Schema({
  kind: { type: String, enum: ['customer', 'reply', 'note'], required: true },
  authorName: { type: String, default: '' },
  body: { type: String, required: true },
  emailed: { type: Boolean, default: false },
  // Message-ID of an email pulled from the support inbox, so it's never added twice
  messageId: { type: String, default: '' },
  attachments: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

export const TICKET_STATUSES = ['new', 'open', 'pending', 'resolved'];
export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const ticketSchema = new Schema({
  number: { type: Number, unique: true },
  name: { type: String, default: '' },
  email: { type: String, required: true, lowercase: true, trim: true },
  subject: { type: String, default: 'General inquiry' },
  status: { type: String, enum: TICKET_STATUSES, default: 'new', index: true },
  priority: { type: String, enum: TICKET_PRIORITIES, default: 'normal' },
  assigneeId: { type: String, default: '' },
  assigneeName: { type: String, default: '' },
  // The Contact document this ticket was created from, so the migration runs once
  contactId: { type: String, default: '' },
  // 'form' (contact form) or 'email' (support inbox)
  source: { type: String, default: 'form' },
  messages: [ticketMessageSchema],
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });
ticketSchema.index({ contactId: 1 }, { unique: true, partialFilterExpression: { contactId: { $gt: '' } } });
ticketSchema.index({ 'messages.messageId': 1 });
ticketSchema.index({ email: 1, updatedAt: -1 });
export const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

// An in-app notification. userId '' means broadcast; recipients list who it went to.
const notificationSchema = new Schema({
  title: { type: String, required: true },
  body: { type: String, default: '' },
  link: { type: String, default: '' },
  // 'all' or 'segment'. For a segment, userIds holds every recipient.
  audience: { type: String, enum: ['all', 'segment'], default: 'all' },
  segment: { type: Schema.Types.Mixed, default: null },
  userIds: { type: [String], default: [], index: true },
  channels: { type: [String], default: ['in-app'] },
  recipientCount: { type: Number, default: 0 },
  emailSent: { type: Number, default: 0 },
  emailFailed: { type: Number, default: 0 },
  readBy: { type: [String], default: [] },
  createdBy: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
});
export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

const couponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['percent', 'flat'], required: true },
  value: { type: Number, required: true },
  maxUses: { type: Number, default: 0 }, // 0 = unlimited
  perUserLimit: { type: Number, default: 1 }, // 0 = unlimited
  minAmount: { type: Number, default: 0 },
  validFrom: { type: Date, default: null },
  validTo: { type: Date, default: null },
  active: { type: Boolean, default: true },
  usedCount: { type: Number, default: 0 },
  redemptions: [{
    email: String,
    amount: Number,
    discount: Number,
    transactionId: String,
    at: { type: Date, default: Date.now }
  }],
  createdBy: { type: String, default: '' }
}, { timestamps: true });
export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

// Editable site content shown in fixed slots (announcement bar, home banner, promo strip, FAQ)
export const CONTENT_SLOTS = ['announcement', 'home-banner', 'promo', 'faq'];
const contentBlockSchema = new Schema({
  slot: { type: String, enum: CONTENT_SLOTS, required: true, index: true },
  title: { type: String, default: '' },
  body: { type: String, default: '' },
  ctaLabel: { type: String, default: '' },
  ctaUrl: { type: String, default: '' },
  tone: { type: String, enum: ['info', 'success', 'warning', 'promo'], default: 'info' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  updatedBy: { type: String, default: '' }
}, { timestamps: true });
export const ContentBlock = mongoose.models.ContentBlock || mongoose.model('ContentBlock', contentBlockSchema);

// A user report against a piece of content, or a manual flag raised by an admin
export const REPORT_TARGETS = ['work', 'job', 'problem', 'user'];
const contentReportSchema = new Schema({
  targetType: { type: String, enum: REPORT_TARGETS, required: true },
  targetId: { type: String, required: true },
  reason: { type: String, default: '' },
  details: { type: String, default: '' },
  reporterEmail: { type: String, default: '' },
  status: { type: String, enum: ['open', 'dismissed', 'actioned'], default: 'open', index: true },
  resolution: { type: String, default: '' },
  resolvedBy: { type: String, default: '' },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });
export const ContentReport = mongoose.models.ContentReport || mongoose.model('ContentReport', contentReportSchema);

// One signed-in device/browser for a user. The token carries the jti.
const userSessionSchema = new Schema({
  jti: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  email: { type: String, default: '' },
  provider: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  device: { type: String, default: '' },
  browser: { type: String, default: '' },
  os: { type: String, default: '' },
  ip: { type: String, default: '' },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: String, default: '' }
}, { timestamps: true });
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const UserSession = mongoose.models.UserSession || mongoose.model('UserSession', userSessionSchema);

export const ADMIN_MODELS = [AdminUser, AdminAuditLog, AppSetting, Ticket, Notification, Coupon, ContentBlock, ContentReport, UserSession];

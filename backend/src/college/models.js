import mongoose from 'mongoose';

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;
const register = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

// Placements portal (placements.cvmind.in). Every record below carries collegeId and is only ever
// read or written through the helpers in access.js, which take the college from the signed-in
// staff account, never from the request.

export const STUDENT_STATUSES = ['invited', 'joined', 'declined', 'removed', 'left'];
// A student can be on one college's roster at a time while invited or joined
export const ACTIVE_STUDENT_STATUSES = ['invited', 'joined'];
export const REVIEW_STATUSES = ['approved', 'changes_requested'];
export const STAFF_ROLES = ['admin', 'staff'];

const collegeSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  logo: { type: String, default: '' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  contract: {
    seats: { type: Number, default: 100, min: 0 },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true }
  },
  settings: {
    minAtsScore: { type: Number, default: 0, min: 0, max: 100 },
    minLinkedinScore: { type: Number, default: 0, min: 0, max: 100 },
    requireCollegeFormat: { type: Boolean, default: false }
  },
  createdBy: { type: String, default: '' }
}, { timestamps: true });

const staffSchema = new Schema({
  collegeId: { type: ObjectId, ref: 'College', required: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: STAFF_ROLES, default: 'staff' },
  active: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 },
  mustChangePassword: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
  lastSeenAt: { type: Date, default: null },
  createdBy: { type: String, default: '' }
}, { timestamps: true });

const studentSchema = new Schema({
  collegeId: { type: ObjectId, ref: 'College', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  rollNo: { type: String, default: '' },
  branch: { type: String, default: '' },
  batch: { type: String, default: '' },
  status: { type: String, enum: STUDENT_STATUSES, default: 'invited' },
  userId: { type: String, default: '', index: true },
  // sha256 of the single-use invite token; the raw token only exists in the email
  inviteTokenHash: { type: String, default: '' },
  inviteExpiresAt: { type: Date, default: null },
  invitedAt: { type: Date, default: null },
  inviteCount: { type: Number, default: 0 },
  inviteError: { type: String, default: '' },
  joinedAt: { type: Date, default: null },
  consentAt: { type: Date, default: null },
  endedAt: { type: Date, default: null }
}, { timestamps: true });
studentSchema.index({ collegeId: 1, status: 1, createdAt: -1 });
studentSchema.index({ collegeId: 1, email: 1 });
studentSchema.index({ inviteTokenHash: 1 }, { partialFilterExpression: { inviteTokenHash: { $type: 'string', $gt: '' } } });
// One active college per email: XYZ can't add a student who is already on ABC's roster
studentSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { status: { $in: ACTIVE_STUDENT_STATUSES } } });

const reviewSchema = new Schema({
  collegeId: { type: ObjectId, ref: 'College', required: true },
  studentId: { type: ObjectId, ref: 'CollegeStudent', required: true },
  workId: { type: String, required: true },
  // The resume version that was reviewed; a later edit makes the review stale
  workUpdatedAt: { type: Date, required: true },
  templateId: { type: String, default: '' },
  status: { type: String, enum: REVIEW_STATUSES, required: true },
  comments: [{
    by: { type: String, default: '' },
    byName: { type: String, default: '' },
    fromStudent: { type: Boolean, default: false },
    text: { type: String, required: true, maxlength: 2000 },
    at: { type: Date, default: Date.now }
  }],
  reviewerId: { type: ObjectId, ref: 'CollegeStaff' },
  reviewerName: { type: String, default: '' }
}, { timestamps: true });
reviewSchema.index({ collegeId: 1, workId: 1 }, { unique: true });
reviewSchema.index({ collegeId: 1, studentId: 1 });

const templateSchema = new Schema({
  collegeId: { type: ObjectId, ref: 'College', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  html: { type: String, required: true },
  active: { type: Boolean, default: true },
  createdBy: { type: String, default: '' }
}, { timestamps: true });

const auditSchema = new Schema({
  collegeId: { type: ObjectId, ref: 'College', required: true },
  actorId: { type: String, default: '' },
  actorName: { type: String, default: '' },
  // 'staff' (placements portal), 'cvmind' (admin panel) or 'student'
  actorType: { type: String, default: 'staff' },
  action: { type: String, required: true },
  targetId: { type: String, default: '' },
  targetLabel: { type: String, default: '' },
  details: { type: Schema.Types.Mixed, default: null },
  ip: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
auditSchema.index({ collegeId: 1, createdAt: -1 });

export const College = register('College', collegeSchema);
export const CollegeStaff = register('CollegeStaff', staffSchema);
export const CollegeStudent = register('CollegeStudent', studentSchema);
export const ResumeReview = register('ResumeReview', reviewSchema);
export const CollegeTemplate = register('CollegeTemplate', templateSchema);
export const CollegeAuditLog = register('CollegeAuditLog', auditSchema);

export const COLLEGE_MODELS = [College, CollegeStaff, CollegeStudent, ResumeReview, CollegeTemplate, CollegeAuditLog];

import mongoose from 'mongoose';

const { Schema } = mongoose;

export const RESUME_SOURCES = ['cvmind', 'upload'];
export const RESUME_STATUSES = ['queued', 'parsing', 'ready', 'failed'];

const bulletSchema = new Schema({ id: String, text: String }, { _id: false });

const structuredSchema = new Schema({
  contact: {
    name: String, email: String, phone: String, location: String, linkedin: String, github: String, portfolio: String
  },
  headline: String,
  summary: String,
  experience: [new Schema({
    id: String, company: String, title: String, employmentType: String, startDate: String, endDate: String,
    current: Boolean, location: String, skills: [String], bullets: [bulletSchema]
  }, { _id: false })],
  education: [new Schema({
    institution: String, degree: String, degreeLevel: String, field: String, endYear: String, gpa: String
  }, { _id: false })],
  skills: [new Schema({ name: String, normalized: String, category: String }, { _id: false })],
  projects: [new Schema({ id: String, name: String, skills: [String], bullets: [bulletSchema] }, { _id: false })],
  certifications: [new Schema({ name: String, issuer: String, year: String }, { _id: false })],
  languages: [String]
}, { _id: false });

// Canonical candidate profile the agent works from, for both CVMind-built and uploaded resumes
const resumeProfileSchema = new Schema({
  userId: { type: String, required: true },
  label: { type: String, default: 'My resume' },
  isDefault: { type: Boolean, default: false },
  source: { type: String, enum: RESUME_SOURCES, required: true },
  originalFileRef: {
    gridFsId: Schema.Types.ObjectId,
    filename: String,
    mimeType: String,
    size: Number,
    workId: String,
    workUpdatedAt: Date
  },
  // sha256 of the uploaded bytes or the CVMind resume HTML; unchanged sources are not re-parsed
  sourceHash: String,
  rawText: { type: String, select: false },
  status: { type: String, enum: RESUME_STATUSES, default: 'queued' },
  parseError: String,
  parseVersion: { type: Number, default: 0 },
  structured: { type: structuredSchema, default: null },
  derived: {
    totalYearsExperience: Number,
    seniority: String,
    normalizedSkillSet: [String]
  },
  // Set when the user edits the parsed data; re-parsing then requires force so edits aren't lost
  userEdited: { type: Boolean, default: false },
  editedAt: Date,
  embeddings: {
    embedModel: String,
    dims: Number,
    bullets: [new Schema({ bulletId: String, textHash: String, vector: Buffer }, { _id: false })]
  }
}, { timestamps: true });

resumeProfileSchema.index({ userId: 1, updatedAt: -1 });
resumeProfileSchema.index({ userId: 1, sourceHash: 1 });

const ResumeProfile = mongoose.models.ResumeProfile || mongoose.model('ResumeProfile', resumeProfileSchema);
export default ResumeProfile;

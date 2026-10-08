import mongoose from 'mongoose';

const { Schema } = mongoose;

export const JOB_POSTING_STATUSES = ['pending', 'parsing', 'ready', 'failed'];

// A job seen by the agent. Shared across users: the same link or pasted text is parsed once
const jobPostingSchema = new Schema({
  // sha256 of the normalized URL (links) or of the whitespace-normalized text (pasted descriptions)
  urlHash: String,
  contentHash: String,
  source: { type: String, enum: ['url', 'paste'], required: true },
  url: String,
  applyUrl: String,
  ats: { type: String, enum: ['greenhouse', 'lever', 'workday', 'unknown'], default: 'unknown' },
  atsIds: { boardToken: String, jobId: String, company: String, postingId: String, region: String },
  company: { name: String, key: String },
  title: String,
  location: String,
  workMode: String,
  employmentType: String,
  seniority: String,
  industry: String,
  salary: { type: new Schema({ min: Number, max: Number, currency: String, period: String }, { _id: false }), default: null },
  descriptionText: { type: String, select: false },
  responsibilities: [new Schema({ text: String, core: Boolean }, { _id: false })],
  requirements: {
    mustHaveSkills: [String],
    niceToHaveSkills: [String],
    normalizedMust: [String],
    normalizedNice: [String],
    minYearsExperience: { type: Number, default: null },
    educationLevel: { type: String, default: null },
    educationFields: [String],
    equivalentExperienceAccepted: Boolean,
    sponsorshipAvailable: String
  },
  atsQuestions: { type: Schema.Types.Mixed, default: [] },
  embeddings: {
    embedModel: String,
    dims: Number,
    title: Buffer,
    responsibilities: [new Schema({ idx: Number, vector: Buffer }, { _id: false })]
  },
  status: { type: String, enum: JOB_POSTING_STATUSES, default: 'pending' },
  parseError: String,
  parseVersion: { type: Number, default: 0 },
  fetchedAt: Date
}, { timestamps: true });

jobPostingSchema.index({ urlHash: 1 }, { unique: true, partialFilterExpression: { urlHash: { $type: 'string' } } });
jobPostingSchema.index({ contentHash: 1 }, { unique: true, partialFilterExpression: { contentHash: { $type: 'string' } } });

const JobPosting = mongoose.models.JobPosting || mongoose.model('JobPosting', jobPostingSchema);
export default JobPosting;

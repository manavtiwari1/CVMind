import mongoose from 'mongoose';

const { Schema } = mongoose;

// A job shown in Job Finder, kept for a week so the detail view and the apply record can rely on
// our copy instead of whatever the browser sends back
const finderJobSchema = new Schema({
  jobKey: { type: String, required: true, unique: true },
  source: { type: String, required: true }, // 'jsearch' | 'greenhouse' | 'lever' | 'cvmind'
  title: { type: String, required: true },
  company: { type: String, default: '' },
  companyDomain: { type: String, default: '' },
  companyLogo: { type: String, default: '' },
  location: { type: String, default: '' },
  remote: { type: Boolean, default: false },
  employmentType: { type: String, default: '' },
  postedAt: { type: Date, default: null },
  applyUrl: { type: String, default: '' },
  publisher: { type: String, default: '' },
  description: { type: String, default: '' },
  // CVMind Company Portal jobs are applied to inside CVMind
  cvmindJobId: { type: String, default: '' },
  companyId: { type: String, default: '' },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });
finderJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const FinderJob = mongoose.models.FinderJob || mongoose.model('FinderJob', finderJobSchema);

// One JSearch search, cached so the same search within the hour costs nothing
const jobSearchCacheSchema = new Schema({
  key: { type: String, required: true, unique: true },
  jobKeys: [String],
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 }
});
export const JobSearchCache = mongoose.models.JobSearchCache || mongoose.model('JobSearchCache', jobSearchCacheSchema);

// A job the account told Job Finder it applied to: the app asks after opening the company's page,
// and for a CVMind recruiter's job it's saved when the resume is sent. It answers "you already
// applied on …" and feeds Admin → AI Job Finder.
const jobApplyLogSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  userId: { type: String, default: '' },
  jobKey: { type: String, required: true },
  source: { type: String, default: '' },
  title: { type: String, default: '' },
  company: { type: String, default: '' },
  location: { type: String, default: '' },
  applyUrl: { type: String, default: '' },
  matchScore: { type: Number, default: null },
  // When this account first applied (createdAt, like the other feature logs Admin → Analytics reads)
  createdAt: { type: Date, default: Date.now },
  lastOpenedAt: { type: Date, default: Date.now },
  openCount: { type: Number, default: 1 }
});
jobApplyLogSchema.index({ email: 1, jobKey: 1 }, { unique: true });
jobApplyLogSchema.index({ createdAt: -1 });
export const JobApplyLog = mongoose.models.JobApplyLog || mongoose.model('JobApplyLog', jobApplyLogSchema);

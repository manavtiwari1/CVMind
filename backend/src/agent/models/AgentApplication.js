import mongoose from 'mongoose';

const { Schema } = mongoose;

export const APPLICATION_STATUSES = ['pending', 'matched', 'tailoring', 'ready_for_review', 'submitted', 'failed'];

// One user's application to one job; separate from the company-portal Application model in db.js
const agentApplicationSchema = new Schema({
  userId: { type: String, required: true },
  jobPostingId: { type: Schema.Types.ObjectId, required: true },
  resumeProfileId: { type: Schema.Types.ObjectId, default: null },
  status: { type: String, enum: APPLICATION_STATUSES, default: 'pending' },
  progress: { step: String, updatedAt: Date },
  decision: {
    state: { type: String, enum: ['undecided', 'approved', 'skipped'], default: 'undecided' },
    mode: { type: String, default: null },
    overrideGates: { type: Boolean, default: false },
    at: Date
  },
  score: { type: Schema.Types.Mixed, default: null },
  tailored: { type: Schema.Types.Mixed, default: null },
  // Server-side fill state: plan, screenshot, and why it handed off to the extension.
  // Must be declared, or strict mode silently drops writes to fill.* paths.
  fill: { type: Schema.Types.Mixed, default: null },
  submission: { type: Schema.Types.Mixed, default: null },
  notes: { type: String, default: '' },
  error: { type: Schema.Types.Mixed, default: null },
  companyKey: { type: String, default: null },
  // Id from the old backend/data/auto_apply_applications.json, so migration is idempotent
  legacyId: String
}, { timestamps: true });

agentApplicationSchema.index({ userId: 1, jobPostingId: 1 }, { unique: true });
agentApplicationSchema.index({ userId: 1, updatedAt: -1 });
agentApplicationSchema.index({ jobPostingId: 1, status: 1 });
agentApplicationSchema.index({ legacyId: 1 }, { unique: true, partialFilterExpression: { legacyId: { $type: 'string' } } });

const AgentApplication = mongoose.models.AgentApplication || mongoose.model('AgentApplication', agentApplicationSchema);
export default AgentApplication;

import mongoose from 'mongoose';

export const EVENT_ACTORS = ['agent', 'user', 'extension', 'system'];

// Append-only audit trail of every action the agent takes; kept separate so retries don't bloat applications
const applicationEventSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, default: null },
  resumeProfileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  userId: { type: String, required: true },
  type: { type: String, required: true },
  actor: { type: String, enum: EVENT_ACTORS, default: 'agent' },
  message: String,
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  queueJobId: { type: mongoose.Schema.Types.ObjectId, default: null },
  durationMs: Number
}, { timestamps: { createdAt: true, updatedAt: false } });

applicationEventSchema.index({ applicationId: 1, createdAt: 1 });
applicationEventSchema.index({ userId: 1, createdAt: -1 });

const ApplicationEvent = mongoose.models.ApplicationEvent || mongoose.model('ApplicationEvent', applicationEventSchema);
export default ApplicationEvent;

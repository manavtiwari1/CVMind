import mongoose from 'mongoose';

export const QUEUES = ['parse', 'match', 'tailor', 'apply'];
export const JOB_STATUSES = ['queued', 'running', 'succeeded', 'dead'];

const queueJobSchema = new mongoose.Schema({
  queue: { type: String, enum: QUEUES, required: true },
  type: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  userId: { type: String, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, index: true },
  status: { type: String, enum: JOB_STATUSES, default: 'queued' },
  priority: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  deferrals: { type: Number, default: 0 },
  runAt: { type: Date, default: Date.now },
  lockedBy: String,
  lockedUntil: Date,
  lastError: { message: String, code: String, at: Date },
  dedupeKey: String,
  // Copy of dedupeKey that exists only while queued/running, so the unique index blocks duplicate live jobs only
  activeDedupeKey: String,
  finishedAt: Date
}, { timestamps: true });

queueJobSchema.index({ queue: 1, status: 1, priority: -1, runAt: 1 });
queueJobSchema.index({ activeDedupeKey: 1 }, { unique: true, partialFilterExpression: { activeDedupeKey: { $type: 'string' } } });
queueJobSchema.index({ finishedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const QueueJob = mongoose.models.QueueJob || mongoose.model('QueueJob', queueJobSchema);
export default QueueJob;

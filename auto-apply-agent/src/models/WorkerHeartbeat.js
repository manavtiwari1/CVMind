import mongoose from 'mongoose';

const { Schema } = mongoose;

// One row per running queue-worker process, refreshed every minute, so the API and the admin panel
// can tell whether anything is processing the queue. Rows of processes that died expire after a day.
const workerHeartbeatSchema = new Schema({
  _id: { type: String },
  host: String,
  pid: Number,
  queues: [String],
  startedAt: Date,
  lastSeenAt: { type: Date, required: true }
});

workerHeartbeatSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const WorkerHeartbeat = mongoose.models.WorkerHeartbeat || mongoose.model('WorkerHeartbeat', workerHeartbeatSchema);
export default WorkerHeartbeat;

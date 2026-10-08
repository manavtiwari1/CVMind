import mongoose from 'mongoose';

// Fixed-window counter per key; expired windows are removed by the TTL index
const rateBucketSchema = new mongoose.Schema({
  key: { type: String, required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true }
});

rateBucketSchema.index({ key: 1, windowStart: 1 }, { unique: true });
rateBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateBucket = mongoose.models.RateBucket || mongoose.model('RateBucket', rateBucketSchema);
export default RateBucket;

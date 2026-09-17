import mongoose from 'mongoose';

const { Schema } = mongoose;

// Short-lived, single-use code shown in the web app and typed into the extension. Only its hash is stored.
const pairCodeSchema = new Schema({
  codeHash: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  email: String,
  usedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

pairCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PairCode = mongoose.models.PairCode || mongoose.model('PairCode', pairCodeSchema);
export default PairCode;

import mongoose from 'mongoose';

const { Schema } = mongoose;

// A browser that has been paired with the user's account; revoking one invalidates its token immediately
const extensionDeviceSchema = new Schema({
  userId: { type: String, required: true },
  jti: { type: String, required: true, unique: true },
  name: { type: String, default: 'Browser extension' },
  lastSeenAt: Date,
  revokedAt: { type: Date, default: null }
}, { timestamps: true });

extensionDeviceSchema.index({ userId: 1, createdAt: -1 });

const ExtensionDevice = mongoose.models.ExtensionDevice || mongoose.model('ExtensionDevice', extensionDeviceSchema);
export default ExtensionDevice;

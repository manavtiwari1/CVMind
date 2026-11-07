import mongoose from 'mongoose';

const { Schema } = mongoose;

// Leo chat logs are kept 12 months, then MongoDB removes them (retention rule in the Leo PRD)
const RETENTION_SECONDS = 365 * 24 * 60 * 60;

const conversationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, default: '' },
  // The page the chat started on, e.g. 'chat'
  page: { type: String, default: '' },
  // The resume attached to this chat, read to text, so a reopened chat still has it
  resumeName: { type: String, default: '' },
  resumeText: { type: String, default: '' },
  // Copied from the user when the chat starts; deleted or opted-out chats never enter training
  trainingOptOut: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
conversationSchema.index({ userId: 1, deletedAt: 1, updatedAt: -1 });
conversationSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

// One question and Leo's reply. One row per turn keeps the admin AI activity counts per use.
const turnSchema = new Schema({
  conversationId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  // Kept on each turn so the admin AI activity list can show who asked
  email: { type: String, default: '' },
  page: { type: String, default: '' },
  prompt: { type: String, default: '' },
  reply: { type: String, default: '' },
  toolCalls: { type: [Schema.Types.Mixed], default: [] },
  model: { type: String, default: '' },
  promptVersion: { type: String, default: '' },
  tokensIn: { type: Number, default: 0 },
  tokensOut: { type: Number, default: 0 },
  costUsd: { type: Number, default: 0 },
  latencyMs: { type: Number, default: 0 },
  // Why the reply stopped early: 'error', 'aborted' or 'length'
  stopReason: { type: String, default: '' },
  feedback: { type: String, enum: ['up', 'down', null], default: null },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
turnSchema.index({ conversationId: 1, createdAt: 1 });
turnSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export const LeoConversation = mongoose.models.LeoConversation || mongoose.model('LeoConversation', conversationSchema);
export const LeoTurn = mongoose.models.LeoTurn || mongoose.model('LeoTurn', turnSchema);

export const LEO_MODELS = [LeoConversation, LeoTurn];

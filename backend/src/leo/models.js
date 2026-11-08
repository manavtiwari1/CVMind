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
  // The guided flow open in this chat (leo/flows): { product, step, data, skipped, templateId, ... }.
  // Holds personal details, so it is wiped when the chat is deleted.
  flow: { type: Schema.Types.Mixed, default: null },
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

// One step of a guided flow, for the per-product funnel (PRD: Leo Guided Flows, Analytics).
// Field names and template ids only, never what the user typed.
const flowEventSchema = new Schema({
  userId: { type: String, required: true },
  conversationId: { type: String, default: 'guest' },
  signedIn: { type: Boolean, default: false },
  // flow_started, field_filled, choice_made, build_done, result_action, limit_hit
  event: { type: String, required: true },
  product: { type: String, default: '' },
  // flow_started: typed, button or attached
  source: { type: String, default: '' },
  field: { type: String, default: '' },
  // choice_made: the option or template id; result_action: edit, pdf or word; limit_hit: what was locked
  value: { type: String, default: '' },
  viaButton: { type: Boolean, default: false },
  ok: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
flowEventSchema.index({ event: 1, product: 1, createdAt: -1 });
flowEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export const LeoConversation = mongoose.models.LeoConversation || mongoose.model('LeoConversation', conversationSchema);
export const LeoTurn = mongoose.models.LeoTurn || mongoose.model('LeoTurn', turnSchema);
export const LeoFlowEvent = mongoose.models.LeoFlowEvent || mongoose.model('LeoFlowEvent', flowEventSchema);

export const LEO_MODELS = [LeoConversation, LeoTurn, LeoFlowEvent];

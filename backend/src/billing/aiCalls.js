import mongoose from 'mongoose';

// One row per AI call made with our own keys, for the Claude and DeepSeek columns on the admin
// dashboard. Numbers only, never what the user wrote.
const KEEP_SECONDS = 400 * 24 * 60 * 60;

const aiCallSchema = new mongoose.Schema({
  provider: { type: String, required: true }, // 'claude' | 'deepseek'
  model: { type: String, default: '' },
  tokensIn: { type: Number, default: 0 },
  tokensOut: { type: Number, default: 0 },
  costUsd: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
aiCallSchema.index({ createdAt: 1 }, { expireAfterSeconds: KEEP_SECONDS });
aiCallSchema.index({ provider: 1, createdAt: -1 });

export const AiCall = mongoose.models.AiCall || mongoose.model('AiCall', aiCallSchema);

// US dollars per million tokens [input, output]; used only to estimate cost
const PRICES = [
  [/opus-5-5/i, [4, 20]],
  [/opus/i, [5, 25]],
  [/sonnet/i, [2, 10]],
  [/haiku/i, [0.1, 0.5]],
  [/deepseek/i, [0.27, 1.1]]
];

export function estimateCostUsd(model, tokensIn, tokensOut) {
  const [input, output] = PRICES.find(([pattern]) => pattern.test(model))?.[1] || [0, 0];
  return (tokensIn * input + tokensOut * output) / 1e6;
}

// Never throws and is never awaited: a logging problem must not fail the AI feature
export function logAiCall({ provider, model = '', tokensIn = 0, tokensOut = 0 }) {
  console.log(`[ai] provider=${provider} model=${model} in=${tokensIn} out=${tokensOut}`);
  if (mongoose.connection.readyState !== 1) return;
  AiCall.create({ provider, model, tokensIn, tokensOut, costUsd: estimateCostUsd(model, tokensIn, tokensOut) })
    .catch((err) => console.error('[ai] usage log failed:', err.message));
}

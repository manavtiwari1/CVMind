import { AsyncLocalStorage } from 'async_hooks';

// Remembers which account an AI request belongs to, so the AI helpers deep in the call
// stack can charge the tokens they spend without every function passing the user along.
const store = new AsyncLocalStorage();

export const runWithAiContext = (ctx, fn) => store.run(ctx, fn);

export const aiContext = () => store.getStore() || null;

// Called with the provider's usage object after each AI reply. Never throws.
export function chargeAiUsage(usage) {
  const ctx = aiContext();
  if (!ctx?.email || !usage) return;
  const tokens = Number(usage.total_tokens ?? ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0)))
    || Number((usage.tokensIn || 0) + (usage.tokensOut || 0));
  if (!tokens) return;
  ctx.tokens = (ctx.tokens || 0) + tokens;
  ctx.charge?.(tokens).catch((err) => console.error('[billing] token charge failed:', err.message));
}

// Multer reads the upload from socket events, which loses the async context; this puts it back
// for the route handler that runs after the upload is parsed.
export function keepAiContext(middleware) {
  return (req, res, next) => middleware(req, res, (err) => {
    if (req.aiContext) return runWithAiContext(req.aiContext, () => next(err));
    return next(err);
  });
}

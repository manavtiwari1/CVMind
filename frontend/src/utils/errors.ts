// Safely read a message from a caught value (catch variables are `unknown`).
// Returns '' when there is no message, so `getErrorMessage(e) || 'fallback'` works.
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return '';
}

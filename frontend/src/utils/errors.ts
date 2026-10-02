const NETWORK_ERROR = /Failed to fetch|NetworkError|Load failed|Network request failed/i;

// Shown when a request never reached the server (offline, DNS, CORS, server asleep)
export const NETWORK_ERROR_MESSAGE = "We couldn't reach our server. Check your internet connection and try again.";

// Safely read a message from a caught value (catch variables are `unknown`).
// Returns '' when there is no message, so `getErrorMessage(e) || 'fallback'` works.
// Browser-level failures are translated so users never see "Failed to fetch" or a JSON parse error.
export function getErrorMessage(err: unknown): string {
  if (err instanceof TypeError && NETWORK_ERROR.test(err.message)) return NETWORK_ERROR_MESSAGE;
  // An error page that isn't JSON (e.g. a gateway 502) fails response.json(); let the caller's fallback explain
  if (err instanceof SyntaxError) return '';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return '';
}

// Phone push notifications for the CVMind app, sent through Expo's push service (the app registers an
// Expo push token, kept on the user as pushTokens). Best effort: a failed push never fails the action
// that sent it.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;
export const MAX_TOKENS_PER_USER = 5;

export const isExpoPushToken = (t) => typeof t === 'string' && /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,}\]$/.test(t);

/** The user's token list with this token added (newest first, de-duplicated, capped) */
export function addToken(list, token, platform) {
  const rest = (Array.isArray(list) ? list : []).filter((t) => t?.token && t.token !== token);
  return [{ token, platform: platform === 'ios' ? 'ios' : 'android', updatedAt: new Date() }, ...rest].slice(0, MAX_TOKENS_PER_USER);
}

export const removeToken = (list, token) => (Array.isArray(list) ? list : []).filter((t) => t?.token && t.token !== token);

/**
 * Sends one message to many tokens. Returns { sent, failed, invalid } where invalid lists tokens the
 * push service says are gone (the app was uninstalled), so callers can forget them.
 */
export async function sendPush(tokens, { title, body, data = {} }, { fetchImpl = globalThis.fetch } = {}) {
  const valid = [...new Set((tokens || []).filter(isExpoPushToken))];
  let sent = 0;
  let failed = 0;
  const invalid = [];
  for (let i = 0; i < valid.length; i += BATCH) {
    const chunk = valid.slice(i, i + BATCH);
    try {
      const res = await fetchImpl(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk.map((to) => ({ to, title: String(title || '').slice(0, 120), body: String(body || '').slice(0, 300), data, sound: 'default', channelId: 'default' })))
      });
      const json = await res.json().catch(() => ({}));
      const tickets = Array.isArray(json?.data) ? json.data : [];
      chunk.forEach((token, n) => {
        const t = tickets[n];
        if (t?.status === 'ok') sent += 1;
        else {
          failed += 1;
          if (t?.details?.error === 'DeviceNotRegistered') invalid.push(token);
        }
      });
    } catch (err) {
      console.error('[push] send failed:', err.message);
      failed += chunk.length;
    }
  }
  return { sent, failed, invalid };
}

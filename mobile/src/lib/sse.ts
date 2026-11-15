import { fetch as streamingFetch } from 'expo/fetch';

import { ApiError, getApiToken } from './api';
import { API_BASE } from './config';

// Reads a server-sent event stream (Leo chat, missions). React Native's own fetch can't stream a
// body, so this uses expo/fetch, whose response body is a ReadableStream.

// UTF-8 bytes → text, keeping a multi-byte character that is split across two chunks
function utf8Decoder() {
  const Native = (globalThis as { TextDecoder?: typeof TextDecoder }).TextDecoder;
  if (Native) {
    const d = new Native('utf-8');
    return (bytes: Uint8Array) => d.decode(bytes, { stream: true });
  }
  let pending: number[] = [];
  return (bytes: Uint8Array) => {
    const all = pending.length ? [...pending, ...bytes] : Array.from(bytes);
    pending = [];
    let out = '';
    let i = 0;
    while (i < all.length) {
      const b = all[i];
      const need = b < 0x80 ? 1 : b >= 0xf0 ? 4 : b >= 0xe0 ? 3 : b >= 0xc0 ? 2 : 1;
      if (i + need > all.length) {
        pending = all.slice(i);
        break;
      }
      let cp = need === 1 ? b : b & (0xff >> (need + 1));
      for (let k = 1; k < need; k++) cp = (cp << 6) | (all[i + k] & 0x3f);
      out += String.fromCodePoint(cp);
      i += need;
    }
    return out;
  };
}

export class StreamError extends ApiError {}

/** POSTs (or GETs) and calls onEvent for every event until the stream ends. An `error` event throws. */
export async function streamEvents(
  path: string,
  { body, method = 'POST', signal }: { body?: unknown; method?: 'GET' | 'POST'; signal?: AbortSignal },
  onEvent: (event: string, payload: Record<string, unknown>) => void,
) {
  const headers: Record<string, string> = { Accept: 'text/event-stream' };
  const token = getApiToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Awaited<ReturnType<typeof streamingFetch>>;
  try {
    res = await streamingFetch(`${API_BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new StreamError("Can't reach Leo. Check your internet and try again.", 0, { code: 'OFFLINE' });
  }

  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new StreamError(typeof data.error === 'string' ? data.error : 'Leo is not available right now.', res.status, data);
  }

  const reader = res.body.getReader();
  const decode = utf8Decoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decode(value as Uint8Array);
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = '';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!event || !data) continue; // heartbeat comments
      const payload = JSON.parse(data) as Record<string, unknown>;
      if (event === 'error') throw new StreamError(String(payload.error || 'Leo ran into a problem.'), 500, payload);
      onEvent(event, payload);
    }
  }
}

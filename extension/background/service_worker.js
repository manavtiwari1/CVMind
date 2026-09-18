/**
 * CVMind AI Auto Apply Copilot — Background Service Worker (Manifest V3)
 * Holds the paired device token and talks to the CVMind agent API.
 */

const DEFAULT_API_BASE = 'http://localhost:5000';
const TOKEN_KEY = 'cvmind_device_token';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['cvmind_api_base'], (res) => {
    if (!res.cvmind_api_base) chrome.storage.local.set({ cvmind_api_base: DEFAULT_API_BASE });
  });
  // The old build cached the profile and a Gemini key in the browser; the server holds both now
  chrome.storage.local.remove(['cvmind_profile', 'cvmind_api_key', 'cvmind_auth_token']);
});

const storage = (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve));

async function apiBase() {
  const res = await storage(['cvmind_api_base']);
  return res.cvmind_api_base || DEFAULT_API_BASE;
}

class PairingRequired extends Error {
  constructor(message = 'Connect this extension to your CVMind account.') {
    super(message);
    this.needsPairing = true;
  }
}

// Every agent call carries the device token; a revoked or expired one clears local state
async function apiFetch(path, { method = 'GET', body } = {}) {
  const [base, stored] = await Promise.all([apiBase(), storage([TOKEN_KEY])]);
  const token = stored[TOKEN_KEY];
  if (!token) throw new PairingRequired();

  const res = await fetch(`${base}/api/agent/extension${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 401) {
    await chrome.storage.local.remove(TOKEN_KEY);
    const payload = await res.json().catch(() => ({}));
    throw new PairingRequired(payload.error);
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) throw new Error(payload.error || `Request failed (${res.status}).`);
  return payload.data;
}

async function pair({ code, deviceName }) {
  const base = await apiBase();
  const res = await fetch(`${base}/api/agent/extension/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, deviceName: deviceName || navigator.userAgent.slice(0, 60) })
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.success) throw new Error(payload.error || 'Pairing failed.');
  await chrome.storage.local.set({ [TOKEN_KEY]: payload.data.token, cvmind_device_name: payload.data.device.name });
  return { device: payload.data.device };
}

// The resume PDF is fetched here (where the token lives) and handed to the page as a data URL
async function fetchResumeFile({ applicationId }) {
  const [base, stored] = await Promise.all([apiBase(), storage([TOKEN_KEY])]);
  if (!stored[TOKEN_KEY]) throw new PairingRequired();

  const res = await fetch(`${base}/api/agent/extension/resume.pdf?applicationId=${encodeURIComponent(applicationId)}`, {
    headers: { Authorization: `Bearer ${stored[TOKEN_KEY]}` }
  });
  if (!res.ok) throw new Error('The tailored PDF is not ready yet.');

  const buffer = await res.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const filename = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1];
  return { base64: btoa(binary), filename: filename ? decodeURIComponent(filename) : 'Tailored_Resume.pdf' };
}

const HANDLERS = {
  GET_STATE: async () => {
    const stored = await storage([TOKEN_KEY, 'cvmind_api_base', 'cvmind_device_name']);
    return { paired: Boolean(stored[TOKEN_KEY]), apiBase: stored.cvmind_api_base || DEFAULT_API_BASE, deviceName: stored.cvmind_device_name || '' };
  },
  PAIR: (payload) => pair(payload),
  UNPAIR: async () => {
    await chrome.storage.local.remove([TOKEN_KEY, 'cvmind_device_name']);
    return { paired: false };
  },
  SET_API_BASE: async ({ apiBase: base }) => {
    await chrome.storage.local.set({ cvmind_api_base: base });
    return { apiBase: base };
  },
  GET_CONTEXT: ({ url }) => apiFetch(`/context?url=${encodeURIComponent(url)}`),
  BUILD_FILL_PLAN: (payload) => apiFetch('/fill-plan', { method: 'POST', body: payload }),
  FETCH_RESUME: (payload) => fetchResumeFile(payload),
  TRACK_JOB: (payload) => apiFetch('/track', { method: 'POST', body: payload }),
  CONFIRM_SUBMITTED: (payload) => apiFetch('/confirm-submitted', { method: 'POST', body: payload })
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = HANDLERS[message?.type];
  if (!handler) return false;

  Promise.resolve(handler(message.payload || {}))
    .then((data) => sendResponse({ success: true, data }))
    .catch((err) => sendResponse({ success: false, error: err.message, needsPairing: Boolean(err.needsPairing) }));
  return true; // keep the message channel open for the async reply
});

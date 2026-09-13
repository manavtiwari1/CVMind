/**
 * CVMind AI Auto Apply Copilot - Background Service Worker
 * Manifest V3 compatible
 */

const DEFAULT_API_BASE = 'http://localhost:5000';

// Initialize default storage on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[CVMind Extension] Installed successfully.');
  chrome.storage.local.get(['cvmind_api_base', 'cvmind_profile'], (res) => {
    if (!res.cvmind_api_base) {
      chrome.storage.local.set({
        cvmind_api_base: DEFAULT_API_BASE,
        cvmind_auto_detect: true,
        cvmind_installed_at: new Date().toISOString()
      });
    }
  });
});

// Message router between Content Scripts, Popup, and Backend API
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  if (type === 'PING') {
    sendResponse({ status: 'alive', version: '1.0.0' });
    return true;
  }

  if (type === 'SYNC_PROFILE') {
    // Save profile sent from CVMind web app or popup
    chrome.storage.local.set({ cvmind_profile: payload.profile, cvmind_api_key: payload.apiKey || '' }, () => {
      sendResponse({ success: true, message: 'Profile synced to extension.' });
    });
    return true;
  }

  if (type === 'ANALYZE_PAGE') {
    handleAnalyzePage(payload)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (type === 'MAP_FIELDS') {
    handleMapFields(payload)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === 'TRACK_APPLICATION') {
    handleTrackApplication(payload)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === 'GET_STATUS') {
    chrome.storage.local.get(['cvmind_profile', 'cvmind_api_base'], (res) => {
      sendResponse({
        hasProfile: !!res.cvmind_profile,
        profile: res.cvmind_profile || null,
        apiBase: res.cvmind_api_base || DEFAULT_API_BASE
      });
    });
    return true;
  }
});

async function getApiBaseAndKey() {
  return new Promise(resolve => {
    chrome.storage.local.get(['cvmind_api_base', 'cvmind_api_key'], res => {
      resolve({
        apiBase: res.cvmind_api_base || DEFAULT_API_BASE,
        apiKey: res.cvmind_api_key || ''
      });
    });
  });
}

async function handleAnalyzePage(payload) {
  const { apiBase, apiKey } = await getApiBaseAndKey();
  const res = await fetch(`${apiBase}/api/auto-apply/analyze-page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-gemini-key': apiKey } : {})
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Analyze API returned status ${res.status}`);
  const json = await res.json();
  return json.data;
}

async function handleMapFields(payload) {
  const { apiBase, apiKey } = await getApiBaseAndKey();
  const res = await fetch(`${apiBase}/api/auto-apply/map-fields`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-gemini-key': apiKey } : {})
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Map fields API returned status ${res.status}`);
  const json = await res.json();
  return json.data;
}

async function handleTrackApplication(payload) {
  const { apiBase } = await getApiBaseAndKey();
  const res = await fetch(`${apiBase}/api/auto-apply/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Track application returned status ${res.status}`);
  return await res.json();
}

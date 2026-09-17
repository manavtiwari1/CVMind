/**
 * CVMind AI Extension Popup — pairing, page status and on-demand autofill.
 */

const $ = (id) => document.getElementById(id);
const send = (type, payload = {}) => new Promise((resolve) => {
  chrome.runtime.sendMessage({ type, payload }, (response) => resolve(response || { success: false, error: 'The extension is not responding.' }));
});

const STATUS_LABELS = {
  pending: 'Being scored',
  matched: 'Scored',
  tailoring: 'Tailoring',
  ready_for_review: 'Ready to apply',
  submitted: 'Submitted',
  failed: 'Needs attention'
};

let activeTab = null;

function show(id, visible) {
  const el = $(id);
  if (el) el.hidden = !visible;
}

function showError(id, message) {
  const el = $(id);
  el.textContent = message || '';
  el.hidden = !message;
}

async function render() {
  const state = await send('GET_STATE');
  const paired = Boolean(state.success && state.data.paired);
  $('conn-badge').textContent = paired ? 'Connected' : 'Not connected';
  $('api-base').value = state.data?.apiBase || '';
  show('pair-section', !paired);
  show('connected-section', paired);
  show('page-section', paired);
  show('action-section', paired);
  if (paired) {
    $('device-name').textContent = state.data.deviceName || 'This browser';
    loadPageContext();
  }
}

async function loadPageContext() {
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.url) return;

  $('tab-job-title').textContent = (activeTab.title || 'This page').replace(/[-|].*$/, '').trim().slice(0, 40);
  const response = await send('GET_CONTEXT', { url: activeTab.url });
  if (!response.success) {
    $('page-detect-status').textContent = response.needsPairing ? 'Reconnect needed' : 'Offline';
    if (response.needsPairing) render();
    return;
  }

  const { application, canTrack, resumeReady } = response.data;
  $('account-email').textContent = response.data.email || 'Connected to CVMind';
  $('btn-popup-track').hidden = !canTrack;
  $('btn-popup-autofill').disabled = !resumeReady;

  if (application) {
    $('page-detect-status').textContent = STATUS_LABELS[application.status] || 'Tracked';
    $('tab-job-title').textContent = application.title || $('tab-job-title').textContent;
    if (typeof application.score === 'number') {
      $('tab-job-match').textContent = `${application.score}% match`;
      $('tab-job-match').hidden = false;
    }
  } else {
    $('page-detect-status').textContent = canTrack ? 'Not tracked' : 'Unknown page';
  }
  if (!resumeReady) showError('action-error', 'Add a resume in CVMind before autofilling.');
}

// Formats as the user types: ABCD-EFGH
$('pair-code').addEventListener('input', (event) => {
  const raw = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  event.target.value = raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
});

$('btn-pair').addEventListener('click', async () => {
  const code = $('pair-code').value.trim();
  if (code.replace(/[^A-Z0-9]/gi, '').length !== 8) {
    showError('pair-error', 'Enter the 8-character code from CVMind.');
    return;
  }
  showError('pair-error', '');
  $('btn-pair').disabled = true;
  const response = await send('PAIR', { code });
  $('btn-pair').disabled = false;
  if (!response.success) {
    showError('pair-error', response.error);
    return;
  }
  $('pair-code').value = '';
  render();
});

$('btn-unpair').addEventListener('click', async () => {
  await send('UNPAIR');
  render();
});

$('btn-save-api').addEventListener('click', async () => {
  await send('SET_API_BASE', { apiBase: $('api-base').value.trim().replace(/\/+$/, '') });
  render();
});

// Works on any page: the scripts are injected on demand when they are not already there
$('btn-popup-autofill').addEventListener('click', async () => {
  if (!activeTab?.id) return;
  $('btn-popup-autofill').disabled = true;
  showError('action-error', '');
  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['shared/formScanner.js', 'shared/formFiller.js', 'content/content.js']
    });
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: () => document.getElementById('cvmind-btn-autofill')?.click()
    });
    window.close();
  } catch (err) {
    showError('action-error', `Could not run on this page: ${err.message}`);
    $('btn-popup-autofill').disabled = false;
  }
});

$('btn-popup-track').addEventListener('click', async () => {
  if (!activeTab?.url) return;
  $('btn-popup-track').disabled = true;
  const response = await send('TRACK_JOB', { url: activeTab.url });
  if (!response.success) {
    showError('action-error', response.error);
    $('btn-popup-track').disabled = false;
    return;
  }
  $('btn-popup-track').querySelector('span').textContent = '✓ Added to CVMind';
  loadPageContext();
});

document.addEventListener('DOMContentLoaded', render);

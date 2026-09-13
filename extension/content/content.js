/**
 * CVMind AI Auto Apply Copilot — Content Script
 * Injects smart form detector, floating copilot badge & glassmorphic drawer
 */

(function () {
  // Prevent multiple injections
  if (window.__CVMIND_INJECTED__) return;
  window.__CVMIND_INJECTED__ = true;

  console.log('[CVMind Copilot] Content script initialized on:', window.location.href);

  // Sync profile if on CVMind Web App
  if (window.location.hostname === 'localhost' || window.location.hostname.includes('cvmind')) {
    syncWithCVMindWebApp();
  }

  // Detect job application on target page
  let isJobApp = checkIsJobApplicationPage();
  if (isJobApp) {
    console.log('[CVMind Copilot] Job application page detected!');
    initCopilotWidget();
  }

  // Also listen for SPA DOM changes to re-evaluate
  let observerTimeout = null;
  const observer = new MutationObserver(() => {
    if (observerTimeout) clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      if (!document.getElementById('cvmind-copilot-root') && checkIsJobApplicationPage()) {
        initCopilotWidget();
      }
    }, 1200);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Detection Engine
  // ──────────────────────────────────────────────────────────────────────────
  function checkIsJobApplicationPage() {
    // Check if on demo sandbox
    if (window.location.href.includes('demo-sandbox') || document.querySelector('[data-cvmind-demo-sandbox]')) {
      return true;
    }

    const url = window.location.href.toLowerCase();
    const urlKeywords = ['apply', 'job', 'career', 'lever.co', 'greenhouse.io', 'workday', 'linkedin.com/jobs', 'naukri.com', 'indeed.com', 'application'];
    const hasUrlMatch = urlKeywords.some(k => url.includes(k));

    // Check for standard job form inputs
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let jobSignals = 0;
    for (const el of inputs) {
      const text = `${el.name} ${el.id} ${el.placeholder} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
      if (text.includes('resume') || el.type === 'file') jobSignals += 2;
      if (text.includes('email')) jobSignals += 1;
      if (text.includes('phone') || text.includes('mobile')) jobSignals += 1;
      if (text.includes('linkedin') || text.includes('github') || text.includes('portfolio')) jobSignals += 1;
      if (text.includes('experience') || text.includes('cover')) jobSignals += 1;
    }

    return hasUrlMatch || jobSignals >= 3;
  }

  function syncWithCVMindWebApp() {
    try {
      const stored = localStorage.getItem('cvmind_candidate_profile');
      const apiKey = localStorage.getItem('cvmind_gemini_key') || localStorage.getItem('customApiKey');
      if (stored) {
        const profile = JSON.parse(stored);
        chrome.runtime.sendMessage({
          type: 'SYNC_PROFILE',
          payload: { profile, apiKey }
        }, res => {
          if (res?.success) console.log('[CVMind Copilot] Synced profile from web app.');
        });
      }
    } catch (e) {
      console.warn('[CVMind Copilot] Sync error:', e);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. DOM Field Extractor
  // ──────────────────────────────────────────────────────────────────────────
  function scanFormFields() {
    const elements = Array.from(document.querySelectorAll('input, textarea, select'))
      .filter(el => el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button' && !el.closest('#cvmind-copilot-root'));

    return elements.map((el, idx) => {
      // Find associated label
      let labelText = '';
      if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl) labelText = lbl.innerText.trim();
      }
      if (!labelText) {
        const parentLabel = el.closest('label');
        if (parentLabel) labelText = parentLabel.innerText.trim();
      }
      if (!labelText && el.parentElement) {
        const prev = el.previousElementSibling;
        if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
          labelText = prev.innerText.trim();
        }
      }

      return {
        index: idx,
        id: el.id || '',
        name: el.name || '',
        type: el.tagName.toLowerCase() === 'textarea' ? 'textarea' : el.type || 'text',
        placeholder: el.placeholder || '',
        label: labelText || el.getAttribute('aria-label') || el.placeholder || el.name || `Field #${idx + 1}`,
        selector: generateUniqueSelector(el)
      };
    });
  }

  function generateUniqueSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    if (el.name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. UI Component: Floating Widget & Copilot Drawer
  // ──────────────────────────────────────────────────────────────────────────
  function initCopilotWidget() {
    if (document.getElementById('cvmind-copilot-root')) return;

    const root = document.createElement('div');
    root.id = 'cvmind-copilot-root';
    root.innerHTML = `
      <!-- Floating Badge Button -->
      <div id="cvmind-floating-badge" title="Open CVMind AI Auto Apply Copilot">
        <div class="cvmind-badge-pulse"></div>
        <div class="cvmind-badge-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
        <div class="cvmind-badge-label">
          <span class="cvmind-badge-title">CVMind Copilot</span>
          <span class="cvmind-badge-match" id="cvmind-badge-score">89% Match</span>
        </div>
      </div>

      <!-- Slide-over Drawer -->
      <div id="cvmind-copilot-drawer" class="cvmind-drawer-closed">
        <!-- Header -->
        <div class="cvmind-drawer-header">
          <div class="cvmind-header-left">
            <div class="cvmind-logo-pill">
              <span class="cvmind-logo-sparkle">✨</span>
              <span>CVMind AI</span>
            </div>
            <span class="cvmind-app-detect-tag">Job Application Detected</span>
          </div>
          <button id="cvmind-drawer-close" class="cvmind-close-btn" aria-label="Close">✕</button>
        </div>

        <!-- Match Score Bar -->
        <div class="cvmind-match-banner">
          <div class="cvmind-match-info">
            <span class="cvmind-match-role" id="cvmind-job-title">Job Application</span>
            <span class="cvmind-match-pct" id="cvmind-score-val">89%</span>
          </div>
          <div class="cvmind-progress-track">
            <div class="cvmind-progress-fill" id="cvmind-score-bar" style="width: 89%"></div>
          </div>
          <div class="cvmind-match-breakdown-mini" id="cvmind-breakdown-chips">
            <span>Skills 94%</span> • <span>Education 100%</span> • <span>Experience 75%</span>
          </div>
        </div>

        <!-- Action Box -->
        <div class="cvmind-drawer-body">
          <div class="cvmind-section-card">
            <div class="cvmind-card-header">
              <span class="cvmind-card-title">🤖 1-Click Form Autofill</span>
              <span class="cvmind-fields-count" id="cvmind-field-stats">Scanning fields...</span>
            </div>
            <p class="cvmind-card-desc">Maps your CVMind profile, tailored experience & contact details to this form.</p>
            <button id="cvmind-btn-autofill" class="cvmind-primary-btn">
              <span>⚡ Autofill Application</span>
            </button>
          </div>

          <!-- AI Question Answering Section -->
          <div class="cvmind-section-card">
            <div class="cvmind-card-header">
              <span class="cvmind-card-title">💡 AI Question Answers</span>
              <span class="cvmind-card-badge">Gemini AI</span>
            </div>
            <p class="cvmind-card-desc">Answers generated specifically for this role without inventing facts.</p>
            <div id="cvmind-qa-container" class="cvmind-qa-list">
              <div class="cvmind-qa-item">
                <div class="cvmind-qa-q">"Why are you a good fit for this role?"</div>
                <div class="cvmind-qa-a" id="cvmind-qa-preview">Scanning form for open-ended questions...</div>
                <button class="cvmind-copy-btn" id="cvmind-btn-insert-qa">Insert into form</button>
              </div>
            </div>
          </div>

          <!-- Sensitive Questions Guard -->
          <div class="cvmind-section-card cvmind-sensitive-card" id="cvmind-sensitive-box" style="display:none;">
            <div class="cvmind-card-header">
              <span class="cvmind-card-title">🛡️ Human Confirmation Required</span>
            </div>
            <p class="cvmind-card-desc" id="cvmind-sensitive-text">Sensitive questions detected (Visa sponsorship / Salary expectations). Please confirm before final submit.</p>
          </div>

          <!-- Application Tracking Card -->
          <div class="cvmind-section-card">
            <div class="cvmind-card-header">
              <span class="cvmind-card-title">📊 Track Application</span>
            </div>
            <button id="cvmind-btn-track" class="cvmind-secondary-btn">
              <span>✓ Save & Track in CVMind</span>
            </button>
          </div>
        </div>

        <!-- Drawer Footer -->
        <div class="cvmind-drawer-footer">
          <a href="http://localhost:5173/auto-apply" target="_blank" class="cvmind-footer-link">Open Full CVMind Dashboard ↗</a>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Setup interactive events
    bindCopilotEvents();
    triggerPageScan();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Interactive Logic & Autofill Execution
  // ──────────────────────────────────────────────────────────────────────────
  let cachedMapping = null;
  let cachedProfile = null;

  function bindCopilotEvents() {
    const badge = document.getElementById('cvmind-floating-badge');
    const drawer = document.getElementById('cvmind-copilot-drawer');
    const closeBtn = document.getElementById('cvmind-drawer-close');
    const autofillBtn = document.getElementById('cvmind-btn-autofill');
    const trackBtn = document.getElementById('cvmind-btn-track');
    const insertQaBtn = document.getElementById('cvmind-btn-insert-qa');

    if (badge && drawer) {
      badge.addEventListener('click', () => {
        drawer.classList.toggle('cvmind-drawer-closed');
        drawer.classList.toggle('cvmind-drawer-open');
      });
    }

    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => {
        drawer.classList.add('cvmind-drawer-closed');
        drawer.classList.remove('cvmind-drawer-open');
      });
    }

    if (autofillBtn) {
      autofillBtn.addEventListener('click', executeAutofill);
    }

    if (trackBtn) {
      trackBtn.addEventListener('click', handleTrackCurrentJob);
    }

    if (insertQaBtn) {
      insertQaBtn.addEventListener('click', insertAIAnswersIntoForm);
    }
  }

  function triggerPageScan() {
    const fields = scanFormFields();
    const statsEl = document.getElementById('cvmind-field-stats');
    if (statsEl) statsEl.innerText = `${fields.length} fields detected`;

    // Fetch profile from extension storage or local storage
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      let activeProfile = res?.profile || null;
      if (!activeProfile) {
        try {
          const local = localStorage.getItem('cvmind_candidate_profile');
          if (local) activeProfile = JSON.parse(local);
        } catch {}
      }

      if (activeProfile && (activeProfile.name || activeProfile.email)) {
        cachedProfile = activeProfile;
        requestFieldMapping(fields, activeProfile);
      } else {
        cachedProfile = null;
        if (statsEl) statsEl.innerText = 'Profile not found';
        const cardDesc = document.querySelector('.cvmind-card-desc');
        if (cardDesc) cardDesc.innerText = 'Please save your profile in CVMind Dashboard first so exact details are used.';
      }
    });
  }

  function requestFieldMapping(fields, profile) {
    chrome.runtime.sendMessage({
      type: 'MAP_FIELDS',
      payload: {
        fields,
        profile,
        job: {
          title: document.title.replace(/[-|].*$/, '').trim() || 'Software Engineer',
          company: extractCompanyFromHost()
        }
      }
    }, (response) => {
      if (response && response.success && response.data) {
        cachedMapping = response.data.mappedFields;
        updateUIWithMapping(response.data);
      }
    });
  }

  function extractCompanyFromHost() {
    try {
      const host = window.location.hostname.replace('www.', '').split('.')[0];
      return host.charAt(0).toUpperCase() + host.slice(1);
    } catch {
      return 'Company';
    }
  }

  function updateUIWithMapping(data) {
    const statsEl = document.getElementById('cvmind-field-stats');
    if (statsEl) statsEl.innerText = `${data.mappedCount} / ${data.totalFields} fields ready`;

    if (data.sensitiveCount > 0) {
      const sensBox = document.getElementById('cvmind-sensitive-box');
      if (sensBox) sensBox.style.display = 'block';
    }

    // Update QA preview if question was found
    const questionField = (data.mappedFields || []).find(f => f.isQuestion && f.value);
    if (questionField) {
      const qaPreview = document.getElementById('cvmind-qa-preview');
      if (qaPreview) qaPreview.innerText = questionField.value;
    }
  }

  function executeAutofill() {
    if (!cachedMapping || !cachedMapping.length) {
      alert('Scanning fields... Please wait a second and try again.');
      triggerPageScan();
      return;
    }

    let filledCount = 0;
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
      .filter(el => !el.closest('#cvmind-copilot-root'));

    for (const item of cachedMapping) {
      if (!item.value) continue;

      // Find element by selector, ATS specific patterns, or label/name match
      let targetEl = null;
      if (item.selector) targetEl = document.querySelector(item.selector);

      if (!targetEl && item.name) {
        targetEl = document.querySelector(`[name="${item.name}"]`);
      }

      // ATS specific fallback selectors (Greenhouse / Lever / Workday)
      if (!targetEl) {
        const lbl = (item.label || item.name || '').toLowerCase();
        if (lbl.includes('first name') || lbl.includes('firstname')) {
          targetEl = document.querySelector('#first_name, input[autocomplete="given-name"], input[data-automation-id*="firstName" i], [name*="first_name" i], [name*="firstName" i]');
        } else if (lbl.includes('last name') || lbl.includes('lastname')) {
          targetEl = document.querySelector('#last_name, input[autocomplete="family-name"], input[data-automation-id*="lastName" i], [name*="last_name" i], [name*="lastName" i]');
        } else if (lbl.includes('email')) {
          targetEl = document.querySelector('#email, input[type="email"], input[autocomplete="email"], input[data-automation-id*="email" i], [name*="email" i]');
        } else if (lbl.includes('phone') || lbl.includes('mobile')) {
          targetEl = document.querySelector('#phone, input[type="tel"], input[autocomplete="tel"], input[data-automation-id*="phone" i], [name*="phone" i]');
        } else if (lbl.includes('linkedin')) {
          targetEl = document.querySelector('input[name*="urls[LinkedIn]"], input[name*="linkedin" i], input[id*="linkedin" i], input[aria-label*="linkedin" i]');
        } else if (lbl.includes('github')) {
          targetEl = document.querySelector('input[name*="urls[GitHub]"], input[name*="github" i], input[id*="github" i], input[aria-label*="github" i]');
        } else if (lbl.includes('portfolio') || lbl.includes('website')) {
          targetEl = document.querySelector('input[name*="urls[Portfolio]"], input[name*="urls[Other]"], input[name*="website" i], input[id*="website" i]');
        } else if (lbl.includes('college') || lbl.includes('school') || lbl.includes('university')) {
          targetEl = document.querySelector('input[id*="school" i], input[name*="school" i], input[data-automation-id*="school" i]');
        }
      }

      if (!targetEl) {
        targetEl = inputs.find(el => {
          const combined = `${el.name} ${el.id} ${el.placeholder} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
          return combined.includes(item.label.toLowerCase());
        });
      }

      if (targetEl) {
        fillInputElement(targetEl, item.value);
        filledCount++;
      }
    }

    // Show visual confirmation on autofill button
    const btn = document.getElementById('cvmind-btn-autofill');
    if (btn) {
      const origText = btn.innerHTML;
      btn.innerHTML = `<span>✓ Autofilled ${filledCount} Fields!</span>`;
      btn.style.background = '#30d158';
      setTimeout(() => {
        btn.innerHTML = origText;
        btn.style.background = '';
      }, 3000);
    }
  }

  function fillInputElement(el, value) {
    if (el.tagName.toLowerCase() === 'select') {
      // Find matching option
      const options = Array.from(el.options);
      const match = options.find(o => o.text.toLowerCase().includes(String(value).toLowerCase()) || o.value.toLowerCase().includes(String(value).toLowerCase()));
      if (match) el.value = match.value;
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = true;
    } else {
      el.value = value;
    }

    // Dispatch DOM change events so modern frameworks (React/Vue/Angular) detect input
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));

    // Soft highlight animation
    el.classList.add('cvmind-autofilled-highlight');
    setTimeout(() => {
      el.classList.remove('cvmind-autofilled-highlight');
    }, 2500);
  }

  function insertAIAnswersIntoForm() {
    if (!cachedMapping) return;
    const qField = cachedMapping.find(f => f.isQuestion && f.value);
    if (qField) {
      const textareas = Array.from(document.querySelectorAll('textarea')).filter(t => !t.closest('#cvmind-copilot-root'));
      if (textareas.length > 0) {
        fillInputElement(textareas[0], qField.value);
        const insBtn = document.getElementById('cvmind-btn-insert-qa');
        if (insBtn) {
          insBtn.innerText = '✓ Inserted!';
          setTimeout(() => { insBtn.innerText = 'Insert into form'; }, 2000);
        }
      }
    }
  }

  function handleTrackCurrentJob() {
    const btn = document.getElementById('cvmind-btn-track');
    if (btn) btn.innerHTML = '<span>Saving to CVMind...</span>';

    chrome.runtime.sendMessage({
      type: 'TRACK_APPLICATION',
      payload: {
        userId: cachedProfile?.email || 'user_demo',
        candidateName: cachedProfile?.name || 'Candidate',
        candidateEmail: cachedProfile?.email || 'candidate@cvmind.online',
        mode: 'Browser Extension Copilot',
        job: {
          id: `job_ext_${Date.now()}`,
          title: document.title.replace(/[-|].*$/, '').trim() || 'Software Engineer Application',
          company: extractCompanyFromHost(),
          location: 'Auto-detected',
          type: 'Full-time',
          salary: 'Standard'
        },
        matchScore: 89
      }
    }, (res) => {
      if (btn) {
        btn.innerHTML = '<span>🎉 Application Tracked!</span>';
        btn.style.background = '#30d158';
        setTimeout(() => {
          btn.innerHTML = '<span>✓ Saved in CVMind</span>';
        }, 3000);
      }
    });
  }
})();

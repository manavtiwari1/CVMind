/**
 * CVMind AI Auto Apply Copilot — Content Script
 * Detects application forms, fills them from the user's CVMind profile, and flags what to check.
 * It never presses submit: the user does that, and the extension records it afterwards.
 */
(function () {
  if (window.__CVMIND_INJECTED__) return;
  window.__CVMIND_INJECTED__ = true;

  const URL_KEYWORDS = ['apply', 'job', 'career', 'lever.co', 'greenhouse.io', 'myworkdayjobs', 'workday', 'application'];
  let pageContext = null;
  let currentPlan = null;
  let submissionRecorded = false;

  const send = (type, payload = {}) => new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => resolve(response || { success: false, error: 'The extension is not responding.' }));
  });

  const $ = (id) => document.getElementById(id);

  function isApplicationPage() {
    const url = window.location.href.toLowerCase();
    if (URL_KEYWORDS.some((keyword) => url.includes(keyword))) return true;
    const fields = document.querySelectorAll('input[type="file"], input[type="email"], textarea');
    return fields.length >= 2;
  }

  // ── Widget ──────────────────────────────────────────────────────────────────
  function initWidget() {
    if ($('cvmind-copilot-root')) return;
    const root = document.createElement('div');
    root.id = 'cvmind-copilot-root';
    root.innerHTML = `
      <div id="cvmind-floating-badge" title="Open CVMind Auto Apply Copilot">
        <div class="cvmind-badge-pulse"></div>
        <div class="cvmind-badge-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
        <div class="cvmind-badge-label">
          <span class="cvmind-badge-title">CVMind Copilot</span>
          <span class="cvmind-badge-match" id="cvmind-badge-score">Ready</span>
        </div>
      </div>

      <div id="cvmind-copilot-drawer" class="cvmind-drawer-closed">
        <div class="cvmind-drawer-header">
          <div class="cvmind-header-left">
            <div class="cvmind-logo-pill"><span class="cvmind-logo-sparkle">✨</span><span>CVMind AI</span></div>
            <span class="cvmind-app-detect-tag" id="cvmind-page-tag">Application detected</span>
          </div>
          <button id="cvmind-drawer-close" class="cvmind-close-btn" aria-label="Close">✕</button>
        </div>

        <div class="cvmind-match-banner" id="cvmind-match-banner" style="display:none;">
          <div class="cvmind-match-info">
            <span class="cvmind-match-role" id="cvmind-job-title">This job</span>
            <span class="cvmind-match-pct" id="cvmind-score-val">—</span>
          </div>
          <div class="cvmind-progress-track"><div class="cvmind-progress-fill" id="cvmind-score-bar" style="width:0%"></div></div>
          <div class="cvmind-match-breakdown-mini" id="cvmind-status-line">Checking this page…</div>
        </div>

        <div class="cvmind-drawer-body">
          <div class="cvmind-section-card" id="cvmind-pair-card" style="display:none;">
            <div class="cvmind-card-header"><span class="cvmind-card-title">🔗 Connect to CVMind</span></div>
            <p class="cvmind-card-desc">Open CVMind, go to Job Preferences and create a connection code, then enter it in the extension popup.</p>
          </div>

          <div class="cvmind-section-card" id="cvmind-fill-card">
            <div class="cvmind-card-header">
              <span class="cvmind-card-title">🤖 Fill this application</span>
              <span class="cvmind-fields-count" id="cvmind-field-stats">Scanning…</span>
            </div>
            <p class="cvmind-card-desc">Fills the form from your CVMind profile. Nothing is submitted — you review and press the site's own submit button.</p>
            <button id="cvmind-btn-autofill" class="cvmind-primary-btn"><span>⚡ Fill application</span></button>
          </div>

          <div class="cvmind-section-card cvmind-sensitive-card" id="cvmind-review-box" style="display:none;">
            <div class="cvmind-card-header"><span class="cvmind-card-title">🛡️ Check before you submit</span></div>
            <div class="cvmind-card-desc" id="cvmind-review-text"></div>
          </div>

          <div class="cvmind-section-card" id="cvmind-track-card" style="display:none;">
            <div class="cvmind-card-header"><span class="cvmind-card-title">📊 Track this job</span></div>
            <p class="cvmind-card-desc">Add this job to CVMind to score your fit and tailor your resume for it.</p>
            <button id="cvmind-btn-track" class="cvmind-secondary-btn"><span>✓ Add to CVMind</span></button>
          </div>
        </div>

        <div class="cvmind-drawer-footer">
          <a href="https://www.cvmind.online/auto-apply" target="_blank" rel="noopener" class="cvmind-footer-link">Open CVMind dashboard ↗</a>
        </div>
      </div>`;
    document.body.appendChild(root);

    const drawer = $('cvmind-copilot-drawer');
    $('cvmind-floating-badge').addEventListener('click', () => {
      drawer.classList.toggle('cvmind-drawer-closed');
      drawer.classList.toggle('cvmind-drawer-open');
    });
    $('cvmind-drawer-close').addEventListener('click', () => {
      drawer.classList.add('cvmind-drawer-closed');
      drawer.classList.remove('cvmind-drawer-open');
    });
    $('cvmind-btn-autofill').addEventListener('click', fillApplication);
    $('cvmind-btn-track').addEventListener('click', trackJob);
  }

  const setStatus = (text) => { const el = $('cvmind-status-line'); if (el) el.innerText = text; };
  const setFieldStats = (text) => { const el = $('cvmind-field-stats'); if (el) el.innerText = text; };

  // ── Page context ────────────────────────────────────────────────────────────
  async function loadContext() {
    const fields = CVMindScanner.scan();
    setFieldStats(`${fields.length} fields found`);

    const response = await send('GET_CONTEXT', { url: window.location.href });
    if (!response.success) {
      if (response.needsPairing) {
        $('cvmind-pair-card').style.display = 'block';
        $('cvmind-fill-card').style.display = 'none';
        $('cvmind-badge-score').innerText = 'Connect';
      }
      setStatus(response.error || 'Could not reach CVMind.');
      return;
    }

    pageContext = response.data;
    const banner = $('cvmind-match-banner');
    const application = pageContext.application;

    if (application) {
      banner.style.display = 'block';
      $('cvmind-job-title').innerText = application.title || 'This job';
      if (typeof application.score === 'number') {
        $('cvmind-score-val').innerText = `${application.score}%`;
        $('cvmind-score-bar').style.width = `${application.score}%`;
        $('cvmind-badge-score').innerText = `${application.score}% match`;
      }
      setStatus(application.hasTailored ? 'Tailored resume ready for this job.' : 'Scored in CVMind.');
    } else if (pageContext.canTrack) {
      $('cvmind-track-card').style.display = 'block';
      setStatus('Not tracked in CVMind yet.');
    }

    if (!pageContext.resumeReady) {
      setStatus('Add a resume in CVMind before autofilling.');
      $('cvmind-btn-autofill').disabled = true;
    }
  }

  // ── Autofill ────────────────────────────────────────────────────────────────
  async function fillApplication() {
    const button = $('cvmind-btn-autofill');
    button.disabled = true;
    button.innerHTML = '<span>Preparing…</span>';

    const descriptors = CVMindScanner.scan();
    const response = await send('BUILD_FILL_PLAN', {
      url: window.location.href,
      descriptors,
      applicationId: pageContext?.application?.id || null
    });

    if (!response.success) {
      button.disabled = false;
      button.innerHTML = '<span>⚡ Fill application</span>';
      setStatus(response.error || 'Could not prepare the form.');
      if (response.needsPairing) $('cvmind-pair-card').style.display = 'block';
      return;
    }

    currentPlan = response.data;
    const files = {};
    if (currentPlan.resumeFile && currentPlan.applicationId) {
      const pdf = await send('FETCH_RESUME', { applicationId: currentPlan.applicationId });
      if (pdf.success) {
        const bytes = Uint8Array.from(atob(pdf.data.base64), (char) => char.charCodeAt(0));
        files.resume_file = new File([bytes], pdf.data.filename, { type: 'application/pdf' });
      }
    }

    const result = CVMindFiller.applyFillPlan(currentPlan, files);
    button.disabled = false;
    button.innerHTML = `<span>✓ Filled ${result.filled} fields</span>`;
    setTimeout(() => { button.innerHTML = '<span>⚡ Fill again</span>'; }, 4000);
    showReviewSummary(result);
    watchForSubmission();
  }

  function showReviewSummary(result) {
    const box = $('cvmind-review-box');
    const text = $('cvmind-review-text');
    const notes = [];

    if (result.review) notes.push(`<strong>${result.review}</strong> answer(s) are highlighted — visa, salary, notice period and AI-written answers always need your check.`);
    if (currentPlan.unmappedRequired?.length) {
      notes.push(`<strong>${currentPlan.unmappedRequired.length}</strong> required field(s) could not be filled: ${currentPlan.unmappedRequired.map((item) => item.label).join(', ')}.`);
    }
    if (result.failed.length) notes.push(`${result.failed.length} field(s) could not be filled automatically.`);
    if (!currentPlan.resumeFile) notes.push('No tailored PDF yet — attach your resume file yourself, or tailor this job in CVMind first.');

    if (!notes.length) {
      box.style.display = 'none';
      return;
    }
    text.innerHTML = notes.map((note) => `<p>${note}</p>`).join('');
    box.style.display = 'block';
    CVMindFiller.scrollToFirstReview(currentPlan);
  }

  // ── Tracking & submission ───────────────────────────────────────────────────
  async function trackJob() {
    const button = $('cvmind-btn-track');
    button.disabled = true;
    button.innerHTML = '<span>Adding…</span>';
    const response = await send('TRACK_JOB', { url: window.location.href });
    button.innerHTML = response.success ? '<span>✓ Added to CVMind</span>' : '<span>Could not add</span>';
    if (!response.success) {
      setStatus(response.error || 'Could not add this job.');
      button.disabled = false;
      return;
    }
    pageContext = { ...pageContext, application: { id: response.data.applicationId, status: response.data.status }, canTrack: false };
  }

  // The user submits; we only notice that it happened and tell CVMind
  function watchForSubmission() {
    if (submissionRecorded) return;
    document.addEventListener('submit', onSubmitted, true);
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button, input[type="submit"]');
      if (!button || button.closest('#cvmind-copilot-root')) return;
      const label = `${button.innerText || button.value || ''}`.toLowerCase();
      if (/submit|send application|apply now|finish/.test(label)) onSubmitted();
    }, true);
  }

  async function onSubmitted() {
    if (submissionRecorded || !pageContext?.application?.id) return;
    submissionRecorded = true;
    const response = await send('CONFIRM_SUBMITTED', { applicationId: pageContext.application.id, url: window.location.href });
    if (response.success) {
      setStatus('Recorded as submitted in CVMind.');
      $('cvmind-badge-score').innerText = 'Submitted';
    }
  }

  // ── Boot ────────────────────────────────────────────────────────────────────
  if (isApplicationPage()) {
    initWidget();
    loadContext();
  }

  let rescanTimer = null;
  new MutationObserver(() => {
    if (rescanTimer) clearTimeout(rescanTimer);
    rescanTimer = setTimeout(() => {
      if (!$('cvmind-copilot-root') && isApplicationPage()) {
        initWidget();
        loadContext();
      }
    }, 1200);
  }).observe(document.body, { childList: true, subtree: true });
})();

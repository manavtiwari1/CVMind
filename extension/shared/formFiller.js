/**
 * CVMind — form filler (shared by the content script and server-side automation)
 * Applies a fill plan built by the backend. It never clicks submit.
 */
(function () {
  const HIGHLIGHT_MS = 4000;

  // React and Vue track their own value, so setting el.value directly is ignored on re-render
  function setNativeValue(el, value) {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (descriptor?.set) descriptor.set.call(el, value);
    else el.value = value;
  }

  function notify(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function highlight(el, needsReview) {
    el.classList.add(needsReview ? 'cvmind-review-highlight' : 'cvmind-autofilled-highlight');
    if (needsReview) {
      el.title = 'CVMind filled this — please check it before submitting.';
      return;
    }
    setTimeout(() => el.classList.remove('cvmind-autofilled-highlight'), HIGHLIGHT_MS);
  }

  const matchText = (text, wanted) => String(text || '').toLowerCase().trim() === wanted
    || String(text || '').toLowerCase().includes(wanted);

  function fillText(el, value) {
    setNativeValue(el, value);
    notify(el);
    return true;
  }

  function fillSelect(el, value) {
    const wanted = String(value).toLowerCase().trim();
    const option = Array.from(el.options).find((item) => item.value.toLowerCase().trim() === wanted)
      || Array.from(el.options).find((item) => matchText(item.text, wanted));
    if (!option) return false;
    setNativeValue(el, option.value);
    notify(el);
    return true;
  }

  function fillChoice(el, value) {
    const wanted = String(value).toLowerCase().trim();
    if (el.type === 'checkbox') {
      const shouldCheck = /^(true|yes|y|1|on|checked)$/.test(wanted);
      if (el.checked !== shouldCheck) {
        el.click();
        return true;
      }
      return true;
    }
    const group = el.name ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)) : [el];
    const target = group.find((input) => input.value.toLowerCase().trim() === wanted)
      || group.find((input) => matchText(input.labels?.[0]?.textContent, wanted))
      || group.find((input) => matchText(input.getAttribute('aria-label'), wanted));
    if (!target) return false;
    target.click();
    return true;
  }

  function attachFile(el, file) {
    if (!file) return false;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    el.files = transfer.files;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  /**
   * @param {object} plan  - { items: [...] } from POST /api/agent/extension/fill-plan
   * @param {object} files - { resume_file: File } for upload actions
   */
  function applyFillPlan(plan, files = {}) {
    const result = { filled: 0, review: 0, failed: [] };

    for (const item of plan.items || []) {
      const el = item.selector ? document.querySelector(item.selector) : null;
      if (!el) {
        result.failed.push({ selector: item.selector, label: item.label, reason: 'not_found' });
        continue;
      }

      let done = false;
      try {
        if (item.action === 'upload') done = attachFile(el, files[item.canonicalKey]);
        else if (item.action === 'select' || el.tagName === 'SELECT') done = fillSelect(el, item.value);
        else if (item.action === 'check' || el.type === 'checkbox' || el.type === 'radio') done = fillChoice(el, item.value);
        else done = fillText(el, item.value);
      } catch (err) {
        result.failed.push({ selector: item.selector, label: item.label, reason: err.message });
        continue;
      }

      if (!done) {
        result.failed.push({ selector: item.selector, label: item.label, reason: 'no_match' });
        continue;
      }
      result.filled++;
      if (item.requiresReview) result.review++;
      highlight(el, item.requiresReview);
    }
    return result;
  }

  function scrollToFirstReview(plan) {
    const first = (plan.items || []).find((item) => item.requiresReview);
    const el = first?.selector ? document.querySelector(first.selector) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  globalThis.CVMindFiller = { applyFillPlan, scrollToFirstReview, setNativeValue };
})();

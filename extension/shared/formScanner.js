/**
 * CVMind — form scanner (shared by the content script and server-side automation)
 * Produces the field descriptors the backend maps to profile fields.
 */
(function () {
  const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'image', 'reset']);
  const MAX_NEARBY_TEXT = 140;

  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  function isVisible(el) {
    if (el.disabled || el.readOnly) return false;
    if (el.closest('#cvmind-copilot-root')) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    // Some ATS forms hide the real file input behind a styled button, so keep those
    return el.type === 'file' || el.offsetParent !== null || style.position === 'fixed';
  }

  // Stable enough to re-find the field later, without depending on class names that change per render
  function uniqueSelector(el) {
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`;
    const tag = el.tagName.toLowerCase();
    // A radio group is addressed by its shared name; the filler picks the right option by value,
    // and an index would only make the selector brittle
    if (el.type === 'radio' && el.name) return `input[type="radio"][name="${CSS.escape(el.name)}"]`;
    if (el.name) {
      const sameName = document.querySelectorAll(`${tag}[name="${CSS.escape(el.name)}"]`);
      if (sameName.length === 1) return `${tag}[name="${CSS.escape(el.name)}"]`;
      const index = Array.from(sameName).indexOf(el);
      if (index >= 0) return `${tag}[name="${CSS.escape(el.name)}"]:nth-of-type(${index + 1})`;
    }
    const path = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body && path.length < 6) {
      const parent = node.parentElement;
      if (!parent) break;
      const siblings = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
      path.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(node) + 1})`);
      if (parent.id) {
        path.unshift(`#${CSS.escape(parent.id)}`);
        return path.join(' > ');
      }
      node = parent;
    }
    return path.length ? `body > ${path.join(' > ')}` : null;
  }

  function labelFor(el) {
    // For a radio group the question is the fieldset's legend; each option's own label is just "Yes"/"No"
    if (el.type === 'radio') {
      const legend = el.closest('fieldset')?.querySelector('legend');
      if (legend && clean(legend.innerText)) return clean(legend.innerText);
    }
    if (el.id) {
      const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (explicit) return clean(explicit.innerText);
    }
    const wrapping = el.closest('label');
    if (wrapping) return clean(wrapping.innerText);

    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.innerText || '').join(' ');
      if (clean(text)) return clean(text);
    }
    const previous = el.previousElementSibling;
    if (previous && ['LABEL', 'SPAN', 'P', 'DIV', 'LEGEND'].includes(previous.tagName)) {
      const text = clean(previous.innerText);
      if (text && text.length < 120) return text;
    }
    const fieldset = el.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) return clean(legend.innerText);
    }
    return '';
  }

  function nearbyText(el) {
    const container = el.closest('div, fieldset, section, li, td') || el.parentElement;
    if (!container) return '';
    return clean(container.innerText).slice(0, MAX_NEARBY_TEXT);
  }

  const isRequired = (el, label) =>
    Boolean(el.required) || el.getAttribute('aria-required') === 'true' || /\*\s*$/.test(label) || /\brequired\b/i.test(label);

  function optionsFor(el) {
    if (el.tagName === 'SELECT') {
      return Array.from(el.options)
        .filter((option) => option.value !== '')
        .slice(0, 50)
        .map((option) => ({ value: option.value, text: clean(option.text) }));
    }
    return [];
  }

  function radioGroup(el) {
    if (el.type !== 'radio' || !el.name) return [el];
    return Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`));
  }

  function scan() {
    const elements = Array.from(document.querySelectorAll('input, textarea, select'))
      .filter((el) => !SKIP_TYPES.has(el.type) && isVisible(el));

    const descriptors = [];
    const seenRadioGroups = new Set();

    for (const el of elements) {
      // A radio group is one question, not one field per option
      if (el.type === 'radio' && el.name) {
        if (seenRadioGroups.has(el.name)) continue;
        seenRadioGroups.add(el.name);
      }

      const label = labelFor(el);
      const group = radioGroup(el);
      const id = `f${descriptors.length}`;
      descriptors.push({
        id,
        selector: uniqueSelector(el),
        tag: el.tagName.toLowerCase(),
        type: el.tagName === 'TEXTAREA' ? 'textarea' : (el.type || 'text'),
        name: el.name || '',
        elementId: el.id || '',
        label: label || el.getAttribute('aria-label') || el.placeholder || el.name || `Field ${descriptors.length + 1}`,
        ariaLabel: el.getAttribute('aria-label') || '',
        placeholder: el.placeholder || '',
        nearbyText: nearbyText(el),
        required: isRequired(el, label),
        multiple: Boolean(el.multiple),
        accept: el.accept || '',
        options: el.type === 'radio'
          ? group.map((input) => ({ value: input.value, text: clean(input.labels?.[0]?.textContent || input.getAttribute('aria-label') || input.value) }))
          : optionsFor(el)
      });
    }
    return descriptors.filter((descriptor) => descriptor.selector);
  }

  globalThis.CVMindScanner = { scan, uniqueSelector, labelFor };
})();

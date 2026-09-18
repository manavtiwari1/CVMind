import { sha256 } from '../resume/derive.js';
import { mapFieldByRules } from './ruleMapper.js';
import { resolveValue, standardAnswerFor } from './resolveValue.js';
import { mapFieldsWithAi } from './aiMapper.js';
import { actionForKey, isSensitiveKey, labelForKey } from './canonicalFields.js';

const AI_CONFIDENCE = 0.6;

// Identifies an exact set of answers. Edits change it, which invalidates an earlier approval.
export const planHashOf = (items) => sha256(JSON.stringify(items.map((item) => [item.selector, item.action, item.value]).sort()));

function optionMatching(descriptor, value) {
  const wanted = String(value).toLowerCase().trim();
  if (!wanted || !descriptor.options?.length) return null;
  return descriptor.options.find((option) => String(option.text).toLowerCase().trim() === wanted)
    || descriptor.options.find((option) => String(option.value).toLowerCase().trim() === wanted)
    || descriptor.options.find((option) => String(option.text).toLowerCase().includes(wanted))
    || null;
}

function actionFor(descriptor, canonicalKey) {
  const type = String(descriptor.type || '').toLowerCase();
  if (canonicalKey === 'resume_file' || type === 'file') return 'upload';
  // Radios and checkboxes are decided by type first: a radio group also carries options,
  // but it must be ticked, not treated as a <select>
  if (type === 'checkbox' || type === 'radio') return 'check';
  if (descriptor.tag === 'select' || descriptor.options?.length) return 'select';
  return actionForKey(canonicalKey);
}

/**
 * Turns scanned form fields into a plan the extension (and later Playwright) can apply.
 * Anything the model decided, anything sensitive, and anything we could not fill is flagged for review.
 */
export async function buildFillPlan(descriptors, context, { client, aiMapper = mapFieldsWithAi, useAi = true } = {}) {
  const ruleMapped = new Map();
  const leftovers = [];
  for (const descriptor of descriptors) {
    const match = mapFieldByRules(descriptor);
    if (!match) {
      leftovers.push(descriptor);
      continue;
    }
    // A free-text question is answered from the user's saved answers when one fits; otherwise the model writes it
    if (match.canonicalKey === 'open_question' && !standardAnswerFor(descriptor, context.preferences || {})) {
      leftovers.push(descriptor);
      continue;
    }
    ruleMapped.set(descriptor.id, { ...match, fromAi: false });
  }

  let aiMappings = new Map();
  let aiError = null;
  if (useAi && leftovers.length) {
    try {
      aiMappings = await aiMapper(leftovers, context, { client });
    } catch (err) {
      // A failed mapping should not lose the fields the rules already matched
      aiError = err.message;
    }
  }

  const items = [];
  const unmappedRequired = [];
  for (const descriptor of descriptors) {
    const fromRules = ruleMapped.get(descriptor.id);
    const fromAi = aiMappings.get(descriptor.id);
    const mapping = fromRules || (fromAi ? { canonicalKey: fromAi.canonicalKey, confidence: AI_CONFIDENCE, fromAi: true } : null);

    if (!mapping) {
      if (descriptor.required) unmappedRequired.push({ selector: descriptor.selector, label: descriptor.label || descriptor.name || 'Unnamed field' });
      continue;
    }

    const saved = mapping.canonicalKey === 'open_question' ? standardAnswerFor(descriptor, context.preferences || {}) : '';
    const resolved = saved
      ? { value: saved, source: 'standard_answer' }
      : resolveValue(mapping.canonicalKey, { ...context, answer: fromAi?.answer || '' });

    const action = actionFor(descriptor, mapping.canonicalKey);
    let value = resolved.value;
    if (action === 'select' && value) {
      const option = optionMatching(descriptor, value);
      // Leave the raw value so the user can pick, but flag that we could not match an option
      value = option ? option.value : value;
    }

    if (!value) {
      if (descriptor.required) unmappedRequired.push({ selector: descriptor.selector, label: descriptor.label || labelForKey(mapping.canonicalKey) });
      continue;
    }

    const sensitive = isSensitiveKey(mapping.canonicalKey);
    const needsOptionReview = action === 'select' && !optionMatching(descriptor, resolved.value);
    items.push({
      selector: descriptor.selector,
      fieldId: descriptor.id,
      label: descriptor.label || labelForKey(mapping.canonicalKey),
      canonicalKey: mapping.canonicalKey,
      action,
      value,
      valueSource: resolved.source,
      confidence: mapping.confidence,
      sensitive,
      requiresReview: sensitive || mapping.fromAi || needsOptionReview || resolved.source === 'ai_answer',
      reason: sensitive ? 'Sensitive answer — check before submitting.'
        : mapping.fromAi ? 'Matched by AI — check before submitting.'
          : needsOptionReview ? 'No matching option found — choose one yourself.'
            : ''
    });
  }

  const planHash = planHashOf(items);
  return {
    items,
    unmappedRequired,
    planHash,
    stats: {
      total: descriptors.length,
      filled: items.length,
      needsReview: items.filter((item) => item.requiresReview).length,
      aiMapped: items.filter((item) => item.confidence === AI_CONFIDENCE).length
    },
    aiError
  };
}

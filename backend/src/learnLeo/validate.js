import vm from 'vm';
import { ELEMENT_TYPES } from './prompts.js';

// Checks one beat from the model and repairs what can be repaired. Returns
// { ok, beat, errors } where errors are the problems that need a retry. With lenient (the retry),
// a broken diagram or code element is dropped instead of failing the beat.

const WORDS_PER_SECOND = 2.6; // a calm speaking pace; used to estimate a beat's length

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const words = (text) => String(text || '').trim().split(/\s+/).filter(Boolean);
const wordKey = (w) => String(w || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '');

export const estimateDurationMs = (narration) => Math.round((words(narration).length / WORDS_PER_SECOND) * 1000);

function balanced(text, pairs = { '[': ']', '(': ')', '{': '}' }) {
  const closers = new Set(Object.values(pairs));
  const stack = [];
  for (const ch of text) {
    if (pairs[ch]) stack.push(pairs[ch]);
    else if (closers.has(ch) && stack.pop() !== ch) return false;
  }
  return stack.length === 0;
}

const MERMAID_HEAD = /^\s*(graph|flowchart)\s+(TD|TB|BT|LR|RL)\b/i;

export function checkMermaid(content) {
  if (!content || content.length > 1500) return 'diagram is empty or too long';
  if (!MERMAID_HEAD.test(content)) return 'diagram must start with "graph LR" / "flowchart TD"';
  if (!balanced(content)) return 'diagram has unbalanced brackets';
  return null;
}

const JS_LANGS = new Set(['js', 'javascript', 'node', 'jsx']);

// JavaScript is compiled (never run) to catch syntax errors. A snippet may be a function body
// (with return/await), so it is tried as a script and then wrapped in an async function.
export function checkCode(content, language) {
  if (!content) return 'code is empty';
  if (content.split('\n').length > 30 || content.length > 2500) return 'code is too long';
  if (!JS_LANGS.has(String(language || '').toLowerCase())) return null;
  for (const source of [content, `(async function __leo__() {\n${content}\n})`]) {
    try {
      new vm.Script(source);
      return null;
    } catch { /* try the next form */ }
  }
  return 'code has a syntax error';
}

function cleanCheckpoint(el) {
  const format = el.format === 'true_false' ? 'true_false' : 'mcq';
  let options = Array.isArray(el.options) ? el.options.map((o) => str(String(o ?? ''), 160)).filter(Boolean) : [];
  if (format === 'true_false') options = ['True', 'False'];
  const answer = Number(el.answer);
  const question = str(el.question, 300);
  if (!question) return { error: 'checkpoint has no question' };
  if (options.length < 2 || options.length > 4) return { error: 'checkpoint needs 2–4 options' };
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return { error: 'checkpoint answer is not a valid option index' };
  return { el: { type: 'checkpoint', format, question, options, answer, explanation: str(el.explanation, 300) } };
}

// One element: { el } when usable, { error, droppable } when not
function cleanElement(raw) {
  if (!raw || typeof raw !== 'object') return { error: 'element is not an object' };
  const type = String(raw.type || '').toLowerCase();
  if (!ELEMENT_TYPES.includes(type)) return { error: `unknown element type "${raw.type}"`, droppable: true };
  const cue = str(raw.cue, 60);
  switch (type) {
    case 'heading':
    case 'callout': {
      const content = str(raw.content, type === 'heading' ? 140 : 280);
      return content ? { el: { type, content, cue } } : { error: `${type} is empty`, droppable: true };
    }
    case 'bullet': {
      const list = Array.isArray(raw.items) ? raw.items : raw.content ? [raw.content] : [];
      const items = list.map((i) => str(String(i ?? ''), 200)).filter(Boolean).slice(0, 5);
      return items.length ? { el: { type, items, cue } } : { error: 'bullet has no items', droppable: true };
    }
    case 'code': {
      const content = typeof raw.content === 'string' ? raw.content.replace(/^```\w*\n?|```\s*$/g, '').trimEnd() : '';
      const language = str(raw.language, 20).toLowerCase() || 'js';
      const error = checkCode(content, language);
      return error ? { error, droppable: true } : { el: { type, language, content, cue } };
    }
    case 'formula': {
      const content = str(raw.content, 300).replace(/^\$+|\$+$/g, '').trim();
      if (!content) return { error: 'formula is empty', droppable: true };
      return balanced(content, { '{': '}' }) ? { el: { type, content, cue } } : { error: 'formula has unbalanced braces', droppable: true };
    }
    case 'diagram': {
      const content = str(raw.content, 1500);
      const error = checkMermaid(content);
      return error ? { error, droppable: true } : { el: { type, format: 'mermaid', content, cue } };
    }
    case 'table': {
      const headers = Array.isArray(raw.headers) ? raw.headers.map((h) => str(String(h ?? ''), 60)).slice(0, 5) : [];
      if (!headers.length) return { error: 'table has no headers', droppable: true };
      const rows = (Array.isArray(raw.rows) ? raw.rows : []).slice(0, 6).filter(Array.isArray)
        .map((r) => headers.map((_, i) => str(String(r[i] ?? ''), 120)));
      return rows.length ? { el: { type, headers, rows, cue } } : { error: 'table has no rows', droppable: true };
    }
    case 'checkpoint':
      return cleanCheckpoint(raw);
    default:
      return { error: `unknown element type "${raw.type}"`, droppable: true };
  }
}

// Cues must be words of the narration, in order; one that isn't found is cleared and the element
// shows together with the element before it (at the start of the beat when it is first), so the
// board keeps its order. wordIndex is stored to time the reveal.
function placeCues(narration, elements) {
  const keys = words(narration).map(wordKey);
  let from = 0;
  for (const el of elements) {
    if (el.type === 'checkpoint') continue;
    const want = wordKey(String(el.cue || '').split(/\s+/)[0]);
    let at = want ? keys.indexOf(want, from) : -1;
    if (at === -1 && want) at = keys.indexOf(want); // out of order: still use it, but never earlier than the previous element
    if (at === -1) {
      el.cue = '';
      el.wordIndex = from;
    } else {
      el.wordIndex = Math.max(at, from);
      from = el.wordIndex;
    }
  }
}

/**
 * @param raw the model's JSON
 * @param opts { minWords, maxWords, maxElements, checkpoint: 'required' | 'forbidden' | 'optional', lenient }
 */
export function validateBeat(raw, { minWords = 40, maxWords = 90, maxElements = 5, checkpoint = 'optional', lenient = false } = {}) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['reply is not a JSON object'] };

  // narration is spoken, so markdown marks the model slips in are dropped
  const narration = str(raw.narration, 2000).replace(/[`*]+/g, '').replace(/\s+/g, ' ').trim();
  const count = words(narration).length;
  // the prompt asks for min–max words; a little slack, more on the retry
  const slack = lenient ? 0.5 : 0.25;
  if (count < Math.floor(minWords * (1 - slack)) || count > Math.ceil(maxWords * (1 + slack))) {
    errors.push(`narration has ${count} words; it must have ${minWords}–${maxWords}`);
  }

  const elements = [];
  const checkpoints = [];
  for (const item of Array.isArray(raw.elements) ? raw.elements : []) {
    const { el, error, droppable } = cleanElement(item);
    if (el?.type === 'checkpoint') checkpoints.push(el);
    else if (el) elements.push(el);
    else if (!(lenient && droppable)) errors.push(error);
  }

  if (checkpoint === 'required' && !checkpoints.length) errors.push('this beat must end with a checkpoint');
  const keep = checkpoint === 'forbidden' ? [] : checkpoints.slice(0, 1);
  const room = Math.max(1, maxElements - keep.length);
  const board = [...elements.slice(0, room), ...keep];
  if (!elements.length) errors.push('the beat needs at least one board element besides a checkpoint');

  if (errors.length) return { ok: false, errors };
  placeCues(narration, board);
  return {
    ok: true,
    errors: [],
    beat: { title: str(raw.title, 120) || str(board.find((e) => e.type === 'heading')?.content, 120), narration, elements: board, durationMs: estimateDurationMs(narration) }
  };
}

export function validatePlan(raw, { minSteps = 3, maxSteps = 6 } = {}) {
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['reply is not a JSON object'] };
  if (raw.allowed === false) return { ok: true, refused: true, message: str(raw.message, 400) || 'Leo only teaches technical and career topics.' };
  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map((s) => ({ title: str(s?.title, 120), goal: str(s?.goal, 240) }))
    .filter((s) => s.title)
    .slice(0, maxSteps);
  if (steps.length < minSteps) return { ok: false, errors: [`the plan needs ${minSteps}–${maxSteps} steps`] };
  return { ok: true, title: str(raw.title, 120), message: str(raw.message, 500), steps };
}

// Shows a tool's writing as it happens. The AI writes tool results as JSON, so this reads the JSON
// as it streams and passes on only the words of the named fields, e.g. a cover letter's paragraphs.

import { runWithLiveText } from '../services/claude.js';

// The fields worth watching for each tool. A tool that isn't here keeps its plain status line.
export const LIVE_FIELDS = {
  write_cover_letter: ['greeting', 'paragraphs', 'closing'],
  tailor_resume: ['summary', 'description'],
  interview_questions: ['question', 'whatInterviewerWants'],
  career_roadmap: ['phaseName', 'focus', 'actions', 'milestone', 'summary'],
  check_resume_ats: ['summary', 'strengths', 'weaknesses'],
  prepare_apply_pack: ['summary', 'description', 'greeting', 'paragraphs', 'closing'],
  write_linkedin_post: ['content'],
  elevator_pitch: ['oneLiner', 'corporate', 'startup', 'creative'],
  skill_gaps: ['summary', 'gaps'],
  start_mock_interview: ['question']
};

const ESCAPES = { n: '\n', t: ' ', r: '', b: '', f: '' };
const SEND_EVERY_MS = 80;

// Returns feed(delta). Works on any chunking, including a chunk that ends inside an escape.
export function jsonFieldReader(fields, emit) {
  const wanted = new Set(fields);
  const stack = [];
  let expectKey = false;
  let inString = false;
  let isKey = false;
  let showing = false;
  let key = '';
  let keyBuffer = '';
  let escaped = false;
  let hex = null;

  const put = (text) => {
    if (isKey) keyBuffer += text;
    else if (showing) emit(text);
  };

  const readString = (ch) => {
    if (hex !== null) {
      hex += ch;
      if (hex.length === 4) {
        put(String.fromCharCode(parseInt(hex, 16) || 32));
        hex = null;
      }
    } else if (escaped) {
      escaped = false;
      if (ch === 'u') hex = '';
      else put(ch in ESCAPES ? ESCAPES[ch] : ch);
    } else if (ch === '\\') {
      escaped = true;
    } else if (ch === '"') {
      inString = false;
      if (isKey) key = keyBuffer;
      else if (showing) emit('\n\n');
    } else {
      put(ch);
    }
  };

  return (delta) => {
    for (const ch of String(delta)) {
      if (inString) { readString(ch); continue; }
      if (ch === '{') { stack.push('object'); expectKey = true; }
      else if (ch === '[') stack.push('array');
      else if (ch === '}' || ch === ']') { stack.pop(); expectKey = false; }
      else if (ch === ',') expectKey = stack.at(-1) === 'object';
      else if (ch === '"' && stack.length) {
        inString = true;
        isKey = expectKey && stack.at(-1) === 'object';
        if (isKey) { keyBuffer = ''; expectKey = false; } else showing = wanted.has(key);
      }
    }
  };
}

// Runs work; what it writes reaches the chat through ctx.progress in small batches
export async function withLiveText(fields, ctx, work) {
  let pending = '';
  let timer = null;
  const flush = () => {
    clearTimeout(timer);
    timer = null;
    if (pending) ctx.progress?.({ text: pending });
    pending = '';
  };
  const feed = jsonFieldReader(fields, (text) => {
    pending += text;
    timer ||= setTimeout(flush, SEND_EVERY_MS);
  });
  try {
    return await runWithLiveText(feed, work);
  } finally {
    flush();
  }
}

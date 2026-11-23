import { createRequire } from 'module';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);

export const PDF_MIME = 'application/pdf';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const TXT_MIME = 'text/plain';
const RESUME_TYPES = [PDF_MIME, DOCX_MIME, TXT_MIME];
const RESUME_EXTENSIONS = ['pdf', 'docx', 'txt'];

// Labels that say nothing about the file. Phones send these for files picked from WhatsApp, Google
// Drive or the Files app, so the real type is read from the file itself.
const VAGUE_TYPES = new Set([
  '', 'application/octet-stream', 'binary/octet-stream', 'application/unknown', 'application/x-unknown',
  'application/download', 'application/x-download', 'application/force-download',
  'application/zip', 'application/x-zip-compressed', 'application/x-zip',
  'application/x-pdf', 'application/acrobat', 'text/pdf', 'application/msword', 'application/doc',
  'application/vnd.ms-word', 'application/word'
]);

const extensionOf = (name) => {
  const match = /\.([a-z0-9]+)$/i.exec(String(name || '').trim());
  return match ? match[1].toLowerCase() : '';
};

/**
 * Whether an upload may be a resume, judged from its name and label only (before its bytes arrive).
 * Lenient on purpose: detectResumeType decides from the bytes once they are here.
 */
export function mayBeResume({ mimetype = '', originalname = '' } = {}) {
  const type = String(mimetype).toLowerCase();
  return RESUME_TYPES.includes(type) || VAGUE_TYPES.has(type) || RESUME_EXTENSIONS.includes(extensionOf(originalname));
}

const startsWith = (buffer, bytes) => bytes.every((b, i) => buffer[i] === b);
// No NUL bytes and mostly printable characters: plain text, not a binary file
function looksLikeText(buffer) {
  const sample = buffer.subarray(0, 4096);
  if (!sample.length || sample.includes(0)) return false;
  let control = 0;
  for (const b of sample) if (b < 9 || (b > 13 && b < 32)) control += 1;
  return control / sample.length < 0.02;
}

/**
 * The resume's real type, read from its first bytes: PDF, DOCX or plain text, or null for anything else.
 * The browser's label is not trusted, since phones often send a vague one.
 */
export function detectResumeType(buffer, { mimetype = '', originalname = '' } = {}) {
  if (!buffer?.length) return null;
  // The PDF header may follow a little junk (allowed in the first 1 KB)
  if (buffer.subarray(0, 1024).includes('%PDF-')) return PDF_MIME;
  // DOCX is a ZIP archive that holds word/document.xml
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return buffer.includes('word/document.xml') ? DOCX_MIME : null;
  const type = String(mimetype).toLowerCase();
  const saysText = type.startsWith('text/') || extensionOf(originalname) === 'txt' || VAGUE_TYPES.has(type);
  return saysText && !buffer.subarray(0, 5).equals(Buffer.from('{\\rtf')) && looksLikeText(buffer) ? TXT_MIME : null;
}

/** Why a file could not be read as a resume, in words the user can act on. */
export function unreadableResumeMessage(buffer) {
  const head = buffer?.subarray?.(0, 8) || Buffer.alloc(0);
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return 'This is an old Word (.doc) file, which we can\'t read. Open it in Word or Google Docs, save it as PDF or DOCX, and upload that.';
  }
  if (startsWith(head, [0xff, 0xd8, 0xff]) || startsWith(head, [0x89, 0x50, 0x4e, 0x47]) || head.subarray(0, 4).equals(Buffer.from('RIFF'))) {
    return 'This looks like a photo of your resume. Please upload the PDF or DOCX file instead.';
  }
  if (head.subarray(0, 5).equals(Buffer.from('{\\rtf'))) {
    return 'This is a Rich Text (.rtf) file, which we can\'t read. Save it as PDF or DOCX and upload that.';
  }
  return 'We can only read PDF, DOCX and TXT files. Please upload your resume in one of these formats.';
}

/**
 * Normalizes a sharing URL (Google Drive, Dropbox) to a direct download URL.
 */
function normalizeUrl(url) {
  // Google Drive: /file/d/{id}/view → /uc?export=download&id={id}
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  // Google Docs export (if someone shares a doc link)
  const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) {
    return `https://docs.google.com/document/d/${docsMatch[1]}/export?format=txt`;
  }
  // Dropbox: force direct download
  if (url.includes('dropbox.com')) {
    return url.replace(/[?&]dl=0/, '').replace(/([?&])raw=0/, '$1raw=1') + (url.includes('?') ? '&dl=1' : '?dl=1');
  }
  return url;
}

/**
 * Fetches a resume file from a URL and returns its buffer and mimetype.
 * Supports Google Drive sharing links, Dropbox, and direct PDF/DOCX/TXT links.
 */
export async function fetchResumeFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Invalid URL provided.');
  }

  const url = normalizeUrl(rawUrl.trim());

  let response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CVMindBot/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });
  } catch (err) {
    throw new Error('Could not reach the provided URL. Please check the link and try again.');
  }

  if (!response.ok) {
    throw new Error(`Failed to download file from URL (HTTP ${response.status}). Ensure the link is publicly accessible.`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  // Reject HTML responses (auth walls, Google Drive virus scan pages, etc.)
  if (contentType.includes('text/html')) {
    throw new Error('The URL returned an HTML page instead of a file. For Google Drive, make sure the file is shared publicly ("Anyone with the link can view").');
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length < 100) {
    throw new Error('Downloaded file is too small or empty. Please verify the link.');
  }
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('File from URL exceeds the 5MB limit.');
  }

  // The type comes from the file's bytes; hosts often label downloads vaguely
  const mimetype = detectResumeType(buffer, { mimetype: contentType.split(';')[0].trim(), originalname: url.split('?')[0] });
  if (!mimetype) throw Object.assign(new Error(unreadableResumeMessage(buffer)), { status: 400 });

  return { buffer, mimetype };
}

// pdf-parse keeps the first engine it loads for the whole process (its `version` option only works on
// the first call), so the newer engine is loaded here directly and read the way pdf-parse reads pages.
let newerPdfJs = null;
async function readPdfWithNewerEngine(buffer) {
  newerPdfJs ||= require('pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js');
  newerPdfJs.disableWorker = true;
  const doc = await newerPdfJs.getDocument(new Uint8Array(buffer));
  try {
    const pages = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const content = await (await doc.getPage(i)).getTextContent();
      let lastY;
      let page = '';
      for (const item of content.items) {
        page += lastY === undefined || lastY === item.transform[5] ? item.str : `\n${item.str}`;
        lastY = item.transform[5];
      }
      pages.push(page);
    }
    return pages.join('\n\n');
  } finally {
    doc.destroy();
  }
}

/**
 * Parses a PDF buffer and extracts its text.
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
export async function parsePdf(buffer) {
  let text = '';
  let failure = null;
  try {
    text = (await pdfParse(buffer)).text || '';
  } catch (error) {
    failure = error;
  }
  // pdf-parse's default PDF engine (pdf.js 1.10) gives up on some valid PDFs ("bad XRef entry") or finds
  // no text in them; the newer engine it also ships (pdf.js 2.0) reads many of those.
  if (failure || text.trim().length < 50) {
    try {
      const retry = await readPdfWithNewerEngine(buffer);
      if (retry.trim().length > text.trim().length) {
        text = retry;
        failure = null;
      }
    } catch (error) {
      failure = failure || error;
    }
  }
  if (failure) {
    console.error('PDF parsing error:', failure);
    throw new Error('Failed to parse PDF document. Ensure the file is not corrupted.');
  }
  return text;
}

/**
 * Parses a DOCX buffer and extracts its text.
 * @param {Buffer} buffer - The DOCX file buffer
 * @returns {Promise<string>} - Extracted text
 */
export async function parseDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse Word document. Ensure the file is not corrupted.');
  }
}

const NAMED_ENTITIES = { nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'", bull: '•', ndash: '–', mdash: '—', middot: '·', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };

/**
 * Converts saved resume HTML into plain text that keeps line and bullet structure,
 * so an AI parser can still tell sections, roles and bullets apart.
 * @param {string} html - Resume HTML (e.g. a CVMind builder document)
 * @returns {string} - Structured plain text
 */
export function htmlToStructuredText(html) {
  return String(html || '')
    .replace(/<(script|style|head|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li|ul|ol|section|header|footer|table|article|aside)>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (entity, name) => NAMED_ENTITIES[name.toLowerCase()] ?? entity)
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v ]+/g, ' ').replace(/(\s*\|\s*)+$/, '').trim())
    // Blank lines come from markup indentation, not the resume, and would split bullet lists apart
    .filter(Boolean)
    .join('\n');
}

/**
 * Parses a plain text buffer.
 * @param {Buffer} buffer - The text file buffer
 * @returns {string} - Decoded text
 */
export function parseTxt(buffer) {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Text parsing error:', error);
    throw new Error('Failed to read text file. Ensure it is encoded in UTF-8.');
  }
}

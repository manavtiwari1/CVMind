import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

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

  // Determine mimetype from Content-Type header first, then URL extension
  let mimetype = '';
  if (contentType.includes('pdf')) {
    mimetype = 'application/pdf';
  } else if (contentType.includes('openxmlformats') || contentType.includes('wordprocessingml') || contentType.includes('msword')) {
    mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  } else if (contentType.includes('text/plain')) {
    mimetype = 'text/plain';
  } else {
    const urlLower = url.split('?')[0].toLowerCase();
    if (urlLower.endsWith('.pdf')) mimetype = 'application/pdf';
    else if (urlLower.endsWith('.docx')) mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (urlLower.endsWith('.txt')) mimetype = 'text/plain';
    else {
      // Check PDF magic bytes (%PDF-)
      if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        mimetype = 'application/pdf';
      } else {
        throw new Error('Unsupported file type from URL. Please provide a link to a PDF, DOCX, or TXT file.');
      }
    }
  }

  return { buffer, mimetype };
}

/**
 * Parses a PDF buffer and extracts its text.
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
export async function parsePdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF document. Ensure the file is not corrupted.');
  }
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

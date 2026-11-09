import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';
import { SLUG_RE, slugProblem } from '../growth/shareLinks.js';

// Published portfolios at username.portfolio.cvmind.in. The sign-in cookie is shared across
// .cvmind.in and readable by scripts, so a published page must never be able to run JavaScript:
// pages are cleaned here when published, and served with a CSP that blocks scripts as well.

const portfolioSiteSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  workId: { type: String, required: true },
  // A cleaned copy, so editing or deleting the document never changes the live site
  html: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  // Hidden by a moderator: the link stops working and the owner can't republish
  hidden: { type: Boolean, default: false },
  hiddenReason: { type: String, default: '' },
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const PortfolioSite = mongoose.models.PortfolioSite || mongoose.model('PortfolioSite', portfolioSiteSchema);

const MAX_HTML_LENGTH = 1024 * 1024;

// Names that would look like part of CVMind, on top of the ones share links already reserve
const RESERVED_USERNAMES = new Set(['www', 'team', 'placements', 'mail', 'email', 'ns1', 'ns2', 'cdn', 'static', 'status', 'blog', 'auth', 'billing', 'docs', 'leo', 'security', 'official']);

export function usernameProblem(username) {
  const problem = slugProblem(username);
  if (problem) return problem;
  // Two hyphens after two characters is the DNS prefix for punycode (xn--) and its future relatives
  if (RESERVED_USERNAMES.has(username) || username.includes('cvmind') || username.slice(2, 4) === '--') {
    return 'That username is reserved. Try another one.';
  }
  return null;
}

const HTML_TAGS = ['html', 'head', 'body', 'title', 'meta', 'link', 'style', 'header', 'footer', 'main', 'nav', 'section', 'article', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'a', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'strong', 'em', 'b', 'i', 'u', 's', 'small', 'sub', 'sup', 'mark', 'br', 'hr', 'blockquote', 'q', 'cite', 'code', 'pre', 'kbd', 'time', 'figure', 'figcaption', 'address', 'abbr', 'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'details', 'summary', 'img'];

// Drawing elements only. <use>, <image>, <foreignObject> and the <animate> family can load or inject content
const SVG_TAGS = ['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'pattern', 'desc'];

// The parser lowercases attribute names, and browsers restore the SVG casing (viewbox to viewBox)
const SVG_ATTRIBUTES = ['viewbox', 'preserveaspectratio', 'xmlns', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'dx', 'dy', 'width', 'height', 'points', 'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'clip-path', 'mask', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'stroke-miterlimit', 'opacity', 'transform', 'transform-origin', 'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform', 'spreadmethod', 'patternunits', 'patterntransform', 'clippathunits', 'maskunits', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'letter-spacing'];

const isGoogleFontsUrl = (href) => {
  try {
    const url = new URL(href);
    return url.protocol === 'https:' && (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com');
  } catch {
    return false;
  }
};

/** Keeps a generated page's layout and styles and removes everything that could run or redirect. */
export function cleanPortfolioHtml(html) {
  const clean = sanitizeHtml(String(html || ''), {
    allowedTags: [...HTML_TAGS, ...SVG_TAGS],
    // Needed to keep <style>; its contents are made inert below
    allowVulnerableTags: true,
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'title', 'lang', 'dir', 'role', 'aria-*', 'data-*', ...SVG_ATTRIBUTES],
      a: ['href', 'target', 'rel'],
      link: ['rel', 'href', 'crossorigin'],
      // No http-equiv, which could redirect the page
      meta: ['charset', 'name', 'content', 'property'],
      img: ['src', 'alt', 'loading'],
      time: ['datetime'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan', 'scope']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['https', 'data'] },
    allowProtocolRelative: false,
    parseStyleAttributes: false,
    exclusiveFilter: (frame) => frame.tag === 'link' && !isGoogleFontsUrl(frame.attribs.href)
  });

  // Inside <svg> a browser parses <style> contents as markup, so a "<" there could become a real
  // element the sanitizer never saw. CSS can write the same character as an escape.
  const inert = clean.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (_, open, css, close) => `${open}${css.replace(/</g, '\\3c ')}${close}`);
  return `<!DOCTYPE html>\n${inert}`;
}

async function defaultLoadWork(workId, userId) {
  if (!mongoose.isValidObjectId(workId)) return null;
  return mongoose.model('Work').findOne({ _id: workId, userId: String(userId), type: 'portfolio-gen' }).lean();
}

const toClient = (site) => (site
  ? { username: site.username, enabled: site.enabled && !site.hidden, publishedAt: site.publishedAt }
  : null);

export async function getSite(userId) {
  return toClient(await PortfolioSite.findOne({ userId: String(userId) }).lean());
}

export async function checkUsername(name, userId) {
  const username = String(name || '').trim().toLowerCase();
  const problem = usernameProblem(username);
  if (problem) return { available: false, problem };
  const taken = await PortfolioSite.exists({ username, userId: { $ne: String(userId) } });
  return taken ? { available: false, problem: 'That username is taken. Try another one.' } : { available: true };
}

function generatedHtml(work) {
  try {
    return JSON.parse(work.htmlContent).portfolioHTML || '';
  } catch {
    return '';
  }
}

/** Puts a generated portfolio live. The username is fixed by the first publish. */
export async function publishSite({ userId, workId, username, loadWork = defaultLoadWork }) {
  const work = await loadWork(workId, userId);
  if (!work) return { error: 'Portfolio not found. Build it again and publish.', status: 404 };
  if (work.hidden) return { error: 'This portfolio was hidden by a moderator and can\'t be published.', status: 403 };

  const raw = generatedHtml(work);
  if (!raw) return { error: 'This portfolio has no page to publish. Build it again.', status: 400 };
  if (raw.length > MAX_HTML_LENGTH) return { error: 'This portfolio is too large to publish.', status: 413 };
  const html = cleanPortfolioHtml(raw);

  const owner = String(userId);
  const existing = await PortfolioSite.findOne({ userId: owner });
  if (existing?.hidden) return { error: 'Your site was hidden by a moderator. Contact support for help.', status: 403 };

  if (existing) {
    Object.assign(existing, { workId: String(workId), html, enabled: true, publishedAt: new Date() });
    await existing.save();
    return { site: toClient(existing) };
  }

  const clean = String(username || '').trim().toLowerCase();
  const problem = usernameProblem(clean);
  if (problem) return { error: problem, status: 400 };
  try {
    return { site: toClient(await PortfolioSite.create({ userId: owner, username: clean, workId: String(workId), html })) };
  } catch (err) {
    if (err.code === 11000) return { error: 'That username is taken. Try another one.', status: 409 };
    throw err;
  }
}

/** Takes the site offline and keeps the username, so publishing again restores the same link. */
export async function unpublishSite(userId) {
  const site = await PortfolioSite.findOneAndUpdate({ userId: String(userId) }, { enabled: false }, { returnDocument: 'after' }).lean();
  return toClient(site);
}

// Serves every published page. default-src 'none' also rules out scripts, the reason this exists.
const CSP = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const SITE_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex',
  'Cache-Control': 'public, max-age=0, s-maxage=60'
};

const NOT_FOUND_PAGE = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portfolio not found · CVMind</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#faf9f5;color:#141413;text-align:center}
h1{font-size:24px;margin:0 0 8px}p{margin:0 0 20px;color:#73726c;line-height:1.6}a{color:#c96442;font-weight:600}</style></head>
<body><main><h1>This portfolio isn't here</h1><p>The link may be wrong, or its owner may have taken it down.</p><a href="https://www.cvmind.in/">Build your own portfolio with CVMind</a></main></body></html>`;

// lvh.me resolves to 127.0.0.1 and stands in for portfolio.cvmind.in locally. In production the
// Vercel function reads the visitor's host and calls /sites/<username>.
const LOCAL_HOST_RE = /^([a-z0-9-]+)\.portfolio\.lvh\.me(?::\d+)?$/i;
const SITE_PATH_RE = /^(?:\/_\/backend)?\/sites\/([^/]+)\/?$/;

export function createSiteServer({ ready = async () => {} } = {}) {
  return async function servePortfolioSite(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const hostMatch = LOCAL_HOST_RE.exec(req.headers.host || '');
    const pathMatch = hostMatch ? null : SITE_PATH_RE.exec(req.path);
    if (!hostMatch && !pathMatch) return next();

    const sendMissing = () => res.status(404).set(SITE_HEADERS).type('html').send(NOT_FOUND_PAGE);
    if (hostMatch && req.path !== '/') return sendMissing();

    const username = String((hostMatch || pathMatch)[1]).toLowerCase();
    if (!SLUG_RE.test(username)) return sendMissing();
    try {
      await ready();
      const site = await PortfolioSite.findOne({ username }, { html: 1, enabled: 1, hidden: 1 }).lean();
      if (!site || !site.enabled || site.hidden) return sendMissing();
      return res.status(200).set(SITE_HEADERS).type('html').send(site.html);
    } catch (err) {
      console.error('[portfolio sites] could not serve page:', err.message);
      return res.status(503).set({ ...SITE_HEADERS, 'Cache-Control': 'no-store' }).type('text').send('This portfolio is temporarily unavailable.');
    }
  };
}

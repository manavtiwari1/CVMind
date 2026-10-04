import { withContext, closeBrowser } from '../browser.js';

// Re-exported so existing callers (worker shutdown) keep working
export { closeBrowser };

export function renderPdf(html, { format = 'A4' } = {}) {
  return withContext(async (context) => {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    return page.pdf({ format, printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '14mm', right: '14mm' } });
  }, { javaScriptEnabled: false });
}

// Fonts the resume editor offers; everything else on the network is blocked while rendering user HTML.
const ALLOWED_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

/** Renders resume HTML from the editor to a PDF. Only inline data and Google Fonts may load. */
export function renderResumePdf(html, { format = 'A4', fontsHref = '' } = {}) {
  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8">${fontsHref ? `<link rel="stylesheet" href="${fontsHref}">` : ''}
<style>:root{--rs-h:${format === 'Letter' ? '1056px' : '1123px'}}body{margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}*{box-sizing:border-box}</style>
</head><body>${html}</body></html>`;
  return withContext(async (context) => {
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith('data:') || url === 'about:blank') return route.continue();
      try {
        if (ALLOWED_HOSTS.has(new URL(url).hostname)) return route.continue();
      } catch { /* fall through */ }
      return route.abort();
    });
    const page = await context.newPage();
    await page.setContent(doc, { waitUntil: 'networkidle', timeout: 20000 });
    // Templates carry their own page padding (and full-bleed sidebars), so the PDF page has no margin.
    return page.pdf({ format, printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  }, { javaScriptEnabled: false });
}

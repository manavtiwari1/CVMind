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

// Fallback for when the server can't render a PDF: lay the resume out the same way the server
// does (backend renderResumePdf) in a hidden iframe and open the browser's print dialog, where
// "Save as PDF" keeps the text selectable for ATS parsers.

// Same font set the server loads for exports (EXPORT_FONTS_HREF in backend/src/index.js)
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Rubik:wght@300;400;500;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;500;600&family=Open+Sans:wght@400;600;700;800&family=Raleway:wght@300;400;600&family=EB+Garamond:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800&display=swap';

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function printResume(html: string, fileName: string, paper: 'a4' | 'letter'): Promise<void> {
  const letter = paper === 'letter';
  // The document title becomes the suggested file name in "Save as PDF"
  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(fileName)}</title>
<link rel="stylesheet" href="${FONTS_HREF}">
<style>@page{size:${letter ? 'letter' : 'A4'};margin:0}:root{--rs-h:${letter ? '1056px' : '1123px'}}body{margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}*{box-sizing:border-box}</style>
</head><body>${html}</body></html>`;

  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    frame.onload = async () => {
      const win = frame.contentWindow;
      if (!win) { frame.remove(); reject(new Error('Could not open the print view.')); return; }
      try { await win.document.fonts.ready; } catch { /* print with fallback fonts */ }
      // Remove the frame once printing is done; the timeout covers browsers without afterprint
      const cleanup = () => setTimeout(() => frame.remove(), 1000);
      win.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 60000);
      win.focus();
      win.print();
      resolve();
    };
    frame.srcdoc = doc;
    document.body.appendChild(frame);
  });
}

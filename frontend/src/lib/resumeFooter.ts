// The locked "cvmind.in · Powered by CVMind" footer every resume template ends with
// (see footer() in data/cvTemplates.ts). It is kept out of AI calls and re-attached afterwards.

export const FOOTER_MARKER = '<!-- FOOTER BRANDING';

/** Separates the locked CVMind footer from a template so the AI never rewrites it. */
export function splitFooter(html: string): { body: string; footer: string } {
  const i = html.indexOf(FOOTER_MARKER);
  if (i < 0) return { body: html, footer: '' };
  const end = html.lastIndexOf('</div>');
  return { body: html.slice(0, i) + html.slice(end), footer: html.slice(i, end) };
}

export function withFooter(html: string, footer: string): string {
  if (!footer || html.includes(FOOTER_MARKER)) return html;
  const end = html.lastIndexOf('</div>');
  return end < 0 ? html + footer : html.slice(0, end) + footer + html.slice(end);
}

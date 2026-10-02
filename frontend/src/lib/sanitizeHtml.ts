// AI-filled resume HTML is shown and edited in the page, so strip anything that could run code.
const BLOCKED_TAGS = 'script, iframe, object, embed, link, meta, base, form, input, button, textarea, select';

export function sanitizeResumeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  doc.body.querySelectorAll(BLOCKED_TAGS).forEach(el => el.remove());
  doc.body.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.replace(/\s+/g, '').toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}

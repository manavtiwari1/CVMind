// Design, colour and section helpers for the resume editor (pure DOM logic, no React).

/* ───────────────────────────── Design settings ───────────────────────────── */

export interface DesignState {
  margin: number;      // 0–4, 2 = template default
  spacing: number;
  lineHeight: number;
  fontSize: number;
  accent: string | null;
  font: string | null;
}
export const DEFAULT_DESIGN: DesignState = { margin: 2, spacing: 2, lineHeight: 2, fontSize: 2, accent: null, font: null };

export type PaperSize = 'a4' | 'letter';
export const PAPER: Record<PaperSize, { width: number; height: number; label: string }> = {
  a4: { width: 794, height: 1123, label: 'A4' },
  letter: { width: 816, height: 1056, label: 'US Letter' },
};

export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Rubik:wght@300;400;500;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;500;600&family=Open+Sans:wght@400;600;700;800&family=Raleway:wght@300;400;600&family=EB+Garamond:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&display=swap';

export const FONT_OPTIONS = [
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Rubik', value: "'Rubik', sans-serif" },
  { label: 'Lato', value: "'Lato', sans-serif" },
  { label: 'Poppins', value: "'Poppins', sans-serif" },
  { label: 'Merriweather', value: "'Merriweather', serif" },
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'Open Sans', value: "'Open Sans', sans-serif" },
  { label: 'Raleway', value: "'Raleway', sans-serif" },
  { label: 'EB Garamond', value: "'EB Garamond', serif" },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
];

export const ACCENTS = ['#2563eb', '#0f766e', '#16a34a', '#ea580c', '#dc2626', '#7c3aed', '#db2777', '#0891b2', '#ca8a04', '#334155'];

const MARGIN_F = [0.4, 0.7, 1, 1.35, 1.7];
const SPACING_F = [0.5, 0.75, 1, 1.4, 1.8];
const LINE_F = [0.82, 0.92, 1, 1.12, 1.25];
const SIZE_F = [0.88, 0.94, 1, 1.07, 1.14];

const num = (v: string | undefined, fallback: number) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : fallback);

/** Remembers an element's original value the first time we touch it, so sliders scale from the template's own design. */
function baseOf(el: HTMLElement, key: string, read: () => number): number {
  if (el.dataset[key] === undefined) el.dataset[key] = String(read());
  return num(el.dataset[key], read());
}

export function applyMargin(ed: HTMLElement, level: number) {
  const root = ed.firstElementChild as HTMLElement | null;
  if (!root) return;
  const cs = getComputedStyle(root);
  const top = baseOf(root, 'rsPadT', () => parseFloat(cs.paddingTop) || 36);
  const left = baseOf(root, 'rsPadL', () => parseFloat(cs.paddingLeft) || 32);
  const f = MARGIN_F[level];
  root.style.padding = `${Math.round(top * f)}px ${Math.round(left * f)}px`;
}

export function applyLineHeight(ed: HTMLElement, level: number) {
  const root = ed.firstElementChild as HTMLElement | null;
  if (!root) return;
  const cs = getComputedStyle(root);
  const base = baseOf(root, 'rsLh', () => {
    const lh = parseFloat(cs.lineHeight);
    const fs = parseFloat(cs.fontSize) || 13;
    return Number.isNaN(lh) ? 1.55 : lh / fs;
  });
  root.style.lineHeight = String(Math.round(base * LINE_F[level] * 100) / 100);
}

export function applyFontScale(ed: HTMLElement, level: number) {
  const root = ed.firstElementChild as HTMLElement | null;
  if (!root) return;
  const f = SIZE_F[level];
  [root, ...Array.from(root.querySelectorAll<HTMLElement>('[style*="font-size"]'))].forEach(el => {
    const base = baseOf(el, 'rsFs', () => parseFloat(getComputedStyle(el).fontSize) || 13);
    el.style.fontSize = `${Math.round(base * f * 10) / 10}px`;
  });
}

export function applyFontFamily(ed: HTMLElement, font: string) {
  const root = ed.firstElementChild as HTMLElement | null;
  if (!root) return;
  // Templates set font-family on their root and sometimes on inner elements; override all of them.
  [root, ...Array.from(root.querySelectorAll<HTMLElement>('[style*="font-family"]'))].forEach(el => { el.style.fontFamily = font; });
}

const hexToRgb = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

/** Rewrites every use of the template's accent colour (hex or rgb form) in the page HTML. */
export function recolorHtml(html: string, from: string, to: string): string {
  let out = html.replace(new RegExp(from.replace('#', '#?'), 'gi'), to);
  const rgb = hexToRgb(from);
  if (rgb) out = out.replace(new RegExp(`rgb\\(\\s*${rgb.r}\\s*,\\s*${rgb.g}\\s*,\\s*${rgb.b}\\s*\\)`, 'gi'), to);
  return out;
}

export function hasColor(html: string, color: string): boolean {
  const rgb = hexToRgb(color);
  return html.toLowerCase().includes(color.toLowerCase())
    || (!!rgb && new RegExp(`rgb\\(\\s*${rgb.r}\\s*,\\s*${rgb.g}\\s*,\\s*${rgb.b}\\s*\\)`, 'i').test(html));
}

/* ───────────────────────────── Sections (Rearrange) ───────────────────────────── */

// Words that name a resume section. A short, emphasised line built around one of them is a heading.
const SECTION_WORDS = /\b(summary|profile|objective|about|experience|employment|history|education|qualifications?|skills?|stack|tools|competenc(y|ies)|expertise|projects?|portfolio|certifications?|licen[cs]es?|courses?|training|languages?|achievements?|accomplishments?|awards?|honou?rs|publications?|research|interests?|hobbies|references?|volunteer(ing)?|strengths?|passions?|my time|contact|admissions?|areas|activities|leadership|highlights)\b/i;

const styleOf = (el: Element) => (el.getAttribute('style') || '').toLowerCase();
const fontPx = (st: string) => { const m = /font-size:\s*([\d.]+)px/.exec(st); return m ? parseFloat(m[1]) : 13; };

/** True for a section title such as "EXPERIENCE", "// About" or "Key Achievements". */
export function isHeading(el: Element): boolean {
  if (el.closest('[contenteditable="false"]')) return false;
  // Section titles are block lines; inline pills such as skill tags are not.
  if (el.tagName === 'SPAN' || /display:\s*inline/.test(styleOf(el))) return false;
  if (el.querySelector('div,p,ul,ol,li,table,h1,h2,h3,h4,code')) return false;
  const raw = (el.textContent || '').trim();
  // "1. Professional Summary", "// About", "Skills:" -> the words only
  const text = raw.replace(/^[^A-Za-z]+/, '').replace(/[:\s]+$/, '');
  if (!text || text.length > 40) return false;
  const words = text.split(/\s+/).length;
  const st = styleOf(el);
  const transformUpper = /text-transform:\s*uppercase/.test(st);
  const upper = transformUpper || (text === text.toUpperCase() && /[A-Z]{3}/.test(text));
  const weight = /font-weight:\s*(\d00)/.exec(st);
  const bold = (weight ? Number(weight[1]) >= 700 : /font-weight:\s*bold/.test(st)) || /^(B|STRONG|H[1-6])$/.test(el.tagName);
  const line = /border-(bottom|top)\s*:/.test(st);
  const small = fontPx(st) <= 20;

  if (SECTION_WORDS.test(text) && words <= 5 && small && (upper || line)) return true;
  // Unknown titles ("Practice Areas"): uppercase, bold and small, or underlined uppercase.
  return transformUpper && small && words <= 4 && (bold || line);
}

export interface Section { key: string; title: string; nodes: HTMLElement[]; height: number }
export interface Column { container: HTMLElement; weight: number; sections: Section[]; original: Section[] }

const titleCase = (t: string) => t.toLowerCase().replace(/(^|\s|\/)\S/g, c => c.toUpperCase());

/** Finds the movable sections (a heading plus the content under it) and groups them by column. */
export function collectColumns(ed: HTMLElement): Column[] {
  const root = ed.firstElementChild as HTMLElement | null;
  if (!root) return [];
  const headings = Array.from(ed.querySelectorAll<HTMLElement>('div,p,span,b,strong,h1,h2,h3,h4,h5,h6')).filter(isHeading);
  const headingCount = (el: Element) => headings.filter(h => el.contains(h)).length;
  const isLocked = (el: Element) => el.getAttribute('contenteditable') === 'false';
  const used = new Set<HTMLElement>();
  const byContainer = new Map<HTMLElement, Section[]>();

  headings.forEach((h, i) => {
    if (used.has(h)) return;
    // Climb to the largest wrapper that holds only this heading (a "section box" or a label row).
    let unit: HTMLElement = h;
    while (unit.parentElement && unit.parentElement !== root && unit.parentElement !== ed && headingCount(unit.parentElement) === 1) {
      unit = unit.parentElement;
    }
    const container = unit.parentElement;
    if (!container || container === ed) return;

    // Content that follows the wrapper (flat layouts) belongs to this section until the next heading.
    const nodes: HTMLElement[] = [unit];
    for (let n = unit.nextElementSibling as HTMLElement | null; n; n = n.nextElementSibling as HTMLElement | null) {
      if (isLocked(n) || n.querySelector('[contenteditable="false"]') || headingCount(n) > 0) break;
      nodes.push(n);
    }
    nodes.forEach(n => used.add(n));
    used.add(h);
    const height = nodes.reduce((sum, n) => sum + n.getBoundingClientRect().height, 0);
    const list = byContainer.get(container) ?? [];
    const title = (h.textContent || '').trim().replace(/^[^A-Za-z]+/, '').replace(/[:\s]+$/, '');
    list.push({ key: `s${i}`, title: titleCase(title), nodes, height });
    byContainer.set(container, list);
  });

  return Array.from(byContainer.entries()).map(([container, sections]) => ({
    container,
    weight: Math.max(container.getBoundingClientRect().width, 80),
    sections: [...sections],
    original: [...sections],
  }));
}

/** Writes the new section order (and column moves) back into the live page. */
export function applyColumns(columns: Column[]) {
  const tails = new Map<HTMLElement, Element | null>();
  columns.forEach(c => {
    const last = c.original[c.original.length - 1]?.nodes.slice(-1)[0];
    tails.set(c.container, last ? last.nextElementSibling : null);
  });
  columns.forEach(c => c.original.forEach(s => s.nodes.forEach(n => n.remove())));
  columns.forEach(c => {
    const tail = tails.get(c.container) ?? null;
    c.sections.forEach(s => s.nodes.forEach(n => c.container.insertBefore(n, tail)));
  });
}


/** Scales the space above every section heading. */
export function applySpacing(ed: HTMLElement, level: number) {
  const f = SPACING_F[level];
  ed.querySelectorAll<HTMLElement>('div,p,span,b,strong,h1,h2,h3,h4,h5,h6').forEach(el => {
    if (!isHeading(el)) return;
    const base = baseOf(el, 'rsMt', () => parseFloat(getComputedStyle(el).marginTop) || 12);
    el.style.marginTop = `${Math.round(base * f)}px`;
  });
}

/** Profile photos in the templates are <img alt="Profile photo">. */
export const isProfilePhoto = (el: Element | null): el is HTMLImageElement =>
  !!el && el.tagName === 'IMG' && el.getAttribute('alt') === 'Profile photo';

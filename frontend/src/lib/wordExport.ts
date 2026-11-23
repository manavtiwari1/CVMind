import { AlignmentType, BorderStyle, Document, ExternalHyperlink, Packer, Paragraph, TextRun } from 'docx';
import type { IBorderOptions } from 'docx';

// Real Word files (.docx) from a resume or letter's HTML.
//
// The old "Word" download was the HTML saved under a .doc name. Desktop Word opens that with a "file is
// corrupt or unsafe" warning, and phone apps (Word, Google Docs, WPS) refuse it. This builds a genuine
// .docx instead: the HTML is laid out in a hidden frame so the browser works out every element's real
// style, then each block becomes a Word paragraph with its bold, italics, size, colour and alignment.
// Multi-column designs come out as one column, which is also what ATS software reads best.

type Piece = TextRun | ExternalHyperlink;
type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

interface Format {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  allCaps?: boolean;
  color?: string;
  size?: number;
}

interface Spec {
  pieces: Piece[];
  align?: Align;
  bullet?: boolean;
  border?: IBorderOptions;
  before?: number;
  after?: number;
}

export interface DocxOptions {
  paper?: 'a4' | 'letter';
  title?: string;
}

const SKIP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'img', 'picture', 'video', 'audio', 'canvas', 'iframe', 'object', 'button', 'input', 'select', 'textarea', 'head', 'meta', 'link', 'title']);
const BLOCK = new Set(['block', 'flex', 'grid', 'list-item', 'table', 'table-row', 'table-row-group', 'table-header-group', 'table-footer-group', 'table-caption', 'flow-root']);
const HAS_WORD = /[\p{L}\p{N}]/u;

const px = (v: string) => parseFloat(v) || 0;
// 1 CSS px = 0.75 pt = 15 twips (Word's spacing unit)
const twips = (v: string) => Math.max(0, Math.min(360, Math.round(px(v) * 15)));

/** "rgb(30, 41, 59)" → "1E293B". Pale colours are dropped: they were drawn on a dark band that Word won't have. */
function wordColor(css: string): string | undefined {
  const m = css.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?/);
  if (!m) return undefined;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  if (alpha < 0.5 || (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.75) return undefined;
  if (r < 40 && g < 40 && b < 40) return undefined; // near-black: leave it as the document's text colour
  return [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}

class DocBuilder {
  specs: Spec[] = [];
  private pieces: Piece[] = [];
  private target: Piece[] = this.pieces;
  private text = '';
  private lastWasElement = false;
  private bullet = false;
  private blockStack: CSSStyleDeclaration[] = [];
  private win: Window;
  constructor(win: Window) {
    this.win = win;
  }

  style(el: Element) {
    return this.win.getComputedStyle(el);
  }

  hidden(el: Element, s: CSSStyleDeclaration) {
    if (SKIP.has(el.localName) || s.display === 'none' || s.visibility === 'hidden') return true;
    // Decorative marks (icons, dots) only; aria-hidden text with words in it is still content
    return el.getAttribute('aria-hidden') === 'true' && !HAS_WORD.test(el.textContent || '');
  }

  format(s: CSSStyleDeclaration): Format {
    const size = Math.round(px(s.fontSize) * 1.5); // px → half-points
    return {
      bold: (parseInt(s.fontWeight, 10) || 400) >= 600,
      italics: s.fontStyle === 'italic' || s.fontStyle === 'oblique',
      underline: (s.textDecorationLine || '').includes('underline'),
      allCaps: s.textTransform === 'uppercase',
      color: wordColor(s.color),
      size: size ? Math.max(14, Math.min(56, size)) : undefined,
    };
  }

  run(text: string, f: Format) {
    return new TextRun({
      text,
      font: 'Arial',
      bold: f.bold,
      italics: f.italics,
      allCaps: f.allCaps,
      color: f.color,
      size: f.size,
      ...(f.underline ? { underline: {} } : {}),
    });
  }

  addText(raw: string, f: Format) {
    let t = raw.replace(/\s+/g, ' ');
    if (!this.text || /\s$/.test(this.text)) t = t.replace(/^ /, '');
    if (!t) return;
    this.text += t;
    this.target.push(this.run(t, f));
  }

  /** Between two cells of a row: " | ", or a space next to a label ("Email:") or a lone symbol ("•"). */
  separate(prev: string, next: string, f: Format) {
    if (!this.text.trim()) return;
    const plain = !HAS_WORD.test(prev) || !HAS_WORD.test(next) || /[:–—-]\s*$/.test(prev);
    // The cell before may end in a space from the markup's line breaks; addText drops a doubled one
    this.addText(plain ? ' ' : ' | ', { ...f, bold: false, italics: false, underline: false, allCaps: false });
  }

  flush() {
    const top = this.blockStack[this.blockStack.length - 1];
    if (this.text.trim()) {
      const spec: Spec = { pieces: this.pieces, bullet: this.bullet || undefined };
      if (top) {
        const align = { center: AlignmentType.CENTER, right: AlignmentType.RIGHT, end: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED }[top.textAlign];
        if (align) spec.align = align;
        spec.before = twips(top.marginTop) + twips(top.paddingTop) / 2;
        spec.after = twips(top.marginBottom) + twips(top.paddingBottom) / 2;
        const border = this.borderOf(top);
        if (border) spec.border = border;
      }
      this.specs.push(spec);
      this.bullet = false;
    }
    this.pieces = [];
    this.target = this.pieces;
    this.text = '';
    this.lastWasElement = false;
  }

  borderOf(s: CSSStyleDeclaration): IBorderOptions | undefined {
    if (s.borderBottomStyle === 'none' || px(s.borderBottomWidth) < 1) return undefined;
    return { style: BorderStyle.SINGLE, size: Math.max(4, Math.round(px(s.borderBottomWidth) * 6)), color: wordColor(s.borderBottomColor) || '94A3B8', space: 2 };
  }

  private sharesLine = new WeakMap<Element, boolean>();

  /** A flex/grid box that lays its items out side by side (on screen, not just in its CSS). */
  horizontal(el: Element, s: CSSStyleDeclaration) {
    const flexRow = (s.display === 'flex' || s.display === 'inline-flex') && !s.flexDirection.startsWith('column');
    const gridRow = (s.display === 'grid' || s.display === 'inline-grid') && s.gridTemplateColumns.trim().split(/\s+/).length > 1;
    if (!flexRow && !gridRow) return s.display === 'table-row';
    let known = this.sharesLine.get(el);
    if (known === undefined) {
      // Items that each fill a whole line (wrapped to 100% width) are stacked, so they are lines of their own
      const tops = Array.from(el.children)
        .filter((c) => HAS_WORD.test(c.textContent || ''))
        .map((c) => Math.round(c.getBoundingClientRect().top));
      known = tops.length < 2 || tops.some((top, i) => tops.some((other, j) => j !== i && Math.abs(top - other) <= 3));
      this.sharesLine.set(el, known);
    }
    return known;
  }

  /**
   * Whether the element starts its own line. Browsers report every item of a flex or grid box as a
   * block, but items laid out side by side (an icon + "Email" chip, "Title | Dates") share a line.
   */
  isBlock(el: Element, s: CSSStyleDeclaration) {
    if (!BLOCK.has(s.display)) return false;
    const parent = el.parentElement;
    return !parent || !this.horizontal(parent, this.style(parent));
  }

  /** True when something inside `el` (not `el` itself) is a block with words in it. */
  hasInnerBlocks(el: Element): boolean {
    for (const child of Array.from(el.children)) {
      const s = this.style(child);
      if (this.hidden(child, s)) continue;
      if (this.isBlock(child, s) && HAS_WORD.test(child.textContent || '')) return true;
      if (this.hasInnerBlocks(child)) return true;
    }
    return false;
  }

  /** A horizontal row (flex, grid, table row) whose cells hold only inline content. */
  isRow(el: Element, s: CSSStyleDeclaration) {
    return this.horizontal(el, s) && Array.from(el.children).every((c) => !this.hasInnerBlocks(c));
  }

  /** inline: lay the element out as part of the current line, whatever its display (cells of a row). */
  walk(node: Node, f: Format, inline = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      this.addText(node.textContent || '', f);
      this.lastWasElement = false;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const s = this.style(el);
    if (this.hidden(el, s)) return;
    if (el.localName === 'br') {
      if (this.text) { this.target.push(new TextRun({ break: 1 })); this.text += '\n'; }
      return;
    }
    const fmt = this.format(s);
    const block = !inline && this.isBlock(el, s);

    if (block) {
      this.flush();
      this.blockStack.push(s);
      const firstSpec = this.specs.length;
      if (s.display === 'list-item') this.bullet = true;
      if (this.isRow(el, s)) {
        let prev = '';
        for (const child of Array.from(el.childNodes)) {
          const words = (child.textContent || '').trim();
          if (!words) continue;
          if (child.nodeType === Node.ELEMENT_NODE && this.hidden(child as Element, this.style(child as Element))) continue;
          if (prev) this.separate(prev, words, fmt);
          this.walk(child, fmt, true);
          prev = words;
        }
      } else {
        this.children(el, fmt);
      }
      this.flush();
      this.blockStack.pop();
      // A border on a wrapper (e.g. a heading inside a ruled box) goes under its last line
      const border = this.borderOf(s);
      if (border && this.specs.length > firstSpec && !this.specs[this.specs.length - 1].border) this.specs[this.specs.length - 1].border = border;
      this.bullet = false;
      this.lastWasElement = false;
      return;
    }

    // Inline: two elements back to back with no space between them ("<b>Skills:</b><span>React</span>")
    if (this.lastWasElement && this.text && !/\s$/.test(this.text) && /^\S/.test(el.textContent || '')) this.addText(' ', fmt);
    const href = el.localName === 'a' ? el.getAttribute('href') || '' : '';
    if (/^(https?:|mailto:|tel:)/i.test(href)) {
      const outer = this.target;
      const inner: Piece[] = [];
      this.target = inner;
      this.children(el, { ...fmt, underline: true, color: fmt.color || '0563C1' }, inline);
      this.target = outer;
      if (inner.length) outer.push(new ExternalHyperlink({ link: href, children: inner as TextRun[] }));
    } else {
      this.children(el, fmt, inline);
    }
    this.lastWasElement = true;
  }

  children(el: Element, f: Format, inline = false) {
    this.lastWasElement = false;
    for (const child of Array.from(el.childNodes)) this.walk(child, f, inline);
  }

  paragraphs() {
    return this.specs.map((spec) => new Paragraph({
      children: spec.pieces,
      alignment: spec.align,
      bullet: spec.bullet ? { level: 0 } : undefined,
      border: spec.border ? { bottom: spec.border } : undefined,
      spacing: { before: Math.min(spec.before || 0, 240), after: Math.max(40, Math.min(spec.after || 0, 240)) },
    }));
  }
}

/** Lays the HTML out in a hidden, script-free frame so its real styles can be read. */
function layOut(html: string): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0;opacity:0;pointer-events:none';
    const timer = setTimeout(() => { frame.remove(); reject(new Error('Could not prepare the Word file.')); }, 10000);
    frame.onload = () => { clearTimeout(timer); resolve(frame); };
    frame.srcdoc = /<html[\s>]/i.test(html) ? html : `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
    document.body.appendChild(frame);
  });
}

/** A .docx file of the given resume or letter HTML. */
export async function htmlToDocx(html: string, { paper = 'a4', title = 'Resume' }: DocxOptions = {}): Promise<Blob> {
  const frame = await layOut(html);
  try {
    const win = frame.contentWindow;
    const body = frame.contentDocument?.body;
    if (!win || !body) throw new Error('Could not prepare the Word file.');
    const builder = new DocBuilder(win);
    builder.children(body, {});
    builder.flush();
    const paragraphs = builder.paragraphs();
    const size = paper === 'letter' ? { width: 12240, height: 15840 } : { width: 11906, height: 16838 };
    const doc = new Document({
      creator: 'CVMind',
      title,
      styles: { default: { document: { run: { font: 'Arial', size: 21, color: '1F2937' } } } },
      sections: [{
        properties: { page: { size, margin: { top: 864, bottom: 864, left: 936, right: 936 } } },
        children: paragraphs.length ? paragraphs : [new Paragraph('')],
      }],
    });
    return await Packer.toBlob(doc);
  } finally {
    frame.remove();
  }
}

/** Saves a file. The link stays valid for a while: phones start the download after the click returns. */
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Builds and downloads `<fileName>.docx`. */
export async function downloadDocx(html: string, fileName: string, options: DocxOptions = {}) {
  const name = (fileName || options.title || 'Resume').replace(/\.(docx?|pdf|txt)$/i, '').trim() || 'Resume';
  saveFile(await htmlToDocx(html, { title: name, ...options }), `${name}.docx`);
}

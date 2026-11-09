// Keeps a cover letter on one A4 page. The letter is laid out off screen at real page size and
// measured; if it runs long, its text and spacing step down until it fits. A letter that can't fit
// at the smallest readable size is refused rather than cut: no words are ever dropped silently.
import { designById, renderLetter, type LetterData } from './coverLetter';

const PAGE_WIDTH = 794;
// The designs' root is this tall (lib: data/coverLetterTemplates.ts page())
const ROOT_HEIGHT = 1119;
// Room for small font differences between this browser and the PDF server
const SAFETY_PX = 14;
const STEPS = [1, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72];
const MIN_BODY_PX = 10;

// Word: A4 with 48pt top and bottom margins and 54pt sides, in px at 96dpi
const WORD_WIDTH_PX = 650;
const WORD_HEIGHT_PX = 994;
// Word lays text out a little differently from a browser, so only 90% of the page is used
const WORD_USABLE = 0.9;
const WORD_SIZES_PT = [11, 10.5, 10, 9.5, 9];

export type FittedLetter = { fits: true; html: string } | { fits: false };

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function mount(html: string, width: number) {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;visibility:hidden;--rs-h:1123px;`;
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

// Fonts must have arrived, or the measurement is of the wrong letter shapes
async function fontsReady(host: HTMLElement) {
  void host.offsetHeight;
  await document.fonts?.ready;
}

/** How far down the page the letter's own words reach, plus the room the design keeps below them. */
function neededHeight(root: HTMLElement) {
  const top = root.getBoundingClientRect().top;
  let bottom = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent?.trim() || node.parentElement?.closest('[contenteditable="false"]')) continue;
    range.selectNodeContents(node);
    bottom = Math.max(bottom, range.getBoundingClientRect().bottom);
  }
  return bottom - top + parseFloat(getComputedStyle(root).paddingBottom || '0');
}

/** The design filled with this letter and sized to one page, or fits: false when it is too long. */
export async function fitLetter(designId: string, data: LetterData): Promise<FittedLetter> {
  const host = mount(renderLetter(designId, data), PAGE_WIDTH);
  try {
    await fontsReady(host);
    const root = host.firstElementChild as HTMLElement;
    const body = [...root.querySelectorAll('p')].filter((p) => !p.closest('[contenteditable="false"]'));
    const base = body.map((p) => {
      const style = getComputedStyle(p);
      const font = parseFloat(style.fontSize);
      return { font, gap: parseFloat(style.marginBottom) || 0, line: parseFloat(style.lineHeight) / font };
    });
    const limit = ROOT_HEIGHT - SAFETY_PX;
    for (const step of STEPS) {
      body.forEach((p, i) => {
        const { font, gap, line } = base[i];
        p.style.fontSize = `${Math.max(MIN_BODY_PX, font * step).toFixed(2)}px`;
        p.style.marginBottom = `${(gap * step).toFixed(2)}px`;
        if (step < 1 && Number.isFinite(line)) p.style.lineHeight = Math.max(1.3, line * (0.5 + step / 2)).toFixed(2);
      });
      if (neededHeight(root) <= limit) return { fits: true, html: root.outerHTML };
    }
    return { fits: false };
  } finally {
    host.remove();
  }
}

// Word can't reproduce the page designs (layered shapes, side columns), so it gets a plain letter
// in the design's colour: it stays editable and its length can be controlled.
function wordBody(d: LetterData, color: string, pt: number) {
  const text = (size: number, after: number, extra = '') => `font-family:Arial,sans-serif;font-size:${size}pt;line-height:${Math.round(size * 1.3 * 10) / 10}pt;mso-line-height-rule:exactly;margin:0 0 ${after}pt 0;${extra}`;
  const contact = [d.email, d.phone, d.location, d.linkedin].map((v) => v.trim()).filter(Boolean).map(esc).join('  |  ');
  const line = (value: string | undefined, after: number) => (value?.trim() ? `<p style="${text(pt, after)}">${esc(value.trim())}</p>` : '');
  const gap = Math.round(pt * 0.75);
  return [
    `<p style="${text(20, 2, `font-weight:bold;color:${color};`)}">${esc(d.name)}</p>`,
    d.title.trim() ? `<p style="${text(pt, 2, 'color:#444444;')}">${esc(d.title.trim())}</p>` : '',
    contact ? `<p style="${text(pt - 1, gap, `color:#444444;padding-bottom:6pt;border-bottom:1pt solid ${color};`)}">${contact}</p>` : '',
    line(d.date, gap),
    line(d.recipient, 0),
    line(d.company, gap),
    line(d.greeting, gap),
    ...d.paragraphs.map((p) => p.trim()).filter(Boolean).map((p) => line(p, gap)),
    line(d.closing, pt * 1.5),
    `<p style="${text(pt, 0, 'font-weight:bold;')}">${esc(d.name)}</p>`,
  ].join('\n');
}

/** A one-page Word document for this letter, or null when it can't fit. */
export function fitLetterWord(designId: string, data: LetterData): string | null {
  const color = designById(designId).color;
  for (const pt of WORD_SIZES_PT) {
    const body = wordBody(data, color, pt);
    const host = mount(`<div>${body}</div>`, WORD_WIDTH_PX);
    const height = host.scrollHeight;
    host.remove();
    if (height <= WORD_HEIGHT_PX * WORD_USABLE) {
      return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Cover Letter</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>@page Letter{size:595.3pt 841.9pt;margin:48pt 54pt;}div.Letter{page:Letter;}</style>
</head><body><div class='Letter'>${body}</div></body></html>`;
    }
  }
  return null;
}

/** Saves a document from fitLetterWord as a Word-compatible .doc file. */
export function saveWordDoc(doc: string, fileName: string) {
  const url = URL.createObjectURL(new Blob(['﻿', doc], { type: 'application/msword' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${fileName || 'Cover Letter'}.doc` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

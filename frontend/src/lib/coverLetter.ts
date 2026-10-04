// Cover letters: the letter content (LetterData), the page designs that lay it out as editable HTML,
// and the hand-off from the generator / example picker to the cover letter editor.
//
// The designs themselves live in data/coverLetterTemplates.ts.
import { LETTER_TEMPLATES } from '../data/coverLetterTemplates';

export interface LetterData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  date: string;
  recipient: string;
  company: string;
  jobTitle: string;
  greeting: string;
  paragraphs: string[];
  closing: string;
  /** Optional "Subject:" line; designs that have one show it. */
  subject?: string;
  /** Optional street address of the employer. */
  recipientAddress?: string;
}

export interface LetterDesign {
  id: string;
  name: string;
  /** Accent colour used in the HTML; the editor's colour picker recolours it. */
  color: string;
  render: (d: LetterData) => string;
  /** The sample letter this design opens with (written for this design, not shared). */
  sample: LetterData;
}

export const todayLong = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export const LETTER_DESIGNS: LetterDesign[] = LETTER_TEMPLATES;

export const designById = (id: string) => LETTER_DESIGNS.find(d => d.id === id) ?? LETTER_DESIGNS[0];

export const renderLetter = (designId: string, data: LetterData) => designById(designId).render(data);

/** Fills the blanks the AI or an example may leave, so a letter always renders. */
export function completeLetter(partial: Partial<LetterData>): LetterData {
  const company = partial.company?.trim() || '';
  return {
    name: partial.name?.trim() || 'Your Name',
    title: partial.title?.trim() || '',
    email: partial.email?.trim() || '',
    phone: partial.phone?.trim() || '',
    location: partial.location?.trim() || '',
    linkedin: partial.linkedin?.trim() || '',
    date: partial.date?.trim() || todayLong(),
    recipient: partial.recipient?.trim() || 'Hiring Manager',
    company,
    jobTitle: partial.jobTitle?.trim() || '',
    greeting: partial.greeting?.trim() || 'Dear Hiring Manager,',
    paragraphs: partial.paragraphs?.length ? partial.paragraphs : [''],
    closing: partial.closing?.trim() || 'Sincerely,',
    subject: partial.subject?.trim() || '',
    recipientAddress: partial.recipientAddress?.trim() || '',
  };
}

/* ───────────────────────────── Hand-off to the editor ───────────────────────────── */

export interface LetterDraft {
  html: string;
  templateId: string;
  title: string;
  /** A suggested AI request the editor opens with (from the builder's questions). */
  prompt?: string;
}

const DRAFT_KEY = 'cvmind_cover_letter_draft';

/** Stores the letter the editor should open next (survives a reload of the editor). */
export function saveLetterDraft(draft: LetterDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage blocked: the editor falls back to a blank letter
  }
}

const HASH_PREFIX = '#cl-draft=';

/** The pending draft as a URL hash, so it survives the jump from www.cvmind.in to app.cvmind.in. */
export function letterDraftHash(): string {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? `${HASH_PREFIX}${encodeURIComponent(raw)}` : '';
  } catch {
    return '';
  }
}

/** The draft the editor should open. Safe to call more than once (React runs state initialisers twice in development). */
export function takeLetterDraft(): LetterDraft | null {
  try {
    // A draft that came from the other host arrives in the URL; keep it in this tab and tidy the address
    if (window.location.hash.startsWith(HASH_PREFIX)) {
      sessionStorage.setItem(DRAFT_KEY, decodeURIComponent(window.location.hash.slice(HASH_PREFIX.length)));
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d.html === 'string' ? d : null;
  } catch {
    return null;
  }
}

/** Forgets the draft once the editor has opened it. */
export function clearLetterDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage blocked: nothing to clear
  }
}

/** Plain text of a letter's HTML, for word counts and copying. */
export function letterText(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.innerText || el.textContent || '';
}

/** Saves the letter as a Word-compatible .doc file. */
export function downloadLetterDoc(html: string, fileName: string) {
  const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Cover Letter</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>@page{margin:0.6in;}body{margin:0;}</style>
</head><body>${html}</body></html>`;
  const url = URL.createObjectURL(new Blob(['﻿', doc], { type: 'application/msword' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${fileName || 'Cover Letter'}.doc` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

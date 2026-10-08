import { userIsPro } from './billing';

// Removes the locked "cvmind.in · Powered by CVMind" footer that resume and cover letter templates
// end with (footer() in data/cvTemplates.ts and data/coverLetterTemplates.ts). Pro downloads skip it.
export function stripBranding(html: string): string {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('[contenteditable="false"]').forEach((el) => {
    if (/Powered by/i.test(el.textContent || '') && el.querySelector('a[href*="cvmind.in"]')) el.remove();
  });
  // The resume footer's marker comment
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode as Comment);
  comments.filter((c) => c.data.includes('FOOTER BRANDING')).forEach((c) => c.remove());
  return tpl.innerHTML;
}

// The HTML to export: without the footer for Pro accounts
export const exportHtml = (html: string) => (userIsPro() ? stripBranding(html) : html);

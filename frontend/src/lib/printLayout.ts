// Every template keeps room for the CVMind footer with padding at the bottom of its page root.
// When a resume runs just past one page, Chrome (our server PDF renderer and the browser's
// "Save as PDF") keeps that padding together with the column row above it and pushes the whole
// row to page 2, leaving page 1 with only the header. A spacer element in place of the padding can
// move to the next page on its own, so the export swaps one for the other. The editor page is laid
// out at print size, so it is measured as-is.

const isLocked = (el: Element) => el.getAttribute('contenteditable') === 'false';

/** The editor's HTML for PDF export. The editor itself is left untouched. */
export function htmlForPdf(editor: HTMLElement, pageHeight: number): string {
  const root = editor.firstElementChild as HTMLElement | null;
  if (!root) return editor.innerHTML;
  const st = getComputedStyle(root);
  const pad = parseFloat(st.paddingBottom) || 0;
  if (!pad) return editor.innerHTML;

  // Where the content ends, and how much room the locked footer needs below it.
  const top = root.getBoundingClientRect().top;
  let contentEnd = 0;
  for (const kid of Array.from(root.children)) {
    if (isLocked(kid) || getComputedStyle(kid).position === 'absolute') continue;
    contentEnd = Math.max(contentEnd, kid.getBoundingClientRect().bottom - top);
  }
  const footer = Array.from(root.children).find(isLocked);
  const footerRoom = footer ? root.getBoundingClientRect().bottom - footer.getBoundingClientRect().top + 8 : pad;
  // When the content fits on its page but the full padding would spill over, shrink the gap so the
  // footer stays on that page instead of getting a page to itself.
  const pageEnd = Math.max(1, Math.ceil(contentEnd / pageHeight)) * pageHeight;
  const room = pageEnd - contentEnd - 2;
  const gap = contentEnd + pad > pageEnd && room >= footerRoom ? room : pad;

  const clone = editor.cloneNode(true) as HTMLElement;
  const page = clone.firstElementChild as HTMLElement;
  page.style.paddingBottom = '0';
  const spacer = document.createElement('div');
  spacer.setAttribute('aria-hidden', 'true');
  spacer.style.cssText = `height:${Math.floor(gap)}px;width:100%;flex:none;`;
  // Sidebar templates lay their columns out on the root itself: give the spacer a line of its own.
  if (st.display.endsWith('flex') && st.flexDirection.startsWith('row')) {
    page.style.flexWrap = 'wrap';
    page.style.rowGap = '0';
  }
  const last = page.lastElementChild;
  if (last && isLocked(last)) page.insertBefore(spacer, last);
  else page.appendChild(spacer);
  return clone.innerHTML;
}

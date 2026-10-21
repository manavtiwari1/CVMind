import type { ReactNode } from 'react';

// Inline markdown used by problem statements and Leo's board: `code`, **bold**, *italic*, ***both***.
// Always React text nodes, never HTML.
export function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith('`')) out.push(<code key={key} className="cx-inline-code">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('***')) out.push(<strong key={key}><em>{tok.slice(3, -3)}</em></strong>);
    else if (tok.startsWith('**')) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

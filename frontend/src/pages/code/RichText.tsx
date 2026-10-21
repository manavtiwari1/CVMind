import type { ReactNode } from 'react';
import { renderInline } from './richInline';

/**
 * Renders the small markdown subset used by problem statements:
 * paragraphs, `code`, **bold**, *italic*, ***bold italic***, "- " / "1. " lists and ``` fences.
 * Text is always rendered as React text nodes, never as HTML.
 */
export default function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={k++} className="cx-pre"><code>{code.join('\n')}</code></pre>);
      continue;
    }

    if (/^\s*([-*])\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''));
      blocks.push(<ul key={k++}>{items.map((it, j) => <li key={j}>{renderInline(it, `u${k}-${j}`)}</li>)}</ul>);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ''));
      blocks.push(<ol key={k++}>{items.map((it, j) => <li key={j}>{renderInline(it, `o${k}-${j}`)}</li>)}</ol>);
      continue;
    }

    if (!line.trim()) { i++; continue; }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('```') && !/^\s*([-*])\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
      para.push(lines[i++]);
    }
    blocks.push(<p key={k++}>{renderInline(para.join(' '), `p${k}`)}</p>);
  }

  return <div className={`cx-rich ${className}`}>{blocks}</div>;
}

import { Fragment, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

// Leo replies use Markdown: headings, paragraphs, "- " / "1. " lists, **bold**, *italic*,
// `inline code`, [links](https://…) and ``` fenced code blocks.
// Everything becomes React elements (never HTML), so a reply can't inject markup.

const INLINE = /(\*\*[^*]+\*\*|`[^`\n]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*[^*\s][^*]*\*)/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return <code key={i} className="lx-code-inline">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="lx-codeblock">
      <div className="lx-codeblock-bar">
        <span>{lang || 'code'}</span>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }).catch(() => {})}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

export default function LeoReply({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={i}>{inline(item)}</li>);
    blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    list = null;
  };

  const lines = text.split('\n');
  for (let n = 0; n < lines.length; n++) {
    const raw = lines[n];
    const line = raw.trim();

    // ``` fenced code: everything until the closing fence (or the end, while it streams)
    const fence = line.match(/^```\s*([\w+#.-]*)/);
    if (fence) {
      flush();
      const code: string[] = [];
      n++;
      while (n < lines.length && !lines[n].trim().startsWith('```')) code.push(lines[n++]);
      blocks.push(<CodeBlock key={blocks.length} lang={fence[1]} code={code.join('\n')} />);
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flush();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)![1]);
      continue;
    }
    flush();

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push(<p key={blocks.length} className={`lx-h lx-h${Math.min(heading[1].length, 3)}`}>{inline(heading[2])}</p>);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line)) { blocks.push(<hr key={blocks.length} />); continue; }
    if (line) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <>{blocks}</>;
}

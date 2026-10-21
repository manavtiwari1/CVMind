import { useEffect, useMemo, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

const ALIASES: Record<string, string> = { js: 'javascript', node: 'javascript', ts: 'typescript', py: 'python', 'c++': 'cpp', sh: 'bash', shell: 'bash' };

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Code typed out character by character, then shown with syntax highlighting. */
export default function CodeBlock({ code, language, animate }: { code: string; language: string; animate: boolean }) {
  const lang = ALIASES[language] || language;
  const grammar = Prism.languages[lang];
  // Prism escapes the code it highlights, so the HTML only contains its own token spans
  const html = useMemo(() => (grammar ? Prism.highlight(code, grammar, lang) : null), [code, grammar, lang]);
  const [typed, setTyped] = useState(animate && !reducedMotion() ? 0 : code.length);

  useEffect(() => {
    if (typed >= code.length) return;
    const step = Math.max(1, Math.ceil(code.length / 60)); // about a second however long the snippet is
    const t = window.setTimeout(() => setTyped((n) => Math.min(code.length, n + step)), 16);
    return () => window.clearTimeout(t);
  }, [typed, code.length]);

  const done = typed >= code.length;
  return (
    <div className="ll-code">
      <span className="ll-code-lang">{lang}</span>
      <pre className={`language-${lang}`}>
        {done && html
          ? <code className={`language-${lang}`} dangerouslySetInnerHTML={{ __html: html }} />
          : <code>{code.slice(0, typed)}{!done && <span className="ll-caret" aria-hidden="true" />}</code>}
      </pre>
    </div>
  );
}

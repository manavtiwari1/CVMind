import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/** A LaTeX formula. KaTeX builds the markup itself (no raw HTML from the lesson, \htmlData etc. off). */
export default function Formula({ tex }: { tex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: true, throwOnError: false, trust: false, strict: 'ignore' });
    } catch {
      return null;
    }
  }, [tex]);
  if (!html) return <pre className="ll-formula-raw">{tex}</pre>;
  return <div className="ll-formula" dangerouslySetInnerHTML={{ __html: html }} />;
}

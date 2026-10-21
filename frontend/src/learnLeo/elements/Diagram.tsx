import { useEffect, useId, useRef, useState } from 'react';

// Mermaid is large, so it loads the first time a lesson draws a diagram
type MermaidApi = typeof import('mermaid')['default'];
let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: 'inherit',
      themeVariables: {
        primaryColor: '#e6faf5',
        primaryBorderColor: '#03a583',
        primaryTextColor: '#0f172a',
        lineColor: '#334155',
        fontSize: '15px'
      },
      // natural size: a wide diagram scrolls sideways instead of shrinking until it can't be read
      flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: false }
    });
    return mermaid;
  });
  return mermaidPromise;
}

/** A Mermaid diagram, drawn in with an ink-stroke animation. A diagram that doesn't parse is left out. */
export default function Diagram({ source }: { source: string }) {
  const id = `ll-mmd-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let alive = true;
    loadMermaid()
      .then(async (mermaid) => {
        await mermaid.parse(source);
        const { svg } = await mermaid.render(id, source);
        if (!alive || !ref.current) return;
        ref.current.innerHTML = svg; // sanitised by Mermaid (securityLevel: strict)
        setState('ready');
      })
      .catch(() => {
        document.getElementById(id)?.remove(); // Mermaid leaves its error graphic in <body>
        if (alive) setState('failed');
      });
    return () => { alive = false; };
  }, [id, source]);

  if (state === 'failed') return null;
  return (
    <div className={`ll-diagram${state === 'ready' ? ' is-drawn' : ''}`} aria-label="Diagram" role="img">
      {state === 'loading' && <div className="ll-diagram-wait">Drawing…</div>}
      <div ref={ref} />
    </div>
  );
}

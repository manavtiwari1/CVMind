import { useEffect, useState } from 'react';

// How Leo looks while he works: a status line that glows, then the words appearing as he writes
// them. The finished card takes over once the tool is done.

export function LeoStatus({ label }: { label: string }) {
  return (
    <div className="lx-status" role="status">
      <i className="lx-status-dot" aria-hidden="true" />
      <span className="lx-status-text">{label}</span>
    </div>
  );
}

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Words arrive in bursts; this lets them out evenly, and catches up quickly when far behind
function useSmooth(text: string) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setShown((at) => {
        if (calm()) return text.length;
        if (at >= text.length) return at;
        frame = requestAnimationFrame(tick);
        return Math.min(text.length, at + Math.max(1, Math.ceil((text.length - at) / 14)));
      });
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text]);
  return text.slice(0, shown);
}

export default function LiveText({ label, text }: { label?: string; text: string }) {
  const paragraphs = useSmooth(text).split('\n\n').filter((p) => p.trim());
  return (
    <div className="lx-live-writing">
      {label && <LeoStatus label={label} />}
      <div className="lx-live-words">
        {paragraphs.map((p, i) => <p key={i}>{p}{i === paragraphs.length - 1 && <i className="lx-live-caret" aria-hidden="true" />}</p>)}
      </div>
    </div>
  );
}

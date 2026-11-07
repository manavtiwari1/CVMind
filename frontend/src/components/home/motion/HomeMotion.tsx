import { useEffect, useRef } from 'react';
import { ASK_LEO_MARKUP } from './askLeoMarkup';
import { runAskLeo } from './askLeo';
import './motion.css';

/* The markup is static (no user data); the animation module drives it directly. */

export function AskLeoDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current?.firstElementChild as HTMLElement | null;
    return root ? runAskLeo(root) : undefined;
  }, []);
  // .lsn-scroll is the tall scroll track; the demo inside sticks to the screen (motion.css)
  return <div ref={ref} className="lsn-scroll" dangerouslySetInnerHTML={{ __html: ASK_LEO_MARKUP }} />;
}

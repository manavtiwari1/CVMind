import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import type { LiveProgress } from './chatApi';

// A portfolio being built, as it really happens: the stages the server reports, then the page's
// own code as it's written, then the page itself filling in.

const BUILD_STEPS = ['Reading your resume', 'Planning the design', 'Writing the design', 'Adding your details', 'Saving your site'];
const EDIT_STEPS = ['Working out your change', 'Rewriting the page', 'Saving your changes'];

// While nothing is on screen yet. All true of this feature.
const TIPS = [
  'Nothing goes public until you tap Publish.',
  "Once it's built, just tell me what to change.",
  'Your site will work on phones too.',
  "Don't like a change? There's an Undo.",
];

function stepIndex(edit: boolean, stage: string, html: string, hasBody: boolean) {
  if (stage === 'saving') return edit ? 2 : 4;
  if (edit) return html ? 1 : 0;
  if (hasBody) return 3;
  if (html) return 2;
  return stage === 'designing' ? 1 : 0;
}

export default function LiveBuild({ live, edit }: { live: LiveProgress; edit: boolean }) {
  const { stage, html } = live;
  const bodyAt = html.search(/<body[\s>]/i);
  const hasBody = bodyAt >= 0;
  const steps = edit ? EDIT_STEPS : BUILD_STEPS;
  const at = stepIndex(edit, stage, html, hasBody);
  const lines = html ? html.split('\n').length : 0;

  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const tip = TIPS[Math.floor(seconds / 5) % TIPS.length];

  // The code stays pinned to its newest line
  const codeRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (codeRef.current) codeRef.current.scrollTop = codeRef.current.scrollHeight;
  }, [html]);

  // The page is written straight into the frame as it arrives, so it fills in without reloading.
  // The frame's sandbox allows no scripts.
  const frameRef = useRef<HTMLIFrameElement>(null);
  const written = useRef(0);
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    if (written.current === 0 || html.length < written.current) {
      if (!html) { written.current = 0; return; }
      doc.open();
      written.current = 0;
    }
    doc.write(html.slice(written.current));
    written.current = html.length;
  }, [html]);

  const view = hasBody ? 'page' : html ? 'code' : 'waiting';

  return (
    <div className="lc-card lc-live">
      <div className="lc-live-head">
        <span className="lc-live-title">{edit ? 'Leo is changing your website' : 'Leo is building your website'}</span>
        <span className="lc-live-time">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      </div>

      <div className="lc-live-bars" aria-hidden="true">
        {steps.map((s, i) => <i key={s} className={i < at ? 'is-done' : i === at ? 'is-now' : ''} />)}
      </div>
      <p className="lc-live-step" role="status">{steps[at]}{lines > 0 && stage !== 'saving' ? ` · ${lines} lines` : ''}</p>

      <div className="lc-portfolio-frame lc-live-frame">
        <div className="lc-portfolio-url">
          <i className="lc-live-dot" aria-hidden="true" />
          <Globe size={13} /><span>yourname.portfolio.cvmind.in</span>
        </div>
        <div className={`lc-live-stage is-${view}`}>
          <div className="lc-live-waiting">
            <div className="lc-live-shimmer" aria-hidden="true"><i /><i /><i /><div><i /><i /><i /></div></div>
            <p key={tip}>{tip}</p>
          </div>
          <pre className="lc-live-code" ref={codeRef}><code>{html.slice(-5000)}</code><span className="lc-live-caret" /></pre>
          <iframe ref={frameRef} title="Your website being built" sandbox="allow-same-origin" tabIndex={-1} />
        </div>
      </div>
    </div>
  );
}

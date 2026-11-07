import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import { urlForPage } from '../../lib/hosts';
import './AskLeoCta.css';

// The closing call to action: one sentence to Leo. Opens the Leo chat with the prompt sent.
// The floating cursors carry tool names (not people), so nothing suggests other users are online.

const CHIPS: { label: string; prompt: string }[] = [
  { label: 'ATS check', prompt: "Check my resume's ATS score and tell me what to fix" },
  { label: 'Tailor', prompt: 'Tailor my resume for this job: ' },
  { label: 'Cover letter', prompt: 'Write a cover letter for this job: ' },
  { label: 'Interview prep', prompt: 'Give me interview questions for a ' },
  { label: 'Find jobs', prompt: 'Find jobs for a ' },
  { label: 'Roadmap', prompt: 'Make me a 1-year roadmap to become a ' },
];

const CURSORS = [
  { label: 'ATS check', color: '#7c3aed', cls: 'c1' },
  { label: 'Tailor', color: '#2dc08d', cls: 'c2' },
  { label: 'Cover letter', color: '#e8590c', cls: 'c3' },
  { label: 'Interview', color: '#2f6fed', cls: 'c4' },
];

const openLeo = (prompt: string) => {
  const q = prompt.trim();
  if (q) window.location.assign(urlForPage('chat', `?q=${encodeURIComponent(q.slice(0, 4000))}`));
};

export default function AskLeoCta() {
  const [ask, setAsk] = useState('');
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Draws the underline and drops the notes in when the card scrolls into view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A chip ending in ': ' or 'a ' needs the user to finish it; the rest send straight away
  const pick = (prompt: string) => {
    if (/(: |a )$/.test(prompt)) {
      setAsk(prompt);
      requestAnimationFrame(() => { const i = inputRef.current; if (i) { i.focus(); i.setSelectionRange(prompt.length, prompt.length); } });
    } else {
      openLeo(prompt);
    }
  };

  return (
    <section ref={ref} className={`alc ${shown ? 'is-in' : ''}`} aria-labelledby="alc-title">
      <div className="alc-card">
        <div className="alc-dots" aria-hidden="true" />
        <div className="alc-glow" aria-hidden="true" />

        <div className="alc-note alc-note--tip" aria-hidden="true">
          <span>Tip</span>
          Paste the full job description for the best match
        </div>
        <div className="alc-note alc-note--lang" aria-hidden="true">
          <span>Note</span>
          Ask in English or Hinglish
        </div>

        {CURSORS.map((c) => (
          <div key={c.cls} className={`alc-cursor alc-${c.cls}`} style={{ '--cc': c.color } as CSSProperties} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="var(--cc)" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" /></svg>
            <b>{c.label}</b>
          </div>
        ))}

        <div className="alc-body">
          <span className="alc-label">Try it now</span>
          <h2 id="alc-title" className="alc-h2">
            What job are you <span className="alc-mark">going for?
              <svg className="alc-underline" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
                <path d="M4 14 C 60 4, 120 18, 180 10 S 270 6, 296 12" />
              </svg>
            </span>
          </h2>
          <p className="alc-sub">Type it in one sentence. Leo checks your resume, tailors it to the job, writes the cover letter or finds real openings.</p>

          <form className="alc-ask" onSubmit={(e) => { e.preventDefault(); openLeo(ask); }}>
            <input
              ref={inputRef}
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="e.g. Tailor my resume for a frontend internship at Swiggy"
              aria-label="Ask Leo"
              maxLength={2000}
            />
            <button type="submit" disabled={!ask.trim()}><Sparkles size={16} /> Ask Leo</button>
          </form>
          <p className="alc-fine">3 free messages · no sign-up</p>

          <div className="alc-chips">
            {CHIPS.map((c) => <button key={c.label} type="button" onClick={() => pick(c.prompt)}>{c.label}</button>)}
          </div>
        </div>
      </div>
    </section>
  );
}

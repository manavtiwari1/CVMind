import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, FileSearch, Sparkles, Target, Upload } from 'lucide-react';
import { HOME_HERO } from '../../data/homeCopy';
import { urlForPage } from '../../lib/hosts';
import { BLACK_FRIDAY, isBhaiDooj, isBlackFriday } from '../../lib/festive';
import './diwali.css'; // styles the festive tag
import './blackfriday.css';

interface HomeHeroProps {
  setCurrentPage: (page: string) => void;
  onAnalyzeClick: () => void;
}

// The hero is one prompt box with three modes. Ask and Tailor open the Leo chat on app.cvmind.in
// with the prompt already sent; Check scrolls to the free ATS checker further down this page.
type Mode = 'ask' | 'tailor' | 'check';

// `short` is the label on phones, where all three tabs share one row
const MODES: { id: Mode; label: string; short: string; icon: typeof Sparkles }[] = [
  { id: 'ask', label: 'Ask Leo', short: 'Ask Leo', icon: Sparkles },
  { id: 'tailor', label: 'Tailor to a job', short: 'Tailor', icon: Target },
  { id: 'check', label: 'Check my resume', short: 'Check resume', icon: FileSearch },
];

// Typed one after another in the empty Ask box
// "Happy Bhai Dooj" tag beside the modes, until midnight IST on 11 Nov (lib/festive.ts)
const FESTIVE = isBhaiDooj();
// Black Friday week, 19–30 Nov 2026 IST (lib/festive.ts): sale tag on the box and a link to the offer
const BLACK_FRIDAY_ON = isBlackFriday();
const EXAMPLES = [
  'Interview questions for a data analyst fresher role',
  'Write a cover letter for a frontend internship at Zomato',
  'Find React developer jobs in Bangalore',
  'Make me a 1-year roadmap to become a product manager',
];

const openLeo = (prompt: string) => {
  const q = prompt.trim();
  if (q) window.location.assign(urlForPage('chat', `?q=${encodeURIComponent(q.slice(0, 4000))}`));
};

// Types the example prompts into the placeholder. Static text when the user prefers less motion.
function useTypedPlaceholder(active: boolean) {
  const [text, setText] = useState(EXAMPLES[0]);
  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let example = 0;
    let chars = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const full = EXAMPLES[example];
      if (!deleting && chars < full.length) chars += 1;
      else if (!deleting) { deleting = true; timer = setTimeout(step, 1800); return; }
      else if (chars > 0) chars -= 2;
      else { deleting = false; example = (example + 1) % EXAMPLES.length; }
      setText(full.slice(0, Math.max(0, chars)));
      timer = setTimeout(step, deleting ? 18 : 42);
    };
    timer = setTimeout(step, 600);
    return () => clearTimeout(timer);
  }, [active]);
  return text;
}

export default function HomeHero({ setCurrentPage, onAnalyzeClick }: HomeHeroProps) {
  const [mode, setMode] = useState<Mode>('ask');
  const [ask, setAsk] = useState('');
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const typed = useTypedPlaceholder(mode === 'ask' && !ask);

  // The page is full-bleed: lift the default content width cap while the home page is mounted.
  useEffect(() => {
    const main = document.querySelector('.main-content') as HTMLElement | null;
    if (!main) return;
    main.style.maxWidth = 'none';
    main.style.padding = '0';
    main.style.margin = '0';
    return () => {
      main.style.maxWidth = '';
      main.style.padding = '';
      main.style.margin = '';
    };
  }, []);

  // Grow the box with what's typed or pasted (job descriptions are long)
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, 220)}px`;
  }, [ask, mode]);

  const submit = () => {
    if (mode === 'check') { onAnalyzeClick(); return; }
    const text = ask.trim();
    if (!text) { boxRef.current?.focus(); return; }
    openLeo(mode === 'tailor' ? `Tailor my resume for this job:\n${text}` : text);
  };

  const pickMode = (next: Mode) => {
    setMode(next);
    if (next !== 'check') requestAnimationFrame(() => boxRef.current?.focus());
  };

  return (
    <section className="hp-hero hx-hero">
      <div className="hx-glow" aria-hidden="true" />
      <div className="hx-dots dot-grid" aria-hidden="true" />
      <div className="hx-inner">
        <h1 className="hx-h1">
          <span className="hx-line hx-rise">{HOME_HERO.h1.lead}</span>
          {/* "CVMind" in grey, the rest under the highlighter mark */}
          <span className="hx-line hx-em hx-rise">
            {HOME_HERO.h1.em.split(' ')[0]}{' '}
            <span className="cv-hl hx-hl">{HOME_HERO.h1.em.split(' ').slice(1).join(' ')}</span>
          </span>
        </h1>
        <p className="hx-lead hx-rise">{HOME_HERO.lead}</p>

        <div className={`hx-box-wrap hx-rise${BLACK_FRIDAY_ON ? ' is-bf' : ''}`}>
        {BLACK_FRIDAY_ON && <span className="bf-sticker" aria-hidden="true">50%<small>OFF</small></span>}
        <form className="hx-box" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="hx-modes" role="tablist" aria-label="What do you want to do?">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                className={`hx-mode ${mode === m.id ? 'is-on' : ''}`}
                onClick={() => pickMode(m.id)}
              >
                <span className="hx-mode-ico"><m.icon size={15} /></span>
                <span className="hx-mode-long">{m.label}</span>
                <span className="hx-mode-short">{m.short}</span>
              </button>
            ))}
            {FESTIVE && <span className="dw-tag"><i aria-hidden="true" /> Happy Bhai Dooj</span>}
            {BLACK_FRIDAY_ON && (
              <button type="button" className="bf-tag" onClick={() => setCurrentPage('pricing')}>
                <i aria-hidden="true" /> Black Friday · {BLACK_FRIDAY.percent}% off Pro
              </button>
            )}
          </div>

          {mode === 'check' ? (
            <div className="hx-check">
              <p>Upload your resume and get your ATS score, keyword gaps and fixes. No account needed.</p>
              <button type="submit" className="hx-go"><Upload size={17} /> Upload resume</button>
            </div>
          ) : (
            <div className="hx-row">
              <textarea
                ref={boxRef}
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && mode === 'ask' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={mode === 'tailor' ? 3 : 1}
                maxLength={4000}
                placeholder={mode === 'ask' ? typed : 'Paste the job description here…'}
                aria-label={mode === 'ask' ? 'Ask Leo, CVMind’s AI career assistant' : 'Job description to tailor your resume to'}
              />
              <button type="submit" className="hx-go" disabled={!ask.trim()}>
                <Sparkles size={16} /> {mode === 'ask' ? 'Ask Leo' : 'Tailor it'}
              </button>
            </div>
          )}

          <div className="hx-foot">
            <span>
              {mode === 'ask' && 'Answers in seconds, in English or Hinglish'}
              {mode === 'tailor' && 'Attach your resume in the chat; Leo rewrites it for this job'}
              {mode === 'check' && 'PDF, DOCX or TXT'}
            </span>
            <span>{mode === 'tailor' ? 'Free account · no card' : mode === 'ask' ? '3 free messages · no sign-up' : 'Free · no sign-up'}</span>
          </div>
        </form>
        </div>

        {BLACK_FRIDAY_ON && (
          <button type="button" className="bf-strip hx-rise" onClick={() => setCurrentPage('pricing')}>
            <span className="bf-strip-tag">Black Friday</span>
            <span><b>{BLACK_FRIDAY.percent}% off</b> every Pro plan with code <code>{BLACK_FRIDAY.code}</code> · till {BLACK_FRIDAY.ends}</span>
            <ArrowRight size={15} />
          </button>
        )}

        <ul className="hx-proof hx-rise">
          <li><Check size={15} /> Free ATS check without an account</li>
          <li><Check size={15} /> Works on phone and laptop</li>
          <li><Check size={15} /> Free resume templates</li>
        </ul>

        <button type="button" className="hx-alt" onClick={() => setCurrentPage('resume-editor')}>
          Or build your resume from a template <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

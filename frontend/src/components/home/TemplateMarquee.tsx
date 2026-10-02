import { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Columns2, Palette } from 'lucide-react';
import TemplatePreview from '../TemplatePreview';
import { TEMPLATES, type Template } from '../../data/resumeTemplates';
import { withSampleData } from '../../data/samplePreview';

interface TemplateMarqueeProps {
  /** With a template id the editor opens on that template; without one, the template gallery. */
  onUse: (templateId?: string) => void;
}

const IDS = [
  'cv-elegant', 'cv-modern', 'cv-contemporary', 'cv-double-column', 'cv-timeline', 'cv-crest',
  'cv-polished', 'cv-bold', 'cv-wave', 'cv-ivy-league', 'cv-hybrid', 'cv-minimal',
];

/** Pixels per second the belt moves while nobody is interacting with it. */
const SPEED = 38;
/** After an arrow click or a hover ends, wait this long before drifting again (ms). */
const RESUME_DELAY = 900;

/**
 * Full-bleed, endlessly sliding row of real templates. The list is rendered twice and the belt
 * wraps by exactly one list width, so the loop has no visible seam. Motion pauses while the pointer
 * is over the belt, while the tab is hidden, and when the section is off screen; users who prefer
 * reduced motion get a static, manually scrollable row instead.
 */
export default function TemplateMarquee({ onUse }: TemplateMarqueeProps) {
  const templates = useMemo<Template[]>(
    () => IDS.map((id) => TEMPLATES.find((t) => t.id === id)).filter((t): t is Template => Boolean(t)).map((t) => ({ ...t, html: withSampleData(t) })),
    [],
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const state = useRef({ pos: 0, target: 0, pausedUntil: 0, hovering: false, visible: true });

  useEffect(() => {
    const track = trackRef.current;
    const root = rootRef.current;
    if (!track || !root) return;
    const s = state.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const io = new IntersectionObserver(([entry]) => { s.visible = entry.isIntersecting; }, { threshold: 0 });
    io.observe(root);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const half = track.scrollWidth / 2;

      if (s.visible && half > 0) {
        // ease toward a manual (arrow) target, otherwise drift at a constant speed
        const remaining = s.target - s.pos;
        if (Math.abs(remaining) > 0.5) {
          s.pos += remaining * Math.min(1, dt * 7);
        } else if (!reduced && !s.hovering && now > s.pausedUntil) {
          s.pos += SPEED * dt;
          s.target = s.pos;
        }
        if (s.pos >= half) { s.pos -= half; s.target -= half; }
        if (s.pos < 0) { s.pos += half; s.target += half; }
        track.style.transform = `translate3d(${-s.pos}px,0,0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  const nudge = (dir: 1 | -1) => {
    const card = trackRef.current?.querySelector<HTMLElement>('.hp-marq-card');
    const step = (card?.offsetWidth ?? 380) + 24;
    const s = state.current;
    s.target = s.pos + dir * step * 1.5;
    s.pausedUntil = performance.now() + 700 + RESUME_DELAY;
  };

  const hover = (on: boolean) => {
    state.current.hovering = on;
    if (!on) state.current.pausedUntil = performance.now() + RESUME_DELAY;
  };

  const renderSet = (suffix: string, hidden: boolean) =>
    templates.map((t) => (
      <button
        key={`${t.id}-${suffix}`}
        type="button"
        className="hp-marq-card"
        style={{ '--tpl-color': t.color } as React.CSSProperties}
        onClick={() => onUse(t.id)}
        tabIndex={hidden ? -1 : 0}
        aria-hidden={hidden || undefined}
        aria-label={hidden ? undefined : `Start with the ${t.name} template`}
      >
        <span className="hp-marq-paper">
          <TemplatePreview html={t.html} name={t.name} aspect="794 / 1010" />
        </span>
        <span className="hp-marq-btn">Start With This Template</span>
      </button>
    ));

  return (
    <section className="hp-marq" id="hp-templates" aria-label="Resume templates">
      <h2 className="hp-h2 hp-center hp-marq-title">Pick a template and build your resume in minutes!</h2>

      <div
        className="hp-marq-stage"
        ref={rootRef}
        onMouseEnter={() => hover(true)}
        onMouseLeave={() => hover(false)}
        onFocus={() => hover(true)}
        onBlur={() => hover(false)}
      >
        <button type="button" className="hp-marq-arrow hp-marq-arrow--left" onClick={() => nudge(-1)} aria-label="Previous templates">
          <ChevronLeft size={22} />
        </button>
        <div className="hp-marq-viewport">
          <div className="hp-marq-track" ref={trackRef}>
            {renderSet('a', false)}
            {renderSet('b', true)}
          </div>
        </div>
        <button type="button" className="hp-marq-arrow hp-marq-arrow--right" onClick={() => nudge(1)} aria-label="Next templates">
          <ChevronRight size={22} />
        </button>
      </div>

      <ul className="hp-marq-features">
        <li><CheckCircle2 size={26} className="is-green" /><span>ATS-friendly, professionally designed resumes</span></li>
        <li><Palette size={26} className="is-teal" /><span>Customizable sections, fonts, colors and backgrounds</span></li>
        <li><Columns2 size={26} className="is-purple" /><span>Single-column, double-column and multi-page layouts</span></li>
      </ul>
      <div className="hp-center">
        <button type="button" className="hp-link" onClick={() => onUse()}>Browse resume templates <ArrowRight size={14} /></button>
      </div>
    </section>
  );
}

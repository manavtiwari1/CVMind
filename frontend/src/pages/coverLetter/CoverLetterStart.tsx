import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, Search } from 'lucide-react';
import { Leo, Stepper } from '../../components/ResumeOnboarding';
import TemplatePreview from '../../components/TemplatePreview';
import { COVER_LETTER_EXAMPLES, type CoverLetterExample } from '../../data/coverLetterExamples';
import { LETTER_DESIGNS, renderLetter, saveLetterDraft, todayLong } from '../../lib/coverLetter';
import './CoverLetterPages.css';

interface CoverLetterStartProps {
  setCurrentPage: (page: string) => void;
  onFocusChange?: (mode: false | 'flow' | 'studio') => void;
  /** Where Exit goes (My Documents on the app host). */
  onExit: () => void;
}

type Step = 'loading' | 'role' | 'experience' | 'tone' | 'strengths' | 'examples';
const STEP_INDEX: Record<Exclude<Step, 'loading'>, number> = { role: 1, experience: 2, tone: 3, strengths: 4, examples: 5 };

const EXPERIENCE = [
  { id: 'none', label: 'No experience yet', entry: true },
  { id: 'junior', label: 'Less than 2 years', entry: true },
  { id: 'mid', label: '2 to 5 years', entry: false },
  { id: 'senior', label: 'More than 5 years', entry: false },
] as const;
type Experience = typeof EXPERIENCE[number]['id'];

// Tone decides which designs are suggested first
const TONES = [
  { id: 'formal', label: 'Formal', hint: 'Banking, law, healthcare, government', designs: ['cl-serif-center', 'cl-ornament', 'cl-gold-monogram', 'cl-bold-bar', 'cl-left-rule', 'cl-geo-navy'] },
  { id: 'friendly', label: 'Friendly', hint: 'Startups, tech, creative, customer-facing', designs: ['cl-clean', 'cl-geo-navy', 'cl-wave', 'cl-dots', 'cl-geo-photo', 'cl-navy-tan'] },
] as const;
type Tone = typeof TONES[number]['id'];

const STRENGTHS = ['Leadership', 'Communication', 'Problem solving', 'Teamwork', 'Creativity', 'Attention to detail', 'Customer focus', 'Data & analysis', 'Time management', 'Adaptability'];
const MAX_STRENGTHS = 3;

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);

/** Examples ordered by how well they fit the answers: role words first, then entry-level fit. */
function rankExamples(role: string, entry: boolean | null): CoverLetterExample[] {
  const want = words(role);
  const score = (e: CoverLetterExample) => {
    const have = words(`${e.role} ${e.category}`);
    const roleHits = want.filter(w => have.some(h => h.startsWith(w) || w.startsWith(h))).length;
    const levelFit = entry === null ? 0 : (e.category === 'Students & Entry Level') === entry ? 1 : 0;
    return roleHits * 10 + levelFit;
  };
  return [...COVER_LETTER_EXAMPLES].sort((a, b) => score(b) - score(a) || a.role.localeCompare(b.role));
}

export default function CoverLetterStart({ setCurrentPage, onFocusChange, onExit }: CoverLetterStartProps) {
  const [step, setStep] = useState<Step>('loading');
  const [role, setRole] = useState('');
  const [experience, setExperience] = useState<Experience | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CoverLetterExample | null>(null);
  const [design, setDesign] = useState<string | null>(null);

  // Full-screen app: no site header or footer
  useEffect(() => {
    onFocusChange?.('flow');
    return () => onFocusChange?.(false);
  }, [onFocusChange]);

  // Short loading screen before Leo's first question
  useEffect(() => {
    if (step !== 'loading') return;
    const t = setTimeout(() => setStep('role'), 1600);
    return () => clearTimeout(t);
  }, [step]);

  const entry = experience ? EXPERIENCE.find(e => e.id === experience)?.entry ?? null : null;
  const ranked = useMemo(() => rankExamples(role, entry), [role, entry]);
  const suggestedDesigns: readonly string[] = tone ? TONES.find(t => t.id === tone)!.designs : LETTER_DESIGNS.map(d => d.id);

  const q = query.trim().toLowerCase();
  const list = q ? ranked.filter(e => `${e.role} ${e.category}`.toLowerCase().includes(q)) : ranked;
  const current = selected ?? ranked[0];
  const currentDesign = design ?? (tone ? suggestedDesigns[0] : current?.design) ?? LETTER_DESIGNS[0].id;
  const html = current ? renderLetter(currentDesign, { ...current.letter, date: todayLong() }) : '';

  const toggleStrength = (s: string) => setStrengths(cur =>
    cur.includes(s) ? cur.filter(x => x !== s) : cur.length < MAX_STRENGTHS ? [...cur, s] : cur);

  const select = () => {
    if (!current) return;
    // A ready-made AI request for the editor, built from the answers; the user decides whether to send it
    const exp = EXPERIENCE.find(e => e.id === experience);
    const parts = [
      `Adapt this example into a cover letter for a ${role.trim() || current.role} role`,
      exp && `for someone with ${exp.id === 'none' ? 'no work experience yet' : `${exp.label.toLowerCase()} of experience`}`,
      tone && `in a ${tone} tone`,
      strengths.length > 0 && `that highlights these strengths: ${strengths.join(', ')}`,
    ].filter(Boolean);
    saveLetterDraft({
      html,
      templateId: currentDesign,
      title: `Cover Letter - ${role.trim() || current.role}`,
      prompt: `${parts.join(' ')}. Keep the structure, and keep the names, companies and numbers as they are so I can replace them with mine.`,
    });
    setCurrentPage('cover-letter-editor');
  };

  if (step === 'loading') {
    return (
      <div className="ro-page ro-center clx-flow">
        <Leo pose="typing" />
        <p className="ro-loading-text"><Loader2 size={18} className="ro-spin" /> Opening the Cover Letter Builder…</p>
      </div>
    );
  }

  const back = (to: Step) => <button type="button" className="ro-link" onClick={() => setStep(to)}><ArrowLeft size={14} /> Go back</button>;

  return (
    <div className={`ro-page clx-flow${step === 'examples' ? ' clx-flow--wide' : ''}`}>
      <button type="button" className="focus-exit" onClick={onExit} aria-label="Exit cover letter builder">Exit ✕</button>
      <Stepper active={STEP_INDEX[step]} total={5} />

      {step === 'role' && (
        <div className="ro-center ro-stage">
          <Leo pose="resume" />
          <h1 className="ro-title">Which job are you writing this cover letter for?</h1>
          <form className="ro-position" onSubmit={e => { e.preventDefault(); setStep('experience'); }}>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Marketing Executive" aria-label="Job title" maxLength={80} autoFocus />
            <button type="submit" className="ro-btn ro-btn--green" disabled={!role.trim()}>Next</button>
          </form>
          <div className="clx-flow-chips" aria-label="Popular roles">
            {COVER_LETTER_EXAMPLES.slice(0, 6).map(e => (
              <button key={e.slug} type="button" onClick={() => { setRole(e.role); setStep('experience'); }}>{e.role}</button>
            ))}
          </div>
          <button type="button" className="ro-link" onClick={() => setStep('experience')}>Skip this step</button>
        </div>
      )}

      {step === 'experience' && (
        <div className="ro-center ro-stage">
          <Leo pose="growth" />
          <h1 className="ro-title">How much work experience do you have?</h1>
          <div className="clx-flow-options">
            {EXPERIENCE.map(x => (
              <button key={x.id} type="button" className={experience === x.id ? 'is-on' : ''} onClick={() => { setExperience(x.id); setSelected(null); setStep('tone'); }}>{x.label}</button>
            ))}
          </div>
          {back('role')}
        </div>
      )}

      {step === 'tone' && (
        <div className="ro-center ro-stage">
          <Leo pose="thinking" />
          <h1 className="ro-title">What is your preferred tone of voice?</h1>
          <p className="clx-flow-sub">You can change the wording later.</p>
          <div className="clx-flow-tones">
            {TONES.map(t => (
              <button key={t.id} type="button" className={tone === t.id ? 'is-on' : ''} onClick={() => { setTone(t.id); setDesign(null); setStep('strengths'); }}>
                <strong>{t.label}</strong><span>{t.hint}</span>
              </button>
            ))}
          </div>
          {back('experience')}
        </div>
      )}

      {step === 'strengths' && (
        <div className="ro-center ro-stage">
          <Leo pose="thumbs" />
          <h1 className="ro-title">How about your strengths?</h1>
          <p className="clx-flow-sub">Pick up to {MAX_STRENGTHS}. Leo will suggest working them into your letter.</p>
          <div className="clx-flow-chips clx-flow-chips--pick" role="group" aria-label="Strengths">
            {STRENGTHS.map(s => {
              const on = strengths.includes(s);
              return (
                <button key={s} type="button" aria-pressed={on} className={on ? 'is-on' : ''} disabled={!on && strengths.length >= MAX_STRENGTHS} onClick={() => toggleStrength(s)}>
                  {on && <Check size={14} />} {s}
                </button>
              );
            })}
          </div>
          <div className="ro-actions">
            <button type="button" className="ro-btn ro-btn--green" onClick={() => setStep('examples')}>Continue</button>
          </div>
          {back('tone')}
        </div>
      )}

      {step === 'examples' && (
        <div className="clx clx-ex">
          <section className="clx-ex-left">
            <h1>{role.trim() ? `Cover letter examples for ${role.trim()}` : 'Use a cover letter example'}</h1>
            <p>Picked for your answers. Choose one and make it yours in the editor.</p>
            <label className="clx-ex-search">
              <Search size={18} aria-hidden="true" />
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by role" aria-label="Search by role" />
            </label>
            <ul className="clx-ex-list">
              {list.map(e => (
                <li key={e.slug}>
                  <button type="button" className={current?.slug === e.slug ? 'is-on' : ''} aria-pressed={current?.slug === e.slug} onClick={() => setSelected(e)}>
                    {e.role} Cover Letter
                  </button>
                </li>
              ))}
              {!list.length && <li className="clx-ex-empty">No example for “{query}” yet. Pick the closest role and edit it.</li>}
            </ul>
            <button type="button" className="ro-link clx-ex-back" onClick={() => setStep('strengths')}><ArrowLeft size={14} /> Change my answers</button>
          </section>

          <aside className="clx-ex-right" aria-live="polite">
            {current && (
              <>
                <h2>{current.role}<br />Cover Letter Preview</h2>
                <div className="clx-ex-page">
                  <TemplatePreview key={current.slug + currentDesign} html={html} name={`${current.role} cover letter`} eager />
                </div>
                <div className="clx-designs clx-designs--center" role="radiogroup" aria-label="Design">
                  {suggestedDesigns.map(id => {
                    const d = LETTER_DESIGNS.find(x => x.id === id);
                    if (!d) return null;
                    return (
                      <button key={id} type="button" role="radio" aria-checked={currentDesign === id} className={currentDesign === id ? 'is-on' : ''} onClick={() => setDesign(id)}>
                        <i style={{ background: d.color }} aria-hidden="true" /> {d.name}
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="clx-btn" onClick={select}>Select This Example</button>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

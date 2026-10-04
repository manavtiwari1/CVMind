import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Download, Droplet, Home, Megaphone, PenLine, Sparkles, Type } from 'lucide-react';
import TemplatePreview from '../../components/TemplatePreview';
import { LeoAvatar } from '../../components/ResumeOnboarding';
import { COVER_LETTER_EXAMPLES } from '../../data/coverLetterExamples';
import { RESUME_TEMPLATES } from '../../data/resumeTemplates';
import { BUILDER_FAQS } from '../../data/coverLetterFaqs';
import { LETTER_DESIGNS, designById, saveLetterDraft } from '../../lib/coverLetter';
import CoverLetterFaq from './CoverLetterFaq';
import './CoverLetterPages.css';

interface CoverLetterBuilderProps {
  setCurrentPage: (page: string) => void;
}

/** A design shown with its own sample letter. */
const sampleOf = (id: string) => designById(id).render(designById(id).sample);

const STEPS = [
  { n: 1, text: 'Answer a few questions.' },
  { n: 2, text: 'Pick an example for your role.' },
  { n: 3, text: 'Customize your design.' },
  { n: 4, text: 'Check for errors and download.' },
];

/** Cover Letter Builder landing page. "Build My Cover Letter Now" opens Leo's questions (cover-letter-start). */
export default function CoverLetterBuilder({ setCurrentPage }: CoverLetterBuilderProps) {
  const [active, setActive] = useState(0);
  const count = LETTER_DESIGNS.length;
  const at = (offset: number) => (active + offset + count) % count;
  const start = () => setCurrentPage('cover-letter-start');

  const pickDesign = (i: number) => {
    const d = LETTER_DESIGNS[i];
    saveLetterDraft({ html: d.render(d.sample), templateId: d.id, title: `Cover Letter - ${d.name}` });
    setCurrentPage('cover-letter-editor');
  };

  const roles = COVER_LETTER_EXAMPLES.slice(0, 6);
  const resumeHtml = RESUME_TEMPLATES[0]?.html ?? '';

  return (
    <div className="clx clx-bld">
      {/* Hero */}
      <section className="clx-bld-hero">
        <div className="clx-bld-hero-in">
          <div className="clx-bld-hero-text">
            <nav className="clx-crumb clx-crumb--left" aria-label="Breadcrumb">
              <button type="button" onClick={() => setCurrentPage('home')} aria-label="Home"><Home size={15} /></button>
              <ChevronRight size={14} /> Online Cover Letter Builder
            </nav>
            <h1>Online Cover Letter Builder</h1>
            <p>CVMind is the cover letter builder that helps you tell your story. Beat writer's block: answer a few simple questions, start from an example for your role, customize the design, and save it as a PDF.</p>
            <div className="clx-bld-cta">
              <button type="button" className="clx-btn clx-btn--lg" onClick={start}>Build My Cover Letter Now</button>
              <button type="button" className="clx-textlink" onClick={() => setCurrentPage('cover-letter-generator')}>Or generate one with AI <ArrowRight size={15} /></button>
            </div>
          </div>
          <div className="clx-bld-hero-art" aria-hidden="true">
            <span className="clx-blob clx-blob--orange" />
            <span className="clx-blob clx-blob--lilac" />
            <span className="clx-dotc clx-dotc--a" />
            <span className="clx-dotc clx-dotc--b" />
            <div className="clx-laptop">
              <div className="clx-laptop-screen"><TemplatePreview html={sampleOf('cl-clean')} name="Cover letter in the editor" eager aspect="1.45 / 1" /></div>
              <div className="clx-laptop-base" />
            </div>
            <div className="clx-tablet"><TemplatePreview html={sampleOf('cl-ornament')} name="Cover letter" eager /></div>
          </div>
        </div>
      </section>

      {/* Choose a design */}
      <section className="clx-bld-designs">
        <span className="clx-mint" aria-hidden="true" />
        <h2>Build your cover letter now. First, choose a design.</h2>
        <div className="clx-carousel">
          {[-2, -1, 0, 1, 2].map(offset => {
            const i = at(offset);
            const d = LETTER_DESIGNS[i];
            const center = offset === 0;
            return (
              <div key={offset} className={`clx-car-item clx-car-item--${offset < 0 ? `l${-offset}` : offset > 0 ? `r${offset}` : 'c'}`}>
                <button type="button" className="clx-car-page" onClick={() => (center ? pickDesign(i) : setActive(i))} aria-label={center ? `Use the ${d.name} design` : `Show the ${d.name} design`} tabIndex={Math.abs(offset) > 1 ? -1 : 0}>
                  <TemplatePreview html={sampleOf(d.id)} name={`${d.name} cover letter design`} eager aspect="1 / 1.18" />
                </button>
                {center && (
                  <>
                    <button type="button" className="clx-car-arrow clx-car-arrow--l" onClick={() => setActive(at(-1))} aria-label="Previous design"><ChevronLeft size={22} /></button>
                    <button type="button" className="clx-car-arrow clx-car-arrow--r" onClick={() => setActive(at(1))} aria-label="Next design"><ChevronRight size={22} /></button>
                    <button type="button" className="clx-btn clx-car-use" onClick={() => pickDesign(i)}>Use This Template</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="clx-car-name">{LETTER_DESIGNS[active].name} · {active + 1} of {count}</p>
      </section>

      {/* Steps */}
      <section className="clx-bld-steps">
        <h2>Get a cover letter to be proud of!</h2>
        <ol>
          {STEPS.map(s => (
            <li key={s.n}>
              <div className={`clx-step-art clx-step-art--${s.n}`} aria-hidden="true">
                <div className="clx-step-page"><TemplatePreview html={sampleOf(s.n === 3 ? 'cl-geo-navy' : 'cl-clean')} name="" aspect="1 / 1.1" /></div>
                {s.n === 1 && <div className="clx-float clx-float--name"><b>Which job is this for?</b><small>Marketing Executive</small></div>}
                {s.n === 2 && <div className="clx-float clx-float--edit"><PenLine size={14} /> Marketing Executive example</div>}
                {s.n === 3 && <><div className="clx-float clx-float--design"><Droplet size={14} /> Design</div><div className="clx-float clx-float--font"><Type size={14} /> Font</div></>}
                {s.n === 4 && <div className="clx-float clx-float--dl"><Download size={16} /> Download PDF</div>}
              </div>
              <span className="clx-num">{s.n}</span>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="clx-bld-steps-cta"><button type="button" className="clx-btn clx-btn--lg" onClick={start}>Build My Cover Letter Now</button></div>
      </section>

      <section className="clx-bld-features">
        <h2>A feature-packed, yet streamlined cover letter builder</h2>

        <div className="clx-row2">
          <div className="clx-row2-art">
            <span className="clx-blob clx-blob--peach" aria-hidden="true" />
            <div className="clx-fake-panel">
              <header>Fix Mistakes</header>
              <ul>
                <li><Sparkles size={15} /> Fix spelling &amp; grammar</li>
                <li><Sparkles size={15} /> Make it concise</li>
                <li><Sparkles size={15} /> More confident tone</li>
              </ul>
              <div className="clx-fake-sugg"><small>SPELL CHECK</small><span><s>recieve</s> <ArrowRight size={13} /> <b>receive</b></span></div>
            </div>
          </div>
          <div className="clx-row2-text">
            <h3>Spell check and AI fixes</h3>
            <p>Typos get underlined while you type. When the wording feels off, one click fixes grammar, cuts filler or makes the tone more confident, without changing your facts.</p>
          </div>
        </div>

        <div className="clx-row2 clx-row2--flip">
          <div className="clx-row2-art">
            <span className="clx-blob clx-blob--mint" aria-hidden="true" />
            <div className="clx-mini-tool">
              <ol className="clx-stepper clx-stepper--sm"><li className="is-done">✓</li><li className="is-on">2</li><li>3</li></ol>
              <strong>AI Cover Letter Generator</strong>
              <div className="clx-mini-box">Paste the job description…</div>
              <span className="clx-btn clx-btn--sm">Generate</span>
            </div>
          </div>
          <div className="clx-row2-text">
            <h3>State-of-the-art cover letter generator</h3>
            <p>No time to write from scratch? Upload your resume, paste the job ad, and the generator writes a first draft built only from your real experience.</p>
            <button type="button" className="clx-textlink" onClick={() => setCurrentPage('cover-letter-generator')}>Try the Cover Letter Generator <ArrowRight size={15} /></button>
          </div>
        </div>

        <div className="clx-row2">
          <div className="clx-row2-art">
            <span className="clx-blob clx-blob--blue" aria-hidden="true" />
            <div className="clx-row2-page"><TemplatePreview html={sampleOf('cl-gold-monogram')} name="Cover letter PDF" aspect="1 / 1" /></div>
          </div>
          <div className="clx-row2-text">
            <h3>Download your cover letter in PDF</h3>
            <p>PDF keeps your design and layout exactly as you made it, which is what recruiters and applicant tracking systems expect. Word download is there too.</p>
          </div>
        </div>

        <div className="clx-row2 clx-row2--flip">
          <div className="clx-row2-art">
            <span className="clx-blob clx-blob--lavender" aria-hidden="true" />
            <div className="clx-industry">
              <header><span>Industry Example</span><Megaphone size={22} /></header>
              <ul>
                {roles.map(r => (
                  <li key={r.slug}><button type="button" onClick={start}>{r.role}</button></li>
                ))}
              </ul>
              <span className="clx-industry-leo"><LeoAvatar size={80} pose="guide" /></span>
            </div>
          </div>
          <div className="clx-row2-text">
            <h3>Use industry examples to start your cover letter</h3>
            <p>Tell Leo the job you want and he shows you examples written for that role. Pick one and change the details to make it yours.</p>
            <button type="button" className="clx-textlink" onClick={start}>Start With Cover Letter Examples <ArrowRight size={15} /></button>
          </div>
        </div>

        <div className="clx-row2">
          <div className="clx-row2-art">
            <span className="clx-blob clx-blob--pink" aria-hidden="true" />
            <div className="clx-pair">
              <div className="clx-pair-a"><TemplatePreview html={sampleOf('cl-clean')} name="Cover letter" aspect="1 / 1.25" /></div>
              {resumeHtml && <div className="clx-pair-b"><TemplatePreview html={resumeHtml} name="Matching resume" aspect="1 / 1.25" /></div>}
            </div>
          </div>
          <div className="clx-row2-text">
            <h3>Pair with a resume to match</h3>
            <p>Use the same look on your cover letter and resume. Build a matching resume in our resume builder and stand out to hiring managers.</p>
            <button type="button" className="clx-textlink" onClick={() => setCurrentPage('resume-builder')}>Open the Resume Builder <ArrowRight size={15} /></button>
          </div>
        </div>
      </section>

      <CoverLetterFaq items={BUILDER_FAQS} />
    </div>
  );
}

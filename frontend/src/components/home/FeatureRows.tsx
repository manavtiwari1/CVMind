import { useState, type ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import ScaleToFit from './ScaleToFit';
import SampleResume, { SAMPLE_RESUME_WIDTH } from './SampleResume';
import ScoreCard from './ScoreCard';

interface FeatureRowsProps {
  setCurrentPage: (page: string) => void;
  onCheck: () => void;
}

interface RowProps {
  title: string;
  body: string;
  points: string[];
  cta: { label: string; onClick: () => void };
  visual: ReactNode;
  reverse?: boolean;
}

function Row({ title, body, points, cta, visual, reverse }: RowProps) {
  return (
    <div className={`hp-row${reverse ? ' hp-row--reverse' : ''}`}>
      <div className="hp-row-visual">{visual}</div>
      <div className="hp-row-copy">
        <h3 className="hp-h3">{title}</h3>
        <p className="hp-body">{body}</p>
        <ul className="hp-checks">
          {points.map((p) => (
            <li key={p}><CheckCircle2 size={18} /> <span>{p}</span></li>
          ))}
        </ul>
        <button type="button" className="hp-link" onClick={cta.onClick}>{cta.label} <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

const TAILOR_OPTIONS = [
  'Add keywords from the job post',
  'Rewrite bullets for this role',
  'Reorder the skills section',
  'Keep my facts unchanged',
];

function TailorVisual() {
  const [on, setOn] = useState<Record<string, boolean>>({
    [TAILOR_OPTIONS[0]]: true, [TAILOR_OPTIONS[1]]: true, [TAILOR_OPTIONS[2]]: false, [TAILOR_OPTIONS[3]]: true,
  });
  return (
    <div className="hp-visual-frame">
      <div className="hp-visual-paper">
        <ScaleToFit width={SAMPLE_RESUME_WIDTH} cropHeight={560}>
          <SampleResume tailored={on[TAILOR_OPTIONS[0]] || on[TAILOR_OPTIONS[2]]} />
        </ScaleToFit>
      </div>
      <div className="hp-float hp-tailor-panel">
        <div className="hp-tailor-cta"><Sparkles size={14} /> Tailor to a job</div>
        {TAILOR_OPTIONS.map((label) => (
          <label key={label} className="hp-toggle-row">
            <span>{label}</span>
            <input
              type="checkbox"
              role="switch"
              checked={on[label]}
              onChange={() => setOn((s) => ({ ...s, [label]: !s[label] }))}
            />
            <i className="hp-switch" aria-hidden="true" />
          </label>
        ))}
      </div>
    </div>
  );
}

const SECTION_STACK = [
  { name: 'Experience', hint: 'Roles, dates and results' },
  { name: 'Skills', hint: 'Grouped and searchable' },
  { name: 'Education', hint: 'Degrees and coursework' },
  { name: 'Certifications', hint: 'Licenses and courses' },
  { name: 'Languages', hint: 'With proficiency levels' },
];

export default function FeatureRows({ setCurrentPage, onCheck }: FeatureRowsProps) {
  return (
    <section className="hp-features">
      <div className="hp-wrap">
        <div className="hp-pill-title">
          <h2 className="hp-h2">How CVMind helps you get hired</h2>
        </div>

        <Row
          title="Catch writing slips before a recruiter does"
          body="Typos, passive phrasing and vague verbs are the fastest way to lose a skim read. The proofreader flags them and suggests cleaner wording, in whatever tone suits your industry."
          points={[
            'Spelling and grammar corrections you can accept one by one',
            'Passive sentences turned into active ones',
            'Weak verbs swapped for stronger, specific ones',
          ]}
          cta={{ label: 'Try AI proofreading', onClick: () => setCurrentPage('proofreading') }}
          visual={
            <div className="hp-visual-frame">
              <div className="hp-visual-paper">
                <ScaleToFit width={SAMPLE_RESUME_WIDTH} cropHeight={520}>
                  <SampleResume typo />
                </ScaleToFit>
              </div>
              <div className="hp-float hp-did-you-mean">
                <div className="hp-float-eyebrow"><i className="hp-dot hp-dot--red" /> Experience</div>
                <div className="hp-dym-q">Did you mean &ldquo;developed&rdquo;?</div>
                <div className="hp-dym-row">
                  <s>developd</s>
                  <ArrowRight size={16} />
                  <span className="hp-dym-fix">developed</span>
                </div>
              </div>
            </div>
          }
        />

        <Row
          reverse
          title="Tailor your resume to a job in one click"
          body="Paste the job description and choose what the AI is allowed to change. Keywords and skills are lined up with the role, and every change is shown so you stay in control."
          points={[
            'Keywords from the posting added where they genuinely fit',
            'Bullets reworded for the role, not rewritten from scratch',
            'Skills section reordered to lead with what the job asks for',
          ]}
          cta={{ label: 'Try resume tailoring', onClick: () => setCurrentPage('tailor') }}
          visual={<TailorVisual />}
        />

        <Row
          title="Choose from 20+ resume sections"
          body="Build the resume around your career, not around a fixed form. Add the sections recruiters expect and the ones that set you apart, then reorder them freely."
          points={[
            'Core sections: Experience, Skills, Summary and Education',
            'Extras: Achievements, Certifications, Languages and Projects',
            'Drag to reorder and keep everything on one clean page',
          ]}
          cta={{ label: 'Open the resume builder', onClick: () => setCurrentPage('resume-builder') }}
          visual={
            <div className="hp-visual-frame hp-visual-frame--stack">
              {SECTION_STACK.map((s, i) => (
                <div key={s.name} className="hp-section-card" style={{ '--i': i } as React.CSSProperties}>
                  <b>{s.name}</b>
                  <small>{s.hint}</small>
                </div>
              ))}
              <span className="hp-badge-rec">Recommended</span>
            </div>
          }
        />

        <Row
          reverse
          title="See how well you match a job before you apply"
          body="Paste a job post and CVMind compares it with your resume the way an applicant tracking system would. Every gap is listed, so you know exactly which keyword to add."
          points={[
            'Keywords from the job that you already have, and those you do not',
            'Notes on formatting that can confuse an ATS',
            'A score you can watch improve as you edit',
          ]}
          cta={{ label: 'Get my ATS score', onClick: onCheck }}
          visual={
            <div className="hp-visual-frame hp-visual-frame--center">
              <ScoreCard
                title="Match against: Senior Frontend Engineer"
                score={64}
                matched={['React', 'TypeScript', 'Jest', 'REST APIs']}
                missing={['GraphQL', 'CI/CD', 'Web performance']}
              />
            </div>
          }
        />
      </div>
    </section>
  );
}

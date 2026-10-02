import { ListTree, Target, UserRound } from 'lucide-react';

interface AtsBandProps {
  onBuild: () => void;
}

const CARDS = [
  { icon: UserRound, title: 'Contact details that parse correctly' },
  { icon: ListTree, title: 'Experience and dates read in full' },
  { icon: Target, title: 'Skills matched to the job post' },
];

export default function AtsBand({ onBuild }: AtsBandProps) {
  return (
    <section className="hp-ats">
      <div className="hp-ats-lines" aria-hidden="true" />
      <div className="hp-ats-inner">
        <div className="hp-ats-copy">
          <h2 className="hp-h2 hp-h2--light">Resumes built to get through ATS screening</h2>
          <p className="hp-body hp-body--light">
            Applicant tracking systems read your resume before a person does. CVMind checks the things they trip over:
            unusual section headings, dates they cannot read, multi-column layouts, and keywords the job asks for that
            your resume never mentions. You see what to fix before you apply.
          </p>
          <button className="hp-btn hp-btn--primary" onClick={onBuild}>Build an ATS-friendly resume</button>
        </div>
        <div className="hp-ats-cards">
          {CARDS.map(({ icon: Icon, title }, i) => (
            <div key={title} className="hp-glass" style={{ '--i': i } as React.CSSProperties}>
              <span className="hp-glass-icon"><Icon size={22} /></span>
              <span className="hp-glass-title">{title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

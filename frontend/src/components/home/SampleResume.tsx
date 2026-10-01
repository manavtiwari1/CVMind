import './SampleResume.css';

/** Design width of the sample resume page, in px. Pair with ScaleToFit. */
export const SAMPLE_RESUME_WIDTH = 640;

interface SampleResumeProps {
  /** Highlight a piece of text the way the editor marks AI-selected content. */
  highlight?: 'summary' | 'bullet';
  /** Show a misspelled word with a red underline (proofreading demo). */
  typo?: boolean;
  /** Show skills that a job-tailoring pass added. */
  tailored?: boolean;
}

/**
 * A realistic, fully synthetic resume used to illustrate product features.
 * The person and employers are made up; it is sample content, not a customer.
 */
export default function SampleResume({ highlight, typo = false, tailored = false }: SampleResumeProps) {
  const mark = (on: boolean, text: string) => (on ? <mark className="sr-mark">{text}</mark> : text);

  return (
    <div className="sr-page" style={{ width: SAMPLE_RESUME_WIDTH }}>
      <header className="sr-head">
        <div>
          <div className="sr-name">Priya Nair</div>
          <div className="sr-role">Senior Frontend Engineer</div>
          <div className="sr-contact">priya.nair@example.com · +91 98xxx xxxxx · Bengaluru · linkedin.com/in/priyanair</div>
        </div>
        <div className="sr-avatar" aria-hidden="true">PN</div>
      </header>

      <section>
        <h4 className="sr-h">Summary</h4>
        <p className="sr-p">
          {mark(
            highlight === 'summary',
            'Frontend engineer with 6 years of experience building performance-critical React applications for fintech and e-commerce products. Led a migration that cut page load time by 38% and mentored four junior engineers.',
          )}
        </p>
      </section>

      <section>
        <h4 className="sr-h">Experience</h4>
        <div className="sr-job">
          <div className="sr-job-top">
            <b>Senior Frontend Engineer</b>
            <span>Jun 2022 – Present</span>
          </div>
          <div className="sr-company">Northwind Payments · Bengaluru</div>
          <ul className="sr-ul">
            <li>
              {typo ? (
                <>
                  <span className="sr-typo">Developd</span> a shared component library used by 9 product teams, reducing duplicate UI code by 40%.
                </>
              ) : (
                'Built a shared component library used by 9 product teams, reducing duplicate UI code by 40%.'
              )}
            </li>
            <li>{mark(highlight === 'bullet', 'Migrated the checkout flow to code-split routes, improving Largest Contentful Paint from 3.4s to 2.1s.')}</li>
            <li>Introduced contract tests between the web app and payments API, cutting release-blocking bugs by half.</li>
          </ul>
        </div>
        <div className="sr-job">
          <div className="sr-job-top">
            <b>Frontend Developer</b>
            <span>Aug 2019 – May 2022</span>
          </div>
          <div className="sr-company">Kite Commerce · Pune</div>
          <ul className="sr-ul">
            <li>Shipped a new product-listing experience that raised add-to-cart rate by 12% in an A/B test.</li>
            <li>Owned accessibility fixes across 30+ screens to meet WCAG 2.1 AA.</li>
          </ul>
        </div>
      </section>

      <section>
        <h4 className="sr-h">Skills</h4>
        <div className="sr-chips">
          {['React', 'TypeScript', 'Next.js', 'Jest', 'Node.js', 'REST APIs'].map((s) => (
            <span key={s} className="sr-chip">{s}</span>
          ))}
          {tailored && ['GraphQL', 'Web Performance', 'CI/CD'].map((s) => (
            <span key={s} className="sr-chip sr-chip--new">{s}</span>
          ))}
        </div>
      </section>

      <section>
        <h4 className="sr-h">Education</h4>
        <div className="sr-job-top">
          <b>B.Tech, Computer Science</b>
          <span>2015 – 2019</span>
        </div>
        <div className="sr-company">National Institute of Technology, Calicut · CGPA 8.6</div>
      </section>
    </div>
  );
}

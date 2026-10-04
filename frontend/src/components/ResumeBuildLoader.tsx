import './ResumeBuildLoader.css';

interface Props {
  /** "switch" moves an existing resume into another template; "build" fills a template for the first time. */
  mode: 'build' | 'switch';
  templateName?: string;
}

const Bar = ({ w, h = 8 }: { w: string; h?: number }) => <span className="rbl-bar" style={{ width: w, height: h }} />;

const Heading = () => (
  <div className="rbl-heading">
    <Bar w="28%" h={10} />
  </div>
);

/** Full-page loading state shown while the AI fills a template: a resume-shaped skeleton instead of a spinner card. */
export default function ResumeBuildLoader({ mode, templateName }: Props) {
  const title = mode === 'switch'
    ? `Moving your resume to ${templateName || 'the new template'}`
    : `Building your resume${templateName ? ` in ${templateName}` : ''}`;
  const subtitle = mode === 'switch'
    ? 'Your wording stays the same. Only the layout changes.'
    : 'We are placing your details into the template.';

  return (
    <div className="rbl animate-fade-in-up" role="status" aria-live="polite">
      <div className="rbl-head">
        <h2 className="rbl-title">{title}</h2>
        <p className="rbl-sub">{subtitle} This can take up to a minute.</p>
      </div>

      <div className="rbl-page" aria-hidden="true">
        <div className="rbl-top">
          <div className="rbl-top-text">
            <Bar w="58%" h={20} />
            <Bar w="36%" h={11} />
            <div className="rbl-row">
              <Bar w="22%" h={7} /><Bar w="26%" h={7} /><Bar w="18%" h={7} />
            </div>
          </div>
          <span className="rbl-photo" />
        </div>

        <div className="rbl-section">
          <Heading />
          <Bar w="100%" /><Bar w="94%" /><Bar w="72%" />
        </div>

        <div className="rbl-section">
          <Heading />
          {[0, 1, 2].map(i => (
            <div key={i} className="rbl-entry">
              <div className="rbl-row rbl-split"><Bar w="42%" h={10} /><Bar w="18%" h={8} /></div>
              <Bar w="30%" h={8} />
              <div className="rbl-bullets"><Bar w="96%" /><Bar w="90%" /><Bar w="64%" /></div>
            </div>
          ))}
        </div>

        <div className="rbl-cols">
          <div className="rbl-section">
            <Heading />
            {[0, 1].map(i => (
              <div key={i} className="rbl-entry">
                <div className="rbl-row rbl-split"><Bar w="55%" h={10} /><Bar w="22%" h={8} /></div>
                <Bar w="45%" h={8} />
              </div>
            ))}
          </div>
          <div className="rbl-section">
            <Heading />
            <div className="rbl-chips">
              <Bar w="64px" h={18} /><Bar w="82px" h={18} /><Bar w="56px" h={18} /><Bar w="74px" h={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

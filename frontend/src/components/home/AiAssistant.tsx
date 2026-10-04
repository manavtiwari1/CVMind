import { useState } from 'react';
import { ArrowRight, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import ScoreCard from './ScoreCard';

interface AiAssistantProps {
  onCheck: () => void;
}

interface Feature {
  title: string;
  points: string[];
  stage: 'score' | 'rewrite' | 'tailor' | 'export';
}

const FEATURES: Feature[] = [
  {
    title: 'ATS score and keyword analysis',
    points: [
      'A 0 to 100 score with a breakdown of keywords, content and formatting',
      'A list of keywords the job usually asks for that your resume is missing',
      'Plain-language notes on what to change first',
    ],
    stage: 'score',
  },
  {
    title: 'AI bullet rewriting',
    points: [
      'Weak lines are rewritten with stronger verbs and a clear result',
      'You see the original next to the suggestion and choose what to keep',
      'Numbers are only added where you already have them',
    ],
    stage: 'rewrite',
  },
  {
    title: 'One-click job tailoring',
    points: [
      'Paste a job description and pick what the AI may change',
      'Keywords and skills are aligned to the role',
      'Your facts stay yours; the AI does not invent experience',
    ],
    stage: 'tailor',
  },
  {
    title: 'DOCX and PDF export',
    points: [
      'Download a clean, editable DOCX for applications',
      'Or export a PDF that keeps its layout',
      'Open the same resume in the editor any time to keep polishing',
    ],
    stage: 'export',
  },
];

function Stage({ kind }: { kind: Feature['stage'] }) {
  if (kind === 'score') {
    return (
      <div className="hp-stage-card hp-stage-card--score">
        <ScoreCard
          score={78}
          matched={['React', 'TypeScript', 'REST APIs']}
          missing={['GraphQL', 'CI/CD', 'Accessibility']}
        />
      </div>
    );
  }
  if (kind === 'rewrite') {
    return (
      <div className="hp-stage-stack">
        <div className="hp-stage-card">
          <div className="hp-float-eyebrow"><i className="hp-dot hp-dot--orange" /> AI suggestion</div>
          <p className="hp-sugg-old">Worked on the checkout page and made it faster.</p>
          <p className="hp-sugg-new">
            <b>Replace:</b> Rebuilt the checkout flow with code-splitting, improving Largest Contentful Paint from 3.4s to 2.1s.
          </p>
          <div className="hp-sugg-actions"><span>Restore</span><b>Approve</b></div>
        </div>
        <div className="hp-stage-card hp-stage-card--offset">
          <div className="hp-float-eyebrow"><i className="hp-dot hp-dot--orange" /> AI suggestion</div>
          <p className="hp-sugg-old">Helped the team with testing.</p>
          <p className="hp-sugg-new"><b>Replace:</b> Introduced contract tests for the payments API, halving release-blocking bugs.</p>
          <div className="hp-sugg-actions"><span>Restore</span><b>Approve</b></div>
        </div>
      </div>
    );
  }
  if (kind === 'tailor') {
    return (
      <div className="hp-stage-card">
        <div className="hp-float-eyebrow">Job description</div>
        <div className="hp-jd">
          <p>Senior Frontend Engineer</p>
          <p>We need strong React and TypeScript skills, experience with GraphQL, performance budgets and CI/CD pipelines…</p>
        </div>
        <button type="button" className="hp-tailor-btn" tabIndex={-1}><Sparkles size={14} /> Tailor to this job</button>
        <div className="hp-kw-list hp-kw-list--pad">
          {['GraphQL', 'Performance budgets', 'CI/CD'].map((k) => (
            <span key={k} className="hp-kw hp-kw--add">+ {k}</span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="hp-stage-stack">
      {[
        { name: 'Priya_Nair_Resume.docx', meta: 'Editable, ATS-safe' },
        { name: 'Priya_Nair_Resume.pdf', meta: 'Layout preserved' },
      ].map((f, i) => (
        <div key={f.name} className={`hp-stage-card hp-file${i ? ' hp-stage-card--offset' : ''}`}>
          <span className="hp-file-icon"><FileText size={20} /></span>
          <span>
            <b>{f.name}</b>
            <small>{f.meta}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AiAssistant({ onCheck }: AiAssistantProps) {
  const [open, setOpen] = useState(0);
  const active = FEATURES[open];

  return (
    <section className="hp-ai">
      <div className="hp-ai-bg" aria-hidden="true" />
      <div className="hp-ai-inner">
        <h2 className="hp-h2 hp-h2--light hp-center">Write a stronger resume with the AI assistant</h2>
        <p className="hp-body hp-body--light hp-center hp-ai-sub">
          Start from a template or upload the resume you have. The AI points out what is weak and suggests a rewrite,
          and you decide what goes in.
        </p>

        <div className="hp-ai-card">
          <div className="hp-ai-tabs" role="tablist" aria-label="AI assistant features">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`hp-ai-tab${i === open ? ' is-open' : ''}`}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === open}
                  className="hp-ai-tab-btn"
                  onClick={() => setOpen(i)}
                >
                  {f.title}
                </button>
                {i === open && (
                  <ul className="hp-ai-points">
                    {f.points.map((p) => (
                      <li key={p}><CheckCircle2 size={16} /> {p}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <button type="button" className="hp-link" onClick={onCheck}>Try the free ATS check <ArrowRight size={14} /></button>
          </div>
          <div className="hp-ai-stage" role="tabpanel" key={active.stage}>
            <Stage kind={active.stage} />
          </div>
        </div>
      </div>
    </section>
  );
}

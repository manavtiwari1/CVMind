import { useEffect } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, Target, Wand2 } from 'lucide-react';
import { formatStat, useLiveStats } from '../../utils/stats';
import ScaleToFit from './ScaleToFit';
import SampleResume, { SAMPLE_RESUME_WIDTH } from './SampleResume';

interface HomeHeroProps {
  setCurrentPage: (page: string) => void;
  onAnalyzeClick: () => void;
}

export default function HomeHero({ setCurrentPage, onAnalyzeClick }: HomeHeroProps) {
  const stats = useLiveStats();

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

  return (
    <section className="hp-hero">
      <div className="hp-hero-glow" aria-hidden="true" />
      <div className="hp-hero-inner">
        <div className="hp-hero-copy">
          <h1 className="hp-h1">
            Land more interviews with CVMind&rsquo;s <span className="hp-grad">Resume Builder</span>
          </h1>
          <p className="hp-lead">
            Build an ATS-friendly resume from a template, let the AI rewrite the weak lines, and tailor it to a job post in one click.
            Or upload the resume you already have and get a free score first.
          </p>
          <div className="hp-actions">
            <button className="hp-btn hp-btn--primary" onClick={() => setCurrentPage('resume-editor')}>
              Build your resume
            </button>
            <button className="hp-btn hp-btn--outline" onClick={onAnalyzeClick}>
              Get your resume score
            </button>
          </div>
          <ul className="hp-proof">
            <li><ShieldCheck size={16} /> ATS check needs no account</li>
            {stats.resumesAnalyzed != null && stats.resumesAnalyzed > 0 && (
              <li><Sparkles size={16} /> <b>{formatStat(stats.resumesAnalyzed)}</b> resumes analyzed so far</li>
            )}
          </ul>
        </div>

        <div className="hp-hero-visual" aria-hidden="true">
          <div className="hp-hero-paper">
            <ScaleToFit width={SAMPLE_RESUME_WIDTH} cropHeight={800}>
              <SampleResume highlight="bullet" />
            </ScaleToFit>
          </div>
          <div className="hp-float hp-hero-assistant">
            <div className="hp-float-eyebrow"><i className="hp-dot hp-dot--purple" /> AI assistant</div>
            <div className="hp-assist-item"><Wand2 size={15} /> Rewrite this bullet with metrics</div>
            <div className="hp-assist-item"><Target size={15} /> Add keywords from a job post</div>
            <div className="hp-assist-or">or</div>
            <div className="hp-assist-input">Enter a custom request</div>
          </div>
          <div className="hp-float hp-hero-toolbar">
            <span className="hp-tool hp-tool--green">+ New entry</span>
            <span className="hp-tool hp-tool--purple">New group</span>
            <span className="hp-tool-ico">T</span>
          </div>
        </div>
      </div>
      <button className="hp-scroll-hint" onClick={() => document.getElementById('hp-templates')?.scrollIntoView({ behavior: 'smooth' })}>
        Browse templates <ArrowRight size={14} />
      </button>
    </section>
  );
}

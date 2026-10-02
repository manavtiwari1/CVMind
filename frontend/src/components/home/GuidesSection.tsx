import { useMemo } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import TemplatePreview from '../TemplatePreview';
import { TEMPLATES } from '../../data/resumeTemplates';
import { withSampleData } from '../../data/samplePreview';
import { ARTICLES } from '../../data/articles';

interface GuidesSectionProps {
  setCurrentPage: (page: string) => void;
}

const INFO_CARDS = [
  {
    title: 'What CVMind is',
    body: 'An AI-powered platform for building, checking and tailoring your resume, and for preparing for the interviews that follow.',
    link: 'About CVMind',
    page: 'about',
  },
  {
    title: 'How the AI tools work',
    body: 'Scoring, rewriting and tailoring are done by AI. Every suggestion is shown to you first, and nothing is added to your resume without your approval.',
    link: 'Read the FAQ',
    page: 'faq',
  },
  {
    title: 'What you will find on the blog',
    body: 'Practical guides on ATS formatting, keywords, common resume mistakes, LinkedIn profiles and how to answer interview questions.',
    link: 'Visit the blog',
    page: 'blog',
  },
];

const FEATURED_COUNT = 6;

export default function GuidesSection({ setCurrentPage }: GuidesSectionProps) {
  const template = useMemo(() => {
    const t = TEMPLATES.find((x) => x.id === 'cv-modern');
    return t ? { ...t, html: withSampleData(t) } : undefined;
  }, []);

  return (
    <section className="hp-guides">
      <div className="hp-guides-glow" aria-hidden="true" />
      <div className="hp-guides-inner">
        <div className="hp-guides-hero">
          <div>
            <h2 className="hp-h2 hp-h2--light">CVMind is with you through every step of your job search</h2>
            <p className="hp-body hp-body--light">
              Got questions about resumes, ATS screening or interviews? Start with the guides, then put them to work in the tools.
            </p>
          </div>
          {template && (
            <div className="hp-guides-visual" aria-hidden="true">
              <TemplatePreview html={template.html} name={template.name} aspect="700 / 560" pageWidth={700} />
            </div>
          )}
        </div>

        <div className="hp-guides-cards">
          {INFO_CARDS.map((c) => (
            <article key={c.title} className="hp-gcard">
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <button type="button" className="hp-gcard-link" onClick={() => setCurrentPage(c.page)}>
                {c.link} <ArrowRight size={14} />
              </button>
            </article>
          ))}
        </div>

        <div className="hp-guides-list">
          <div className="hp-guides-list-intro">
            <h3 className="hp-h3 hp-h3--light">Guides from the blog</h3>
            <p className="hp-body hp-body--light">Step-by-step articles you can act on the same day.</p>
            <button type="button" className="hp-btn hp-btn--outline hp-btn--small" onClick={() => setCurrentPage('blog')}>
              See all guides
            </button>
          </div>
          <div className="hp-guides-items">
            {ARTICLES.slice(0, FEATURED_COUNT).map((a) => (
              <button key={a.slug} type="button" className="hp-gcard hp-gitem" onClick={() => setCurrentPage(a.slug)}>
                <span className="hp-gitem-tag">{a.tag}</span>
                <span className="hp-gitem-title">{a.title}</span>
                <span className="hp-gitem-blurb">{a.blurb}</span>
                <span className="hp-gitem-meta"><Clock size={12} /> {a.readTime}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

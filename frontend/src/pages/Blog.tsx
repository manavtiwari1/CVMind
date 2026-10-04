import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ARTICLES, type ArticleDef } from '../data/articles';
import ArticleCover from './resources/ArticleCover';
import './resources/Resources.css';
import './Blog.css';

interface BlogProps {
  setCurrentPage: (page: string) => void;
}

// The guide everyone should read first
const FEATURED_SLUG = 'how-to-create-an-ats-friendly-resume';

const TOPICS = ['All', ...Array.from(new Set(ARTICLES.map(a => a.tag)))];

export default function Blog({ setCurrentPage }: BlogProps) {
  const [topic, setTopic] = useState('All');

  const featured = ARTICLES.find(a => a.slug === FEATURED_SLUG) || ARTICLES[0];
  const list = useMemo(
    () => (topic === 'All' ? ARTICLES.filter(a => a.slug !== featured.slug) : ARTICLES.filter(a => a.tag === topic)),
    [topic, featured.slug]
  );

  const card = (a: ArticleDef) => (
    <li key={a.slug}>
      <button type="button" className="blog-card" onClick={() => setCurrentPage(a.slug)}>
        <ArticleCover slug={a.slug} tag={a.tag} className="blog-card-cover" />
        <span className="blog-card-body">
          <span className="rsc-eyebrow blog-card-tag">{a.tag}</span>
          <span className="blog-card-title">{a.title}</span>
          <span className="blog-card-meta">
            Published: {a.date}
            <span aria-hidden="true"> • </span>
            {a.readTime}
          </span>
        </span>
      </button>
    </li>
  );

  return (
    <div className="rsc blog">
      <h1 className="rsc-title">CV Mind Blog</h1>
      <p className="rsc-lede">Step-by-step guides for writing a resume that gets read, getting through ATS screening and preparing for interviews.</p>

      <div className="blog-topics" role="tablist" aria-label="Topics">
        {TOPICS.map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={topic === t}
            className={`blog-topic${topic === t ? ' is-active' : ''}`}
            onClick={() => setTopic(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {topic === 'All' && (
        <section className="blog-feature" aria-label="Start here">
          <div className="blog-feature-strip"><span className="rsc-eyebrow">Start here</span></div>
          <div className="blog-feature-grid">
            <button type="button" className="blog-feature-media" onClick={() => setCurrentPage(featured.slug)} aria-label={featured.title}>
              <ArticleCover slug={featured.slug} tag={featured.tag} />
            </button>
            <div className="blog-feature-text">
              <h2>{featured.title}</h2>
              <p>{featured.blurb}</p>
              <p className="blog-card-meta">Published: {featured.date} • {featured.readTime}</p>
              <button type="button" className="rsc-link" onClick={() => setCurrentPage(featured.slug)}>
                Read Full Article <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="blog-section">
        <h2 className="blog-section-title">{topic === 'All' ? 'Latest articles' : topic}</h2>
        <ul className="blog-grid">{list.map(card)}</ul>
      </section>

      <section className="rsc-cta">
        <div>
          <h2>Put a guide into practice</h2>
          <p>Upload your resume for a free ATS check, or start a new one in the builder with an ATS-friendly template.</p>
        </div>
        <div className="rsc-cta-actions">
          <button type="button" className="rsc-btn rsc-btn--ghost" onClick={() => setCurrentPage('home')}>Check my resume</button>
          <button type="button" className="rsc-btn" onClick={() => setCurrentPage('resume-builder')}>Build a resume</button>
        </div>
      </section>
    </div>
  );
}

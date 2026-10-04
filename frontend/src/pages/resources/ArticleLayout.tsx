import type { ReactNode } from 'react';
import { Home, ChevronRight, ListChecks, ArrowRight } from 'lucide-react';
import { ARTICLES, getArticle, type ArticleDef } from '../../data/articles';
import cvmindIcon from '../../assets/cvmind_icon.png';
import ArticleCover from './ArticleCover';
import './Resources.css';
import '../Article.css';

interface ArticleLayoutProps {
  article: ArticleDef;
  toc: { id: string; label: string }[];
  /** Key points shown in the Quick summary card: a bold lead-in and the rest of the sentence. */
  summary: { lead: string; text: string }[];
  setCurrentPage: (page: string) => void;
  children: ReactNode;
}

// Blog article page: a hero with the cover and byline, then the guide's contents and a
// resume call-to-action on the left and the article itself on the right
export default function ArticleLayout({ article, toc, summary, setCurrentPage, children }: ArticleLayoutProps) {
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // The article's own related guides, topped up with other guides so there are always three
  const relatedSlugs = [
    ...(article.related || []),
    ...ARTICLES.filter(a => a.tag === article.tag).map(a => a.slug),
    ...ARTICLES.map(a => a.slug),
  ];
  const related = Array.from(new Set(relatedSlugs))
    .filter(s => s !== article.slug)
    .map(getArticle)
    .filter((a): a is ArticleDef => Boolean(a))
    .slice(0, 3);

  return (
    <div className="art">
      <header className="art-hero">
        <div className="art-hero-inner">
          <div className="art-hero-cover">
            <ArticleCover slug={article.slug} tag={article.tag} />
          </div>
          <div className="art-hero-text">
            <nav className="art-crumbs" aria-label="Breadcrumb">
              <button type="button" onClick={() => setCurrentPage('home')} aria-label="Home"><Home size={15} /></button>
              <ChevronRight size={14} aria-hidden="true" />
              <button type="button" onClick={() => setCurrentPage('blog')}>Blog</button>
              <ChevronRight size={14} aria-hidden="true" />
              <span className="art-crumbs-tag">{article.tag}</span>
              <ChevronRight size={14} aria-hidden="true" />
              <span className="art-crumbs-current">{article.title}</span>
            </nav>
            <span className="rsc-eyebrow art-tag">{article.tag}</span>
            <h1 className="art-h1">{article.title}</h1>
            <p className="art-dek">{article.blurb}</p>
          </div>
          <div className="art-byline">
            <img src={cvmindIcon} alt="" />
            <div>
              <span className="art-byline-by">Written by <strong>CV Mind Team</strong></span>
              <span className="art-byline-meta">Published: {article.date} • {article.readTime}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="art-sheet">
        <div className="art-grid">
          <aside className="art-side">
            <nav className="art-guide" aria-label="In this guide">
              <p>In This Guide:</p>
              <ul>
                {toc.map(t => (
                  <li key={t.id}>
                    <button type="button" onClick={() => jump(t.id)}>{t.label}</button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="art-promo">
              <h2>Upgrade your resume in minutes</h2>
              <p>Use the CV Mind resume builder to create an ATS-friendly resume and get more interviews.</p>
              <button type="button" className="rsc-btn" onClick={() => setCurrentPage('resume-builder')}>Build your resume</button>
              <div className="art-promo-stage" aria-hidden="true">
              <div className="art-promo-paper">
                <span className="art-promo-name" />
                <span className="art-promo-role" />
                {Array.from({ length: 4 }, (_, i) => (
                  <span key={i} className="art-promo-block">
                    <span className="art-promo-heading" />
                    <span /><span /><span />
                  </span>
                ))}
              </div>
              </div>
            </div>
          </aside>

          <article className="art-body">
            {summary.length > 0 && (
              <section className="art-summary" aria-label="Quick summary">
                <h2 className="art-summary-title">
                  <span className="art-summary-icon"><ListChecks size={24} /></span>
                  Quick summary
                </h2>
                <ul>
                  {summary.map(s => (
                    <li key={s.lead}><strong>{s.lead}</strong>: {s.text}</li>
                  ))}
                </ul>
              </section>
            )}

            {children}

            <section className="art-cta">
              <h2>Put this guide into practice</h2>
              <p>Get an instant ATS score for the resume you have, or build a new one from an ATS-friendly template. Both are free.</p>
              <div className="rsc-cta-actions">
                <button type="button" className="rsc-btn" onClick={() => setCurrentPage('home')}>Check my resume</button>
                <button type="button" className="rsc-btn rsc-btn--ghost" onClick={() => setCurrentPage('resume-builder')}>Build a resume</button>
              </div>
            </section>
          </article>
        </div>

        {related.length > 0 && (
          <section className="art-related">
            <h2>Keep reading</h2>
            <ul>
              {related.map(r => (
                <li key={r.slug}>
                  <button type="button" className="art-related-card" onClick={() => setCurrentPage(r.slug)}>
                    <ArticleCover slug={r.slug} tag={r.tag} className="art-related-cover" />
                    <span className="rsc-eyebrow">{r.tag}</span>
                    <span className="art-related-title">{r.title}</span>
                    <span className="art-related-more">Read article <ArrowRight size={15} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { getArticle } from '../data/articles';
import './Article.css';

interface ArticlePageProps {
  slug: string;
  setCurrentPage: (page: string) => void;
}

// Generic renderer for registry-driven articles (those with `sections`).
export default function ArticlePage({ slug, setCurrentPage }: ArticlePageProps) {
  const article = getArticle(slug);

  // Article + FAQ structured data for rich results
  useEffect(() => {
    if (!article) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'article-jsonld';
    const blocks: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.metaDescription,
        author: { '@type': 'Organization', name: 'CV Mind Team', url: 'https://www.cvmind.in/' },
        publisher: { '@type': 'Organization', name: 'CV Mind' },
        datePublished: article.isoDate,
        dateModified: article.isoDate,
        mainEntityOfPage: `https://www.cvmind.in/${article.slug}`,
      },
    ];
    if (article.faqs?.length) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: article.faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      });
    }
    script.text = JSON.stringify(blocks);
    document.head.appendChild(script);
    return () => { document.getElementById('article-jsonld')?.remove(); };
  }, [article]);

  if (!article || !article.sections) return null;

  // Intercept internal links inside article HTML so navigation stays in the SPA.
  const handleClick = (e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href') || '';
      if (href.startsWith('/')) {
        e.preventDefault();
        setCurrentPage(href === '/' ? 'home' : href.slice(1));
      }
    }
  };

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const related = (article.related || []).map(getArticle).filter(Boolean);

  return (
    <article className="art-page" onClick={handleClick}>
      <div className="art-breadcrumb">
        <button onClick={() => setCurrentPage('home')}>Home</button> › <button onClick={() => setCurrentPage('blog')}>Blog</button> › {article.tag}
      </div>

      <span className="art-tag">{article.tag}</span>
      <h1 className="art-h1">{article.title}</h1>
      <div className="art-meta">By CV Mind Team · Updated {article.date} · {article.readTime}</div>

      <div dangerouslySetInnerHTML={{ __html: article.intro || '' }} />

      <nav className="art-toc">
        <div className="art-toc-title">Table of Contents</div>
        <ol>
          {article.sections.map(s => (
            <li key={s.id}>
              <button className="art-link-btn" onClick={() => jump(s.id)}>{s.heading}</button>
            </li>
          ))}
          {article.faqs?.length ? (
            <li><button className="art-link-btn" onClick={() => jump('faqs')}>Frequently Asked Questions</button></li>
          ) : null}
        </ol>
      </nav>

      {article.sections.map(s => (
        <section key={s.id}>
          <h2 id={s.id}>{s.heading}</h2>
          <div dangerouslySetInnerHTML={{ __html: s.html }} />
        </section>
      ))}

      {article.faqs?.length ? (
        <>
          <h2 id="faqs">Frequently Asked Questions</h2>
          {article.faqs.map((f, i) => (
            <details key={i} className="art-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </>
      ) : null}

      <div className="art-cta">
        <h2>Put This Into Practice — Free</h2>
        <p>CV Mind gives you an instant ATS score, an AI resume builder with recruiter-approved templates, and AI interview prep for what comes next.</p>
        <div className="art-cta-buttons">
          <button className="art-cta-primary" onClick={() => setCurrentPage('home')}>Check My Resume Free</button>
          <button className="art-cta-secondary" onClick={() => setCurrentPage('resume-builder')}>Build My Resume</button>
          <button className="art-cta-secondary" onClick={() => setCurrentPage('prep')}>Practice Interviews</button>
        </div>
      </div>

      {related.length > 0 && (
        <>
          <h2 style={{ marginTop: '48px' }}>Related Guides</h2>
          <ul>
            {related.map(r => (
              <li key={r!.slug}>
                <button className="art-link-btn" onClick={() => setCurrentPage(r!.slug)}>{r!.title}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

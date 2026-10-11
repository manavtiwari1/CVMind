import { getArticle, type ArticleSection } from '../data/articles';
import ArticleLayout from './resources/ArticleLayout';

// Quick summary: each of the first four sections' heading with the first sentence of its first paragraph
function summarize(sections: ArticleSection[]) {
  return sections.slice(0, 4).flatMap(s => {
    const para = s.html.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? '';
    const text = (new DOMParser().parseFromString(para, 'text/html').body.textContent ?? '').trim();
    const sentence = text.match(/^[\s\S]+?[.!?](?=\s|$)/)?.[0] ?? text;
    return sentence ? [{ lead: s.heading, text: sentence }] : [];
  });
}

interface ArticlePageProps {
  slug: string;
  setCurrentPage: (page: string) => void;
}

// Renders every blog article. Its structured data (BlogPosting) is written into the static HTML at
// build time (seo/prerender.ts), so the page doesn't add a second copy here.
export default function ArticlePage({ slug, setCurrentPage }: ArticlePageProps) {
  const article = getArticle(slug);

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

  const toc = [
    ...article.sections.map(s => ({ id: s.id, label: s.heading })),
    ...(article.faqs?.length ? [{ id: 'faqs', label: 'Frequently Asked Questions' }] : []),
  ];

  return (
    <ArticleLayout article={article} toc={toc} summary={article.summary ?? summarize(article.sections)} setCurrentPage={setCurrentPage}>
      <div onClick={handleClick}>
        <div dangerouslySetInnerHTML={{ __html: article.intro || '' }} />

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
      </div>
    </ArticleLayout>
  );
}

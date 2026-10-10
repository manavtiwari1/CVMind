import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import { VALID_PAGES } from '../src/lib/routes';
import { ARTICLES } from '../src/data/articles';
import { seoFor, pageUrl, isIndexable, SITE_URL } from '../src/utils/seo';

// Build step: one HTML file per page, so crawlers and link previews (which don't run JavaScript)
// get each page's own title, description, canonical, robots tag, a heading and a summary.
// React replaces the #root content when it starts. Writes:
//   dist/index.html, dist/<page>.html  (served at /<page> with cleanUrls in vercel.json)
//   dist/portfolio.html                (/portfolio/:id and /r/:name share links)
//   dist/404.html                      (any other address, with a real 404 status)
//   dist/sitemap.xml                   (indexable pages only)

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const heading = (title: string) => title.split(' | ')[0].replace(/\s+-\s+CV ?Mind$/i, '').trim();

const isoDate = (text: string) => {
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : new Date(time).toISOString().slice(0, 10);
};

function articleJsonLd(slug: string) {
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) return '';
  const published = isoDate(a.date);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: heading(a.metaTitle),
    description: a.metaDescription,
    url: pageUrl(slug),
    mainEntityOfPage: pageUrl(slug),
    ...(published ? { datePublished: published, dateModified: published } : {}),
    image: `${SITE_URL}/og-image.png`,
    author: { '@type': 'Organization', name: 'CV Mind', url: `${SITE_URL}/` },
    publisher: { '@type': 'Organization', name: 'CV Mind', logo: { '@type': 'ImageObject', url: `${SITE_URL}/apple-touch-icon.png` } }
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function renderPage(template: string, page: string) {
  const seo = seoFor(page);
  const url = page === 'not-found' ? `${SITE_URL}/` : pageUrl(page);
  const indexable = isIndexable(page);
  const replaceTag = (html: string, pattern: RegExp, tag: string) => {
    if (!pattern.test(html)) throw new Error(`[seo-prerender] index.html is missing ${pattern}`);
    return html.replace(pattern, tag);
  };

  let html = template;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(seo.title)}</title>`);
  html = replaceTag(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(seo.description)}" />`);
  html = replaceTag(html, /<meta name="keywords" content="[^"]*" \/>\s*/, seo.keywords ? `<meta name="keywords" content="${esc(seo.keywords)}" />\n    ` : '');
  html = replaceTag(html, /<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, nofollow'}" />`);
  html = replaceTag(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${esc(url)}" />`);
  html = replaceTag(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(seo.title)}" />`);
  html = replaceTag(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(seo.description)}" />`);
  html = replaceTag(html, /<meta name="twitter:url" content="[^"]*" \/>/, `<meta name="twitter:url" content="${esc(url)}" />`);
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${esc(seo.title)}" />`);
  html = replaceTag(html, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${esc(seo.description)}" />`);
  // Pages that aren't indexed get no canonical (it would point search engines at an address they shouldn't use)
  html = replaceTag(html, /<link rel="canonical" href="[^"]*" \/>/, indexable ? `<link rel="canonical" href="${esc(url)}" />` : '');

  const isArticle = ARTICLES.some((a) => a.slug === page);
  if (isArticle) html = replaceTag(html, /<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="article" />');
  html = replaceTag(html, /<!-- page-jsonld:start -->[\s\S]*?<!-- page-jsonld:end -->/,
    page === 'home' ? (template.match(/<!-- page-jsonld:start -->[\s\S]*?<!-- page-jsonld:end -->/) || [''])[0] : isArticle ? articleJsonLd(page) : '');

  // A heading and summary for crawlers that don't run JavaScript; the app replaces it on load
  const content = indexable
    ? `<main><h1>${esc(heading(seo.title))}</h1><p>${esc(seo.description)}</p></main>`
    : '';
  html = replaceTag(html, /<!-- page-content -->/, content);
  return html;
}

function sitemap(pages: string[]) {
  const urls = pages.map((page) => {
    const article = ARTICLES.find((a) => a.slug === page);
    const lastmod = article ? isoDate(article.date) : null;
    return `  <url>\n    <loc>${esc(pageUrl(page))}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function seoPrerender(): Plugin {
  let outDir = 'dist';
  return {
    name: 'cvmind-seo-prerender',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const templatePath = path.join(outDir, 'index.html');
      const template = fs.readFileSync(templatePath, 'utf8');
      const pages = [...new Set(VALID_PAGES)];
      for (const page of pages) {
        const file = page === 'home' ? 'index.html' : `${page}.html`;
        fs.writeFileSync(path.join(outDir, file), renderPage(template, page));
      }
      fs.writeFileSync(path.join(outDir, 'portfolio.html'), renderPage(template, 'portfolio'));
      fs.writeFileSync(path.join(outDir, '404.html'), renderPage(template, 'not-found'));
      const indexable = pages.filter(isIndexable);
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap(indexable));
      console.log(`[seo-prerender] ${pages.length + 2} pages written, ${indexable.length} in sitemap.xml`);
    }
  };
}

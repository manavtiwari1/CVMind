import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import { VALID_PAGES } from '../src/lib/routes';
import { ARTICLES, ARTICLE_AUTHOR, type ArticleDef } from '../src/data/articles';
import { seoFor, pageUrl, isIndexable, SITE_URL } from '../src/utils/seo';
import { BUILDER_COPY, FEATURE_SECTIONS, LEVELS, STAGES } from '../src/data/landings';
import { RESUME_TEMPLATES } from '../src/data/resumeTemplates';
import { HOME_HERO, HOME_CHECKER, HOME_FAQS } from '../src/data/homeCopy';
import { FAQ_GROUPS } from '../src/data/faqs';
import { BUILDER_FAQS } from '../src/data/coverLetterFaqs';

// Build step: one HTML file per page, so crawlers and link previews (which don't run JavaScript)
// get each page's own title, description, canonical, robots tag, a heading and a summary. Articles
// and the builder landing (/resume-builder) get their full text, the blog page lists the
// articles, and every page carries the main site links, because AI search crawlers such as
// OAI-SearchBot and PerplexityBot read this HTML without running the app.
// React replaces the #root content when it starts. Writes:
//   dist/index.html, dist/<page>.html  (served at /<page> with cleanUrls in vercel.json)
//   dist/portfolio.html                (/portfolio/:id and /r/:name share links)
//   dist/404.html                      (any other address, with a real 404 status)
//   dist/sitemap.xml                   (indexable pages only)

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const heading = (title: string) => title.split(' | ')[0].replace(/\s+-\s+CV ?Mind$/i, '').trim();

function articleJsonLd(a: ArticleDef) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: heading(a.metaTitle),
    description: a.metaDescription,
    url: pageUrl(a.slug),
    mainEntityOfPage: pageUrl(a.slug),
    datePublished: a.isoDate,
    dateModified: a.updated ?? a.isoDate,
    image: `${SITE_URL}/og-image.png`,
    author: { '@type': 'Person', name: ARTICLE_AUTHOR.name, jobTitle: 'Founder', url: ARTICLE_AUTHOR.url, sameAs: ARTICLE_AUTHOR.sameAs },
    publisher: { '@type': 'Organization', name: 'CV Mind', url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/apple-touch-icon.png` } }
  };
  return jsonLd(data);
}

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// The article as the app shows it: title, byline, intro, sections and FAQs. The section and intro
// HTML comes from our own data file (src/data/articles.ts), so it's inserted as is.
function articleContent(a: ArticleDef) {
  const byline = `<p>By <a href="/about">${esc(ARTICLE_AUTHOR.name)}</a>, ${esc(ARTICLE_AUTHOR.role)} · `
    + `Published <time datetime="${a.isoDate}">${longDate(a.isoDate)}</time>`
    + (a.updated ? ` · Updated <time datetime="${a.updated}">${longDate(a.updated)}</time>` : '')
    + ` · ${esc(a.readTime)}</p>`;
  const sections = (a.sections || []).map((s) => `<section><h2 id="${esc(s.id)}">${esc(s.heading)}</h2>\n${s.html}</section>`).join('\n');
  const faqs = a.faqs?.length
    ? `<section><h2 id="faqs">Frequently Asked Questions</h2>\n${a.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('\n')}</section>`
    : '';
  return `<main class="prerender"><article><h1>${esc(a.title)}</h1>${byline}<p>${esc(a.blurb)}</p>\n${a.intro || ''}\n${sections}\n${faqs}</article></main>`;
}

function blogContent(seo: { title: string; description: string }) {
  const list = ARTICLES.map((a) => `<li><a href="/${a.slug}">${esc(a.title)}</a><p>${esc(a.blurb)}</p></li>`).join('\n');
  return `<main class="prerender"><h1>${esc(heading(seo.title))}</h1><p>${esc(seo.description)}</p>\n<ul>\n${list}\n</ul></main>`;
}

const jsonLd = (data: object) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

// Home > ... > this page, for the breadcrumb trail Google can show in results
function breadcrumbJsonLd(trail: { name: string; page: string }[]) {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', page: 'home' }, ...trail].map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: pageUrl(t.page) })),
  });
}

// The landing page's text, in the order the app shows it
function builderContent() {
  const copy = BUILDER_COPY;
  const list = (items: string[]) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  const guide = copy.guide.map((g) => `<section><h2 id="${esc(g.id)}">${esc(g.heading)}</h2>\n${g.html}</section>`).join('\n');
  const features = FEATURE_SECTIONS.map((f) => `<section><h2>${esc(f.title)}</h2><p>${esc(f.body)}</p>`
    + `<ul>${f.points.map((pt) => `<li><strong>${esc(pt.title)}:</strong> ${esc(pt.text)}</li>`).join('')}</ul>`
    + `<p><a href="${f.page === 'home' ? '/' : `/${f.page}`}">${esc(f.cta)}</a></p></section>`).join('\n');
  const levels = `<section><h2>Make a great resume, whatever your experience</h2>${LEVELS.map((l) => `<h3>${esc(l.label)}</h3><p>${esc(l.body)}</p>${list(l.points)}`).join('')}</section>`;
  const stages = `<section><h2>AI tools at every stage of your job search</h2>${STAGES.map((st) => `<h3>${esc(st.title)}</h3><p>${esc(st.text)}</p>`).join('')}</section>`;
  const templates = `<section><h2>Pick from ${RESUME_TEMPLATES.length} resume templates</h2>${list(RESUME_TEMPLATES.map((t) => t.name))}</section>`;
  const faqs = `<section><h2>Frequently asked questions</h2>${copy.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>`;
  return `<main class="prerender"><h1>${esc(`${copy.h1.lead} ${copy.h1.em}`)}</h1>${list(copy.checks)}\n${guide}\n${features}\n${levels}\n${stages}\n${templates}\n${faqs}`
    + `<section><h2>${esc(copy.final.heading)}</h2><p>${esc(copy.final.text)}</p></section></main>`;
}

// The home page's heading, intro, checker, guides and FAQs
function homeContent() {
  const guides = ARTICLES.map((a) => `<li><a href="/${a.slug}">${esc(a.title)}</a></li>`).join('');
  return `<main class="prerender"><h1>${esc(`${HOME_HERO.h1.lead} ${HOME_HERO.h1.em}`)}</h1><p>${esc(HOME_HERO.lead)}</p>`
    + '<p><a href="/resume-builder">Build your resume or CV</a></p>'
    + `<section><h2>${esc(HOME_CHECKER.heading)}</h2><p>${esc(HOME_CHECKER.text)}</p></section>`
    + `<section><h2>Resume and career guides</h2><ul>${guides}</ul></section>`
    + `<section><h2>Frequently Asked Questions</h2>${HOME_FAQS.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section></main>`;
}

// Pages whose text is a list of questions: the heading and intro, then every question and answer
function faqContent(seo: { title: string; description: string }, groups: { title?: string; items: { q: string; a: string }[] }[]) {
  const body = groups.map((g) => (g.title ? `<h2>${esc(g.title)}</h2>` : '') + g.items.map((i) => `<h3>${esc(i.q)}</h3><p>${esc(i.a)}</p>`).join('')).join('\n');
  return `<main class="prerender"><h1>${esc(heading(seo.title))}</h1><p>${esc(seo.description)}</p>\n${body}</main>`;
}

// The main site links on every page, so crawlers that don't run the app can still follow them
const SITE_LINKS: [string, string][] = [
  ['home', 'ATS Resume Checker'], ['resume-builder', 'Resume Builder & CV Maker'],
  ['cover-letter-builder', 'Cover Letter Builder'], ['ai-job-finder', 'AI Job Finder'], ['pricing', 'Pricing'],
  ['blog', 'Career Blog'], ['resume-format-for-freshers', 'Resume Format for Freshers'],
  ['how-to-create-an-ats-friendly-resume', 'ATS-Friendly Resume Guide'], ['about', 'About CV Mind'],
];
const siteNav = (current: string) => `<nav class="prerender" aria-label="Site"><ul>${SITE_LINKS.filter(([page]) => page !== current)
  .map(([page, label]) => `<li><a href="${page === 'home' ? '/' : `/${page}`}">${esc(label)}</a></li>`).join('')}</ul></nav>`;

// Keeps the static text readable for the moment before the app replaces it (and with JavaScript off)
const FALLBACK_STYLE = '<style>.prerender{max-width:760px;margin:0 auto;padding:24px 16px;font:16px/1.65 system-ui,sans-serif;color:#1a1a1a}.prerender table{border-collapse:collapse}.prerender td,.prerender th{border:1px solid #ddd;padding:6px 10px}</style>';

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

  const article = ARTICLES.find((a) => a.slug === page);
  if (article) html = replaceTag(html, /<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="article" />');
  const pageJsonLd = page === 'home' ? (template.match(/<!-- page-jsonld:start -->[\s\S]*?<!-- page-jsonld:end -->/) || [''])[0]
    : article ? articleJsonLd(article) + breadcrumbJsonLd([{ name: 'Blog', page: 'blog' }, { name: article.title, page: article.slug }])
    : page === 'resume-builder' ? breadcrumbJsonLd([{ name: BUILDER_COPY.crumb, page }])
    : '';
  html = replaceTag(html, /<!-- page-jsonld:start -->[\s\S]*?<!-- page-jsonld:end -->/, pageJsonLd);

  // Text for crawlers that don't run JavaScript; the app replaces it on load
  let content = '';
  if (indexable) {
    content = article ? articleContent(article)
      : page === 'home' ? homeContent()
      : page === 'resume-builder' ? builderContent()
      : page === 'blog' ? blogContent(seo)
      : page === 'faq' ? faqContent(seo, FAQ_GROUPS)
      : page === 'cover-letter-builder' ? faqContent(seo, [{ title: 'Frequently asked questions', items: BUILDER_FAQS }])
      : `<main class="prerender"><h1>${esc(heading(seo.title))}</h1><p>${esc(seo.description)}</p></main>`;
    content = FALLBACK_STYLE + content + siteNav(page);
  }
  html = replaceTag(html, /<!-- page-content -->/, content);
  return html;
}

function sitemap(pages: string[]) {
  const urls = pages.map((page) => {
    const article = ARTICLES.find((a) => a.slug === page);
    const lastmod = article ? article.updated ?? article.isoDate : null;
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

# GEO Analysis: www.cvmind.in

Audited 2026-10-11 against the live site (build `7d6dfd3`, branch `fix/seo-technical`) and the source in `frontend/`.

## 1. GEO Readiness Score: 52/100

| Criterion | Weight | Score | Why |
|---|---|---|---|
| Citability | 25 | 15 | The articles are well written and easy to quote, but non-JS crawlers see only a title and one sentence |
| Structural readability | 20 | 16 | Clean H2/H3, numbered lists, checklists, a reference table and FAQs in every article |
| Multi-modal | 15 | 6 | Text only in the articles; the interactive tools exist but sit behind the app |
| Authority & brand | 20 | 5 | Author is an organisation, no linked sources, every article has the same date, no brand mentions found off-site |
| Technical accessibility | 20 | 10 | Every crawler gets a 200 and per-page meta, but article bodies are rendered by JavaScript only |

Following Google's guidance, this is SEO applied to AI search surfaces. Nothing below is a special "AI trick".

## 2. Platform readiness (not measured)

No AI-visibility tool (DataForSEO or SE Ranking) was used, so these are qualitative.

- **Google AI Overviews / AI Mode:** fair. Googlebot runs JavaScript, so it sees the full articles. The limits are authority (organisation author, no sources) and how young the domain is.
- **ChatGPT Search, Perplexity, Claude search:** poor. These crawlers are generally reported to fetch raw HTML, and raw HTML holds about 30 words per article.
- **Bing Copilot:** fair. IndexNow is set up (`npm run indexnow`). Bingbot renders JavaScript less reliably than Googlebot, so static content would help here too.

## 3. AI crawler access

`robots.txt` has `User-agent: *` / `Allow: /` (only `/admin` and `/dashboard` blocked) and names no bot. Each user-agent below was requested live against `/resume-keywords-guide`. All returned **200**, with no WAF or Vercel bot blocking.

Search and citation crawlers:

| User-agent | Governs | robots.txt | Live fetch |
|---|---|---|---|
| Googlebot | Google Search, AI Overviews, AI Mode | allowed | 200 |
| OAI-SearchBot | ChatGPT Search citations | allowed | 200 |
| Claude-SearchBot | Claude search citations | allowed | 200 |
| PerplexityBot | Perplexity search | allowed | 200 |
| bingbot | Bing / Copilot | allowed | 200 |
| Applebot | Siri / Spotlight / Safari | allowed (wildcard) | not tested |

Training crawlers (this is a licensing choice, not a search-visibility one):

| User-agent | Governs | robots.txt | Live fetch |
|---|---|---|---|
| GPTBot | OpenAI model training | allowed | 200 |
| ClaudeBot | Anthropic model training | allowed | 200 |
| CCBot | Common Crawl | allowed | 200 |
| Google-Extended | Gemini/Vertex training & grounding | allowed (wildcard) | n/a (token, not a crawler) |
| Applebot-Extended | Apple Intelligence training | allowed (wildcard) | n/a (token, not a crawler) |

Nothing needs to change for search visibility. If you want to opt out of training while staying citable, add `Disallow: /` groups for GPTBot, ClaudeBot, CCBot, Google-Extended and Applebot-Extended only.

## 4. llms.txt

Missing (`/llms.txt` returns a real 404). Google says it neither helps nor hurts, and no major AI provider has confirmed using it. It carries no weight in the score. It is optional and very cheap; a template is at the end of this report.

## 5. Brand mentions

Web searches for "CVMind" / "cvmind.in" found **no** third-party mentions: nothing on Wikipedia, Reddit, YouTube, Product Hunt or AlternativeTo. Owned profiles exist (LinkedIn company page, Instagram, the founder's X account) but are not linked from structured data.

For ChatGPT and Perplexity this matters more than anything on the page, because they lean heavily on Wikipedia and Reddit as sources. Expect little AI citation until the brand is mentioned off-site. The ways to earn that are listed in section 8.

## 6. Passage-level citability

Content quality is the strongest asset. Passages that are already self-contained and quotable:

- `pdf-vs-docx-resume`, "The Short Answer": a direct answer under a question-shaped heading. A model example.
- `ats-resume-checklist`, "Quick Reference Table": a table that can be extracted on its own.
- `tell-me-about-yourself`, "The Present–Past–Future Formula": a named method plus worked samples.
- `resume-keywords-guide`, "What Resume Keywords Actually Are": opens with a definition sentence ("Resume keywords are…") followed by a typed list.

Weak spots:

- **Statistics are named but not linked.** The ATS article cites Jobscan (97% of Fortune 500) and "a Harvard Business School study" (88%) with no hyperlink. There are zero outbound source links across all 8 articles.
- **One blurb misquotes its source.** The `how-to-create-an-ats-friendly-resume` blurb says "88% of qualified candidates get filtered out". The HBS/Accenture *Hidden Workers* report says 88% of **employers believe** qualified candidates are screened out. The article body gets it right; the blurb (shown on the blog index and in previews) does not.
- **Several headings are labels, not questions** ("Steps 1–2: Headline and Photo", "Formatting Checks (1–7)"). These are fine for readers but don't match how people phrase questions.

## 7. Server-side rendering check (the main issue)

`seo/prerender.ts` writes one HTML file per page, but the only body content it adds is:

```html
<main><h1>{title}</h1><p>{meta description}</p></main>
```

Measured live: `/resume-keywords-guide` (a 9-minute read) serves **about 30 words** of body text to a non-JS client. The full text exists at build time: `intro`, `sections[].html` and `faqs` in `src/data/articles.ts` are already HTML strings. They just aren't written into the static file.

Exceptions and side issues:

- `how-to-create-an-ats-friendly-resume` has no `sections`. Its content lives in JSX (`src/pages/ArticleAtsResume.tsx`), so it needs moving into `articles.ts` or rendering with `renderToString`.
- Tool landing pages (`/resume-builder`, `/tailor`, `/ai-job-finder`, …) have the same one-sentence body.
- **Duplicate structured data after hydration:** the static file carries a BlogPosting with `author: "CV Mind"`, and `ArticlePage.tsx:36` / `ArticleAtsResume.tsx:55` inject a second one with `author: "CV Mind Team"`. Googlebot sees both.

## 8. Top 5 highest-impact changes

1. **Prerender full article bodies.** In `renderPage`, when the page is an article, emit `<article><h1>` + `intro` + each `<h2>{heading}</h2>{html}` + the FAQ list, instead of the description. React replaces `#root` on load, so users see no change. Then move the ATS article into `articles.ts` so it gets the same treatment. *This alone moves every non-Google AI surface from "can't see the content" to "can cite it".* Do the same, more lightly, for tool landing pages (what the tool does, the steps, the free vs Pro limits).
2. **Give the articles a real author.** Show a "By Manav Tiwari, founder of CVMind" byline and a visible "Updated" date. Use `Person` in the BlogPosting `author`, with `url` set to the About page and `sameAs` set to manavtiwari.in, LinkedIn and X. Remove the client-side duplicate BlogPosting (or make it match).
3. **Link the sources and fix the 88% blurb.** Hyperlink Jobscan and the HBS *Hidden Workers* report where they're cited, and reword the blurb to "88% of employers believe qualified candidates are screened out by their own hiring software."
4. **Earn off-site mentions honestly.** List on Product Hunt and AlternativeTo. Post a short YouTube walkthrough of the ATS checker. Answer resume questions in r/resumes and r/developersIndia as yourself, disclosing that you're the founder. Link the company LinkedIn page from the About page and from `Organization.sameAs`. Don't buy or fake mentions.
5. **Keep articles fresh.** All 8 articles are dated 2026-07-08 and `dateModified` always equals `datePublished`. Add an `updated` field to `ArticleDef`, feed it to `dateModified` and the sitemap's `lastmod`, and review each article on a quarterly schedule. Change the date only when the content actually changes.

## 9. Schema recommendations

- **Add `Organization`** to the home page: `name`, `url`, `logo`, `founder` (Person: Manav Tiwari), `sameAs` (LinkedIn company page, Instagram, X).
- **BlogPosting:** `author` → `Person` (see change 2); `dateModified` from a real updated date; `image` → an article-specific image when one exists.
- **SoftwareApplication** is fine as it stands. Keep it free of ratings until real reviews exist (as the comment in `index.html` already says).
- **FAQPage:** optional. Google limits FAQ rich results to government and health sites, so it won't produce a rich result here. The visible Q&A text matters more than the markup.

## 10. Content reformatting suggestions

| Where | Current | Suggested |
|---|---|---|
| `linkedin-profile-optimization` H2 | "Steps 1–2: Headline and Photo" | "How should I write my LinkedIn headline?" (keep the steps underneath) |
| `ats-resume-checklist` H2 | "Formatting Checks (1–7)" | "Is my resume formatted for ATS? (checks 1–7)" |
| `how-to-create-an-ats-friendly-resume` intro | Opens with a story, so the definition comes in paragraph 2 | Open with a one-sentence answer: "An ATS-friendly resume is a single-column, text-based file that uses standard section headings and the job posting's own keywords, so applicant tracking software can read and rank it." Keep the story after it. |
| `resume-format-for-freshers` | No definition near the top | Add a 2–3 sentence "The short answer" block like the one in `pdf-vs-docx-resume`, giving the section order in one line |
| Every article | FAQs visible only after JS runs | Covered by change 1 |

## Appendix: optional `/llms.txt` template

Put it at `frontend/public/llms.txt`. It is for non-Google systems only.

```
# CV Mind
> Free AI resume builder and ATS resume checker for job seekers, with job tailoring, interview practice and LinkedIn tools. Made in India.

## Tools
- [Resume Builder](https://www.cvmind.in/resume-builder): Build an ATS-friendly resume and download it as PDF or DOC
- [Resume Tailor](https://www.cvmind.in/tailor): Rewrite a resume for a specific job description
- [Interview Prep](https://www.cvmind.in/prep): Mock interview built from your CV and the job
- [AI Job Finder](https://www.cvmind.in/ai-job-finder): Live jobs ranked against your resume
- [Pricing](https://www.cvmind.in/pricing): Free and Pro plans

## Guides
- [How to Create an ATS-Friendly Resume](https://www.cvmind.in/how-to-create-an-ats-friendly-resume)
- [Resume Keywords Guide](https://www.cvmind.in/resume-keywords-guide)
- [ATS Resume Checklist](https://www.cvmind.in/ats-resume-checklist)
- [PDF vs DOCX Resume](https://www.cvmind.in/pdf-vs-docx-resume)
- [Resume Mistakes to Avoid](https://www.cvmind.in/resume-mistakes-to-avoid)
- [Resume Format for Freshers](https://www.cvmind.in/resume-format-for-freshers)
- [Tell Me About Yourself](https://www.cvmind.in/tell-me-about-yourself)
- [LinkedIn Profile Optimization](https://www.cvmind.in/linkedin-profile-optimization)

## About
- [About CV Mind](https://www.cvmind.in/about)
- [Contact](https://www.cvmind.in/contact)
```

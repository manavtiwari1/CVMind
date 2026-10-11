// Central registry for blog articles. Every article renders through ArticlePage, and the build
// writes the same intro, sections and FAQs into each article's static HTML (seo/prerender.ts).

export interface ArticleSection {
  id: string;
  heading: string;
  html: string;
}

export interface ArticleDef {
  slug: string;
  tag: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  date: string;
  isoDate: string;
  /** ISO date of the last real content change; leave out until the article is actually revised */
  updated?: string;
  readTime: string;
  blurb: string;
  /** Quick summary card; when left out, ArticlePage builds one from the first sections */
  summary?: { lead: string; text: string }[];
  intro?: string;
  sections?: ArticleSection[];
  faqs?: { q: string; a: string }[];
  related?: string[];
}

// Byline and structured-data author for every article
export const ARTICLE_AUTHOR = {
  name: 'Manav Tiwari',
  role: 'founder of CV Mind',
  url: 'https://www.cvmind.in/about',
  sameAs: ['https://www.manavtiwari.in', 'https://x.com/ManavAneja13'],
};

export const ARTICLES: ArticleDef[] = [
  {
    slug: 'how-to-create-an-ats-friendly-resume',
    tag: 'Resume Guide',
    title: 'How to Create an ATS-Friendly Resume in 2026 (Step-by-Step Guide)',
    metaTitle: 'How to Create an ATS-Friendly Resume in 2026 (Guide)',
    metaDescription: 'Learn how to create an ATS-friendly resume that gets past screening software. Formatting rules, keyword tips, templates, and a free checker to test yours.',
    keywords: 'ATS Friendly Resume, ATS Resume Format, Resume Keywords, Applicant Tracking System, Resume Formatting Rules, ATS Resume Checker',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    updated: '2026-10-11',
    readTime: '12 min read',
    blurb: '88% of employers say their own hiring software screens out qualified candidates. Here are the formatting rules, keywords and tests that get your resume past it.',
    related: ['resume-keywords-guide', 'ats-resume-checklist', 'pdf-vs-docx-resume'],
    summary: [
      { lead: 'Layout', text: 'Use a single-column layout with standard headings and fonts. Multi-column designs are the most common cause of parsing errors.' },
      { lead: 'Keywords', text: 'Keywords are the biggest factor in how an ATS ranks you. Take them from the job description and use them naturally in your summary, skills and experience.' },
      { lead: 'File format', text: 'Follow the posting first. Otherwise DOCX parses reliably almost everywhere, and a text-based PDF works for most modern systems.' },
      { lead: 'Test first', text: 'Run the copy-paste test and an ATS checker before every application. It takes five minutes.' },
    ],
    intro: `<p><strong>An ATS-friendly resume is a single-column, text-based file that uses standard section headings and the job posting's own keywords, so applicant tracking software can read it correctly and rank it against the job.</strong> The rest of this guide shows how to build one, step by step.</p>
<p>You spent hours perfecting your resume. You hit "Apply" on twenty jobs. Then… silence. No calls, no emails, not even a rejection.</p>
<p>Here's what probably happened: a human never saw your resume. Before any recruiter opens your application, most companies run it through an Applicant Tracking System (ATS) — software that scans, sorts, and ranks resumes before a person gets involved. <a href="https://www.jobscan.co/blog/fortune-500-use-applicant-tracking-systems/" target="_blank" rel="noopener">Jobscan's 2026 count</a> found an ATS behind the careers pages of 97.4% of Fortune 500 companies, and in Harvard Business School's <a href="https://www.hbs.edu/managing-the-future-of-work/research/Pages/hidden-workers-untapped-talent.aspx" target="_blank" rel="noopener"><em>Hidden Workers</em> study</a>, 88% of employers said their systems screen out qualified candidates because their resumes don't match the exact criteria in the job description.</p>
<p>The good news? Beating the ATS isn't about tricks. It's about understanding how the software reads your resume and formatting yours so nothing gets lost in translation. In this guide, you'll learn exactly how to do that, step by step.</p>`,
    sections: [
      {
        id: 'what-is-ats',
        heading: 'What Is an ATS and How Does It Work?',
        html: `<p>An Applicant Tracking System is software that companies use to manage job applications. Popular systems include Workday, Greenhouse, Lever, Taleo, and iCIMS. When you apply for a job online, your resume usually lands in one of these systems first.</p>
<p>Here's what happens next:</p>
<ul>
<li><strong>Parsing.</strong> The ATS converts your resume into plain text and tries to sort the information into fields: name, contact details, work history, education, skills.</li>
<li><strong>Matching.</strong> The system compares your parsed resume against the job description, looking for relevant job titles, skills, and qualifications.</li>
<li><strong>Ranking.</strong> Many systems score or rank candidates. Recruiters often review the highest-matching resumes first — and may never scroll to the bottom of the list.</li>
</ul>
<p>The key insight: <strong>the ATS doesn't see your resume the way you designed it.</strong> It sees raw text. If your beautiful two-column layout confuses the parser, your work experience might end up in the wrong field — or disappear entirely.</p>
<p>And even when your resume passes the software, remember who's next: a recruiter. <a href="https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/" target="_blank" rel="noopener">Ladders' 2018 eye-tracking study</a> found that recruiters spend an average of just 7.4 seconds on their first scan of a resume. Your resume has to work for both audiences — machine first, human second.</p>`,
      },
      {
        id: 'why-rejected',
        heading: 'Why Do Good Candidates Get Rejected by an ATS?',
        html: `<p>Most ATS rejections have nothing to do with your qualifications. They happen because of how the resume is built. The most common causes:</p>
<ul>
<li><strong>Complex formatting.</strong> Tables, text boxes, columns, and graphics can scramble the parsing process.</li>
<li><strong>Missing keywords.</strong> If the job asks for "project management" and your resume only says "led teams," the match score drops.</li>
<li><strong>Non-standard section headings.</strong> The ATS looks for headings like "Work Experience." If you write "My Journey" instead, it may not know what it's reading.</li>
<li><strong>Headers and footers.</strong> Some parsers skip them completely — a problem if your phone number lives there.</li>
<li><strong>Unusual fonts or characters.</strong> Decorative fonts and symbols can turn into gibberish after parsing.</li>
<li><strong>Image-based resumes.</strong> A resume exported as an image or built in Photoshop is often unreadable to an ATS.</li>
</ul>
<p>None of these are skill problems. They're formatting problems — and every one of them is fixable in under an hour.</p>`,
      },
      {
        id: 'formatting',
        heading: 'ATS-Friendly Resume Formatting Rules',
        html: `<h3>Layout</h3>
<ul>
<li>Use a <strong>single-column layout</strong>. Multi-column designs are the #1 cause of parsing errors.</li>
<li>Keep margins between 0.5 and 1 inch.</li>
<li>Left-align your text. Avoid centering body content.</li>
<li>Don't use tables, text boxes, or graphics to organize information.</li>
<li>Skip photos, logos, charts, and skill-rating bars entirely.</li>
</ul>
<h3>Fonts and Text</h3>
<ul>
<li>Stick to standard fonts: Calibri, Arial, Helvetica, Georgia, or Times New Roman.</li>
<li>Use 10–12 pt for body text and 14–16 pt for headings.</li>
<li>Use standard bullet points (round or square). Avoid arrows, stars, or emoji.</li>
<li>Use bold for emphasis, not ALL CAPS or underlining everywhere.</li>
</ul>
<h3>Section Headings</h3>
<p>Use conventional headings the software is trained to recognize:</p>
<div class="art-table-wrap"><table>
<thead><tr><th>Use This</th><th>Not This</th></tr></thead>
<tbody>
<tr><td>Work Experience</td><td>My Professional Journey</td></tr>
<tr><td>Education</td><td>Where I Studied</td></tr>
<tr><td>Skills</td><td>What I Bring to the Table</td></tr>
<tr><td>Certifications</td><td>Badges &amp; Achievements</td></tr>
<tr><td>Professional Summary</td><td>About Me</td></tr>
</tbody>
</table></div>
<h3>Dates and Details</h3>
<ul>
<li>Format dates consistently: "Jan 2023 – Present" or "01/2023 – Present."</li>
<li>Always include both month and year. Some systems calculate your experience duration automatically.</li>
<li>Put your contact information in the main body of the document — never only in the header or footer.</li>
</ul>`,
      },
      {
        id: 'keywords',
        heading: 'How Do You Find and Use the Right Keywords?',
        html: `<p>Keywords are the single biggest factor in how an ATS ranks your resume. Here's a simple process that takes about 15 minutes per application.</p>
<h3>Step 1: Mine the Job Description</h3>
<p>Read the posting carefully and highlight:</p>
<ul>
<li><strong>Hard skills</strong> — tools, technologies, methods (e.g., SQL, Google Analytics, Agile)</li>
<li><strong>Job titles</strong> — the exact title of the role and close variants</li>
<li><strong>Qualifications</strong> — certifications, degrees, years of experience</li>
<li><strong>Repeated words</strong> — anything mentioned two or more times is almost certainly weighted</li>
</ul>
<h3>Step 2: Match Naturally</h3>
<p>Work those exact terms into your resume where they're true for you. Two rules:</p>
<ul>
<li><strong>Use the exact phrasing.</strong> If the posting says "customer relationship management," write that — don't rely on the ATS to know "CRM" means the same thing. When in doubt, use both: "customer relationship management (CRM)."</li>
<li><strong>Never keyword-stuff.</strong> Don't paste an invisible block of white-text keywords or list skills you don't have. Modern systems detect stuffing, and recruiters certainly do.</li>
</ul>
<h3>Step 3: Place Keywords Where They Count</h3>
<ul>
<li><strong>Skills section</strong> — for scannability</li>
<li><strong>Work experience bullets</strong> — for context and proof</li>
<li><strong>Professional summary</strong> — for the role title and your top 2–3 skills</li>
</ul>
<div class="art-example">
<p><strong>Example — turning a weak bullet into a keyword-rich one:</strong></p>
<p>❌ <em>"Responsible for social media."</em></p>
<p>✅ <em>"Managed social media marketing across Instagram and LinkedIn, growing engagement 42% in 6 months using content calendars and A/B testing."</em></p>
</div>
<p>The second version contains real keywords, a metric, and an outcome — which works for the algorithm and impresses the human who reads it next. Want this done automatically? <a href="/tailor">CV Mind's Resume Tailorer</a> matches your resume to any job description in seconds. The full method is in our <a href="/resume-keywords-guide">Resume Keywords Guide</a>.</p>`,
      },
      {
        id: 'sections',
        heading: 'How Should Each Resume Section Be Structured?',
        html: `<h3>Contact Information</h3>
<p>Name, phone, email, city, and LinkedIn URL at the top of the document body. Use a professional email address. No need for your full street address.</p>
<h3>Professional Summary (3–4 lines)</h3>
<p>Include your target job title, years of experience, and 2–3 top skills that mirror the job description.</p>
<div class="art-example">
<p><em>"Data Analyst with 3+ years of experience in SQL, Python, and Tableau. Built dashboards that cut reporting time by 60% at a fintech startup. Seeking to bring data-driven decision-making to a product analytics team."</em></p>
</div>
<h3>Work Experience</h3>
<p>For each role: <strong>job title, company, location, dates</strong> — in that order, each on its own line or clearly separated. Under each role, 3–5 bullet points that:</p>
<ul>
<li>Start with a strong action verb (built, launched, reduced, negotiated)</li>
<li>Include at least one number where possible (%, ₹/$, time saved, team size)</li>
<li>Mirror the language of your target job description</li>
</ul>
<h3>Skills</h3>
<p>A clean, simple list — comma-separated or plain bullets. Group by category if you have many. No rating bars or star graphics; the ATS can't read them, and recruiters don't trust them.</p>
<h3>Education and Certifications</h3>
<p>Degree, institution, and year. Spell out and abbreviate: "Bachelor of Technology (B.Tech), Computer Science." List certifications with their full official names.</p>`,
      },
      {
        id: 'comparison',
        heading: 'ATS-Friendly vs. ATS-Unfriendly: A Quick Comparison',
        html: `<div class="art-table-wrap"><table>
<thead><tr><th>Element</th><th>ATS-Friendly ✅</th><th>ATS-Unfriendly ❌</th></tr></thead>
<tbody>
<tr><td>Layout</td><td>Single column</td><td>Two/three columns, sidebars</td></tr>
<tr><td>Fonts</td><td>Calibri, Arial, Georgia</td><td>Script or decorative fonts</td></tr>
<tr><td>Headings</td><td>"Work Experience," "Skills"</td><td>Creative or clever headings</td></tr>
<tr><td>Visuals</td><td>None</td><td>Photos, icons, charts, skill bars</td></tr>
<tr><td>Keywords</td><td>Mirrored from job description</td><td>Generic buzzwords only</td></tr>
<tr><td>Contact info</td><td>In document body</td><td>Only in header/footer</td></tr>
<tr><td>File type</td><td>DOCX or text-based PDF</td><td>Image-based PDF, PNG, Canva export</td></tr>
<tr><td>Dates</td><td>"Jan 2023 – Present"</td><td>"2023–now," missing months</td></tr>
</tbody>
</table></div>`,
      },
      {
        id: 'file-format',
        heading: 'PDF or DOCX: Which File Format Should You Use?',
        html: `<p>The short answer: <strong>follow the job posting's instructions first.</strong> If it asks for a specific format, use that.</p>
<p>If there's no instruction:</p>
<ul>
<li><strong>DOCX</strong> is the safest bet for older systems (like some Taleo versions) and parses reliably almost everywhere.</li>
<li><strong>Text-based PDF</strong> is fine for most modern systems and preserves your formatting exactly. The test: if you can select and copy the text in your PDF, it's text-based. If you can't, it's an image — and an ATS can't read it either.</li>
</ul>
<p>Avoid: Pages files, Google Docs share links, JPG/PNG exports, and resumes designed in graphic tools that export flattened images. More detail in <a href="/pdf-vs-docx-resume">PDF vs DOCX</a>.</p>`,
      },
      {
        id: 'test',
        heading: 'How Do You Test Your Resume Before Applying?',
        html: `<p>Don't guess — test. Three quick checks:</p>
<ol>
<li><strong>The copy-paste test.</strong> Copy your entire resume and paste it into a plain text editor (Notepad). If sections vanish, reorder, or turn into symbols, an ATS will likely have the same problems.</li>
<li><strong>The 10-second human test.</strong> Hand it to a friend for 10 seconds. Can they tell you your target role, current job, and top skill? If not, tighten your summary and headings.</li>
<li><strong>Run it through an ATS checker.</strong> An automated scan catches what your eyes miss — parsing errors, missing keywords, weak sections, and formatting risks. <a href="/">CV Mind's free ATS Resume Checker</a> scores your resume in seconds and shows exactly what to fix.</li>
</ol>
<p>Doing this before every application takes five minutes and can be the difference between the "reviewed" pile and the void.</p>`,
      },
      {
        id: 'myths',
        heading: 'Common Myths About ATS',
        html: `<p><strong>Myth 1: "The ATS auto-rejects most resumes."</strong><br />Mostly false. In most companies, the ATS ranks and filters — humans still make the reject decision. But a low-ranked resume may simply never be opened, which feels identical to rejection.</p>
<p><strong>Myth 2: "One perfect resume works for every job."</strong><br />No. Matching is per-job. Tailoring your resume to each posting — even 10 minutes of keyword adjustment — measurably improves your match score.</p>
<p><strong>Myth 3: "Tricks like white-text keywords beat the system."</strong><br />Dangerous. Parsers convert everything to plain text, so hidden keywords become visible to recruiters — and instantly destroy your credibility.</p>
<p><strong>Myth 4: "Creative resumes show personality, so they're worth the risk."</strong><br />For design roles, a portfolio is the place for creativity. Your resume's job is to be read — by software and by a tired recruiter on their 80th application of the day. Clear beats clever.</p>`,
      },
      {
        id: 'conclusion',
        heading: 'Conclusion',
        html: `<p>An ATS isn't your enemy — it's a filter, and filters have rules. Once you know them, they're easy to follow: keep the layout simple, use standard headings, mirror the job description's language honestly, save in the right format, and test before you apply.</p>
<p>Your skills deserve to be seen by a human. Don't let formatting be the reason they aren't.</p>`,
      },
    ],
    faqs: [
      { q: 'What does ATS-friendly resume mean?', a: 'It means a resume formatted so Applicant Tracking Systems can accurately read and categorize it — single-column layout, standard headings and fonts, no graphics, and keywords that match the job description.' },
      { q: 'How do I know if my resume is ATS-friendly?', a: 'Run the copy-paste test (paste it into Notepad and check nothing breaks), then scan it with a free tool like CV Mind\'s ATS Resume Checker to get a score and a list of specific fixes.' },
      { q: 'Do all companies use an ATS?', a: 'Not all, but most medium and large employers do — Jobscan\'s 2026 count found one at 97.4% of Fortune 500 companies. Even many startups use lightweight systems like Lever or Greenhouse. Assume your resume will be parsed.' },
      { q: 'Should freshers worry about ATS too?', a: 'Yes — arguably more. Entry-level postings attract hundreds of applicants, so ranking matters most there. Freshers should emphasize skills, projects, and internships using the same keyword-matching approach.' },
      { q: 'Can I use a resume template from Canva or Photoshop?', a: 'Usually not for online applications. Design-tool exports are often image-based or use layered layouts that parsers can\'t read. Use them for printed copies or portfolio sites; apply online with a text-based resume.' },
      { q: 'How many keywords should my resume have?', a: 'There\'s no magic number. Cover the essential skills and qualifications mentioned in the job description — typically 10–20 relevant terms used naturally across your summary, skills, and experience bullets.' },
      { q: 'Does an ATS reject resumes over one page?', a: 'No. Length is not a rejection factor for software. One page is convention for freshers and early-career candidates; two pages is normal for 8+ years of experience.' },
      { q: 'Are two-column resumes always rejected?', a: 'Not always — modern parsers handle them better than older ones. But you can\'t know which system a company runs, so single-column remains the safe choice when a job matters to you.' },
      { q: 'Do ATS systems read cover letters?', a: 'Some parse and index them for keywords; many simply store them for recruiters. Write your cover letter for humans, but include your key skills naturally in case it\'s scanned.' },
      { q: 'How often should I update my resume for ATS?', a: 'Tailor it for every application — at minimum, adjust your summary and skills to mirror each job description. A master resume plus 10 minutes of per-job tailoring is the most efficient workflow.' },
    ],
  },
  {
    slug: 'resume-keywords-guide',
    tag: 'Resume Guide',
    title: 'Resume Keywords: The Complete Guide to Getting Shortlisted in 2026',
    metaTitle: 'Resume Keywords Guide: Get Shortlisted in 2026',
    metaDescription: 'Learn how to find, choose, and place resume keywords that ATS software and recruiters actually search for — with examples by industry and role.',
    keywords: 'Resume Keywords, ATS Keywords, Resume Skills Keywords, Keyword Optimization Resume, Job Description Keywords',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    readTime: '9 min read',
    blurb: 'How to find the exact words recruiters and ATS software search for — and where to place them so your resume ranks higher for every job you apply to.',
    related: ['how-to-create-an-ats-friendly-resume', 'ats-resume-checklist', 'resume-mistakes-to-avoid'],
    intro: `<p>Two candidates apply for the same data analyst role. Both know SQL, both have three years of experience, both built dashboards. One gets shortlisted; the other never hears back.</p>
<p>The difference is often a handful of words. Applicant Tracking Systems rank resumes by how closely they match the job description — and recruiters run keyword searches inside those systems too. If the posting says "data visualization" and your resume says "made charts," the software scores you lower, and the recruiter's search never surfaces you at all.</p>
<p>This guide shows you how to find the right keywords for any job, where to place them, and the mistakes that make keyword optimization backfire.</p>`,
    sections: [
      {
        id: 'what-are-keywords',
        heading: 'What Resume Keywords Actually Are',
        html: `<p>Resume keywords are the specific terms an employer uses to describe the skills, tools, qualifications, and experience they want. They come in four types:</p>
<ul>
<li><strong>Hard skills and tools</strong> — SQL, Figma, AutoCAD, Google Ads, Python, Salesforce</li>
<li><strong>Job titles and functions</strong> — Product Manager, Financial Analyst, DevOps Engineer</li>
<li><strong>Qualifications</strong> — B.Tech, CPA, PMP, AWS Certified, MBA</li>
<li><strong>Methods and domain terms</strong> — Agile, A/B testing, cold outreach, GAAP, supply chain</li>
</ul>
<p>Soft skills ("team player," "hard-working") are rarely useful as keywords. Recruiters don't search for them, and every resume claims them. Show soft skills through results instead: "led a 6-person team" beats "leadership skills."</p>`,
      },
      {
        id: 'find-keywords',
        heading: 'How to Find the Right Keywords for Any Job',
        html: `<h3>1. Mine the job description</h3>
<p>Paste the posting into a document and highlight every skill, tool, title, and qualification. Pay special attention to:</p>
<ul>
<li>Anything mentioned <strong>two or more times</strong></li>
<li>Everything in the <strong>"Requirements"</strong> or <strong>"Must have"</strong> section</li>
<li>The <strong>exact job title</strong> — it's usually the heaviest-weighted keyword of all</li>
</ul>
<h3>2. Compare 3–5 similar postings</h3>
<p>Open a few postings for the same role at different companies. The keywords that appear in all of them are the core vocabulary of that role — those belong in your master resume permanently.</p>
<h3>3. Check LinkedIn profiles in that role</h3>
<p>Look at the Skills sections of people who already hold the job you want. Recurring terms there tend to match what recruiters search.</p>
<div class="art-example">
<p><strong>Example — keywords extracted from a real-style posting for "Digital Marketing Executive":</strong></p>
<p>SEO, Google Analytics, Google Ads, content marketing, email campaigns, social media marketing, keyword research, CTR, conversion rate optimization, HubSpot</p>
</div>`,
      },
      {
        id: 'placement',
        heading: 'Where to Place Keywords (Placement Matters)',
        html: `<p>An ATS gives different weight to different parts of your resume. Use all three zones:</p>
<div class="art-table-wrap"><table>
<thead><tr><th>Location</th><th>What to put there</th><th>Why it matters</th></tr></thead>
<tbody>
<tr><td>Professional Summary</td><td>Target job title + top 3 skills</td><td>Parsed first; recruiters read it in the preview</td></tr>
<tr><td>Skills section</td><td>All relevant hard skills and tools</td><td>Easiest section for exact-match searches</td></tr>
<tr><td>Experience bullets</td><td>Keywords in context with results</td><td>Proves you actually used the skill</td></tr>
</tbody>
</table></div>
<p>A keyword that appears only in your skills list is weak — the system (and the recruiter) can't tell whether you used it for five years or added it yesterday. Back every important keyword with at least one experience bullet.</p>
<div class="art-example">
<p>❌ <em>Skills: Python</em> (and Python appears nowhere else)</p>
<p>✅ <em>Skills: Python</em> + bullet: <em>"Automated weekly reporting with Python scripts, saving the team 6 hours per week."</em></p>
</div>`,
      },
      {
        id: 'exact-phrasing',
        heading: 'Use Exact Phrasing — Including Both Versions',
        html: `<p>Many ATS configurations match literally. If the posting says "Search Engine Optimization" and your resume only says "SEO," you may not get credit. The fix is simple: <strong>use both forms once</strong> — "Search Engine Optimization (SEO)."</p>
<p>Common pairs worth writing out:</p>
<ul>
<li>Customer Relationship Management (CRM)</li>
<li>Applicant Tracking System (ATS)</li>
<li>Profit &amp; Loss (P&amp;L)</li>
<li>Bachelor of Technology (B.Tech)</li>
<li>User Experience (UX) / User Interface (UI)</li>
</ul>
<p>Also match tense and form where natural: if the posting emphasizes "project management," prefer that phrase over "managed projects" at least once.</p>`,
      },
      {
        id: 'mistakes',
        heading: '4 Keyword Mistakes That Backfire',
        html: `<ul>
<li><strong>Keyword stuffing.</strong> Cramming terms unnaturally ("Excel Excel dashboards Excel reporting") reads as spam to recruiters and increasingly gets flagged by the software itself.</li>
<li><strong>White-text keywords.</strong> Hiding keywords in invisible text is the oldest trick in the book — and parsing converts everything to plain text, so recruiters see your hidden block instantly. It's an automatic credibility killer.</li>
<li><strong>Listing skills you don't have.</strong> You might pass the scan, but the first interview question exposes it. Only optimize for what's true.</li>
<li><strong>One generic resume for every job.</strong> Keyword matching is per-posting. A master resume plus 10 minutes of tailoring per application beats a "perfect" static resume every time. <a href="/tailor">CV Mind's Resume Tailorer</a> does this automatically — paste the job description and it matches the keywords for you.</li>
</ul>`,
      },
      {
        id: 'examples',
        heading: 'Keyword Examples by Role',
        html: `<div class="art-table-wrap"><table>
<thead><tr><th>Role</th><th>Keywords recruiters commonly search</th></tr></thead>
<tbody>
<tr><td>Software Engineer</td><td>Java, Python, React, REST APIs, microservices, Git, CI/CD, AWS, system design, unit testing</td></tr>
<tr><td>Data Analyst</td><td>SQL, Excel, Tableau, Power BI, Python, data visualization, dashboards, A/B testing, statistics</td></tr>
<tr><td>Digital Marketer</td><td>SEO, SEM, Google Analytics, Google Ads, content marketing, email marketing, CRO, social media</td></tr>
<tr><td>HR / Recruiter</td><td>talent acquisition, sourcing, ATS, onboarding, HRIS, employee engagement, stakeholder management</td></tr>
<tr><td>Financial Analyst</td><td>financial modeling, forecasting, variance analysis, Excel, P&amp;L, budgeting, SAP, valuation</td></tr>
<tr><td>Product Manager</td><td>product roadmap, user research, Agile, Scrum, stakeholder management, KPIs, go-to-market, SQL</td></tr>
</tbody>
</table></div>
<p>Treat these as starting points — the posting in front of you always wins.</p>`,
      },
      {
        id: 'test',
        heading: 'How to Check Your Keyword Match Before Applying',
        html: `<p>Don't eyeball it. Run your resume and the job description through <a href="/">CV Mind's free ATS Resume Checker</a> — it shows your match score, lists the keywords you're missing, and flags where to add them. Five minutes per application, and you apply knowing your rank instead of guessing.</p>`,
      },
    ],
    faqs: [
      { q: 'How many keywords should a resume have?', a: 'Enough to cover the essential requirements of the posting — typically 10–20 relevant terms woven naturally through your summary, skills section, and experience bullets. Coverage matters more than repetition.' },
      { q: 'Should I copy the job description into my resume?', a: 'No. Copying sentences wholesale is obvious to recruiters and can flag as spam. Extract the key terms and use them in your own sentences, attached to your real accomplishments.' },
      { q: 'Do keywords need to match exactly?', a: 'Often, yes — many systems match literally. Use the exact phrasing from the posting, and include both the full form and abbreviation of important terms, like "Search Engine Optimization (SEO)."' },
      { q: 'Are soft skills good resume keywords?', a: 'Rarely. Recruiters seldom search for "hard-working" or "team player." Demonstrate soft skills through results and metrics in your bullets instead of listing them as keywords.' },
      { q: 'Should keywords go in my cover letter too?', a: 'Yes, naturally. Some systems index cover letters for search, and it reinforces your fit for recruiters who read them. Never stuff — a cover letter is judged on writing quality.' },
      { q: 'How do I find keywords if the job description is vague?', a: 'Look up 3–5 similar postings for the same title at other companies and use the terms they share. LinkedIn profiles of people in that role are another reliable source.' },
    ],
  },
  {
    slug: 'ats-resume-checklist',
    tag: 'Checklist',
    title: 'The 21-Point ATS Resume Checklist (Use Before Every Application)',
    metaTitle: '21-Point ATS Resume Checklist for 2026 (Free)',
    metaDescription: 'A free 21-point checklist to make your resume ATS-proof before you apply — formatting, keywords, content, and file checks with a scoring tool to verify.',
    keywords: 'ATS Resume Checklist, Resume Checklist Before Applying, ATS Check, Resume Formatting Checklist, Job Application Checklist',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    readTime: '7 min read',
    blurb: 'The exact 21 checks to run on your resume before you hit Apply — formatting, content, keywords, and file format, each one takes under a minute.',
    related: ['how-to-create-an-ats-friendly-resume', 'resume-keywords-guide', 'pdf-vs-docx-resume'],
    intro: `<p>Most resume rejections aren't about qualifications — they're about avoidable mechanical errors: a table the software can't parse, a missing keyword, contact details hidden in a header.</p>
<p>Pilots don't fly without a pre-flight checklist, and you shouldn't apply without one either. Run these 21 checks before every application. None takes more than a minute, and together they cover everything an Applicant Tracking System and a skim-reading recruiter will judge you on.</p>`,
    sections: [
      {
        id: 'formatting',
        heading: 'Is Your Resume Formatted for ATS? (Checks 1–7)',
        html: `<ol>
<li><strong>Single-column layout.</strong> No sidebars, no two-column designs — the #1 cause of parsing failures.</li>
<li><strong>No tables, text boxes, or graphics.</strong> Including skill bars, charts, photos, and icons.</li>
<li><strong>Standard font.</strong> Calibri, Arial, Helvetica, Georgia, or Times New Roman, 10–12pt body.</li>
<li><strong>Standard section headings.</strong> "Work Experience," "Education," "Skills" — nothing creative.</li>
<li><strong>Contact info in the document body.</strong> Never only in the header or footer; some parsers skip them entirely.</li>
<li><strong>Consistent dates with month and year.</strong> "Jan 2023 – Present" everywhere, same format.</li>
<li><strong>Standard bullets.</strong> Round or square points only — arrows, stars, and emoji can parse as junk characters.</li>
</ol>`,
      },
      {
        id: 'content',
        heading: 'Does Your Content Hold Up? (Checks 8–14)',
        html: `<ol start="8">
<li><strong>Professional summary states your target title.</strong> The job title is usually the heaviest-weighted keyword.</li>
<li><strong>Every experience bullet starts with an action verb.</strong> Built, launched, reduced, negotiated — not "responsible for."</li>
<li><strong>At least half your bullets contain a number.</strong> Percentages, money, time saved, team size, users.</li>
<li><strong>No first-person pronouns.</strong> Drop "I," "my," and "we" — resume convention, and it saves space.</li>
<li><strong>Zero typos.</strong> A single spelling error can end your candidacy; recruiters treat it as a proxy for carelessness. <a href="/proofreading">CV Mind's AI Proofreading</a> catches grammar, tone, and weak verbs in one pass.</li>
<li><strong>Right length.</strong> One page for under ~8 years of experience, two pages maximum otherwise.</li>
<li><strong>No unexplained gaps or overlaps.</strong> Check that your dates tell a coherent story.</li>
</ol>`,
      },
      {
        id: 'keywords',
        heading: 'Does Your Resume Use the Posting\'s Keywords? (Checks 15–18)',
        html: `<ol start="15">
<li><strong>Job title from the posting appears in your resume.</strong> In the summary, ideally.</li>
<li><strong>Top 5 required skills from the posting appear</strong> — in the exact phrasing the employer used.</li>
<li><strong>Abbreviations written both ways.</strong> "Customer Relationship Management (CRM)," "B.Tech (Bachelor of Technology)."</li>
<li><strong>Every key skill is backed by an experience bullet.</strong> A skill that only lives in your skills list is a weak claim.</li>
</ol>
<p>Full keyword strategy in our <a href="/resume-keywords-guide">Resume Keywords Guide</a>.</p>`,
      },
      {
        id: 'final',
        heading: 'Final Checks (19–21)',
        html: `<ol start="19">
<li><strong>Copy-paste test.</strong> Paste your resume into Notepad. If sections vanish or reorder, an ATS will have the same problem.</li>
<li><strong>Correct file format.</strong> DOCX or text-based PDF (if you can select the text, it's text-based). Details in <a href="/pdf-vs-docx-resume">PDF vs DOCX</a>.</li>
<li><strong>Run an ATS scan.</strong> <a href="/">CV Mind's free ATS Resume Checker</a> scores your resume and lists exactly what's missing for the job you're targeting — the fastest way to verify checks 1–20 in one shot.</li>
</ol>`,
      },
      {
        id: 'printable',
        heading: 'Quick Reference Table',
        html: `<div class="art-table-wrap"><table>
<thead><tr><th>Category</th><th>Checks</th><th>Time needed</th></tr></thead>
<tbody>
<tr><td>Formatting</td><td>1–7</td><td>~5 minutes</td></tr>
<tr><td>Content</td><td>8–14</td><td>~10 minutes</td></tr>
<tr><td>Keywords</td><td>15–18</td><td>~10 minutes per job</td></tr>
<tr><td>Final verification</td><td>19–21</td><td>~5 minutes</td></tr>
</tbody>
</table></div>
<p>First pass takes about 30 minutes. After that, only the keyword checks (15–18) change per application — 10 minutes per job for a measurably higher shortlist rate.</p>`,
      },
    ],
    faqs: [
      { q: 'How often should I run this checklist?', a: 'Checks 1–14 once, whenever you update your master resume. Checks 15–21 before every single application, because keyword matching is specific to each job description.' },
      { q: 'What ATS score is good enough to apply?', a: 'On CV Mind\'s checker, 80+ is strong. Between 60–80, add the missing keywords it lists. Below 60, your resume likely has structural issues — fix formatting first, then keywords.' },
      { q: 'Is one page really necessary?', a: 'For freshers and early-career candidates, yes — recruiters expect it. Past roughly 8 years of relevant experience, two pages is normal. Never pad to reach two pages.' },
      { q: 'Do I need a different resume for every job?', a: 'A different version, not a different resume. Keep one master document and adjust the summary and skills per posting — that\'s checks 15–18, about 10 minutes each time.' },
      { q: 'What\'s the single most important check?', a: 'The copy-paste test (#19). It takes 30 seconds and catches the catastrophic failures — if your resume survives Notepad intact, most parsers will read it correctly.' },
    ],
  },
  {
    slug: 'pdf-vs-docx-resume',
    tag: 'Resume Guide',
    title: 'PDF vs DOCX Resume: Which Format Should You Use in 2026?',
    metaTitle: 'PDF vs DOCX Resume: Which Format to Use (2026)',
    metaDescription: 'PDF or Word for your resume? When each format wins, how ATS software handles both, the image-PDF trap, and a simple rule that works for every application.',
    keywords: 'PDF vs DOCX Resume, Resume File Format, Word or PDF Resume, ATS PDF Resume, Resume Format for ATS',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    readTime: '6 min read',
    blurb: 'Word ya PDF? When each format wins, how ATS software actually handles both, and the image-PDF trap that silently kills applications.',
    related: ['how-to-create-an-ats-friendly-resume', 'ats-resume-checklist', 'resume-mistakes-to-avoid'],
    intro: `<p>You've polished every bullet point, and now the upload form asks a deceptively simple question: PDF or Word?</p>
<p>Pick wrong and your carefully formatted resume can arrive as scrambled text — or not be readable at all. The good news: the decision comes down to one rule and a couple of edge cases, all covered below.</p>`,
    sections: [
      {
        id: 'short-answer',
        heading: 'The Short Answer',
        html: `<ol>
<li><strong>If the job posting specifies a format, use that.</strong> This overrides everything else.</li>
<li><strong>If not, a text-based PDF is the best default in 2026.</strong> It preserves your formatting exactly and parses correctly in virtually all modern systems.</li>
<li><strong>Keep a DOCX version ready</strong> for older portals, government applications, and recruiters who ask for an editable copy.</li>
</ol>`,
      },
      {
        id: 'how-ats-reads',
        heading: 'How ATS Software Handles Each Format',
        html: `<p>An Applicant Tracking System converts your file to plain text before matching keywords. The formats differ in how reliably that conversion works:</p>
<div class="art-table-wrap"><table>
<thead><tr><th>Factor</th><th>Text-based PDF</th><th>DOCX</th></tr></thead>
<tbody>
<tr><td>Modern ATS parsing (Greenhouse, Lever, Workday)</td><td>Excellent</td><td>Excellent</td></tr>
<tr><td>Older systems (some Taleo configs, legacy portals)</td><td>Occasionally shaky</td><td>Most reliable</td></tr>
<tr><td>Formatting preserved for the human reader</td><td>Pixel-perfect everywhere</td><td>Can shift between Word versions</td></tr>
<tr><td>Risk of accidental edits</td><td>None</td><td>Possible</td></tr>
<tr><td>Risk of being unreadable</td><td>Only if image-based (see below)</td><td>Very low</td></tr>
</tbody>
</table></div>`,
      },
      {
        id: 'image-trap',
        heading: 'The Image-PDF Trap (This Kills Applications Silently)',
        html: `<p>Not all PDFs are equal. A PDF exported from Word or Google Docs contains real text. A PDF exported from Canva, Photoshop, or a phone scanner is often just a <strong>picture of text</strong> — and an ATS reads it as an empty page.</p>
<div class="art-example">
<p><strong>The 10-second test:</strong> open your PDF and try to select a sentence with your cursor.</p>
<p>✅ Text highlights line by line → text-based, safe to upload.</p>
<p>❌ The whole page selects as one block, or nothing selects → it's an image. The ATS sees nothing.</p>
</div>
<p>If your resume fails the test, rebuild it in a text editor or use <a href="/resume-builder">CV Mind's Resume Builder</a> — every export is text-based and ATS-tested by design.</p>`,
      },
      {
        id: 'when-docx',
        heading: 'When DOCX Is the Better Choice',
        html: `<ul>
<li><strong>The posting asks for Word.</strong> Common with staffing agencies, who edit resumes before forwarding to clients.</li>
<li><strong>Older application portals.</strong> If the site looks dated or is a legacy government system, DOCX parses most reliably.</li>
<li><strong>Recruiter asks for an editable copy.</strong> Send DOCX; they often need to remove contact details or add a cover sheet.</li>
</ul>
<p>One caution with DOCX: fonts and spacing can shift on a machine with different Word versions. Stick to standard fonts (Calibri, Arial, Georgia) and your layout survives the trip.</p>`,
      },
      {
        id: 'never-use',
        heading: 'Formats to Never Use',
        html: `<ul>
<li><strong>JPG / PNG images</strong> — unreadable to every ATS.</li>
<li><strong>Apple Pages files (.pages)</strong> — most Windows-based HR teams can't open them.</li>
<li><strong>Google Docs share links</strong> — links aren't parsed, may require permissions, and can be edited after you apply.</li>
<li><strong>Old .doc format</strong> — works, but signals outdated software; use .docx.</li>
<li><strong>Canva/design-tool exports</strong> — usually flattened images (see the trap above), and multi-column layouts parse badly even when text-based.</li>
</ul>`,
      },
      {
        id: 'workflow',
        heading: 'The Practical Workflow',
        html: `<ol>
<li>Maintain your master resume in a text-based editor.</li>
<li>Export <strong>both</strong> a PDF and a DOCX every time you update it.</li>
<li>Name them professionally: <em>Priya_Sharma_Resume.pdf</em> — not <em>resume_final_v7_REAL.pdf</em>. Your file name is visible to the recruiter and often becomes the display title in the ATS.</li>
<li>Upload PDF by default; switch to DOCX when asked or when the portal looks legacy.</li>
<li>Before big applications, verify with a <a href="/">free ATS scan</a> that the file parses cleanly.</li>
</ol>`,
      },
    ],
    faqs: [
      { q: 'Is PDF or Word better for ATS in 2026?', a: 'Both parse well in modern systems. Text-based PDF is the best default because formatting never shifts; keep a DOCX ready for older portals and agency recruiters who need an editable copy.' },
      { q: 'How do I know if my PDF is text-based?', a: 'Try selecting a sentence with your cursor. If text highlights line by line, it\'s text-based. If nothing selects or the page selects as one block, it\'s an image and ATS software can\'t read it.' },
      { q: 'Does file size matter?', a: 'Keep it under 2 MB. Most portals cap uploads, and a text-based resume should naturally be small — a 10 MB resume is a sign it contains images.' },
      { q: 'What should I name my resume file?', a: 'FirstName_LastName_Resume.pdf. Recruiters see the file name, and in many systems it becomes your application\'s display title. Avoid version numbers and words like "final" or "new."' },
      { q: 'Can I send a Google Docs link instead of a file?', a: 'No — upload an actual file. Links aren\'t parsed by ATS software, may have permission issues, and editable links look unprofessional in a formal application.' },
      { q: 'Do fonts matter in a DOCX resume?', a: 'Yes. Non-standard fonts get substituted on machines that lack them, breaking your layout. Stick to Calibri, Arial, Georgia, or Times New Roman and the document renders the same everywhere.' },
    ],
  },
  {
    slug: 'resume-mistakes-to-avoid',
    tag: 'Resume Guide',
    title: '15 Resume Mistakes That Cost You Interviews (and How to Fix Each One)',
    metaTitle: '15 Resume Mistakes to Avoid in 2026 (With Fixes)',
    metaDescription: 'The 15 most common resume mistakes recruiters and ATS software punish — from weak bullets to formatting traps — with a concrete fix for each one.',
    keywords: 'Resume Mistakes, Resume Mistakes to Avoid, Common Resume Errors, Resume Tips, Why Resume Rejected',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    readTime: '10 min read',
    blurb: 'Recruiters spend 7 seconds on the first scan. These 15 mistakes are what make them stop reading — and each one has a fix you can apply today.',
    related: ['how-to-create-an-ats-friendly-resume', 'resume-keywords-guide', 'ats-resume-checklist'],
    intro: `<p>Eye-tracking research by Ladders found that recruiters spend an average of 7.4 seconds on their first pass over a resume. In those seconds, they're not reading — they're scanning for reasons to keep going or stop.</p>
<p>Most rejections trace back to a short list of repeat offenders. Here are the 15 mistakes we see most often in resumes scanned by CV Mind, grouped by type, each with a fix you can apply in minutes.</p>`,
    sections: [
      {
        id: 'formatting-mistakes',
        heading: 'Formatting Mistakes (1–5)',
        html: `<h3>1. Fancy templates that ATS software can't read</h3>
<p>Two-column layouts, graphics, and skill bars scramble automated parsing — your experience can land in the wrong field or vanish. <strong>Fix:</strong> single-column layout, standard headings, no visuals. Full rules in our <a href="/how-to-create-an-ats-friendly-resume">ATS-friendly resume guide</a>.</p>
<h3>2. Contact details in the header</h3>
<p>Some parsers skip headers and footers entirely — and with them, your phone number. <strong>Fix:</strong> put name, phone, email, and LinkedIn in the top of the document body.</p>
<h3>3. Wrong length</h3>
<p>Three pages for two years of experience reads as padding; a cramped half-page reads as inexperience. <strong>Fix:</strong> one page under ~8 years of experience, two pages maximum after.</p>
<h3>4. Inconsistent formatting</h3>
<p>Mixed fonts, wandering date formats, uneven bullets — recruiters read it as carelessness. <strong>Fix:</strong> one font, one date format ("Jan 2023 – Present"), one bullet style, everywhere.</p>
<h3>5. Unprofessional file name</h3>
<p><em>resume_final_v3_ACTUAL.pdf</em> is visible to the recruiter and often becomes your application's title. <strong>Fix:</strong> <em>FirstName_LastName_Resume.pdf</em>.</p>`,
      },
      {
        id: 'content-mistakes',
        heading: 'Content Mistakes (6–11)',
        html: `<h3>6. Duties instead of achievements</h3>
<p>"Responsible for social media" describes the job, not you. <strong>Fix:</strong> lead with the result: "Grew Instagram engagement 42% in 6 months through A/B-tested content calendars."</p>
<h3>7. No numbers</h3>
<p>Unquantified claims are unverifiable claims. <strong>Fix:</strong> attach a metric to at least half your bullets — %, revenue, time saved, team size, users served. Estimate honestly when exact figures aren't available.</p>
<h3>8. Weak openers</h3>
<p>"Worked on," "helped with," "was part of" bury your contribution. <strong>Fix:</strong> start every bullet with a strong verb: built, launched, led, reduced, negotiated, automated.</p>
<h3>9. Typos and grammar errors</h3>
<p>The most preventable rejection there is — many recruiters stop at the first typo. <strong>Fix:</strong> run <a href="/proofreading">AI proofreading</a>, then read it aloud once. Your ears catch what your eyes skip.</p>
<h3>10. An objective statement from 2005</h3>
<p>"Seeking a challenging position in a growth-oriented company…" says nothing. <strong>Fix:</strong> replace it with a 3-line professional summary: target title, years of experience, top skills, one headline achievement.</p>
<h3>11. Irrelevant filler</h3>
<p>Hobbies with no job relevance, every certificate you've ever earned, "references available upon request." <strong>Fix:</strong> every line must earn its place for <em>this</em> job. Cut the rest.</p>`,
      },
      {
        id: 'strategy-mistakes',
        heading: 'Strategy Mistakes (12–15)',
        html: `<h3>12. One resume for every application</h3>
<p>ATS matching is per-job — a generic resume scores mediocre everywhere. <strong>Fix:</strong> keep a master resume, then spend 10 minutes per application matching the summary and skills to the posting. <a href="/tailor">CV Mind's Tailorer</a> automates exactly this.</p>
<h3>13. Ignoring keywords</h3>
<p>If the posting says "project management" and you wrote "led teams," the software scores you lower and recruiter searches miss you. <strong>Fix:</strong> mirror the posting's exact phrasing for skills that are true for you — full method in the <a href="/resume-keywords-guide">keywords guide</a>.</p>
<h3>14. Unexplained gaps</h3>
<p>A silent 18-month hole invites the worst assumption. <strong>Fix:</strong> one honest line covers it — career break, upskilling, caregiving, freelancing. Add what you learned or built during it if you can.</p>
<h3>15. Never testing before applying</h3>
<p>Most candidates apply blind and never learn why they weren't shortlisted. <strong>Fix:</strong> scan your resume with a <a href="/">free ATS checker</a> before applying — see your score, missing keywords, and formatting risks while there's still time to fix them.</p>`,
      },
      {
        id: 'priority',
        heading: 'Which Mistakes to Fix First',
        html: `<div class="art-table-wrap"><table>
<thead><tr><th>Priority</th><th>Mistakes</th><th>Why</th></tr></thead>
<tbody>
<tr><td>🔴 Fix today</td><td>#1, #2, #9, #15</td><td>These get you rejected before content is even read</td></tr>
<tr><td>🟠 Fix this week</td><td>#6, #7, #8, #13</td><td>These decide whether the recruiter keeps reading</td></tr>
<tr><td>🟡 Fix per application</td><td>#12, #11</td><td>Tailoring — repeat for every job you apply to</td></tr>
</tbody>
</table></div>`,
      },
    ],
    faqs: [
      { q: 'What is the most common resume mistake?', a: 'Listing duties instead of achievements. "Responsible for X" tells recruiters what the job was supposed to be — results with numbers tell them how well you actually did it.' },
      { q: 'Can one typo really get my resume rejected?', a: 'Yes. Surveys of hiring managers consistently show a majority will reject over typos, treating them as a proxy for attention to detail — especially unfair, and especially common, so proofread twice.' },
      { q: 'Should I explain a career gap on my resume?', a: 'Yes, briefly. One line — "Career break for family care / upskilling in X" — beats a silent gap, which invites worse assumptions. Detail belongs in the interview, not the resume.' },
      { q: 'Is it a mistake to use the same resume for every job?', a: 'For anything competitive, yes. ATS ranking is per-posting, so a generic resume scores mediocre everywhere. Ten minutes of keyword tailoring per application measurably improves shortlist rates.' },
      { q: 'How do I know which mistakes my resume has?', a: 'Scan it with CV Mind\'s free ATS Resume Checker — it flags formatting risks, weak bullets, missing keywords, and scores the result, so you fix real problems instead of guessing.' },
    ],
  },
  {
    slug: 'resume-format-for-freshers',
    tag: 'Freshers',
    title: 'Resume Format for Freshers: What to Write When You Have No Experience',
    metaTitle: 'Resume Format for Freshers (2026): No-Experience Guide',
    metaDescription: 'The exact resume format for freshers in 2026 — section order, what replaces work experience, project examples, and mistakes that cost campus placements.',
    keywords: 'Resume Format for Freshers, Fresher Resume, Resume Without Experience, First Job Resume, Campus Placement Resume, B.Tech Fresher Resume',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    updated: '2026-10-11',
    readTime: '9 min read',
    blurb: 'No work experience? No problem. The exact section order, project descriptions, and one-page format that gets freshers shortlisted — with real examples.',
    related: ['how-to-create-an-ats-friendly-resume', 'tell-me-about-yourself', 'resume-mistakes-to-avoid'],
    intro: `<p>Every fresher faces the same paradox: jobs want experience, and experience needs a job. So what do you put on a resume when the "Work Experience" section is empty?</p>
<p>Plenty, actually. Recruiters screening freshers aren't looking for job history — they're looking for evidence you can learn, build, and finish things. Projects, internships, coursework, and campus roles all count, if you present them right.</p>
<p>This guide gives you the exact format that works for entry-level applications and campus placements, section by section, with examples you can adapt today.</p>`,
    sections: [
      {
        id: 'short-answer',
        heading: 'The Short Answer',
        html: `<p><strong>A fresher resume should fit on one page, in this order: header, professional summary, skills, projects, internships and training, education, then achievements.</strong> Projects take the place of work experience: write each one like a job, with the tools you used, the dates, and two or three results with numbers. Put the job posting's keywords in your summary and skills.</p>
<p>The sections below explain each part, with examples you can adapt.</p>`,
      },
      {
        id: 'structure',
        heading: 'What Is the Right Section Order for a Fresher Resume?',
        html: `<p>Order matters: put your strongest evidence first. For most freshers, that's <strong>not</strong> education — it's projects and skills.</p>
<ol>
<li><strong>Header</strong> — name, phone, email, LinkedIn, GitHub/portfolio (if technical)</li>
<li><strong>Professional Summary</strong> — 3 lines: who you are, your strongest skills, what you're targeting</li>
<li><strong>Skills</strong> — the keywords recruiters and ATS software search for</li>
<li><strong>Projects</strong> — your substitute for work experience</li>
<li><strong>Internships &amp; Training</strong> — even short ones</li>
<li><strong>Education</strong> — degree, college, year, CGPA (if 7.5+)</li>
<li><strong>Achievements &amp; Positions of Responsibility</strong> — optional, one section, only if relevant</li>
</ol>
<p>Keep it to <strong>one page</strong>. Recruiters expect it from freshers, and anything longer signals padding.</p>`,
      },
      {
        id: 'summary',
        heading: 'How Do You Write a Summary With No Experience?',
        html: `<p>Skip the outdated "objective" ("Seeking a challenging role in a reputed organization…"). Write a summary that leads with what you <em>can do</em>:</p>
<div class="art-example">
<p>✅ <em>"Final-year B.Tech (Computer Science) student with strong foundations in Java, React, and SQL. Built 3 full-stack projects including a placement-portal app used by 400+ students. Seeking a Software Engineer role where I can ship production code from day one."</em></p>
</div>
<p>The formula: <strong>degree + top skills + best proof + target role.</strong> Mirror the job posting's exact keywords here — the summary is the heaviest-weighted section for ATS matching. More on that in our <a href="/resume-keywords-guide">Resume Keywords Guide</a>.</p>`,
      },
      {
        id: 'projects',
        heading: 'Projects: Your Work Experience Substitute',
        html: `<p>This is the section that decides fresher shortlists. Write each project like a job — title, tech/tools, dates, and 2–3 result-focused bullets:</p>
<div class="art-example">
<p><strong>Placement Portal Web App</strong> — React, Node.js, MongoDB · Jan–Apr 2026</p>
<ul>
<li>Built a job-listing portal adopted by the college placement cell, serving 400+ students.</li>
<li>Implemented resume upload with automated skill extraction, reducing manual data entry by 80%.</li>
</ul>
</div>
<p>Rules that separate strong project sections from weak ones:</p>
<ul>
<li><strong>Numbers wherever honest</strong> — users, data size, accuracy, time saved, marks/rank.</li>
<li><strong>Outcomes over descriptions</strong> — "built X that did Y" beats "worked on X."</li>
<li><strong>2–4 projects maximum</strong>, your best ones, most relevant first.</li>
<li><strong>Link the code or demo</strong> — a GitHub link turns a claim into proof.</li>
</ul>
<p>No projects yet? Build one two-week project aimed at the role you want — it's the highest-ROI move a fresher can make before applying.</p>`,
      },
      {
        id: 'education-skills',
        heading: 'Education, Skills, and Internships',
        html: `<h3>Education</h3>
<p>Degree, institution, year, and CGPA if it helps (7.5+ generally does; below that, leave it off unless asked). Add 3–4 relevant coursework topics only if they match the job posting.</p>
<h3>Skills</h3>
<p>Group them so they scan in seconds:</p>
<div class="art-example">
<p><strong>Languages:</strong> Java, Python, JavaScript &nbsp;·&nbsp; <strong>Web:</strong> React, Node.js, REST APIs &nbsp;·&nbsp; <strong>Tools:</strong> Git, Docker, MySQL</p>
</div>
<p>List only what you can defend in an interview — one honest "intermediate" skill beats five padded ones.</p>
<h3>Internships</h3>
<p>Even a 4-week internship goes above education, formatted like a job with result bullets. Include virtual internships and freelance work — output counts, not the office.</p>`,
      },
      {
        id: 'fresher-mistakes',
        heading: '5 Fresher-Specific Mistakes to Avoid',
        html: `<ul>
<li><strong>Photo, age, father's name, full address.</strong> None belong on a modern resume — they waste space and invite bias. Name, phone, email, city, links: done.</li>
<li><strong>School marks on a degree resume.</strong> Once you're in college, 10th/12th percentages matter only if a posting explicitly asks.</li>
<li><strong>A skills list with no evidence.</strong> Every skill you name should appear in a project or internship bullet. Unbacked lists read as keyword stuffing.</li>
<li><strong>Fancy Canva templates.</strong> Campus placements increasingly run resumes through ATS software, and design-tool exports often parse as blank pages. Use a clean single-column format — full rules in the <a href="/how-to-create-an-ats-friendly-resume">ATS-friendly resume guide</a>.</li>
<li><strong>One resume for every company.</strong> Match your summary and skills to each job description — 10 minutes that measurably raises shortlist rates. The other 15 classic errors are covered in <a href="/resume-mistakes-to-avoid">Resume Mistakes to Avoid</a>.</li>
</ul>
<p>Before you submit anywhere, run your resume through <a href="/">CV Mind's free ATS checker</a> — it scores fresher resumes on formatting, keywords, and structure in seconds. And if you'd rather start from a template that's already ATS-tested, use the <a href="/resume-builder">free Resume Builder</a>.</p>`,
      },
    ],
    faqs: [
      { q: 'What is the best resume format for freshers?', a: 'A one-page, single-column, reverse-chronological format with this order: header, summary, skills, projects, internships, education. Projects act as your work-experience section.' },
      { q: 'Should freshers include a photo on their resume?', a: 'No — unless the posting explicitly asks (rare, mostly in hospitality/aviation). Photos waste space, parse badly in ATS software, and invite bias.' },
      { q: 'What if I have no projects and no internships?', a: 'Build one focused project in the next two weeks — a working app, an analysis, a portfolio site relevant to your target role. It\'s faster than applying with an empty resume and getting silence.' },
      { q: 'Should I mention my CGPA?', a: 'Include it if it\'s 7.5+ (or the posting sets a cutoff). Below that, leave it off unless explicitly required — let projects and skills carry the resume.' },
      { q: 'Is a two-page resume okay for freshers?', a: 'No. Recruiters expect one page from candidates with under ~8 years of experience. If you\'re overflowing, cut generic content — not margins or font size.' },
      { q: 'Do campus placements use ATS software?', a: 'Increasingly yes, especially at larger companies — and off-campus applications almost always do. Format for ATS from day one so the same resume works everywhere.' },
    ],
  },
  {
    slug: 'tell-me-about-yourself',
    tag: 'Interview',
    title: '"Tell Me About Yourself": The Formula + Sample Answers That Work',
    metaTitle: 'Tell Me About Yourself: Formula + Sample Answers',
    metaDescription: 'A simple Present-Past-Future formula for "Tell me about yourself" — with sample answers for freshers, experienced candidates, and career changers.',
    keywords: 'Tell Me About Yourself, Interview Introduction, Self Introduction Interview, Tell Me About Yourself Answer, HR Interview Questions',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    readTime: '8 min read',
    blurb: 'The first question of almost every interview — and the easiest to prepare. A 3-part formula with word-for-word sample answers for freshers and pros.',
    related: ['resume-format-for-freshers', 'resume-mistakes-to-avoid', 'linkedin-profile-optimization'],
    intro: `<p>It's the first question in almost every interview, and it sounds harmless: "So — tell me about yourself."</p>
<p>Then candidates either recite their resume line by line, start from their birthplace, or freeze wondering what the interviewer actually wants. All three waste the single best opportunity of the interview: for two minutes, you control the narrative completely.</p>
<p>Interviewers ask it to break the ice, check your communication skills, and — most importantly — decide which threads to pull on next. A good answer plants exactly the threads you want them to pull. Here's the formula.</p>`,
    sections: [
      {
        id: 'formula',
        heading: 'The Present–Past–Future Formula',
        html: `<p>Structure your answer in three parts, 90–120 seconds total:</p>
<div class="art-table-wrap"><table>
<thead><tr><th>Part</th><th>What to say</th><th>Time</th></tr></thead>
<tbody>
<tr><td><strong>Present</strong></td><td>Who you are professionally right now — role/degree, core skills, one headline strength</td><td>~30 sec</td></tr>
<tr><td><strong>Past</strong></td><td>The 1–2 experiences or projects that prove that strength, with a concrete result</td><td>~45 sec</td></tr>
<tr><td><strong>Future</strong></td><td>Why this role, this company — what you want to do next and why they're the fit</td><td>~30 sec</td></tr>
</tbody>
</table></div>
<p>Why this order works: it answers "what can you do for us?" first, backs it with proof, and ends by connecting your goals to their job — which naturally leads the interviewer into questions you've already prepared for.</p>`,
      },
      {
        id: 'sample-fresher',
        heading: 'Sample Answer: Fresher',
        html: `<div class="art-example">
<p><em>"I'm a final-year Computer Science student at NIT Surathkal with a focus on full-stack development — mainly React and Node.js. <strong>(Present)</strong></em></p>
<p><em>Over the last two years I've built three production-grade projects, including a placement portal my college now uses, with 400+ student accounts. During my summer internship at a fintech startup, I shipped a dashboard feature that cut the support team's reporting time by half. <strong>(Past)</strong></em></p>
<p><em>I'm now looking for a software engineering role where I can work on products at scale, and your team's work on payments infrastructure is exactly the kind of engineering I want to grow in." <strong>(Future)</strong></em></p>
</div>
<p>Notice: no birthplace, no hobbies, no family details, no repeating the resume top to bottom — just proof and direction. Your resume should set up this same story; see the <a href="/resume-format-for-freshers">fresher resume format guide</a>.</p>`,
      },
      {
        id: 'sample-experienced',
        heading: 'Sample Answers: Experienced & Career Change',
        html: `<h3>Experienced professional</h3>
<div class="art-example">
<p><em>"I'm a digital marketer with five years of experience, currently leading paid acquisition at a D2C brand where I manage a ₹40-lakh monthly budget across Google and Meta. Before this, I spent two years at an agency running campaigns for 12 clients, which taught me to move fast across very different industries — my last two quarters here, I've cut customer acquisition cost by 30% while doubling spend. I'm looking to move into a growth-lead role, and this position's mix of paid and lifecycle marketing is exactly the scope I've been building toward."</em></p>
</div>
<h3>Career changer</h3>
<div class="art-example">
<p><em>"I spent four years in banking operations, where I kept gravitating toward the data side — automating reports, building dashboards, finding patterns in customer complaints. That pull got strong enough that I completed a data analytics certification and built three portfolio projects, including a churn model on real banking-style data. I'm now looking to make analytics my full-time work, and this analyst role is ideal because my domain background in finance means I already speak your stakeholders' language."</em></p>
</div>
<p>The career-change version works because it frames the switch as a <strong>pull toward</strong> the new field with evidence, not an escape from the old one.</p>`,
      },
      {
        id: 'mistakes',
        heading: '6 Mistakes That Ruin This Answer',
        html: `<ul>
<li><strong>Reciting your resume chronologically.</strong> They've read it. Curate the highlights that fit <em>this</em> job.</li>
<li><strong>Starting from childhood.</strong> "I was born in…" — no. Start from your current professional identity.</li>
<li><strong>Going over 2 minutes.</strong> Past that, interviewers stop listening. Practice with a timer.</li>
<li><strong>Personal details.</strong> Family, religion, relationship status — irrelevant and awkward in a professional answer.</li>
<li><strong>No ending.</strong> Trailing off with "…so, yeah" hands back an awkward silence. End with the Future part — it gives the interviewer their next question.</li>
<li><strong>Memorizing word-for-word.</strong> Memorize the three beats and your numbers, not sentences — a recited answer sounds robotic the moment you're nervous.</li>
</ul>`,
      },
      {
        id: 'practice',
        heading: 'How to Practice It Properly',
        html: `<ol>
<li>Write your answer using the formula (aim for ~200–250 words).</li>
<li>Read it aloud three times, then throw the script away and speak from the three beats.</li>
<li>Record yourself once — you'll instantly hear filler words and pacing problems.</li>
<li>Practice against a real interviewer: <a href="/prep">CV Mind's AI Interview Prep</a> generates questions from your actual resume and scores your answers, and <a href="/voice-prep">Voice Practice</a> gives real-time feedback on how you sound, not just what you say.</li>
</ol>
<p>Three rounds of practice is usually the difference between rambling and owning the first two minutes of every interview.</p>`,
      },
    ],
    faqs: [
      { q: 'How long should my answer to "tell me about yourself" be?', a: '90 seconds to 2 minutes. Under a minute feels underprepared; over two minutes loses the interviewer. Practice with a timer until you land in the window naturally.' },
      { q: 'Should I mention hobbies or family?', a: 'No, not in this answer. Keep it professional: present role, proof from your past, and why this job. If the interviewer wants personal rapport, they\'ll ask separately.' },
      { q: 'Is it okay to memorize my answer?', a: 'Memorize the structure and your key numbers, not the sentences. A word-for-word script sounds robotic and falls apart under nerves; three practiced beats stay flexible.' },
      { q: 'What if I\'m a fresher with nothing to say?', a: 'You have more than you think: your degree focus, your best project with a number attached, an internship or campus role, and why this company. That\'s a complete Present-Past-Future answer.' },
      { q: 'How is this different from "walk me through your resume"?', a: '"Walk me through your resume" wants a chronological tour with reasons for each transition. "Tell me about yourself" wants a curated pitch. Prepare both — the formula still helps with structure.' },
      { q: 'Should the answer change for every company?', a: 'The Present and Past parts mostly stay stable; the Future part must change every time — name the role and a specific reason this company fits your direction.' },
    ],
  },
  {
    slug: 'linkedin-profile-optimization',
    tag: 'LinkedIn',
    title: 'LinkedIn Profile Optimization: 10 Steps to Start Getting Recruiter Messages',
    metaTitle: 'LinkedIn Profile Optimization: 10 Steps (2026)',
    metaDescription: 'Optimize your LinkedIn profile in 10 steps — headline formulas, About section template, keyword placement, and settings that make recruiters find you.',
    keywords: 'LinkedIn Profile Optimization, LinkedIn Headline, LinkedIn About Section, LinkedIn SEO, LinkedIn for Job Search, Recruiter Search LinkedIn',
    date: 'July 8, 2026',
    isoDate: '2026-07-08',
    readTime: '9 min read',
    blurb: 'Recruiters search LinkedIn like Google. These 10 steps — headline, About section, keywords, and settings — decide whether you show up in their results.',
    related: ['resume-keywords-guide', 'tell-me-about-yourself', 'how-to-create-an-ats-friendly-resume'],
    intro: `<p>While you're applying to jobs, recruiters are doing the reverse: searching LinkedIn for candidates. They type skills and titles into a search bar — "React developer Bangalore," "performance marketing manager" — and message whoever ranks on the first pages.</p>
<p>That means your LinkedIn profile is not a social page; it's a search listing. Optimize it like one and opportunities start arriving instead of being chased. These 10 steps take about two hours total and cover everything recruiter search rewards.</p>`,
    sections: [
      {
        id: 'headline',
        heading: 'Steps 1–2: How to Write Your Headline and Choose a Photo',
        html: `<h3>1. Rewrite your headline (the highest-impact 220 characters on LinkedIn)</h3>
<p>Your headline follows you everywhere — search results, comments, connection requests. "Student at XYZ College" or bare "Software Engineer" wastes it. Use this formula:</p>
<div class="art-example">
<p><strong>Role | Top skills | Proof or focus</strong></p>
<p>✅ <em>"Frontend Developer | React, TypeScript, Next.js | Built products used by 50K+ users"</em></p>
<p>✅ <em>"Digital Marketer | SEO &amp; Performance Ads | Scaled D2C revenue 3x in 12 months"</em></p>
<p>✅ <em>"Final-year CS Student | Java, React, SQL | Seeking SDE roles · 3 full-stack projects"</em></p>
</div>
<p>Skills in the headline carry heavy weight in recruiter search — put your 2–3 most searched ones there. <a href="/linkedin-bio">CV Mind's LinkedIn Bio Generator</a> drafts headline options from your resume in one click.</p>
<h3>2. Fix the photo and banner</h3>
<p>Profiles with a photo get dramatically more views and messages. You need: clear face, decent light, plain background — a phone photo against a wall works. Add a banner (even a simple color with your stack or tagline) so your profile doesn't look abandoned.</p>`,
      },
      {
        id: 'about',
        heading: 'Steps 3–4: What to Write in Your About Section and Experience',
        html: `<h3>3. Write an About section that front-loads keywords</h3>
<p>Only the first ~3 lines show before "…see more" — put your role, top skills, and best number there. A template that works:</p>
<div class="art-example">
<p><em>Line 1–3: Who you are + top skills + headline proof.</em><br/>
<em>Middle: 2–3 short paragraphs — what you've built/achieved, with numbers.</em><br/>
<em>End: what you're looking for + how to reach you.</em></p>
</div>
<p>Write it in first person — "I build…" reads human; third person reads like a press release.</p>
<h3>4. Turn experience entries into achievement bullets</h3>
<p>Copy the discipline from your resume: action verb + task + measurable result, 2–4 bullets per role. Recruiters compare your LinkedIn against your resume — they should match in substance. Same rules as your resume bullets, covered in <a href="/resume-mistakes-to-avoid">Resume Mistakes to Avoid</a>.</p>`,
      },
      {
        id: 'keywords-skills',
        heading: 'Steps 5–7: Skills, Keywords, and Endorsements',
        html: `<h3>5. Fill all 50 skill slots — top 3 pinned deliberately</h3>
<p>Recruiter search filters directly on the Skills section. Add every skill you can defend, and pin the 3 most relevant to the roles you want — those get shown first and gather endorsements fastest.</p>
<h3>6. Repeat your core keywords across sections</h3>
<p>LinkedIn's search ranks profiles partly on keyword frequency and placement: headline, About, experience titles, and skills all count. Pick 5–6 core terms (same method as our <a href="/resume-keywords-guide">resume keywords guide</a>) and make sure each appears in at least two sections — naturally, not stuffed.</p>
<h3>7. Get 5–10 endorsements on your pinned skills</h3>
<p>Endorse classmates and colleagues for skills you've genuinely seen — most people reciprocate within days. Endorsed skills rank better in filtered searches.</p>`,
      },
      {
        id: 'settings-activity',
        heading: 'Steps 8–10: Settings, URL, and Activity',
        html: `<h3>8. Turn on "Open to Work" — the right way</h3>
<p>Settings → Job seeking preferences. Choose <strong>"Recruiters only"</strong> if you're currently employed (hides it from your company), or the public green ring if you're a fresher or openly searching. Fill in target titles and locations precisely — recruiters filter on these fields.</p>
<h3>9. Claim a clean custom URL</h3>
<p>linkedin.com/in/priya-sharma-dev beats linkedin.com/in/priya-sharma-8842a91b7. Takes 30 seconds in profile settings, and it's what goes on your resume header.</p>
<h3>10. Be minimally active — it compounds</h3>
<p>You don't need to become an influencer. Two comments a week on posts in your field plus one post a month (a project you built, something you learned) keeps you in your network's feed — and profile views convert to recruiter messages. <a href="/linkedin-post">CV Mind's LinkedIn Post Generator</a> can draft posts from a one-line idea, and <a href="/linkedin">the LinkedIn Audit tool</a> scores your finished profile with specific fixes.</p>`,
      },
      {
        id: 'checklist',
        heading: 'The 2-Hour Checklist',
        html: `<div class="art-table-wrap"><table>
<thead><tr><th>Step</th><th>Item</th><th>Time</th></tr></thead>
<tbody>
<tr><td>1</td><td>Keyword headline (Role | Skills | Proof)</td><td>15 min</td></tr>
<tr><td>2</td><td>Photo + banner</td><td>15 min</td></tr>
<tr><td>3</td><td>About section, keywords in first 3 lines</td><td>30 min</td></tr>
<tr><td>4</td><td>Achievement bullets on every role</td><td>30 min</td></tr>
<tr><td>5–7</td><td>50 skills, pin top 3, seed endorsements</td><td>20 min</td></tr>
<tr><td>8–9</td><td>Open to Work settings + custom URL</td><td>5 min</td></tr>
<tr><td>10</td><td>First comment/post of the week</td><td>10 min</td></tr>
</tbody>
</table></div>`,
      },
    ],
    faqs: [
      { q: 'How do recruiters actually find candidates on LinkedIn?', a: 'Through keyword search with filters — titles, skills, location, and Open to Work status. Your headline, Skills section, and About section carry the most weight in whether you appear.' },
      { q: 'What is the best LinkedIn headline format?', a: 'Role | Top 2–3 skills | Proof or focus. Example: "Data Analyst | SQL, Power BI, Python | Turned churn data into a 12% retention lift." Skills in the headline rank heavily in search.' },
      { q: 'Should I use "Open to Work" if I\'m employed?', a: 'Yes — set it to "Recruiters only," which hides the signal from recruiters at your own company. The public green ring is best for freshers and openly searching candidates.' },
      { q: 'Does LinkedIn activity really matter for job search?', a: 'Moderately, and it compounds: commenting and posting keeps your face in feeds, which drives profile views, which drives recruiter messages. Two comments a week is enough to start.' },
      { q: 'Should my LinkedIn match my resume exactly?', a: 'In substance, yes — same roles, dates, and headline achievements. LinkedIn can carry more detail and personality, but contradictions between the two are a red flag recruiters check for.' },
      { q: 'How long does LinkedIn optimization take to show results?', a: 'Search visibility improves within days of updating headline and skills. Recruiter messages typically follow within 2–6 weeks, depending on how in-demand your role and location are.' },
    ],
  },
];

export const getArticle = (slug: string) => ARTICLES.find(a => a.slug === slug);

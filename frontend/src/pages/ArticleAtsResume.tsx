import { useEffect } from 'react';
import { getArticle } from '../data/articles';
import ArticleLayout from './resources/ArticleLayout';

interface ArticleProps {
  setCurrentPage: (page: string) => void;
}

const TOC = [
  { id: 'what-is-ats', label: 'What is an ATS and how does it work?' },
  { id: 'why-rejected', label: 'Why good candidates get rejected' },
  { id: 'formatting', label: 'ATS-friendly formatting rules' },
  { id: 'keywords', label: 'Finding and using the right keywords' },
  { id: 'sections', label: 'Structuring each resume section' },
  { id: 'comparison', label: 'ATS-friendly vs. unfriendly' },
  { id: 'file-format', label: 'PDF or DOCX?' },
  { id: 'test', label: 'Testing your resume before applying' },
  { id: 'myths', label: 'Common myths about ATS' },
  { id: 'faqs', label: 'FAQs' },
];

const SUMMARY = [
  { lead: 'Layout', text: 'Use a single-column layout with standard headings and fonts. Multi-column designs are the most common cause of parsing errors.' },
  { lead: 'Keywords', text: 'Keywords are the biggest factor in how an ATS ranks you. Take them from the job description and use them naturally in your summary, skills and experience.' },
  { lead: 'File format', text: 'Follow the posting first. Otherwise DOCX parses reliably almost everywhere, and a text-based PDF works for most modern systems.' },
  { lead: 'Test first', text: 'Run the copy-paste test and an ATS checker before every application. It takes five minutes.' },
];

const FAQS = [
  { q: 'What does ATS-friendly resume mean?', a: 'It means a resume formatted so Applicant Tracking Systems can accurately read and categorize it — single-column layout, standard headings and fonts, no graphics, and keywords that match the job description.' },
  { q: 'How do I know if my resume is ATS-friendly?', a: 'Run the copy-paste test (paste it into Notepad and check nothing breaks), then scan it with a free tool like CV Mind\'s ATS Resume Checker to get a score and a list of specific fixes.' },
  { q: 'Do all companies use an ATS?', a: 'Not all, but most medium and large employers do — including over 97% of Fortune 500 companies. Even many startups use lightweight systems like Lever or Greenhouse. Assume your resume will be parsed.' },
  { q: 'Should freshers worry about ATS too?', a: 'Yes — arguably more. Entry-level postings attract hundreds of applicants, so ranking matters most there. Freshers should emphasize skills, projects, and internships using the same keyword-matching approach.' },
  { q: 'Can I use a resume template from Canva or Photoshop?', a: 'Usually not for online applications. Design-tool exports are often image-based or use layered layouts that parsers can\'t read. Use them for printed copies or portfolio sites; apply online with a text-based resume.' },
  { q: 'How many keywords should my resume have?', a: 'There\'s no magic number. Cover the essential skills and qualifications mentioned in the job description — typically 10–20 relevant terms used naturally across your summary, skills, and experience bullets.' },
  { q: 'Does an ATS reject resumes over one page?', a: 'No. Length is not a rejection factor for software. One page is convention for freshers and early-career candidates; two pages is normal for 8+ years of experience.' },
  { q: 'Are two-column resumes always rejected?', a: 'Not always — modern parsers handle them better than older ones. But you can\'t know which system a company runs, so single-column remains the safe choice when a job matters to you.' },
  { q: 'Do ATS systems read cover letters?', a: 'Some parse and index them for keywords; many simply store them for recruiters. Write your cover letter for humans, but include your key skills naturally in case it\'s scanned.' },
  { q: 'How often should I update my resume for ATS?', a: 'Tailor it for every application — at minimum, adjust your summary and skills to mirror each job description. A master resume plus 10 minutes of per-job tailoring is the most efficient workflow.' },
];

export default function ArticleAtsResume({ setCurrentPage }: ArticleProps) {
  const article = getArticle('how-to-create-an-ats-friendly-resume')!;
  // Article + FAQ structured data for rich results
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'article-jsonld';
    script.text = JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Create an ATS-Friendly Resume in 2026 (Step-by-Step Guide)',
        description: 'Learn how to create an ATS-friendly resume that gets past screening software. Formatting rules, keyword tips, templates, and a free checker to test yours.',
        author: { '@type': 'Organization', name: 'CV Mind Team', url: 'https://www.cvmind.in/' },
        publisher: { '@type': 'Organization', name: 'CV Mind' },
        datePublished: '2026-07-08',
        dateModified: '2026-07-08',
        mainEntityOfPage: 'https://www.cvmind.in/how-to-create-an-ats-friendly-resume',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ]);
    document.head.appendChild(script);
    return () => { document.getElementById('article-jsonld')?.remove(); };
  }, []);

  return (
    <ArticleLayout article={article} toc={TOC} summary={SUMMARY} setCurrentPage={setCurrentPage}>
      <p>You spent hours perfecting your resume. You hit "Apply" on twenty jobs. Then… silence. No calls, no emails, not even a rejection.</p>
      <p>Here's what probably happened: a human never saw your resume. Before any recruiter opens your application, most companies run it through an Applicant Tracking System (ATS) — software that scans, sorts, and ranks resumes before a person gets involved. According to research from Jobscan, more than 97% of Fortune 500 companies use an ATS, and a well-known Harvard Business School study found that 88% of employers believe qualified candidates get filtered out simply because their resumes don't match the software's criteria.</p>
      <p>The good news? Beating the ATS isn't about tricks. It's about understanding how the software reads your resume and formatting yours so nothing gets lost in translation. In this guide, you'll learn exactly how to do that, step by step.</p>

      <h2 id="what-is-ats">What Is an ATS and How Does It Work?</h2>
      <p>An Applicant Tracking System is software that companies use to manage job applications. Popular systems include Workday, Greenhouse, Lever, Taleo, and iCIMS. When you apply for a job online, your resume usually lands in one of these systems first.</p>
      <p>Here's what happens next:</p>
      <ul>
        <li><strong>Parsing.</strong> The ATS converts your resume into plain text and tries to sort the information into fields: name, contact details, work history, education, skills.</li>
        <li><strong>Matching.</strong> The system compares your parsed resume against the job description, looking for relevant job titles, skills, and qualifications.</li>
        <li><strong>Ranking.</strong> Many systems score or rank candidates. Recruiters often review the highest-matching resumes first — and may never scroll to the bottom of the list.</li>
      </ul>
      <p>The key insight: <strong>the ATS doesn't see your resume the way you designed it.</strong> It sees raw text. If your beautiful two-column layout confuses the parser, your work experience might end up in the wrong field — or disappear entirely.</p>
      <p>And even when your resume passes the software, remember who's next: a recruiter. Eye-tracking research by Ladders found that recruiters spend an average of just 7.4 seconds on their first scan of a resume. Your resume has to work for both audiences — machine first, human second.</p>

      <h2 id="why-rejected">Why Good Candidates Get Rejected by ATS</h2>
      <p>Most ATS rejections have nothing to do with your qualifications. They happen because of how the resume is built. The most common causes:</p>
      <ul>
        <li><strong>Complex formatting.</strong> Tables, text boxes, columns, and graphics can scramble the parsing process.</li>
        <li><strong>Missing keywords.</strong> If the job asks for "project management" and your resume only says "led teams," the match score drops.</li>
        <li><strong>Non-standard section headings.</strong> The ATS looks for headings like "Work Experience." If you write "My Journey" instead, it may not know what it's reading.</li>
        <li><strong>Headers and footers.</strong> Some parsers skip them completely — a problem if your phone number lives there.</li>
        <li><strong>Unusual fonts or characters.</strong> Decorative fonts and symbols can turn into gibberish after parsing.</li>
        <li><strong>Image-based resumes.</strong> A resume exported as an image or built in Photoshop is often unreadable to an ATS.</li>
      </ul>
      <p>None of these are skill problems. They're formatting problems — and every one of them is fixable in under an hour.</p>

      <h2 id="formatting">ATS-Friendly Resume Formatting Rules</h2>
      <h3>Layout</h3>
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
      <div className="art-table-wrap">
        <table>
          <thead><tr><th>Use This</th><th>Not This</th></tr></thead>
          <tbody>
            <tr><td>Work Experience</td><td>My Professional Journey</td></tr>
            <tr><td>Education</td><td>Where I Studied</td></tr>
            <tr><td>Skills</td><td>What I Bring to the Table</td></tr>
            <tr><td>Certifications</td><td>Badges &amp; Achievements</td></tr>
            <tr><td>Professional Summary</td><td>About Me</td></tr>
          </tbody>
        </table>
      </div>
      <h3>Dates and Details</h3>
      <ul>
        <li>Format dates consistently: "Jan 2023 – Present" or "01/2023 – Present."</li>
        <li>Always include both month and year. Some systems calculate your experience duration automatically.</li>
        <li>Put your contact information in the main body of the document — never only in the header or footer.</li>
      </ul>

      <h2 id="keywords">How to Find and Use the Right Keywords</h2>
      <p>Keywords are the single biggest factor in how an ATS ranks your resume. Here's a simple process that takes about 15 minutes per application.</p>
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
      <div className="art-example">
        <p><strong>Example — turning a weak bullet into a keyword-rich one:</strong></p>
        <p>❌ <em>"Responsible for social media."</em></p>
        <p>✅ <em>"Managed social media marketing across Instagram and LinkedIn, growing engagement 42% in 6 months using content calendars and A/B testing."</em></p>
      </div>
      <p>The second version contains real keywords, a metric, and an outcome — which works for the algorithm and impresses the human who reads it next. Want this done automatically? <button className="art-link-btn" onClick={() => setCurrentPage('tailor')}>CV Mind's Resume Tailorer</button> matches your resume to any job description in seconds.</p>

      <h2 id="sections">Structuring Each Resume Section for ATS</h2>
      <h3>Contact Information</h3>
      <p>Name, phone, email, city, and LinkedIn URL at the top of the document body. Use a professional email address. No need for your full street address.</p>
      <h3>Professional Summary (3–4 lines)</h3>
      <p>Include your target job title, years of experience, and 2–3 top skills that mirror the job description.</p>
      <div className="art-example">
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
      <p>Degree, institution, and year. Spell out and abbreviate: "Bachelor of Technology (B.Tech), Computer Science." List certifications with their full official names.</p>

      <h2 id="comparison">ATS-Friendly vs. ATS-Unfriendly: A Quick Comparison</h2>
      <div className="art-table-wrap">
        <table>
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
        </table>
      </div>

      <h2 id="file-format">PDF or DOCX: Which File Format Should You Use?</h2>
      <p>The short answer: <strong>follow the job posting's instructions first.</strong> If it asks for a specific format, use that.</p>
      <p>If there's no instruction:</p>
      <ul>
        <li><strong>DOCX</strong> is the safest bet for older systems (like some Taleo versions) and parses reliably almost everywhere.</li>
        <li><strong>Text-based PDF</strong> is fine for most modern systems and preserves your formatting exactly. The test: if you can select and copy the text in your PDF, it's text-based. If you can't, it's an image — and an ATS can't read it either.</li>
      </ul>
      <p>Avoid: Pages files, Google Docs share links, JPG/PNG exports, and resumes designed in graphic tools that export flattened images.</p>

      <h2 id="test">How to Test Your Resume Before Applying</h2>
      <p>Don't guess — test. Three quick checks:</p>
      <ol>
        <li><strong>The copy-paste test.</strong> Copy your entire resume and paste it into a plain text editor (Notepad). If sections vanish, reorder, or turn into symbols, an ATS will likely have the same problems.</li>
        <li><strong>The 10-second human test.</strong> Hand it to a friend for 10 seconds. Can they tell you your target role, current job, and top skill? If not, tighten your summary and headings.</li>
        <li><strong>Run it through an ATS checker.</strong> An automated scan catches what your eyes miss — parsing errors, missing keywords, weak sections, and formatting risks. <button className="art-link-btn" onClick={() => setCurrentPage('home')}>CV Mind's free ATS Resume Checker</button> scores your resume in seconds and shows exactly what to fix.</li>
      </ol>
      <p>Doing this before every application takes five minutes and can be the difference between the "reviewed" pile and the void.</p>

      <h2 id="myths">Common Myths About ATS</h2>
      <p><strong>Myth 1: "The ATS auto-rejects most resumes."</strong><br />Mostly false. In most companies, the ATS ranks and filters — humans still make the reject decision. But a low-ranked resume may simply never be opened, which feels identical to rejection.</p>
      <p><strong>Myth 2: "One perfect resume works for every job."</strong><br />No. Matching is per-job. Tailoring your resume to each posting — even 10 minutes of keyword adjustment — measurably improves your match score.</p>
      <p><strong>Myth 3: "Tricks like white-text keywords beat the system."</strong><br />Dangerous. Parsers convert everything to plain text, so hidden keywords become visible to recruiters — and instantly destroy your credibility.</p>
      <p><strong>Myth 4: "Creative resumes show personality, so they're worth the risk."</strong><br />For design roles, a portfolio is the place for creativity. Your resume's job is to be read — by software and by a tired recruiter on their 80th application of the day. Clear beats clever.</p>

      <h2 id="faqs">Frequently Asked Questions</h2>
      {FAQS.map((f, i) => (
        <details key={i} className="art-faq">
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}

      <h2>Conclusion</h2>
      <p>An ATS isn't your enemy — it's a filter, and filters have rules. Once you know them, they're easy to follow: keep the layout simple, use standard headings, mirror the job description's language honestly, save in the right format, and test before you apply.</p>
      <p>Your skills deserve to be seen by a human. Don't let formatting be the reason they aren't.</p>

    </ArticleLayout>
  );
}

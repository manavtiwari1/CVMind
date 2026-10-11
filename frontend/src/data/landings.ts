// Copy for the /resume-builder landing page, which targets both "resume builder" and "CV maker"
// searches (in India the two words mean the same document). ResumeBuilderLanding renders it, and the
// build writes the same text into the page's static HTML (seo/prerender.ts) so search engines can
// read it without running the app. Section `html` may contain internal links (<a href="/page">);
// the page keeps them inside the app.

export interface LandingCopy {
  crumb: string;
  h1: { lead: string; em: string };
  checks: string[];
  cta: string;
  /** Guide sections shown between the start box and the feature rows */
  guide: { id: string; heading: string; html: string }[];
  faqs: { q: string; a: string }[];
  final: { heading: string; text: string };
}

export const BUILDER_COPY: LandingCopy = {
  crumb: 'Resume Builder & CV Maker',
  h1: { lead: 'The free AI resume builder and CV maker that helps you', em: 'land more job interviews' },
  checks: [
    'Build a professional resume or CV with AI feedback on what you write, not a generic template filled with filler.',
    'Rewrite weak bullets, tailor to a job description, and export a clean PDF or DOCX.',
  ],
  cta: 'Build Your Resume With AI',
  guide: [
    {
      id: 'how-it-works',
      heading: 'How to make a resume or CV online',
      html: `<p><strong>CVMind's resume builder and CV maker turns your details into a formatted, ATS-friendly resume or CV: pick a template, add your experience (or upload an old CV), let the AI tighten the wording, then download a PDF or Word file.</strong></p>
<ol>
<li><strong>Choose a template.</strong> Every layout uses real text and standard section headings, so applicant tracking systems can read it.</li>
<li><strong>Add your details.</strong> Start from a blank page, upload a PDF or DOCX resume or CV, or import a LinkedIn profile PDF. Check the filled-in fields, since extraction can miss things.</li>
<li><strong>Improve the wording with AI.</strong> Rewrite weak bullet points, draft a summary, and add the numbers and tools that show your results.</li>
<li><strong>Tailor it to the job.</strong> Paste a job description into the <a href="/tailor">Resume Tailor</a> to see which keywords the role asks for.</li>
<li><strong>Check and download.</strong> Run the finished resume through the free <a href="/">ATS resume checker</a>, then download it as PDF or DOCX.</li>
</ol>`,
    },
    {
      id: 'cv-vs-resume',
      heading: 'CV or resume: which one do you need?',
      html: `<p>The two words mean different things in different countries, but this builder makes both:</p>
<div class="rbl-table"><table>
<thead><tr><th>Where you apply</th><th>What "CV" usually means</th><th>Typical length</th></tr></thead>
<tbody>
<tr><td>India (most private-sector jobs)</td><td>The same thing as a resume; employers use both words</td><td>1 page for freshers, up to 2 pages with experience</td></tr>
<tr><td>UK, Europe, Middle East</td><td>The standard job application document</td><td>About 2 pages</td></tr>
<tr><td>USA and Canada</td><td>A full academic record, used for research and teaching roles</td><td>As long as your publications need</td></tr>
</tbody>
</table></div>
<p>For an ordinary job in India, a one- or two-page CV made here works under either name.</p>`,
    },
    {
      id: 'cv-format',
      heading: 'What to put in a resume or CV (the right order)',
      html: `<ol>
<li><strong>Personal details:</strong> name, phone, email, city and LinkedIn URL. Leave out date of birth, marital status and a photo unless the employer asks for them.</li>
<li><strong>Professional summary:</strong> two or three lines with your target role, top skills and best result.</li>
<li><strong>Skills:</strong> the tools and abilities the job description mentions, in its own words.</li>
<li><strong>Work experience or projects:</strong> newest first, each with three to five bullet points that start with an action verb.</li>
<li><strong>Education:</strong> degree, college, year, and your CGPA if it's strong.</li>
<li><strong>Certifications, achievements and languages:</strong> only what supports the job you want.</li>
</ol>
<p>Making your first CV? Our <a href="/resume-format-for-freshers">resume and CV format for freshers</a> walks through each section with examples.</p>`,
    },
    {
      id: 'ats-friendly',
      heading: 'What makes a resume ATS-friendly?',
      html: `<p>An ATS-friendly resume is one that applicant tracking software can turn into clean text and match against the job. In practice that means:</p>
<ul>
<li>a single readable flow with standard headings such as Work Experience, Education and Skills</li>
<li>real text, never text inside images</li>
<li>contact details in the body of the page, not only in the header or footer</li>
<li>the job posting's own keywords, used where they're true for you</li>
</ul>
<p>The full checklist is in our guide to <a href="/how-to-create-an-ats-friendly-resume">creating an ATS-friendly resume</a>.</p>`,
    },
  ],
  faqs: [
    { q: 'What is an AI resume builder?', a: 'It is a resume editor with AI built in. You choose a template, add your details (or upload an old resume), and the AI helps you rewrite bullet points, write a summary and tailor the resume to a job description.' },
    { q: 'Can I make a CV here too?', a: 'Yes. The same builder works as a CV maker: pick a template, add your details or upload your old CV, and download it as PDF or Word. In India a CV and a resume are usually the same one- or two-page document.' },
    { q: 'Is the resume builder free?', a: 'Yes, you can build and download a resume or CV for free. Free accounts get a set of the templates, and their downloads carry a small "Powered by CVMind" footer; Pro opens every template and removes the footer. The pricing page lists the exact limits.' },
    { q: 'What is the best CV format for freshers?', a: 'One page, in this order: personal details, a short summary, skills, projects, internships, education, then achievements. Projects take the place of work experience, so describe each one with the tools you used and a result.' },
    { q: 'Are the templates ATS-friendly?', a: 'The templates use real text, standard section headings and a single readable flow, with no text inside images. Two-column and colored layouts are included too; if you only care about parsing, pick one of the plainer layouts. Running the finished resume through the ATS checker is a good final step.' },
    { q: 'Can I start from my existing resume or CV?', a: 'Yes. Upload a PDF or DOCX at the start and we pre-fill the form with the details we find. You can also import from a LinkedIn profile PDF. Check the filled-in fields before you generate the resume, since extraction can miss things.' },
    { q: 'Is a biodata the same as a CV?', a: 'No. A biodata lists personal details such as date of birth, religion and family, and is used for some government forms and for marriage. For private-sector jobs, send a CV that focuses on your skills, experience and education.' },
    { q: 'Should I put a photo on my CV?', a: 'For most jobs in India, the UK and the US, no. A photo takes space and can confuse applicant tracking systems. Add one only when the employer or country explicitly expects it.' },
    { q: 'How does tailoring to a job work?', a: 'Paste the job description into the Tailor tool. It compares the posting with your resume and suggests changes to your summary, skills and bullet points. You decide which suggestions to keep.' },
    { q: 'Can I download my resume as PDF or Word?', a: 'Yes. You can download your resume or CV as a PDF or a Word file from the editor. Send whichever the job posting asks for; if it doesn\'t say, a text-based PDF keeps your layout intact.' },
    { q: 'Will it sound like AI wrote it?', a: 'The AI works from the details you give it, and you can edit every line afterwards. Reading it through and adding specifics only you know (numbers, tools, results) is the best way to make it sound like you.' },
  ],
  final: { heading: 'Ready to build your resume or CV?', text: 'Pick the job you want, choose a template, and have a draft in a few minutes.' },
};

export interface FeatureSection {
  tag: string;
  title: string;
  accent: string;
  body: string;
  page: string;
  cta: string;
  card: { title: string; sub: string; lines: string[] };
  points: { title: string; text: string }[];
}

/** `{letters}` in a card line is replaced with the number of cover letter designs */
export const FEATURE_SECTIONS: FeatureSection[] = [
  {
    tag: 'Tailor to the job', title: 'Customize your resume for any role', accent: '#2f8fe0',
    body: 'Paste a job description and CVMind compares it with your resume, then suggests the keywords, skills and wording that role is asking for. Keep one resume per job instead of one for everything.',
    page: 'tailor', cta: 'Tailor my resume',
    card: { title: 'Resume Tailor', sub: 'Upload resume and paste a job ad', lines: ['Upload your resume (PDF or DOCX)', 'Paste the job description', 'Get a tailored version to review'] },
    points: [
      { title: 'Keyword match', text: 'See which terms from the job ad your resume is missing.' },
      { title: 'Your wording stays', text: 'Suggestions build on what you wrote, so it still sounds like you.' },
      { title: 'Review before you use it', text: 'Accept the changes you like and ignore the rest.' },
      { title: 'One per application', text: 'Make a separate version for every role you apply to.' },
    ],
  },
  {
    tag: 'ATS check', title: 'Know how a parser reads your resume', accent: '#1fa97a',
    body: 'Run your resume through the ATS checker to see your score, the keywords you are missing and the formatting problems that can trip up applicant tracking systems, with a short list of fixes.',
    page: 'home', cta: 'Check my resume',
    card: { title: 'ATS Resume Checker', sub: 'Score and fix list', lines: ['Overall ATS score', 'Missing keywords', 'Formatting issues to fix'] },
    points: [
      { title: 'Score out of 100', text: 'A single number to track as you improve the resume.' },
      { title: 'Keyword gaps', text: 'Compare against a job description of your choice.' },
      { title: 'Plain-text readable', text: 'Spot layouts a parser may not read correctly.' },
      { title: 'Clear next steps', text: 'Fixes are listed so you know what to change first.' },
    ],
  },
  {
    tag: 'Cover letters', title: 'A cover letter that matches your resume', accent: '#e9962b',
    body: 'Pick a cover letter design or let the AI write one from your resume and the job ad, then edit it and download a PDF.',
    page: 'cover-letter-builder', cta: 'Write a cover letter',
    card: { title: 'Cover Letter Builder', sub: 'Pick a layout and edit', lines: ['{letters} cover letter designs', 'Examples for each role', 'AI generator and fixes'] },
    points: [
      { title: 'Layouts to match', text: 'Choose a style that pairs with your resume template.' },
      { title: 'Edit freely', text: 'Fonts, tables, colors and headings, like a word processor.' },
      { title: 'Refine with AI', text: 'Tell the AI what to change and it rewrites the draft.' },
      { title: 'PDF and DOCX', text: 'Download in the format the employer asks for.' },
    ],
  },
  {
    tag: 'LinkedIn', title: 'Tidy up your LinkedIn profile too', accent: '#6f4fd6',
    body: 'Recruiters look at your profile as well as your resume. Upload your profile PDF to get an audit, headline ideas, an About section draft and outreach messages.',
    page: 'linkedin', cta: 'Open LinkedIn tools',
    card: { title: 'LinkedIn Optimizer', sub: 'Audit your profile PDF', lines: ['Profile audit and score', 'Headline and About ideas', 'Recruiter outreach drafts'] },
    points: [
      { title: 'Profile audit', text: 'See what is missing or weak in your profile.' },
      { title: 'Headline ideas', text: 'Several options built around your target role.' },
      { title: 'About section', text: 'A draft you can edit and paste straight in.' },
      { title: 'Outreach messages', text: 'Short notes for recruiters and new connections.' },
    ],
  },
];

export const LEVELS = [
  {
    key: 'senior', label: 'Senior & Executive', templateId: 'cv-polished',
    body: 'Fit a long career onto a page or two. The AI helps you tighten the experience section so recent, relevant impact comes first.',
    points: ['Shorten older roles and keep the highlights', 'Draft a summary aimed at leadership roles', 'Choose an executive layout that stays ATS-readable'],
  },
  {
    key: 'mid', label: 'Entry & Mid-Level', templateId: 'cv-double-column',
    body: 'Not sure how to structure your resume yet? Start from a layout built for early careers and let the AI help with wording.',
    points: ['Turn projects and internships into strong bullets', 'Pull a skills section from your experience', 'Tailor the resume to each job you apply for'],
  },
  {
    key: 'change', label: 'Career Changers', templateId: 'cv-modern',
    body: 'Moving to a new field means showing the skills that carry over. Tailor your resume to the new role and lead with those.',
    points: ['Match transferable skills to the new job ad', 'Lead with skills instead of job titles', 'Keep the format simple for ATS parsing'],
  },
];

export const STAGES = [
  { key: 'build', label: 'Resume Builder', page: 'resume-editor', title: 'Build the resume', text: 'Pick from ATS-friendly templates, fill in your details or upload an old resume, and edit everything in a Word-style editor.', points: ['Start from an existing resume or a blank page', 'Import details from a LinkedIn PDF', 'Download as PDF or DOCX'] },
  { key: 'check', label: 'Resume Checker', page: 'home', title: 'Check it', text: 'Get an ATS score, keyword gaps and a fix list before a recruiter or parser sees it.', points: ['Overall score', 'Missing keywords', 'Formatting issues'] },
  { key: 'cover', label: 'Cover Letter', page: 'cover-letter-builder', title: 'Write the cover letter', text: 'Pick a cover letter design that matches your resume, start from an example for your role or let the AI write a first draft, then fix it with AI.', points: ['Designs to match your resume', 'Examples for each role', 'AI generator and fixes'] },
  { key: 'tailor', label: 'Tailor Resume', page: 'tailor', title: 'Tailor it to the job', text: 'Paste a job description and adjust your resume to match what the role asks for.', points: ['Keyword suggestions', 'Per-job versions', 'You approve every change'] },
  { key: 'prep', label: 'Interview Prep', page: 'prep', title: 'Practice for the interview', text: 'Rehearse likely questions for the role and get feedback on your answers.', points: ['Role-specific questions', 'Feedback on answers', 'Voice practice'] },
  { key: 'linkedin', label: 'LinkedIn', page: 'linkedin', title: 'Polish your profile', text: 'Audit your LinkedIn profile and draft a headline, About section and outreach messages.', points: ['Profile audit', 'Headline ideas', 'Outreach drafts'] },
];

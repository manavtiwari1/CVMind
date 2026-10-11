// Home page text that the build also writes into the static HTML (seo/prerender.ts), so crawlers that
// don't run the app see the same heading, intro and FAQs as visitors.

export const HOME_HERO = {
  h1: { lead: 'Land more interviews with CVMind\u2019s', em: 'Resume Builder' },
  lead: 'Build an ATS-friendly resume from a template, let the AI rewrite the weak lines, and tailor it to a job post in one click. Or upload the resume you already have and get a free score first.',
};

export const HOME_CHECKER = {
  heading: 'Get Your Resume Score in Seconds',
  text: 'Upload your resume and instantly see your ATS compatibility score, keyword gaps, formatting issues, and AI-powered fix suggestions.',
};

export const HOME_FAQS = [
  { q: 'How does the AI resume checker work?', a: 'Our AI reads your resume, checks keyword coverage and formatting, looks for gaps in quantified achievements, and scores the document from 0 to 100. You get a full report in seconds.' },
  { q: 'Can AI auto-fix my resume from the suggestions?', a: 'Yes. In the Resume Center, after your analysis is complete, click "AI Fix Resume" and our AI will automatically rewrite your entire resume incorporating all the suggestions. You can then download the fixed version as a PDF or DOCX instantly, or open it in the in-app resume editor to polish it further.' },
  { q: 'What file formats are supported?', a: 'We support PDF, DOCX, and TXT files up to 5MB. PDF and DOCX give the best results as they preserve formatting information.' },
  { q: 'How accurate is the ATS score?', a: 'The score is an AI-based estimate of how well your resume reads to an applicant tracking system: keyword coverage, structure and formatting. Treat it as a guide rather than a guarantee, because every company configures its ATS differently.' },
  { q: 'Can I use this for multiple jobs?', a: 'Absolutely. Use the Resume Tailor tool to create a custom-tailored version of your resume for each job application. Our AI aligns your skills, keywords, and achievements to each specific job description.' },
  { q: 'Is my resume data kept private?', a: 'Yes. Your resume is processed in memory and never stored on our servers without your consent. We use end-to-end encrypted connections and your data is never used for AI training.' },
  { q: 'Do I need to create an account?', a: 'No account is required to get your ATS score and basic analysis. Features like saved works, and resume downloads require a free account. You can sign up with Google OAuth or email in seconds.' },
  { q: 'Can I delete my account and all my data?', a: 'Yes. Go to the profile dropdown in the top-right corner → click "Delete Account" → type DELETE to confirm. This permanently removes your account, all saved works, and all associated data from our servers immediately.' },
];

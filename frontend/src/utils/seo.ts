import { ARTICLES } from '../data/articles';
import { isAppHost } from '../lib/hosts';

interface PageSEO {
  title: string;
  description: string;
  keywords?: string;
}

const SITE_URL = 'https://www.cvmind.in';

// Account-only and error pages stay out of search results
const NO_INDEX_PAGES = ['account', 'my-documents', 'admin', 'dashboard', 'resume-editor', 'cover-letter-start', 'cover-letter-editor', 'not-found'];

const PAGE_SEO: Record<string, PageSEO> = {
  home: {
    title: 'Free AI Resume Builder & CV Maker Online | CV Mind',
    description: "Make a professional resume or CV online in minutes with CV Mind's free AI Resume Builder. ATS-friendly templates, instant resume score, AI rewriting, and one-click job tailoring — no sign-up needed to start.",
    keywords: 'Resume Builder, Free Resume Builder, CV Maker, CV Making Online, Online CV Builder, AI Resume Builder, ATS Resume Checker, Resume Maker Free, CV Builder India, Professional CV Format',
  },
  about: {
    title: 'About Us | CV Mind',
    description: 'CV Mind is a set of tools for job seekers: a resume builder, an ATS resume checker, interview practice and LinkedIn help. Learn what we build and why.',
    keywords: 'About CV Mind, AI resume scanner, ATS technology, resume optimization mission, career tech',
  },
  contact: {
    title: 'Contact Us | CV Mind Help Desk',
    description: 'Send the CV Mind team a message about your account, billing or our resume tools, or reach us by email or WhatsApp. We usually reply within 24 hours.',
    keywords: 'Contact CV Mind, resume checker support, career tool help, feedback, partnership',
  },
  'help-center': {
    title: 'Help Desk | CV Mind',
    description: 'Answers to common questions about building resumes, your CV Mind account, plans and billing, and how to reach our support team.',
    keywords: 'CV Mind help, resume builder help, account help, CV Mind support',
  },
  account: {
    title: 'Account | CV Mind',
    description: 'Manage your CV Mind profile, password, plan and saved documents.',
    keywords: 'CV Mind account, profile settings',
  },
  faq: {
    title: 'Frequently Asked Questions (FAQ) | CV Mind',
    description: 'Find answers to common questions about CV Mind, ATS resume scoring, keyword optimization, privacy, and how to download your recruiter-ready resume.',
    keywords: 'FAQ, CV Mind questions, ATS help, resume builder help, how to write resume',
  },
  blog: {
    title: 'Resume & Career Advice Blog | CV Mind',
    description: 'Step-by-step guides for writing an ATS-friendly resume, choosing the right keywords and format, and preparing for interviews and LinkedIn.',
    keywords: 'Resume Blog, Career Advice, Resume Writing Guides, Job Search Tips, Recruiter Secrets, ATS Optimization',
  },
  dashboard: {
    title: 'Resume Audit Scorecard & ATS Analytics | CV Mind',
    description: 'View your detailed AI resume analysis score, structural formatting alerts, keyword matches, and recruiter insights on your personalized CV Mind dashboard.',
    keywords: 'Resume Dashboard, Resume Scorecard, ATS Score, Keyword Match, Resume Analysis',
  },
  privacy: {
    title: 'Privacy Policy | CV Mind',
    description: 'What information CV Mind collects, how uploaded resumes are handled, who we share data with, how ads and cookies work, and how to delete your data.',
    keywords: 'Privacy Policy, secure resume parsing, data privacy, resume builder terms',
  },
  terms: {
    title: 'Terms & Conditions | CV Mind',
    description: "Terms and conditions for using CV Mind's AI resume and career tools.",
    keywords: 'Terms and Conditions, CV Mind terms, usage policy',
  },
  'refund-policy': {
    title: 'Refund Policy | CV Mind',
    description: "CV Mind's refund policy for paid services.",
    keywords: 'Refund Policy, CV Mind refunds, payment policy',
  },
  'copyright-policy': {
    title: 'Copyright Policy | CV Mind',
    description: "CV Mind's copyright policy — ownership of site content, your rights over uploaded and AI-generated content, and how to report infringement.",
    keywords: 'Copyright Policy, DMCA, Intellectual Property, Content Ownership, CV Mind copyright',
  },
  disclaimer: {
    title: 'Disclaimer | CV Mind',
    description: "Disclaimer regarding the use of CV Mind's AI-generated resume and career content.",
    keywords: 'Disclaimer, AI-generated content, CV Mind disclaimer',
  },
  pricing: {
    title: 'Pricing | Free & Pro Plans - CV Mind',
    description: "Simple, transparent pricing for CV Mind's AI resume and career tools. Start free, upgrade for unlimited AI power.",
    keywords: 'CV Mind pricing, resume checker price, free resume tools, pro plan',
  },
  products: {
    title: 'All AI Career Tools | Product Showcase - CV Mind',
    description: 'Explore all AI-powered career tools by CV Mind. From resume checking to interview prep, LinkedIn optimization, career roadmapping, and AI job finding — all in one place.',
    keywords: 'AI Career Tools, Resume Checker, Interview Prep, LinkedIn Optimizer, Career Roadmap, Voice Coach, Job Finder',
  },
  'resume-builder': {
    title: 'Free Resume Builder - Make Your CV Online in Minutes | CV Mind',
    description: 'Build a professional, ATS-friendly resume or CV online for free. Choose from 10+ recruiter-approved templates, get AI-powered writing help, and download as PDF or DOC in minutes.',
    keywords: 'Free Resume Builder, CV Maker Online, Make CV Online Free, AI Resume Builder, ATS Resume Templates, Resume Maker, CV Format for Freshers, Professional Resume Builder',
  },
  tailor: {
    title: 'AI Resume Tailor - Match Your Resume to Any Job Description | CV Mind',
    description: 'Upload your CV and paste a job description. CV Mind rewrites your summary, bullets and skills for the role, keeps your facts, and gives you a designed resume to download as PDF, Word or TXT or edit further.',
    keywords: 'Resume Tailor, Tailor Resume to Job Description, AI Resume Tailoring, ATS Keyword Match, Job Description Resume Match',
  },
  prep: {
    title: 'Interview Prep AI - Mock Interview from Your CV & the Job | CV Mind',
    description: 'Practise a mock interview built from your CV and the job description. Answer each question and get a score, what was missing, a stronger answer, and a full interview report.',
    keywords: 'AI Interview Prep, Mock Interview, Interview Questions, Job Description Interview, STAR Method',
  },
  'voice-prep': {
    title: 'Voice Prep AI - Practise Interviews Out Loud | CV Mind',
    description: 'Leo asks interview questions out loud, built from your CV and the job. Answer by speaking and get feedback on your content, pace, filler words and confidence.',
    keywords: 'Voice Interview Practice, AI Interview Coach, Mock Interview, Speaking Feedback, Filler Words',
  },
  'ai-job-finder': {
    title: 'AI Job Finder - Live Jobs Ranked Against Your Resume | CV Mind',
    description: 'Search live jobs from job sites, company careers pages and CVMind recruiters. See a match score and the missing skills for every job, and never apply to the same job twice.',
    keywords: 'AI Job Finder, Job Search India, Resume Job Match, Jobs for Freshers, Remote Jobs, Match Score, CVMind Pro',
  },
  'job-finder': {
    title: 'AI Job Finder | CV Mind',
    description: 'Search live jobs ranked against your resume. Part of CVMind Pro.',
    keywords: 'AI Job Finder, Job Search, Resume Job Match',
  },
  proofreading: {
    title: 'AI Proofreading | Grammar, Tone & Power Verbs - CV Mind',
    description: 'Let AI proofread your resume, cover letter, or any professional text. Fixes grammar, spelling, passive voice, weak verbs, and aligns tone to your target industry — one click.',
    keywords: 'AI Proofreading, Grammar Checker, Active Voice, Power Verbs, Resume Proofreader, Professional Writing',
  },
  'portfolio-gen': {
    title: 'AI Portfolio Website Generator | Free - CV Mind',
    description: 'Generate a stunning, responsive portfolio website from your resume in seconds. Choose themes, preview live, and download the HTML file instantly.',
    keywords: 'Portfolio Website Generator, AI Portfolio Builder, Resume to Portfolio, HTML Portfolio',
  },
  linkedin: {
    title: 'LinkedIn Profile Optimizer | CV Mind',
    description: 'Optimize your LinkedIn profile to get noticed by recruiters. Learn how to align your experience, headline, and skills with AI-driven recommendations.',
    keywords: 'LinkedIn Optimizer, LinkedIn SEO, Profile Optimization, Recruiter Attraction',
  },
  'linkedin-bio': {
    title: 'AI LinkedIn Bio Generator | Headline & Summary - CV Mind',
    description: 'Create a compelling LinkedIn bio and headline in seconds. Our AI generates professional summaries that align with your industry, resume, and target roles.',
    keywords: 'LinkedIn Bio Generator, Professional Headline, LinkedIn Summary AI',
  },
  'linkedin-outreach': {
    title: 'AI LinkedIn Outreach Message Generator | CV Mind',
    description: 'Generate personalized LinkedIn outreach messages to connect with recruiters, hiring managers, and industry peers to accelerate your job search.',
    keywords: 'LinkedIn Outreach, Networking Messages, Recruiter Outreach AI',
  },
  'linkedin-post': {
    title: 'AI LinkedIn Post Generator | Viral Posts - CV Mind',
    description: 'Generate 3 viral LinkedIn post styles in seconds. AI writes professional, storytelling & bold posts with hooks, emojis, and optimized hashtags.',
    keywords: 'LinkedIn Post Generator, Viral LinkedIn Posts, AI Content Writer, LinkedIn Growth',
  },
  'career-courses': {
    title: 'AI-Recommended Career & Skill Development Courses | CV Mind',
    description: 'Discover online courses curated by AI to fill your skill gaps. Advance your career with targeted learning options based on your resume analysis.',
    keywords: 'Career Development Courses, Skill Gap, Professional Learning, Online Courses',
  },
  'elevator-pitch': {
    title: 'AI Elevator Pitch Generator | Self-Introduction - CV Mind',
    description: 'Generate a high-impact professional elevator pitch for networking events, job interviews, and cold outreach. Sound confident, clear, and recruiter-ready.',
    keywords: 'Elevator Pitch Generator, Self-Introduction, Job Interview Pitch',
  },
  'career-roadmap': {
    title: 'AI Career Path Roadmap Generator | Career Planning - CV Mind',
    description: 'Map out your long-term career growth with our AI Career Roadmap generator. Get step-by-step career milestones, certification paths, and skill progression plans.',
    keywords: 'Career Roadmap Generator, Career Path Planner, Skill Progression, Career Strategy',
  },
  'auto-apply': {
    title: 'Auto Apply Agent - AI Applies to Jobs for You | CV Mind',
    description: "CV Mind's Auto Apply Agent finds matching jobs and applies on your behalf with a tailored resume and cover letter. Coming soon.",
    keywords: 'Auto Apply, AI Job Application, Automated Job Applying, Job Application Agent',
  },
  'company-portal': {
    title: 'Recruiter Portal - Post Jobs & Review Candidates | CV Mind',
    description: 'Post openings, review AI-matched applicants and shortlist candidates from one recruiter dashboard on CV Mind.',
    keywords: 'Recruiter Portal, Post Jobs, Candidate Screening, Applicant Tracking, CV Mind for Recruiters',
  },
  'cover-letter-generator': {
    title: 'AI Cover Letter Generator from Your Resume | CV Mind',
    description: 'Upload your resume, paste the job description and get a tailored, one-page cover letter in under a minute. Edit it or download it as PDF.',
    keywords: 'AI Cover Letter Generator, Cover Letter from Resume, Free Cover Letter Generator',
  },
  'cover-letter-builder': {
    title: 'Online Cover Letter Builder | CV Mind',
    description: 'Answer a few questions, start from a cover letter example for your role, customize the design and download it as PDF.',
    keywords: 'Cover Letter Builder, Online Cover Letter Maker, Cover Letter Templates, Cover Letter Design',
  },
  'cover-letter-start': {
    title: 'Build Your Cover Letter | CV Mind',
    description: 'Answer a few questions and start from a cover letter example for your role.',
  },
  'cover-letter-editor': {
    title: 'Cover Letter Editor | CV Mind',
    description: 'Edit your cover letter, fix it with AI and download it as PDF or Word.',
  },
  'resume-editor': {
    title: 'Resume Editor - Edit Your CV with AI | CV Mind',
    description: 'Edit your resume or cover letter in a live editor: pick an ATS-friendly template, rewrite bullets with AI, and download as PDF or DOCX.',
    keywords: 'Resume Editor, CV Editor, Online Resume Editor, AI Resume Writer, Cover Letter Editor',
  },
  'my-documents': {
    title: 'My Documents | CV Mind',
    description: 'Open, edit, duplicate and download the resumes and cover letters saved to your CV Mind account.',
    keywords: 'CV Mind documents, saved resumes, my resumes',
  },
  portfolio: {
    title: 'Portfolio | Built with CV Mind',
    description: 'A personal portfolio website generated from a resume with CV Mind.',
  },
  admin: {
    title: 'Admin | CV Mind',
    description: 'CV Mind admin console.',
  },
  'not-found': {
    title: 'Page Not Found | CV Mind',
    description: "The page you're looking for doesn't exist or has moved. Head back to CV Mind to check or build your resume.",
  },
  code: {
    title: 'CVmind Code - AI Coding Judge, Practice & Career Assessments | CV Mind',
    description: 'Master Data Structures & Algorithms with an in-browser isolated code judge, 6-tier progressive AI assistance, contests, and standardized skill scores that recruiters verify.',
    keywords: 'Coding Practice, Coding Judge, AI Code Assistant, DSA Practice, Coding Assessments, Interview Preparation, Coding Profile',
  },
  'cvmind-code': {
    title: 'CVmind Code - AI Coding Judge, Practice & Career Assessments | CV Mind',
    description: 'Master Data Structures & Algorithms with an in-browser isolated code judge, 6-tier progressive AI assistance, contests, and standardized skill scores that recruiters verify.',
    keywords: 'Coding Practice, Coding Judge, AI Code Assistant, DSA Practice, Coding Assessments, Interview Preparation, Coding Profile',
  },
  'code-arena': {
    title: 'CVMind Code Arena - Live In-Browser Code Judge & Editor | CV Mind',
    description: 'Solve DSA challenges in real-time with Monaco Editor, multi-language execution, 6-tier AI hints, and comprehensive test suites.',
    keywords: 'Code Arena, Monaco Editor, DSA Practice, Python, C++, Java, JavaScript, Code Judge',
  },
  'cvmind-code-arena': {
    title: 'CVMind Code Arena - Live In-Browser Code Judge & Editor | CV Mind',
    description: 'Solve DSA challenges in real-time with Monaco Editor, multi-language execution, 6-tier AI hints, and comprehensive test suites.',
    keywords: 'Code Arena, Monaco Editor, DSA Practice, Python, C++, Java, JavaScript, Code Judge',
  },
};

// Blog articles register their own SEO from the central registry.
for (const a of ARTICLES) {
  PAGE_SEO[a.slug] = { title: a.metaTitle, description: a.metaDescription, keywords: a.keywords };
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function applySEO(page: string) {
  const seo = PAGE_SEO[page] || PAGE_SEO['not-found'];

  document.title = seo.title;
  setMeta('description', seo.description);
  if (seo.keywords) setMeta('keywords', seo.keywords);
  setMeta('og:title', seo.title, 'property');
  setMeta('og:description', seo.description, 'property');
  setMeta('twitter:title', seo.title, 'property');
  setMeta('twitter:description', seo.description, 'property');

  const url = page === 'home' ? `${SITE_URL}/` : `${SITE_URL}/${page}`;
  setMeta('og:url', url, 'property');
  setMeta('twitter:url', url, 'property');

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);

  // app.cvmind.in duplicates the site build, and signed-in or missing pages have nothing to index
  const noIndex = isAppHost() || NO_INDEX_PAGES.includes(page) || !PAGE_SEO[page];
  setMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');
}

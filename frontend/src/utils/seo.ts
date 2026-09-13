import { ARTICLES } from '../data/articles';

interface PageSEO {
  title: string;
  description: string;
  keywords?: string;
}

const SITE_URL = 'https://www.cvmind.online';

const PAGE_SEO: Record<string, PageSEO> = {
  home: {
    title: 'Free AI Resume Builder & CV Maker Online | CV Mind',
    description: "Make a professional resume or CV online in minutes with CV Mind's free AI Resume Builder. ATS-friendly templates, instant resume score, AI rewriting, and one-click job tailoring — no sign-up needed to start.",
    keywords: 'Resume Builder, Free Resume Builder, CV Maker, CV Making Online, Online CV Builder, AI Resume Builder, ATS Resume Checker, Resume Maker Free, CV Builder India, Professional CV Format',
  },
  about: {
    title: 'About Us | CV Mind Resume Intelligence',
    description: 'Learn about CV Mind, our mission to democratize recruitment technology, and how our AI resume scanner helps candidates beat applicant tracking systems.',
    keywords: 'About CV Mind, AI resume scanner, ATS technology, resume optimization mission, career tech',
  },
  contact: {
    title: 'Contact Us | Support & Feedback - CV Mind',
    description: 'Get in touch with the CV Mind team. We welcome your feedback, partnership inquiries, and questions about our AI resume checker and ATS optimization tools.',
    keywords: 'Contact CV Mind, resume checker support, career tool help, feedback, partnership',
  },
  faq: {
    title: 'Frequently Asked Questions (FAQ) | CV Mind',
    description: 'Find answers to common questions about CV Mind, ATS resume scoring, keyword optimization, privacy, and how to download your recruiter-ready resume.',
    keywords: 'FAQ, CV Mind questions, ATS help, resume builder help, how to write resume',
  },
  blog: {
    title: 'Career Advice & Resume Optimization Blog | CV Mind',
    description: 'Explore expert tips, resume writing guides, career strategies, and ATS secrets from recruiters to help you land your dream job.',
    keywords: 'Resume Blog, Career Advice, Resume Writing Guides, Job Search Tips, Recruiter Secrets, ATS Optimization',
  },
  dashboard: {
    title: 'Resume Audit Scorecard & ATS Analytics | CV Mind',
    description: 'View your detailed AI resume analysis score, structural formatting alerts, keyword matches, and recruiter insights on your personalized CV Mind dashboard.',
    keywords: 'Resume Dashboard, Resume Scorecard, ATS Score, Keyword Match, Resume Analysis',
  },
  privacy: {
    title: 'Privacy Policy | Secure & Anonymous Resume Parsing - CV Mind',
    description: 'Your privacy is our priority. CV Mind parses your resume entirely in memory. Read our Privacy Policy to understand how we protect your document and data.',
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
    title: 'AI Resume Tailoring Tool | Match Job Descriptions - CV Mind',
    description: 'Tailor your resume to any job description instantly. Our AI matches keywords, optimizes achievements, and aligns your experience for maximum ATS compatibility.',
    keywords: 'Resume Tailorer, Job Matching, Resume Alignment, ATS Keyword Match',
  },
  prep: {
    title: 'AI Interview Preparation & Mock Interviews | CV Mind',
    description: 'Prepare for interviews with personalized AI coaching. Get simulated behavioral questions, instant answers assessment, and industry-specific prep tips based on your resume.',
    keywords: 'AI Interview Prep, Mock Interview, Interview Coaching, Behavioral Questions',
  },
  'voice-prep': {
    title: 'Voice Interview Practice | AI Coaching - CV Mind',
    description: 'Practice interviews by speaking your answers aloud. AI transcribes, analyzes confidence, detects filler words, and gives real-time coaching feedback.',
    keywords: 'Voice Interview Practice, AI Interview Coach, Mock Interview, Speech Analysis',
  },
  'job-finder': {
    title: 'AI Job Finder | Match Jobs to Your CV - CV Mind',
    description: 'Upload your CV and describe your target role. CV Mind matches you with curated job openings complete with match scores, required skills, salary ranges, and direct apply links.',
    keywords: 'AI Job Finder, Job Search, Resume to Jobs, Remote Jobs, Full-time Jobs, Internship Finder, Career Match',
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
  'career-copilot': {
    title: 'AI Career Copilot - 9 AI Agents Managing Your Career | CV Mind',
    description: 'Meet your AI Career Copilot: 9 AI agents working together on your resume, job search, LinkedIn, skills, interviews, networking, salary, and career analytics — all in one dashboard.',
    keywords: 'AI Career Copilot, AI Career Agents, Career Management AI, Job Search Automation, Career Health Score',
  },
  'auto-apply': {
    title: 'Auto Apply Agent - AI Applies to Jobs for You | CV Mind',
    description: "CV Mind's Auto Apply Agent finds matching jobs and applies on your behalf with a tailored resume and cover letter. Coming soon.",
    keywords: 'Auto Apply, AI Job Application, Automated Job Applying, Job Application Agent',
  },
  code: {
    title: 'CVmind Code - AI Coding Judge, Practice & Career Assessments | CV Mind',
    description: 'Master Data Structures & Algorithms with an in-browser isolated code judge, 6-tier progressive AI assistance, contests, and standardized skill scores that recruiters verify.',
    keywords: 'Coding Practice, LeetCode Alternative, Coding Judge, AI Code Assistant, DSA Practice, Coding Assessments, Interview Preparation, Coding Profile',
  },
  'cvmind-code': {
    title: 'CVmind Code - AI Coding Judge, Practice & Career Assessments | CV Mind',
    description: 'Master Data Structures & Algorithms with an in-browser isolated code judge, 6-tier progressive AI assistance, contests, and standardized skill scores that recruiters verify.',
    keywords: 'Coding Practice, LeetCode Alternative, Coding Judge, AI Code Assistant, DSA Practice, Coding Assessments, Interview Preparation, Coding Profile',
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
  const seo = PAGE_SEO[page] || PAGE_SEO.home;

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
}

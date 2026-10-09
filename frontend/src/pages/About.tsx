import { FileText, MessageSquare, Linkedin, Briefcase, ArrowRight, ExternalLink, type LucideIcon } from 'lucide-react';
import SampleResume, { SAMPLE_RESUME_WIDTH } from '../components/home/SampleResume';
import ScaleToFit from '../components/home/ScaleToFit';
import './resources/Resources.css';
import './About.css';

interface AboutProps {
  setCurrentPage: (page: string) => void;
}

interface ProductGroup {
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: string;
  links: { label: string; page: string }[];
}

const PRODUCTS: ProductGroup[] = [
  {
    title: 'Resume',
    desc: 'Write a resume from scratch or improve the one you have, then check how screening software reads it.',
    icon: FileText,
    tone: 'green',
    links: [
      { label: 'Resume Builder', page: 'resume-builder' },
      { label: 'Resume Checker', page: 'home' },
      { label: 'Resume Tailorer', page: 'tailor' },
      { label: 'Portfolio Generator', page: 'portfolio-gen' },
    ],
  },
  {
    title: 'Interviews',
    desc: 'Practise with questions drawn from your resume and the job, out loud or in writing, with feedback on every answer.',
    icon: MessageSquare,
    tone: 'purple',
    links: [
      { label: 'Interview Prep AI', page: 'prep' },
      { label: 'Voice Prep AI', page: 'voice-prep' },
      { label: 'CVMind Code', page: 'code' },
    ],
  },
  {
    title: 'LinkedIn & career',
    desc: 'Tighten your LinkedIn profile, write outreach messages and plan the skills you need for your next role.',
    icon: Linkedin,
    tone: 'blue',
    links: [
      { label: 'LinkedIn Profile Audit', page: 'linkedin' },
      { label: 'Bio & Banner Generator', page: 'linkedin-bio' },
      { label: 'Career Roadmap', page: 'career-roadmap' },
    ],
  },
  {
    title: 'Job search',
    desc: 'Find roles that fit your profile and polish every document before you send it.',
    icon: Briefcase,
    tone: 'amber',
    links: [
      { label: 'AI Job Finder', page: 'ai-job-finder' },
      { label: 'AI Proofreading', page: 'proofreading' },
    ],
  },
];

// Taken from the project's history; keep to things that shipped
const MILESTONES = [
  { when: 'May 2026', title: 'A free resume checker', text: 'The first version did one job: upload a resume and see how screening software reads it, with a resume tailorer for matching it to a job.' },
  { when: 'June 2026', title: 'Beyond the resume', text: 'LinkedIn tools, interview practice and a portfolio generator arrived, and CV Mind opened to everyone.' },
  { when: 'June 2026', title: 'A real resume builder', text: 'A full library of resume templates with matching cover letters, editable right on the page.' },
  { when: 'September 2026', title: 'CVMind Code', text: 'Coding practice with an AI judge, for the technical rounds that follow the resume.' },
  { when: 'October 2026', title: 'Guided by Leo', text: 'The Resume Tailorer, Interview Prep and Proofreading became step-by-step flows with Leo as your guide.' },
];

const VALUES = [
  {
    title: 'Specific advice, not scores alone',
    text: 'A number tells you something is wrong. We point to the line, explain why it matters and suggest a rewrite you can accept or change.',
  },
  {
    title: 'Your documents stay yours',
    text: 'Uploaded files are read and discarded, saved documents are visible only to you, and nothing you write is used to train AI models.',
  },
  {
    title: 'The basics are free',
    text: 'The resume builder with every template, the resume checker and interview practice are on the Free plan. Pro is for people who want more.',
  },
];

export default function About({ setCurrentPage }: AboutProps) {
  return (
    <div className="about">
      <header className="about-hero">
        <div className="about-hero-inner">
          <div className="about-hero-text">
            <span className="rsc-eyebrow">About us</span>
            <h1>We help good candidates get their resume read</h1>
            <p>CV Mind is a set of tools for job seekers: a resume builder, an ATS checker, interview practice and LinkedIn help. They are built around one idea. Nobody should be filtered out because of how their resume is written.</p>
            <div className="about-hero-actions">
              <button type="button" className="rsc-btn" onClick={() => setCurrentPage('resume-builder')}>Build a resume</button>
              <button type="button" className="rsc-link" onClick={() => setCurrentPage('home')}>
                Check my resume <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <figure className="about-hero-visual">
            <figcaption>Sample resume made with CV Mind</figcaption>
            <div className="about-hero-paper">
              <ScaleToFit width={SAMPLE_RESUME_WIDTH} cropHeight={720}>
                <SampleResume />
              </ScaleToFit>
            </div>
          </figure>
        </div>
      </header>

      <div className="rsc about-body">
        <section className="about-mission">
          <span className="rsc-eyebrow">Our mission</span>
          <p>Hiring software reads your resume before a person does. We make sure it reads the version of you that deserves the interview.</p>
        </section>

        <section className="about-story">
          <div className="about-story-head">
            <h2>Our story</h2>
            <p>CV Mind started as a free resume checker. People kept asking for the next step, so we kept building it, from the first draft to the final round.</p>
          </div>
          <ol className="about-timeline">
            {MILESTONES.map(m => (
              <li key={m.title}>
                <span className="about-timeline-when">{m.when}</span>
                <h3>{m.title}</h3>
                <p>{m.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-products">
          <h2>What we build</h2>
          <div className="about-products-grid">
            {PRODUCTS.map(g => (
              <div key={g.title} className={`about-product about-product--${g.tone}`}>
                <span className="about-product-icon"><g.icon size={22} /></span>
                <h3>{g.title}</h3>
                <p>{g.desc}</p>
                <ul>
                  {g.links.map(l => (
                    <li key={l.page}>
                      <button type="button" onClick={() => setCurrentPage(l.page)}>
                        {l.label} <ArrowRight size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="about-values">
          <h2>What we believe</h2>
          <ol className="about-values-list">
            {VALUES.map((v, i) => (
              <li key={v.title}>
                <span className="about-value-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-maker">
          <span className="about-maker-avatar" aria-hidden="true">MT</span>
          <div className="about-maker-text">
            <span className="rsc-eyebrow">Who builds CV Mind</span>
            <h2>Manav Tiwari</h2>
            <p>Designer and engineer behind CV Mind. Feedback from people using it decides what gets built next, so if something is missing or doesn't work the way you expect, say so.</p>
            <div className="about-maker-links">
              <a className="rsc-link" href="https://www.manavtiwari.in" target="_blank" rel="noopener noreferrer">
                manavtiwari.in <ExternalLink size={14} />
              </a>
              <button type="button" className="rsc-link" onClick={() => setCurrentPage('contact')}>Send feedback</button>
            </div>
          </div>
        </section>

        <section className="about-cta">
          <h2>Your next application starts here</h2>
          <p>Check the resume you have for free, or build a new one in minutes.</p>
          <div className="rsc-cta-actions">
            <button type="button" className="rsc-btn about-cta-primary" onClick={() => setCurrentPage('resume-builder')}>Build a resume</button>
            <button type="button" className="rsc-btn about-cta-ghost" onClick={() => setCurrentPage('home')}>Check my resume</button>
          </div>
        </section>
      </div>
    </div>
  );
}

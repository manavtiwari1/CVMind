import { useEffect, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, ChevronDown, ExternalLink, Lock } from 'lucide-react';
import JobCard, { MatchBadge } from './JobCard';
import type { FinderJob } from './jobFinderApi';
import { API_BASE } from '../../lib/apiBase';
import { urlForPage } from '../../lib/hosts';
import './JobFinder.css';
import './JobFinderLanding.css';

interface JobFinderLandingProps {
  setCurrentPage: (page: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

// Sample cards for the hero, drawn with the app's own JobCard. The companies are made up.
const SAMPLE_JOBS: FinderJob[] = [
  {
    jobKey: 'sample-1', source: 'greenhouse', title: 'Frontend Engineer', company: 'Northwind Labs', companyDomain: '', companyLogo: '',
    location: 'Bengaluru, India', remote: false, employmentType: 'Full-time', postedAt: daysAgo(1), publisher: '', applyUrl: '',
    appliesInCvmind: false, snippet: '', appliedAt: null,
    match: { score: 86, matchedSkills: ['react', 'typescript', 'css', 'rest api'], missingSkills: ['graphql'] }
  },
  {
    jobKey: 'sample-2', source: 'jsearch', title: 'React Developer', company: 'Kestrel Pay', companyDomain: '', companyLogo: '',
    location: 'Remote', remote: true, employmentType: 'Full-time', postedAt: daysAgo(3), publisher: 'LinkedIn', applyUrl: '',
    appliesInCvmind: false, snippet: '', appliedAt: daysAgo(2),
    match: { score: 71, matchedSkills: ['react', 'javascript', 'redux'], missingSkills: ['next.js', 'jest'] }
  },
  {
    jobKey: 'sample-3', source: 'jsearch', title: 'Senior UI Engineer', company: 'Halcyon Health', companyDomain: '', companyLogo: '',
    location: 'Pune, India', remote: false, employmentType: 'Full-time', postedAt: daysAgo(6), publisher: 'Naukri', applyUrl: '',
    appliesInCvmind: false, snippet: '', appliedAt: null,
    match: { score: 48, matchedSkills: ['react', 'css'], missingSkills: ['angular', 'rxjs', 'figma'] }
  }
];

const STEPS = [
  { title: 'Add your resume', text: 'Upload a PDF or Word file, or pick a resume you built in CVMind. Then tell us the roles, cities and kind of work you want.' },
  { title: 'See jobs ranked for you', text: 'Every job gets a match score against your resume, with the skills you have and the ones the posting asks for that you don\'t list.' },
  { title: 'Apply on the company\'s site', text: 'Apply opens the real application in a new tab. Tell us once you\'ve sent it, and if the same job turns up again you\'ll see the date you applied.' }
];

const SOURCES = [
  { name: 'Job sites', text: 'Listings from LinkedIn, Indeed, Naukri, Glassdoor and company sites, as gathered by Google for Jobs and Adzuna, in every field from IT to sales, finance and healthcare.' },
  { name: 'Company careers pages', text: 'Open roles published on the companies\' own job boards, with the apply link straight to their form.' },
  { name: 'Recruiters on CVMind', text: 'Jobs posted on the CVMind Company Portal. For these, Apply sends your resume to the recruiter directly.' }
];

const SCORE_PARTS = [
  { label: 'Skills', text: 'The skills named in the posting that your resume shows. This counts the most.' },
  { label: 'Role', text: 'How close the job title is to the roles you said you want.' },
  { label: 'Level', text: 'Whether the posting\'s seniority (intern, senior, lead…) fits your experience.' },
  { label: 'Place', text: 'Whether the city or remote setup matches what you picked.' }
];

const FAQS = [
  { q: 'Is AI Job Finder free?', a: 'You can try it free with a CVMind account: search jobs (10 searches a day use every job source) and apply to 1 job a month. CVMind Pro removes both limits.' },
  { q: 'Does CVMind apply for me?', a: 'Not yet. You apply on the company\'s own page, which opens in a new tab. Auto Apply, which fills the form for you, is coming soon. For jobs posted by recruiters on CVMind, Apply sends them your resume.' },
  { q: 'How is the match score worked out?', a: 'From the skills in the posting compared with the skills on your resume, plus the role, level and place you asked for. It is a guide to what to look at first, not a prediction of whether you will be shortlisted.' },
  { q: 'Do you track what happens after I apply?', a: 'No. After you open a job\'s application we ask whether you applied. If you say yes, we save the job and the date, so it shows "Applied" when it turns up again. Replies from the company go to your email as usual.' },
  { q: 'What do you store?', a: 'Your resume and search preferences, and the jobs you told us you applied to, with the date. Deleting your account removes them.' }
];

function openApp() {
  window.open(urlForPage('job-finder'), '_blank', 'noopener,noreferrer');
}

export default function JobFinderLanding({ setCurrentPage }: JobFinderLandingProps) {
  const [companies, setCompanies] = useState<string[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Edge-to-edge page: lift the default content width cap while mounted
  useEffect(() => {
    const main = document.querySelector('.main-content') as HTMLElement | null;
    if (!main) return;
    main.style.maxWidth = 'none';
    main.style.padding = '0';
    main.style.margin = '0';
    return () => {
      main.style.maxWidth = '';
      main.style.padding = '';
      main.style.margin = '';
    };
  }, []);

  // The companies whose careers pages are searched, straight from the server's list
  useEffect(() => {
    fetch(`${API_BASE}/api/jobs/search?q=`)
      .then((res) => res.json())
      .then((body) => { if (Array.isArray(body?.companies)) setCompanies(body.companies); })
      .catch(() => {});
  }, []);

  return (
    <div className="jfl-page">
      {/* ── HERO ─────────────────────────────────────────── */}
      <header className="jfl-hero">
        <div className="jfl-hero-copy">
          <p className="jfl-kicker">AI Job Finder · free to try</p>
          <h1 className="jfl-h1">Real jobs, <span className="jfl-mark">ranked</span> against your resume.</h1>
          <p className="jfl-lead">
            Search live openings from job sites, company careers pages and recruiters on CVMind. Each one shows how well
            it fits your resume and which skills it asks for that you don't list.
          </p>
          <div className="jfl-actions">
            <button type="button" className="jfl-btn jfl-btn--solid" id="btn-job-finder-hero" onClick={openApp}>
              Start finding jobs <ExternalLink size={15} />
            </button>
            <button type="button" className="jfl-btn jfl-btn--text" onClick={() => setCurrentPage('pricing')}>
              See Pro plans <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <div className="jfl-hero-visual">
          <div className="jf-app jfl-preview" aria-hidden="true" inert>
            {SAMPLE_JOBS.map((job) => (
              <JobCard key={job.jobKey} job={job} selected={false} onOpen={() => {}} onApply={() => {}} />
            ))}
          </div>
          <p className="jfl-caption">Sample cards with made-up companies. Your list comes from live jobs.</p>
        </div>
      </header>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="jfl-section">
        <h2 className="jfl-h2">How it works</h2>
        <ol className="jfl-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="jfl-step">
              <span className="jfl-step-no">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── SOURCES ──────────────────────────────────────── */}
      <section className="jfl-section jfl-section--split">
        <div>
          <h2 className="jfl-h2">Where the jobs come from</h2>
          <p className="jfl-sub">Three sources in one search. The same opening listed twice is shown once, from the most direct source.</p>
        </div>
        <dl className="jfl-sources">
          {SOURCES.map((s) => (
            <div key={s.name} className="jfl-source">
              <dt>{s.name}</dt>
              <dd>{s.text}</dd>
            </div>
          ))}
          {companies.length > 0 && (
            <div className="jfl-source">
              <dt>Careers pages we read</dt>
              <dd className="jfl-companies">
                {companies.slice(0, 40).map((c) => <span key={c}>{c}</span>)}
                {companies.length > 40 && <span className="jfl-more">and {companies.length - 40} more</span>}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* ── MATCH SCORE ──────────────────────────────────── */}
      <section className="jfl-section jfl-section--split">
        <div>
          <h2 className="jfl-h2">What the score means</h2>
          <p className="jfl-sub">No AI guesswork: the score comes from what the posting says and what your resume and choices say.</p>
          <div className="jf-app jfl-score-demo" aria-hidden="true">
            <MatchBadge score={86} large />
            <MatchBadge score={58} large />
            <MatchBadge score={31} large />
          </div>
        </div>
        <dl className="jfl-parts">
          {SCORE_PARTS.map((p) => (
            <div key={p.label} className="jfl-part">
              <dt>{p.label}</dt>
              <dd>{p.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── ALREADY APPLIED ──────────────────────────────── */}
      <section className="jfl-section jfl-section--split">
        <div>
          <h2 className="jfl-h2">Never apply to the same job twice</h2>
          <p className="jfl-sub">
            Jobs stay listed for weeks, so the one you applied to last Tuesday shows up again. When you come back from a
            company's page, Job Finder asks if you applied, remembers it for your account, and tells you before you open that job again.
          </p>
        </div>
        <div className="jf-app jfl-dialog-demo" aria-hidden="true">
          <div className="jf-dialog">
            <span className="jf-dialog-icon"><CheckCircle2 size={24} /></span>
            <h2>You already applied to this job</h2>
            <p>You marked <b>React Developer</b> at <b>Kestrel Pay</b> as applied on 8 Oct 2026.</p>
            <div className="jf-dialog-actions">
              <span className="jf-btn jf-btn--ghost">Cancel</span>
              <span className="jf-btn jf-btn--primary">Open it anyway <ExternalLink size={15} /></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── AUTO APPLY (SOON) ────────────────────────────── */}
      <section className="jfl-soon">
        <Bot size={22} />
        <div>
          <h2>Auto Apply <span className="jfl-soon-tag"><Lock size={11} /> Coming soon</span></h2>
          <p>A tailored resume and the application form filled in for you, which you check before it's sent. Until then, Apply takes you to the company's form.</p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="jfl-section">
        <h2 className="jfl-h2">Questions</h2>
        <div className="jfl-faq">
          {FAQS.map((f, i) => (
            <div key={f.q} className={`jfl-faq-item${openFaq === i ? ' is-open' : ''}`}>
              <button type="button" className="jfl-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                {f.q}
                <ChevronDown size={18} />
              </button>
              {openFaq === i && <p className="jfl-faq-a">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── CLOSING ──────────────────────────────────────── */}
      <section className="jfl-close">
        <h2>Your next application, without the endless scrolling.</h2>
        <div className="jfl-actions">
          <button type="button" className="jfl-btn jfl-btn--light" id="btn-job-finder-bottom" onClick={openApp}>
            Start finding jobs <ExternalLink size={15} />
          </button>
          <button type="button" className="jfl-btn jfl-btn--text jfl-btn--on-dark" onClick={() => setCurrentPage('pricing')}>
            Compare Pro plans <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

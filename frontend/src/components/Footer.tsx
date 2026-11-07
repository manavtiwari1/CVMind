import cvmindLogo from '../assets/cvmind_logo_transparent.png';
import { SOCIALS } from '../data/socials';
import PageLink from './PageLink';
import './Footer.css';

interface FooterProps {
  setCurrentPage: (page: string) => void;
}

interface FooterLink {
  label: string;
  page: string;
  highlight?: boolean;
}

// Every page below is a route the app already serves (VALID_PAGES in lib/routes.ts). These are
// real links, so they are how search engines find and weigh the rest of the site.
const TOOLS_LEFT: FooterLink[] = [
  { label: 'Create Resume', page: 'resume-builder', highlight: true },
  { label: 'ATS Resume Checker', page: 'home' },
  { label: 'One-click Resume Tailor', page: 'tailor' },
  { label: 'AI Proofreading', page: 'proofreading' },
  { label: 'Portfolio Generator', page: 'portfolio-gen' },
  { label: 'LinkedIn Profile Audit', page: 'linkedin' },
];

const TOOLS_RIGHT: FooterLink[] = [
  { label: 'Interview Prep AI', page: 'prep' },
  { label: 'Voice Prep AI', page: 'voice-prep' },
  { label: 'AI Job Finder', page: 'ai-job-finder' },
  { label: 'Auto Apply Agent', page: 'auto-apply' },
  { label: 'CVMind Code', page: 'code' },
  { label: 'Learn with Leo', page: 'ai-tutor' },
];

const RESUME: FooterLink[] = [
  { label: 'Resume Builder & CV Maker', page: 'resume-builder' },
  { label: 'Resume Templates', page: 'resume-editor' },
  { label: 'Pricing', page: 'pricing' },
];

const COVER_LETTER: FooterLink[] = [
  { label: 'Cover Letter Builder', page: 'cover-letter-builder' },
  { label: 'AI Cover Letter Generator', page: 'cover-letter-generator' },
];

const GUIDES: FooterLink[] = [
  { label: 'ATS-friendly resume guide', page: 'how-to-create-an-ats-friendly-resume' },
  { label: 'Resume keywords guide', page: 'resume-keywords-guide' },
  { label: 'ATS resume checklist', page: 'ats-resume-checklist' },
  { label: 'Resume format for freshers', page: 'resume-format-for-freshers' },
  { label: 'Resume mistakes to avoid', page: 'resume-mistakes-to-avoid' },
];

// The Help Desk is the Help Center, which also holds the contact form
const RESOURCES: FooterLink[] = [
  { label: 'Help Desk', page: 'help-center' },
  { label: 'Blog', page: 'blog' },
  { label: 'FAQs', page: 'faq' },
  { label: 'About Us', page: 'about' },
];

const COMPANY: FooterLink[] = [
  { label: 'About Us', page: 'about' },
  { label: 'Help Desk', page: 'help-center' },
  { label: 'Blog', page: 'blog' },
  { label: 'FAQs', page: 'faq' },
];

const LEGAL: FooterLink[] = [
  { label: 'Privacy Policy', page: 'privacy' },
  { label: 'Terms and Conditions', page: 'terms' },
  { label: 'Refunds', page: 'refund-policy' },
  { label: 'Disclaimer', page: 'disclaimer' },
  { label: 'Copyright Policy', page: 'copyright-policy' },
];


export default function Footer({ setCurrentPage }: FooterProps) {
  const year = new Date().getFullYear();

  const renderLinks = (links: FooterLink[]) =>
    links.map((l) => (
      <li key={`${l.page}-${l.label}`}>
        <PageLink page={l.page} onNavigate={setCurrentPage} className={`ft-link${l.highlight ? ' ft-link--accent' : ''}`}>
          {l.label}
        </PageLink>
      </li>
    ));

  return (
    <footer className="ft">
      <div className="ft-inner">
        <nav className="ft-cols" aria-label="Footer">
          <div className="ft-col ft-col--wide">
            <h4 className="ft-heading">Tools &amp; Features</h4>
            <div className="ft-subcols">
              <ul className="ft-list">{renderLinks(TOOLS_LEFT)}</ul>
              <ul className="ft-list">{renderLinks(TOOLS_RIGHT)}</ul>
            </div>
          </div>

          <div className="ft-col">
            <h4 className="ft-heading">Resume</h4>
            <ul className="ft-list">{renderLinks(RESUME)}</ul>
            <h4 className="ft-heading ft-heading--spaced">Resources</h4>
            <ul className="ft-list">{renderLinks(RESOURCES)}</ul>
          </div>

          <div className="ft-col">
            <h4 className="ft-heading">Guides</h4>
            <ul className="ft-list">{renderLinks(GUIDES)}</ul>
            <h4 className="ft-heading ft-heading--spaced">Cover Letter</h4>
            <ul className="ft-list">{renderLinks(COVER_LETTER)}</ul>
          </div>
        </nav>

        <div className="ft-mid">
          <p className="ft-note">Free ATS check, no account needed. Upload a PDF, DOCX or TXT resume and see your score in seconds.</p>
          <div className="ft-cta">
            <PageLink page="home" onNavigate={setCurrentPage} className="ft-pill">Check my resume</PageLink>
            <PageLink page="resume-builder" onNavigate={setCurrentPage} className="ft-pill ft-pill--solid">Build a resume</PageLink>
          </div>
        </div>

        {/* Mobile apps: not in the stores yet, so the badges are labels, not links */}
        <div className="ft-apps">
          <div className="ft-apps-head">
            <span className="ft-apps-label">Apps</span>
            <span className="ft-apps-soon">Coming soon</span>
          </div>
          <div className="ft-apps-badges">
            <span className="ft-store" aria-label="App Store, coming soon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 3 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.8 1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.7-4.1zM14.1 5.6c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.3z" /></svg>
              <span><small>Download on the</small>App Store</span>
            </span>
            <span className="ft-store" aria-label="Google Play, coming soon">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 2.6 13.6 12 4 21.4c-.4-.2-.6-.6-.6-1.1V3.7c0-.5.2-.9.6-1.1z" fill="#2dc08d" />
                <path d="m16.7 8.9-3.1 3.1L4 2.6l.3-.1c.4-.1.8 0 1.1.2l11.3 6.2z" fill="#5b8def" />
                <path d="m16.7 15.1-11.3 6.2c-.3.2-.7.3-1.1.2L4 21.4l9.6-9.4 3.1 3.1z" fill="#ef5b5b" />
                <path d="m20.3 10.9-3.6-2-3.1 3.1 3.1 3.1 3.6-2c.8-.5.8-1.7 0-2.2z" fill="#f5b83d" />
              </svg>
              <span><small>Get it on</small>Google Play</span>
            </span>
          </div>
          <p className="ft-apps-note">Desktop, phone and tablet: the website works on all of them today.</p>
        </div>

        <div className="ft-rule" />

        <div className="ft-bar">
          <ul className="ft-bar-links">{renderLinks(COMPANY)}</ul>
          <ul className="ft-bar-links">{renderLinks(LEGAL)}</ul>
        </div>

        <div className="ft-base">
          <div className="ft-brand">
            <img src={cvmindLogo} alt="CVMind" className="ft-logo" />
            <span>
              &copy; {year} CVMind. Designed and engineered by{' '}
              <a href="https://www.manavtiwari.in" target="_blank" rel="noopener noreferrer">Manav Tiwari</a>.
            </span>
          </div>
          <div className="ft-socials">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="ft-social" aria-label={s.label} title={s.label}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

import cvmindLogo from '../assets/cvmind_logo_transparent.png';
import { SOCIALS } from '../data/socials';
import './Footer.css';

interface FooterProps {
  setCurrentPage: (page: string) => void;
}

interface FooterLink {
  label: string;
  page: string;
  highlight?: boolean;
}

// Every page below is a route the app already serves (see validPages in App.tsx).
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
  { label: 'AI Job Finder', page: 'job-finder' },
  { label: 'Auto Apply Agent', page: 'auto-apply' },
  { label: 'CVMind Code', page: 'code' },
];

const RESUME: FooterLink[] = [
  { label: 'Resume Builder', page: 'resume-builder' },
  { label: 'Resume & Cover Letter Templates', page: 'resume-editor' },
  { label: 'Pricing', page: 'pricing' },
];

const GUIDES: FooterLink[] = [
  { label: 'ATS-friendly resume guide', page: 'how-to-create-an-ats-friendly-resume' },
  { label: 'Resume keywords guide', page: 'resume-keywords-guide' },
  { label: 'ATS resume checklist', page: 'ats-resume-checklist' },
  { label: 'Resume format for freshers', page: 'resume-format-for-freshers' },
  { label: 'Resume mistakes to avoid', page: 'resume-mistakes-to-avoid' },
];

const RESOURCES: FooterLink[] = [
  { label: 'Blog', page: 'blog' },
  { label: "FAQ's", page: 'faq' },
  { label: 'About Us', page: 'about' },
  { label: 'Contact Us', page: 'contact' },
];

const COMPANY: FooterLink[] = [
  { label: 'About', page: 'about' },
  { label: 'Contact', page: 'contact' },
  { label: 'Blog', page: 'blog' },
];

const LEGAL: FooterLink[] = [
  { label: 'Privacy Policy', page: 'privacy' },
  { label: 'Terms of Service', page: 'terms' },
  { label: 'Refund Policy', page: 'refund-policy' },
  { label: 'Disclaimer', page: 'disclaimer' },
  { label: 'Copyright Policy', page: 'copyright-policy' },
];


export default function Footer({ setCurrentPage }: FooterProps) {
  const year = new Date().getFullYear();

  const renderLinks = (links: FooterLink[]) =>
    links.map((l) => (
      <li key={`${l.page}-${l.label}`}>
        <button type="button" className={`ft-link${l.highlight ? ' ft-link--accent' : ''}`} onClick={() => setCurrentPage(l.page)}>
          {l.label}
        </button>
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
          </div>
        </nav>

        <div className="ft-mid">
          <p className="ft-note">Free ATS check, no account needed. Upload a PDF, DOCX or TXT resume and see your score in seconds.</p>
          <div className="ft-cta">
            <button type="button" className="ft-pill" onClick={() => setCurrentPage('home')}>Check my resume</button>
            <button type="button" className="ft-pill ft-pill--solid" onClick={() => setCurrentPage('resume-builder')}>Build a resume</button>
          </div>
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

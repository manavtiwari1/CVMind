import cvmindLogo from '../assets/cvmind_logo_transparent.png';
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
  { label: 'Voice Practice AI', page: 'voice-prep' },
  { label: 'AI Job Finder', page: 'job-finder' },
  { label: 'Auto Apply Agent', page: 'auto-apply' },
  { label: 'AI Career Copilot', page: 'career-copilot' },
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

const SOCIALS = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/cv-mind-ai/',
    path: 'M20.447 20.452H16.89v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a1.98 1.98 0 0 1-1.981-1.98c0-1.094.887-1.981 1.981-1.981s1.98.887 1.98 1.98a1.98 1.98 0 0 1-1.98 1.981zm1.958 13.019H3.379V9h3.916v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'X (Twitter)',
    href: 'https://x.com/ManavAneja13',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/cvmind.in?igsh=bDFsNm56bm55MTN6&utm_source=qr',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  },
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

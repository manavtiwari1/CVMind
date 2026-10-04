import { useState, useEffect } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { 
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from './ui/navigation-menu';
import NotificationBell from './NotificationBell';
import NavMegaMenu from './NavMegaMenu';
import { NAV_MENUS } from './navMenus';
import cvmindIcon from '../assets/cvmind_icon.png';
import type { LoadedWork } from '../types/api';
import './Navbar.css';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  customApiKey: string;
  setCustomApiKey: (key: string) => void;
  isLoggedIn: boolean;
  setShowAuthModal: (show: boolean) => void;
  handleSignOut: () => void;
  setLoadedWork: (work: LoadedWork | null) => void;
}

export default function Navbar({ 
  currentPage, 
  setCurrentPage, 
  isLoggedIn, 
  setShowAuthModal, 
  handleSignOut,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileLinkedInOpen, setMobileLinkedInOpen] = useState(false);
  const [mobileCareerOpen, setMobileCareerOpen] = useState(false);
  const [mobileCareerAiOpen, setMobileCareerAiOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);

  // Scroll shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer when the page changes from elsewhere (back button, footer link)
  const [drawerPage, setDrawerPage] = useState(currentPage);
  if (drawerPage !== currentPage) {
    setDrawerPage(currentPage);
    setMobileOpen(false);
  }

  // While the drawer is open: Escape closes it, the page behind doesn't scroll, and widening past the mobile breakpoint closes it
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    const desktop = window.matchMedia('(min-width: 901px)');
    const onWide = () => { if (desktop.matches) setMobileOpen(false); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onWide);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onWide);
    };
  }, [mobileOpen]);

  const go = (page: string) => {
    setCurrentPage(page);
    setMobileOpen(false);
  };

  return (
    <>
      <header className={`navbar-header${scrolled ? ' scrolled' : ''}`}>
      <div className="navbar-container">

        {/* Brand / Logo */}
        <button type="button" className="navbar-brand" onClick={() => go('home')} aria-label="CVMind home">
          <img src={cvmindIcon} alt="" className="navbar-logo-img" />
          <span className="navbar-brand-name">CVMind</span>
        </button>

        {/* Center Navigation: 4 clean items */}
        <div className="navbar-nav" style={{ display: 'flex', alignItems: 'center' }}>
          <NavigationMenu viewport={false}>
            <NavigationMenuList>

              {NAV_MENUS.map((menu) => (
                <NavMegaMenu key={menu.label} menu={menu} currentPage={currentPage} onNavigate={go} />
              ))}

              {/* Pricing: paid plans aren't live yet. CVMind Code is under AI Tools */}
              <NavigationMenuItem>
                <button
                  onClick={() => go('pricing')}
                  className={`nav-link${currentPage === 'pricing' ? ' active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  Pricing
                  <span className="nm-badge nm-badge--soon">COMING SOON</span>
                </button>
              </NavigationMenuItem>

            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right actions */}
        <div className="navbar-actions">
          {isLoggedIn ? (
            <>
              <NotificationBell setCurrentPage={setCurrentPage} />
              <button className="navbar-cta" onClick={() => go('my-documents')}>
                My Documents
              </button>
            </>
          ) : (
            <>
              <button
                className="navbar-login-link navbar-signin"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In
              </button>
              <button
                className="navbar-cta"
                onClick={() => go('resume-builder')}
              >
                Get Started
              </button>
            </>
          )}
          {/* Mobile menu toggle */}
          <button
            className="mobile-menu-toggle nav-link"
            onClick={() => setMobileOpen(v => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="navbar-mobile-drawer"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

      </div>

      {/* Premium Sliding Frosted Glass Mobile Menu Drawer */}
      <nav id="navbar-mobile-drawer" className={`navbar-mobile-drawer ${mobileOpen ? 'open' : ''}`} aria-label="Mobile">
        {/* Static nav links */}
        {[
          { label: 'Home', page: 'home' },
          { label: 'Dashboard', page: 'dashboard' },
          { label: 'Resume Builder', page: 'resume-builder' },
        ].map(({ label, page }) => (
          <button
            key={label}
            className={`mobile-drawer-link${currentPage === page ? ' active' : ''}`}
            onClick={() => go(page)}
          >
            {label}
          </button>
        ))}

        {/* Products Accordion */}
        <div className="mobile-accordion">
          <button
            className={`mobile-accordion-trigger${mobileProductsOpen ? ' open' : ''}`}
            onClick={() => setMobileProductsOpen(v => !v)}
            aria-expanded={mobileProductsOpen}
          >
            <span>Products</span>
            <ChevronDown size={14} className={`mobile-accordion-arrow${mobileProductsOpen ? ' rotated' : ''}`} />
          </button>

          {mobileProductsOpen && (
            <div className="mobile-accordion-content">
              {/* Direct items */}
              <button
                className={`mobile-drawer-link mobile-sub-link${currentPage === 'home' ? ' active' : ''}`}
                onClick={() => go('home')}
              >
                AI Resume Analyzer
              </button>
              <button
                className={`mobile-drawer-link mobile-sub-link${currentPage === 'tailor' ? ' active' : ''}`}
                onClick={() => go('tailor')}
              >
                AI Resume Tailorer
              </button>
              <button
                className={`mobile-drawer-link mobile-sub-link${currentPage === 'portfolio-gen' ? ' active' : ''}`}
                onClick={() => go('portfolio-gen')}
              >
                Portfolio Generator
              </button>
              <button
                className={`mobile-drawer-link mobile-sub-link${currentPage === 'job-finder' ? ' active' : ''}`}
                onClick={() => go('job-finder')}
              >
                AI Job Finder
              </button>
              <button
                className={`mobile-drawer-link mobile-sub-link${currentPage === 'auto-apply' ? ' active' : ''}`}
                onClick={() => go('auto-apply')}
              >
                Auto Apply Agent (Soon)
              </button>
              <button
                className={`mobile-drawer-link mobile-sub-link${['code', 'cvmind-code', 'code-arena'].includes(currentPage) ? ' active' : ''}`}
                onClick={() => go('code')}
              >
                CVMind Code ⚡
              </button>

              {/* SmartPrep AI sub-accordion */}
              <div className="mobile-sub-accordion">
                <button
                  className={`mobile-sub-accordion-trigger${mobileLinkedInOpen ? ' open' : ''}`}
                  aria-expanded={mobileLinkedInOpen}
                  onClick={() => setMobileLinkedInOpen(v => !v)}
                >
                  <span>SmartPrep AI</span>
                  <ChevronDown size={12} className={`mobile-accordion-arrow${mobileLinkedInOpen ? ' rotated' : ''}`} />
                </button>
                {mobileLinkedInOpen && (
                  <div className="mobile-sub-accordion-content">
                    <button className={`mobile-drawer-link mobile-sub-sub-link${currentPage === 'prep' ? ' active' : ''}`} onClick={() => go('prep')}>
                      Interview Prep AI
                    </button>
                    <button className={`mobile-drawer-link mobile-sub-sub-link${currentPage === 'voice-prep' ? ' active' : ''}`} onClick={() => go('voice-prep')}>
                      Voice Prep AI
                    </button>
                    <button className={`mobile-drawer-link mobile-sub-sub-link${currentPage === 'proofreading' ? ' active' : ''}`} onClick={() => go('proofreading')}>
                      AI Proofreading
                    </button>
                  </div>
                )}
              </div>

              {/* LinkedIn Optimizer sub-accordion */}
              <div className="mobile-sub-accordion">
                <button
                  className={`mobile-sub-accordion-trigger${mobileCareerOpen ? ' open' : ''}`}
                  aria-expanded={mobileCareerOpen}
                  onClick={() => setMobileCareerOpen(v => !v)}
                >
                  <span>LinkedIn Optimizer</span>
                  <ChevronDown size={12} className={`mobile-accordion-arrow${mobileCareerOpen ? ' rotated' : ''}`} />
                </button>
                {mobileCareerOpen && (
                  <div className="mobile-sub-accordion-content">
                    <button className={`mobile-drawer-link mobile-sub-sub-link${currentPage === 'linkedin' ? ' active' : ''}`} onClick={() => go('linkedin')}>
                      Profile PDF Audit
                    </button>
                    <button className={`mobile-drawer-link mobile-sub-sub-link${currentPage === 'linkedin-bio' ? ' active' : ''}`} onClick={() => go('linkedin-bio')}>
                      Bio &amp; Banner Generator
                    </button>
                    <button className={`mobile-drawer-link mobile-sub-sub-link${currentPage === 'linkedin-outreach' ? ' active' : ''}`} onClick={() => go('linkedin-outreach')}>
                      Outreach &amp; DM Writer
                    </button>
                    <button className={`mobile-drawer-link mobile-sub-sub-link${currentPage === 'linkedin-post' ? ' active' : ''}`} onClick={() => go('linkedin-post')}>
                      Post Generator
                    </button>
                  </div>
                )}
              </div>

              {/* Career Path AI sub-accordion */}
              <div className="mobile-sub-accordion">
                <button
                  className={`mobile-sub-accordion-trigger${mobileCareerAiOpen ? ' open' : ''}`}
                  aria-expanded={mobileCareerAiOpen}
                  onClick={() => setMobileCareerAiOpen(v => !v)}
                >
                  <span>Career Path AI</span>
                  <ChevronDown size={12} className={`mobile-accordion-arrow${mobileCareerAiOpen ? ' rotated' : ''}`} />
                </button>
                {mobileCareerAiOpen && (
                  <div className="mobile-sub-accordion-content">
                    <button className={`mobile-drawer-link mobile-sub-sub-link${currentPage === 'career-courses' ? ' active' : ''}`} onClick={() => go('career-courses')}>
                      Skill Gaps &amp; Courses
                    </button>
                    <button className={`mobile-drawer-link mobile-sub-sub-link${currentPage === 'elevator-pitch' ? ' active' : ''}`} onClick={() => go('elevator-pitch')}>
                      Elevator Pitch Builder
                    </button>
                    <button className={`mobile-drawer-link mobile-sub-sub-link${currentPage === 'career-roadmap' ? ' active' : ''}`} onClick={() => go('career-roadmap')}>
                      Interactive Career Roadmap
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Remaining links */}
        {[
          ...(isLoggedIn ? [{ label: 'My Documents', page: 'my-documents' }, { label: 'Account', page: 'account' }] : []),
          { label: 'Help Desk', page: 'help-center' },
          { label: 'About Us', page: 'about' },
          { label: 'FAQs', page: 'faq' },
          { label: 'Blog', page: 'blog' },
          { label: 'Privacy Policy', page: 'privacy' },
        ].map(({ label, page }) => (
          <button
            key={label}
            className={`mobile-drawer-link${currentPage === page ? ' active' : ''}`}
            onClick={() => go(page)}
          >
            {label}
          </button>
        ))}

        {/* Dynamic Mobile CTA */}
        <div style={{ height: '1px', background: '#e5e7eb', margin: '0.5rem 0' }}></div>
        {isLoggedIn ? (
          <button
            className="navbar-cta"
            style={{
              width: '100%',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.22)',
              padding: '0.65rem',
              boxShadow: 'none'
            }}
            onClick={() => {
              handleSignOut();
              setMobileOpen(false);
            }}
          >
            Log Out
          </button>
        ) : (
          <button
            className="navbar-cta"
            style={{ width: '100%', padding: '0.65rem' }}
            onClick={() => {
              setShowAuthModal(true);
              setMobileOpen(false);
            }}
          >
            Get Started for free
          </button>
        )}
      </nav>
    </header>
    </>
  );
}

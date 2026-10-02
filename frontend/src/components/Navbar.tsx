import { useState, useEffect } from 'react';
import { ChevronDown, Menu, X, Globe, Check } from 'lucide-react';
import { 
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from './ui/navigation-menu';
import NavMegaMenu from './NavMegaMenu';
import { NAV_MENUS } from './navMenus';
import cvmindIcon from '../assets/cvmind_icon.png';
import ContactDialog from './ContactDialog';
import { readUser, isProUser, USER_CHANGE_EVENT } from '../lib/currentUser';
import type { LoadedWork, StoredUser } from '../types/api';
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileLinkedInOpen, setMobileLinkedInOpen] = useState(false);
  const [mobileCareerOpen, setMobileCareerOpen] = useState(false);
  const [mobileCareerAiOpen, setMobileCareerAiOpen] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  // Sync user details reactively on login (adjusting state during render when isLoggedIn changes,
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [syncedLogin, setSyncedLogin] = useState<boolean | null>(null);
  if (isLoggedIn !== syncedLogin) {
    setSyncedLogin(isLoggedIn);
    setUser(isLoggedIn ? readUser() : null);
  }

  // Pick up profile edits made on the Account page (name, photo, plan)
  useEffect(() => {
    const sync = () => setUser(readUser());
    window.addEventListener(USER_CHANGE_EVENT, sync);
    return () => window.removeEventListener(USER_CHANGE_EVENT, sync);
  }, []);

  const [scrolled, setScrolled] = useState(false);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowDropdown(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Scroll shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (page: string) => {
    setCurrentPage(page);
    setMobileOpen(false);
  };

  return (
    <>
      <header className={`navbar-header${scrolled ? ' scrolled' : ''}`}>
      <div className="navbar-container">

        {/* Brand / Logo */}
        <div className="navbar-brand" onClick={() => go('home')}>
          <img src={cvmindIcon} alt="CVMind" className="navbar-logo-img" />
          <span className="navbar-brand-name">CVMind</span>
        </div>

        {/* Center Navigation — Enhancv style: 4 clean items */}
        <div className="navbar-nav" style={{ display: 'flex', alignItems: 'center' }}>
          <NavigationMenu viewport={false}>
            <NavigationMenuList>

              {NAV_MENUS.map((menu) => (
                <NavMegaMenu key={menu.label} menu={menu} currentPage={currentPage} onNavigate={go} />
              ))}

              {/* 5. CVmind Code */}
              <NavigationMenuItem>
                <button
                  onClick={() => go('code')}
                  className={`nav-link${['code', 'cvmind-code', 'code-arena'].includes(currentPage) ? ' active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'transparent', border: 'none' }}
                >
                  <span style={{ fontWeight: 600 }}>CVMind Code</span>
                </button>
              </NavigationMenuItem>

              {/* 6. Pricing */}
              <NavigationMenuItem>
                <button
                  onClick={() => go('pricing')}
                  className={`nav-link${currentPage === 'pricing' ? ' active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  Pricing
                </button>
              </NavigationMenuItem>

            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right actions */}
        <div className="navbar-actions">
          {isLoggedIn ? (
            <>
            <button className="navbar-login-link" onClick={() => go('dashboard')}>Dashboard</button>
            {!isProUser(user) && (
              <button className="nav-upgrade-btn" onClick={() => go('pricing')}>Upgrade</button>
            )}
            <div className="nav-profile-container" onClick={e => e.stopPropagation()}>
              <button
                className="nav-profile-trigger"
                onClick={() => { setShowDropdown(prev => !prev); setShowLanguages(false); }}
                aria-haspopup="menu"
                aria-expanded={showDropdown}
                title="Profile Menu"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="nav-profile-avatar" />
                ) : (
                  <div className="nav-profile-monogram">
                    {String(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDown size={16} className={`nav-profile-caret${showDropdown ? ' open' : ''}`} />
              </button>

              {showDropdown && (
                <div className="nav-profile-dropdown animate-scale-up" role="menu">
                  <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => { setShowDropdown(false); go('pricing'); }}>
                    Plans
                  </button>
                  <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => { setShowDropdown(false); go('account'); }}>
                    Account
                  </button>
                  <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => { setShowDropdown(false); go('help-center'); }}>
                    Help Center
                  </button>
                  <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => { setShowDropdown(false); setContactOpen(true); }}>
                    Contact Us
                  </button>
                  <button
                    role="menuitem"
                    className="nav-profile-dropdown-item"
                    aria-expanded={showLanguages}
                    onClick={() => setShowLanguages(v => !v)}
                  >
                    Language
                    <Globe size={16} className="nav-profile-dropdown-trail" />
                  </button>
                  {showLanguages && (
                    <div className="nav-language-list">
                      <div className="nav-language-option selected">
                        English <Check size={15} />
                      </div>
                      <div className="nav-language-note">More languages coming soon</div>
                    </div>
                  )}
                  <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => { setShowDropdown(false); handleSignOut(); }}>
                    Log Out
                  </button>
                </div>
              )}
            </div>
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
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

      </div>

      {/* Premium Sliding Frosted Glass Mobile Menu Drawer */}
      <div className={`navbar-mobile-drawer ${mobileOpen ? 'open' : ''}`}>
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
                className={`mobile-drawer-link mobile-sub-link${currentPage === 'career-copilot' ? ' active' : ''}`}
                onClick={() => go('career-copilot')}
              >
                AI Career Copilot 🧠
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
                  className={`mobile-sub-accordion-trigger${['prep','voice-prep','proofreading'].includes(currentPage) ? ' open' : ''}`}
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
                      Voice Practice AI
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
                  className={`mobile-sub-accordion-trigger${['linkedin','linkedin-bio','linkedin-outreach','linkedin-post'].includes(currentPage) ? ' open' : ''}`}
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
          ...(isLoggedIn ? [{ label: 'Account', page: 'account' }] : []),
          { label: 'Help Center', page: 'help-center' },
          { label: 'About CV Mind', page: 'about' },
          { label: 'Contact Support', page: 'contact' },
          { label: "FAQ's", page: 'faq' },
          { label: 'Blog', page: 'blog' },
          { label: 'Privacy', page: 'privacy' },
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
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }}></div>
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
      </div>
    </header>

    <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}

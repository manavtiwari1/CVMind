import { useState, useEffect } from 'react';
import { 
  ChevronDown, Menu, X, User, Briefcase, Mail, Settings,
  LogOut, Loader2, Trash2, Edit3, Sparkles, MapPin, Key, Lock, AlertCircle, FileText, Camera,
  Globe
} from 'lucide-react';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './ui/navigation-menu';
import cvmindIcon from '../assets/cvmind_icon.png';
import './Navbar.css';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  customApiKey: string;
  setCustomApiKey: (key: string) => void;
  isLoggedIn: boolean;
  setShowAuthModal: (show: boolean) => void;
  handleSignOut: () => void;
  setLoadedWork: (work: any) => void;
}

export default function Navbar({ 
  currentPage, 
  setCurrentPage, 
  isLoggedIn, 
  setShowAuthModal, 
  handleSignOut,
  setLoadedWork
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileLinkedInOpen, setMobileLinkedInOpen] = useState(false);
  const [mobileCareerOpen, setMobileCareerOpen] = useState(false);
  const [mobileCareerAiOpen, setMobileCareerAiOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'profile' | 'works' | 'settings' | 'delete-account' | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [user, setUser] = useState<any>(null);


  // Profile Modal Form States
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');

  // Password Modal Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Works State
  const [works, setWorks] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Sync user details reactively on login
  useEffect(() => {
    if (isLoggedIn) {
      const u = localStorage.getItem('cvmind_user');
      if (u) {
        try {
          const parsed = JSON.parse(u);
          setUser(parsed);
          setProfileName(parsed.name || '');
          setProfileEmail(parsed.email || '');
          setProfileAddress(parsed.address || '');
          setProfileAvatar(parsed.avatar || '');
        } catch {
          // ignore
        }
      }
    } else {
      setUser(null);
    }
  }, [isLoggedIn]);

  const [_activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowDropdown(false);
      setActiveSubmenu(null);
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

  const handleShareLink = (workId: string) => {
    const shareUrl = `${window.location.origin}/portfolio/${workId}`;
    navigator.clipboard.writeText(shareUrl);
    window.open(shareUrl, '_blank');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setModalError('Profile picture must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfileAvatar(String(event.target.result));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) {
      setModalError('Name and email are required.');
      return;
    }
    setModalLoading(true);
    setModalError('');
    setModalSuccess('');

    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    try {
      const response = await fetch(`${baseUrl}/api/user/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || user?._id,
          name: profileName.trim(),
          email: profileEmail.trim(),
          address: profileAddress.trim(),
          avatar: profileAvatar
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      localStorage.setItem('cvmind_user', JSON.stringify(data.user));
      setUser(data.user);
      setModalSuccess('Profile updated successfully!');
    } catch (err: any) {
      setModalError(err.message || 'An error occurred while updating profile.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setModalError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setModalError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalError('New passwords do not match.');
      return;
    }

    setModalLoading(true);
    setModalError('');
    setModalSuccess('');

    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    try {
      const response = await fetch(`${baseUrl}/api/user/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || user?._id,
          currentPassword: user?.isGoogleUser ? 'google-oauth-bypass' : currentPassword,
          newPassword
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password');

      if (user?.isGoogleUser) {
        const updatedUser = { ...user, isGoogleUser: false };
        localStorage.setItem('cvmind_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      setModalSuccess(data.message || 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setModalError(err.message || 'An error occurred while updating password.');
    } finally {
      setModalLoading(false);
    }
  };

  const fetchUserWorks = async () => {
    const userId = user?.id || user?._id;
    if (!userId) return;

    setModalLoading(true);
    setModalError('');

    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    try {
      const response = await fetch(`${baseUrl}/api/user/work/${userId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch works');

      setWorks(data.data || []);
    } catch (err: any) {
      setModalError(err.message || 'Failed to load works.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteWork = async (workId: string) => {
    const userId = user?.id || user?._id;
    if (!userId || !workId) return;

    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    try {
      const response = await fetch(`${baseUrl}/api/user/work/${userId}/${workId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete work');

      setWorks(prev => prev.filter(w => (w.id || w._id) !== workId));
      if (setLoadedWork) {
        setLoadedWork({ deleted: true, workId });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete work.');
    }
  };

  const handleDeleteAccount = async () => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    setDeleteLoading(true);
    setDeleteError('');
    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
    try {
      const res = await fetch(`${baseUrl}/api/user/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account.');
      setActiveModal(null);
      handleSignOut();
    } catch (err: any) {
      setDeleteError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
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

              {/* 1. Resume ▾ */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={`nav-link nav-link-trigger${['home','resume-builder','tailor','portfolio-gen'].includes(currentPage) ? ' active' : ''}`}
                >
                  Resume
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="nav-menu-grid-2cols" style={{ minWidth: '420px' }}>
                    <div className="nav-menu-column">
                      <span className="nav-menu-column-header">Build</span>
                      <NavigationMenuLink render={<button onClick={() => go('resume-builder')} />}>
                        <div className="font-medium">Resume Builder</div>
                        <div className="text-muted-foreground">Create a professional resume in minutes.</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('portfolio-gen')} />}>
                        <div className="font-medium">Portfolio Generator</div>
                        <div className="text-muted-foreground">Build a shareable portfolio site.</div>
                      </NavigationMenuLink>
                    </div>
                    <div className="nav-menu-column">
                      <span className="nav-menu-column-header">Optimize</span>
                      <NavigationMenuLink render={<button onClick={() => go('home')} />}>
                        <div className="font-medium">Resume Checker</div>
                        <div className="text-muted-foreground">Audit your ATS score & keywords.</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('tailor')} />}>
                        <div className="font-medium">Resume Tailorer</div>
                        <div className="text-muted-foreground">Match any job description instantly.</div>
                      </NavigationMenuLink>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* 2. AI Tools ▾ */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={`nav-link nav-link-trigger${['prep','voice-prep','job-finder','proofreading','auto-apply','career-copilot'].includes(currentPage) ? ' active' : ''}`}
                >
                  AI Tools
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="nav-menu-grid-2cols" style={{ minWidth: '440px' }}>
                    <div className="nav-menu-column">
                      <span className="nav-menu-column-header">Interview</span>
                      <NavigationMenuLink render={<button onClick={() => go('prep')} />}>
                        <div className="font-medium">Interview Prep AI</div>
                        <div className="text-muted-foreground">Behavioral & STAR coaching.</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('code')} />}>
                        <div className="font-medium" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          CVMind Code
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: '#fff', letterSpacing: '0.04em' }}>NEW</span>
                        </div>
                        <div className="text-muted-foreground">DSA practice, AI code judge & assessments.</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('voice-prep')} />}>
                        <div className="font-medium">Voice Practice AI</div>
                        <div className="text-muted-foreground">Real-time speaking feedback.</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('proofreading')} />}>
                        <div className="font-medium">AI Proofreading</div>
                        <div className="text-muted-foreground">Grammar, tone & power verbs.</div>
                      </NavigationMenuLink>
                    </div>
                    <div className="nav-menu-column">
                      <span className="nav-menu-column-header">Job Search</span>
                      <NavigationMenuLink render={<button onClick={() => go('job-finder')} />}>
                        <div className="font-medium">AI Job Finder</div>
                        <div className="text-muted-foreground">Curated roles matching your profile.</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('career-copilot')} />}>
                        <div className="font-medium" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          AI Career Copilot
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', background: 'linear-gradient(135deg,#2997ff,#bf5af2)', color: '#fff', letterSpacing: '0.04em' }}>NEW</span>
                        </div>
                        <div className="text-muted-foreground">9 AI agents managing your entire career.</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('auto-apply')} />}>
                        <div className="font-medium" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Auto Apply Agent
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', background: 'linear-gradient(135deg,#10b981,#34d399)', color: '#fff', letterSpacing: '0.04em' }}>UNLOCKED</span>
                        </div>
                        <div className="text-muted-foreground">AI applies to jobs for you automatically.</div>
                      </NavigationMenuLink>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* 3. LinkedIn & Career ▾ */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={`nav-link nav-link-trigger${['linkedin','linkedin-bio','linkedin-outreach','linkedin-post','career-courses','elevator-pitch','career-roadmap'].includes(currentPage) ? ' active' : ''}`}
                >
                  Career
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="nav-menu-grid-2cols" style={{ minWidth: '420px' }}>
                    <div className="nav-menu-column">
                      <span className="nav-menu-column-header">LinkedIn</span>
                      <NavigationMenuLink render={<button onClick={() => go('linkedin')} />}>
                        <div className="font-medium">Profile PDF Audit</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('linkedin-bio')} />}>
                        <div className="font-medium">Bio & Banner Generator</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('linkedin-outreach')} />}>
                        <div className="font-medium">Outreach & DM Writer</div>
                      </NavigationMenuLink>
                    </div>
                    <div className="nav-menu-column">
                      <span className="nav-menu-column-header">Career Path</span>
                      <NavigationMenuLink render={<button onClick={() => go('career-courses')} />}>
                        <div className="font-medium">Skill Gaps & Courses</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('elevator-pitch')} />}>
                        <div className="font-medium">Elevator Pitch Builder</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('career-roadmap')} />}>
                        <div className="font-medium">Career Roadmap</div>
                      </NavigationMenuLink>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* 4. Resources ▾ */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={`nav-link nav-link-trigger${['about','contact','faq','blog','privacy'].includes(currentPage) ? ' active' : ''}`}
                >
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="nav-menu-grid-2cols" style={{ minWidth: '420px' }}>
                    <div className="nav-menu-column">
                      <span className="nav-menu-column-header">Company</span>
                      <NavigationMenuLink render={<button onClick={() => go('about')} />}>
                        <div className="font-medium">About Us</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('contact')} />}>
                        <div className="font-medium">Contact Us</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('faq')} />}>
                        <div className="font-medium">FAQ's</div>
                      </NavigationMenuLink>
                    </div>
                    <div className="nav-menu-column">
                      <span className="nav-menu-column-header">More</span>
                      <NavigationMenuLink render={<button onClick={() => go('blog')} />}>
                        <div className="font-medium">Blog & Articles</div>
                      </NavigationMenuLink>
                      <NavigationMenuLink render={<button onClick={() => go('privacy')} />}>
                        <div className="font-medium">Privacy Policy</div>
                      </NavigationMenuLink>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* 5. CVmind Code */}
              <NavigationMenuItem>
                <button
                  onClick={() => go('code')}
                  className={`nav-link${['code', 'cvmind-code'].includes(currentPage) ? ' active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'transparent', border: 'none' }}
                >
                  <span style={{ fontWeight: 600 }}>CVMind Code</span>
                </button>
              </NavigationMenuItem>

              {/* 6. Company Portal (For Employers) */}
              <NavigationMenuItem>
                <button
                  onClick={() => go('company-portal')}
                  className={`nav-link${currentPage === 'company-portal' ? ' active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'transparent', border: 'none' }}
                >
                  <span>Company Portal</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', letterSpacing: '0.04em' }}>
                    EMPLOYERS
                  </span>
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
            <div className="nav-profile-container" onClick={e => e.stopPropagation()}>
              <button 
                className="nav-profile-trigger" 
                onClick={() => setShowDropdown(prev => !prev)}
                title="Profile Menu"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="nav-profile-avatar" />
                ) : (
                  <div className="nav-profile-monogram">
                    {String(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              
              {showDropdown && (
                <div className="nav-profile-dropdown animate-scale-up">
                  <div className="nav-profile-dropdown-header">
                    <span className="nav-profile-name">{user?.name}</span>
                    <span className="nav-profile-email">{user?.email}</span>
                  </div>
                  
                  <div className="nav-profile-dropdown-divider" />
                  
                  <button className="nav-profile-dropdown-item" onClick={() => { setShowDropdown(false); setModalError(''); setModalSuccess(''); setActiveModal('profile'); }}>
                    <User size={14} /> My Profile
                  </button>
                  
                  <button className="nav-profile-dropdown-item" onClick={() => { setShowDropdown(false); setModalError(''); setModalSuccess(''); fetchUserWorks(); setActiveModal('works'); }}>
                    <Briefcase size={14} /> My Works
                  </button>
                  
                  <button className="nav-profile-dropdown-item" onClick={() => { setShowDropdown(false); go('contact'); }}>
                    <Mail size={14} /> Contact Us
                  </button>
                  
                  <button className="nav-profile-dropdown-item" onClick={() => { setShowDropdown(false); setModalError(''); setModalSuccess(''); setActiveModal('settings'); }}>
                    <Settings size={14} /> Settings
                  </button>
                  
                  <div className="nav-profile-dropdown-divider" />

                  <button className="nav-profile-dropdown-item delete-account-item" onClick={() => { setShowDropdown(false); setDeleteConfirmText(''); setDeleteError(''); setActiveModal('delete-account'); }}>
                    <Trash2 size={14} /> Delete Account
                  </button>

                  <button className="nav-profile-dropdown-item signout-item" onClick={() => { setShowDropdown(false); handleSignOut(); }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
            </>
          ) : (
            <>
              <button
                className="navbar-login-link"
                onClick={() => setShowAuthModal(true)}
              >
                Log in
              </button>
              <button
                className="navbar-cta"
                onClick={() => go('resume-builder')}
              >
                Get Started for free
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
                Auto Apply Agent ✨
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
            Sign Out
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

    {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      
      {/* 1. My Profile Modal */}
      {activeModal === 'profile' && (
        <div className="nav-modal-overlay animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="nav-modal-card glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <button className="nav-modal-close" onClick={() => setActiveModal(null)} aria-label="Close modal">
              <X size={16} />
            </button>
            <div className="nav-modal-header">
              <Sparkles size={16} className="text-blue" />
              <h2 className="nav-modal-title">My Profile</h2>
              <p className="nav-modal-subtitle">View and update your personal profile details.</p>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="nav-modal-form">
              {/* Profile Photo Uploader */}
              <div className="nav-modal-avatar-uploader">
                {profileAvatar ? (
                  <img src={profileAvatar} alt={profileName} className="nav-profile-upload-preview" />
                ) : (
                  <div className="nav-profile-upload-monogram">
                    {String(profileName || profileEmail || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="avatar-uploader-actions">
                  <label className="btn-avatar-upload" htmlFor="avatar-file-input">
                    <Camera size={12} style={{ marginRight: '4px' }} /> Upload Photo
                    <input
                      id="avatar-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {profileAvatar && (
                    <button type="button" className="btn-avatar-remove" onClick={() => setProfileAvatar('')}>
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="auth-input-wrapper">
                  <User size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    className="form-input auth-field"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    className="form-input auth-field"
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address / Location</label>
                <div className="auth-input-wrapper">
                  <MapPin size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    className="form-input auth-field"
                    value={profileAddress}
                    onChange={e => setProfileAddress(e.target.value)}
                    placeholder="New Delhi, India"
                  />
                </div>
              </div>

              {modalError && (
                <div className="auth-alert error">
                  <AlertCircle size={14} className="auth-alert-icon" />
                  <span>{modalError}</span>
                </div>
              )}
              {modalSuccess && (
                <div className="auth-alert success">
                  <Sparkles size={14} className="auth-alert-icon" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <button type="submit" className="btn-primary auth-submit-btn" disabled={modalLoading}>
                {modalLoading ? <span className="auth-spinner"></span> : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Settings / Reset Password Modal */}
      {activeModal === 'settings' && (
        <div className="nav-modal-overlay animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="nav-modal-card glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <button className="nav-modal-close" onClick={() => setActiveModal(null)} aria-label="Close modal">
              <X size={16} />
            </button>
            <div className="nav-modal-header">
              <Key size={16} className="text-blue" />
              <h2 className="nav-modal-title">Reset Password</h2>
              <p className="nav-modal-subtitle">Keep your secure account access password updated.</p>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="nav-modal-form">
              {user?.isGoogleUser ? (
                <div className="auth-alert success" style={{ marginBottom: '0.5rem', background: 'rgba(41, 151, 255, 0.08)', color: 'var(--blue)' }}>
                  <Sparkles size={14} className="auth-alert-icon" />
                  <span>Google Signed In: Set a password below to enable password login.</span>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <div className="auth-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type="password"
                      className="form-input auth-field"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    className="form-input auth-field"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    className="form-input auth-field"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {modalError && (
                <div className="auth-alert error">
                  <AlertCircle size={14} className="auth-alert-icon" />
                  <span>{modalError}</span>
                </div>
              )}
              {modalSuccess && (
                <div className="auth-alert success">
                  <Sparkles size={14} className="auth-alert-icon" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <button type="submit" className="btn-primary auth-submit-btn" disabled={modalLoading}>
                {modalLoading ? <span className="auth-spinner"></span> : 'Update Account Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. My Works Modal */}
      {activeModal === 'works' && (
        <div className="nav-modal-overlay works-overlay animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="nav-modal-card works-card glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <button className="nav-modal-close" onClick={() => setActiveModal(null)} aria-label="Close modal">
              <X size={16} />
            </button>
            <div className="nav-modal-header">
              <Briefcase size={16} className="text-blue" />
              <h2 className="nav-modal-title">My Works</h2>
              <p className="nav-modal-subtitle">Your saved resumes and cover letters in one secure spot.</p>
            </div>
            
            <div className="works-list-container">
              {modalLoading ? (
                <div className="works-loading-state">
                  <Loader2 size={24} className="cl-spin text-blue" />
                  <span>Fetching your saved creations...</span>
                </div>
              ) : modalError ? (
                <div className="works-error-state">
                  <AlertCircle size={20} className="text-red" />
                  <span>{modalError}</span>
                </div>
              ) : works.length === 0 ? (
                <div className="works-empty-state">
                  <FileText size={32} className="text-tertiary" />
                  <span>No saved works found. Open Resume Builder to create some!</span>
                  <button className="btn-primary" style={{ marginTop: '1rem', width: 'auto', padding: '0.5rem 1.25rem' }} onClick={() => { setActiveModal(null); go('resume-builder'); }}>
                    Start Building
                  </button>
                </div>
              ) : (
                <div className="works-grid">
                  {works.map((w: any) => (
                    <div key={w.id || w._id} className="work-item-card">
                      <div className="work-card-top">
                        <span className={`work-type-badge ${w.type}`} style={{
                          background: w.type === 'prep' ? 'rgba(99,102,241,0.12)' : 
                                      w.type === 'linkedin-bio' ? 'rgba(41,151,255,0.12)' : 
                                      w.type === 'linkedin-outreach' ? 'rgba(41,151,255,0.12)' : 
                                      w.type === 'career-courses' ? 'rgba(16,185,129,0.12)' : 
                                      w.type === 'elevator-pitch' ? 'rgba(167,139,250,0.12)' : 
                                      w.type === 'career-roadmap' ? 'rgba(251,146,60,0.12)' : undefined,
                          color: w.type === 'prep' ? '#6366f1' : 
                                 w.type === 'linkedin-bio' ? '#2997ff' : 
                                 w.type === 'linkedin-outreach' ? '#2997ff' : 
                                 w.type === 'career-courses' ? '#10b981' : 
                                 w.type === 'elevator-pitch' ? '#a78bfa' : 
                                 w.type === 'career-roadmap' ? '#fb923c' : undefined
                        }}>
                          {w.type === 'cover-letter' ? 'Cover Letter' : 
                           w.type === 'linkedin' ? 'LinkedIn Audit' : 
                           w.type === 'linkedin-bio' ? 'LinkedIn Bio' : 
                           w.type === 'linkedin-outreach' ? 'Outreach DM' : 
                           w.type === 'career-courses' ? 'Skill Gaps' : 
                           w.type === 'elevator-pitch' ? 'Elevator Pitch' : 
                           w.type === 'career-roadmap' ? 'Roadmap AI' : 
                           w.type === 'prep' ? 'AI Prep' : 'Resume'}
                        </span>
                        <span className="work-date">
                          {new Date(w.updatedAt || w.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      
                      <h3 className="work-item-title" title={w.title}>{w.title}</h3>
                      <p className="work-item-meta">Template: <span className="highlight-pill">{w.templateId}</span></p>
                      
                      <div className="work-card-actions">
                        <button className="work-action-btn edit-btn" title="Open in Editor" onClick={() => {
                          setActiveModal(null);
                          setLoadedWork(w);
                          if (w.type === 'linkedin') {
                            go('linkedin');
                          } else if (w.type === 'linkedin-bio') {
                            go('linkedin-bio');
                          } else if (w.type === 'linkedin-outreach') {
                            go('linkedin-outreach');
                          } else if (w.type === 'career-courses') {
                            go('career-courses');
                          } else if (w.type === 'elevator-pitch') {
                            go('elevator-pitch');
                          } else if (w.type === 'career-roadmap') {
                            go('career-roadmap');
                          } else if (w.type === 'prep') {
                            go('prep');
                          } else {
                            go('resume-builder');
                          }
                        }}>
                          <Edit3 size={13} /> Open
                        </button>
                        
                        {w.type === 'resume' && (
                          <button 
                            className="work-action-btn share-btn" 
                            style={{ background: 'rgba(41,151,255,0.1)', color: 'var(--blue)', border: '1px solid rgba(41,151,255,0.2)' }}
                            title="Share Portfolio URL" 
                            onClick={() => handleShareLink(w.id || w._id)}
                          >
                            <Globe size={13} /> Share
                          </button>
                        )}

                        <button className="work-action-btn delete-btn" title="Delete Permanent" onClick={() => handleDeleteWork(w.id || w._id)}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Account Confirmation Modal */}
      {activeModal === 'delete-account' && (
        <div className="nav-modal-overlay animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="nav-modal-card delete-account-card glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <button className="nav-modal-close" onClick={() => setActiveModal(null)} aria-label="Close modal">
              <X size={16} />
            </button>
            <div className="nav-modal-header">
              <Trash2 size={18} className="delete-account-icon" />
              <h2 className="nav-modal-title" style={{ color: '#ef4444' }}>Delete Account</h2>
              <p className="nav-modal-subtitle">This action is <strong>permanent and irreversible</strong>. All your data — profile, works, history — will be deleted forever.</p>
            </div>
            <div className="delete-account-body">
              <p className="delete-account-label">Type <strong>DELETE</strong> to confirm:</p>
              <input
                className="delete-account-input"
                type="text"
                placeholder="Type DELETE here"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                autoComplete="off"
              />
              {deleteError && (
                <div className="nav-modal-error-bar">
                  <AlertCircle size={14} /> {deleteError}
                </div>
              )}
              <div className="delete-account-actions">
                <button className="delete-account-cancel-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button
                  className="delete-account-confirm-btn"
                  disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                  onClick={handleDeleteAccount}
                >
                  {deleteLoading ? <><Loader2 size={14} className="cl-spin" /> Deleting…</> : <><Trash2 size={14} /> Yes, Delete My Account</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

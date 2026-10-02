import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Account from './pages/Account';
import HelpCenter from './pages/HelpCenter';
import MyDocuments from './pages/MyDocuments';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Tailor from './pages/Tailor';
import Prep from './pages/Prep';
import CoverLetter from './pages/CoverLetter';
import LinkedIn from './pages/linkedin/LinkedIn';
import LinkedInBio from './pages/linkedin/LinkedInBio';
import LinkedInOutreach from './pages/linkedin/LinkedInOutreach';
import CareerCourses from './pages/career-path-ai/CareerCourses';
import ElevatorPitch from './pages/career-path-ai/ElevatorPitch';
import CareerRoadmap from './pages/career-path-ai/CareerRoadmap';
import Portfolio from './pages/Portfolio';
import Privacy from './pages/Privacy';
import FAQ from './pages/FAQ';
import Blog from './pages/Blog';
import LinkedInPost from './pages/linkedin/LinkedInPost';
import VoicePrep from './pages/VoicePrep';
import PortfolioGen from './pages/PortfolioGen';
import Products from './pages/Products';
// import JobFinder from './pages/JobFinder'; // temporarily disabled — restore with the job-finder case below
import ResumeBuilderLanding from './pages/ResumeBuilderLanding';
import Pricing from './pages/Pricing';
import AuthModal from './components/AuthModal';
import Terms from './pages/Terms';
import RefundPolicy from './pages/RefundPolicy';
import Disclaimer from './pages/Disclaimer';
import Proofreading from './pages/Proofreading';
import AutoApply from './pages/AutoApply';
import CompanyPortal from './pages/CompanyPortal';
import ArticleAtsResume from './pages/ArticleAtsResume';
import CopyrightPolicy from './pages/CopyrightPolicy';
import ArticlePage from './pages/ArticlePage';
import CVmindCode from './pages/code/CVmindCode';
import CVmindCodeLanding from './pages/code/CVmindCodeLanding';
import NotFound from './pages/NotFound';
import PageLoader from './components/PageLoader';
import { ARTICLES } from './data/articles';
import DigitalSerenityBackground from './components/DigitalSerenityBackground';
import { applySEO } from './utils/seo';
import { getErrorMessage } from './utils/errors';
import { APP_PAGES, PUBLIC_APP_PAGES, isAppHost, isCrossHost, isSplitHost, siteOrigin, urlForPage } from './lib/hosts';
import { clearSession, setSession } from './lib/session';
import { peekPickedTemplate } from './lib/templatePick';
import type { LoadedWork, ResumeAnalysis } from './types/api';
import './styles/theme.css';
import './styles/3d-effects.css';
import './styles/skeleton.css';

// How long the loading screen shows when moving to another page
const ROUTE_LOADER_MS = 450;

const VALID_PAGES = ['home', 'about', 'contact', 'dashboard', 'admin', 'tailor', 'prep', 'code', 'cvmind-code', 'code-arena', 'cvmind-code-arena', 'linkedin', 'linkedin-bio', 'linkedin-outreach', 'linkedin-post', 'career-courses', 'elevator-pitch', 'career-roadmap', 'resume-builder', 'resume-editor', 'privacy', 'faq', 'blog', 'voice-prep', 'portfolio-gen', 'products', 'job-finder', 'pricing', 'terms', 'refund-policy', 'disclaimer', 'proofreading', 'auto-apply', 'company-portal', 'copyright-policy', 'account', 'help-center', 'my-documents', ...ARTICLES.map(a => a.slug)];

// Sign-in addresses open the AuthModal over the home page
const AUTH_PATHS = ['/sign-in', '/sign-up', '/login'];

// The page an address shows: null for the site root, 'not-found' for anything the app doesn't serve
function pageFromPath(pathname: string): string | null {
  if (pathname.startsWith('/portfolio/')) return 'portfolio';
  if (AUTH_PATHS.includes(pathname)) return 'home';
  const page = pathname.replace(/^\/+|\/+$/g, '');
  if (!page || page === 'index.html') return null;
  return VALID_PAGES.includes(page) ? page : 'not-found';
}

export default function App() {
  const [currentPage, setCurrentPageState] = useState<string>(() => {
    const urlPage = pageFromPath(window.location.pathname);
    if (urlPage) return urlPage;
    // On cvmind.in the address always decides the page, so a remembered app page can't open on www
    const savedPage = isSplitHost() ? null : localStorage.getItem('cvmind_current_page');
    if (savedPage && VALID_PAGES.includes(savedPage)) {
      return savedPage;
    }
    return 'home';
  });

  const theme = 'light';

  // Loading screen between pages; started by navigation handlers, cleared by the timer below
  const [routeLoading, setRouteLoading] = useState(false);
  useEffect(() => {
    if (!routeLoading) return;
    const t = setTimeout(() => setRouteLoading(false), ROUTE_LOADER_MS);
    return () => clearTimeout(t);
  }, [routeLoading]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('cvmind_theme', 'light');

    // Check if running inside the mobile app WebView
    if (window.location.search.includes('platform=app')) {
      localStorage.setItem('is_cvmind_app', 'true');
    }
  }, []);

  useEffect(() => {
    applySEO(currentPage);
  }, [currentPage]);

  // Scroll to top of the page on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);


  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('resumetrics_gemini_key') || '';
  });
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysis | null>(null);
  const [resumeText, setResumeText] = useState<string>('');

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('cvmind_logged_in') === 'true';
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(() => {
    const pathname = window.location.pathname;
    if (AUTH_PATHS.includes(pathname)) return true;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('resetToken') && searchParams.get('email')) return true;
    // AuthModal reads and clears ?authError itself to show the message
    return Boolean(searchParams.get('authError'));
  });
  const [loadedWork, setLoadedWork] = useState<LoadedWork | null>(null);
  const [builderFocus, setBuilderFocus] = useState<false | 'flow' | 'studio'>(false);

  useEffect(() => {
    localStorage.setItem('cvmind_aa_access', 'true');
  }, [isLoggedIn]);

  // Enforce moderation on existing sessions — banned/suspended/deleted users
  // are signed out as soon as they open (or return to) the app.
  useEffect(() => {
    if (!isLoggedIn) return;

    const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    const signOut = (message: string) => {
      clearSession();
      const params = new URLSearchParams(window.location.search);
      params.set('authError', message);
      if (isAppHost()) {
        window.location.replace(`${siteOrigin()}/?${new URLSearchParams({ authError: message })}`);
        return;
      }
      setIsLoggedIn(false);
      setCurrentPageState('home');
      window.history.replaceState({}, '', window.location.pathname + `?${params.toString()}`);
      setShowAuthModal(true);
    };

    const checkAccountStatus = () => {
      const user = JSON.parse(localStorage.getItem('cvmind_user') || '{}');
      if (!user?.email) return;
      // Sessions from before signed tokens existed can't call protected APIs — sign in once more
      if (!user.token) {
        signOut('Please sign in again to continue.');
        return;
      }
      fetch(`${base}/api/auth/account-status?email=${encodeURIComponent(user.email)}`)
        .then(r => r.json())
        .then(d => {
          if (d && d.active === false) {
            signOut(d.message || 'Your account access has been restricted.');
          }
        })
        .catch(() => {}); // network/offline — never sign the user out on errors
    };

    checkAccountStatus();
    const onFocus = () => { if (document.visibilityState === 'visible') checkAccountStatus(); };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [isLoggedIn]);

  // `page` may carry a query string, e.g. 'account?tab=billing'
  const setCurrentPage = (target: string) => {
    const [page, query = ''] = target.split('?');
    const search = query ? `?${query}` : '';
    // Pages on the other cvmind.in host (site vs app) need a full page load
    if (isCrossHost(page)) {
      // sessionStorage doesn't cross hosts, so a template picked on the site travels in the URL
      const template = page === 'resume-editor' ? peekPickedTemplate() : null;
      window.location.assign(urlForPage(page, template ? `?template=${encodeURIComponent(template)}` : search));
      return;
    }
    if (page !== currentPage) setRouteLoading(true);
    setCurrentPageState(page);
    localStorage.setItem('cvmind_current_page', page);
    const newPath = page === 'home' ? '/' : `/${page}`;
    const depth = (window.history.state?.cvDepth ?? 0) + 1;
    window.history.pushState({ cvDepth: depth }, '', newPath + search);
  };

  // Back on app product pages: the previous in-app page, or My Documents when the page was opened directly
  const goBack = () => {
    if ((window.history.state?.cvDepth ?? 0) > 0) window.history.back();
    else setCurrentPage('my-documents');
  };

  // Where a fresh sign-in lands: the home page, or My Documents when signing in on the app host
  const enterAfterSignIn = () => {
    setCurrentPage(isAppHost() ? 'my-documents' : 'home');
  };

  useEffect(() => {
    const handlePopState = () => {
      const page = pageFromPath(window.location.pathname) || 'home';
      setRouteLoading(true);
      setCurrentPageState(page);
      if (VALID_PAGES.includes(page)) localStorage.setItem('cvmind_current_page', page);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync custom API key to LocalStorage for premium usability
  useEffect(() => {
    if (customApiKey) {
      localStorage.setItem('resumetrics_gemini_key', customApiKey);
    } else {
      localStorage.removeItem('resumetrics_gemini_key');
    }
  }, [customApiKey]);

  // Private route interceptor — all private pages require sign-in only (no paid gating)
  useEffect(() => {
    if (APP_PAGES.includes(currentPage) && !isLoggedIn) {
      if (isAppHost()) {
        // 'home' belongs to www; on the app host just show sign-in over it
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPageState('home');
        window.history.replaceState({}, '', '/sign-in');
      } else {
        // setCurrentPage also updates browser history, so this redirect has to run in an effect
        setCurrentPage('home');
      }
      setShowAuthModal(true);
    }
  }, [currentPage, isLoggedIn]);

  // Sign-in URLs open the AuthModal (see showAuthModal's initial state); tidy the URL
  useEffect(() => {
    const pathname = window.location.pathname;
    // The app host keeps /sign-in: its '/' means My Documents
    if (isAppHost()) return;
    if (AUTH_PATHS.includes(pathname)) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Handle Google OAuth Redirect Callback
  useEffect(() => {
    const handleGoogleRedirect = async () => {
      const hash = window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get('id_token');
      if (!idToken) return;

      // Clear the hash from address bar immediately
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

      try {
        const baseUrl =
          import.meta.env.VITE_API_BASE_URL ||
          import.meta.env.VITE_BACKEND_URL ||
          (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

        const res = await fetch(`${baseUrl}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: idToken }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Google login failed.');

        setSession(data.user);
        setIsLoggedIn(true);
        // Google returns to the www home page (see AuthModal); the user stays there, signed in
        setCurrentPage('home');
      } catch (err) {
        console.error('Google Redirect Auth Error:', err);
        // Surface the failure (e.g. banned/suspended account) in the auth modal
        const params = new URLSearchParams(window.location.search);
        params.set('authError', getErrorMessage(err) || 'Google sign-in failed. Please try again.');
        window.history.replaceState({}, '', window.location.pathname + `?${params.toString()}`);
        setShowAuthModal(true);
      }
    };

    handleGoogleRedirect();
  }, []);

  // Handle GitHub/LinkedIn OAuth Redirect Callback (backend sends ?oauthUser= / ?authError=)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    // ?authError already opened the AuthModal via its initial state
    if (searchParams.get('authError')) return;

    const encoded = searchParams.get('oauthUser');
    if (!encoded) return;

    searchParams.delete('oauthUser');
    const qs = searchParams.toString();
    window.history.replaceState({}, document.title, window.location.pathname + (qs ? `?${qs}` : ''));

    try {
      const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const user = JSON.parse(new TextDecoder().decode(bytes));
      if (!user?.email) throw new Error('Invalid OAuth payload');

      setSession(user);
      // One-time login from the OAuth redirect URL; setCurrentPage also updates browser history
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoggedIn(true);
      enterAfterSignIn();
    } catch (err) {
      console.error('OAuth Redirect Auth Error:', err);
    }
    // Runs once, for the GitHub/LinkedIn redirect back to the site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleSignOut = () => {
    clearSession();
    if (isAppHost()) {
      window.location.assign(`${siteOrigin()}/`);
      return;
    }
    setIsLoggedIn(false);
    resetAnalysis();
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setResumeText('');
    setCurrentPage('home');
  };

  // Helper to switch pages dynamically
  const renderPage = () => {
    // Registry-driven articles render generically; bespoke ones fall through to the switch.
    if (ARTICLES.some(a => a.slug === currentPage && a.sections)) {
      return <ArticlePage slug={currentPage} setCurrentPage={setCurrentPage} />;
    }
    switch (currentPage) {
      case 'home':
        return (
          <Home 
            setCurrentPage={setCurrentPage} 
            setAnalysisResult={setAnalysisResult}
            setResumeText={setResumeText}
            customApiKey={customApiKey}
          />
        );
      case 'about':
        return <About />;
      case 'contact':
        return <Contact />;
      case 'account':
        return <Account setCurrentPage={setCurrentPage} handleSignOut={handleSignOut} setLoadedWork={setLoadedWork} />;
      case 'my-documents':
        return <MyDocuments setCurrentPage={setCurrentPage} handleSignOut={handleSignOut} setLoadedWork={setLoadedWork} />;
      case 'help-center':
        return <HelpCenter setCurrentPage={setCurrentPage} />;
      case 'privacy':
        return <Privacy />;
      case 'faq':
        return <FAQ setCurrentPage={setCurrentPage} />;
      case 'blog':
        return <Blog setCurrentPage={setCurrentPage} />;
      case 'how-to-create-an-ats-friendly-resume':
        return <ArticleAtsResume setCurrentPage={setCurrentPage} />;
      case 'dashboard':
        return (
          <Dashboard 
            setCurrentPage={setCurrentPage} 
            analysisResult={analysisResult}
            resumeText={resumeText}
            resetAnalysis={resetAnalysis}
            customApiKey={customApiKey}
          />
        );
      case 'admin':
        return <Admin setCurrentPage={setCurrentPage} />;
      case 'tailor':
        return <Tailor customApiKey={customApiKey} setCurrentPage={setCurrentPage} loadedWork={loadedWork} setLoadedWork={setLoadedWork} onFocusChange={setBuilderFocus} />;
      case 'prep':
        return (
          <Prep
            customApiKey={customApiKey}
            resumeText={resumeText}
            setResumeText={setResumeText}
            setCurrentPage={setCurrentPage}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
            onFocusChange={setBuilderFocus}
          />
        );
      case 'linkedin':
        return (
          <LinkedIn 
            customApiKey={customApiKey}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
          />
        );
      case 'linkedin-bio':
        return (
          <LinkedInBio 
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
          />
        );
      case 'linkedin-outreach':
        return (
          <LinkedInOutreach 
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
          />
        );
      case 'career-courses':
        return (
          <CareerCourses 
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
          />
        );
      case 'elevator-pitch':
        return (
          <ElevatorPitch 
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
          />
        );
      case 'career-roadmap':
        return (
          <CareerRoadmap 
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
          />
        );
      case 'linkedin-post':
        return (
          <LinkedInPost
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
          />
        );
      case 'voice-prep':
        return (
          <VoicePrep
            customApiKey={customApiKey}
            resumeText={resumeText}
            setResumeText={setResumeText}
            setCurrentPage={setCurrentPage}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
            onFocusChange={setBuilderFocus}
          />
        );
      case 'portfolio-gen':
        return (
          <PortfolioGen
            customApiKey={customApiKey}
            resumeText={resumeText}
            setCurrentPage={setCurrentPage}
          />
        );
      case 'products':
        return <Products setCurrentPage={setCurrentPage} />;
      case 'job-finder':
        // Temporarily locked — restore `return <JobFinder customApiKey={customApiKey} />;` to re-enable.
        return (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh',gap:'18px',textAlign:'center',padding:'40px 24px'}}>
            <div style={{fontSize:'3rem'}}>🔍</div>
            <h2 style={{fontSize:'1.8rem',fontWeight:800,margin:0}}>AI Job Finder</h2>
            <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'linear-gradient(135deg,#ff9f0a,#ff453a)',color:'#fff',padding:'4px 14px',borderRadius:'99px',fontSize:'0.78rem',fontWeight:700,letterSpacing:'0.05em'}}>TEMPORARILY UNAVAILABLE</div>
            <p style={{color:'#6e6e73',fontSize:'1rem',maxWidth:'440px',lineHeight:1.6,margin:0}}>AI Job Finder is temporarily unavailable while we upgrade it. It will be back soon — meanwhile, explore our other AI tools.</p>
            <button onClick={() => setCurrentPage('home')} style={{padding:'10px 24px',borderRadius:'12px',border:'none',background:'#1d1d1f',color:'#fff',fontWeight:600,fontSize:'0.9rem',cursor:'pointer'}}>← Go Home</button>
          </div>
        );
      case 'portfolio': {
        const wId = window.location.pathname.split('/').pop();
        return <Portfolio workId={wId} />;
      }
      case 'resume-builder':
        return <ResumeBuilderLanding setCurrentPage={setCurrentPage} />;
      case 'resume-editor':
        return <CoverLetter customApiKey={customApiKey} loadedWork={loadedWork} setLoadedWork={setLoadedWork} onFocusChange={setBuilderFocus} onExit={() => setCurrentPage(isSplitHost() ? 'my-documents' : 'resume-builder')} />;
      case 'pricing':
        return <Pricing setCurrentPage={setCurrentPage} isLoggedIn={isLoggedIn} setShowAuthModal={setShowAuthModal} />;
      case 'terms':
        return <Terms />;
      case 'refund-policy':
        return <RefundPolicy />;
      case 'copyright-policy':
        return <CopyrightPolicy />;
      case 'disclaimer':
        return <Disclaimer />;
      case 'proofreading':
        return (
          <Proofreading
            customApiKey={customApiKey}
            resumeText={resumeText}
            setCurrentPage={setCurrentPage}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
            onFocusChange={setBuilderFocus}
          />
        );
      case 'company-portal':
        return (
          <CompanyPortal 
            customApiKey={customApiKey} 
            onNavigateCandidateApp={() => setCurrentPage('auto-apply')} 
          />
        );
      case 'auto-apply':
        return <AutoApply customApiKey={customApiKey} resumeText={resumeText} setResumeText={setResumeText} />;
      case 'code':
      case 'cvmind-code':
        return <CVmindCodeLanding />;
      case 'code-arena':
      case 'cvmind-code-arena':
        return <CVmindCode customApiKey={customApiKey} />;
      default:
        return <NotFound setCurrentPage={setCurrentPage} />;
    }
  };

  const isAdminPage = currentPage === 'admin';
  const isCodePage = currentPage === 'code-arena' || currentPage === 'cvmind-code-arena';
  // Pages where Leo guides the user; they keep the site header and footer except during his full-screen flow
  const isLeoPage = currentPage === 'tailor' || currentPage === 'prep' || currentPage === 'voice-prep' || currentPage === 'proofreading';
  // Full-screen guided flows: the resume builder and Leo's flows
  const isFocusFlow = (currentPage === 'resume-editor' || isLeoPage) && builderFocus !== false;
  // My Documents is a standalone app view with its own top bar
  const isAppPage = currentPage === 'my-documents';
  // The 404 page stands alone, without the site header and footer
  const isNotFound = currentPage === 'not-found';
  // App products (the app.cvmind.in pages) show no site header or footer, just a way back
  // Leo's pages (Resume Tailorer, Interview Prep AI, Voice Prep AI, AI Proofreading) keep the site header and footer
  const isProductPage = APP_PAGES.includes(currentPage) && !isLeoPage;
  // Account and My Documents have their own Back button / top bar; the editor's full-screen flows have Exit
  const showBackBar = isProductPage && currentPage !== 'account' && currentPage !== 'my-documents' && !isFocusFlow;
  const isMinimalPage = currentPage === 'admin' || currentPage === 'portfolio' || isCodePage || isFocusFlow || isAppPage;
  // The Help Center is full-width and ends with its own contact block instead of the site footer
  const isHelpPage = currentPage === 'help-center';

  // Mark the focused builder flow on <body> (used to keep floating widgets out of the way).
  useEffect(() => {
    document.body.classList.toggle('cv-focus', isFocusFlow);
  }, [isFocusFlow]);

  return (
    <div className={`app-container ${isAdminPage ? 'admin-shell' : ''} ${isCodePage ? 'code-shell' : ''} ${isFocusFlow ? 'focus-shell' : ''} ${isHelpPage ? 'help-shell' : ''} ${isAppPage ? 'app-shell' : ''} ${isNotFound ? 'notfound-shell' : ''} ${isProductPage ? 'product-shell' : ''}`}>

      {/* ── Global Digital Serenity Background (for both dark & light modes) ── */}
      {!isMinimalPage && <DigitalSerenityBackground theme={theme} />}

      {!isMinimalPage && !isNotFound && !isHelpPage && !isProductPage && (
        <Navbar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage} 
          customApiKey={customApiKey}
          setCustomApiKey={setCustomApiKey}
          isLoggedIn={isLoggedIn}
          setShowAuthModal={setShowAuthModal}
          handleSignOut={handleSignOut}
          setLoadedWork={setLoadedWork}
        />
      )}

      {isFocusFlow && builderFocus === 'flow' && currentPage === 'resume-editor' && (
        <button type="button" className="focus-exit" onClick={() => setCurrentPage('resume-builder')} aria-label="Exit resume builder">
          Exit ✕
        </button>
      )}

      <main className="main-content">
        {showBackBar && (
          <div className="product-back-bar">
            <button type="button" className="product-back" onClick={goBack}>
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        )}
        {renderPage()}
      </main>

      {routeLoading && <PageLoader />}

      {!isMinimalPage && !isHelpPage && !isNotFound && !isProductPage && <Footer setCurrentPage={setCurrentPage} />}
      {!isMinimalPage && <Chatbot customApiKey={customApiKey} />}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          // Apart from Code Arena the app host has nothing for signed-out visitors, so closing sign-in returns to www
          if (isAppHost() && localStorage.getItem('cvmind_logged_in') !== 'true' && !PUBLIC_APP_PAGES.includes(currentPage)) {
            window.location.assign(`${siteOrigin()}/`);
          }
        }}
        onSuccess={() => {
          setIsLoggedIn(true);
          enterAfterSignIn();
        }}
      />
    </div>
  );
}

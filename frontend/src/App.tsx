import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Account from './pages/Account';
import HelpCenter from './pages/HelpCenter';
import MyDocuments from './pages/MyDocuments';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import SiteBanner from './components/SiteBanner';
import AppUpdateGate from './components/AppUpdateGate';
import Tailor from './pages/Tailor';
import Prep from './pages/Prep';
import CoverLetter from './pages/CoverLetter';
import CoverLetterGenerator from './pages/coverLetter/CoverLetterGenerator';
import CoverLetterBuilder from './pages/coverLetter/CoverLetterBuilder';
import CoverLetterStart from './pages/coverLetter/CoverLetterStart';
import CoverLetterEditor from './pages/coverLetter/CoverLetterEditor';
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
import ResumeBuilderLanding from './pages/ResumeBuilderLanding';
import Pricing from './pages/Pricing';
import PricingSoon from './pages/PricingSoon';
import { PRICING_LOCKED } from './lib/pricing';
import AuthModal from './components/AuthModal';
import Terms from './pages/Terms';
import RefundPolicy from './pages/RefundPolicy';
import Disclaimer from './pages/Disclaimer';
import Proofreading from './pages/Proofreading';
import AutoApply from './autoApply/AutoApply';
import CompanyPortal from './pages/CompanyPortal';
import ArticleAtsResume from './pages/ArticleAtsResume';
import CopyrightPolicy from './pages/CopyrightPolicy';
import ArticlePage from './pages/ArticlePage';
import CVmindCode from './pages/code/CVmindCode';
import CVmindCodeLanding from './pages/code/CVmindCodeLanding';
import JobFinderApp from './pages/jobFinder/JobFinderApp';
import OfferNegotiation from './pages/growth/OfferNegotiation';
import InvitePage from './pages/growth/InvitePage';
import { captureReferral, claimStoredReferral } from './lib/referralCapture';
import JobFinderLanding from './pages/jobFinder/JobFinderLanding';
import NotFound from './pages/NotFound';
import VerifyEmail from './pages/VerifyEmail';
import VerifyEmailGate from './components/VerifyEmailGate';
import PageLoader from './components/PageLoader';
import { ARTICLES } from './data/articles';
import { applySEO } from './utils/seo';
import { getErrorMessage } from './utils/errors';
import { APP_PAGES, PUBLIC_APP_PAGES, OAUTH_NONCE_KEY, isAppHost, isCrossHost, isSplitHost, siteOrigin, urlForPage } from './lib/hosts';
import { clearSession, setSession } from './lib/session';
import { peekPickedTemplate } from './lib/templatePick';
import { letterDraftHash } from './lib/coverLetter';
import { takeWorkFromHash } from './lib/workHandoff';
import { authFetch, AUTH_REQUIRED_EVENT, VERIFY_REQUIRED_EVENT } from './lib/authFetch';
import { useProductLock } from './lib/productAccess';
import ProductLocked from './components/ProductLocked';
import UpgradeModal from './components/UpgradeModal';
import { readUser, saveUser, USER_CHANGE_EVENT } from './lib/currentUser';
import type { LoadedWork, ResumeAnalysis } from './types/api';
import './styles/theme.css';
import './styles/3d-effects.css';
import './styles/skeleton.css';
import './styles/shared-legacy.css';

// How long the loading screen shows when moving to another page
const ROUTE_LOADER_MS = 450;

const VALID_PAGES = ['home', 'about', 'contact', 'dashboard', 'admin', 'tailor', 'prep', 'code', 'cvmind-code', 'code-arena', 'cvmind-code-arena', 'linkedin', 'linkedin-bio', 'linkedin-outreach', 'linkedin-post', 'career-courses', 'elevator-pitch', 'career-roadmap', 'resume-builder', 'resume-editor', 'cover-letter-generator', 'cover-letter-builder', 'cover-letter-start', 'cover-letter-editor', 'privacy', 'faq', 'blog', 'voice-prep', 'portfolio-gen', 'products', 'job-finder', 'ai-job-finder', 'pricing', 'terms', 'refund-policy', 'disclaimer', 'proofreading', 'auto-apply', 'company-portal', 'copyright-policy', 'account', 'help-center', 'my-documents', 'verify-email', 'offer-negotiation', 'invite', ...ARTICLES.map(a => a.slug)];

// An invite link (?ref=CODE) is remembered as soon as the site loads, before anything rewrites the URL
const ARRIVED_WITH_REF = captureReferral();

// Leo's pages (Resume Tailorer, Interview Prep AI, Voice Prep AI, AI Proofreading), the Career tools and the cover letter pages
const GUIDED_PAGES = ['cover-letter-start', 'cover-letter-generator', 'tailor', 'prep', 'voice-prep', 'proofreading', 'linkedin', 'linkedin-bio', 'linkedin-outreach', 'career-courses', 'elevator-pitch', 'career-roadmap'];

// Signed-in pages an unverified account can still open (the server enforces the rest)
const UNVERIFIED_OPEN_PAGES = ['account', 'my-documents'];

// Sign-in addresses open the AuthModal over the home page
const AUTH_PATHS = ['/sign-in', '/sign-up', '/login'];

// The page an address shows: null for the site root, 'not-found' for anything the app doesn't serve
function pageFromPath(pathname: string): string | null {
  if (pathname.startsWith('/portfolio/') || pathname.startsWith('/r/')) return 'portfolio';
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
    // A friend's invite link opens sign-up straight away
    if (ARRIVED_WITH_REF && localStorage.getItem('cvmind_logged_in') !== 'true') return true;
    // AuthModal reads and clears ?authError itself to show the message
    return Boolean(searchParams.get('authError'));
  });
  // A resume handed over from the other host (the resume report on www) arrives in the URL hash
  const [loadedWork, setLoadedWork] = useState<LoadedWork | null>(() => takeWorkFromHash());
  // false only once the server has said this account's email isn't verified
  const [emailVerified, setEmailVerified] = useState<boolean | undefined>(() => readUser()?.emailVerified);
  const [verifyGateOpen, setVerifyGateOpen] = useState(false);

  // Follow the stored session: sign-in, verification in this or another tab, sign-out
  useEffect(() => {
    const sync = () => setEmailVerified(readUser()?.emailVerified);
    window.addEventListener(USER_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(USER_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // The server refused a request: unverified email → verify screen, signed out → sign-in
  useEffect(() => {
    const onVerify = () => setVerifyGateOpen(true);
    const onAuth = () => { if (localStorage.getItem('cvmind_logged_in') !== 'true') setShowAuthModal(true); };
    window.addEventListener(VERIFY_REQUIRED_EVENT, onVerify);
    window.addEventListener(AUTH_REQUIRED_EVENT, onAuth);
    return () => {
      window.removeEventListener(VERIFY_REQUIRED_EVENT, onVerify);
      window.removeEventListener(AUTH_REQUIRED_EVENT, onAuth);
    };
  }, []);
  const [builderFocus, setBuilderFocus] = useState<false | 'flow' | 'studio'>(false);
  // Products locked in the admin panel show a "no access" screen to accounts without access
  const productLock = useProductLock(currentPage, isLoggedIn);

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
      // With the token, so a session signed out elsewhere also ends here
      authFetch(`${base}/api/auth/account-status?email=${encodeURIComponent(user.email)}`)
        .then(r => r.json())
        .then(d => {
          if (d && d.active === false) {
            signOut(d.message || 'Your account access has been restricted.');
            return;
          }
          // Sessions from before verification existed learn their state here, and Pro given or
          // taken away in the admin panel shows up without signing in again
          const stored = readUser();
          if (!stored) return;
          const next = { ...stored };
          if (typeof d?.emailVerified === 'boolean') next.emailVerified = d.emailVerified;
          if (typeof d?.isPro === 'boolean') { next.isPro = d.isPro; next.plan = d.isPro ? 'pro' : undefined; }
          if (next.emailVerified !== stored.emailVerified || next.isPro !== stored.isPro || next.plan !== stored.plan) saveUser(next);
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
      // ...and so does a cover letter on its way to the editor
      const hash = page === 'cover-letter-editor' ? letterDraftHash() : '';
      window.location.assign(urlForPage(page, template ? `?template=${encodeURIComponent(template)}` : search) + hash);
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

  // A friend's invite code saved from ?ref= is sent once there's an account
  useEffect(() => {
    if (isLoggedIn) claimStoredReferral();
  }, [isLoggedIn]);

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

  // Handle GitHub/LinkedIn OAuth Redirect Callback. The backend sends a single-use ?oauthCode=
  // (never the session itself, which would end up in history and logs) or ?authError=
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    // ?authError already opened the AuthModal via its initial state
    if (searchParams.get('authError')) return;

    const code = searchParams.get('oauthCode');
    if (!code) return;

    searchParams.delete('oauthCode');
    const qs = searchParams.toString();
    window.history.replaceState({}, document.title, window.location.pathname + (qs ? `?${qs}` : ''));

    const exchange = async () => {
      try {
        const baseUrl =
          import.meta.env.VITE_API_BASE_URL ||
          import.meta.env.VITE_BACKEND_URL ||
          (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
        let nonce = '';
        try {
          nonce = sessionStorage.getItem(OAUTH_NONCE_KEY) || '';
          sessionStorage.removeItem(OAUTH_NONCE_KEY);
        } catch { /* storage blocked: the server refuses the code and the user signs in again */ }
        const res = await fetch(`${baseUrl}/api/auth/oauth/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, nonce }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.user?.email) throw new Error(data.error || 'Sign-in failed. Please try again.');

        setSession(data.user);
        setIsLoggedIn(true);
        enterAfterSignIn();
      } catch (err) {
        console.error('OAuth Redirect Auth Error:', err);
        // Show the reason in the sign-in modal, the same way the backend's ?authError= does
        const params = new URLSearchParams(window.location.search);
        params.set('authError', getErrorMessage(err) || 'Sign-in failed. Please try again.');
        window.history.replaceState({}, '', window.location.pathname + `?${params.toString()}`);
        setShowAuthModal(true);
      }
    };
    exchange();
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
        return <About setCurrentPage={setCurrentPage} />;
      case 'account':
        return <Account setCurrentPage={setCurrentPage} handleSignOut={handleSignOut} setLoadedWork={setLoadedWork} />;
      case 'my-documents':
        return <MyDocuments setCurrentPage={setCurrentPage} handleSignOut={handleSignOut} setLoadedWork={setLoadedWork} />;
      // The Contact page is the Help Center's contact form
      case 'help-center':
      case 'contact':
        return <HelpCenter setCurrentPage={setCurrentPage} page={currentPage} />;
      case 'privacy':
        return <Privacy setCurrentPage={setCurrentPage} />;
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
            isLoggedIn={isLoggedIn}
            setLoadedWork={setLoadedWork}
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
            setCurrentPage={setCurrentPage}
            onFocusChange={setBuilderFocus}
          />
        );
      case 'linkedin-bio':
        return (
          <LinkedInBio
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
            setCurrentPage={setCurrentPage}
            onFocusChange={setBuilderFocus}
          />
        );
      case 'linkedin-outreach':
        return (
          <LinkedInOutreach
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
            setCurrentPage={setCurrentPage}
            onFocusChange={setBuilderFocus}
          />
        );
      case 'career-courses':
        return (
          <CareerCourses
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
            setCurrentPage={setCurrentPage}
            onFocusChange={setBuilderFocus}
          />
        );
      case 'elevator-pitch':
        return (
          <ElevatorPitch
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
            setCurrentPage={setCurrentPage}
            onFocusChange={setBuilderFocus}
          />
        );
      case 'career-roadmap':
        return (
          <CareerRoadmap
            customApiKey={customApiKey}
            resumeText={resumeText}
            loadedWork={loadedWork}
            setLoadedWork={setLoadedWork}
            setCurrentPage={setCurrentPage}
            onFocusChange={setBuilderFocus}
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
            onExit={goBack}
          />
        );
      case 'products':
        return <Products setCurrentPage={setCurrentPage} />;
      case 'job-finder':
        return <JobFinderApp setCurrentPage={setCurrentPage} />;
      case 'ai-job-finder':
        return <JobFinderLanding setCurrentPage={setCurrentPage} />;
      case 'portfolio': {
        const last = window.location.pathname.split('/').pop();
        // /r/<name> is a resume share link; /portfolio/<id> the older link by document id
        return window.location.pathname.startsWith('/r/') ? <Portfolio slug={last} /> : <Portfolio workId={last} />;
      }
      case 'offer-negotiation':
        return <OfferNegotiation loadedWork={loadedWork} />;
      case 'invite':
        return <InvitePage setCurrentPage={setCurrentPage} />;
      case 'resume-builder':
        return <ResumeBuilderLanding setCurrentPage={setCurrentPage} />;
      case 'resume-editor':
        return <CoverLetter customApiKey={customApiKey} loadedWork={loadedWork} setLoadedWork={setLoadedWork} onFocusChange={setBuilderFocus} onExit={() => setCurrentPage(isSplitHost() ? 'my-documents' : 'resume-builder')} />;
      case 'cover-letter-generator':
        return <CoverLetterGenerator customApiKey={customApiKey} resumeText={resumeText} setCurrentPage={setCurrentPage} onFocusChange={setBuilderFocus} onExit={() => setCurrentPage(isSplitHost() ? 'my-documents' : 'cover-letter-builder')} />;
      case 'cover-letter-builder':
        return <CoverLetterBuilder setCurrentPage={setCurrentPage} />;
      case 'cover-letter-start':
        return <CoverLetterStart setCurrentPage={setCurrentPage} onFocusChange={setBuilderFocus} onExit={() => setCurrentPage('cover-letter-builder')} />;
      case 'cover-letter-editor':
        return <CoverLetterEditor customApiKey={customApiKey} loadedWork={loadedWork} setLoadedWork={setLoadedWork} setCurrentPage={setCurrentPage} onFocusChange={setBuilderFocus} />;
      case 'pricing':
        if (PRICING_LOCKED) return <PricingSoon setCurrentPage={setCurrentPage} />;
        return <Pricing setCurrentPage={setCurrentPage} isLoggedIn={isLoggedIn} setShowAuthModal={setShowAuthModal} />;
      case 'terms':
        return <Terms setCurrentPage={setCurrentPage} />;
      case 'refund-policy':
        return <RefundPolicy setCurrentPage={setCurrentPage} />;
      case 'copyright-policy':
        return <CopyrightPolicy setCurrentPage={setCurrentPage} />;
      case 'disclaimer':
        return <Disclaimer setCurrentPage={setCurrentPage} />;
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
      case 'verify-email':
        // Full-screen like the sign-in overlay, so it renders outside <main> (see below)
        return null;
      default:
        return <NotFound setCurrentPage={setCurrentPage} />;
    }
  };

  const isAdminPage = currentPage === 'admin';
  const isCodePage = currentPage === 'code-arena' || currentPage === 'cvmind-code-arena';
  // Guided tools: Leo's pages, the Career tools and the cover letter app. Like every app page they
  // show no site header or footer; their work and result screens run full-screen.
  const isGuidedPage = GUIDED_PAGES.includes(currentPage);
  // Full-screen guided flows: the resume builder, the cover letter editor and the guided tools
  const isFocusFlow = (currentPage === 'resume-editor' || currentPage === 'cover-letter-editor' || isGuidedPage) && builderFocus !== false;
  // My Documents is a standalone app view with its own top bar
  const isAppPage = currentPage === 'my-documents';
  // The 404 page stands alone, without the site header and footer
  const isNotFound = currentPage === 'not-found';
  // App products (the app.cvmind.in pages) show no site header or footer, just a way back
  // Signed-in app pages, the guided tools included, never show the site header or footer
  const isProductPage = APP_PAGES.includes(currentPage);
  // Account and My Documents have their own Back button / top bar; the editor's full-screen flows have Exit
  // The Portfolio Generator is a full-screen chat with its own top bar and Back button
  const isPortfolioStudio = currentPage === 'portfolio-gen';
  // Job Finder has its own top bar
  const showBackBar = isProductPage && currentPage !== 'account' && currentPage !== 'my-documents' && currentPage !== 'job-finder' && !isFocusFlow && !isPortfolioStudio;
  const isMinimalPage = currentPage === 'dashboard' || currentPage === 'admin' || currentPage === 'portfolio' || currentPage === 'verify-email' || isCodePage || isFocusFlow || isAppPage || isPortfolioStudio;
  // The resume report has its own top bar instead of the site header and footer
  const isReportPage = currentPage === 'dashboard';
  // The Help Center (and its Contact form) is full-width with its own top bar and footer instead of the site ones
  const isHelpPage = currentPage === 'help-center' || currentPage === 'contact';
  // Landing pages that run edge to edge under the site navbar
  const isWidePage = currentPage === 'cover-letter-generator' || currentPage === 'cover-letter-builder' || currentPage === 'resume-builder' || currentPage === 'pricing';

  // Unverified accounts see the verify screen over locked app pages, or when the server refused a request
  const unverified = isLoggedIn && emailVerified === false;
  const onLockedPage = APP_PAGES.includes(currentPage) && !UNVERIFIED_OPEN_PAGES.includes(currentPage);
  const showVerifyGate = unverified && (verifyGateOpen || onLockedPage) && !showAuthModal;

  // Mark the focused builder flow on <body> (used to keep floating widgets out of the way).
  useEffect(() => {
    document.body.classList.toggle('cv-focus', isFocusFlow);
  }, [isFocusFlow]);

  return (
    <div className={`app-container ${isAdminPage ? 'admin-shell' : ''} ${isCodePage ? 'code-shell' : ''} ${isFocusFlow ? 'focus-shell' : ''} ${isHelpPage ? 'help-shell' : ''} ${isAppPage ? 'app-shell' : ''} ${isNotFound ? 'notfound-shell' : ''} ${isProductPage ? 'product-shell' : ''} ${isPortfolioStudio ? 'pgx-shell' : ''} ${isWidePage ? 'wide-shell' : ''} ${isReportPage ? 'dashboard-shell' : ''}`}>

      {!isAdminPage && (
        <SiteBanner
          setCurrentPage={setCurrentPage}
          onVerifyEmail={unverified && currentPage !== 'verify-email' ? () => setVerifyGateOpen(true) : undefined}
        />
      )}
      <AppUpdateGate />

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
        {productLock === 'locked'
          ? <ProductLocked page={currentPage} isLoggedIn={isLoggedIn} setCurrentPage={setCurrentPage} onSignIn={() => setShowAuthModal(true)} />
          : productLock === 'open' && renderPage()}
      </main>

      {currentPage === 'verify-email' && !showAuthModal && <VerifyEmail setCurrentPage={setCurrentPage} openSignIn={() => setShowAuthModal(true)} />}

      {routeLoading && <PageLoader />}

      <UpgradeModal setCurrentPage={setCurrentPage} />

      {!isMinimalPage && !isHelpPage && !isNotFound && !isProductPage && <Footer setCurrentPage={setCurrentPage} />}

      {showVerifyGate && (
        <VerifyEmailGate
          email={readUser()?.email || ''}
          onVerified={() => setVerifyGateOpen(false)}
          onClose={() => {
            setVerifyGateOpen(false);
            if (onLockedPage) setCurrentPage('my-documents');
          }}
          onSignOut={() => {
            setVerifyGateOpen(false);
            handleSignOut();
          }}
        />
      )}

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

import { ARTICLES } from '../data/articles';

// Every page the site serves at /<page>. The build writes one HTML file per page (see
// vite.config.ts), so an address not listed here gets a real 404 from the host.
export const VALID_PAGES = ['home', 'about', 'contact', 'dashboard', 'admin', 'tailor', 'prep', 'code', 'cvmind-code', 'code-arena', 'cvmind-code-arena', 'linkedin', 'linkedin-bio', 'linkedin-outreach', 'linkedin-post', 'career-courses', 'elevator-pitch', 'career-roadmap', 'resume-builder', 'resume-editor', 'cover-letter-generator', 'cover-letter-builder', 'cover-letter-start', 'cover-letter-editor', 'privacy', 'faq', 'blog', 'voice-prep', 'portfolio-gen', 'products', 'job-finder', 'ai-job-finder', 'pricing', 'terms', 'refund-policy', 'disclaimer', 'proofreading', 'auto-apply', 'company-portal', 'copyright-policy', 'account', 'help-center', 'my-documents', 'verify-email', 'offer-negotiation', 'invite', ...ARTICLES.map(a => a.slug)];

// Sign-in addresses open the AuthModal over the home page
export const AUTH_PATHS = ['/sign-in', '/sign-up', '/login'];

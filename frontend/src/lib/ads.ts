import { ARTICLES } from '../data/articles';
import { isAppHost } from './hosts';

// AdSense only runs on pages that are mostly our own written content. Its "low-value content"
// policy counts ads on sign-in, editor, tool, legal and error screens against the whole site, so
// the script isn't in index.html; it's added here the first time a visitor opens one of these
// pages. The google-adsense-account meta tag stays in index.html for site verification.
const CLIENT = 'ca-pub-1354747720896396';

export const AD_PAGES = ['home', 'resume-builder', 'blog', ...ARTICLES.map(a => a.slug)];

let loaded = false;

export function loadAdsFor(page: string) {
  if (loaded || !AD_PAGES.includes(page)) return;
  // app.cvmind.in is the signed-in app, and AdSense isn't allowed inside the Android WebView
  if (isAppHost() || localStorage.getItem('is_cvmind_app') === 'true') return;
  loaded = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

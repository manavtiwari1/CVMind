import { useEffect, useState } from 'react';
import { API_BASE } from './apiBase';
import { authFetch } from './authFetch';

// Products an admin can lock (Admin → Access lists → Products). The server blocks the API for
// accounts without access; this lets the site show a "no access" screen on the page itself.

export const PRODUCT_LABELS: Record<string, string> = {
  'resume-check': 'Resume checker',
  'resume-builder': 'Resume builder',
  tailor: 'Resume tailor',
  'cover-letter': 'Cover letter',
  proofread: 'Proofreading',
  interview: 'Interview prep',
  'voice-prep': 'Voice prep',
  linkedin: 'LinkedIn tools',
  career: 'Career tools',
  portfolio: 'Portfolio generator',
  'job-finder': 'Job finder',
  chat: 'AI assistant',
  code: 'CVMind Code',
  leo: 'Leo AI'
};

// Pages that belong to a product. The resume checker lives on the home page, so it is only blocked
// when someone runs a check.
const PAGE_PRODUCTS: Record<string, string> = {
  'resume-builder': 'resume-builder',
  'resume-editor': 'resume-builder',
  tailor: 'tailor',
  'cover-letter-generator': 'cover-letter',
  'cover-letter-builder': 'cover-letter',
  'cover-letter-start': 'cover-letter',
  'cover-letter-editor': 'cover-letter',
  proofreading: 'proofread',
  prep: 'interview',
  'voice-prep': 'voice-prep',
  linkedin: 'linkedin',
  'linkedin-bio': 'linkedin',
  'linkedin-outreach': 'linkedin',
  'linkedin-post': 'linkedin',
  'career-courses': 'career',
  'elevator-pitch': 'career',
  'career-roadmap': 'career',
  'portfolio-gen': 'portfolio',
  'job-finder': 'job-finder',
  code: 'code',
  'cvmind-code': 'code',
  'code-arena': 'code',
  'cvmind-code-arena': 'code'
};

export const productForPage = (page: string): string | null => PAGE_PRODUCTS[page] || null;

interface ProductAccess { locked: string[]; granted: string[] }

async function loadProductAccess(): Promise<ProductAccess> {
  const res = await authFetch(`${API_BASE}/api/config/products`);
  if (!res.ok) throw new Error('product access unavailable');
  const data = await res.json();
  return { locked: data.locked || [], granted: data.granted || [] };
}

// 'checking' until the server answers; a failed check counts as open (the server still enforces it)
export function useProductLock(page: string, isLoggedIn: boolean): 'checking' | 'open' | 'locked' {
  const product = productForPage(page);
  const [state, setState] = useState<{ key: string; access: ProductAccess | null }>({ key: '', access: null });
  const key = `${product}:${isLoggedIn}`;

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    loadProductAccess()
      .then((access) => { if (!cancelled) setState({ key, access }); })
      .catch(() => { if (!cancelled) setState({ key, access: { locked: [], granted: [] } }); });
    return () => { cancelled = true; };
  }, [product, key]);

  if (!product) return 'open';
  if (state.key !== key || !state.access) return 'checking';
  return state.access.locked.includes(product) && !state.access.granted.includes(product) ? 'locked' : 'open';
}

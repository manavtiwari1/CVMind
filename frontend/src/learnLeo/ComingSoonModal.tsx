import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { LeoAvatar } from '../components/ResumeOnboarding';
import { COMING_SOON_EVENT, type SoonProduct } from '../lib/leoAccess';
import './ComingSoon.css';

// What each "coming soon" product says, and the page that shows what's coming
const SOON: Record<SoonProduct, { title: string; text: string; page: string }> = {
  'learn-leo': {
    title: 'Learn with Leo is coming soon',
    text: 'Leo is still practising his lessons with a small test group. It opens for everyone soon, free to start.',
    page: 'ai-tutor',
  },
  aptitude: {
    title: 'Aptitude Tests are coming soon',
    text: "We're testing the quant, reasoning and verbal mock tests with a small group. They open for everyone soon, free to start.",
    page: 'aptitude',
  },
};

// Opens whenever something fires COMING_SOON_EVENT (lib/leoAccess.ts, lib/authFetch.ts), with the product in event.detail.
export default function ComingSoonModal({ currentPage, setCurrentPage }: { currentPage: string; setCurrentPage: (page: string) => void }) {
  const [product, setProduct] = useState<SoonProduct | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const wanted = (e as CustomEvent<{ product?: SoonProduct }>).detail?.product;
      setProduct(wanted && wanted in SOON ? wanted : 'learn-leo');
    };
    window.addEventListener(COMING_SOON_EVENT, onOpen);
    return () => window.removeEventListener(COMING_SOON_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setProduct(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product]);

  if (!product) return null;
  const soon = SOON[product];
  const close = () => setProduct(null);
  return (
    <div className="lcs-backdrop" onClick={close}>
      <div className="lcs-card" role="dialog" aria-modal="true" aria-labelledby="lcs-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lcs-close" onClick={close} aria-label="Close"><X size={18} /></button>
        <LeoAvatar size={84} pose="typing" />
        <h2 id="lcs-title">{soon.title}</h2>
        <p>{soon.text}</p>
        <div className="lcs-actions">
          <button type="button" className="lcs-btn lcs-btn--primary" onClick={close}>OK, got it</button>
          {currentPage !== soon.page && (
            <button type="button" className="lcs-btn" onClick={() => { close(); setCurrentPage(soon.page); }}>See what's coming</button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Full-page version, for someone who opens the product's address directly. */
export function ComingSoonScreen({ setCurrentPage, product = 'learn-leo' }: { setCurrentPage: (page: string) => void; product?: SoonProduct }) {
  const soon = SOON[product];
  return (
    <section className="lcs-screen" aria-labelledby="lcs-screen-title">
      <LeoAvatar size={110} pose="typing" />
      <h1 id="lcs-screen-title">{soon.title}</h1>
      <p>{soon.text}</p>
      <div className="lcs-actions">
        <button type="button" className="lcs-btn lcs-btn--primary" onClick={() => setCurrentPage(soon.page)}>See what's coming</button>
        <button type="button" className="lcs-btn" onClick={() => setCurrentPage('home')}>Back to CVMind</button>
      </div>
    </section>
  );
}

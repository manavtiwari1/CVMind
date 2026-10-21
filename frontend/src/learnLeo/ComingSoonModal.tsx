import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { LeoAvatar } from '../components/ResumeOnboarding';
import { COMING_SOON_EVENT } from '../lib/leoAccess';
import './ComingSoon.css';

// "Learn with Leo is coming soon". Opens whenever something fires COMING_SOON_EVENT (lib/leoAccess.ts, lib/authFetch.ts).
export default function ComingSoonModal({ currentPage, setCurrentPage }: { currentPage: string; setCurrentPage: (page: string) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(COMING_SOON_EVENT, onOpen);
    return () => window.removeEventListener(COMING_SOON_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="lcs-backdrop" onClick={() => setOpen(false)}>
      <div className="lcs-card" role="dialog" aria-modal="true" aria-labelledby="lcs-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lcs-close" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
        <LeoAvatar size={84} pose="typing" />
        <h2 id="lcs-title">Learn with Leo is coming soon</h2>
        <p>Leo is still practising his lessons with a small test group. It opens for everyone soon, free to start.</p>
        <div className="lcs-actions">
          <button type="button" className="lcs-btn lcs-btn--primary" onClick={() => setOpen(false)}>OK, got it</button>
          {currentPage !== 'ai-tutor' && (
            <button type="button" className="lcs-btn" onClick={() => { setOpen(false); setCurrentPage('ai-tutor'); }}>See what's coming</button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Full-page version, for someone who opens the Learn with Leo address directly. */
export function ComingSoonScreen({ setCurrentPage }: { setCurrentPage: (page: string) => void }) {
  return (
    <section className="lcs-screen" aria-labelledby="lcs-screen-title">
      <LeoAvatar size={110} pose="typing" />
      <h1 id="lcs-screen-title">Learn with Leo is coming soon</h1>
      <p>Leo is still practising his lessons with a small test group. It opens for everyone soon, free to start.</p>
      <div className="lcs-actions">
        <button type="button" className="lcs-btn lcs-btn--primary" onClick={() => setCurrentPage('ai-tutor')}>See what's coming</button>
        <button type="button" className="lcs-btn" onClick={() => setCurrentPage('home')}>Back to CVMind</button>
      </div>
    </section>
  );
}

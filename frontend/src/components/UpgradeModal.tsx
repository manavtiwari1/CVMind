import { useEffect, useState } from 'react';
import { Crown, X } from 'lucide-react';
import { UPGRADE_EVENT, userIsPro, type UpgradeDetail } from '../lib/billing';
import './UpgradeModal.css';

const COPY: Record<UpgradeDetail['reason'], { title: string; body: string }> = {
  template: { title: 'This design is part of CVMind Pro', body: 'Pro unlocks every resume template and cover letter design, and removes the CVMind footer from your downloads.' },
  branding: { title: 'Remove the CVMind footer with Pro', body: 'Free resumes and cover letters carry a small "Powered by CVMind" footer. With Pro your downloads come out clean.' },
  limit: { title: "You've used this week's free tries", body: 'Pro gives you unlimited use of every tool.' },
  tokens: { title: "You've used your AI tokens for now", body: 'Free accounts get 10,000 AI tokens every 3 days; Pro gets 25,000.' },
};

// The upgrade dialog. Opens whenever something fires UPGRADE_EVENT (see lib/billing.ts and lib/authFetch.ts).
export default function UpgradeModal({ setCurrentPage }: { setCurrentPage: (page: string) => void }) {
  const [detail, setDetail] = useState<UpgradeDetail | null>(null);

  useEffect(() => {
    const onUpgrade = (e: Event) => setDetail((e as CustomEvent<UpgradeDetail>).detail || { reason: 'limit' });
    window.addEventListener(UPGRADE_EVENT, onUpgrade);
    return () => window.removeEventListener(UPGRADE_EVENT, onUpgrade);
  }, []);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetail(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

  if (!detail) return null;
  const pro = userIsPro();
  const copy = COPY[detail.reason];
  // A Pro account that runs out of tokens has nothing to upgrade to; just say when they come back
  const title = pro && detail.reason === 'tokens' ? "You've used your AI tokens for now" : copy.title;

  return (
    <div className="upm-backdrop" onClick={() => setDetail(null)}>
      <div className="upm-card" role="dialog" aria-modal="true" aria-labelledby="upm-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="upm-close" onClick={() => setDetail(null)} aria-label="Close"><X size={18} /></button>
        <span className="upm-icon" aria-hidden="true"><Crown size={22} /></span>
        <h2 id="upm-title" className="upm-title">{title}</h2>
        {detail.message && <p className="upm-message">{detail.message}</p>}
        {!pro && <p className="upm-body">{copy.body}</p>}
        {!pro && <p className="upm-price">Plans from ₹39 for 3 days · ₹189 a month</p>}
        <div className="upm-actions">
          {!pro && (
            <button type="button" className="upm-btn upm-btn--primary" onClick={() => { setDetail(null); setCurrentPage('pricing'); }}>
              <Crown size={16} /> See Pro plans
            </button>
          )}
          <button type="button" className="upm-btn" onClick={() => setDetail(null)}>{pro ? 'OK' : 'Not now'}</button>
        </div>
      </div>
    </div>
  );
}

import { ArrowLeft, LifeBuoy, Lock, LogIn } from 'lucide-react';
import { PRODUCT_LABELS, productForPage } from '../lib/productAccess';
import './ProductLocked.css';

interface ProductLockedProps {
  page: string;
  isLoggedIn: boolean;
  setCurrentPage: (page: string) => void;
  onSignIn: () => void;
}

// Shown in place of a product page that an admin has locked, for visitors without access
export default function ProductLocked({ page, isLoggedIn, setCurrentPage, onSignIn }: ProductLockedProps) {
  const label = PRODUCT_LABELS[productForPage(page) || ''] || 'This product';
  return (
    <section className="pl" aria-labelledby="pl-title">
      <span className="pl-icon" aria-hidden="true"><Lock size={26} /></span>
      <h1 id="pl-title" className="pl-title">{label} needs access</h1>
      <p className="pl-body">
        {isLoggedIn
          ? `Your account doesn't have access to ${label} yet. Contact support and we'll set you up.`
          : `${label} is open to selected accounts. Sign in to check if you have access.`}
      </p>
      <div className="pl-actions">
        {isLoggedIn ? (
          <button type="button" className="pl-btn pl-btn--primary" onClick={() => setCurrentPage('contact')}>
            <LifeBuoy size={16} /> Contact support
          </button>
        ) : (
          <button type="button" className="pl-btn pl-btn--primary" onClick={onSignIn}>
            <LogIn size={16} /> Sign in
          </button>
        )}
        <button type="button" className="pl-btn" onClick={() => setCurrentPage('home')}>
          <ArrowLeft size={16} /> Back to home
        </button>
      </div>
    </section>
  );
}

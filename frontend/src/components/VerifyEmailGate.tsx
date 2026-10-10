import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import VerifyEmailPanel from './VerifyEmailPanel';
import './VerifyEmailGate.css';

interface VerifyEmailGateProps {
  email: string;
  onVerified: () => void;
  onClose: () => void;
  onSignOut: () => void;
}

// "Verify your email address" popup over a locked feature; the page behind is blurred and can't scroll
export default function VerifyEmailGate({ email, onVerified, onClose, onSignOut }: VerifyEmailGateProps) {
  // Lock page scroll while open, and let Escape close it (the user can verify later)
  useEffect(() => {
    const html = document.documentElement;
    const prev = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      html.style.overflow = prev.html;
      document.body.style.overflow = prev.body;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      className="veg-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="veg-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-email-title"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        <button type="button" className="veg-close" onClick={onClose} aria-label="Close, verify later" title="Verify later">
          <X size={16} />
        </button>

        <h2 id="verify-email-title" className="veg-sr">Verify your email address</h2>

        <VerifyEmailPanel email={email} onVerified={onVerified} />

        <div className="veg-foot">
          <button type="button" className="veg-later" onClick={onClose}>I'll verify later</button>
          <span className="veg-dot" aria-hidden="true">·</span>
          <span>
            Wrong account?{' '}
            <button type="button" className="veg-link" onClick={onSignOut}>Sign out</button>
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

import { Sparkles, X } from 'lucide-react';
import { GradientBackground } from './ui/sign-up';
import VerifyEmailPanel from './VerifyEmailPanel';

interface VerifyEmailGateProps {
  email: string;
  onVerified: () => void;
  onClose: () => void;
  onSignOut: () => void;
}

// Full-screen "Verify your email address" over a locked feature, in the same frame as the sign-in overlay
export default function VerifyEmailGate({ email, onVerified, onClose, onSignOut }: VerifyEmailGateProps) {
  return (
    // Inline spacing: theme.css resets every element's margin and padding, which overrides Tailwind's spacing classes
    <div className="fixed inset-0 flex flex-col overflow-y-auto" style={{ background: 'var(--bg-primary)', zIndex: 1100 }} role="dialog" aria-modal="true" aria-labelledby="verify-email-title">
      <GradientBackground />

      <div className="relative z-10 flex items-center justify-between" style={{ padding: '20px 24px' }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--gradient-brand)' }}>
            <Sparkles size={15} className="text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CVMind</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:opacity-70"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center" style={{ padding: '0 16px 40px' }}>
        <div className="w-full max-w-[420px]">
          <div className="text-center" style={{ marginBottom: 28 }}>
            <h1 id="verify-email-title" className="font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: 30, lineHeight: 1.15, marginBottom: 8 }}>
              Verify your email address
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Verifying your email helps us keep CVMind free of spam and abuse.
            </p>
          </div>

          <div className="rounded-2xl" style={{ padding: 24, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-lg)' }}>
            <VerifyEmailPanel email={email} onVerified={onVerified} />
          </div>

          <p className="text-center text-sm" style={{ color: 'var(--text-tertiary)', marginTop: 24 }}>
            Wrong account?{' '}
            <button type="button" onClick={onSignOut} className="font-semibold" style={{ color: 'var(--blue)' }}>Sign out</button>
          </p>
        </div>
      </div>
    </div>
  );
}

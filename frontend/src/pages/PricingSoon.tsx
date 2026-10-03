import { Lock, FileText, ScanSearch } from 'lucide-react';
import './resources/Resources.css';
import { SlotBanner } from '../components/SiteBanner';

interface PricingSoonProps {
  setCurrentPage: (page: string) => void;
}

// Shown at /pricing while paid plans are locked (PRICING_LOCKED in App.tsx)
export default function PricingSoon({ setCurrentPage }: PricingSoonProps) {
  return (
    <section className="rsc" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6rem 0 7rem', textAlign: 'center' }}>
      <div style={{ width: '100%', marginTop: '-3rem', marginBottom: '2rem' }}><SlotBanner slot="promo" setCurrentPage={setCurrentPage} /></div>
      <span
        aria-hidden="true"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, marginBottom: '1.5rem', color: '#22a577', background: '#e3f7ef', borderRadius: '50%' }}
      >
        <Lock size={28} />
      </span>
      <span className="rsc-eyebrow">Coming soon</span>
      <h1 className="rsc-title" style={{ marginTop: '0.8rem' }}>Pricing is on its way</h1>
      <p className="rsc-lede">
        We're still finishing our paid plans, so they aren't available yet. Everything on the Free plan works today:
        the resume builder with every template, the resume checker and interview practice.
      </p>
      <div className="rsc-cta-actions" style={{ justifyContent: 'center', marginTop: '2.2rem' }}>
        <button type="button" className="rsc-btn" onClick={() => setCurrentPage('resume-builder')}>
          <FileText size={16} /> Build a resume
        </button>
        <button type="button" className="rsc-btn rsc-btn--ghost" onClick={() => setCurrentPage('home')}>
          <ScanSearch size={16} /> Check my resume
        </button>
      </div>
    </section>
  );
}

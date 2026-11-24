import React, { useState } from 'react';
import { Lock, ArrowLeft, Download, CheckCircle2, Send, Loader2 } from 'lucide-react';
import './resources/Resources.css';
import { SlotBanner } from '../components/SiteBanner';

interface CampusSoonProps {
  setCurrentPage?: (page: string) => void;
}

// Shown at /campus while institutional suite is locked
export default function CampusSoon({ setCurrentPage }: CampusSoonProps) {
  const [email, setEmail] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await fetch('/api/college/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeName: collegeName || 'Early Waitlist Institution',
          contactPerson: 'Waitlist Lead',
          email,
          phone: '',
          studentBatchSize: '500-1000',
          notes: 'Joined priority campus coming soon waitlist'
        })
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rsc" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6rem 1.5rem 7rem', textAlign: 'center', maxWidth: 780, margin: '0 auto' }}>
      <div style={{ width: '100%', marginTop: '-3rem', marginBottom: '2rem' }}>
        <SlotBanner slot="promo" setCurrentPage={setCurrentPage || (() => {})} />
      </div>

      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 72,
          height: 72,
          marginBottom: '1.5rem',
          color: '#2563eb',
          background: 'rgba(37, 99, 235, 0.1)',
          borderRadius: '50%',
          boxShadow: '0 8px 24px -6px rgba(37, 99, 235, 0.2)'
        }}
      >
        <Lock size={32} />
      </span>

      <span
        className="rsc-eyebrow"
        style={{
          color: '#2563eb',
          background: 'rgba(37, 99, 235, 0.08)',
          padding: '4px 14px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase'
        }}
      >
        Coming Soon
      </span>

      <h1 className="rsc-title" style={{ marginTop: '0.9rem', fontSize: 'clamp(32px, 4vw, 48px)', letterSpacing: '-0.03em' }}>
        CVMind Campus is on its way
      </h1>

      <p className="rsc-lede" style={{ maxWidth: 640, marginTop: '1rem', color: '#4b5563', lineHeight: 1.6 }}>
        We are putting the final touches on our institutional placement portal: automated batch ATS audits, university-branded templates, and TPO analytics dashboard. Early pilot registrations are now open for select colleges and universities.
      </p>

      {/* Early Access Pilot Registration */}
      <div style={{ width: '100%', maxWidth: 500, margin: '2.4rem auto 1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1.5rem' }}>
        {submitted ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#10b981', fontWeight: 600 }}>
            <CheckCircle2 size={20} />
            <span>You’re on the priority pilot waitlist! We’ll be in touch shortly.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'left' }}>
              Request Early Pilot Access for your Institution:
            </div>
            <input
              type="text"
              placeholder="College / University Name"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              style={{ height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
              required
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="Official TPO / Faculty Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ flex: 1, height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                required
              />
              <button
                type="submit"
                disabled={busy}
                style={{ height: 42, padding: '0 18px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 0, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {busy ? <Loader2 size={16} className="c-spin" /> : <Send size={15} />}
                Join List
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rsc-cta-actions" style={{ justifyContent: 'center', marginTop: '1.5rem', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a
          href="/CVMind_B2B_Campus_Proposal_Deck.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="rsc-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <Download size={16} /> Download Proposal Deck (PDF)
        </a>
        <button
          type="button"
          className="rsc-btn rsc-btn--ghost"
          onClick={() => setCurrentPage ? setCurrentPage('home') : (window.location.href = '/')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>
    </section>
  );
}

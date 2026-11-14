import { useEffect, useState } from 'react';
import { CheckCircle, Sparkles, XCircle } from 'lucide-react';
import { GradientBackground } from '../components/ui/sign-up';
import { API_BASE } from '../lib/apiBase';

// cvmind.in/offer/<token>: a candidate reads their offer letter and accepts or declines it
interface Offer { name: string; title: string; body: string; number: string; issuedOn: string; status: 'sent' | 'accepted' | 'declined'; verifyCode: string }

export default function OfferPage() {
  const token = window.location.pathname.split('/').filter(Boolean)[1] || '';
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    // Keep the private link out of other sites' referrer headers
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    fetch(`${API_BASE}/api/offers/${encodeURIComponent(token)}`).then(async (r) => {
      const body = await r.json().catch(() => ({}));
      if (r.ok) setOffer(body.data); else setError(body.error || 'This offer link is not valid.');
    }).catch(() => setError('Could not load the offer. Try again in a minute.'));
    return () => meta.remove();
  }, [token]);

  const answer = async (accept: boolean) => {
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/offers/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accept, reason }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Something went wrong.');
      setOffer((o) => o && { ...o, status: body.status });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    // Inline spacing: theme.css resets every element's margin and padding, which overrides Tailwind's spacing classes
    <div className="fixed inset-0 flex flex-col overflow-y-auto" style={{ background: 'var(--bg-primary)', zIndex: 1050 }}>
      <GradientBackground />
      <a href="/" className="relative z-10 flex items-center gap-2" style={{ padding: '20px 24px' }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--gradient-brand)' }}><Sparkles size={15} className="text-white" /></span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CVMind</span>
      </a>
      <div className="relative z-10 flex flex-1 justify-center" style={{ padding: '0 16px 48px' }}>
        <div className="w-full max-w-[680px] rounded-2xl" style={{ padding: 28, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-lg)', alignSelf: 'flex-start' }}>
          {!offer ? <p style={{ color: error ? 'var(--red)' : 'var(--text-secondary)' }}>{error || 'Loading your offer…'}</p> : (
            <>
              <p className="text-xs" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{offer.number} · {new Date(`${offer.issuedOn}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <h1 className="font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: 24, marginBottom: 16 }}>{offer.title}</h1>
              <div style={{ color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 24 }}>{offer.body}</div>
              {offer.status === 'sent' ? (
                declining ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <label htmlFor="of-reason" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Would you tell us why? (optional)</label>
                    <textarea id="of-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: 70 }} />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button type="button" disabled={busy} onClick={() => answer(false)} className="rounded-xl font-semibold" style={{ padding: '11px 16px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>Decline the offer</button>
                      <button type="button" onClick={() => setDeclining(false)} className="text-sm" style={{ color: 'var(--text-secondary)' }}>Back</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" disabled={busy} onClick={() => answer(true)} className="rounded-xl font-semibold text-white disabled:opacity-60" style={{ background: 'var(--gradient-brand)', padding: '12px 20px' }}>{busy ? 'Saving…' : 'Accept the offer'}</button>
                    <button type="button" disabled={busy} onClick={() => setDeclining(true)} className="rounded-xl font-semibold" style={{ padding: '12px 20px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>Decline</button>
                  </div>
                )
              ) : (
                <div role="status" className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  {offer.status === 'accepted' ? <CheckCircle size={22} style={{ color: 'var(--green)' }} /> : <XCircle size={22} style={{ color: 'var(--red)' }} />}
                  <span>{offer.status === 'accepted' ? 'You accepted this offer. CVMind will email your CVMind Team sign-in details before you start.' : 'You declined this offer. Thank you for letting us know.'}</span>
                </div>
              )}
              {error && <p role="alert" style={{ color: 'var(--red)', marginTop: 12 }}>{error}</p>}
              <p className="text-xs" style={{ color: 'var(--text-secondary)', marginTop: 20 }}>Check this letter is genuine at <a href={`/verify/${offer.verifyCode}`} style={{ textDecoration: 'underline' }}>cvmind.in/verify/{offer.verifyCode}</a>.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

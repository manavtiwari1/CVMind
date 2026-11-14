import { useEffect, useState } from 'react';
import { AlertCircle, BadgeCheck, RefreshCw, ShieldX, Sparkles } from 'lucide-react';
import { GradientBackground } from '../components/ui/sign-up';
import { API_BASE } from '../lib/apiBase';

// cvmind.in/verify/<code>: anyone (a college, an employer) checks that a CVMind letter or certificate is genuine.
interface Result { number: string; recipientName: string; type: string; title: string; issuedOn: string; issuer: string; status: 'valid' | 'revoked'; revokedOn: string | null }

const longDate = (v: string) => new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export default function VerifyLetter() {
  const code = (window.location.pathname.split('/').filter(Boolean)[1] || '').toUpperCase();
  const [state, setState] = useState<{ data?: Result; error?: string } | null>(code ? null : { error: 'This link has no letter code.' });

  useEffect(() => {
    if (!code) return;
    let active = true;
    fetch(`${API_BASE}/api/verify/${encodeURIComponent(code)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!active) return;
        setState(res.ok ? { data: json.data } : { error: json.error || 'No letter has this code.' });
      })
      .catch(() => { if (active) setState({ error: 'Could not check right now. Try again in a minute.' }); });
    return () => { active = false; };
  }, [code]);

  const d = state?.data;
  const valid = d?.status === 'valid';

  return (
    // Inline spacing: theme.css resets every element's margin and padding, which overrides Tailwind's spacing classes
    <div className="fixed inset-0 flex flex-col overflow-y-auto" style={{ background: 'var(--bg-primary)', zIndex: 1050 }}>
      <GradientBackground />
      <a href="/" className="relative z-10 flex items-center gap-2" style={{ padding: '20px 24px' }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--gradient-brand)' }}><Sparkles size={15} className="text-white" /></span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CVMind</span>
      </a>
      <div className="relative z-10 flex flex-1 items-center justify-center" style={{ padding: '0 16px 40px' }}>
        <div className="w-full max-w-[460px] rounded-2xl" role="status" style={{ padding: 28, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex justify-center" style={{ marginBottom: 14 }}>
            {!state ? <RefreshCw size={42} className="animate-spin" style={{ color: 'var(--blue)' }} />
              : valid ? <BadgeCheck size={48} style={{ color: 'var(--green)' }} />
                : d ? <ShieldX size={48} style={{ color: 'var(--red)' }} />
                  : <AlertCircle size={48} style={{ color: 'var(--red)' }} />}
          </div>
          <h1 className="text-center font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: 22, lineHeight: 1.25, marginBottom: 6 }}>
            {!state ? 'Checking the letter…' : valid ? 'Genuine CVMind letter' : d ? 'This letter was revoked' : 'Letter not found'}
          </h1>
          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)', marginBottom: d ? 20 : 0 }}>
            {!state ? `Code ${code}` : valid ? 'CVMind issued this letter and it is still valid.' : d ? `CVMind revoked it on ${d.revokedOn ? longDate(d.revokedOn) : 'a later date'}. It should not be relied on.` : state.error}
          </p>
          {d && (
            <dl className="text-sm" style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px', borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
              <dt style={{ color: 'var(--text-secondary)' }}>Issued to</dt><dd style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.recipientName}</dd>
              <dt style={{ color: 'var(--text-secondary)' }}>Letter</dt><dd style={{ color: 'var(--text-primary)' }}>{d.title}</dd>
              <dt style={{ color: 'var(--text-secondary)' }}>Number</dt><dd style={{ color: 'var(--text-primary)', fontFamily: 'ui-monospace, monospace' }}>{d.number}</dd>
              <dt style={{ color: 'var(--text-secondary)' }}>Issued on</dt><dd style={{ color: 'var(--text-primary)' }}>{longDate(d.issuedOn)}</dd>
              <dt style={{ color: 'var(--text-secondary)' }}>Issued by</dt><dd style={{ color: 'var(--text-primary)' }}>{d.issuer}</dd>
            </dl>
          )}
          {d && <p className="text-xs" style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Compare these details with the letter you were given. If anything differs, the letter has been altered.</p>}
        </div>
      </div>
    </div>
  );
}

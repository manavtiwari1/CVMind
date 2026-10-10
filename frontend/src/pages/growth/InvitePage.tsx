import { useEffect, useState } from 'react';
import { Check, Copy, Gift, Loader2, Mail, MessageCircle } from 'lucide-react';
import { LEO_POSES } from '../../lib/leoPoses';
import { getReferral, type ReferralSummary } from '../../lib/growthApi';
import { siteOrigin } from '../../lib/hosts';
import { getErrorMessage } from '../../utils/errors';
import './GrowthPages.css';

// Invite friends: a personal link; when a friend joins with it and verifies their email, both
// people get one extra AI Job Finder application (see backend/src/growth/referrals.js).

const STATUS: Record<ReferralSummary['invites'][number]['status'], { label: string; tone: string }> = {
  signed_up: { label: 'Joined · waiting for email verification', tone: 'wait' },
  qualified: { label: 'Rewarded', tone: 'ok' },
  rejected: { label: 'Not rewarded', tone: 'no' },
};

const dayMonth = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

interface InvitePageProps {
  setCurrentPage: (page: string) => void;
}

export default function InvitePage({ setCurrentPage }: InvitePageProps) {
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    getReferral()
      .then(d => { if (alive) setData(d); })
      .catch(err => { if (alive) setError(getErrorMessage(err) || 'Could not load your invite link.'); });
    return () => { alive = false; };
  }, []);

  const link = data ? `${siteOrigin()}/?ref=${data.code}` : '';
  const message = `I use CVMind to check my resume and find jobs. Join with my link and we both get an extra job application: ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy your invite link', link);
    }
  };

  return (
    <div className="gp-page gp-narrow">
      <header className="gp-hero">
        <img src={LEO_POSES.cheer} alt="" width={84} height={84} />
        <div>
          <span className="gp-eyebrow"><Gift size={14} /> Invite friends</span>
          <h1>Invite friends, get more job applications</h1>
          <p>When a friend joins CVMind with your link and verifies their email, you both get 1 extra application in AI Job Finder.</p>
        </div>
      </header>

      {error && <p className="gp-error" role="alert">{error}</p>}
      {!data && !error && <div className="gp-card gp-loading"><Loader2 size={18} className="animate-spin" /> Loading your link…</div>}

      {data && (
        <>
          <section className="gp-card">
            <h2>Your invite link</h2>
            <div className="gp-link">
              <code>{link.replace(/^https?:\/\//, '')}</code>
              <button type="button" className="gp-submit gp-submit--sm" onClick={copy}>
                {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy link</>}
              </button>
            </div>
            <div className="gp-share">
              <a className="gp-chip" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</a>
              <a className="gp-chip" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a className="gp-chip" href={`mailto:?subject=${encodeURIComponent('Try CVMind with my invite')}&body=${encodeURIComponent(message)}`}><Mail size={14} /> Email</a>
            </div>
          </section>

          <section className="gp-stats">
            <div className="gp-card gp-stat">
              <strong>{data.credits.available}</strong>
              <span>extra application{data.credits.available === 1 ? '' : 's'} to use{data.credits.nextExpiry ? ` (first expires ${dayMonth(data.credits.nextExpiry)})` : ''}</span>
              {data.credits.available > 0 && (
                <button type="button" className="gp-text-btn" onClick={() => setCurrentPage('job-finder')}>Find a job to apply to</button>
              )}
            </div>
            <div className="gp-card gp-stat">
              <strong>{data.rewardsThisMonth}<small>/{data.maxRewardsPerMonth}</small></strong>
              <span>friends rewarded in the last 30 days</span>
            </div>
          </section>

          <section className="gp-card">
            <h2>How it works</h2>
            <ol className="gp-steps">
              <li><strong>Share your link</strong> with friends who are job hunting.</li>
              <li><strong>They sign up</strong> with it, by email, Google, GitHub or LinkedIn.</li>
              <li><strong>They verify their email</strong>, and you both get an extra application right away.</li>
            </ol>
          </section>

          <section className="gp-card">
            <h2>People you invited</h2>
            {data.invites.length === 0 ? (
              <p className="gp-muted">Nobody yet. Friends who join with your link show up here.</p>
            ) : (
              <ul className="gp-invites">
                {data.invites.map(inv => (
                  <li key={`${inv.email}-${inv.createdAt}`}>
                    <span className="gp-invite-email">{inv.email}</span>
                    <span className={`gp-status gp-status--${STATUS[inv.status].tone}`} title={inv.reason || undefined}>
                      {STATUS[inv.status].label}{inv.status === 'rejected' && inv.reason ? `: ${inv.reason}` : ''}
                    </span>
                    <span className="gp-muted">{dayMonth(inv.qualifiedAt || inv.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="gp-fine">
            Rewards are for new accounts with a verified email that isn't a throwaway address, up to {data.maxRewardsPerMonth} a month.
            Extra applications last 60 days. Accounts made only to collect rewards can lose them.
          </p>
        </>
      )}
    </div>
  );
}

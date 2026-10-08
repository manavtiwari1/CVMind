import { useEffect, useState } from 'react';
import { loadBillingMe, type BillingMe } from '../lib/billing';
import './PlanUsage.css';

const dateIn = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const whenIn = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// The account's plan end date, AI tokens left in the 3-day window and this week's free uses
export default function PlanUsage() {
  const [me, setMe] = useState<BillingMe | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadBillingMe().then((d) => { if (!cancelled) setMe(d); }).catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p className="pu-error">{error}</p>;
  if (!me) return <div className="pu-loading" aria-label="Loading your plan" />;

  const left = Math.max(0, me.tokens.limit - me.tokens.used);
  const pct = Math.min(100, Math.round((me.tokens.used / me.tokens.limit) * 100));

  return (
    <div className="pu">
      {me.subscription && (
        <p className="pu-sub">
          <strong>{me.subscription.label}</strong> · Pro until {dateIn(me.subscription.expiresAt)}
        </p>
      )}

      <div className="pu-block">
        <div className="pu-row">
          <span className="pu-label">AI tokens, last 3 days</span>
          <span className="pu-value">{left.toLocaleString('en-IN')} left of {me.tokens.limit.toLocaleString('en-IN')}</span>
        </div>
        <div className="pu-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="AI tokens used">
          <span style={{ width: `${pct}%` }} className={pct >= 90 ? 'is-high' : ''} />
        </div>
        {me.tokens.resetsAt && me.tokens.used > 0 && <p className="pu-hint">Tokens free up again from {whenIn(me.tokens.resetsAt)}.</p>}
      </div>

      {!me.pro && (
        <div className="pu-block">
          <span className="pu-label">Free uses this week</span>
          <ul className="pu-weekly">
            {Object.entries(me.weekly).map(([key, w]) => (
              <li key={key}>
                <span>{w.label}</span>
                <span className={w.used >= w.limit ? 'pu-done' : ''}>{Math.max(0, w.limit - w.used)} of {w.limit} left</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

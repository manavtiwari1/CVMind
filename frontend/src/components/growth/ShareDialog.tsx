import { useEffect, useState } from 'react';
import { X, Copy, Check, Eye, Crown, Link2, Loader2 } from 'lucide-react';
import { getShareLink, saveShareLink, type ShareLink, type ShareStats } from '../../lib/growthApi';
import { siteOrigin } from '../../lib/hosts';
import { getErrorMessage } from '../../utils/errors';
import './growth.css';

// Share link for one resume: cvmind.in/r/<name>. The owner can turn it off, sees how many times it
// was opened, and (Pro) picks the name and sees where views came from.

interface ShareDialogProps {
  workId: string;
  title: string;
  onClose: () => void;
  onChange?: (link: ShareLink) => void;
  onUpgrade: () => void;
}

const linkUrl = (slug: string) => `${siteOrigin()}/r/${slug}`;

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function ShareDialog({ workId, title, onClose, onChange, onUpgrade }: ShareDialogProps) {
  const [link, setLink] = useState<ShareLink | null>(null);
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [pro, setPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');

  useEffect(() => {
    let alive = true;
    getShareLink(workId)
      .then(d => {
        if (!alive) return;
        setPro(d.pro);
        setLink(d.link);
        setStats(d.stats);
        setSlugDraft(d.link?.slug || '');
      })
      .catch(err => { if (alive) setError(getErrorMessage(err) || 'Could not load the share link.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [workId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async (input: { enabled?: boolean; slug?: string }) => {
    setBusy(true);
    setError('');
    try {
      const d = await saveShareLink(workId, input);
      setLink(d.link);
      setSlugDraft(d.link.slug);
      onChange?.(d.link);
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not save the link.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(linkUrl(link.slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy your link', linkUrl(link.slug));
    }
  };

  const maxDay = Math.max(1, ...(stats?.days.map(d => d.views) || [0]));

  return (
    <div className="gd-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gd-box" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <button type="button" className="gd-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className="gd-head">
          <span className="gd-icon"><Link2 size={18} /></span>
          <div>
            <h2 id="share-title">Share link</h2>
            <p title={title}>{title}</p>
          </div>
        </div>

        {loading ? (
          <div className="gd-loading"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : !link ? (
          <div className="sd-start">
            <p>Get a link to this resume you can put in applications, emails or your LinkedIn. You'll see how many times it's opened.</p>
            <button type="button" className="md-btn md-btn--solid" onClick={() => save({ enabled: true })} disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Create share link
            </button>
          </div>
        ) : (
          <>
            <label className="sd-switch">
              <input type="checkbox" checked={link.enabled} onChange={e => save({ enabled: e.target.checked })} disabled={busy} />
              <span className="sd-track" aria-hidden="true"><span /></span>
              <span>{link.enabled ? 'Link is on: anyone with the link can view this resume' : 'Link is off: people who open it see "This link is turned off"'}</span>
            </label>

            <div className={`sd-url${link.enabled ? '' : ' off'}`}>
              <code>{linkUrl(link.slug).replace(/^https?:\/\//, '')}</code>
              <button type="button" className="md-btn md-btn--outline" onClick={copy} disabled={!link.enabled}>
                {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
              </button>
            </div>

            <div className="sd-views">
              <Eye size={16} />
              <span>
                <strong>{link.viewCount}</strong> view{link.viewCount === 1 ? '' : 's'}
                {link.lastViewedAt ? ` · last opened ${timeAgo(link.lastViewedAt)}` : ' so far'}
              </span>
            </div>
            <p className="sd-privacy">Your own visits and link previews aren't counted. We don't record who opened the link.</p>

            {pro ? (
              <>
                <div className="sd-rename">
                  <label htmlFor="share-slug">Link name</label>
                  <div className="sd-rename-row">
                    <span>/r/</span>
                    <input id="share-slug" value={slugDraft} onChange={e => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} maxLength={40} />
                    <button type="button" className="md-btn md-btn--outline" onClick={() => save({ slug: slugDraft })} disabled={busy || !slugDraft || slugDraft === link.slug}>Save</button>
                  </div>
                </div>
                {stats && stats.days.length > 0 && (
                  <div className="sd-stats">
                    <h3>Last 30 days</h3>
                    <div className="sd-days">
                      {stats.days.map(d => (
                        <div key={d.day} className="sd-day" title={`${d.day}: ${d.views} view${d.views === 1 ? '' : 's'}`}>
                          <span style={{ height: `${Math.max(8, (d.views / maxDay) * 100)}%` }} />
                        </div>
                      ))}
                    </div>
                    {stats.referrers.length > 0 && (
                      <p className="sd-from">From: {stats.referrers.map(r => `${r.domain} (${r.views})`).join(', ')}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <button type="button" className="sd-pro" onClick={onUpgrade}>
                <Crown size={14} /> Pick your own link name and see where views come from with Pro
              </button>
            )}
          </>
        )}

        {error && <p className="gd-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

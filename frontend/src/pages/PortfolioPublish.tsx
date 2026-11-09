import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Globe, X } from 'lucide-react';
import { authFetch } from '../lib/authFetch';
import { getErrorMessage } from '../utils/errors';
import { siteUrl } from '../lib/portfolioSite';

export interface PublishedSite {
  username: string;
  enabled: boolean;
  publishedAt?: string;
}

interface PortfolioPublishProps {
  baseUrl: string;
  /** The saved document to publish; missing when the generated page could not be saved. */
  workId?: string;
  suggestedUsername: string;
  /** Contact details on the page, shown so the user knows they become public. */
  publicDetails: string[];
  site: PublishedSite | null;
  onSiteChange: (site: PublishedSite | null) => void;
  onClose: () => void;
  /** Set when the page was built but saving it failed; saves it again without rebuilding. */
  onSaveAgain?: () => void;
  saving?: boolean;
  saveError?: string;
}

type NameCheck = { state: 'idle' | 'checking' | 'ok' } | { state: 'bad'; message: string };

const USERNAME_SHAPE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export default function PortfolioPublish({ baseUrl, workId, suggestedUsername, publicDetails, site, onSiteChange, onClose, onSaveAgain, saving, saveError }: PortfolioPublishProps) {
  const [username, setUsername] = useState(site?.username ?? suggestedUsername);
  const [checked, setChecked] = useState<{ name: string; result: NameCheck } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // The username is fixed by the first publish, so only a new one needs checking
  const choosing = !site;

  const wellFormed = USERNAME_SHAPE.test(username);
  let nameCheck: NameCheck = { state: 'checking' };
  if (!username) nameCheck = { state: 'idle' };
  else if (!wellFormed) nameCheck = { state: 'bad', message: 'Use 3 to 40 lowercase letters, numbers and hyphens, starting and ending with a letter or number.' };
  else if (checked?.name === username) nameCheck = checked.result;

  useEffect(() => {
    if (!choosing || !wellFormed) return;
    let current = true;
    const finish = (result: NameCheck) => { if (current) setChecked({ name: username, result }); };
    const timer = setTimeout(async () => {
      try {
        const res = await authFetch(`${baseUrl}/api/portfolio/username-check?name=${encodeURIComponent(username)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) finish({ state: 'bad', message: data.error || 'Could not check that username.' });
        else finish(data.available ? { state: 'ok' } : { state: 'bad', message: data.problem });
      } catch (err) {
        finish({ state: 'bad', message: getErrorMessage(err) || 'Could not check that username.' });
      }
    }, 350);
    return () => { current = false; clearTimeout(timer); };
  }, [username, wellFormed, choosing, baseUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(`${baseUrl}/api/portfolio/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not publish your portfolio.');
      onSiteChange(data.site);
      setLiveUrl(siteUrl(data.site.username, baseUrl));
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not publish your portfolio.');
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(`${baseUrl}/api/portfolio/publish`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not take your site offline.');
      onSiteChange(data.site);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not take your site offline.');
      setBusy(false);
    }
  };

  const copy = () => {
    if (!liveUrl) return;
    void navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const heading = liveUrl ? 'Your portfolio is live' : !site ? 'Publish your portfolio' : site.enabled ? 'Update your site' : 'Publish your site again';
  const canPublish = Boolean(workId) && !busy && (!choosing || nameCheck.state === 'ok');

  return (
    <div className="pgx-publish-scrim" onClick={onClose}>
      <div className="pgx-publish" role="dialog" aria-modal="true" aria-labelledby="pgx-publish-title" onClick={e => e.stopPropagation()}>
        <header className="pgx-publish-head">
          <span className="pgx-artifact-icon"><Globe size={20} /></span>
          <h2 id="pgx-publish-title">{heading}</h2>
          <button type="button" className="pgx-icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </header>

        {liveUrl ? (
          <>
            <p className="pgx-publish-note">Anyone with this link can see your portfolio. Add it to your resume or send it to a recruiter.</p>
            <a className="pgx-publish-link" href={liveUrl} target="_blank" rel="noreferrer">{liveUrl.replace(/^https?:\/\/|\/$/g, '')}</a>
            <div className="pgx-publish-actions">
              <button type="button" className="pgx-chip" onClick={copy}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}
              </button>
              <a className="pgx-publish-primary" href={liveUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={15} /> Open site
              </a>
            </div>
          </>
        ) : !workId && onSaveAgain ? (
          <>
            <p className="pgx-publish-note">Your page is built, but it couldn't be saved to your account. Save it first, then you can publish it.</p>
            {saveError && <p className="pgx-error" role="alert">{saveError}</p>}
            <div className="pgx-publish-actions">
              <button type="button" className="pgx-publish-primary" onClick={onSaveAgain} disabled={saving}>
                {saving ? 'Saving…' : 'Save again'}
              </button>
            </div>
          </>
        ) : !workId ? (
          <p className="pgx-publish-note">This portfolio wasn't saved to your account, so it can't be published. Build it again while signed in.</p>
        ) : (
          <>
            {choosing ? (
              <>
                <label className="pgx-publish-label" htmlFor="pgx-username">Choose your username</label>
                <div className={`pgx-publish-field${nameCheck.state === 'bad' ? ' is-bad' : ''}`}>
                  <input
                    id="pgx-username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    maxLength={40}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                  />
                  <span>.portfolio.cvmind.in</span>
                </div>
                <p className={`pgx-publish-hint is-${nameCheck.state}`} role="status">
                  {nameCheck.state === 'bad' && nameCheck.message}
                  {nameCheck.state === 'checking' && 'Checking…'}
                  {nameCheck.state === 'ok' && 'Available. This will be your permanent address.'}
                </p>
              </>
            ) : (
              <p className="pgx-publish-note">
                This replaces the page at <strong>{site.username}.portfolio.cvmind.in</strong>. The link stays the same.
              </p>
            )}

            {publicDetails.length > 0 && (
              <div className="pgx-publish-public">
                <strong>These details will be public</strong>
                <ul>{publicDetails.map(d => <li key={d}>{d}</li>)}</ul>
                <span>Don't want one of them shown? Remove it from your resume and rebuild first.</span>
              </div>
            )}

            {error && <p className="pgx-error" role="alert">{error}</p>}

            <div className="pgx-publish-actions">
              {site?.enabled && (
                <button type="button" className="pgx-chip" onClick={() => void unpublish()} disabled={busy}>Take site offline</button>
              )}
              <button type="button" className="pgx-publish-primary" onClick={() => void publish()} disabled={!canPublish}>
                {busy ? 'Working…' : site?.enabled ? 'Update site' : 'Publish'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

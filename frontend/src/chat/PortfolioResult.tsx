import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, ExternalLink, Globe, History, MessageSquare, PenLine, Rocket, RotateCcw, Undo2 } from 'lucide-react';
import { API_BASE } from '../lib/apiBase';
import { authFetch } from '../lib/authFetch';
import { portfolioSlug, siteUrl, suggestedUsername } from '../lib/portfolioSite';
import { getErrorMessage } from '../utils/errors';
import PortfolioPublish, { type PublishedSite } from '../pages/PortfolioPublish';
import '../pages/PortfolioGen.css';
import type { SavedWork } from '../types/api';
import type { PortfolioCard, PortfolioLooksCard } from './chatApi';

interface Actions {
  openWork: (work: SavedWork) => void;
  portfolioSaved: (card: PortfolioCard, workId: string) => void;
  compose: (text: string) => void;
  tap: (action: 'restore', value: Record<string, string>, label: string) => void;
}

// The looks as small sample pages; a tap answers Leo
export function PortfolioLooks({ card, live, busy, tap }: { card: PortfolioLooksCard; live: boolean; busy: boolean; tap: (label: string) => void }) {
  const [picked, setPicked] = useState('');
  return (
    <>
      <div className="lc-kicker">Pick a look, or type the style you want</div>
      <div className="lc-looks" role="group" aria-label="Pick a look">
        {card.looks.map((look) => (
          <button
            key={look.id}
            type="button"
            className={`lc-look ${picked === look.id ? 'is-picked' : ''}`}
            style={{ '--look-bg': look.bg, '--look-accent': look.accent, '--look-text': look.text } as CSSProperties}
            disabled={!live || busy}
            onClick={() => { setPicked(look.id); tap(look.label); }}
          >
            <span className="lc-look-mini" aria-hidden="true"><i /><b /><b /><u /></span>
            <span className="lc-look-name">{picked === look.id && <Check size={13} strokeWidth={3} />}{look.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// The website Leo built: a preview, then the same Publish dialog as the Portfolio Studio. Each
// edit saves over the same document, so only the newest card can publish what it shows.
export default function PortfolioResult({ card, actions, latest, busy }: { card: PortfolioCard; actions: Actions; latest: boolean; busy: boolean }) {
  const [workId, setWorkId] = useState(card.workId);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [site, setSite] = useState<PublishedSite | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [opening, setOpening] = useState(false);

  const name = card.data.name?.trim();
  const address = `${site?.username || suggestedUsername(name)}.portfolio.cvmind.in`;
  const content = () => JSON.stringify({ portfolioData: card.data, colorTheme: card.theme, style: card.theme, portfolioHTML: card.html });
  const title = `Portfolio - ${name || 'My Portfolio'}`;

  // Saves the finished page; it never builds again, so it costs no AI tokens
  const saveAgain = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await authFetch(`${API_BASE}/api/user/work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type: 'portfolio-gen', templateId: `portfolio-${card.theme}`, htmlContent: content() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save your portfolio.');
      const id = String(data.data.id || data.data._id);
      setWorkId(id);
      actions.portfolioSaved(card, id);
    } catch (err) {
      setSaveError(getErrorMessage(err) || 'Could not save your portfolio. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // The account's existing site decides whether this is a first publish or an update
  const openPublish = async () => {
    setOpening(true);
    try {
      const res = await authFetch(`${API_BASE}/api/portfolio/site`);
      const data = res.ok ? await res.json() : null;
      setSite(data?.site ?? null);
    } catch { /* It just starts as a first publish; the server keeps the username fixed either way */ }
    setOpening(false);
    setPublishing(true);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([card.html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioSlug(name)}-cvmind.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="lc-portfolio">
      <div className="lc-portfolio-frame">
        <div className="lc-portfolio-url"><Globe size={13} /><span>{address}</span></div>
        {/* No scripts or forms, and the chat keeps scrolling over it */}
        <iframe srcDoc={card.html} title={`Preview of ${name || 'your'} portfolio`} sandbox="" tabIndex={-1} />
      </div>

      <div>
        <div className="lc-kicker">Your portfolio · {card.themeLabel}{card.restored ? ' · Restored' : card.edited ? ' · Edited' : ''}</div>
        <div className="lc-title">{name || 'Portfolio website'}</div>
        {latest
          ? workId && <p className="lc-text lc-saved"><Check size={14} /> Saved to My Documents</p>
          : <p className="lc-text">Older version. Your newest one is further down this chat.</p>}
      </div>

      {latest && site?.enabled && (
        <a className="lc-portfolio-live" href={siteUrl(site.username, API_BASE)} target="_blank" rel="noreferrer">
          <i aria-hidden="true" /><span>{site.username}.portfolio.cvmind.in</span><ExternalLink size={14} />
        </a>
      )}

      {latest && !workId && (
        <div className="lc-portfolio-alert" role="alert">
          {saveError || "This page couldn't be saved to your account yet. Save it before you leave this chat. It won't use any AI tokens."}
        </div>
      )}

      <div className="lc-actions">
        {latest && (workId ? (
          <button type="button" className="lc-btn lc-btn-primary" onClick={() => void openPublish()} disabled={opening}>
            <Rocket size={15} /> {site?.enabled ? 'Update my site' : 'Publish'}
          </button>
        ) : (
          <button type="button" className="lc-btn lc-btn-primary" onClick={() => void saveAgain()} disabled={saving}>
            <RotateCcw size={15} /> {saving ? 'Saving…' : 'Save again'}
          </button>
        ))}
        {latest && (
          <button type="button" className="lc-btn" onClick={() => actions.compose('')}>
            <MessageSquare size={15} /> Edit with Leo
          </button>
        )}
        {latest && card.edited && (
          <button type="button" className="lc-btn" disabled={busy} onClick={() => actions.tap('restore', {}, 'Undo the last change')}>
            <Undo2 size={15} /> Undo
          </button>
        )}
        {!latest && (
          <button type="button" className="lc-btn" disabled={busy} onClick={() => actions.tap('restore', { cardId: card.id }, 'Go back to this version')}>
            <History size={15} /> Go back to this version
          </button>
        )}
        {latest && (
          <button
            type="button"
            className="lc-btn"
            onClick={() => actions.openWork({ ...(workId ? { _id: workId } : {}), title, type: 'portfolio-gen', templateId: `portfolio-${card.theme}`, htmlContent: content() })}
          >
            <PenLine size={15} /> Open in Studio
          </button>
        )}
        <button type="button" className="lc-btn" onClick={download}><Download size={15} /> Download</button>
      </div>

      {publishing && createPortal(
        <div className="pgx-vars">
          <PortfolioPublish
            baseUrl={API_BASE}
            workId={workId}
            suggestedUsername={suggestedUsername(name)}
            publicDetails={[card.data.email, card.data.phone, card.data.location].filter((d): d is string => Boolean(d))}
            site={site}
            onSiteChange={setSite}
            onClose={() => setPublishing(false)}
          />
        </div>,
        document.querySelector('.app-container') ?? document.body,
      )}
    </div>
  );
}

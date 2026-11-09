import { useEffect, useState } from 'react';
import {
  Briefcase, Check, Compass, FileSearch, FilePen, Globe, Handshake, Loader2, Mail, MessageSquare, Plug, SpellCheck, Target, Users, X, type LucideIcon
} from 'lucide-react';
import { connectAllTools, connectTool, disconnectTool, getConnectors, type Connector } from './chatApi';

// The tools Leo can use. Connect the ones you want, then just ask Leo in the chat.

const ICONS: Record<string, LucideIcon> = {
  'resume-check': FileSearch,
  'resume-builder': FilePen,
  tailor: Target,
  'cover-letter': Mail,
  proofread: SpellCheck,
  'job-finder': Briefcase,
  interview: MessageSquare,
  career: Compass,
  linkedin: Users,
  portfolio: Globe,
  negotiation: Handshake,
};

interface Props {
  isLoggedIn: boolean;
  onSignIn: () => void;
  onClose: () => void;
  onChange: (connectedCount: number) => void;
}

export default function ConnectorsPanel({ isLoggedIn, onSignIn, onClose, onChange }: Props) {
  const [items, setItems] = useState<Connector[] | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) return;
    getConnectors().then(setItems).catch((err) => setError((err as Error).message));
  }, [isLoggedIn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const show = (next: Connector[]) => {
    setItems(next);
    onChange(next.filter((c) => c.connected).length);
  };

  const run = async (key: string, work: () => Promise<Connector[]>) => {
    setBusy(key);
    setError('');
    try {
      show(await work());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  };

  const connectedCount = items?.filter((c) => c.connected).length ?? 0;
  const allOn = !!items && connectedCount === items.length;

  return (
    <div className="lk-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lk-panel" role="dialog" aria-modal="true" aria-labelledby="lk-title">
        <header className="lk-head">
          <div>
            <h2 id="lk-title"><Plug size={18} /> Connectors</h2>
            <p>Connect the tools Leo can use, then just tell him what you need.</p>
          </div>
          <button type="button" className="lx-icon-btn" onClick={onClose} aria-label="Close connectors"><X size={20} /></button>
        </header>

        {!isLoggedIn ? (
          <div className="lk-empty">
            <p>Sign in to connect tools. It's free.</p>
            <button type="button" className="lc-btn lc-btn-primary" onClick={onSignIn}>Sign in free</button>
          </div>
        ) : !items ? (
          <div className="lk-empty">{error ? <p role="alert">{error}</p> : <Loader2 size={20} className="lx-spin" />}</div>
        ) : (
          <>
            <ul className="lk-list">
              {items.map((c) => {
                const Icon = ICONS[c.id] || Plug;
                return (
                  <li key={c.id} className={c.connected ? 'is-on' : ''}>
                    <span className="lk-icon" aria-hidden="true"><Icon size={18} /></span>
                    <span className="lk-text"><strong>{c.label}</strong><small>{c.description}</small></span>
                    <button
                      type="button"
                      className={`lc-btn ${c.connected ? '' : 'lc-btn-primary'}`}
                      disabled={!!busy}
                      aria-label={`${c.connected ? 'Disconnect' : 'Connect'} ${c.label}`}
                      onClick={() => void run(c.id, () => (c.connected ? disconnectTool(c.id) : connectTool(c.id)))}
                    >
                      {busy === c.id ? <Loader2 size={14} className="lx-spin" /> : c.connected ? <><Check size={14} /> Connected</> : 'Connect'}
                    </button>
                  </li>
                );
              })}
            </ul>
            {error && <p className="lm-message lm-bad" role="alert">{error}</p>}
            <footer className="lk-foot">
              <button type="button" className="lc-btn" disabled={!!busy || allOn} onClick={() => void run('all', connectAllTools)}>{busy === 'all' ? <Loader2 size={14} className="lx-spin" /> : null} Connect all</button>
              <button type="button" className="lc-btn lc-btn-primary" onClick={onClose}>{connectedCount ? `Done, ${connectedCount} connected` : 'Done'}</button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

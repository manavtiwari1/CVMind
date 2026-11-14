import { useEffect, useState } from 'react';
import { Bookmark, BookmarkX } from 'lucide-react';
import { api } from '../api';
import { toggleSaved } from '../saved';
import { hrefFor, useTeam } from '../store';
import { Avatar, Empty, RichText } from '../ui';
import { Spinner } from '../ui';

// Saved for later: messages I bookmarked from any channel or chat
interface SavedMessage { id: string; channelId: string; authorId: string; body: string; createdAt: string }

export default function Saved() {
  const { person, nameOf, channels, toast } = useTeam();
  const [rows, setRows] = useState<SavedMessage[] | null>(null);
  useEffect(() => { api<{ data: SavedMessage[] }>('/saved').then((r) => setRows(r.data)).catch((e: Error) => toast(e.message, 'error')); }, [toast]);
  const where = (id: string) => { const c = channels.find((x) => x.id === id); return c ? (c.kind === 'dm' ? 'Direct message' : `#${c.name}`) : 'A conversation'; };
  const remove = async (m: SavedMessage) => {
    try { await toggleSaved(m.id, false); setRows((r) => (r || []).filter((x) => x.id !== m.id)); } catch (err) { toast((err as Error).message, 'error'); }
  };
  return (
    <div className="tm-page narrow">
      <header className="tm-page-head"><h1>Saved</h1></header>
      {!rows ? <Spinner size={20} /> : rows.length === 0 ? <Empty icon={<Bookmark size={20} />} title="Nothing saved yet" text="Use ⋯ → Save for later on any message to keep it here." /> : (
        <ul className="tm-saved-list">
          {rows.map((m) => (
            <li key={m.id} className="tm-card pad">
              <div className="tm-saved-head">
                <Avatar person={person(m.authorId)} size={24} />
                <strong>{nameOf(m.authorId)}</strong>
                <span className="tm-muted">· {where(m.channelId)} · {new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <span className="tm-saved-actions">
                  <a className="tm-btn sm" href={hrefFor('chat', m.channelId, { m: m.id })}>Open</a>
                  <button type="button" className="tm-btn sm ghost" onClick={() => remove(m)} aria-label="Remove from saved"><BookmarkX size={14} /></button>
                </span>
              </div>
              <RichText text={m.body} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

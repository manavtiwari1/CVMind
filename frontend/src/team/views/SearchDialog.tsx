import { useEffect, useState } from 'react';
import { CheckSquare, FileText, Hash, Megaphone, Search } from 'lucide-react';
import { api } from '../api';
import type { Person, TeamFile, TaskStatus } from '../api';
import { go, hrefFor, useTeam } from '../store';
import { ago } from '../format';
import { Avatar, Modal, Spinner, StatusBadge } from '../ui';
import { openFile } from '../upload';

interface Results {
  messages: Array<{ id: string; channelId: string; parentId: string | null; authorId: string; body: string; createdAt: string }>;
  tasks: Array<{ id: string; title: string; status: TaskStatus; dueAt: string | null }>;
  announcements: Array<{ id: string; title: string; createdAt: string }>;
  files: TeamFile[];
  people: Person[];
}

export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const { nameOf, channels, me, toast } = useTeam();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ q: string; results: Results | null }>({ q: '', results: null });
  const searchable = q.trim().length >= 2;
  const results = searchable && found.q === q ? found.results : null;
  const busy = searchable && found.q !== q;

  useEffect(() => {
    if (!searchable) return;
    const id = setTimeout(() => {
      api<Results>('/search', { query: { q } }).then((r) => setFound({ q, results: r })).catch(() => setFound({ q, results: null }));
    }, 250);
    return () => clearTimeout(id);
  }, [q, searchable]);

  const where = (channelId: string) => {
    const c = channels.find((x) => x.id === channelId);
    if (!c) return '';
    return c.kind === 'dm' ? (c.memberIds || []).filter((m) => m !== me.id).map(nameOf).join(', ') : `#${c.name}`;
  };
  const message = async (personId: string) => {
    try {
      const { data } = await api<{ data: { id: string } }>('/dm', { method: 'POST', body: { adminIds: [personId] } });
      onClose();
      go('chat', data.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not open the conversation.', 'error');
    }
  };
  const empty = results && !results.messages.length && !results.tasks.length && !results.announcements.length && !results.files.length && !results.people.length;

  return (
    <Modal title="Search" onClose={onClose} wide>
      <div className="tm-search-box">
        <Search size={18} />
        <input className="tm-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages, tasks, announcements, files and people" autoFocus aria-label="Search" />
        {busy && <Spinner />}
      </div>
      {empty && <p className="tm-muted pad">No results for “{q}”.</p>}
      {results && (
        <div className="tm-results" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) onClose(); }}>
          {results.people.length > 0 && <h3>People</h3>}
          {results.people.map((p) => (
            <button key={p.id} type="button" className="tm-result" onClick={() => message(p.id)}>
              <Avatar person={p} size={26} presence /> <span><strong>{p.name}</strong> <span className="tm-muted">@{p.username} · {p.roleLabel}</span></span>
            </button>
          ))}
          {results.tasks.length > 0 && <h3>Tasks</h3>}
          {results.tasks.map((t) => (
            <a key={t.id} className="tm-result" href={hrefFor('tasks', t.id)}><CheckSquare size={16} /> <span><strong>{t.title}</strong></span> <StatusBadge status={t.status} /></a>
          ))}
          {results.messages.length > 0 && <h3>Messages</h3>}
          {results.messages.map((m) => (
            <a key={m.id} className="tm-result" href={hrefFor('chat', m.channelId, m.parentId ? { thread: m.parentId } : { m: m.id })}>
              <Hash size={16} />
              <span><span className="tm-muted small">{nameOf(m.authorId)} in {where(m.channelId)} · {ago(m.createdAt)}</span><span className="tm-clamp">{m.body}</span></span>
            </a>
          ))}
          {results.announcements.length > 0 && <h3>Announcements</h3>}
          {results.announcements.map((a) => (
            <a key={a.id} className="tm-result" href={hrefFor('announcements', a.id)}><Megaphone size={16} /> <span><strong>{a.title}</strong> <span className="tm-muted small">{ago(a.createdAt)}</span></span></a>
          ))}
          {results.files.length > 0 && <h3>Files</h3>}
          {results.files.map((f) => (
            <button key={f.id} type="button" className="tm-result" onClick={() => openFile(f.id).catch(() => {})}><FileText size={16} /> <span><strong>{f.name}</strong> <span className="tm-muted small">{nameOf(f.uploadedBy)} · {ago(f.createdAt)}</span></span></button>
          ))}
        </div>
      )}
      {!results && !busy && <p className="tm-muted small pad">Tip: press Ctrl + K anywhere to search.</p>}
    </Modal>
  );
}

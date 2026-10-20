import { useState } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { api } from '../api';
import { go, useTeam } from '../store';
import { Avatar, PresenceLabel } from '../ui';

export default function People() {
  const { people, me, toast } = useTeam();
  const [q, setQ] = useState('');
  const list = [...people.values()]
    .filter((p) => p.active)
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.username.includes(q.toLowerCase()) || p.roleLabel.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.presence === b.presence ? a.name.localeCompare(b.name) : a.presence === 'online' ? -1 : b.presence === 'online' ? 1 : 0));

  const message = async (id: string) => {
    try {
      const { data } = await api<{ data: { id: string } }>('/dm', { method: 'POST', body: { adminIds: [id] } });
      go('chat', data.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not open the conversation.', 'error');
    }
  };

  return (
    <div className="tm-page">
      <header className="tm-page-head"><h1>People</h1><p className="tm-muted">{list.length} people on CVMind Team.</p></header>
      <div className="tm-search-inline"><Search size={16} /><input className="tm-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or role" aria-label="Search people" /></div>
      <div className="tm-people">
        {list.map((p) => (
          <div key={p.id} className="tm-card pad tm-person-card">
            <Avatar person={p} size={48} presence />
            <div className="tm-person-info">
              <strong>{p.name}{p.id === me.id && ' (you)'}</strong>
              <span className="tm-muted">@{p.username} · {p.roleLabel}{p.manager ? ' · Manager' : ''}</span>
              {p.statusText && <span className="tm-status-text">{p.statusText}</span>}
              <PresenceLabel person={p} />
            </div>
            {p.id !== me.id && <button type="button" className="tm-btn sm" onClick={() => message(p.id)}><MessageSquare size={14} /> Message</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

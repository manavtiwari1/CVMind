import { useState } from 'react';
import { IdCard as IdCardIcon, MessageSquare, Search, Sparkles } from 'lucide-react';
import { IdCard } from '../IdCard';
import { ProgressReport } from './Leo';
import { api } from '../api';
import type { Person } from '../api';
import { go, useTeam } from '../store';
import { Avatar, Modal, PresenceLabel } from '../ui';

export default function People() {
  const { people, me, manager, toast } = useTeam();
  const [q, setQ] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [card, setCard] = useState<Person | null>(null);
  const query = q.trim().toLowerCase();
  const list = [...people.values()]
    .filter((p) => p.active)
    .filter((p) => !query || p.name.toLowerCase().includes(query) || p.username.includes(query) || p.roleLabel.toLowerCase().includes(query))
    .sort((a, b) => (a.id === me.id ? -1 : b.id === me.id ? 1 : a.name.localeCompare(b.name)));
  const online = list.filter((p) => p.presence !== 'offline');
  const offline = list.filter((p) => p.presence === 'offline');

  const message = async (id: string) => {
    try {
      const { data } = await api<{ data: { id: string } }>('/dm', { method: 'POST', body: { adminIds: [id] } });
      go('chat', data.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not open the conversation.', 'error');
    }
  };

  const row = (p: Person) => (
    <li key={p.id} className="tm-dir-row">
      <Avatar person={p} size={40} presence />
      <div className="tm-dir-who">
        <span className="tm-dir-name">{p.name}{p.id === me.id && <span className="tm-dir-you">You</span>}</span>
        <span className="tm-muted small">@{p.username}</span>
      </div>
      <span className="tm-dir-role">{p.roleLabel}</span>
      <span className="tm-dir-status">{p.statusText ? <span className="tm-status-text">{p.statusText}</span> : <PresenceLabel person={p} />}</span>
      <span className="tm-dir-action">
        <button type="button" className="tm-btn sm ghost" onClick={() => setCard(p)} aria-label={`ID card of ${p.name}`} title="ID card"><IdCardIcon size={14} /> <span>ID card</span></button>
        {manager && p.id !== me.id && <button type="button" className="tm-btn sm ghost" onClick={() => setReport(p.id)} aria-label={`Progress report for ${p.name}`} title="Progress report by Leo"><Sparkles size={14} /> <span>Report</span></button>}
        {p.id !== me.id && <button type="button" className="tm-btn sm" onClick={() => message(p.id)} aria-label={`Message ${p.name}`}><MessageSquare size={14} /> <span>Message</span></button>}
      </span>
    </li>
  );

  return (
    <div className="tm-page">
      <header className="tm-page-head row">
        <div><h1>People</h1><p className="tm-muted">{list.length} {list.length === 1 ? 'person' : 'people'} on CVMind Team · {online.length} online now</p></div>
        <div className="tm-search-inline"><Search size={16} /><input className="tm-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or role" aria-label="Search people" /></div>
      </header>
      {online.length > 0 && (
        <section className="tm-dir">
          <h2 className="tm-dir-head">Online <span>{online.length}</span></h2>
          <ul className="tm-card tm-dir-list">{online.map(row)}</ul>
        </section>
      )}
      {offline.length > 0 && (
        <section className="tm-dir">
          <h2 className="tm-dir-head">Offline <span>{offline.length}</span></h2>
          <ul className="tm-card tm-dir-list">{offline.map(row)}</ul>
        </section>
      )}
      {!list.length && <p className="tm-muted">Nobody matches “{q}”.</p>}
      {card && (
        <Modal title="ID card" onClose={() => setCard(null)}>
          <IdCard person={card} />
          {card.id === me.id && <p className="tm-hint" style={{ marginTop: 12 }}>Change your photo, phone number and department from <a href="#" onClick={(e) => { e.preventDefault(); setCard(null); go('profile'); }}>Profile</a>.</p>}
        </Modal>
      )}
      {report && <ProgressReport adminId={report} onClose={() => setReport(null)} />}
    </div>
  );
}

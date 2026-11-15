import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Mail, Search, Send } from 'lucide-react';
import { api } from '../api';
import type { Person } from '../api';
import { useTeam } from '../store';
import { Avatar, Spinner } from '../ui';

// Managers write one email to one person, a group or the whole team. Each person gets their own
// copy from CVMind with the manager's name on it; replies go to the CVMind support inbox.
type Group = 'everyone' | 'employees' | 'interns' | 'pick';
const GROUPS: [Group, string][] = [['everyone', 'Everyone'], ['employees', 'Employees'], ['interns', 'Interns'], ['pick', 'Pick people']];
const isIntern = (p: Person) => p.idNumber.startsWith('CVM/INTERNS/');

export default function Email() {
  const { people, me, toast } = useTeam();
  const [group, setGroup] = useState<Group>('everyone');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const team = useMemo(() => [...people.values()].filter((p) => p.active && p.id !== me.id).sort((a, b) => a.name.localeCompare(b.name)), [people, me.id]);
  const recipients = useMemo(() => {
    if (group === 'everyone') return team;
    if (group === 'employees') return team.filter((p) => !isIntern(p));
    if (group === 'interns') return team.filter(isIntern);
    return team.filter((p) => picked.has(p.id));
  }, [group, team, picked]);
  const noEmail = recipients.filter((p) => !p.email);
  const query = q.trim().toLowerCase();
  const pickList = team.filter((p) => !query || p.name.toLowerCase().includes(query) || p.username.includes(query) || p.roleLabel.toLowerCase().includes(query));

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!recipients.length) return;
    setBusy(true);
    try {
      const r = await api<{ sent: number; failed: number; noEmail: string[] }>('/email', { method: 'POST', body: { adminIds: recipients.map((p) => p.id), subject, message } });
      const skipped = r.failed + (r.noEmail?.length || 0);
      toast(`Email sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}${skipped ? ` · ${skipped} could not get it` : ''}`, skipped ? 'error' : undefined);
      setSubject('');
      setMessage('');
      setPicked(new Set());
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send the email.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tm-page narrow">
      <header className="tm-page-head"><h1>Email</h1><p className="tm-muted">Send an email to one person, a group or the whole team.</p></header>
      <form className="tm-card pad tm-form tm-mail" onSubmit={send}>
        <div className="tm-field">
          <span className="tm-label">To</span>
          <div className="tm-segment" role="tablist" aria-label="Who gets this email">
            {GROUPS.map(([g, label]) => (
              <button key={g} type="button" role="tab" aria-selected={group === g} className={group === g ? 'active' : ''} onClick={() => setGroup(g)}>{label}</button>
            ))}
          </div>
          {group === 'pick' ? (
            <div className="tm-mail-pick">
              <div className="tm-search-inline"><Search size={16} /><input className="tm-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or role" aria-label="Search people" /></div>
              <ul className="tm-mail-list">
                {pickList.map((p) => (
                  <li key={p.id}>
                    <label className={`tm-mail-person ${picked.has(p.id) ? 'on' : ''}`}>
                      <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                      <Avatar person={p} size={28} />
                      <span className="tm-mail-who"><strong>{p.name}</strong><span className="tm-muted small">{p.roleLabel}</span></span>
                      {!p.email && <span className="tm-mail-warn">No email</span>}
                    </label>
                  </li>
                ))}
                {!pickList.length && <li className="tm-muted small" style={{ padding: 8 }}>Nobody matches “{q}”.</li>}
              </ul>
            </div>
          ) : (
            <div className="tm-mail-chips" aria-live="polite">
              {recipients.slice(0, 12).map((p) => <span key={p.id} className="tm-chip"><Avatar person={p} size={20} />{p.name}</span>)}
              {recipients.length > 12 && <span className="tm-muted small">and {recipients.length - 12} more</span>}
              {!recipients.length && <span className="tm-muted small">Nobody in this group yet.</span>}
            </div>
          )}
          <span className="tm-hint">
            {recipients.length} {recipients.length === 1 ? 'person' : 'people'} will get it, each in their own inbox.
            {noEmail.length > 0 && ` ${noEmail.map((p) => p.name).join(', ')} ${noEmail.length === 1 ? 'has' : 'have'} no email address and will be skipped.`}
          </span>
        </div>
        <div className="tm-field">
          <label htmlFor="mail-subject">Subject</label>
          <input id="mail-subject" className="tm-input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} required />
        </div>
        <div className="tm-field">
          <label htmlFor="mail-message">Message</label>
          <textarea id="mail-message" className="tm-input tm-textarea" rows={9} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} required />
          <span className="tm-hint">Sent from CVMind with your name on it. Replies go to cvmindofficial@gmail.com.</span>
        </div>
        <div className="tm-mail-foot">
          <button type="submit" className="tm-btn primary" disabled={busy || !recipients.length || !subject.trim() || !message.trim()}>
            {busy ? <Spinner size={14} /> : <Send size={15} />} Send to {recipients.length} {recipients.length === 1 ? 'person' : 'people'}
          </button>
        </div>
      </form>
      {!team.length && <p className="tm-muted"><Mail size={14} /> Nobody else is on CVMind Team yet.</p>}
    </div>
  );
}

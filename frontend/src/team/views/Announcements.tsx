import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Check, Megaphone, Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { api } from '../api';
import { confirmDialog } from '../confirm';
import type { Announcement } from '../api';
import { go, hrefFor, useLoad, useTeam, useTeamEvent } from '../store';
import { useAttachments } from '../attachments';
import { ago } from '../format';
import { AttachButton, Avatar, Empty, EmojiPicker, FileList, Modal, PendingFiles, RichText, Spinner } from '../ui';

export default function Announcements({ id }: { id: string }) {
  const { manager } = useTeam();
  const { data, loading, reload } = useLoad<{ data: Announcement[] }>('/announcements', { limit: 50 });
  const [composing, setComposing] = useState(false);
  useTeamEvent('announcement.created', reload, reload);
  useTeamEvent('announcement.updated', reload);

  if (id) return <AnnouncementPage key={id} id={id} />;

  return (
    <div className="tm-page narrow">
      <header className="tm-page-head row">
        <div><h1>Announcements</h1><p className="tm-muted">Company updates. Press Acknowledge so your manager knows you have read it.</p></div>
        {manager && <button type="button" className="tm-btn primary" onClick={() => setComposing(true)}><Plus size={16} /> New announcement</button>}
      </header>
      {loading && !data && <div className="tm-center"><Spinner /></div>}
      {data && !data.data.length && <Empty icon={<Megaphone size={22} />} title="No announcements yet" text={manager ? 'Post the first company update.' : 'Company updates will show up here.'} />}
      {data?.data.map((a) => <AnnouncementCard key={a.id} a={a} onChanged={reload} />)}
      {composing && <AnnouncementForm onClose={() => setComposing(false)} onSaved={reload} />}
    </div>
  );
}

function AnnouncementPage({ id }: { id: string }) {
  const [a, setA] = useState<Announcement | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    api<{ data: Announcement }>(`/announcements/${id}`).then((r) => setA(r.data)).catch((err: Error) => setError(err.message));
    api('/notifications/read', { method: 'POST', body: { refId: id } }).catch(() => {});
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useTeamEvent('announcement.updated', (p) => { if (p.announcementId === id) load(); });
  if (error) return <div className="tm-page"><Empty title="Announcement not found" text={error} /></div>;
  if (!a) return <div className="tm-center"><Spinner /></div>;
  return (
    <div className="tm-page narrow">
      <a className="tm-back" href={hrefFor('announcements')}><ArrowLeft size={15} /> All announcements</a>
      <AnnouncementCard a={a} onChanged={load} full />
    </div>
  );
}

function AnnouncementCard({ a, onChanged, full }: { a: Announcement; onChanged: () => void; full?: boolean }) {
  const { me, manager, person, nameOf, toast, people } = useTeam();
  const [editing, setEditing] = useState(false);
  const [acks, setAcks] = useState<{ data: Array<{ adminId: string; ackedAt: string | null }>; total: number; acked: number } | null>(null);
  const long = !full && a.body.length > 600;

  const ack = async () => {
    await api(`/announcements/${a.id}/ack`, { method: 'POST' }).catch((err: Error) => toast(err.message, 'error'));
    onChanged();
  };
  const react = (emoji: string) => api(`/announcements/${a.id}/reactions`, { method: 'POST', body: { emoji } }).then(onChanged).catch(() => {});
  const togglePin = () => api(`/announcements/${a.id}`, { method: 'PATCH', body: { pinned: !a.pinned } }).then(onChanged).catch((err: Error) => toast(err.message, 'error'));
  const remove = async () => {
    if (!(await confirmDialog({ title: 'Delete this announcement?', message: 'It disappears for everyone. This is recorded in the audit log.', confirmLabel: 'Delete', danger: true }))) return;
    await api(`/announcements/${a.id}`, { method: 'DELETE' }).catch((err: Error) => toast(err.message, 'error'));
    if (full) go('announcements'); else onChanged();
  };
  const showAcks = async () => {
    const res = await api<{ data: Array<{ adminId: string; ackedAt: string | null }>; total: number; acked: number }>(`/announcements/${a.id}/acks`);
    setAcks(res);
  };

  return (
    <article className={`tm-card pad tm-announcement ${a.important ? 'important' : ''} ${!a.acked ? 'unacked' : ''}`}>
      <header className="tm-ann-head">
        <Avatar person={person(a.createdBy)} size={34} />
        <div>
          <strong>{nameOf(a.createdBy)}</strong>
          <span className="tm-muted small">{ago(a.createdAt)}{a.editedAt && ' · edited'}</span>
        </div>
        <div className="tm-ann-tags">
          {a.pinned && <span className="tm-badge"><Pin size={11} /> Pinned</span>}
          {a.important && <span className="tm-badge prio-urgent">Important</span>}
        </div>
      </header>
      <h2><a href={hrefFor('announcements', a.id)}>{a.title}</a></h2>
      <div className={`tm-text ${long ? 'tm-fade' : ''}`}><RichText text={long ? `${a.body.slice(0, 600)}…` : a.body} /></div>
      {long && <a className="tm-link" href={hrefFor('announcements', a.id)}>Read more</a>}
      <FileList files={a.files} />
      <footer className="tm-ann-foot">
        {a.acked ? <span className="tm-acked"><Check size={15} /> Acknowledged</span> : <button type="button" className="tm-btn primary sm" onClick={ack}><Check size={14} /> Acknowledge</button>}
        <div className="tm-reactions">
          {a.reactions.map((r) => (
            <button key={r.emoji} type="button" className={`tm-reaction ${r.adminIds.includes(me.id) ? 'mine' : ''}`} onClick={() => react(r.emoji)} title={r.adminIds.map(nameOf).join(', ')}>{r.emoji} <span>{r.adminIds.length}</span></button>
          ))}
          <EmojiPicker onPick={react} />
        </div>
        {manager && (
          <div className="tm-ann-admin">
            <button type="button" className="tm-link" onClick={showAcks}>Seen by {a.ackCount}/{[...people.values()].filter((p) => p.active).length}</button>
            <button type="button" className="tm-icon-btn sm" onClick={togglePin} aria-label={a.pinned ? 'Unpin' : 'Pin'} title={a.pinned ? 'Unpin' : 'Pin'}><Pin size={14} /></button>
            <button type="button" className="tm-icon-btn sm" onClick={() => setEditing(true)} aria-label="Edit"><Pencil size={14} /></button>
            <button type="button" className="tm-icon-btn sm" onClick={remove} aria-label="Delete"><Trash2 size={14} /></button>
          </div>
        )}
      </footer>
      {editing && <AnnouncementForm announcement={a} onClose={() => setEditing(false)} onSaved={onChanged} />}
      {acks && (
        <Modal title={`Seen by ${acks.acked} of ${acks.total}`} onClose={() => setAcks(null)}>
          <div className="tm-ack-cols">
            <div>
              <h3>Not yet</h3>
              {acks.data.filter((x) => !x.ackedAt).map((x) => <div key={x.adminId} className="tm-person"><Avatar person={person(x.adminId)} size={22} /> {nameOf(x.adminId)}</div>)}
            </div>
            <div>
              <h3>Acknowledged</h3>
              {acks.data.filter((x) => x.ackedAt).map((x) => <div key={x.adminId} className="tm-person"><Avatar person={person(x.adminId)} size={22} /> {nameOf(x.adminId)} <span className="tm-muted small">{ago(x.ackedAt)}</span></div>)}
            </div>
          </div>
        </Modal>
      )}
    </article>
  );
}

function AnnouncementForm({ announcement, onClose, onSaved }: { announcement?: Announcement; onClose: () => void; onSaved: () => void }) {
  const { toast } = useTeam();
  const [title, setTitle] = useState(announcement?.title || '');
  const [body, setBody] = useState(announcement?.body || '');
  const [important, setImportant] = useState(announcement?.important || false);
  const [pinned, setPinned] = useState(announcement?.pinned || false);
  const [busy, setBusy] = useState(false);
  const files = useAttachments(announcement ? null : { scope: 'announcement' }, { max: 5 });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (announcement) await api(`/announcements/${announcement.id}`, { method: 'PATCH', body: { title, body, important, pinned } });
      else await api('/announcements', { method: 'POST', body: { title, body, important, pinned, fileIds: files.ready } });
      toast(announcement ? 'Announcement updated' : 'Announcement posted');
      onSaved();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not post.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={announcement ? 'Edit announcement' : 'New announcement'} onClose={onClose} wide footer={<>
      <button type="button" className="tm-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="tm-ann-form" className="tm-btn primary" disabled={busy || files.uploading || !title.trim() || !body.trim()}>{busy && <Spinner size={14} />} {announcement ? 'Save' : 'Post to everyone'}</button>
    </>}>
      <form id="tm-ann-form" className="tm-form" onSubmit={submit}>
        <div className="tm-field">
          <label htmlFor="an-title">Title</label>
          <input id="an-title" className="tm-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} autoFocus placeholder="Office closed on Diwali" />
        </div>
        <div className="tm-field">
          <label htmlFor="an-body">Message</label>
          <textarea id="an-body" className="tm-input tm-textarea" rows={8} value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} placeholder="Use **bold**, _italic_ and links." />
        </div>
        {!announcement && (
          <div className="tm-field">
            <label className="tm-inline-label">Attachments <AttachButton onFiles={files.add} /></label>
            <PendingFiles items={files.items} onRemove={files.remove} />
          </div>
        )}
        <label className="tm-check"><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} /> <span><strong>Important</strong> · emails everyone, even people who turned email off</span></label>
        <label className="tm-check"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> <span><strong>Pin</strong> · keeps it at the top of Home and Announcements</span></label>
      </form>
    </Modal>
  );
}

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ArrowDown, BellOff, Bell, CheckSquare, Hash, Lock, LogOut, MessageSquare, MoreHorizontal, Pencil, Pin, Send, Sparkles, Trash2, UserPlus, Users, X } from 'lucide-react';
import { api } from '../api';
import { confirmDialog } from '../confirm';
import type { Channel, Message } from '../api';
import { getSocket } from '../socket';
import { go, hrefFor, useDmName, useTeam, useTeamEvent } from '../store';
import { useAttachments } from '../attachments';
import { ago, clock, dayLabel } from '../format';
import { AttachButton, Avatar, Empty, EmojiPicker, FileList, MentionInput, Modal, PeoplePicker, PendingFiles, RichText, Spinner } from '../ui';
import TaskForm from './TaskForm';
import { draftTask, LeoSummaryPanel } from './Leo';
import type { TaskDraft } from './Leo';

export default function Chat({ channelId, params }: { channelId: string; params: Record<string, string> }) {
  if (!channelId || params.browse) return <Browse />;
  return <ChannelView key={channelId} channelId={channelId} params={params} />;
}

function Browse() {
  const { channels, reloadChannels, toast } = useTeam();
  const list = channels.filter((c) => c.kind !== 'dm');
  const join = async (c: Channel) => {
    try {
      await api(`/channels/${c.id}/join`, { method: 'POST' });
      await reloadChannels();
      go('chat', c.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not join.', 'error');
    }
  };
  return (
    <div className="tm-page">
      <header className="tm-page-head"><h1>Channels</h1><p className="tm-muted">Join the conversations that matter to your work.</p></header>
      <div className="tm-card tm-list">
        {list.map((c) => (
          <div key={c.id} className="tm-row">
            {c.kind === 'private' ? <Lock size={16} /> : <Hash size={16} />}
            <a href={hrefFor('chat', c.id)} className="tm-row-main"><strong>{c.name}</strong><span className="tm-muted">{c.description || (c.lastMessageAt ? `Active ${ago(c.lastMessageAt)}` : 'No messages yet')}</span></a>
            {c.joined ? <span className="tm-badge">Joined</span> : c.kind === 'public' && <button type="button" className="tm-btn sm" onClick={() => join(c)}>Join</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

const sortById = (list: Message[]) => [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const mergeMessages = (list: Message[], incoming: Message[]) => {
  const map = new Map(list.map((m) => [m.id, m]));
  incoming.forEach((m) => map.set(m.id, m));
  return sortById([...map.values()]);
};

function useTyping(channelId: string) {
  const { me, nameOf } = useTeam();
  const [typing, setTyping] = useState<Record<string, { parentId: string | null; until: number }>>({});
  useTeamEvent('typing', (p) => {
    if (p.channelId !== channelId || p.adminId === me.id) return;
    setTyping((t) => ({ ...t, [p.adminId]: { parentId: p.parentId || null, until: Date.now() + 4000 } }));
  });
  useEffect(() => {
    const id = setInterval(() => setTyping((t) => {
      const now = Date.now();
      const next = Object.fromEntries(Object.entries(t).filter(([, v]) => v.until > now));
      return Object.keys(next).length === Object.keys(t).length ? t : next;
    }), 1000);
    return () => clearInterval(id);
  }, []);
  return (parentId: string | null) => {
    const names = Object.entries(typing).filter(([, v]) => v.parentId === parentId).map(([id]) => nameOf(id).split(' ')[0]);
    if (!names.length) return '';
    return names.length === 1 ? `${names[0]} is typing…` : names.length === 2 ? `${names[0]} and ${names[1]} are typing…` : 'Several people are typing…';
  };
}

function ChannelView({ channelId, params }: { channelId: string; params: Record<string, string> }) {
  const { me, manager, reloadChannels, toast, nameOf, person } = useTeam();
  const dmName = useDmName();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [firstUnreadAt, setFirstUnreadAt] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [taskFrom, setTaskFrom] = useState<Message | null>(null);
  const [taskDraft, setTaskDraft] = useState<{ draft: TaskDraft; source?: Message } | null>(null);
  const [showLeo, setShowLeo] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const typingText = useTyping(channelId);
  const threadId = params.thread || '';
  const focusId = params.m || '';

  const loadChannel = useCallback(async () => {
    const { data } = await api<{ data: Channel }>(`/channels/${channelId}`);
    setChannel(data);
    return data;
  }, [channelId]);

  const markRead = useCallback(() => {
    if (document.visibilityState !== 'visible') return;
    api(`/channels/${channelId}/read`, { method: 'POST' }).then(() => reloadChannels()).catch(() => {});
    api('/notifications/read', { method: 'POST', body: { channelId } }).catch(() => {});
  }, [channelId, reloadChannels]);

  const scrollToBottom = (smooth = false) => requestAnimationFrame(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  });

  // First load: the channel, then history (opened at a message when ?m= is set)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await loadChannel();
        getSocket()?.emit('channel:watch', { channelId });
        const res = await api<{ data: Message[]; hasMore: boolean; hasNewer: boolean }>(`/channels/${channelId}/messages`, { query: { around: focusId || undefined } });
        if (cancelled) return;
        setMessages(sortById(res.data));
        setHasMore(res.hasMore);
        setHasNewer(res.hasNewer);
        const unread = res.data.filter((m) => c.lastReadAt && m.authorId !== me.id && m.createdAt > c.lastReadAt);
        setFirstUnreadAt(unread.length && c.lastReadAt ? unread[unread.length - 1].createdAt : null);
        if (focusId) {
          requestAnimationFrame(() => document.getElementById(`msg-${focusId}`)?.scrollIntoView({ block: 'center' }));
        } else {
          scrollToBottom();
        }
        markRead();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open this conversation.');
      }
    })();
    return () => { cancelled = true; };
    // focusId only matters on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, loadChannel, markRead]);

  const loadOlder = async () => {
    if (loadingOlder || !hasMore || !messages.length) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const before = el?.scrollHeight || 0;
    try {
      const res = await api<{ data: Message[]; hasMore: boolean }>(`/channels/${channelId}/messages`, { query: { before: messages[0].id } });
      setMessages((prev) => mergeMessages(prev, res.data));
      setHasMore(res.hasMore);
      requestAnimationFrame(() => { if (el) el.scrollTop += el.scrollHeight - before; });
    } finally {
      setLoadingOlder(false);
    }
  };

  const refreshMessage = useCallback(async (id: string) => {
    try {
      const { data } = await api<{ data: Message }>(`/messages/${id}`);
      if (data.parentId) {
        // A reply changes its parent's reply count
        const parent = await api<{ data: Message }>(`/messages/${data.parentId}`);
        setMessages((prev) => (prev.some((m) => m.id === parent.data.id) ? mergeMessages(prev, [parent.data]) : prev));
      } else {
        setMessages((prev) => mergeMessages(prev, [data]));
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const pollLatest = useCallback(async () => {
    if (hasNewer) return;
    const res = await api<{ data: Message[] }>(`/channels/${channelId}/messages`).catch(() => null);
    if (res) setMessages((prev) => mergeMessages(prev, res.data));
  }, [channelId, hasNewer]);

  useTeamEvent('message.created', async (p) => {
    if (p.channelId !== channelId) return;
    if (!p.parentId && hasNewer) return;
    const nearBottom = atBottom;
    const msg = await refreshMessage(p.messageId);
    if (msg && !msg.parentId) {
      if (nearBottom || p.authorId === me.id) scrollToBottom(true);
      if (p.authorId !== me.id) markRead();
    }
  }, pollLatest);
  useTeamEvent('message.updated', (p) => { if (p.channelId === channelId) refreshMessage(p.messageId); });
  useTeamEvent('message.deleted', (p) => { if (p.channelId === channelId) refreshMessage(p.messageId); });
  useTeamEvent('read', (p) => {
    if (p.channelId !== channelId) return;
    setChannel((c) => (c?.reads ? { ...c, reads: c.reads.map((r) => (r.adminId === p.adminId ? { ...r, lastReadAt: p.at } : r)) } : c));
  });
  useTeamEvent('channel.updated', (p) => { if (p.channelId === channelId) loadChannel().catch(() => {}); });

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') markRead(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [markRead]);

  if (error) return <div className="tm-page"><Empty icon={<Lock size={22} />} title="Can't open this conversation" text={error} action={<a className="tm-btn" href={hrefFor('home')}>Go home</a>} /></div>;
  if (!channel) return <div className="tm-center"><Spinner size={20} /></div>;

  const isDm = channel.kind === 'dm';
  const title = isDm ? dmName(channel) : channel.name;
  const canPost = !channel.archivedAt && (channel.joined || channel.kind === 'public');
  const lastMine = [...messages].reverse().find((m) => m.authorId === me.id && !m.deletedAt);
  const seenBy = channel.reads && lastMine
    ? channel.reads.filter((r) => r.adminId !== me.id && r.lastReadAt >= lastMine.createdAt).map((r) => r.adminId)
    : [];
  const dmOthers = isDm ? (channel.memberIds || []).filter((id) => id !== me.id) : [];

  const toggleMute = async () => {
    await api(`/channels/${channelId}/me`, { method: 'PATCH', body: { muted: !channel.muted } }).catch(() => {});
    await loadChannel();
    reloadChannels();
  };
  const leave = async () => {
    try {
      await api(`/channels/${channelId}/leave`, { method: 'POST' });
      await reloadChannels();
      go('home');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not leave.', 'error');
    }
  };
  const join = async () => {
    await api(`/channels/${channelId}/join`, { method: 'POST' }).catch((err: Error) => toast(err.message, 'error'));
    await loadChannel();
    reloadChannels();
  };

  // Leo fills in a task from the message; nothing is saved until Create is pressed
  const draftFrom = async (m: Message) => {
    toast('Leo is drafting the task…');
    try {
      setTaskDraft({ draft: await draftTask(m.id), source: m });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Leo could not draft a task.', 'error');
    }
  };

  return (
    <div className={`tm-chat ${threadId || showPins || showLeo ? 'with-panel' : ''}`}>
      <section className="tm-chat-main">
        <header className="tm-chat-head">
          <div className="tm-chat-title">
            {isDm ? (dmOthers.length === 1 ? <Avatar person={person(dmOthers[0])} size={28} presence /> : <Users size={18} />) : channel.kind === 'private' ? <Lock size={17} /> : <Hash size={17} />}
            <div>
              <h1>{title}</h1>
              <span className="tm-muted">{isDm ? (dmOthers.length === 1 && person(dmOthers[0]) ? person(dmOthers[0])!.statusText || person(dmOthers[0])!.roleLabel : `${dmOthers.length + 1} people`) : channel.description || `${channel.memberIds?.length || 0} members`}</span>
            </div>
          </div>
          <div className="tm-chat-actions">
            <button type="button" className={`tm-btn sm ghost tm-leo-btn ${showLeo ? 'on' : ''}`} onClick={() => { setShowLeo((v) => !v); setShowPins(false); if (threadId) go('chat', channelId); }} title="Summarise with Leo"><Sparkles size={15} /> <span>Summarise</span></button>
            <button type="button" className={`tm-icon-btn ${showPins ? 'on' : ''}`} onClick={() => { setShowPins((v) => !v); setShowLeo(false); if (threadId) go('chat', channelId); }} aria-label="Pinned messages" title="Pinned messages"><Pin size={17} /></button>
            {!isDm && <button type="button" className="tm-icon-btn" onClick={() => setShowMembers(true)} aria-label="Members" title="Members"><Users size={17} /></button>}
            {channel.joined && <button type="button" className="tm-icon-btn" onClick={toggleMute} aria-label={channel.muted ? 'Unmute' : 'Mute'} title={channel.muted ? 'Unmute notifications' : 'Mute notifications'}>{channel.muted ? <BellOff size={17} /> : <Bell size={17} />}</button>}
            {!isDm && channel.joined && channel.name !== 'general' && <button type="button" className="tm-icon-btn" onClick={leave} aria-label="Leave channel" title="Leave channel"><LogOut size={17} /></button>}
          </div>
        </header>

        <div className="tm-messages" ref={listRef} onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop < 120) loadOlder();
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
        }}>
          {hasMore ? <div className="tm-older">{loadingOlder ? <Spinner /> : <button type="button" className="tm-link" onClick={loadOlder}>Load older messages</button>}</div>
            : <div className="tm-chat-start">{isDm ? <p>This is the start of your conversation with <strong>{title}</strong>.</p> : <p>This is the start of <strong>#{channel.name}</strong>. {channel.description}</p>}</div>}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
            const grouped = !newDay && prev && prev.authorId === m.authorId && !prev.deletedAt && m.kind === 'user' && prev.kind === 'user' && +new Date(m.createdAt) - +new Date(prev.createdAt) < 5 * 60 * 1000;
            const showUnread = firstUnreadAt && m.createdAt === firstUnreadAt;
            return (
              <Fragment key={m.id}>
                {newDay && <div className="tm-day"><span>{dayLabel(m.createdAt)}</span></div>}
                {showUnread && <div className="tm-day unread"><span>New messages</span></div>}
                <MessageItem message={m} grouped={!!grouped} channel={channel} highlight={m.id === focusId} onCreateTask={() => setTaskFrom(m)} onDraftTask={() => draftFrom(m)} />
              </Fragment>
            );
          })}
          {seenBy.length > 0 && (
            <div className="tm-seen" title={`Seen by ${seenBy.map(nameOf).join(', ')}`}>
              Seen by {seenBy.slice(0, 5).map((id) => <Avatar key={id} person={person(id)} size={16} />)}
            </div>
          )}
          {hasNewer && <div className="tm-older"><button type="button" className="tm-link" onClick={() => go('chat', channelId)}>Jump to latest messages</button></div>}
        </div>
        {!atBottom && !hasNewer && <button type="button" className="tm-jump" onClick={() => scrollToBottom(true)} aria-label="Scroll to latest"><ArrowDown size={16} /></button>}

        <div className="tm-typing" aria-live="polite">{typingText(null)}</div>
        {canPost
          ? <Composer channel={channel} parentId={null} placeholder={isDm ? `Message ${title}` : `Message #${channel.name}`} onSent={() => scrollToBottom(true)} />
          : channel.archivedAt
            ? <div className="tm-composer-note">This channel is archived.</div>
            : <div className="tm-composer-note">{channel.kind === 'private' ? 'You can read this channel as a manager. Add yourself from Members to post.' : <button type="button" className="tm-btn primary" onClick={join}>Join #{channel.name}</button>}</div>}
      </section>

      {threadId && <Thread channel={channel} parentId={threadId} typingText={typingText(threadId)} onCreateTask={setTaskFrom} onDraftTask={draftFrom} onTask={(draft) => setTaskDraft({ draft })} />}
      {showPins && !threadId && <Pins channelId={channelId} onClose={() => setShowPins(false)} />}
      {showLeo && !threadId && <LeoSummaryPanel channelId={channelId} onClose={() => setShowLeo(false)} onTask={me.teamOnly ? undefined : (draft) => setTaskDraft({ draft })} />}
      {showMembers && <Members channel={channel} manager={manager} onClose={() => setShowMembers(false)} onChanged={loadChannel} />}
      {taskFrom && <TaskForm onClose={() => setTaskFrom(null)} source={taskFrom} />}
      {taskDraft && <TaskForm onClose={() => setTaskDraft(null)} source={taskDraft.source} draft={taskDraft.draft} />}
    </div>
  );
}

function MessageItem({ message: m, grouped, channel, highlight, inThread, onCreateTask, onDraftTask }: { message: Message; grouped: boolean; channel: Channel; highlight?: boolean; inThread?: boolean; onCreateTask?: () => void; onDraftTask?: () => void }) {
  const { me, manager, person, nameOf, toast } = useTeam();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);
  const [menu, setMenu] = useState(false);
  const author = person(m.authorId);
  const mine = m.authorId === me.id;

  const react = (emoji: string) => api(`/messages/${m.id}/reactions`, { method: 'POST', body: { emoji } }).catch((err: Error) => toast(err.message, 'error'));
  const remove = async () => {
    if (!(await confirmDialog(mine
      ? { title: 'Delete this message?', message: 'It will be removed for everyone in the conversation.', confirmLabel: 'Delete', danger: true }
      : { title: 'Delete this message for everyone?', message: 'This is recorded in the audit log.', confirmLabel: 'Delete', danger: true }))) return;
    await api(`/messages/${m.id}`, { method: 'DELETE' }).catch((err: Error) => toast(err.message, 'error'));
  };
  const saveEdit = async () => {
    try {
      await api(`/messages/${m.id}`, { method: 'PATCH', body: { body: draft } });
      setEditing(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save.', 'error');
    }
  };
  const pin = () => api(`/messages/${m.id}/pin`, { method: 'POST', body: { pinned: !m.pinnedAt } }).then(() => toast(m.pinnedAt ? 'Unpinned' : 'Pinned')).catch((err: Error) => toast(err.message, 'error'));

  if (m.kind === 'system') {
    return (
      <div className="tm-msg system" id={`msg-${m.id}`}>
        <CheckSquare size={14} /> <span><strong>{nameOf(m.authorId)}</strong> {m.body.replace(/^Task created: /, 'created a task: ')}</span>
        {m.taskId && <a className="tm-link" href={hrefFor('tasks', m.taskId)}>Open task</a>}
      </div>
    );
  }

  return (
    <div className={`tm-msg ${grouped ? 'grouped' : ''} ${highlight ? 'highlight' : ''} ${m.mentions.includes(me.id) ? 'mentioned' : ''}`} id={`msg-${m.id}`}>
      <div className="tm-msg-side">{grouped ? <span className="tm-msg-time-side">{clock(m.createdAt)}</span> : <Avatar person={author} size={34} />}</div>
      <div className="tm-msg-body">
        {!grouped && (
          <div className="tm-msg-meta">
            <strong>{author?.name || 'Former member'}</strong>
            <time dateTime={m.createdAt} title={new Date(m.createdAt).toLocaleString('en-IN')}>{clock(m.createdAt)}</time>
            {m.pinnedAt && <span className="tm-pinned"><Pin size={11} /> Pinned</span>}
          </div>
        )}
        {m.deletedAt ? <p className="tm-deleted">This message was deleted.</p>
          : editing ? (
            <div className="tm-edit">
              <MentionInput value={draft} onChange={setDraft} onSubmit={saveEdit} label="Edit message" autoFocus />
              <div className="tm-edit-actions"><button type="button" className="tm-btn sm" onClick={() => { setEditing(false); setDraft(m.body); }}>Cancel</button><button type="button" className="tm-btn sm primary" onClick={saveEdit}>Save</button></div>
            </div>
          ) : (
            <>
              {m.body && <div className="tm-text"><RichText text={m.body} />{m.editedAt && <span className="tm-muted small"> (edited)</span>}</div>}
              <FileList files={m.files} />
            </>
          )}
        {m.reactions.length > 0 && (
          <div className="tm-reactions">
            {m.reactions.map((r) => (
              <button key={r.emoji} type="button" className={`tm-reaction ${r.adminIds.includes(me.id) ? 'mine' : ''}`} onClick={() => react(r.emoji)} title={r.adminIds.map(nameOf).join(', ')}>
                {r.emoji} <span>{r.adminIds.length}</span>
              </button>
            ))}
          </div>
        )}
        {!inThread && m.replyCount > 0 && (
          <a className="tm-replies" href={hrefFor('chat', channel.id, { thread: m.id })}>
            <MessageSquare size={13} /> {m.replyCount} {m.replyCount === 1 ? 'reply' : 'replies'} {m.lastReplyAt && <span className="tm-muted">· last reply {ago(m.lastReplyAt)}</span>}
          </a>
        )}
      </div>
      {!m.deletedAt && !editing && (
        <div className="tm-msg-tools">
          <EmojiPicker onPick={react} />
          {!inThread && <a className="tm-icon-btn sm" href={hrefFor('chat', channel.id, { thread: m.id })} aria-label="Reply in thread" title="Reply in thread"><MessageSquare size={15} /></a>}
          <div className="tm-menu-wrap">
            <button type="button" className="tm-icon-btn sm" onClick={() => setMenu((v) => !v)} aria-label="More actions" aria-expanded={menu}><MoreHorizontal size={15} /></button>
            {menu && (
              <div className="tm-menu" role="menu" onMouseLeave={() => setMenu(false)}>
                {onCreateTask && !me.teamOnly && <button type="button" role="menuitem" onClick={() => { setMenu(false); onCreateTask(); }}><CheckSquare size={14} /> Create task</button>}
                {onDraftTask && !me.teamOnly && m.body && <button type="button" role="menuitem" onClick={() => { setMenu(false); onDraftTask(); }}><Sparkles size={14} /> Draft task with Leo</button>}
                {!inThread && <button type="button" role="menuitem" onClick={() => { setMenu(false); pin(); }}><Pin size={14} /> {m.pinnedAt ? 'Unpin' : 'Pin to channel'}</button>}
                {mine && <button type="button" role="menuitem" onClick={() => { setMenu(false); setEditing(true); }}><Pencil size={14} /> Edit</button>}
                {(mine || manager) && <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(false); remove(); }}><Trash2 size={14} /> Delete</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Composer({ channel, parentId, placeholder, onSent }: { channel: Channel; parentId: string | null; placeholder: string; onSent?: () => void }) {
  const { manager, toast } = useTeam();
  const draftKey = `tm-draft:${channel.id}:${parentId || ''}`;
  const [body, setBody] = useState(() => { try { return localStorage.getItem(draftKey) || ''; } catch { return ''; } });
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const files = useAttachments({ scope: 'channel', scopeId: channel.id });
  const lastTyping = useRef(0);

  useEffect(() => {
    try {
      if (body) localStorage.setItem(draftKey, body);
      else localStorage.removeItem(draftKey);
    } catch { /* storage blocked */ }
  }, [body, draftKey]);

  const typing = () => {
    if (Date.now() - lastTyping.current < 3000) return;
    lastTyping.current = Date.now();
    getSocket()?.emit('typing', { channelId: channel.id, parentId });
  };

  const send = async () => {
    if (busy || files.uploading) return;
    const text = body.trim();
    if (!text && !files.ready.length) return;
    setBusy(true);
    try {
      await api(`/channels/${channel.id}/messages`, { method: 'POST', body: { body: text, fileIds: files.ready, parentId } });
      setBody('');
      files.clear();
      onSent?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) files.add(e.dataTransfer.files);
  };

  return (
    <div className={`tm-composer ${dragging ? 'dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
      onPaste={(e) => { if (e.clipboardData.files.length) { e.preventDefault(); files.add(e.clipboardData.files); } }}>
      <PendingFiles items={files.items} onRemove={files.remove} />
      <div className="tm-composer-row">
        <AttachButton onFiles={files.add} />
        <MentionInput value={body} onChange={setBody} onSubmit={send} placeholder={placeholder} onTyping={typing} allowChannel={manager && channel.kind !== 'dm'} label={placeholder}
          candidates={channel.kind === 'public' ? undefined : channel.memberIds || undefined} />
        <button type="button" className="tm-send" onClick={send} disabled={busy || files.uploading || (!body.trim() && !files.ready.length)} aria-label="Send">{busy ? <Spinner size={16} /> : <Send size={17} />}</button>
      </div>
      <div className="tm-composer-hint"><span><b>Enter</b> to send · <b>Shift + Enter</b> new line · <b>@</b> to mention · **bold** _italic_ `code`</span></div>
    </div>
  );
}

function Thread({ channel, parentId, typingText, onCreateTask, onDraftTask, onTask }: { channel: Channel; parentId: string; typingText: string; onCreateTask: (m: Message) => void; onDraftTask: (m: Message) => void; onTask: (draft: TaskDraft) => void }) {
  const { me } = useTeam();
  const [leo, setLeo] = useState(false);
  const [parent, setParent] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<{ parent: Message; data: Message[] }>(`/messages/${parentId}/replies`)
      .then((res) => {
        setParent(res.parent);
        setReplies(res.data);
        api('/notifications/read', { method: 'POST', body: { refId: parentId } }).catch(() => {});
      })
      .catch((err: Error) => setError(err.message || 'Could not open the thread.'));
  }, [parentId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [replies.length]);

  const onEvent = (p: Record<string, string>) => { if (p.channelId === channel.id && (p.parentId === parentId || p.messageId === parentId)) load(); };
  useTeamEvent('message.created', onEvent, load);
  useTeamEvent('message.updated', onEvent);
  useTeamEvent('message.deleted', onEvent);

  return (
    <aside className="tm-panel" aria-label="Thread">
      <header className="tm-panel-head">
        <h2>Thread</h2>
        {replies.length > 0 && <button type="button" className={`tm-btn sm ghost tm-leo-btn ${leo ? 'on' : ''}`} onClick={() => setLeo((v) => !v)} title="Summarise this thread with Leo"><Sparkles size={14} /> <span>Summarise</span></button>}
        <a className="tm-icon-btn" href={hrefFor('chat', channel.id)} aria-label="Close thread"><X size={18} /></a>
      </header>
      <div className="tm-panel-body">
        {leo && <div className="tm-card pad tm-leo-inline"><LeoSummaryPanel channelId={channel.id} threadId={parentId} onTask={me.teamOnly ? undefined : onTask} /></div>}
        {error && <p className="tm-muted">{error}</p>}
        {!parent && !error && <Spinner />}
        {parent && <MessageItem message={parent} grouped={false} channel={channel} inThread onCreateTask={() => onCreateTask(parent)} onDraftTask={() => onDraftTask(parent)} />}
        {parent && <div className="tm-day"><span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span></div>}
        {replies.map((r, i) => <MessageItem key={r.id} message={r} channel={channel} inThread grouped={i > 0 && replies[i - 1].authorId === r.authorId && r.kind === 'user' && replies[i - 1].kind === 'user'} onCreateTask={() => onCreateTask(r)} onDraftTask={() => onDraftTask(r)} />)}
        <div ref={endRef} />
      </div>
      <div className="tm-typing">{typingText}</div>
      {!channel.archivedAt && parent && !parent.deletedAt && (channel.joined || channel.kind === 'public') && <Composer channel={channel} parentId={parentId} placeholder="Reply…" />}
    </aside>
  );
}

function Pins({ channelId, onClose }: { channelId: string; onClose: () => void }) {
  const [pins, setPins] = useState<Message[] | null>(null);
  const { nameOf } = useTeam();
  const load = useCallback(() => { api<{ data: Message[] }>(`/channels/${channelId}/pins`).then((r) => setPins(r.data)).catch(() => setPins([])); }, [channelId]);
  useEffect(() => { load(); }, [load]);
  useTeamEvent('message.updated', (p) => { if (p.channelId === channelId) load(); });
  return (
    <aside className="tm-panel" aria-label="Pinned messages">
      <header className="tm-panel-head"><h2>Pinned</h2><button type="button" className="tm-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
      <div className="tm-panel-body">
        {!pins && <Spinner />}
        {pins?.length === 0 && <Empty icon={<Pin size={20} />} title="Nothing pinned yet" text="Pin important messages from the ⋯ menu so everyone can find them." />}
        {pins?.map((m) => (
          <a key={m.id} className="tm-pin" href={hrefFor('chat', channelId, { m: m.id })}>
            <strong>{nameOf(m.authorId)}</strong> <span className="tm-muted small">{ago(m.createdAt)}</span>
            <p>{m.body || `${m.files.length} file${m.files.length === 1 ? '' : 's'}`}</p>
          </a>
        ))}
      </div>
    </aside>
  );
}

function Members({ channel, manager, onClose, onChanged }: { channel: Channel; manager: boolean; onClose: () => void; onChanged: () => void }) {
  const { person, toast, reloadChannels } = useTeam();
  const [adding, setAdding] = useState<string[]>([]);
  const members = useMemo(() => (channel.memberIds || []).map((id) => person(id)).filter(Boolean), [channel.memberIds, person]);
  const add = async () => {
    try {
      await api(`/channels/${channel.id}/members`, { method: 'POST', body: { adminIds: adding } });
      setAdding([]);
      onChanged();
      reloadChannels();
      toast('Added');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add.', 'error');
    }
  };
  const remove = async (id: string) => {
    try {
      await api(`/channels/${channel.id}/members/${id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove.', 'error');
    }
  };
  return (
    <Modal title={`Members of #${channel.name}`} onClose={onClose}>
      {manager && channel.name !== 'general' && (
        <div className="tm-field">
          <label><UserPlus size={14} /> Add people</label>
          <div className="tm-inline">
            <PeoplePicker value={adding} onChange={setAdding} exclude={channel.memberIds || []} label="Add people" />
            <button type="button" className="tm-btn primary" disabled={!adding.length} onClick={add}>Add</button>
          </div>
        </div>
      )}
      <div className="tm-list">
        {members.map((p) => p && (
          <div key={p.id} className="tm-row">
            <Avatar person={p} size={30} presence />
            <div className="tm-row-main"><strong>{p.name}</strong><span className="tm-muted">@{p.username} · {p.roleLabel}</span></div>
            {manager && channel.name !== 'general' && <button type="button" className="tm-btn sm ghost" onClick={() => remove(p.id)}>Remove</button>}
          </div>
        ))}
      </div>
    </Modal>
  );
}

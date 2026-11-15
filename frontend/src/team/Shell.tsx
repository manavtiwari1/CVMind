import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Bell, Bookmark, CheckSquare, ClipboardCheck, FolderOpen, Video, Hash, Home, Lock, LogOut, Megaphone, ShieldCheck, Menu, MessageSquarePlus, MessagesSquare, Plus, Search, Settings, Users, WifiOff, X } from 'lucide-react';
import { api } from './api';
import type { Channel } from './api';
import { go, hrefFor, useDmName, useRoute, useTeam } from './store';
import { Avatar, Modal, PeoplePicker, Spinner, Wordmark } from './ui';
import Notifications from './views/Notifications';
import { TopSearch } from './TopSearch';
import { IncomingCall } from './IncomingCall';
import { StatusMenu } from './StatusMenu';

const HomeView = lazy(() => import('./views/Home'));
const Announcements = lazy(() => import('./views/Announcements'));
const Tasks = lazy(() => import('./views/Tasks'));
const Chat = lazy(() => import('./views/Chat'));
const Media = lazy(() => import('./views/Media'));
const People = lazy(() => import('./views/People'));
const CheckIn = lazy(() => import('./views/CheckIn'));
const Meetings = lazy(() => import('./views/Meetings'));
const Meet = lazy(() => import('./views/Meet'));
const Profile = lazy(() => import('./views/Profile'));
const Saved = lazy(() => import('./views/Saved'));
const Manager = lazy(() => import('./views/Manager'));

export default function Shell() {
  const { me, manager, channels, person, unreadNotifications, live, signOut } = useTeam();
  const route = useRoute();
  const [navOpen, setNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [newChannel, setNewChannel] = useState(false);
  const [newDm, setNewDm] = useState(false);
  const dmName = useDmName();

  // Navigating closes the mobile menu and the notifications popover
  useEffect(() => {
    const close = () => { setNavOpen(false); setBellOpen(false); };
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  const rooms = useMemo(() => channels.filter((c) => c.kind !== 'dm' && (c.joined || c.kind === 'private')), [channels]);
  const otherPublic = channels.filter((c) => c.kind === 'public' && !c.joined).length;
  const dms = useMemo(() => channels.filter((c) => c.kind === 'dm').sort((a, b) => +new Date(b.lastMessageAt || 0) - +new Date(a.lastMessageAt || 0)), [channels]);

  // The app rail, like Teams: one icon per area, label underneath
  const nav = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'chat', label: 'Chat', icon: MessagesSquare },
    { view: 'announcements', label: 'Updates', icon: Megaphone },
    { view: 'tasks', label: 'Tasks', icon: CheckSquare },
    { view: 'meetings', label: 'Meetings', icon: Video },
    { view: 'checkin', label: 'Check-in', icon: ClipboardCheck },
    { view: 'media', label: 'Files', icon: FolderOpen },
    { view: 'people', label: 'People', icon: Users },
    { view: 'saved', label: 'Saved', icon: Bookmark },
    // Only managers: the Manager portal (approvals, people, email, workspace, HR)
    ...(manager ? [{ view: 'manage', label: 'Manager', icon: ShieldCheck }] : [])
  ];
  const chatUnread = channels.reduce((n, c) => n + (c.muted ? 0 : c.unread || 0), 0);
  // The chat list sits next to the conversation (and on Home), like Teams' second column
  const showList = route.view === 'chat' || route.view === 'home' || !route.view;
  const railActive = (view: string) => route.view === view || (view === 'home' && !route.view);

  const roomLink = (c: Channel, label: string, icon: ReactNode, sub?: string) => {
    const active = route.view === 'chat' && route.id === c.id;
    return (
      <a key={c.id} href={hrefFor('chat', c.id)} className={`tm-list-item ${active ? 'active' : ''} ${c.unread && !c.muted ? 'unread' : ''} ${c.muted ? 'muted' : ''}`}>
        <span className="tm-list-icon">{icon}</span>
        <span className="tm-list-text"><span className="tm-list-name">{label}</span>{sub && <span className="tm-list-sub">{sub}</span>}</span>
        {!!c.unread && !active && <span className="tm-count">{c.unread > 99 ? '99+' : c.unread}</span>}
      </a>
    );
  };

  let content;
  switch (route.view) {
    case 'announcements': content = <Announcements id={route.id} />; break;
    case 'tasks': content = <Tasks id={route.id} params={route.params} />; break;
    case 'chat': content = <Chat channelId={route.id} params={route.params} />; break;
    case 'media': content = <Media />; break;
    case 'people': content = <People />; break;
    case 'checkin': content = <CheckIn params={route.params} />; break;
    case 'meetings': content = <Meetings />; break;
    case 'meet': content = <Meet key={route.id} id={route.id} />; break;
    case 'profile': content = <Profile />; break;
    case 'saved': content = <Saved />; break;
    case 'manage': content = manager ? <Manager section={route.id} params={route.params} /> : <HomeView />; break;
    // The Email page moved into the Manager portal
    case 'email': content = manager ? <Manager section="email" params={route.params} /> : <HomeView />; break;
    default: content = <HomeView />;
  }

  return (
    <div className={`tm-teams ${navOpen ? 'nav-open' : ''} ${showList ? 'has-list' : ''} ${route.view === 'chat' && route.id ? 'in-chat' : ''}`}>
      <IncomingCall />
      <header className="tm-appbar">
        {showList && <button type="button" className="tm-icon-btn tm-only-mobile" onClick={() => setNavOpen(true)} aria-label="Open chats"><Menu size={20} /></button>}
        <a href={hrefFor('home')} className="tm-appbar-brand"><Wordmark product="Team" /></a>
        <TopSearch />
        <div className="tm-appbar-right">
          <div className="tm-bell">
            <button type="button" className="tm-icon-btn" onClick={() => setBellOpen((v) => !v)} aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`} aria-expanded={bellOpen}>
              <Bell size={19} />
              {unreadNotifications > 0 && <span className="tm-dot-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
            </button>
            {bellOpen && <Notifications onClose={() => setBellOpen(false)} />}
          </div>
          <StatusMenu placement="down" />
          <a href={hrefFor('profile')} className="tm-appbar-me" aria-label="Profile and settings" title={me.name}><Avatar person={person(me.id)} size={32} presence /></a>
        </div>
      </header>

      <nav className="tm-rail" aria-label="Apps">
        {nav.map(({ view, label, icon: Icon }) => (
          <a key={view} href={hrefFor(view)} className={`tm-rail-item ${railActive(view) ? 'active' : ''}`} aria-current={railActive(view) ? 'page' : undefined}>
            <span className="tm-rail-icon"><Icon size={20} />{view === 'chat' && chatUnread > 0 && <span className="tm-rail-badge">{chatUnread > 99 ? '99+' : chatUnread}</span>}</span>
            <span className="tm-rail-label">{label}</span>
          </a>
        ))}
        <span className="tm-rail-spacer" />
        <a href={hrefFor('profile')} className={`tm-rail-item tm-rail-desktop ${route.view === 'profile' ? 'active' : ''}`}><span className="tm-rail-icon"><Settings size={20} /></span><span className="tm-rail-label">Settings</span></a>
        <button type="button" className="tm-rail-item tm-rail-desktop" onClick={signOut}><span className="tm-rail-icon"><LogOut size={19} /></span><span className="tm-rail-label">Sign out</span></button>
      </nav>

      {showList && (
        <aside className="tm-listpane" aria-label="Chats and channels">
          <div className="tm-list-head">
            <h2>Chat</h2>
            <span>
              <button type="button" className="tm-icon-btn" onClick={() => setNewDm(true)} aria-label="New message" title="New message"><MessageSquarePlus size={18} /></button>
              <button type="button" className="tm-icon-btn tm-only-mobile" onClick={() => setNavOpen(false)} aria-label="Close"><X size={18} /></button>
            </span>
          </div>
          <div className="tm-list-scroll">
            <div className="tm-list-section">
              <span>Channels</span>
              {manager && <button type="button" className="tm-icon-btn sm" onClick={() => setNewChannel(true)} aria-label="New channel" title="New channel"><Plus size={15} /></button>}
            </div>
            {rooms.map((c) => roomLink(c, c.name, c.kind === 'private' ? <Lock size={15} /> : <Hash size={15} />))}
            {otherPublic > 0 && <a href={hrefFor('chat', '', { browse: '1' })} className="tm-list-item subtle"><span className="tm-list-icon"><Search size={15} /></span><span className="tm-list-text"><span className="tm-list-name">Browse {otherPublic} more</span></span></a>}

            <div className="tm-list-section"><span>Direct messages</span></div>
            {dms.map((c) => {
              const others = (c.memberIds || []).filter((id) => id !== me.id);
              const icon = others.length === 1 ? <Avatar person={person(others[0])} size={28} presence /> : <span className="tm-group-icon"><Users size={14} /></span>;
              return roomLink(c, dmName(c), icon, others.length > 1 ? `${others.length + 1} people` : undefined);
            })}
            {!dms.length && <p className="tm-list-hint">Message a teammate from People or the new message button.</p>}
          </div>
        </aside>
      )}
      <div className="tm-scrim" onClick={() => setNavOpen(false)} aria-hidden />

      <main className="tm-stage">
        {!live && <div className="tm-offline"><WifiOff size={14} /> Live updates are reconnecting. The page refreshes every 15 seconds meanwhile.</div>}
        <div className="tm-content">
          <Suspense fallback={<div className="tm-center"><Spinner size={20} /></div>}>{content}</Suspense>
        </div>
      </main>

      {newChannel && <NewChannel onClose={() => setNewChannel(false)} />}
      {newDm && <NewDm onClose={() => setNewDm(false)} />}
    </div>
  );
}

function NewChannel({ onClose }: { onClose: () => void }) {
  const { reloadChannels, toast, me } = useTeam();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<'public' | 'private'>('public');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api<{ data: Channel }>('/channels', { method: 'POST', body: { name, description, kind, memberIds } });
      await reloadChannels();
      toast(`#${data.name} created`);
      onClose();
      go('chat', data.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create the channel.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="New channel" onClose={onClose} footer={<>
      <button type="button" className="tm-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="tm-new-channel" className="tm-btn primary" disabled={busy || name.trim().length < 2}>{busy && <Spinner size={14} />} Create</button>
    </>}>
      <form id="tm-new-channel" onSubmit={submit} className="tm-form">
        <div className="tm-field">
          <label htmlFor="nc-name">Name</label>
          <div className="tm-prefixed"><span>#</span><input id="nc-name" className="tm-input" value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, ''))} placeholder="marketing" maxLength={40} autoFocus /></div>
        </div>
        <div className="tm-field">
          <label htmlFor="nc-desc">What is it for? (optional)</label>
          <input id="nc-desc" className="tm-input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={250} />
        </div>
        <fieldset className="tm-field">
          <legend>Who can see it</legend>
          <label className="tm-radio"><input type="radio" checked={kind === 'public'} onChange={() => setKind('public')} /> <span><strong>Public</strong><small>Anyone on the team can find and join it.</small></span></label>
          <label className="tm-radio"><input type="radio" checked={kind === 'private'} onChange={() => setKind('private')} /> <span><strong>Private</strong><small>Only the people you add (and managers) can see it.</small></span></label>
        </fieldset>
        <div className="tm-field">
          <label>Add people</label>
          <PeoplePicker value={memberIds} onChange={setMemberIds} exclude={[me.id]} label="Add people to the channel" />
        </div>
      </form>
    </Modal>
  );
}

function NewDm({ onClose }: { onClose: () => void }) {
  const { reloadChannels, toast, me } = useTeam();
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      const { data } = await api<{ data: Channel }>('/dm', { method: 'POST', body: { adminIds: ids } });
      await reloadChannels();
      onClose();
      go('chat', data.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not start the conversation.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="New message" onClose={onClose} footer={<>
      <button type="button" className="tm-btn" onClick={onClose}>Cancel</button>
      <button type="button" className="tm-btn primary" disabled={busy || !ids.length} onClick={start}>{busy && <Spinner size={14} />} Start</button>
    </>}>
      <div className="tm-field">
        <label>To</label>
        <PeoplePicker value={ids} onChange={setIds} exclude={[me.id]} label="Who to message" max={7} />
        <span className="tm-hint">Pick one person, or up to 7 for a group message.</span>
      </div>
    </Modal>
  );
}

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Bell, CheckSquare, ClipboardCheck, FolderOpen, Hash, Home, Lock, LogOut, Megaphone, Menu, MessageSquarePlus, Plus, Search, Settings, Users, WifiOff, X } from 'lucide-react';
import cvmindIcon from '../assets/cvmind_icon.png';
import { api } from './api';
import type { Channel } from './api';
import { go, hrefFor, useDmName, useRoute, useTeam } from './store';
import { Avatar, Modal, PeoplePicker, Spinner } from './ui';
import Notifications from './views/Notifications';
import SearchDialog from './views/SearchDialog';

const HomeView = lazy(() => import('./views/Home'));
const Announcements = lazy(() => import('./views/Announcements'));
const Tasks = lazy(() => import('./views/Tasks'));
const Chat = lazy(() => import('./views/Chat'));
const Media = lazy(() => import('./views/Media'));
const People = lazy(() => import('./views/People'));
const CheckIn = lazy(() => import('./views/CheckIn'));
const Profile = lazy(() => import('./views/Profile'));

export default function Shell() {
  const { me, manager, channels, person, unreadNotifications, live, signOut } = useTeam();
  const route = useRoute();
  const [navOpen, setNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [newChannel, setNewChannel] = useState(false);
  const [newDm, setNewDm] = useState(false);
  const dmName = useDmName();

  // Navigating closes the mobile menu and the notifications popover
  useEffect(() => {
    const close = () => { setNavOpen(false); setBellOpen(false); };
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  // Ctrl/Cmd + K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rooms = useMemo(() => channels.filter((c) => c.kind !== 'dm' && (c.joined || c.kind === 'private')), [channels]);
  const otherPublic = channels.filter((c) => c.kind === 'public' && !c.joined).length;
  const dms = useMemo(() => channels.filter((c) => c.kind === 'dm').sort((a, b) => +new Date(b.lastMessageAt || 0) - +new Date(a.lastMessageAt || 0)), [channels]);

  const nav = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'announcements', label: 'Announcements', icon: Megaphone },
    { view: 'tasks', label: 'Tasks', icon: CheckSquare },
    { view: 'checkin', label: 'Check-in', icon: ClipboardCheck },
    { view: 'media', label: 'Media', icon: FolderOpen },
    { view: 'people', label: 'People', icon: Users }
  ];

  const roomLink = (c: Channel, label: string, icon: ReactNode) => {
    const active = route.view === 'chat' && route.id === c.id;
    return (
      <a key={c.id} href={hrefFor('chat', c.id)} className={`tm-nav-item ${active ? 'active' : ''} ${c.unread && !c.muted ? 'unread' : ''} ${c.muted ? 'muted' : ''}`}>
        {icon}
        <span className="tm-nav-label">{label}</span>
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
    case 'profile': content = <Profile />; break;
    default: content = <HomeView />;
  }

  return (
    <div className={`tm-shell ${navOpen ? 'nav-open' : ''}`}>
      <aside className="tm-sidebar" aria-label="Workspace">
        <div className="tm-side-head">
          <a href={hrefFor('home')} className="tm-brand sm"><img src={cvmindIcon} alt="" width={28} height={28} /><span>CV<b>Mind</b> Team</span></a>
          <button type="button" className="tm-icon-btn tm-only-mobile" onClick={() => setNavOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="tm-side-scroll">
          {nav.map(({ view, label, icon: Icon }) => (
            <a key={view} href={hrefFor(view)} className={`tm-nav-item ${route.view === view || (view === 'home' && !route.view) ? 'active' : ''}`}><Icon size={17} /> <span className="tm-nav-label">{label}</span></a>
          ))}

          <div className="tm-side-section">
            <span>Channels</span>
            {manager && <button type="button" className="tm-icon-btn sm" onClick={() => setNewChannel(true)} aria-label="New channel" title="New channel"><Plus size={15} /></button>}
          </div>
          {rooms.map((c) => roomLink(c, c.name, c.kind === 'private' ? <Lock size={15} /> : <Hash size={15} />))}
          {otherPublic > 0 && <a href={hrefFor('chat', '', { browse: '1' })} className="tm-nav-item subtle"><Search size={15} /> <span className="tm-nav-label">Browse {otherPublic} more</span></a>}

          <div className="tm-side-section">
            <span>Direct messages</span>
            <button type="button" className="tm-icon-btn sm" onClick={() => setNewDm(true)} aria-label="New message" title="New message"><MessageSquarePlus size={15} /></button>
          </div>
          {dms.map((c) => {
            const others = (c.memberIds || []).filter((id) => id !== me.id);
            const icon = others.length === 1 ? <Avatar person={person(others[0])} size={18} presence /> : <Users size={15} />;
            return roomLink(c, dmName(c), icon);
          })}
          {!dms.length && <p className="tm-side-hint">Message a teammate from People or the + button.</p>}
        </nav>
        <div className="tm-side-foot">
          <a href={hrefFor('profile')} className="tm-me">
            <Avatar person={person(me.id)} size={30} presence />
            <span><strong>{me.name}</strong><small>{me.statusText || me.roleLabel}</small></span>
          </a>
          <a href={hrefFor('profile')} className="tm-icon-btn" aria-label="Profile and settings"><Settings size={17} /></a>
          <button type="button" className="tm-icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
        </div>
      </aside>
      <div className="tm-scrim" onClick={() => setNavOpen(false)} aria-hidden />

      <div className="tm-main">
        <header className="tm-topbar">
          <button type="button" className="tm-icon-btn tm-only-mobile" onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <button type="button" className="tm-search-btn" onClick={() => setSearchOpen(true)}>
            <Search size={16} /> <span>Search messages, tasks, files…</span> <kbd>Ctrl K</kbd>
          </button>
          <div className="tm-bell">
            <button type="button" className="tm-icon-btn" onClick={() => setBellOpen((v) => !v)} aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`} aria-expanded={bellOpen}>
              <Bell size={19} />
              {unreadNotifications > 0 && <span className="tm-dot-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
            </button>
            {bellOpen && <Notifications onClose={() => setBellOpen(false)} />}
          </div>
        </header>
        {!live && <div className="tm-offline"><WifiOff size={14} /> Live updates are reconnecting. The page refreshes every 15 seconds meanwhile.</div>}
        <main className="tm-content">
          <Suspense fallback={<div className="tm-center"><Spinner size={20} /></div>}>{content}</Suspense>
        </main>
      </div>

      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
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

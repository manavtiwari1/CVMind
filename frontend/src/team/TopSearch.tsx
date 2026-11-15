import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, CheckSquare, Clock, CornerDownLeft, FileText, Hash, Megaphone, MessageSquare, Search, X } from 'lucide-react';
import { api } from './api';
import type { Person, TeamFile, TaskStatus } from './api';
import { ago } from './format';
import { go, hrefFor, useTeam } from './store';
import { Avatar, Spinner, StatusBadge } from './ui';
import { openFile } from './upload';

// Search in the top bar, Google-style: results appear under the box as you type, grouped by kind, with the
// matching words highlighted. Arrow keys move, Enter opens, Esc closes. Ctrl/Cmd + K jumps here.
// On phones it opens full screen.

interface Results {
  messages: Array<{ id: string; channelId: string; parentId: string | null; authorId: string; body: string; createdAt: string }>;
  tasks: Array<{ id: string; title: string; status: TaskStatus; dueAt: string | null }>;
  announcements: Array<{ id: string; title: string; createdAt: string }>;
  files: TeamFile[];
  people: Person[];
}
interface Item { key: string; group: string; icon: ReactNode; title: ReactNode; sub?: ReactNode; extra?: ReactNode; open: () => void }

const RECENT_KEY = 'tm-recent-searches';
const readRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 6); } catch { return []; }
};
const saveRecent = (q: string) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6))); } catch { /* storage blocked */ }
};

// The matching part of `text`, wrapped in <mark>
function Highlight({ text, q }: { text: string; q: string }) {
  const words = q.trim().split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'gi'));
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>;
}

// A short piece of a long message around the first match
const snippet = (body: string, q: string) => {
  const i = body.toLowerCase().indexOf(q.trim().toLowerCase().split(/\s+/)[0] || '');
  if (i < 60) return body.slice(0, 140);
  return `…${body.slice(i - 40, i + 100)}`;
};

export function TopSearch() {
  const { nameOf, channels, me, toast } = useTeam();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [found, setFound] = useState<{ q: string; results: Results | null }>({ q: '', results: null });
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const searchable = q.trim().length >= 2;
  const results = searchable && found.q === q ? found.results : null;
  const busy = searchable && found.q !== q;

  useEffect(() => {
    if (!searchable) return;
    const id = setTimeout(() => {
      api<Results>('/search', { query: { q } }).then((r) => setFound({ q, results: r })).catch(() => setFound({ q, results: null }));
    }, 200);
    return () => clearTimeout(id);
  }, [q, searchable]);

  const close = useCallback(() => { setOpen(false); setMobile(false); input.current?.blur(); }, []);

  // Ctrl/Cmd + K focuses search from anywhere; a click outside closes it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.matchMedia('(max-width: 820px)').matches) setMobile(true);
        setOpen(true);
        setTimeout(() => input.current?.focus(), 0);
      }
    };
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, []);
  useEffect(() => { if (mobile) setTimeout(() => input.current?.focus(), 0); }, [mobile]);

  const where = useCallback((channelId: string) => {
    const c = channels.find((x) => x.id === channelId);
    if (!c) return '';
    return c.kind === 'dm' ? `chat with ${(c.memberIds || []).filter((m) => m !== me.id).map(nameOf).join(', ')}` : `#${c.name}`;
  }, [channels, me.id, nameOf]);

  const visit = useCallback((fn: () => void) => {
    if (q.trim().length >= 2) { saveRecent(q.trim()); setRecent(readRecent()); }
    close();
    fn();
  }, [q, close]);

  const items: Item[] = useMemo(() => {
    if (!results) return [];
    const list: Item[] = [];
    results.people.forEach((p) => list.push({
      key: `p-${p.id}`, group: 'People', icon: <Avatar person={p} size={28} presence />,
      title: <Highlight text={p.name} q={q} />, sub: `@${p.username} · ${p.roleLabel}`, extra: <span className="tm-ts-action"><MessageSquare size={13} /> Message</span>,
      open: async () => {
        try {
          const { data } = await api<{ data: { id: string } }>('/dm', { method: 'POST', body: { adminIds: [p.id] } });
          go('chat', data.id);
        } catch (err) {
          toast(err instanceof Error ? err.message : 'Could not open the conversation.', 'error');
        }
      }
    }));
    results.tasks.forEach((t) => list.push({ key: `t-${t.id}`, group: 'Tasks', icon: <span className="tm-ts-icon green"><CheckSquare size={15} /></span>, title: <Highlight text={t.title} q={q} />, extra: <StatusBadge status={t.status} />, open: () => go('tasks', t.id) }));
    results.messages.forEach((m) => list.push({
      key: `m-${m.id}`, group: 'Messages', icon: <span className="tm-ts-icon blue"><Hash size={15} /></span>,
      title: <Highlight text={snippet(m.body, q)} q={q} />, sub: `${nameOf(m.authorId)} in ${where(m.channelId)} · ${ago(m.createdAt)}`,
      open: () => { window.location.hash = hrefFor('chat', m.channelId, m.parentId ? { thread: m.parentId } : { m: m.id }); }
    }));
    results.announcements.forEach((a) => list.push({ key: `a-${a.id}`, group: 'Announcements', icon: <span className="tm-ts-icon amber"><Megaphone size={15} /></span>, title: <Highlight text={a.title} q={q} />, sub: ago(a.createdAt), open: () => go('announcements', a.id) }));
    results.files.forEach((f) => list.push({ key: `f-${f.id}`, group: 'Files', icon: <span className="tm-ts-icon purple"><FileText size={15} /></span>, title: <Highlight text={f.name} q={q} />, sub: `${nameOf(f.uploadedBy)} · ${ago(f.createdAt)}`, open: () => { openFile(f.id).catch(() => {}); } }));
    return list;
  }, [results, q, nameOf, where, toast]);

  // Recent searches when the box is empty
  const recentItems: Item[] = !searchable ? recent.map((r) => ({ key: `r-${r}`, group: 'Recent searches', icon: <span className="tm-ts-icon"><Clock size={15} /></span>, title: r, open: () => { setQ(r); setOpen(true); input.current?.focus(); } })) : [];
  const shown = searchable ? items : recentItems;
  const current = Math.min(active, Math.max(0, shown.length - 1));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && shown[current]) {
      e.preventDefault();
      const item = shown[current];
      if (item.group === 'Recent searches') item.open(); else visit(item.open);
    }
  };

  const groups = [...new Set(shown.map((i) => i.group))];
  const empty = searchable && results && !items.length;

  return (
    <div className={`tm-ts ${open ? 'open' : ''} ${mobile ? 'mobile' : ''}`} ref={box}>
      <button type="button" className="tm-icon-btn tm-ts-mobile-btn" onClick={() => { setMobile(true); setOpen(true); }} aria-label="Search"><Search size={19} /></button>
      <div className="tm-ts-field">
        {mobile ? <button type="button" className="tm-icon-btn" onClick={close} aria-label="Close search"><ArrowLeft size={18} /></button> : <Search size={17} className="tm-ts-glass" />}
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search people, messages, tasks and files"
          aria-label="Search CVMind Team"
          role="combobox"
          aria-expanded={open}
          aria-controls="tm-ts-list"
          aria-activedescendant={shown[current] ? `tm-ts-${shown[current].key}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {busy && <Spinner size={15} />}
        {q && !busy && <button type="button" className="tm-icon-btn sm" onClick={() => { setQ(''); input.current?.focus(); }} aria-label="Clear search"><X size={15} /></button>}
        {!q && <kbd className="tm-ts-kbd">Ctrl K</kbd>}
      </div>
      {open && (shown.length > 0 || empty || searchable) && (
        <div className="tm-ts-panel" id="tm-ts-list" role="listbox">
          {groups.map((g) => (
            <div key={g} className="tm-ts-group">
              <div className="tm-ts-head">{g}{g !== 'Recent searches' && <span>{shown.filter((i) => i.group === g).length}</span>}</div>
              {shown.filter((i) => i.group === g).map((item) => {
                const index = shown.indexOf(item);
                return (
                  <button
                    key={item.key}
                    id={`tm-ts-${item.key}`}
                    type="button"
                    role="option"
                    aria-selected={index === current}
                    className={`tm-ts-item ${index === current ? 'active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => (item.group === 'Recent searches' ? item.open() : visit(item.open))}
                  >
                    {item.icon}
                    <span className="tm-ts-text"><span className="tm-ts-title">{item.title}</span>{item.sub && <span className="tm-ts-sub">{item.sub}</span>}</span>
                    {item.extra}
                    {index === current && <CornerDownLeft size={13} className="tm-ts-enter" />}
                  </button>
                );
              })}
            </div>
          ))}
          {busy && !results && <div className="tm-ts-note"><Spinner size={14} /> Searching…</div>}
          {empty && <div className="tm-ts-note">No results for “{q}”. Try a name, a task title or a word from the message.</div>}
          <div className="tm-ts-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>
        </div>
      )}
    </div>
  );
}

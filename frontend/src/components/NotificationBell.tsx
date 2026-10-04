import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { API_BASE } from '../lib/apiBase';
import { authFetch, getSessionToken } from '../lib/authFetch';
import { internalPage } from '../lib/siteContent';
import './NotificationBell.css';

interface Item {
  id: string;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  read: boolean;
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Bell with announcements sent from the admin panel. Checks every few minutes while signed in.
export default function NotificationBell({ setCurrentPage }: { setCurrentPage: (page: string) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const unread = items.filter((i) => !i.read).length;

  useEffect(() => {
    if (!getSessionToken()) return;
    let cancelled = false;
    authFetch(`${API_BASE}/api/notifications`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.data) setItems(d.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  const markRead = useCallback((ids?: string[]) => {
    setItems((list) => list.map((i) => (!ids || ids.includes(i.id) ? { ...i, read: true } : i)));
    authFetch(`${API_BASE}/api/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids ? { ids } : {})
    }).catch(() => {});
  }, []);

  const openItem = (item: Item) => {
    if (!item.read) markRead([item.id]);
    if (!item.link) return;
    setOpen(false);
    const page = internalPage(item.link);
    if (page) setCurrentPage(page);
    else window.open(item.link, '_blank', 'noopener');
  };

  return (
    <div className="nb-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="nb-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={19} />
        {unread > 0 && <span className="nb-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="nb-panel" role="dialog" aria-label="Notifications">
          <div className="nb-head">
            <strong>Notifications</strong>
            {unread > 0 && <button type="button" className="nb-mark" onClick={() => markRead()}>Mark all as read</button>}
          </div>
          {items.length === 0 ? (
            <p className="nb-empty">You're all caught up.</p>
          ) : (
            <ul className="nb-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" className={`nb-item${item.read ? '' : ' unread'}`} onClick={() => openItem(item)}>
                    <span className="nb-title">{item.title}</span>
                    {item.body && <span className="nb-body">{item.body}</span>}
                    <span className="nb-time">{ago(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

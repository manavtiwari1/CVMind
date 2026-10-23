import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { api } from '../api';
import type { Notification } from '../api';
import { notificationHref } from '../format';
import { useTeam, useTeamEvent } from '../store';
import { ago } from '../format';
import { Avatar, Spinner } from '../ui';

const LABELS: Record<string, string> = {
  mention: 'mentioned you',
  dm: 'sent you a message',
  thread_reply: 'replied in a thread',
  task_assigned: 'assigned you a task',
  task_unassigned: 'removed you from a task',
  task_updated: 'updated a task',
  task_comment: 'commented on a task',
  submission: 'submitted work for review',
  review_approved: 'approved your work',
  review_changes: 'asked for changes',
  announcement: 'posted an announcement',
  task_due_soon: 'Due in 2 hours',
  added_to_channel: 'added you to a channel',
  standup_reminder: 'Time for your daily check-in',
  standup_blocker: 'reported a blocker',
  leave_requested: 'requested leave',
  leave_approved: 'approved your leave',
  leave_declined: 'declined your leave',
  meeting_started: 'started a call',
  meeting_scheduled: 'invited you to a meeting',
  meeting_moved: 'moved a meeting',
  meeting_cancelled: 'cancelled a meeting',
  meeting_soon: 'Meeting starts in 10 minutes',
  meeting_notes: "Leo's meeting notes are ready",
  meeting_recording: 'saved a meeting recording'
};

export default function Notifications({ onClose }: { onClose: () => void }) {
  const { nameOf, person, reloadNotifications } = useTeam();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback((before?: string) => {
    api<{ data: Notification[]; hasMore: boolean }>('/notifications', { query: { before } })
      .then((res) => {
        setItems((prev) => (before ? [...(prev || []), ...res.data] : res.data));
        setHasMore(res.hasMore);
      })
      .catch(() => setItems((prev) => prev || []));
  }, []);

  useEffect(() => { load(); }, [load]);
  useTeamEvent('notification.new', () => load());

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('.tm-bell')) onClose();
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [onClose]);

  const readAll = async () => {
    await api('/notifications/read', { method: 'POST', body: { all: true } }).catch(() => {});
    setItems((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })) || null);
    reloadNotifications();
  };

  const open = (n: Notification) => {
    if (!n.readAt) api('/notifications/read', { method: 'POST', body: { id: n.id } }).then(reloadNotifications).catch(() => {});
    onClose();
  };

  return (
    <div className="tm-popover" ref={ref} role="dialog" aria-label="Notifications">
      <header>
        <strong>Notifications</strong>
        <button type="button" className="tm-link" onClick={readAll}><CheckCheck size={14} /> Mark all read</button>
      </header>
      <div className="tm-popover-body">
        {!items && <div className="tm-center"><Spinner /></div>}
        {items?.length === 0 && <p className="tm-muted pad">Nothing yet. Mentions, tasks and announcements show up here.</p>}
        {items?.map((n) => (
          <a key={n.id} href={notificationHref(n)} className={`tm-notif ${n.readAt ? '' : 'unread'}`} onClick={() => open(n)}>
            <Avatar person={person(n.actorId)} size={30} />
            <span>
              <span>{n.actorId ? <><strong>{nameOf(n.actorId)}</strong> {LABELS[n.type] || 'did something'}</> : <strong>{LABELS[n.type] || 'Update'}</strong>}</span>
              {n.preview && <span className="tm-clamp tm-muted">{n.preview}</span>}
              <span className="tm-muted small">{ago(n.createdAt)}</span>
            </span>
          </a>
        ))}
        {hasMore && items && <button type="button" className="tm-link pad" onClick={() => load(items[items.length - 1].id)}>Show older</button>}
      </div>
    </div>
  );
}

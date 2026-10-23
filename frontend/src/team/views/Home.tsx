import { AtSign, CheckSquare, ClipboardCheck, Megaphone, MessageSquare, Pin } from 'lucide-react';
import type { Leave, Notification, Standup, Task } from '../api';
import { hrefFor, useLoad, useTeam, useTeamEvent } from '../store';
import { ago, isOverdue, notificationHref } from '../format';
import { Empty, Spinner } from '../ui';
import { TaskRow } from './Tasks';

interface HomeData {
  tasks: Task[];
  announcements: Array<{ id: string; title: string; important: boolean; pinned: boolean; createdAt: string; acked: boolean }>;
  mentions: Notification[];
  unreadDms: Array<{ channelId: string; unread: number }>;
  manager: { awaitingReview: Task[]; teamOverdue: number } | null;
}

const startOfTomorrow = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d; };

export default function Home() {
  const { me, nameOf, channels } = useTeam();
  const { data, loading, reload } = useLoad<HomeData>('/home');
  const checkin = useLoad<{ workingDay: boolean; data: Standup | null; leave: Leave | null }>('/checkin');
  useTeamEvent('task.updated', reload, reload);
  useTeamEvent('announcement.created', reload);
  useTeamEvent('notification.new', reload);

  if (loading && !data) return <div className="tm-center"><Spinner size={20} /></div>;
  if (!data) return null;

  const tomorrow = startOfTomorrow();
  const groups = [
    { label: 'Overdue', tone: 'red', tasks: data.tasks.filter((t) => isOverdue(t.dueAt, t.status)) },
    { label: 'Changes requested', tone: 'amber', tasks: data.tasks.filter((t) => t.status === 'changes_requested' && !isOverdue(t.dueAt, t.status)) },
    { label: 'Due today', tone: '', tasks: data.tasks.filter((t) => t.status !== 'changes_requested' && t.dueAt && !isOverdue(t.dueAt, t.status) && new Date(t.dueAt) < tomorrow) },
    { label: 'This week', tone: '', tasks: data.tasks.filter((t) => t.status !== 'changes_requested' && t.dueAt && new Date(t.dueAt) >= tomorrow) }
  ].filter((g) => g.tasks.length);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dmName = (id: string) => {
    const c = channels.find((x) => x.id === id);
    return (c?.memberIds || []).filter((m) => m !== me.id).map(nameOf).join(', ') || 'Direct message';
  };

  return (
    <div className="tm-page">
      <header className="tm-page-head"><h1>{hello}, {me.name.split(' ')[0]}</h1><p className="tm-muted">Here is what needs your attention.</p></header>

      {checkin.data && checkin.data.workingDay && !checkin.data.data && !(checkin.data.leave && checkin.data.leave.kind !== 'wfh') && (
        <a className="tm-checkin-cta" href={hrefFor('checkin')}>
          <ClipboardCheck size={20} />
          <span><strong>Post today's check-in</strong><span className="tm-muted small">What you finished, what you're doing today, and anything blocking you.</span></span>
          <span className="tm-btn primary sm">Check in</span>
        </a>
      )}

      {data.manager && (
        <div className="tm-stats">
          <a className="tm-stat" href={hrefFor('tasks', '', { view: 'all', status: 'submitted' })}><strong>{data.manager.awaitingReview.length}</strong><span>Awaiting your review</span></a>
          <a className={`tm-stat ${data.manager.teamOverdue ? 'red' : ''}`} href={hrefFor('tasks', '', { view: 'all', due: 'overdue' })}><strong>{data.manager.teamOverdue}</strong><span>Overdue across the team</span></a>
        </div>
      )}

      <div className="tm-home-grid">
        <section className="tm-card pad">
          <h2 className="tm-h2"><CheckSquare size={16} /> My tasks</h2>
          {!groups.length && <Empty title="You're all caught up" text="Nothing due this week." action={<a className="tm-link" href={hrefFor('tasks')}>See all my tasks</a>} />}
          {groups.map((g) => (
            <div key={g.label} className="tm-task-group">
              <h3 className={g.tone ? `tm-${g.tone}` : ''}>{g.label} <span>{g.tasks.length}</span></h3>
              {g.tasks.map((t) => <TaskRow key={t.id} task={t} />)}
            </div>
          ))}
          {data.manager && data.manager.awaitingReview.length > 0 && (
            <div className="tm-task-group">
              <h3>Awaiting your review <span>{data.manager.awaitingReview.length}</span></h3>
              {data.manager.awaitingReview.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} />)}
            </div>
          )}
        </section>

        <div className="tm-home-side">
          <section className="tm-card pad">
            <h2 className="tm-h2"><Megaphone size={16} /> Announcements</h2>
            {!data.announcements.length && <p className="tm-muted">No announcements yet.</p>}
            {data.announcements.map((a) => (
              <a key={a.id} href={hrefFor('announcements', a.id)} className={`tm-mini ${a.acked ? '' : 'unacked'}`}>
                {a.pinned && <Pin size={13} />} <strong>{a.title}</strong>
                <span className="tm-muted small">{ago(a.createdAt)}{!a.acked && ' · Please acknowledge'}</span>
              </a>
            ))}
          </section>
          <section className="tm-card pad">
            <h2 className="tm-h2"><AtSign size={16} /> Mentions and messages</h2>
            {!data.mentions.length && !data.unreadDms.length && <p className="tm-muted">No new mentions.</p>}
            {data.unreadDms.map((d) => (
              <a key={d.channelId} href={hrefFor('chat', d.channelId)} className="tm-mini unacked"><MessageSquare size={13} /> <strong>{dmName(d.channelId)}</strong><span className="tm-muted small">{d.unread} unread</span></a>
            ))}
            {data.mentions.map((n) => (
              <a key={n.id} href={notificationHref(n)} className={`tm-mini ${n.readAt ? '' : 'unacked'}`}>
                <strong>{nameOf(n.actorId)}</strong> <span className="tm-muted small">{ago(n.createdAt)}</span>
                <span className="tm-clamp">{n.preview}</span>
              </a>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

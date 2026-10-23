import type { Notification, Priority, TaskStatus } from './api';
import { hrefFor } from './store';

// ── Time ─────────────────────────────────────────────────────────────────────
export function ago(value: string | null | undefined) {
  if (!value) return '';
  const s = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const clock = (value: string) => new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export function dayLabel(value: string) {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function dueLabel(value: string | null) {
  if (!value) return 'No due date';
  const d = new Date(value);
  const sameDay = d.toDateString() === new Date().toDateString();
  return `${sameDay ? 'Today' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${clock(value)}`;
}

export const isOverdue = (dueAt: string | null, status: TaskStatus) => !!dueAt && status !== 'approved' && new Date(dueAt) < new Date();

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do', in_progress: 'In progress', blocked: 'Blocked', submitted: 'Submitted', changes_requested: 'Changes requested', approved: 'Done'
};
export const PRIORITY_LABELS: Record<Priority, string> = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' };

export const EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '🔥', '👀', '✅', '💯', '😮', '😢', '🚀', '👏', '🤝', '💡', '⏰'];

// Where opening a notification takes you
export function notificationHref(n: Notification) {
  if (n.taskId) return hrefFor('tasks', n.taskId);
  if (n.type === 'standup_blocker') return hrefFor('checkin', '', { tab: 'team' });
  if (n.refType === 'standup') return hrefFor('checkin');
  if (n.type === 'leave_requested') return hrefFor('checkin', '', { tab: 'requests' });
  if (n.refType === 'leave') return hrefFor('checkin', '', { tab: 'leave' });
  if (n.refType === 'announcement' && n.refId) return hrefFor('announcements', n.refId);
  if (n.channelId && n.refType === 'message' && n.refId) return hrefFor('chat', n.channelId, { m: n.refId });
  if (n.channelId) return hrefFor('chat', n.channelId);
  return hrefFor('home');
}

import { useMemo, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Clock, ListChecks, Repeat } from 'lucide-react';
import { api } from '../api';
import type { Task, TaskStatus } from '../api';
import { hrefFor, useTeam } from '../store';
import { clock, dueLabel, isOverdue, STATUS_LABELS } from '../format';
import { Avatar, Modal, PriorityBadge } from '../ui';

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'submitted', 'changes_requested', 'approved'];
const WORK: TaskStatus[] = ['todo', 'in_progress', 'blocked'];

export const checklistProgress = (t: Task) => (t.checklist.length ? `${t.checklist.filter((c) => c.done).length}/${t.checklist.length}` : '');

// The same rules as PATCH /tasks/:id, so a card that can't move there snaps back with a reason
function moveError(task: Task, to: TaskStatus, meId: string, manager: boolean): string {
  const assignee = task.assigneeIds.includes(meId);
  const creator = task.createdBy === meId;
  const selfTask = creator && assignee && task.assigneeIds.length === 1;
  if (to === 'submitted') return 'Open the task and press Submit work to send it for review.';
  if (to === 'changes_requested') return 'Changes are requested while reviewing a submission.';
  if (to === 'approved') return manager || selfTask ? '' : 'Submit your work so a manager can approve it.';
  if (!assignee && !creator && !manager) return 'Only the people on this task can change its status.';
  return '';
}

export function TaskBoard({ tasks, onChanged }: { tasks: Task[]; onChanged: () => void }) {
  const { me, manager, person, toast } = useTeam();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [blocking, setBlocking] = useState<Task | null>(null);
  const [moved, setMoved] = useState<Record<string, TaskStatus>>({});

  const statusOf = (t: Task) => moved[t.id] || t.status;
  const columns = useMemo(() => COLUMNS.map((s) => ({ status: s, tasks: tasks.filter((t) => (moved[t.id] || t.status) === s) })), [tasks, moved]);

  const move = async (task: Task, to: TaskStatus, blockedReason?: string) => {
    setMoved((m) => ({ ...m, [task.id]: to }));
    try {
      await api(`/tasks/${task.id}`, { method: 'PATCH', body: { status: to, blockedReason } });
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not move the task.', 'error');
    } finally {
      setMoved((m) => { const { [task.id]: _, ...rest } = m; return rest; });
    }
  };

  const drop = (e: DragEvent, to: TaskStatus) => {
    e.preventDefault();
    setOver(null);
    const task = tasks.find((t) => t.id === e.dataTransfer.getData('text/plain'));
    setDragging(null);
    if (task) request(task, to);
  };

  // Drag-and-drop and the "Move to" menu (for touch screens) both end here
  const request = (task: Task, to: TaskStatus) => {
    if (statusOf(task) === to) return;
    const problem = moveError(task, to, me.id, manager);
    if (problem) { toast(problem, 'error'); return; }
    if (to === 'blocked') { setBlocking(task); return; }
    move(task, to);
  };

  return (
    <div className="tm-board" role="list" aria-label="Task board">
      {columns.map((col) => (
        <section
          key={col.status}
          role="listitem"
          aria-label={STATUS_LABELS[col.status]}
          className={`tm-board-col ${over === col.status ? 'over' : ''} ${dragging && !WORK.includes(col.status) && col.status !== 'approved' ? 'locked' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(col.status); }}
          onDragLeave={() => setOver((s) => (s === col.status ? null : s))}
          onDrop={(e) => drop(e, col.status)}
        >
          <h3><span className={`tm-board-dot status-${col.status}`} aria-hidden /> {STATUS_LABELS[col.status]} <span className="tm-muted">{col.tasks.length}</span></h3>
          <div className="tm-board-cards">
            {col.tasks.map((t) => {
              const overdue = isOverdue(t.dueAt, statusOf(t));
              const progress = checklistProgress(t);
              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; setDragging(t.id); }}
                  onDragEnd={() => { setDragging(null); setOver(null); }}
                  className={`tm-board-card ${dragging === t.id ? 'dragging' : ''} ${moved[t.id] ? 'saving' : ''}`}
                >
                  <a href={hrefFor('tasks', t.id)} draggable={false}><strong>{t.title}</strong></a>
                  <span className="tm-task-meta">
                    {t.priority !== 'normal' && <PriorityBadge priority={t.priority} />}
                    {t.dueAt && <span className={overdue ? 'tm-overdue' : 'tm-muted'}><Clock size={12} /> {dueLabel(t.dueAt)}</span>}
                    {progress && <span className="tm-muted"><ListChecks size={12} /> {progress}</span>}
                    {t.recurrence && <span className="tm-muted" title={`Repeats ${t.recurrence.freq}`}><Repeat size={12} /></span>}
                  </span>
                  <span className="tm-board-foot">
                    <span className="tm-stack">{t.assigneeIds.slice(0, 4).map((a) => <Avatar key={a} person={person(a)} size={22} />)}</span>
                    <select className="tm-input sm tm-board-move" value="" onChange={(e) => request(t, e.target.value as TaskStatus)} aria-label={`Move ${t.title}`}>
                      <option value="" disabled>Move to…</option>
                      {COLUMNS.filter((s) => s !== statusOf(t)).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </span>
                </div>
              );
            })}
            {!col.tasks.length && <p className="tm-board-empty">Drop tasks here</p>}
          </div>
        </section>
      ))}
      {blocking && <BlockedReason onClose={() => setBlocking(null)} onSave={(reason) => { const t = blocking; setBlocking(null); move(t, 'blocked', reason); }} />}
    </div>
  );
}

function BlockedReason({ onClose, onSave }: { onClose: () => void; onSave: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title="What is blocking this task?" onClose={onClose} footer={<>
      <button type="button" className="tm-btn" onClick={onClose}>Cancel</button>
      <button type="button" className="tm-btn primary" disabled={!reason.trim()} onClick={() => onSave(reason)}>Mark blocked</button>
    </>}>
      <textarea className="tm-input tm-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} aria-label="Reason" autoFocus placeholder="Waiting for the brand colours from design" />
    </Modal>
  );
}

// ── Calendar ─────────────────────────────────────────────────────────────────
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// First and last moment of the month shown, in the viewer's time zone
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
}

export const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export function TaskCalendar({ tasks, month, onMonth, extra }: { tasks: Task[]; month: string; onMonth: (m: string) => void; extra?: (day: Date) => ReactNode }) {
  const { from } = monthRange(month);
  const [picked, setPicked] = useState<Date | null>(null);
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueAt) continue;
      const k = dayKey(new Date(t.dueAt));
      map.set(k, [...(map.get(k) || []), t]);
    }
    return map;
  }, [tasks]);

  // Monday-first grid that covers the whole month
  const start = new Date(from);
  start.setDate(1 - ((from.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const weeks = days[35].getMonth() === from.getMonth() ? 6 : 5;
  const shift = (n: number) => { const d = new Date(from.getFullYear(), from.getMonth() + n, 1); onMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };
  const today = dayKey(new Date());
  const pickedTasks = picked ? byDay.get(dayKey(picked)) || [] : [];

  return (
    <div className="tm-card tm-cal">
      <div className="tm-cal-head">
        <button type="button" className="tm-icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button>
        <h2>{from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
        <button type="button" className="tm-icon-btn" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={17} /></button>
        <button type="button" className="tm-btn sm" onClick={() => onMonth(thisMonth())}>Today</button>
      </div>
      <div className="tm-cal-grid">
        {WEEKDAYS.map((w) => <div key={w} className="tm-cal-wd">{w}</div>)}
        {days.slice(0, weeks * 7).map((d) => {
          const k = dayKey(d);
          const items = byDay.get(k) || [];
          return (
            <button
              type="button"
              key={k}
              className={`tm-cal-day ${d.getMonth() !== from.getMonth() ? 'other' : ''} ${k === today ? 'today' : ''}`}
              onClick={() => setPicked(d)}
              aria-label={`${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}: ${items.length} task${items.length === 1 ? '' : 's'}`}
            >
              <span className="tm-cal-num">{d.getDate()}</span>
              {items.slice(0, 3).map((t) => <span key={t.id} className={`tm-cal-item ${isOverdue(t.dueAt, t.status) ? 'overdue' : `status-${t.status}`}`}>{t.title}</span>)}
              {items.length > 3 && <span className="tm-cal-more">+{items.length - 3} more</span>}
              {extra?.(d)}
            </button>
          );
        })}
      </div>
      {picked && (
        <Modal title={picked.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} onClose={() => setPicked(null)}>
          {!pickedTasks.length && <p className="tm-muted">Nothing due this day.</p>}
          <div className="tm-cal-daylist">
            {pickedTasks.map((t) => (
              <a key={t.id} className="tm-cal-dayitem" href={hrefFor('tasks', t.id)} onClick={() => setPicked(null)}>
                <span className={`tm-badge ${isOverdue(t.dueAt, t.status) ? 'prio-urgent' : `status-${t.status}`}`}>{isOverdue(t.dueAt, t.status) ? 'Overdue' : STATUS_LABELS[t.status]}</span>
                <strong>{t.title}</strong>
                <span className="tm-muted small">{t.dueAt && clock(t.dueAt)}</span>
              </a>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

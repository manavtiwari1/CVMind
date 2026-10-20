import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, CheckSquare, Clock, MessageSquare, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { api } from '../api';
import type { Activity, Comment, Submission, Task, TaskStatus } from '../api';
import { go, hrefFor, useLoad, useTeam, useTeamEvent } from '../store';
import { useAttachments } from '../attachments';
import { ago, dueLabel, isOverdue, STATUS_LABELS } from '../format';
import { AttachButton, Avatar, Empty, FileList, MentionInput, Modal, PendingFiles, PriorityBadge, RichText, Spinner, StatusBadge } from '../ui';
import TaskForm from './TaskForm';

type View = 'mine' | 'created' | 'all';

export default function Tasks({ id, params }: { id: string; params: Record<string, string> }) {
  if (id) return <TaskDetail key={id} id={id} />;
  return <TaskList params={params} />;
}

export function TaskRow({ task }: { task: Task }) {
  const { person } = useTeam();
  const overdue = isOverdue(task.dueAt, task.status);
  return (
    <a href={hrefFor('tasks', task.id)} className={`tm-task-row ${task.status === 'approved' ? 'done' : ''}`}>
      <span className={`tm-task-check ${task.status}`} aria-hidden>{task.status === 'approved' ? <CheckCircle2 size={18} /> : <CheckSquare size={18} />}</span>
      <span className="tm-task-main">
        <strong>{task.title}</strong>
        <span className="tm-task-meta">
          <StatusBadge status={task.status} />
          {task.priority !== 'normal' && <PriorityBadge priority={task.priority} />}
          <span className={overdue ? 'tm-overdue' : 'tm-muted'}><Clock size={12} /> {overdue ? 'Overdue · ' : ''}{dueLabel(task.dueAt)}</span>
        </span>
      </span>
      <span className="tm-stack" aria-label={`Assigned to ${task.assigneeIds.map((a) => person(a)?.name).join(', ')}`}>
        {task.assigneeIds.slice(0, 3).map((a) => <Avatar key={a} person={person(a)} size={24} />)}
      </span>
    </a>
  );
}

function TaskList({ params }: { params: Record<string, string> }) {
  const { manager, me } = useTeam();
  const [view, setView] = useState<View>((params.view as View) || 'mine');
  const [status, setStatus] = useState(params.status || 'open');
  const [due, setDue] = useState(params.due || '');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [sort, setSort] = useState('due');
  const [creating, setCreating] = useState(false);
  const { people } = useTeam();
  const { data, error, loading, reload } = useLoad<{ data: Task[]; total: number }>('/tasks', { view, status, due, priority, assignee: view === 'mine' ? '' : assignee, sort, limit: 100 });
  useTeamEvent('task.updated', reload, reload);

  // Interns only receive tasks, so they get just "My tasks"
  const views: Array<{ id: View; label: string }> = [
    { id: 'mine', label: 'My tasks' },
    ...(manager ? [{ id: 'created' as View, label: 'Assigned by me' }, { id: 'all' as View, label: 'All tasks' }] : me.teamOnly ? [] : [{ id: 'created' as View, label: 'Created by me' }])
  ];

  return (
    <div className="tm-page">
      <header className="tm-page-head row">
        <div><h1>Tasks</h1><p className="tm-muted">{manager ? 'Assign work with @name, review submissions, and keep an eye on due dates.' : me.teamOnly ? 'Tasks your manager assigned to you. Open one and press Submit work when it is done.' : 'Your work, what is due, and feedback from your manager.'}</p></div>
        {!me.teamOnly && <button type="button" className="tm-btn primary" onClick={() => setCreating(true)}><Plus size={16} /> New task</button>}
      </header>
      <div className="tm-tabs" role="tablist">
        {views.map((v) => <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>{v.label}</button>)}
      </div>
      <div className="tm-filters">
        <select className="tm-input sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="open">Open</option>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="tm-input sm" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due">
          <option value="">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="week">Due this week</option>
          <option value="none">No due date</option>
        </select>
        <select className="tm-input sm" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
          <option value="">Any priority</option>
          <option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
        </select>
        {view !== 'mine' && (
          <select className="tm-input sm" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assignee">
            <option value="">Anyone</option>
            {[...people.values()].filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select className="tm-input sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="due">Sort: due date</option><option value="priority">Sort: priority</option><option value="updated">Sort: last updated</option>
        </select>
      </div>
      <div className="tm-card tm-list">
        {error && <p className="tm-notice red">{error}</p>}
        {loading && !data && <div className="tm-center"><Spinner /></div>}
        {data?.data.map((t) => <TaskRow key={t.id} task={t} />)}
        {data && !data.data.length && <Empty icon={<CheckSquare size={22} />} title="No tasks here" text={view === 'mine' ? 'Nothing assigned to you with these filters.' : 'Try other filters.'} />}
      </div>
      {creating && <TaskForm onClose={() => setCreating(false)} />}
    </div>
  );
}

interface Detail {
  data: Task;
  submissions: Submission[];
  activity: Activity[];
  source: { messageId: string; channelId: string; channelName: string; excerpt: string; authorId: string } | null;
  canReview: boolean;
  canEdit: boolean;
}

const ACTIVITY: Record<string, string> = {
  created: 'created the task', status: 'changed the status', title: 'renamed the task', description: 'edited the details', priority: 'changed the priority',
  due: 'changed the due date', assignees: 'changed who is assigned', submitted: 'submitted work', approved: 'approved the work', changes_requested: 'asked for changes'
};

function activityText(a: Activity) {
  if (a.type === 'status') return `moved it to ${STATUS_LABELS[a.to as TaskStatus] || a.to}`;
  if (a.type === 'priority') return `set priority to ${a.to}`;
  if (a.type === 'due') return a.to ? `set the due date to ${dueLabel(a.to as string)}` : 'removed the due date';
  if (a.type === 'submitted' && a.to && typeof a.to === 'object') return `submitted v${(a.to as { version: number }).version}`;
  return ACTIVITY[a.type] || a.type;
}

function TaskDetail({ id }: { id: string }) {
  const { me, manager, person, nameOf, toast } = useTeam();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const load = useCallback(() => {
    Promise.all([api<Detail>(`/tasks/${id}`), api<{ data: Comment[] }>(`/tasks/${id}/comments`)])
      .then(([d, c]) => {
        setDetail(d);
        setComments(c.data);
        api('/notifications/read', { method: 'POST', body: { taskId: id } }).catch(() => {});
      })
      .catch((err: Error) => setError(err.message || 'Could not open the task.'));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useTeamEvent('task.updated', (p) => { if (p.taskId === id) load(); }, load);

  if (error) return <div className="tm-page"><Empty icon={<CheckSquare size={22} />} title="Task not found" text={error} action={<a className="tm-btn" href={hrefFor('tasks')}>All tasks</a>} /></div>;
  if (!detail) return <div className="tm-center"><Spinner size={20} /></div>;

  const t = detail.data;
  const assignee = t.assigneeIds.includes(me.id);
  const selfTask = t.createdBy === me.id && t.assigneeIds.length === 1 && assignee;
  const latest = detail.submissions[0];
  const overdue = isOverdue(t.dueAt, t.status);

  const setStatus = async (status: TaskStatus, blockedReason?: string) => {
    try {
      await api(`/tasks/${t.id}`, { method: 'PATCH', body: { status, blockedReason } });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update.', 'error');
    }
  };
  const remove = async () => {
    if (!window.confirm('Delete this task, its submissions and comments?')) return;
    await api(`/tasks/${t.id}`, { method: 'DELETE' }).then(() => go('tasks')).catch((err: Error) => toast(err.message, 'error'));
  };

  return (
    <div className="tm-page tm-task-page">
      <a className="tm-back" href={hrefFor('tasks')}><ArrowLeft size={15} /> Tasks</a>
      <header className="tm-task-head">
        <div>
          <div className="tm-task-meta"><StatusBadge status={t.status} /> <PriorityBadge priority={t.priority} /> {overdue && <span className="tm-badge prio-urgent">Overdue</span>}</div>
          <h1>{t.title}</h1>
        </div>
        <div className="tm-task-actions">
          {assignee && ['todo', 'blocked', 'changes_requested'].includes(t.status) && <button type="button" className="tm-btn" onClick={() => setStatus('in_progress')}>Start working</button>}
          {assignee && t.status === 'in_progress' && <button type="button" className="tm-btn ghost" onClick={() => setBlocking(true)}><AlertTriangle size={15} /> Blocked</button>}
          {assignee && !['approved', 'submitted'].includes(t.status) && !selfTask && <button type="button" className="tm-btn primary" onClick={() => setSubmitting(true)}><Upload size={15} /> Submit work</button>}
          {(selfTask || manager) && t.status !== 'approved' && t.status !== 'submitted' && <button type="button" className="tm-btn" onClick={() => setStatus('approved')}><CheckCircle2 size={15} /> Mark done</button>}
          {t.status === 'approved' && (manager || selfTask) && <button type="button" className="tm-btn ghost" onClick={() => setStatus('todo')}>Reopen</button>}
          {detail.canEdit && <button type="button" className="tm-icon-btn" onClick={() => setEditing(true)} aria-label="Edit task"><Pencil size={16} /></button>}
          {manager && <button type="button" className="tm-icon-btn" onClick={remove} aria-label="Delete task"><Trash2 size={16} /></button>}
        </div>
      </header>

      <div className="tm-task-grid">
        <div className="tm-task-content">
          {t.status === 'blocked' && t.blockedReason && <div className="tm-notice amber"><AlertTriangle size={15} /> Blocked: {t.blockedReason}</div>}
          {latest?.review.status === 'changes_requested' && t.status === 'changes_requested' && (
            <div className="tm-notice amber"><strong>{nameOf(latest.review.by)} asked for changes:</strong> <RichText text={latest.review.comment} /></div>
          )}
          <section className="tm-card pad">
            <h2 className="tm-h2">Details</h2>
            {t.description ? <div className="tm-text"><RichText text={t.description} /></div> : <p className="tm-muted">No details.</p>}
            <FileList files={t.files} />
          </section>

          <section className="tm-card pad">
            <h2 className="tm-h2">Submissions</h2>
            {!detail.submissions.length && <p className="tm-muted">{assignee ? 'When you finish, press Submit work and attach your files.' : 'Nothing submitted yet.'}</p>}
            {detail.submissions.map((s, i) => <SubmissionCard key={s.id} submission={s} latest={i === 0} canReview={detail.canReview && t.status === 'submitted'} onReviewed={load} />)}
            {assignee && !['approved', 'submitted'].includes(t.status) && !selfTask && <button type="button" className="tm-btn primary" onClick={() => setSubmitting(true)}><Upload size={15} /> Submit work</button>}
          </section>

          <section className="tm-card pad">
            <h2 className="tm-h2"><MessageSquare size={16} /> Comments</h2>
            {comments.map((c) => (
              <div key={c.id} className="tm-comment">
                <Avatar person={person(c.authorId)} size={28} />
                <div>
                  <div className="tm-msg-meta"><strong>{nameOf(c.authorId)}</strong> <time>{ago(c.createdAt)}</time></div>
                  {c.body && <div className="tm-text"><RichText text={c.body} /></div>}
                  <FileList files={c.files} />
                </div>
              </div>
            ))}
            <CommentBox taskId={t.id} candidates={[t.createdBy, ...t.assigneeIds]} onSent={load} />
          </section>
        </div>

        <aside className="tm-task-side">
          <dl className="tm-card pad tm-facts">
            <dt>Assigned to</dt>
            <dd>{t.assigneeIds.map((a) => <span key={a} className="tm-person"><Avatar person={person(a)} size={22} presence /> {nameOf(a)}</span>)}</dd>
            <dt>Created by</dt>
            <dd><span className="tm-person"><Avatar person={person(t.createdBy)} size={22} /> {nameOf(t.createdBy)}</span></dd>
            <dt>Due</dt>
            <dd className={overdue ? 'tm-overdue' : ''}>{dueLabel(t.dueAt)}</dd>
            <dt>Created</dt>
            <dd>{new Date(t.createdAt).toLocaleString('en-IN')}</dd>
            {t.completedAt && <><dt>Completed</dt><dd>{new Date(t.completedAt).toLocaleString('en-IN')}</dd></>}
            {detail.source && (
              <>
                <dt>From a message</dt>
                <dd><a className="tm-link" href={hrefFor('chat', detail.source.channelId, { m: detail.source.messageId })}>{detail.source.channelName ? `#${detail.source.channelName}` : 'Direct message'}</a>{detail.source.excerpt && <span className="tm-quote">“{detail.source.excerpt}”</span>}</dd>
              </>
            )}
          </dl>
          <section className="tm-card pad">
            <h2 className="tm-h2">Activity</h2>
            <ol className="tm-activity">
              {detail.activity.map((a) => <li key={a.id}><strong>{nameOf(a.actorId)}</strong> {activityText(a)} <span className="tm-muted small">· {ago(a.createdAt)}</span></li>)}
            </ol>
          </section>
        </aside>
      </div>

      {editing && <TaskForm task={t} onClose={() => setEditing(false)} onSaved={() => load()} />}
      {submitting && <SubmitWork task={t} onClose={() => setSubmitting(false)} onDone={load} />}
      {blocking && <BlockedDialog onClose={() => setBlocking(false)} onSave={(reason) => { setBlocking(false); setStatus('blocked', reason); }} />}
    </div>
  );
}

function SubmissionCard({ submission: s, latest, canReview, onReviewed }: { submission: Submission; latest: boolean; canReview: boolean; onReviewed: () => void }) {
  const { nameOf, toast } = useTeam();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState('');
  const review = async (decision: 'approve' | 'changes') => {
    if (decision === 'changes' && !comment.trim()) { toast('Say what needs to change.', 'error'); return; }
    setBusy(decision);
    try {
      await api(`/submissions/${s.id}/review`, { method: 'POST', body: { decision, comment } });
      toast(decision === 'approve' ? 'Approved' : 'Changes requested');
      onReviewed();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save the review.', 'error');
    } finally {
      setBusy('');
    }
  };
  return (
    <div className={`tm-submission ${latest ? 'latest' : ''}`}>
      <div className="tm-submission-head">
        <strong>v{s.version}</strong>
        <span>{nameOf(s.authorId)} · {ago(s.createdAt)}</span>
        {s.late && <span className="tm-badge prio-high">Submitted late</span>}
        {s.review.status === 'approved' && <span className="tm-badge status-approved">Approved</span>}
        {s.review.status === 'changes_requested' && <span className="tm-badge status-changes_requested">Changes requested</span>}
        {s.review.status === 'pending' && <span className="tm-badge status-submitted">Waiting for review</span>}
      </div>
      {s.note && <div className="tm-text"><RichText text={s.note} /></div>}
      <FileList files={s.files} />
      {s.review.status !== 'pending' && s.review.comment && <p className="tm-review-note"><strong>{nameOf(s.review.by)}:</strong> {s.review.comment}</p>}
      {latest && canReview && s.review.status === 'pending' && (
        <div className="tm-review">
          <MentionInput value={comment} onChange={setComment} rows={2} label="Review comment" placeholder="Feedback (required when asking for changes)" />
          <div className="tm-inline">
            <button type="button" className="tm-btn" disabled={!!busy} onClick={() => review('changes')}>{busy === 'changes' && <Spinner size={14} />} Request changes</button>
            <button type="button" className="tm-btn primary" disabled={!!busy} onClick={() => review('approve')}>{busy === 'approve' && <Spinner size={14} />} <CheckCircle2 size={15} /> Approve</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitWork({ task, onClose, onDone }: { task: Task; onClose: () => void; onDone: () => void }) {
  const { toast } = useTeam();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const files = useAttachments({ scope: 'task', scopeId: task.id }, { max: 5 });
  const submit = async () => {
    setBusy(true);
    try {
      await api(`/tasks/${task.id}/submissions`, { method: 'POST', body: { note, fileIds: files.ready } });
      toast('Work submitted for review');
      onDone();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not submit.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Submit work" onClose={onClose} footer={<>
      <button type="button" className="tm-btn" onClick={onClose}>Cancel</button>
      <button type="button" className="tm-btn primary" disabled={busy || files.uploading || !files.ready.length} onClick={submit}>{busy && <Spinner size={14} />} Submit for review</button>
    </>}>
      <div className="tm-form">
        <div
          className="tm-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) files.add(e.dataTransfer.files); }}
        >
          <Upload size={22} />
          <strong>Drop your files here</strong>
          <span className="tm-muted">PDF, TXT, DOCX, PNG or JPG · up to 20 MB each · up to 5 files</span>
          <AttachButton onFiles={files.add} label="Choose files" />
        </div>
        <PendingFiles items={files.items} onRemove={files.remove} />
        <div className="tm-field">
          <label>Note for the reviewer (optional)</label>
          <MentionInput value={note} onChange={setNote} rows={3} label="Note for the reviewer" placeholder="What did you do? Anything they should check?" />
        </div>
      </div>
    </Modal>
  );
}

function BlockedDialog({ onClose, onSave }: { onClose: () => void; onSave: (reason: string) => void }) {
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

function CommentBox({ taskId, candidates, onSent }: { taskId: string; candidates: string[]; onSent: () => void }) {
  const { toast } = useTeam();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const files = useAttachments({ scope: 'task', scopeId: taskId }, { max: 5 });
  const send = async () => {
    if (!body.trim() && !files.ready.length) return;
    setBusy(true);
    try {
      await api(`/tasks/${taskId}/comments`, { method: 'POST', body: { body, fileIds: files.ready } });
      setBody('');
      files.clear();
      onSent();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not comment.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="tm-comment-box">
      <PendingFiles items={files.items} onRemove={files.remove} />
      <div className="tm-composer-row">
        <AttachButton onFiles={files.add} />
        <MentionInput value={body} onChange={setBody} onSubmit={send} label="Write a comment" placeholder="Write a comment… (@ to mention)" candidates={candidates} />
        <button type="button" className="tm-btn primary sm" disabled={busy || files.uploading || (!body.trim() && !files.ready.length)} onClick={send}>Comment</button>
      </div>
    </div>
  );
}

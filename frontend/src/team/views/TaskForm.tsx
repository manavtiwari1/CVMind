import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import type { Message, Priority, Repeat, Task } from '../api';
import { go, useTeam } from '../store';
import { useAttachments } from '../attachments';
import { PRIORITY_LABELS } from '../format';
import { AttachButton, MentionInput, Modal, PeoplePicker, PendingFiles, Spinner } from '../ui';

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// Create a task (optionally from a chat message), or edit one
export default function TaskForm({ onClose, source, task, onSaved }: { onClose: () => void; source?: Message; task?: Task; onSaved?: (t: Task) => void }) {
  const { me, manager, toast, nameOf } = useTeam();
  const [title, setTitle] = useState(task?.title || (source ? source.body.split('\n')[0].slice(0, 120) : ''));
  const [description, setDescription] = useState(task?.description || (source ? `From ${nameOf(source.authorId)}: "${source.body}"` : ''));
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assigneeIds || (manager ? [] : [me.id]));
  const [priority, setPriority] = useState<Priority>(task?.priority || 'normal');
  const [due, setDue] = useState(toLocalInput(task?.dueAt || null));
  const [repeat, setRepeat] = useState<Repeat | ''>(task?.recurrence?.freq || '');
  const [until, setUntil] = useState(task?.recurrence?.until ? task.recurrence.until.slice(0, 10) : '');
  const [checklist, setChecklist] = useState('');
  const [busy, setBusy] = useState(false);
  const files = useAttachments(task ? null : { scope: 'task', scopeId: null }, { max: 5 });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    // The end date covers that whole day
    const recurrence = repeat ? { freq: repeat, until: until ? new Date(`${until}T23:59:59`).toISOString() : null } : null;
    const body = { title, description, assigneeIds, priority, dueAt: due ? new Date(due).toISOString() : null, ...(me.teamOnly ? {} : { recurrence }) };
    try {
      const { data } = task
        ? await api<{ data: Task }>(`/tasks/${task.id}`, { method: 'PATCH', body })
        : await api<{ data: Task }>('/tasks', { method: 'POST', body: { ...body, sourceMessageId: source?.id, fileIds: files.ready, checklist: checklist.split('\n') } });
      toast(task ? 'Task updated' : 'Task created');
      onSaved?.(data);
      onClose();
      if (!task) go('tasks', data.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save the task.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={task ? 'Edit task' : source ? 'Create task from message' : 'New task'} onClose={onClose} wide footer={<>
      <button type="button" className="tm-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="tm-task-form" className="tm-btn primary" disabled={busy || files.uploading || !title.trim() || !assigneeIds.length || (!!repeat && !due)}>{busy && <Spinner size={14} />} {task ? 'Save' : 'Create task'}</button>
    </>}>
      <form id="tm-task-form" className="tm-form" onSubmit={submit}>
        <div className="tm-field">
          <label htmlFor="tf-title">Title</label>
          <input id="tf-title" className="tm-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus placeholder="Write blog on ATS tips" />
        </div>
        <div className="tm-field">
          <label>Assign to</label>
          {manager
            ? <PeoplePicker value={assigneeIds} onChange={setAssigneeIds} label="Assign to" />
            : <p className="tm-muted small">Tasks you create are assigned to you. Managers assign work to others.</p>}
        </div>
        <div className="tm-form-row">
          <div className="tm-field">
            <label htmlFor="tf-prio">Priority</label>
            <select id="tf-prio" className="tm-input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="tm-field">
            <label htmlFor="tf-due">Due (optional)</label>
            <input id="tf-due" type="datetime-local" className="tm-input" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        {!me.teamOnly && (
          <div className="tm-form-row">
            <div className="tm-field">
              <label htmlFor="tf-repeat">Repeats</label>
              <select id="tf-repeat" className="tm-input" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat | '')}>
                <option value="">Doesn't repeat</option>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
              {repeat && !due && <span className="tm-hint tm-amber">Set a due date: the next copy is made when it passes.</span>}
            </div>
            {repeat && (
              <div className="tm-field">
                <label htmlFor="tf-until">Stop repeating after (optional)</label>
                <input id="tf-until" type="date" className="tm-input" value={until} onChange={(e) => setUntil(e.target.value)} />
              </div>
            )}
          </div>
        )}
        <div className="tm-field">
          <label>Details</label>
          <MentionInput value={description} onChange={setDescription} rows={5} label="Task details" placeholder="What needs to be done? Use @name to loop someone in." />
        </div>
        {!task && (
          <div className="tm-field">
            <label htmlFor="tf-check">Checklist (optional)</label>
            <textarea id="tf-check" className="tm-input tm-textarea" rows={3} value={checklist} onChange={(e) => setChecklist(e.target.value)} placeholder={'One item per line\nDraft\nReview with design'} />
          </div>
        )}
        {!task && (
          <div className="tm-field">
            <label className="tm-inline-label">Attachments <AttachButton onFiles={files.add} label="Attach reference files" /></label>
            <PendingFiles items={files.items} onRemove={files.remove} />
            <span className="tm-hint">Up to 5 files · PDF, TXT, DOCX, PNG, JPG · 20 MB each</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

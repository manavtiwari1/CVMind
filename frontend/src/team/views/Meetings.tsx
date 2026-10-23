import { useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarPlus, Circle, Sparkles, Video } from 'lucide-react';
import { api } from '../api';
import type { Meeting } from '../api';
import { go, hrefFor, useLoad, useTeam, useTeamEvent } from '../store';
import { ago } from '../format';
import { Avatar, Empty, Modal, PeoplePicker, Spinner } from '../ui';

type Scope = 'live' | 'upcoming' | 'past';

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function Meetings() {
  const { manager } = useTeam();
  const [scope, setScope] = useState<Scope>('upcoming');
  const [scheduling, setScheduling] = useState(false);
  const live = useLoad<{ data: Meeting[] }>('/meetings', { scope: 'live' });
  const list = useLoad<{ data: Meeting[] }>('/meetings', { scope, limit: 50 });
  const reload = () => { live.reload(); list.reload(); };
  useTeamEvent('meeting.updated', reload, reload);

  return (
    <div className="tm-page">
      <header className="tm-page-head row">
        <div><h1>Meetings</h1><p className="tm-muted">Video calls for up to 6 people, with screen sharing, chat, recording and Leo's notes. Start one from any channel or DM.</p></div>
        {manager && <button type="button" className="tm-btn primary" onClick={() => setScheduling(true)}><CalendarPlus size={16} /> Schedule meeting</button>}
      </header>

      {!!live.data?.data.length && (
        <section className="tm-card tm-list">
          <h2 className="tm-h2 pad"><Circle size={10} fill="currentColor" className="tm-red" /> Live now</h2>
          {live.data.data.map((m) => <MeetingRow key={m.id} m={m} />)}
        </section>
      )}

      <div className="tm-tabs" role="tablist">
        {(['upcoming', 'past'] as Scope[]).map((s) => <button key={s} type="button" role="tab" aria-selected={scope === s} className={scope === s ? 'active' : ''} onClick={() => setScope(s)}>{s === 'upcoming' ? 'Upcoming' : 'Past'}</button>)}
      </div>
      <div className="tm-card tm-list">
        {list.loading && !list.data && <div className="tm-center"><Spinner /></div>}
        {list.data && !list.data.data.length && <Empty icon={<Video size={22} />} title={scope === 'upcoming' ? 'No meetings scheduled' : 'No past meetings'} text={scope === 'upcoming' ? (manager ? 'Schedule one, or start a call from a channel.' : 'Your manager schedules meetings. You can start a call from any channel or DM.') : 'Ended meetings, their notes and recordings show up here.'} />}
        {list.data?.data.map((m) => <MeetingRow key={m.id} m={m} />)}
      </div>
      {scheduling && <ScheduleForm onClose={() => setScheduling(false)} onSaved={(m) => go('meet', m.id)} />}
    </div>
  );
}

export function MeetingRow({ m }: { m: Meeting }) {
  const { person, channels } = useTeam();
  const channel = m.channelId ? channels.find((c) => c.id === m.channelId) : null;
  const people = m.status === 'live' ? m.liveIds : m.status === 'ended' ? m.participantIds : [m.hostId, ...m.inviteeIds];
  return (
    <a href={hrefFor('meet', m.id)} className="tm-task-row">
      <span className={`tm-meet-row-icon ${m.status}`} aria-hidden><Video size={17} /></span>
      <span className="tm-task-main">
        <strong>{m.title || 'Meeting'}</strong>
        <span className="tm-task-meta">
          {m.status === 'live' && <span className="tm-badge prio-urgent">Live · {m.liveIds.length} in</span>}
          {m.status === 'scheduled' && m.scheduledAt && <span className="tm-muted">{when(m.scheduledAt)} · {m.durationMin} min</span>}
          {m.status === 'ended' && m.endedAt && <span className="tm-muted">Ended {ago(m.endedAt)}</span>}
          {channel && channel.kind !== 'dm' && <span className="tm-muted">#{channel.name}</span>}
          {m.notes?.status === 'ready' && <span className="tm-muted"><Sparkles size={12} /> Notes</span>}
          {m.recordingFileIds.length > 0 && <span className="tm-muted"><Circle size={10} /> Recording</span>}
        </span>
      </span>
      <span className="tm-stack">{people.slice(0, 4).map((a) => <Avatar key={a} person={person(a)} size={24} />)}</span>
    </a>
  );
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const nextHalfHour = () => { const d = new Date(Date.now() + 30 * 60000); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); return d; };

// Managers only: the API refuses everyone else
export function ScheduleForm({ meeting, onClose, onSaved }: { meeting?: Meeting; onClose: () => void; onSaved?: (m: Meeting) => void }) {
  const { me, channels, toast } = useTeam();
  const [title, setTitle] = useState(meeting?.title || '');
  const [at, setAt] = useState(toLocalInput(meeting?.scheduledAt ? new Date(meeting.scheduledAt) : nextHalfHour()));
  const [duration, setDuration] = useState(meeting?.durationMin || 30);
  const [inviteeIds, setInviteeIds] = useState<string[]>(meeting?.inviteeIds || []);
  const [channelId, setChannelId] = useState(meeting?.channelId || '');
  const [busy, setBusy] = useState(false);
  const rooms = channels.filter((c) => c.kind !== 'dm' && c.joined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const body = { title, scheduledAt: new Date(at).toISOString(), durationMin: duration, inviteeIds };
    try {
      const { data } = meeting
        ? await api<{ data: Meeting }>(`/meetings/${meeting.id}`, { method: 'PATCH', body })
        : await api<{ data: Meeting }>('/meetings', { method: 'POST', body: { ...body, channelId: channelId || undefined } });
      toast(meeting ? 'Meeting updated. Invitees were told.' : 'Meeting scheduled. Invitees get an email and a reminder 10 minutes before.');
      onSaved?.(data);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not schedule the meeting.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={meeting ? 'Edit meeting' : 'Schedule a meeting'} onClose={onClose} wide footer={<>
      <button type="button" className="tm-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="tm-meet-form" className="tm-btn primary" disabled={busy || !at || (!inviteeIds.length && !channelId)}>{busy && <Spinner size={14} />} {meeting ? 'Save' : 'Schedule'}</button>
    </>}>
      <form id="tm-meet-form" className="tm-form" onSubmit={submit}>
        <div className="tm-field">
          <label htmlFor="mf-title">Title</label>
          <input id="mf-title" className="tm-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus placeholder="Weekly marketing sync" />
        </div>
        <div className="tm-form-row">
          <div className="tm-field"><label htmlFor="mf-at">Date and time</label><input id="mf-at" type="datetime-local" className="tm-input" value={at} onChange={(e) => setAt(e.target.value)} required /></div>
          <div className="tm-field">
            <label htmlFor="mf-dur">Length</label>
            <select id="mf-dur" className="tm-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60} hour${d > 60 ? 's' : ''}`}</option>)}
            </select>
          </div>
        </div>
        <div className="tm-field">
          <label>Invite</label>
          <PeoplePicker value={inviteeIds} onChange={setInviteeIds} exclude={[me.id]} label="Invite people" />
          <span className="tm-hint">Up to 6 people can be in the call at once.</span>
        </div>
        {!meeting && (
          <div className="tm-field">
            <label htmlFor="mf-ch">Post it in a channel (optional)</label>
            <select id="mf-ch" className="tm-input" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
              <option value="">Don't post in a channel</option>
              {rooms.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
            <span className="tm-hint">Everyone in the channel can join, and the notes are posted there afterwards.</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

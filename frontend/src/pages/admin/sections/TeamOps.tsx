import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, CalendarPlus, ChevronLeft, ChevronRight, Download, ExternalLink, Sparkles, Video } from 'lucide-react';
import { api } from '../api';
import { useAction, useApi } from '../hooks';
import { ago, dateTime } from '../format';
import { Badge, Card, DataTable, Empty, Modal, Notice, Segment, Spinner } from '../ui';
import type { Tone } from '../ui';

// CVMind Team day-to-day for managers in the admin panel: attendance, check-ins, leave, meetings, tasks.
// The same data and rules as team.cvmind.in; the API checks the manager permission.

interface Person { id: string; name: string; username: string; roleLabel: string; active: boolean }
function usePeople() {
  const { data } = useApi<{ data: Person[] }>('/team/members');
  const map = new Map((data?.data || []).map((p) => [p.id, p]));
  return { list: (data?.data || []).filter((p) => p.active), name: (id: string | null | undefined) => (id ? map.get(id)?.name || 'Former member' : '—') };
}

const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const dayText = (day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', opts);
const shiftDay = (day: string, n: number) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const shiftMonth = (month: string, n: number) => { const [y, m] = month.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };
// team.cvmind.in in production; /team on localhost and previews
const teamLink = (hash: string) => `${window.location.hostname.endsWith('cvmind.in') ? 'https://team.cvmind.in/' : `${window.location.origin}/team`}${hash}`;

// ── Attendance ───────────────────────────────────────────────────────────────
interface AttendanceData { month: string; days: Array<{ day: string; working: boolean }>; people: Array<{ id: string; cells: string[]; present: number; missing: number }> }
const CELL: Record<string, { label: string; short: string }> = {
  present: { label: 'Present', short: '✓' }, wfh: { label: 'Work from home', short: 'H' }, casual: { label: 'Casual leave', short: 'C' }, sick: { label: 'Sick leave', short: 'S' },
  missing: { label: 'Missing', short: '✕' }, off: { label: 'Sunday', short: '' }, today: { label: 'Not yet today', short: '·' }, future: { label: '', short: '' }, none: { label: 'Not tracked yet', short: '' }
};

export function AttendanceTab() {
  const { name } = usePeople();
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [report, setReport] = useState<string | null>(null);
  const { data, error, loading, reload } = useApi<AttendanceData>('/team/attendance', { month });
  const csv = () => {
    if (!data) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['Name', ...data.days.map((d) => d.day), 'Present', 'Missing'].map(esc).join(',')];
    for (const p of data.people) lines.push([name(p.id), ...p.cells.map((c) => CELL[c]?.label || c), p.present, p.missing].map(esc).join(','));
    const url = URL.createObjectURL(new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `attendance-${data.month}.csv` }).click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card
      bodyClass={false}
      title="Attendance"
      description="A day counts as present when the person posted their check-in. Mon–Sat are working days; approved leave is shown by type."
      actions={<div className="ad-inline">
        <button type="button" className="ad-btn icon sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft size={15} /></button>
        <strong className="ad-month">{new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" className="ad-btn icon sm" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= todayIST().slice(0, 7)} aria-label="Next month"><ChevronRight size={15} /></button>
        <button type="button" className="ad-btn sm" onClick={csv} disabled={!data}><Download size={13} /> CSV</button>
      </div>}
    >
      {loading && !data && <div className="ad-pad"><Spinner /></div>}
      {error && <div className="ad-pad"><Notice tone="red">{error} <button type="button" className="ad-btn sm" onClick={reload}>Retry</button></Notice></div>}
      {data && !data.people.length && <Empty title="Nobody on CVMind Team yet" />}
      {data && data.people.length > 0 && (
        <div className="ad-att-wrap">
          <table className="ad-att">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Present</th><th scope="col">Missing</th><th scope="col" />
                {data.days.map((d) => <th key={d.day} scope="col" className={d.working ? '' : 'off'} title={dayText(d.day)}>{Number(d.day.slice(8))}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.people.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{name(p.id)}</th>
                  <td className="num">{p.present}</td>
                  <td className={`num ${p.missing ? 'red' : ''}`}>{p.missing}</td>
                  <td><button type="button" className="ad-btn ghost sm" onClick={() => setReport(p.id)} title="Progress report by Leo"><Sparkles size={13} /> Report</button></td>
                  {p.cells.map((c, i) => <td key={data.days[i].day}><i className={`ad-att-cell ${c}`} title={`${dayText(data.days[i].day)}: ${CELL[c]?.label || c}`}>{CELL[c]?.short}</i></td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ad-att-legend">{['present', 'wfh', 'casual', 'sick', 'missing'].map((k) => <span key={k}><i className={`ad-att-cell ${k}`}>{CELL[k].short}</i> {CELL[k].label}</span>)}</div>
        </div>
      )}
      {report && <LeoReport adminId={report} name={name(report)} onClose={() => setReport(null)} />}
    </Card>
  );
}

interface Report { from: string; to: string; headline: string; highlights: string[]; concerns: string[]; suggestions: string[]; stats: Record<string, number> }

function LeoReport({ adminId, name, onClose }: { adminId: string; name: string; onClose: () => void }) {
  const [days, setDays] = useState('7');
  // Rounded to the hour so the request (and Leo) doesn't repeat on every render
  const from = `${new Date(Date.now() - Number(days) * 86400000).toISOString().slice(0, 13)}:00:00Z`;
  const { data, error, loading } = useApi<{ data: Report }>('/team/leo/report', { adminId, from });
  const r = data?.data;
  return (
    <Modal title={<><Sparkles size={16} /> Progress report: {name}</>} description="Written by Leo from tasks, reviews and check-ins. Check the numbers before acting on it." onClose={onClose} wide>
      <Segment options={[{ value: '7', label: 'Last 7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }]} value={days} onChange={setDays} />
      {loading && <div className="ad-pad"><Spinner /> Leo is writing the report…</div>}
      {error && <Notice tone="amber">{error}</Notice>}
      {!loading && r && (
        <div className="ad-report">
          <div className="ad-report-stats">
            <span><strong>{r.stats.completed}</strong> tasks done</span>
            <span><strong>{r.stats.completedOnTime}</strong> on time</span>
            <span><strong>{r.stats.overdue}</strong> overdue now</span>
            <span><strong>{r.stats.approved}</strong> approved / <strong>{r.stats.changesRequested}</strong> changes asked</span>
            <span><strong>{r.stats.checkIns}</strong> of {r.stats.workingDays} check-ins</span>
            {r.stats.leaveDays > 0 && <span><strong>{r.stats.leaveDays}</strong> leave days</span>}
          </div>
          <p><strong>{r.headline}</strong></p>
          {r.highlights.length > 0 && <><h4>Went well</h4><ul>{r.highlights.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          {r.concerns.length > 0 && <><h4>Watch</h4><ul>{r.concerns.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          {r.suggestions.length > 0 && <><h4>Suggestions</h4><ul>{r.suggestions.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
        </div>
      )}
    </Modal>
  );
}

// ── Check-ins ────────────────────────────────────────────────────────────────
interface Standup { id: string; adminId: string; day: string; done: string; doing: string; blockers: string; updatedAt: string }
interface Leave { id: string; adminId: string; from: string; to: string; kind: 'casual' | 'sick' | 'wfh'; reason: string; status: 'pending' | 'approved' | 'declined' | 'cancelled'; reviewedBy: string | null; reviewComment: string; createdAt: string }
const LEAVE_LABELS: Record<Leave['kind'], string> = { casual: 'Casual leave', sick: 'Sick leave', wfh: 'Work from home' };
const LEAVE_TONE: Record<Leave['status'], Tone> = { pending: 'purple', approved: 'green', declined: 'red', cancelled: 'gray' };
const rangeText = (l: Leave) => (l.from === l.to ? dayText(l.from) : `${dayText(l.from)} – ${dayText(l.to)}`);

export function CheckInsTab() {
  const { name } = usePeople();
  const [day, setDay] = useState(todayIST());
  const { data, error, loading, reload } = useApi<{ day: string; workingDay: boolean; data: Standup[]; missing: string[]; leave: Leave[] }>('/team/checkins', { day });
  return (
    <>
      <div className="ad-inline">
        <button type="button" className="ad-btn icon sm" onClick={() => setDay(shiftDay(day, -1))} aria-label="Previous day"><ChevronLeft size={15} /></button>
        <input type="date" className="ad-input sm" value={day} max={todayIST()} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Day" />
        <button type="button" className="ad-btn icon sm" onClick={() => setDay(shiftDay(day, 1))} disabled={day >= todayIST()} aria-label="Next day"><ChevronRight size={15} /></button>
        {data && <span className="muted">{data.data.length} checked in · {data.missing.length} not yet{data.leave.length ? ` · ${data.leave.length} on leave` : ''}{data.workingDay ? '' : ' · Sunday'}</span>}
      </div>
      {error && <Notice tone="red">{error} <button type="button" className="ad-btn sm" onClick={reload}>Retry</button></Notice>}
      <div className="ad-grid wide-left">
        <Card title="Check-ins" description={dayText(day, { weekday: 'long', day: 'numeric', month: 'long' })}>
          {loading && !data && <Spinner />}
          {data && !data.data.length && <Empty title="No check-ins" text={data.workingDay ? 'Nobody has checked in for this day yet.' : 'Sunday is a day off.'} />}
          <div className="ad-standups">
            {data?.data.map((s) => (
              <article key={s.id} className="ad-standup">
                <header><strong>{name(s.adminId)}</strong><span className="muted">{new Date(s.updatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span></header>
                {s.done && <p><span>Done</span>{s.done}</p>}
                {s.doing && <p><span>Today</span>{s.doing}</p>}
                {s.blockers && <p className="blocker"><AlertTriangle size={13} /> <span>Blocked</span>{s.blockers}</p>}
              </article>
            ))}
          </div>
        </Card>
        <div className="ad-stack">
          <Card title="Not checked in">
            {data && !data.missing.length && <p className="muted">Everyone has checked in.</p>}
            <ul className="ad-simple-list">{data?.missing.map((id) => <li key={id}>{name(id)}</li>)}</ul>
          </Card>
          <Card title="On leave">
            {data && !data.leave.length && <p className="muted">Nobody is on leave.</p>}
            <ul className="ad-simple-list">{data?.leave.map((l) => <li key={l.id}>{name(l.adminId)} <span className="muted">· {LEAVE_LABELS[l.kind]}</span></li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}

// ── Leave ────────────────────────────────────────────────────────────────────
export function LeaveTab({ onChanged }: { onChanged?: () => void }) {
  const { name } = usePeople();
  const { busy, run } = useAction();
  const [status, setStatus] = useState<'pending' | 'approved' | 'all'>('pending');
  const [comment, setComment] = useState<Record<string, string>>({});
  const { data, error, loading, reload } = useApi<{ data: Leave[] }>('/team/leaves', { scope: 'team', status: status === 'all' ? undefined : status });
  const review = (l: Leave, decision: 'approve' | 'decline' | 'cancel') =>
    run(l.id, () => api(`/team/leaves/${l.id}/review`, { method: 'POST', body: { decision, comment: comment[l.id] || '' } }), decision === 'approve' ? `Leave approved for ${name(l.adminId)}` : decision === 'decline' ? 'Leave declined' : 'Leave withdrawn')
      .then((ok) => { if (ok !== undefined) { reload(); onChanged?.(); } });
  return (
    <Card
      bodyClass={false}
      title="Leave requests"
      description="People are told the decision in CVMind Team and by email. A manager's own leave is approved automatically, and nobody reviews their own."
      actions={<Segment options={[{ value: 'pending', label: 'Waiting' }, { value: 'approved', label: 'Approved' }, { value: 'all', label: 'All' }]} value={status} onChange={setStatus} />}
    >
      <DataTable
        rows={data?.data}
        loading={loading}
        error={error}
        onRetry={reload}
        rowKey={(l) => l.id}
        empty={<Empty title={status === 'pending' ? 'No requests waiting' : 'No leave'} />}
        columns={[
          { key: 'who', header: 'Person', render: (l) => <strong>{name(l.adminId)}</strong> },
          { key: 'when', header: 'Dates', render: (l) => <span>{rangeText(l)}<br /><span className="muted">{LEAVE_LABELS[l.kind]}</span></span> },
          { key: 'reason', header: 'Reason', render: (l) => <span className="muted">{l.reason || '—'}{l.reviewComment ? <><br />Manager: {l.reviewComment}</> : null}</span> },
          { key: 'status', header: 'Status', render: (l) => <span><Badge tone={LEAVE_TONE[l.status]}>{l.status[0].toUpperCase() + l.status.slice(1)}</Badge><br /><span className="muted">asked {ago(l.createdAt)}{l.reviewedBy ? ` · by ${name(l.reviewedBy)}` : ''}</span></span> },
          {
            key: 'act', header: '', render: (l) => l.status === 'pending' ? (
              <div className="ad-inline">
                <input className="ad-input sm" placeholder="Comment (optional)" value={comment[l.id] || ''} onChange={(e) => setComment({ ...comment, [l.id]: e.target.value })} aria-label="Comment" maxLength={500} />
                <button type="button" className="ad-btn sm danger-outline" disabled={busy === l.id} onClick={() => review(l, 'decline')}>Decline</button>
                <button type="button" className="ad-btn sm primary" disabled={busy === l.id} onClick={() => review(l, 'approve')}>{busy === l.id && <Spinner size={13} />} Approve</button>
              </div>
            ) : l.status === 'approved' && l.to >= todayIST() ? <button type="button" className="ad-btn sm ghost" disabled={busy === l.id} onClick={() => review(l, 'cancel')}>Withdraw</button> : null
          }
        ]}
      />
    </Card>
  );
}

// ── Meetings ─────────────────────────────────────────────────────────────────
interface Meeting {
  id: string; title: string; channelId: string | null; hostId: string; scheduledAt: string | null; durationMin: number; inviteeIds: string[];
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'; startedAt: string | null; endedAt: string | null; participantIds: string[]; liveIds: string[];
  recordingFileIds: string[]; notes: { status: string; summary: string; decisions: string[]; actionItems: Array<{ text: string; owner: string }>; openQuestions: string[]; error: string } | null;
}

export function MeetingsTab() {
  const { name, list } = usePeople();
  const { busy, run } = useAction();
  const [scope, setScope] = useState<'live' | 'upcoming' | 'past'>('upcoming');
  const [open, setOpen] = useState<Meeting | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const { data, error, loading, reload } = useApi<{ data: Meeting[] }>('/team/meetings', { scope, limit: 100 });
  const end = (m: Meeting) => run(m.id, () => api(`/team/meetings/${m.id}/end`, { method: 'POST' }), 'Meeting ended for everyone').then((ok) => ok !== undefined && reload());
  const cancel = (m: Meeting) => run(m.id, () => api(`/team/meetings/${m.id}/cancel`, { method: 'POST' }), 'Meeting cancelled; invitees were told').then((ok) => ok !== undefined && reload());
  return (
    <Card
      bodyClass={false}
      title="Meetings"
      description="Calls on CVMind Team: up to 6 people, with screen sharing, chat, recording and Leo's notes. Anyone can start one from a channel; only managers schedule them."
      actions={<div className="ad-inline">
        <Segment options={[{ value: 'live', label: 'Live' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} value={scope} onChange={setScope} />
        <button type="button" className="ad-btn primary sm" onClick={() => setScheduling(true)}><CalendarPlus size={14} /> Schedule</button>
      </div>}
    >
      <DataTable
        rows={data?.data}
        loading={loading}
        error={error}
        onRetry={reload}
        rowKey={(m) => m.id}
        empty={<Empty icon={<Video size={20} />} title={scope === 'live' ? 'No meeting is running' : scope === 'upcoming' ? 'Nothing scheduled' : 'No past meetings'} />}
        columns={[
          { key: 'title', header: 'Meeting', render: (m) => <span><strong>{m.title || 'Meeting'}</strong><br /><span className="muted">Host {name(m.hostId)}</span></span> },
          { key: 'when', header: 'When', render: (m) => <span className="muted">{m.status === 'scheduled' && m.scheduledAt ? `${dateTime(m.scheduledAt)} · ${m.durationMin} min` : m.status === 'live' ? `Started ${ago(m.startedAt)}` : m.endedAt ? `${dateTime(m.startedAt)} · ${Math.max(1, Math.round((+new Date(m.endedAt) - +new Date(m.startedAt || m.endedAt)) / 60000))} min` : '—'}</span> },
          { key: 'people', header: 'People', render: (m) => <span className="muted">{(m.status === 'live' ? m.liveIds : m.status === 'ended' ? m.participantIds : m.inviteeIds).map(name).join(', ') || '—'}</span> },
          { key: 'extras', header: '', render: (m) => <span className="ad-inline">{m.status === 'live' && <Badge tone="red" dot>Live</Badge>}{m.notes?.status === 'ready' && <Badge tone="purple">Notes</Badge>}{m.recordingFileIds.length > 0 && <Badge tone="blue">Recording</Badge>}</span> },
          {
            key: 'act', header: '', render: (m) => (
              <span className="ad-inline">
                {m.status === 'ended' && <button type="button" className="ad-btn sm" onClick={() => setOpen(m)}>Notes & chat</button>}
                {m.status === 'live' && <button type="button" className="ad-btn sm danger-outline" disabled={busy === m.id} onClick={() => end(m)}>End for all</button>}
                {m.status === 'scheduled' && <button type="button" className="ad-btn sm danger-outline" disabled={busy === m.id} onClick={() => cancel(m)}>Cancel</button>}
                <a className="ad-btn sm ghost" href={teamLink(`#/meet/${m.id}`)} target="_blank" rel="noreferrer" title="Open in CVMind Team"><ExternalLink size={13} /></a>
              </span>
            )
          }
        ]}
      />
      {open && <MeetingNotes meeting={open} name={name} onClose={() => setOpen(null)} />}
      {scheduling && <ScheduleMeeting people={list} onClose={() => setScheduling(false)} onDone={() => { setScheduling(false); setScope('upcoming'); reload(); }} />}
    </Card>
  );
}

function MeetingNotes({ meeting, name, onClose }: { meeting: Meeting; name: (id: string) => string; onClose: () => void }) {
  const { data } = useApi<{ data: Array<{ id: string; authorId: string; body: string; createdAt: string }> }>(`/team/meetings/${meeting.id}/chat`);
  const n = meeting.notes;
  return (
    <Modal title={meeting.title || 'Meeting'} description={`${meeting.participantIds.map(name).join(', ')} · ${dateTime(meeting.startedAt)}`} onClose={onClose} wide>
      <div className="ad-report">
        <h4>Leo's notes</h4>
        {!n && <p className="muted">No notes: nothing was transcribed or written in the chat.</p>}
        {n?.status === 'pending' && <p className="muted">Leo is writing the notes…</p>}
        {n?.status === 'failed' && <Notice tone="amber">{n.error}</Notice>}
        {n?.status === 'ready' && (
          <>
            <p>{n.summary}</p>
            {n.decisions.length > 0 && <><h4>Decisions</h4><ul>{n.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul></>}
            {n.actionItems.length > 0 && <><h4>Action items</h4><ul>{n.actionItems.map((a, i) => <li key={i}>{a.text}{a.owner ? ` (@${a.owner})` : ''}</li>)}</ul></>}
            {n.openQuestions.length > 0 && <><h4>Open questions</h4><ul>{n.openQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul></>}
          </>
        )}
        <h4>In-call messages</h4>
        {!data && <Spinner />}
        {data && !data.data.length && <p className="muted">No messages.</p>}
        <ul>{data?.data.map((m) => <li key={m.id}><strong>{name(m.authorId)}:</strong> {m.body}</li>)}</ul>
        {meeting.recordingFileIds.length > 0 && <p className="muted">The recording is in Media on CVMind Team. <a href={teamLink(`#/meet/${meeting.id}`)} target="_blank" rel="noreferrer">Open the meeting</a></p>}
      </div>
    </Modal>
  );
}

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function ScheduleMeeting({ people, onClose, onDone }: { people: Person[]; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState(() => { const d = new Date(Date.now() + 60 * 60000); d.setMinutes(0, 0, 0); return { title: '', at: toLocalInput(d), durationMin: 30, inviteeIds: [] as string[] }; });
  const toggle = (id: string) => setForm((f) => ({ ...f, inviteeIds: f.inviteeIds.includes(id) ? f.inviteeIds.filter((x) => x !== id) : [...f.inviteeIds, id] }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('schedule', () => api('/team/meetings', { method: 'POST', body: { title: form.title, scheduledAt: new Date(form.at).toISOString(), durationMin: form.durationMin, inviteeIds: form.inviteeIds } }), 'Meeting scheduled. Invitees get an email and a reminder 10 minutes before.');
    if (ok !== undefined) onDone();
  };
  return (
    <Modal title="Schedule a meeting" onClose={onClose} wide footer={<>
      <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="ad-meet" className="ad-btn primary" disabled={busy === 'schedule' || !form.inviteeIds.length || !form.at}>{busy === 'schedule' && <Spinner size={13} />} Schedule</button>
    </>}>
      <form id="ad-meet" className="ad-form" onSubmit={submit}>
        <label className="ad-field"><span>Title</span><input className="ad-input" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Weekly marketing sync" autoFocus /></label>
        <div className="ad-form-row">
          <label className="ad-field"><span>Date and time</span><input type="datetime-local" className="ad-input" value={form.at} onChange={(e) => setForm({ ...form, at: e.target.value })} required /></label>
          <label className="ad-field"><span>Length</span>
            <select className="ad-select" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}>
              {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60} hour${d > 60 ? 's' : ''}`}</option>)}
            </select>
          </label>
        </div>
        <div className="ad-field"><span>Invite ({form.inviteeIds.length} chosen; up to 6 can be in the call at once)</span>
          <div className="ad-pick">{people.map((p) => <label key={p.id} className={form.inviteeIds.includes(p.id) ? 'on' : ''}><input type="checkbox" checked={form.inviteeIds.includes(p.id)} onChange={() => toggle(p.id)} /> {p.name} <span className="muted">{p.roleLabel}</span></label>)}</div>
        </div>
      </form>
    </Modal>
  );
}

// ── Tasks ────────────────────────────────────────────────────────────────────
interface Task { id: string; title: string; status: string; priority: string; assigneeIds: string[]; createdBy: string; dueAt: string | null; checklist: Array<{ done: boolean }>; recurrence: { freq: string } | null; blockedReason: string }
const TASK_STATUS: Record<string, { label: string; tone: Tone }> = {
  todo: { label: 'To do', tone: 'gray' }, in_progress: { label: 'In progress', tone: 'blue' }, blocked: { label: 'Blocked', tone: 'red' },
  submitted: { label: 'Awaiting review', tone: 'purple' }, changes_requested: { label: 'Changes requested', tone: 'amber' }, approved: { label: 'Done', tone: 'green' }
};

export function TasksTab() {
  const { name, list } = usePeople();
  const [status, setStatus] = useState('open');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState('');
  const { data, error, loading, reload } = useApi<{ data: Task[]; total: number }>('/team/tasks', { view: 'all', status, due, assignee, sort: 'due', limit: 100 });
  return (
    <Card
      bodyClass={false}
      title="All tasks"
      description="Every task on CVMind Team. Assign, review and comment in the team app; the board and calendar are there too."
      actions={<div className="ad-inline">
        <select className="ad-select sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="open">Open</option><option value="">All statuses</option>
          {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="ad-select sm" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due">
          <option value="">Any due date</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="week">This week</option>
        </select>
        <select className="ad-select sm" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assignee">
          <option value="">Anyone</option>{list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <a className="ad-btn sm" href={teamLink('#/tasks?view=all&layout=board')} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Board</a>
      </div>}
    >
      <DataTable
        rows={data?.data}
        loading={loading}
        error={error}
        onRetry={reload}
        rowKey={(t) => t.id}
        empty={<Empty title="No tasks with these filters" />}
        columns={[
          { key: 'title', header: 'Task', render: (t) => <span><a href={teamLink(`#/tasks/${t.id}`)} target="_blank" rel="noreferrer"><strong>{t.title}</strong></a><br /><span className="muted">by {name(t.createdBy)}{t.recurrence ? ` · repeats ${t.recurrence.freq}` : ''}{t.blockedReason ? ` · blocked: ${t.blockedReason}` : ''}</span></span> },
          { key: 'who', header: 'Assigned to', render: (t) => <span className="muted">{t.assigneeIds.map(name).join(', ')}</span> },
          { key: 'status', header: 'Status', render: (t) => <Badge tone={TASK_STATUS[t.status]?.tone || 'gray'}>{TASK_STATUS[t.status]?.label || t.status}</Badge> },
          { key: 'prio', header: 'Priority', render: (t) => <span className={t.priority === 'urgent' || t.priority === 'high' ? 'red' : 'muted'}>{t.priority[0].toUpperCase() + t.priority.slice(1)}</span> },
          { key: 'check', header: 'Checklist', render: (t) => <span className="muted">{t.checklist.length ? `${t.checklist.filter((c) => c.done).length}/${t.checklist.length}` : '—'}</span> },
          { key: 'due', header: 'Due', render: (t) => <span className={t.dueAt && t.status !== 'approved' && new Date(t.dueAt) < new Date() ? 'red' : 'muted'}>{t.dueAt ? dateTime(t.dueAt) : '—'}</span> }
        ]}
      />
    </Card>
  );
}

import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertTriangle, CalendarOff, ChevronLeft, ChevronRight, ClipboardCheck, Download, Plus } from 'lucide-react';
import { api } from '../api';
import type { Leave, LeaveKind, Standup } from '../api';
import { hrefFor, useLoad, useTeam } from '../store';
import { ago } from '../format';
import { Avatar, Empty, Modal, Spinner } from '../ui';

type Tab = 'today' | 'history' | 'leave' | 'team' | 'requests' | 'attendance';

export const LEAVE_LABELS: Record<LeaveKind, string> = { casual: 'Casual leave', sick: 'Sick leave', wfh: 'Work from home' };
const STATUS_TONE: Record<Leave['status'], string> = { pending: 'status-submitted', approved: 'status-approved', declined: 'status-blocked', cancelled: 'status-todo' };

// "2026-10-24" → "Sat, 24 Oct"
export const dayText = (day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', opts);
const rangeText = (l: Leave) => (l.from === l.to ? dayText(l.from) : `${dayText(l.from)} – ${dayText(l.to)}`);
const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

export default function CheckIn({ params }: { params: Record<string, string> }) {
  const { manager } = useTeam();
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'history', label: 'My history' },
    { id: 'leave', label: 'My leave' },
    ...(manager ? [{ id: 'team' as Tab, label: 'Team check-ins' }, { id: 'requests' as Tab, label: 'Leave requests' }, { id: 'attendance' as Tab, label: 'Attendance' }] : [])
  ];
  const [tab, setTab] = useState<Tab>(() => (tabs.some((t) => t.id === params.tab) ? params.tab as Tab : 'today'));
  useEffect(() => { if (params.tab && tabs.some((t) => t.id === params.tab)) setTab(params.tab as Tab); }, [params.tab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tm-page">
      <header className="tm-page-head">
        <h1>Check-in</h1>
        <p className="tm-muted">{manager ? 'Daily check-ins, attendance and leave for the whole team.' : 'Post a short update every working day (Mon–Sat) and request leave here.'}</p>
      </header>
      <div className="tm-tabs" role="tablist">
        {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'today' && <Today />}
      {tab === 'history' && <History />}
      {tab === 'leave' && <MyLeave />}
      {tab === 'team' && <TeamDay />}
      {tab === 'requests' && <LeaveRequests />}
      {tab === 'attendance' && <Attendance />}
    </div>
  );
}

// ── Today ────────────────────────────────────────────────────────────────────
interface TodayData { today: string; workingDay: boolean; data: Standup | null; leave: Leave | null }

function Today() {
  const { toast } = useTeam();
  const { data, loading, reload } = useLoad<TodayData>('/checkin');
  const [form, setForm] = useState({ done: '', doing: '', blockers: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data?.data) setForm({ done: data.data.done, doing: data.data.doing, blockers: data.data.blockers });
  }, [data?.data]);

  if (loading && !data) return <div className="tm-center"><Spinner /></div>;
  if (!data) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/checkin', { method: 'PUT', body: form });
      toast(data.data ? 'Check-in updated' : 'Checked in for today');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save your check-in.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const field = (key: keyof typeof form, label: string, placeholder: string) => (
    <div className="tm-field">
      <label htmlFor={`ci-${key}`}>{label}</label>
      <textarea id={`ci-${key}`} className="tm-input tm-textarea" rows={3} maxLength={1500} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} />
    </div>
  );

  return (
    <section className="tm-card pad tm-checkin">
      <div className="tm-checkin-head">
        <h2 className="tm-h2"><ClipboardCheck size={16} /> {dayText(data.today, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        {data.data && <span className="tm-badge status-approved">Checked in · updated {ago(data.data.updatedAt)}</span>}
      </div>
      {data.leave && data.leave.kind !== 'wfh' && <p className="tm-notice amber"><CalendarOff size={15} /> You are on {LEAVE_LABELS[data.leave.kind].toLowerCase()} today. No check-in needed.</p>}
      {!data.workingDay && <p className="tm-notice">It's Sunday, so no check-in is needed. You can still post one.</p>}
      <form className="tm-form" onSubmit={submit}>
        {field('done', 'What did you finish?', 'Yesterday or since your last check-in')}
        {field('doing', 'What are you working on today?', 'Your plan for today')}
        {field('blockers', 'Anything blocking you? (optional)', 'Managers are told straight away')}
        <div className="tm-inline">
          <button type="submit" className="tm-btn primary" disabled={busy || (!form.done.trim() && !form.doing.trim())}>{busy && <Spinner size={14} />} {data.data ? 'Update check-in' : 'Post check-in'}</button>
          <span className="tm-hint">You can edit it until midnight.</span>
        </div>
      </form>
    </section>
  );
}

function StandupCard({ s, showName }: { s: Standup; showName?: boolean }) {
  const { person, nameOf } = useTeam();
  return (
    <article className="tm-standup">
      <header>
        {showName ? <span className="tm-person"><Avatar person={person(s.adminId)} size={26} /> <strong>{nameOf(s.adminId)}</strong></span> : <strong>{dayText(s.day, { weekday: 'long', day: 'numeric', month: 'short' })}</strong>}
        <span className="tm-muted small">{new Date(s.updatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
      </header>
      {s.done && <p><span className="tm-standup-label">Done</span>{s.done}</p>}
      {s.doing && <p><span className="tm-standup-label">Today</span>{s.doing}</p>}
      {s.blockers && <p className="tm-standup-blocker"><AlertTriangle size={14} /> <span className="tm-standup-label">Blocked</span>{s.blockers}</p>}
    </article>
  );
}

function History() {
  const { data, loading } = useLoad<{ data: Standup[] }>('/checkins/history', { limit: 60 });
  if (loading && !data) return <div className="tm-center"><Spinner /></div>;
  if (!data?.data.length) return <Empty icon={<ClipboardCheck size={22} />} title="No check-ins yet" text="Your daily check-ins will show up here." />;
  return <div className="tm-standups">{data.data.map((s) => <StandupCard key={s.id} s={s} />)}</div>;
}

// ── Leave ────────────────────────────────────────────────────────────────────
function MyLeave() {
  const { manager, toast } = useTeam();
  const { data, loading, reload } = useLoad<{ data: Leave[] }>('/leaves');
  const [asking, setAsking] = useState(false);
  const cancel = async (l: Leave) => {
    try {
      await api(`/leaves/${l.id}`, { method: 'DELETE' });
      toast('Request cancelled');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not cancel.', 'error');
    }
  };
  return (
    <>
      <div className="tm-inline">
        <button type="button" className="tm-btn primary" onClick={() => setAsking(true)}><Plus size={15} /> Request leave</button>
        {manager && <span className="tm-hint">Your own leave is approved straight away.</span>}
      </div>
      <div className="tm-card tm-list">
        {loading && !data && <div className="tm-center"><Spinner /></div>}
        {data && !data.data.length && <Empty icon={<CalendarOff size={22} />} title="No leave yet" text="Casual, sick and work-from-home requests show up here." />}
        {data?.data.map((l) => (
          <div key={l.id} className="tm-leave-row">
            <div>
              <strong>{rangeText(l)}</strong>
              <span className="tm-muted small">{LEAVE_LABELS[l.kind]}{l.reason ? ` · ${l.reason}` : ''}</span>
              {l.reviewComment && <span className="tm-muted small">Manager: {l.reviewComment}</span>}
            </div>
            <span className={`tm-badge ${STATUS_TONE[l.status]}`}>{l.status[0].toUpperCase() + l.status.slice(1)}</span>
            {l.status === 'pending' && <button type="button" className="tm-btn sm ghost" onClick={() => cancel(l)}>Cancel</button>}
          </div>
        ))}
      </div>
      {asking && <LeaveForm onClose={() => setAsking(false)} onDone={reload} />}
    </>
  );
}

function LeaveForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast } = useTeam();
  const [from, setFrom] = useState(todayIST());
  const [to, setTo] = useState(todayIST());
  const [kind, setKind] = useState<LeaveKind>('casual');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api<{ data: Leave }>('/leaves', { method: 'POST', body: { from, to, kind, reason } });
      toast(data.status === 'approved' ? 'Leave added' : 'Leave requested. Your manager has been told.');
      onDone();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not request leave.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Request leave" onClose={onClose} footer={<>
      <button type="button" className="tm-btn" onClick={onClose}>Cancel</button>
      <button type="button" className="tm-btn primary" disabled={busy || !from || !to} onClick={submit}>{busy && <Spinner size={14} />} Send request</button>
    </>}>
      <div className="tm-form">
        <div className="tm-field">
          <label>Type</label>
          <div className="tm-segment tm-layouts" role="radiogroup" aria-label="Type">
            {(Object.keys(LEAVE_LABELS) as LeaveKind[]).map((k) => <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>{LEAVE_LABELS[k]}</button>)}
          </div>
        </div>
        <div className="tm-form-row">
          <div className="tm-field"><label htmlFor="lv-from">From</label><input id="lv-from" type="date" className="tm-input" value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} /></div>
          <div className="tm-field"><label htmlFor="lv-to">To</label><input id="lv-to" type="date" className="tm-input" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div className="tm-field">
          <label htmlFor="lv-reason">Reason (optional)</label>
          <textarea id="lv-reason" className="tm-input tm-textarea" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Family function, doctor's appointment…" />
        </div>
      </div>
    </Modal>
  );
}

// ── Managers ─────────────────────────────────────────────────────────────────
function TeamDay() {
  const { person, nameOf } = useTeam();
  const [day, setDay] = useState(todayIST());
  const { data, loading } = useLoad<{ day: string; workingDay: boolean; data: Standup[]; missing: string[]; leave: Leave[] }>('/checkins', { day });
  const shift = (n: number) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); setDay(d.toISOString().slice(0, 10)); };
  return (
    <>
      <div className="tm-filters">
        <button type="button" className="tm-icon-btn" onClick={() => shift(-1)} aria-label="Previous day"><ChevronLeft size={17} /></button>
        <input type="date" className="tm-input sm" value={day} max={todayIST()} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Day" />
        <button type="button" className="tm-icon-btn" onClick={() => shift(1)} disabled={day >= todayIST()} aria-label="Next day"><ChevronRight size={17} /></button>
        {data && <span className="tm-muted small">{data.data.length} checked in · {data.missing.length} not yet{data.leave.length ? ` · ${data.leave.length} on leave` : ''}</span>}
      </div>
      {loading && !data && <div className="tm-center"><Spinner /></div>}
      {data && (
        <div className="tm-home-grid">
          <div className="tm-standups">
            {!data.data.length && <Empty icon={<ClipboardCheck size={22} />} title="No check-ins" text={data.workingDay ? 'Nobody has checked in for this day yet.' : 'Sunday is a day off.'} />}
            {data.data.map((s) => <StandupCard key={s.id} s={s} showName />)}
          </div>
          <div className="tm-home-side">
            <section className="tm-card pad">
              <h2 className="tm-h2">Not checked in</h2>
              {!data.missing.length && <p className="tm-muted">Everyone has checked in.</p>}
              {data.missing.map((id) => <a key={id} className="tm-person tm-mini" href={hrefFor('people')}><Avatar person={person(id)} size={24} presence /> {nameOf(id)}</a>)}
            </section>
            {data.leave.length > 0 && (
              <section className="tm-card pad">
                <h2 className="tm-h2">On leave</h2>
                {data.leave.map((l) => <span key={l.id} className="tm-person tm-mini"><Avatar person={person(l.adminId)} size={24} /> {nameOf(l.adminId)} <span className="tm-muted small">{LEAVE_LABELS[l.kind]}</span></span>)}
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function LeaveRequests() {
  const { person, nameOf, toast } = useTeam();
  const { data, loading, reload } = useLoad<{ data: Leave[] }>('/leaves', { scope: 'team' });
  const [comment, setComment] = useState<Record<string, string>>({});
  const review = async (l: Leave, decision: 'approve' | 'decline' | 'cancel') => {
    try {
      await api(`/leaves/${l.id}/review`, { method: 'POST', body: { decision, comment: comment[l.id] || '' } });
      toast(decision === 'approve' ? 'Leave approved' : decision === 'decline' ? 'Leave declined' : 'Leave withdrawn');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save.', 'error');
    }
  };
  if (loading && !data) return <div className="tm-center"><Spinner /></div>;
  const rows = data?.data || [];
  const pending = rows.filter((l) => l.status === 'pending');
  const upcoming = rows.filter((l) => l.status === 'approved' && l.to >= todayIST()).sort((a, b) => a.from.localeCompare(b.from));
  const row = (l: Leave, actions: ReactNode) => (
    <div key={l.id} className="tm-leave-row">
      <Avatar person={person(l.adminId)} size={30} />
      <div>
        <strong>{nameOf(l.adminId)} · {rangeText(l)}</strong>
        <span className="tm-muted small">{LEAVE_LABELS[l.kind]}{l.reason ? ` · ${l.reason}` : ''} · asked {ago(l.createdAt)}</span>
      </div>
      {actions}
    </div>
  );
  return (
    <>
      <section className="tm-card tm-list">
        <h2 className="tm-h2 pad">Waiting for a decision <span className="tm-muted small">{pending.length}</span></h2>
        {!pending.length && <p className="tm-muted pad">No pending requests.</p>}
        {pending.map((l) => row(l, (
          <div className="tm-leave-actions">
            <input className="tm-input sm" placeholder="Comment (optional)" value={comment[l.id] || ''} onChange={(e) => setComment({ ...comment, [l.id]: e.target.value })} aria-label="Comment" maxLength={500} />
            <button type="button" className="tm-btn sm" onClick={() => review(l, 'decline')}>Decline</button>
            <button type="button" className="tm-btn sm primary" onClick={() => review(l, 'approve')}>Approve</button>
          </div>
        )))}
      </section>
      <section className="tm-card tm-list">
        <h2 className="tm-h2 pad">Approved, coming up <span className="tm-muted small">{upcoming.length}</span></h2>
        {!upcoming.length && <p className="tm-muted pad">Nobody has leave coming up.</p>}
        {upcoming.map((l) => row(l, <button type="button" className="tm-btn sm ghost" onClick={() => review(l, 'cancel')}>Withdraw</button>))}
      </section>
    </>
  );
}

interface AttendanceData { month: string; days: Array<{ day: string; working: boolean }>; people: Array<{ id: string; cells: string[]; present: number; missing: number }> }
const CELL: Record<string, { label: string; short: string }> = {
  present: { label: 'Present', short: '✓' }, wfh: { label: 'Work from home', short: 'H' }, casual: { label: 'Casual leave', short: 'C' },
  sick: { label: 'Sick leave', short: 'S' }, missing: { label: 'Missing', short: '✕' }, off: { label: 'Sunday', short: '' }, today: { label: 'Not yet today', short: '·' }, future: { label: '', short: '' }, none: { label: 'Not tracked yet', short: '' }
};

function Attendance() {
  const { nameOf } = useTeam();
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const { data, loading } = useLoad<AttendanceData>('/attendance', { month });
  const shift = (n: number) => { const [y, m] = month.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); setMonth(d.toISOString().slice(0, 7)); };
  const csv = () => {
    if (!data) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['Name', ...data.days.map((d) => d.day), 'Present', 'Missing'].map(esc).join(',')];
    for (const p of data.people) lines.push([nameOf(p.id), ...p.cells.map((c) => CELL[c]?.label || c), p.present, p.missing].map(esc).join(','));
    const url = URL.createObjectURL(new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `attendance-${data.month}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="tm-filters">
        <button type="button" className="tm-icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button>
        <strong>{new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" className="tm-icon-btn" onClick={() => shift(1)} disabled={month >= todayIST().slice(0, 7)} aria-label="Next month"><ChevronRight size={17} /></button>
        <button type="button" className="tm-btn sm" onClick={csv} disabled={!data}><Download size={14} /> Download CSV</button>
        <span className="tm-att-legend">{['present', 'wfh', 'casual', 'sick', 'missing'].map((k) => <span key={k}><i className={`tm-att-cell ${k}`}>{CELL[k].short}</i> {CELL[k].label}</span>)}</span>
      </div>
      {loading && !data && <div className="tm-center"><Spinner /></div>}
      {data && (
        <div className="tm-card tm-att-wrap">
          <table className="tm-att">
            <thead>
              <tr>
                <th scope="col">Person</th>
                {data.days.map((d) => <th key={d.day} scope="col" className={d.working ? '' : 'off'} title={dayText(d.day)}>{Number(d.day.slice(8))}</th>)}
                <th scope="col">Present</th><th scope="col">Missing</th>
              </tr>
            </thead>
            <tbody>
              {data.people.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{nameOf(p.id)}</th>
                  {p.cells.map((c, i) => <td key={data.days[i].day}><i className={`tm-att-cell ${c}`} title={`${dayText(data.days[i].day)}: ${CELL[c]?.label || c}`}>{CELL[c]?.short}</i></td>)}
                  <td className="num">{p.present}</td><td className={`num ${p.missing ? 'tm-red' : ''}`}>{p.missing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

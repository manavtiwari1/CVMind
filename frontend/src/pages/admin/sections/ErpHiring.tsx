import { useState } from 'react';
import type { FormEvent } from 'react';
import { Briefcase, ExternalLink, FileText, Plus, Send, Star, UserPlus, X } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi } from '../hooks';
import { dateTime } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Drawer, Empty, ErrorState, Modal, PageHeader, Segment, Spinner, Tabs } from '../ui';
import type { Tone } from '../ui';
import { EMPLOYMENT, todayIso } from '../erp';

// ERP → Hiring: openings published on cvmind.in/careers, candidates on a stage board, offers and joining.

type Stage = 'applied' | 'screening' | 'task' | 'interview' | 'offer' | 'joined' | 'rejected';
const STAGES: Array<{ value: Stage; label: string; tone: Tone }> = [
  { value: 'applied', label: 'Applied', tone: 'gray' },
  { value: 'screening', label: 'Screening', tone: 'blue' },
  { value: 'task', label: 'Task / test', tone: 'blue' },
  { value: 'interview', label: 'Interview', tone: 'purple' },
  { value: 'offer', label: 'Offer', tone: 'amber' },
  { value: 'joined', label: 'Joined', tone: 'green' },
  { value: 'rejected', label: 'Rejected', tone: 'red' }
];
const stageOf = (s: Stage) => STAGES.find((x) => x.value === s) || STAGES[0];

interface Opening { id: string; slug: string; title: string; employmentType: string; typeLabel: string; department: string; location: string; payType: string; payMin: number; payMax: number; pay: string; duration: string; description: string; questions: string[]; url: string; status: 'open' | 'closed'; ownerId: string | null; counts?: Record<string, number> }
interface Candidate {
  id: string; openingId: string; openingTitle: string; name: string; email: string; phone: string; college: string; links: string[]; answers: Array<{ question: string; answer: string }>;
  hasResume: boolean; stage: Stage; rating: number; notes: Array<{ byName: string; text: string; rating: number; at: string }>; events: Array<{ at: string; text: string; byName: string }>;
  taskLink: string; interviewAt: string | null; interviewLink: string; interviewers: Array<{ id: string; name: string }>; rejectedReason: string; offerStatus: string; adminId: string | null; otherApplications: number; createdAt: string;
}
interface Person { id: string; name: string; active: boolean }
interface Role { label: string; teamOnly: boolean; leadership: boolean }

export default function ErpHiring() {
  const [view, setView] = useState<'candidates' | 'openings'>('candidates');
  const openings = useApi<{ data: Opening[] }>('/erp/hiring/openings');
  return (
    <>
      <PageHeader
        title="Hiring"
        description="Open roles are listed on cvmind.in/careers. Move candidates through the stages, send an offer, and once they accept, add them to CVMind Team with their HR file filled in."
        actions={<a className="ad-btn" href="/careers" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Careers page</a>}
      />
      <Tabs<'candidates' | 'openings'> active={view} onChange={setView} tabs={[{ id: 'candidates', label: 'Candidates' }, { id: 'openings', label: 'Openings', count: openings.data?.data.filter((o) => o.status === 'open').length || undefined }]} />
      {view === 'candidates' ? <CandidatesTab openings={openings.data?.data || []} /> : <OpeningsTab list={openings} />}
    </>
  );
}

function OpeningsTab({ list }: { list: { data?: { data: Opening[] }; error?: string; loading: boolean; reload: () => void } }) {
  const { can } = useAdmin();
  const { busy, run } = useAction();
  const [editing, setEditing] = useState<Opening | 'new' | null>(null);
  return (
    <Card bodyClass={false} actions={can('hr.manage') && <button type="button" className="ad-btn primary sm" onClick={() => setEditing('new')}><Plus size={14} /> New opening</button>} title="Openings">
      <DataTable
        rows={list.data?.data}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        rowKey={(o) => o.id}
        empty={<Empty icon={<Briefcase size={20} />} title="No openings yet" text="Create one and it goes live on cvmind.in/careers." />}
        columns={[
          { key: 'title', header: 'Role', render: (o) => <span><strong>{o.title}</strong><br /><span className="muted">{[o.typeLabel, o.department, o.location, o.pay].filter(Boolean).join(' · ')}</span></span> },
          { key: 'people', header: 'Candidates', render: (o) => { const c = o.counts || {}; const total = Object.values(c).reduce((s, n) => s + n, 0); return total ? `${total} (${c.offer || 0} offer, ${c.joined || 0} joined)` : <span className="muted">None yet</span>; } },
          { key: 'status', header: 'Status', render: (o) => <Badge tone={o.status === 'open' ? 'green' : 'gray'}>{o.status === 'open' ? 'Open' : 'Closed'}</Badge> },
          { key: 'actions', header: '', className: 'actions', render: (o) => (
            <span style={{ display: 'inline-flex', gap: 6 }}>
              <a className="ad-btn sm" href={`/careers/${o.slug}`} target="_blank" rel="noreferrer" aria-label="Open on the careers page"><ExternalLink size={13} /></a>
              {can('hr.manage') && <button type="button" className="ad-btn sm" onClick={() => setEditing(o)}>Edit</button>}
              {can('hr.manage') && <button type="button" className="ad-btn sm" disabled={busy === o.id} onClick={() => run(o.id, () => api(`/erp/hiring/openings/${o.id}`, { method: 'PATCH', body: { status: o.status === 'open' ? 'closed' : 'open' } }), o.status === 'open' ? 'Opening closed' : 'Opening reopened').then((ok) => ok !== undefined && list.reload())}>{o.status === 'open' ? 'Close' : 'Reopen'}</button>}
            </span>
          ) }
        ]}
      />
      {editing && <OpeningForm row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); list.reload(); }} />}
    </Card>
  );
}

function OpeningForm({ row, onClose, onDone }: { row: Opening | null; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const people = useApi<{ data: Person[] }>('/erp/people');
  const [form, setForm] = useState({
    title: row?.title || '', employmentType: row?.employmentType || 'intern', department: row?.department || '', location: row?.location || 'Remote',
    payType: row?.payType || 'stipend', payMin: row ? String(row.payMin || '') : '', payMax: row ? String(row.payMax || '') : '', duration: row?.duration || '',
    description: row?.description || '', questions: (row?.questions || []).join('\n'), ownerId: row?.ownerId || ''
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { ...form, questions: form.questions.split('\n').map((q) => q.trim()).filter(Boolean), payMin: Number(form.payMin) || 0, payMax: Number(form.payMax) || 0 };
    const ok = await run('save', () => api(row ? `/erp/hiring/openings/${row.id}` : '/erp/hiring/openings', { method: row ? 'PATCH' : 'POST', body }), row ? 'Opening saved' : 'Opening is live on the careers page');
    if (ok !== undefined) onDone();
  };
  return (
    <Modal title={row ? 'Edit opening' : 'New opening'} onClose={onClose} wide footer={<>
      <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="erp-open" className="ad-btn primary" disabled={busy === 'save'}>{busy === 'save' && <Spinner size={14} />} {row ? 'Save' : 'Publish'}</button>
    </>}>
      <form id="erp-open" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field"><label htmlFor="op-title">Title</label><input id="op-title" className="ad-input" value={form.title} onChange={set('title')} maxLength={100} required placeholder="Frontend Developer Intern" /></div>
          <div className="ad-field"><label htmlFor="op-type">Type</label><select id="op-type" className="ad-select" value={form.employmentType} onChange={set('employmentType')}>{EMPLOYMENT.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="op-dept">Department</label><input id="op-dept" className="ad-input" value={form.department} onChange={set('department')} maxLength={60} /></div>
          <div className="ad-field"><label htmlFor="op-loc">Location</label><input id="op-loc" className="ad-input" value={form.location} onChange={set('location')} maxLength={80} /></div>
          <div className="ad-field"><label htmlFor="op-dur">Duration</label><input id="op-dur" className="ad-input" value={form.duration} onChange={set('duration')} maxLength={40} placeholder="3 months" /></div>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="op-pt">Pay</label><select id="op-pt" className="ad-select" value={form.payType} onChange={set('payType')}><option value="stipend">Stipend</option><option value="salary">Salary</option><option value="unpaid">Unpaid</option></select></div>
          {form.payType !== 'unpaid' && <>
            <div className="ad-field"><label htmlFor="op-min">From (₹ / month)</label><input id="op-min" type="number" min={0} className="ad-input" value={form.payMin} onChange={set('payMin')} /></div>
            <div className="ad-field"><label htmlFor="op-max">To (₹ / month)</label><input id="op-max" type="number" min={0} className="ad-input" value={form.payMax} onChange={set('payMax')} /></div>
          </>}
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}><label htmlFor="op-desc">Description</label><textarea id="op-desc" className="ad-textarea" rows={7} value={form.description} onChange={set('description')} maxLength={6000} placeholder="What they'll do, what you look for, how the internship works." /></div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="op-q">Questions for applicants (one a line, up to 5)</label><textarea id="op-q" className="ad-textarea" rows={3} value={form.questions} onChange={set('questions')} placeholder="Why do you want to work at CVMind?" /></div>
          <div className="ad-field"><label htmlFor="op-owner">Hiring manager</label><select id="op-owner" className="ad-select" value={form.ownerId} onChange={set('ownerId')}><option value="">No one</option>{(people.data?.data || []).filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><span className="ad-hint">Hears about new applications and becomes the new hire's reporting manager.</span></div>
        </div>
      </form>
    </Modal>
  );
}

function CandidatesTab({ openings }: { openings: Opening[] }) {
  const [openingId, setOpeningId] = useState('');
  const [stage, setStage] = useState<'' | Stage>('');
  const { data, error, loading, reload } = useApi<{ data: Candidate[] }>('/erp/hiring/candidates', { openingId, stage });
  const [open, setOpen] = useState<string | null>(null);
  const rows = data?.data;
  const counts = Object.fromEntries(STAGES.map((s) => [s.value, (rows || []).filter((c) => c.stage === s.value).length]));
  return (
    <Card bodyClass={false}>
      <div className="ad-toolbar">
        <select className="ad-select" style={{ maxWidth: 260 }} value={openingId} onChange={(e) => setOpeningId(e.target.value)} aria-label="Opening">
          <option value="">All openings</option>
          {openings.map((o) => <option key={o.id} value={o.id}>{o.title}{o.status === 'closed' ? ' (closed)' : ''}</option>)}
        </select>
        <Segment<'' | Stage> value={stage} onChange={setStage} options={[{ value: '' as const, label: 'All' }, ...STAGES.map((s) => ({ value: s.value, label: stage ? s.label : `${s.label} ${counts[s.value] || 0}` }))]} />
      </div>
      <DataTable
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        rowKey={(c) => c.id}
        onRowClick={(c) => setOpen(c.id)}
        empty={<Empty icon={<Briefcase size={20} />} title="No candidates" text="Applications from cvmind.in/careers show up here." />}
        columns={[
          { key: 'who', header: 'Candidate', render: (c) => <span><strong>{c.name}</strong><br /><span className="muted">{c.college || c.email}{c.otherApplications ? ` · applied to ${c.otherApplications + 1} roles` : ''}</span></span> },
          { key: 'role', header: 'For', render: (c) => c.openingTitle },
          { key: 'stage', header: 'Stage', render: (c) => <span><Badge tone={stageOf(c.stage).tone}>{stageOf(c.stage).label}</Badge>{c.offerStatus && c.stage === 'offer' && <><br /><span className="muted">Offer {c.offerStatus}</span></>}</span> },
          { key: 'rating', header: 'Rating', render: (c) => c.rating ? <span><Star size={12} style={{ verticalAlign: '-1px' }} /> {c.rating}</span> : <span className="muted">—</span> },
          { key: 'when', header: 'Applied', render: (c) => dateTime(c.createdAt) }
        ]}
      />
      {open && <CandidateDrawer id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </Card>
  );
}

function CandidateDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { can } = useAdmin();
  const { busy, run } = useAction();
  const { data, error, reload } = useApi<{ data: Candidate }>(`/erp/hiring/candidates/${id}`);
  const [action, setAction] = useState<'task' | 'interview' | 'offer' | 'reject' | 'join' | null>(null);
  const [taskLink, setTaskLink] = useState('');
  const [note, setNote] = useState({ text: '', rating: 0 });
  const c = data?.data;
  const manage = can('hr.manage');
  const changed = () => { reload(); onChanged(); };
  const move = (stage: Stage, body: Record<string, unknown> = {}) => run(`s-${stage}`, () => api(`/erp/hiring/candidates/${id}/stage`, { method: 'POST', body: { stage, ...body } }), `Moved to ${stageOf(stage).label}`).then((ok) => ok !== undefined && changed());
  const resume = async () => { const r = await run('cv', () => api<{ url: string }>(`/erp/hiring/candidates/${id}/resume`)); if (r?.url) window.open(r.url, '_blank', 'noopener'); };
  const done = !c || ['joined', 'rejected'].includes(c.stage);

  return (
    <Drawer
      title={c?.name || 'Candidate'}
      subtitle={c ? `${c.openingTitle} · ${c.email} · ${c.phone}` : undefined}
      onClose={onClose}
      footer={manage && c && !done ? (
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {c.stage === 'applied' && <button type="button" className="ad-btn" onClick={() => move('screening')}>Screen</button>}
          {['applied', 'screening'].includes(c.stage) && <button type="button" className="ad-btn" onClick={() => setAction('task')}>Send a task</button>}
          {c.stage !== 'offer' && <button type="button" className="ad-btn" onClick={() => setAction('interview')}>Interview</button>}
          {c.stage !== 'offer' && <button type="button" className="ad-btn primary" onClick={() => setAction('offer')}><Send size={14} /> Offer</button>}
          {c.offerStatus === 'accepted' && <button type="button" className="ad-btn primary" onClick={() => setAction('join')}><UserPlus size={14} /> Add to team</button>}
          <button type="button" className="ad-btn danger-outline" onClick={() => setAction('reject')}><X size={14} /> Reject</button>
        </span>
      ) : undefined}
    >
      {error && !c ? <ErrorState message={error} onRetry={reload} /> : !c ? <div className="ad-empty"><Spinner size={20} /></div> : (
        <>
          <div className="ad-chips" style={{ marginBottom: 14 }}>
            <Badge tone={stageOf(c.stage).tone}>{stageOf(c.stage).label}</Badge>
            {c.offerStatus && <Badge tone={c.offerStatus === 'accepted' ? 'green' : c.offerStatus === 'declined' ? 'red' : 'amber'}>Offer {c.offerStatus}</Badge>}
            {c.rating > 0 && <Badge tone="purple"><Star size={11} /> {c.rating}</Badge>}
            {c.otherApplications > 0 && <Badge tone="blue">Applied to {c.otherApplications + 1} roles</Badge>}
          </div>
          {c.rejectedReason && <p className="ad-small" style={{ color: '#b91c1c', marginBottom: 12 }}>Rejected: {c.rejectedReason}</p>}
          <div className="ad-actions-row" style={{ marginBottom: 14 }}>
            {c.hasResume && <button type="button" className="ad-btn sm" onClick={resume}><FileText size={13} /> Resume</button>}
            {c.links.map((l) => <a key={l} className="ad-btn sm" href={l} target="_blank" rel="noreferrer noopener"><ExternalLink size={13} /> {new URL(l).hostname}</a>)}
          </div>
          <dl className="ad-kv">
            <dt>College</dt><dd>{c.college || '—'}</dd>
            {c.interviewAt && <><dt>Interview</dt><dd>{dateTime(c.interviewAt)}{c.interviewLink && <> · <a className="ad-link" href={c.interviewLink} target="_blank" rel="noreferrer">link</a></>}{c.interviewers.length > 0 && ` · ${c.interviewers.map((i) => i.name).join(', ')}`}</dd></>}
            {c.taskLink && <><dt>Task</dt><dd><a className="ad-link" href={c.taskLink} target="_blank" rel="noreferrer">{c.taskLink}</a></dd></>}
          </dl>
          {c.answers.map((a) => <div key={a.question} style={{ marginBottom: 10 }}><div className="ad-section-title" style={{ marginTop: 6 }}>{a.question}</div><p style={{ whiteSpace: 'pre-wrap' }}>{a.answer}</p></div>)}

          <div className="ad-section-title">Notes</div>
          {c.notes.map((n, i) => <p key={i} className="ad-small" style={{ marginBottom: 6 }}><strong>{n.byName}</strong>{n.rating ? ` · ${'★'.repeat(n.rating)}` : ''}: {n.text}</p>)}
          <form onSubmit={(e) => { e.preventDefault(); run('note', () => api(`/erp/hiring/candidates/${id}/notes`, { method: 'POST', body: note })).then((ok) => { if (ok !== undefined) { setNote({ text: '', rating: 0 }); changed(); } }); }} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <input className="ad-input" style={{ flex: 1, minWidth: 180 }} value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} placeholder="Interview feedback" maxLength={2000} aria-label="Note" />
            <select className="ad-select" style={{ width: 90 }} value={note.rating} onChange={(e) => setNote({ ...note, rating: Number(e.target.value) })} aria-label="Rating"><option value={0}>No ★</option>{[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} ★</option>)}</select>
            <button type="submit" className="ad-btn sm" disabled={busy === 'note'}>Add</button>
          </form>

          <div className="ad-section-title">History</div>
          <ul className="ad-list">{[...c.events].reverse().map((e, i) => <li key={i}><div className="ad-cell-title">{e.text}</div><div className="ad-cell-sub">{dateTime(e.at)} · {e.byName}</div></li>)}</ul>
        </>
      )}
      {action === 'task' && c && (
        <Modal title={`Task for ${c.name}`} description="Paste a link to the task or test. Send it to them yourself; this keeps track of the stage." onClose={() => setAction(null)} footer={<>
          <button type="button" className="ad-btn" onClick={() => setAction(null)}>Cancel</button>
          <button type="button" className="ad-btn primary" onClick={() => move('task', { taskLink }).then(() => setAction(null))}>Save</button>
        </>}>
          <div className="ad-field"><label htmlFor="tk-link">Task or test link (optional)</label><input id="tk-link" className="ad-input" value={taskLink} onChange={(e) => setTaskLink(e.target.value)} maxLength={300} placeholder="https://…" /></div>
        </Modal>
      )}
      {action === 'interview' && c && <InterviewForm candidate={c} onClose={() => setAction(null)} onSave={(body) => move('interview', body).then(() => setAction(null))} />}
      {action === 'offer' && c && <OfferForm candidate={c} onClose={() => setAction(null)} onDone={() => { setAction(null); changed(); }} />}
      {action === 'join' && c && <JoinForm candidate={c} onClose={() => setAction(null)} onDone={() => { setAction(null); changed(); }} />}
      {action === 'reject' && c && (
        <ConfirmDialog
          title={`Reject ${c.name}?`}
          description="They get a polite email saying CVMind won't move ahead. The reason stays internal."
          confirmLabel="Reject"
          danger
          reason={{ label: 'Reason (internal)', placeholder: 'Not enough React experience', required: false }}
          busy={busy === 'reject'}
          onClose={() => setAction(null)}
          onConfirm={async (reason) => { const ok = await run('reject', () => api(`/erp/hiring/candidates/${id}/reject`, { method: 'POST', body: { reason } }), 'Candidate rejected'); setAction(null); if (ok !== undefined) changed(); }}
        />
      )}
    </Drawer>
  );
}

function InterviewForm({ candidate, onClose, onSave }: { candidate: Candidate; onClose: () => void; onSave: (body: Record<string, unknown>) => void }) {
  const people = useApi<{ data: Person[] }>('/erp/people');
  const [at, setAt] = useState('');
  const [link, setLink] = useState(candidate.interviewLink);
  const [ids, setIds] = useState<string[]>(candidate.interviewers.map((i) => i.id));
  return (
    <Modal title={`Interview ${candidate.name}`} description="Interviewers get a CVMind Team notification. Share the time and link with the candidate yourself." onClose={onClose} footer={<>
      <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
      <button type="button" className="ad-btn primary" onClick={() => onSave({ interviewAt: at ? new Date(at).toISOString() : null, interviewLink: link, interviewerIds: ids })}>Save</button>
    </>}>
      <div className="ad-form-row">
        <div className="ad-field"><label htmlFor="iv-at">When</label><input id="iv-at" type="datetime-local" className="ad-input" value={at} onChange={(e) => setAt(e.target.value)} /></div>
        <div className="ad-field"><label htmlFor="iv-link">Meeting link</label><input id="iv-link" className="ad-input" value={link} onChange={(e) => setLink(e.target.value)} maxLength={300} /></div>
      </div>
      <div className="ad-field" style={{ marginTop: 14 }}>
        <span className="ad-label">Interviewers</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {(people.data?.data || []).filter((p) => p.active).map((p) => <label key={p.id} className="ad-check"><input type="checkbox" checked={ids.includes(p.id)} onChange={(e) => setIds(e.target.checked ? [...ids, p.id].slice(0, 5) : ids.filter((x) => x !== p.id))} /> {p.name}</label>)}
        </div>
      </div>
    </Modal>
  );
}

function OfferForm({ candidate, onClose, onDone }: { candidate: Candidate; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const roles = useApi<{ roles: Record<string, Role> }>('/team/invitations');
  const [terms, setTerms] = useState({ designation: candidate.openingTitle, joiningDate: todayIso(), endDate: '', payType: 'stipend', amount: '', role: 'content_intern', details: '' });
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
  const [sentUrl, setSentUrl] = useState('');
  const set = (k: keyof typeof terms) => (e: { target: { value: string } }) => setTerms((t) => ({ ...t, [k]: e.target.value }));
  const body = { ...terms, amount: Number(terms.amount) || 0 };
  const preview = async (e: FormEvent) => {
    e.preventDefault();
    const r = await run('preview', () => api<{ data: { title: string; body: string } }>(`/erp/hiring/candidates/${candidate.id}/offer/preview`, { method: 'POST', body }));
    if (r) setDraft(r.data);
  };
  const send = async () => {
    const r = await run('send', () => api<{ offerUrl: string }>(`/erp/hiring/candidates/${candidate.id}/offer`, { method: 'POST', body: { ...body, ...draft } }), 'Offer sent');
    if (r) setSentUrl(r.offerUrl);
  };
  const teamRoles = Object.entries(roles.data?.roles || {}).filter(([, r]) => r.teamOnly || !r.leadership);

  if (sentUrl) {
    return (
      <Modal title="Offer sent" onClose={onDone} footer={<button type="button" className="ad-btn primary" onClick={onDone}>Done</button>}>
        <p>{candidate.name} got the offer letter by email with this link to accept or decline. Share it yourself if the email doesn't arrive:</p>
        <p className="ad-mono" style={{ wordBreak: 'break-all', marginTop: 10 }}>{sentUrl}</p>
      </Modal>
    );
  }
  return (
    <Modal title={draft ? 'Check and send the offer' : `Offer for ${candidate.name}`} onClose={onClose} wide footer={draft ? <>
      <button type="button" className="ad-btn" onClick={() => setDraft(null)}>Back</button>
      <button type="button" className="ad-btn primary" disabled={busy === 'send'} onClick={send}>{busy === 'send' && <Spinner size={14} />} <Send size={14} /> Send offer</button>
    </> : <>
      <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="erp-offer" className="ad-btn primary" disabled={busy === 'preview'}>{busy === 'preview' && <Spinner size={14} />} Preview letter</button>
    </>}>
      {!draft ? (
        <form id="erp-offer" onSubmit={preview}>
          <div className="ad-form-row">
            <div className="ad-field"><label htmlFor="of-des">Designation</label><input id="of-des" className="ad-input" value={terms.designation} onChange={set('designation')} maxLength={80} /></div>
            <div className="ad-field"><label htmlFor="of-role">Role on CVMind Team</label><select id="of-role" className="ad-select" value={terms.role} onChange={set('role')}>{teamRoles.map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></div>
          </div>
          <div className="ad-form-row" style={{ marginTop: 14 }}>
            <div className="ad-field"><label htmlFor="of-join">Joining date</label><input id="of-join" type="date" className="ad-input" value={terms.joiningDate} onChange={set('joiningDate')} required /></div>
            <div className="ad-field"><label htmlFor="of-end">Ends (internships)</label><input id="of-end" type="date" className="ad-input" value={terms.endDate} onChange={set('endDate')} /></div>
          </div>
          <div className="ad-form-row" style={{ marginTop: 14 }}>
            <div className="ad-field"><label htmlFor="of-pt">Pay</label><select id="of-pt" className="ad-select" value={terms.payType} onChange={set('payType')}><option value="stipend">Stipend</option><option value="salary">Salary</option><option value="unpaid">Unpaid</option></select></div>
            {terms.payType !== 'unpaid' && <div className="ad-field"><label htmlFor="of-amt">₹ a month</label><input id="of-amt" type="number" min={1} className="ad-input" value={terms.amount} onChange={set('amount')} required /></div>}
          </div>
          <div className="ad-field" style={{ marginTop: 14 }}><label htmlFor="of-det">Extra lines (optional)</label><textarea id="of-det" className="ad-textarea" value={terms.details} onChange={set('details')} maxLength={3000} placeholder="Working hours, first-week plan" /></div>
        </form>
      ) : (
        <>
          <div className="ad-field"><label htmlFor="of-title">Title</label><input id="of-title" className="ad-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120} /></div>
          <div className="ad-field" style={{ marginTop: 14 }}><label htmlFor="of-body">Text</label><textarea id="of-body" className="ad-textarea" rows={14} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} maxLength={12000} /></div>
        </>
      )}
    </Modal>
  );
}

function JoinForm({ candidate, onClose, onDone }: { candidate: Candidate; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [username, setUsername] = useState(candidate.name.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, ''));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('join', () => api(`/erp/hiring/candidates/${candidate.id}/add-to-team`, { method: 'POST', body: { username } }), `${candidate.name} is on CVMind Team`);
    if (ok !== undefined) onDone();
  };
  return (
    <Modal title={`Add ${candidate.name} to CVMind Team`} description={`An account is made with the role from the offer, sign-in details go to ${candidate.email}, and their HR file and pay are filled from the offer.`} onClose={onClose} footer={<>
      <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="erp-join" className="ad-btn primary" disabled={busy === 'join'}>{busy === 'join' && <Spinner size={14} />} <UserPlus size={14} /> Add to team</button>
    </>}>
      <form id="erp-join" onSubmit={submit}>
        <div className="ad-field"><label htmlFor="jn-user">Username</label><input id="jn-user" className="ad-input" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} maxLength={30} required /></div>
      </form>
    </Modal>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ExternalLink, GraduationCap, KeyRound, PauseCircle, PlayCircle, Plus } from 'lucide-react';
import { api } from '../api';
import type { Paged } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { count, date } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Drawer, Empty, ErrorState, Modal, Notice, PageHeader, Pagination, SearchInput, Spinner, StatusBadge, Tabs } from '../ui';
import { RESUME_TEMPLATES } from '../../../data/resumeTemplates';
import { sanitizeResumeHtml } from '../../../lib/sanitizeHtml';
import { placementsUrl } from '../../../lib/hosts';

interface College {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  access: 'active' | 'readonly' | 'closed';
  contract: { seats: number; startsAt: string | null; endsAt: string | null };
  settings: { minAtsScore: number; minLinkedinScore: number; requireCollegeFormat: boolean };
  joined: number;
  invited: number;
  createdAt: string;
}

interface Staff { id: string; email: string; name: string; role: 'admin' | 'staff'; active: boolean; mustChangePassword: boolean; lastLoginAt: string | null }
interface Template { id: string; name: string; description: string; html: string; active: boolean }
interface Detail { college: College & { logo: string; seatsUsed: number }; staff: Staff[]; templates: Template[] }
interface EmailResult { emailSent: boolean; emailError: string }

const ACCESS_LABEL = { active: 'Active', readonly: 'Ended · read-only', closed: 'Closed' };
const ACCESS_TONE = { active: 'green', readonly: 'amber', closed: 'gray' } as const;
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

// Colleges on the placements portal (placements.cvmind.in). Each college only ever sees its own
// students; CVMind sets them up here and adds their resume formats.
export default function Colleges() {
  const { params, go, can } = useAdmin();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<Paged<College>>('/colleges', { q: search, page, limit: 25 });

  return (
    <>
      <PageHeader
        title="Colleges"
        description={<>Colleges on the placements portal. Each college admin gets a login for <a href={placementsUrl()} target="_blank" rel="noreferrer">placements.cvmind.in</a> and sees only their own students.</>}
        actions={can('colleges.manage') && <button type="button" className="ad-btn primary" onClick={() => setAdding(true)}><Plus size={15} /> Add college</button>}
      />
      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search colleges" />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(c) => c.id}
          onRowClick={(c) => go('colleges', { id: c.id })}
          empty={<Empty icon={<GraduationCap size={20} />} title="No colleges yet" text="Add a college to send its placement team their login." />}
          columns={[
            { key: 'name', header: 'College', render: (c) => <div className="ad-cell-title">{c.name}</div> },
            { key: 'status', header: 'Status', render: (c) => (c.status === 'suspended' ? <StatusBadge status="suspended" /> : <Badge tone={ACCESS_TONE[c.access]}>{ACCESS_LABEL[c.access]}</Badge>) },
            { key: 'students', header: 'Joined', className: 'num', render: (c) => <>{count(c.joined)}<span className="muted"> / {count(c.contract.seats)}</span></> },
            { key: 'invited', header: 'Invited', className: 'num', render: (c) => count(c.invited) },
            { key: 'ends', header: 'Plan ends', render: (c) => <span className="muted">{date(c.contract.endsAt)}</span> },
            { key: 'added', header: 'Added', render: (c) => <span className="muted">{date(c.createdAt)}</span> }
          ]}
        />
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </Card>
      {adding && <AddCollege onClose={() => setAdding(false)} onDone={(id) => { setAdding(false); reload(); go('colleges', { id }); }} />}
      {params.id && <CollegeDrawer id={params.id} onClose={() => go('colleges')} onChanged={reload} />}
    </>
  );
}

function AddCollege({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const { busy, run } = useAction();
  const year = new Date();
  year.setFullYear(year.getFullYear() + 1);
  const [form, setForm] = useState({ name: '', adminName: '', adminEmail: '', seats: '500', startsAt: new Date().toISOString().slice(0, 10), endsAt: year.toISOString().slice(0, 10), logo: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [warning, setWarning] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await run('save', () => api<{ college: College } & EmailResult>('/colleges', { method: 'POST', body: { ...form, seats: Number(form.seats) } }), 'College added');
    if (!r) return;
    if (!r.emailSent) { setWarning(`The college was added, but the login email failed: ${r.emailError}. Use "Send new password" once email works.`); return; }
    onDone(r.college.id);
  };

  return (
    <Modal
      title="Add a college"
      description="The college admin (usually the TPO) gets an email with their login and a temporary password."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose}>{warning ? 'Close' : 'Cancel'}</button>
          {!warning && <button type="submit" form="ad-college-form" className="ad-btn primary" disabled={busy === 'save' || !form.name || !form.adminEmail}>{busy === 'save' && <Spinner size={14} />} Add and send login</button>}
        </>
      }
    >
      {warning ? <Notice tone="amber">{warning}</Notice> : (
        <form id="ad-college-form" onSubmit={submit}>
          <div className="ad-field">
            <label htmlFor="co-name">College or university name</label>
            <input id="co-name" className="ad-input" value={form.name} onChange={set('name')} autoFocus required />
          </div>
          <div className="ad-form-row">
            <div className="ad-field">
              <label htmlFor="co-aname">College admin name</label>
              <input id="co-aname" className="ad-input" value={form.adminName} onChange={set('adminName')} placeholder="Training & Placement Officer" />
            </div>
            <div className="ad-field">
              <label htmlFor="co-aemail">College admin email</label>
              <input id="co-aemail" className="ad-input" type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="tpo@college.edu.in" required />
            </div>
          </div>
          <div className="ad-form-row">
            <div className="ad-field">
              <label htmlFor="co-seats">Student seats</label>
              <input id="co-seats" className="ad-input" type="number" min={0} value={form.seats} onChange={set('seats')} />
            </div>
            <div className="ad-field">
              <label htmlFor="co-start">Plan starts</label>
              <input id="co-start" className="ad-input" type="date" value={form.startsAt} onChange={set('startsAt')} />
            </div>
            <div className="ad-field">
              <label htmlFor="co-end">Plan ends</label>
              <input id="co-end" className="ad-input" type="date" value={form.endsAt} onChange={set('endsAt')} />
            </div>
          </div>
          <div className="ad-field" style={{ marginTop: 14 }}>
            <label htmlFor="co-logo">Logo URL (optional)</label>
            <input id="co-logo" className="ad-input" value={form.logo} onChange={set('logo')} placeholder="https://…" />
          </div>
        </form>
      )}
    </Modal>
  );
}

type DrawerTab = 'plan' | 'logins' | 'formats' | 'students' | 'activity';

function CollegeDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { data, error, reload } = useApi<Detail>(`/colleges/${encodeURIComponent(id)}`);
  const [tab, setTab] = useState<DrawerTab>('plan');
  const c = data?.college;
  const done = () => { reload(); onChanged(); };

  return (
    <Drawer title={c?.name || 'College'} subtitle={c ? `${count(c.joined)} joined · ${count(c.seatsUsed)} of ${count(c.contract.seats)} seats used` : undefined} onClose={onClose}>
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : !data || !c ? <div className="ad-empty"><Spinner size={20} /></div> : (
        <>
          <Tabs<DrawerTab> active={tab} onChange={setTab} tabs={[
            { id: 'plan', label: 'Plan' },
            { id: 'logins', label: 'Logins', count: data.staff.filter((s) => s.active).length },
            { id: 'formats', label: 'Resume formats', count: data.templates.length },
            { id: 'students', label: 'Students' },
            { id: 'activity', label: 'Activity' }
          ]} />
          <div style={{ marginTop: 16 }}>
            {tab === 'plan' && <PlanTab college={c} onChanged={done} />}
            {tab === 'logins' && <LoginsTab collegeId={c.id} staff={data.staff} onChanged={done} />}
            {tab === 'formats' && <FormatsTab collegeId={c.id} templates={data.templates} onChanged={reload} />}
            {tab === 'students' && <StudentsTab collegeId={c.id} onChanged={done} />}
            {tab === 'activity' && <ActivityTab collegeId={c.id} />}
          </div>
        </>
      )}
    </Drawer>
  );
}

function PlanTab({ college: c, onChanged }: { college: Detail['college']; onChanged: () => void }) {
  const { can } = useAdmin();
  const { busy, run } = useAction();
  const manage = can('colleges.manage');
  const [form, setForm] = useState({ name: c.name, seats: String(c.contract.seats), startsAt: day(c.contract.startsAt), endsAt: day(c.contract.endsAt) });
  const [suspending, setSuspending] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = (e: FormEvent) => {
    e.preventDefault();
    run('save', () => api(`/colleges/${c.id}`, { method: 'PATCH', body: { ...form, seats: Number(form.seats) } }), 'Plan saved').then((ok) => ok !== undefined && onChanged());
  };
  const setStatus = (status: 'active' | 'suspended') => run('status', () => api(`/colleges/${c.id}`, { method: 'PATCH', body: { status } }), status === 'active' ? 'College reactivated' : 'College suspended').then((ok) => ok !== undefined && onChanged());

  return (
    <>
      <div className="ad-chips" style={{ marginBottom: 14 }}>
        {c.status === 'suspended' ? <StatusBadge status="suspended" /> : <Badge tone={ACCESS_TONE[c.access]}>{ACCESS_LABEL[c.access]}</Badge>}
        <Badge tone="gray">Min ATS {c.settings.minAtsScore}</Badge>
        {c.settings.requireCollegeFormat && <Badge tone="blue">College format required</Badge>}
      </div>
      {c.access === 'readonly' && <Notice tone="amber">The plan has ended. The college can read its data for 30 days after the end date, and students no longer get Pro. Extend the end date to renew.</Notice>}
      <form onSubmit={save}>
        <div className="ad-field">
          <label htmlFor="pl-name">Name</label>
          <input id="pl-name" className="ad-input" value={form.name} onChange={set('name')} disabled={!manage} />
        </div>
        <div className="ad-form-row">
          <div className="ad-field"><label htmlFor="pl-seats">Seats</label><input id="pl-seats" className="ad-input" type="number" min={0} value={form.seats} onChange={set('seats')} disabled={!manage} /></div>
          <div className="ad-field"><label htmlFor="pl-start">Starts</label><input id="pl-start" className="ad-input" type="date" value={form.startsAt} onChange={set('startsAt')} disabled={!manage} /></div>
          <div className="ad-field"><label htmlFor="pl-end">Ends</label><input id="pl-end" className="ad-input" type="date" value={form.endsAt} onChange={set('endsAt')} disabled={!manage} /></div>
        </div>
        {manage && (
          <div className="ad-actions-row" style={{ marginTop: 14 }}>
            <button type="submit" className="ad-btn primary sm" disabled={busy === 'save'}>{busy === 'save' && <Spinner size={13} />} Save plan</button>
            {c.status === 'suspended'
              ? <button type="button" className="ad-btn sm" disabled={busy === 'status'} onClick={() => setStatus('active')}><PlayCircle size={14} /> Reactivate</button>
              : <button type="button" className="ad-btn sm danger-outline" onClick={() => setSuspending(true)}><PauseCircle size={14} /> Suspend</button>}
            <a className="ad-btn sm" href={placementsUrl()} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Portal</a>
          </div>
        )}
      </form>
      {suspending && (
        <ConfirmDialog
          title={`Suspend ${c.name}?`}
          description="Every login of this college is signed out and can't sign in, and its students lose Pro. Their data stays. Reactivate any time."
          confirmLabel="Suspend"
          danger
          busy={busy === 'status'}
          onClose={() => setSuspending(false)}
          onConfirm={async () => { await setStatus('suspended'); setSuspending(false); }}
        />
      )}
    </>
  );
}

function LoginsTab({ collegeId, staff, onChanged }: { collegeId: string; staff: Staff[]; onChanged: () => void }) {
  const { can } = useAdmin();
  const { busy, run } = useAction();
  const [replacing, setReplacing] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const admin = staff.find((s) => s.role === 'admin' && s.active);

  const send = (body: Record<string, string>, label: string) => run(label, () => api<EmailResult>(`/colleges/${collegeId}/admin`, { method: 'POST', body }))
    .then((r) => {
      if (!r) return;
      onChanged();
      setReplacing(false);
      setEmail('');
    });

  return (
    <>
      <div className="ad-section-title">College admin</div>
      {admin ? (
        <dl className="ad-kv">
          <dt>Name</dt><dd>{admin.name}</dd>
          <dt>Email</dt><dd>{admin.email}</dd>
          <dt>Last sign-in</dt><dd>{admin.lastLoginAt ? date(admin.lastLoginAt) : 'Never'}</dd>
        </dl>
      ) : <Notice tone="amber">This college has no active admin login.</Notice>}
      {can('colleges.manage') && (
        <div className="ad-actions-row" style={{ margin: '10px 0 18px' }}>
          {admin && <button type="button" className="ad-btn sm" disabled={!!busy} onClick={() => send({}, 'resend')}>{busy === 'resend' ? <Spinner size={13} /> : <KeyRound size={13} />} Send new password</button>}
          <button type="button" className="ad-btn sm" onClick={() => setReplacing((v) => !v)}>Change college admin</button>
        </div>
      )}
      {replacing && (
        <form className="ad-form-row" style={{ alignItems: 'flex-end', marginBottom: 18 }} onSubmit={(e) => { e.preventDefault(); send({ email, name }, 'replace'); }}>
          <div className="ad-field"><label htmlFor="ad-new-email">New admin email</label><input id="ad-new-email" className="ad-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="ad-field"><label htmlFor="ad-new-name">Name</label><input id="ad-new-name" className="ad-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <button type="submit" className="ad-btn primary sm" disabled={busy === 'replace' || !email}>{busy === 'replace' && <Spinner size={13} />} Replace and send login</button>
        </form>
      )}
      <div className="ad-section-title">All logins</div>
      <ul className="ad-list">
        {staff.map((s) => (
          <li key={s.id}>
            <div>
              <div className="ad-cell-title">{s.name} {s.role === 'admin' && <Badge tone="blue">Admin</Badge>}</div>
              <div className="ad-cell-sub">{s.email} · {s.lastLoginAt ? `last sign-in ${date(s.lastLoginAt)}` : 'never signed in'}</div>
            </div>
            {!s.active ? <Badge tone="gray">Removed</Badge> : s.mustChangePassword ? <Badge tone="amber">Temporary password</Badge> : <Badge tone="green">Active</Badge>}
          </li>
        ))}
      </ul>
      <p className="ad-muted ad-small" style={{ marginTop: 10 }}>The college admin adds and removes staff from the portal.</p>
    </>
  );
}

function FormatsTab({ collegeId, templates, onChanged }: { collegeId: string; templates: Template[]; onChanged: () => void }) {
  const { can } = useAdmin();
  const { busy, run } = useAction();
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const manage = can('colleges.manage');

  return (
    <>
      <p className="ad-muted ad-small" style={{ marginBottom: 12 }}>Formats show first in the resume builder for this college's students only. Start from a CVMind template so the builder can fill it in.</p>
      {manage && <button type="button" className="ad-btn sm primary" onClick={() => setEditing('new')} style={{ marginBottom: 12 }}><Plus size={14} /> Add format</button>}
      {templates.length === 0 ? <p className="ad-muted ad-small">No formats yet.</p> : (
        <ul className="ad-list">
          {templates.map((t) => (
            <li key={t.id}>
              <div>
                <div className="ad-cell-title">{t.name} {!t.active && <Badge tone="gray">Hidden</Badge>}</div>
                {t.description && <div className="ad-cell-sub">{t.description}</div>}
              </div>
              {manage && (
                <div className="ad-actions-row">
                  <button type="button" className="ad-btn sm" onClick={() => setEditing(t)}>Edit</button>
                  <button type="button" className="ad-btn sm" disabled={busy === t.id} onClick={() => run(t.id, () => api(`/colleges/${collegeId}/templates/${t.id}`, { method: 'PATCH', body: { active: !t.active } }), t.active ? 'Format hidden' : 'Format shown').then((ok) => ok !== undefined && onChanged())}>{t.active ? 'Hide' : 'Show'}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && <FormatEditor collegeId={collegeId} template={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
    </>
  );
}

function FormatEditor({ collegeId, template, onClose, onSaved }: { collegeId: string; template: Template | null; onClose: () => void; onSaved: () => void }) {
  const { busy, run } = useAction();
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [html, setHtml] = useState(template?.html || '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = { name, description, html };
    run('save', () => (template
      ? api(`/colleges/${collegeId}/templates/${template.id}`, { method: 'PATCH', body })
      : api(`/colleges/${collegeId}/templates`, { method: 'POST', body })), 'Format saved').then((ok) => ok !== undefined && onSaved());
  };

  return (
    <Modal
      wide
      title={template ? `Edit ${template.name}` : 'Add a resume format'}
      onClose={onClose}
      footer={<>
        <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="ad-format-form" className="ad-btn primary" disabled={busy === 'save' || !name || html.trim().length < 50}>{busy === 'save' && <Spinner size={14} />} Save format</button>
      </>}
    >
      <form id="ad-format-form" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field"><label htmlFor="fm-name">Name</label><input id="fm-name" className="ad-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ABC College official format" required /></div>
          <div className="ad-field">
            <label htmlFor="fm-start">Start from</label>
            <select id="fm-start" className="ad-select" value="" onChange={(e) => { const t = RESUME_TEMPLATES.find((x) => x.id === e.target.value); if (t) setHtml(t.html); }}>
              <option value="">Choose a CVMind template…</option>
              {RESUME_TEMPLATES.filter((t) => !t.id.startsWith('college:')).map((t) => <option key={t.id} value={t.id}>{t.name} · {t.tag}</option>)}
            </select>
          </div>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="fm-desc">Description (shown to students)</label>
          <input id="fm-desc" className="ad-input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
        </div>
        <div className="ad-form-row" style={{ marginTop: 14, alignItems: 'stretch' }}>
          <div className="ad-field">
            <label htmlFor="fm-html">HTML</label>
            <textarea id="fm-html" className="ad-textarea ad-mono" value={html} onChange={(e) => setHtml(e.target.value)} style={{ minHeight: 380, fontSize: 12 }} spellCheck={false} />
            <span className="ad-hint">Up to 200 KB. Scripts and event handlers are removed when shown.</span>
          </div>
          <div className="ad-field">
            <label>Preview</label>
            <iframe title="Format preview" sandbox="" style={{ width: '100%', minHeight: 380, border: '1px solid #e6e9ee', borderRadius: 8, background: '#fff' }} srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font-family:Arial,sans-serif;font-size:12px}</style></head><body>${sanitizeResumeHtml(html)}</body></html>`} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

interface StudentRow { id: string; email: string; name: string; rollNo: string; branch: string; batch: string; status: string; joinedAt: string | null; invitedAt: string | null }

function StudentsTab({ collegeId, onChanged }: { collegeId: string; onChanged: () => void }) {
  const { can } = useAdmin();
  const { busy, run } = useAction();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [unlinking, setUnlinking] = useState<StudentRow | null>(null);
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<Paged<StudentRow>>(`/colleges/${collegeId}/students`, { q: search, page, limit: 50 });

  return (
    <>
      <div className="ad-toolbar" style={{ padding: 0, marginBottom: 10 }}>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name, email or roll no" />
      </div>
      <DataTable
        rows={data?.data}
        loading={loading}
        error={error}
        onRetry={reload}
        rowKey={(s) => s.id}
        empty={<Empty title="No students yet" text="The college uploads its student list from the portal." />}
        columns={[
          { key: 'name', header: 'Student', render: (s) => <div><div className="ad-cell-title">{s.name || '—'}</div><div className="ad-cell-sub">{s.email}</div></div> },
          { key: 'roll', header: 'Roll no', render: (s) => s.rollNo || '—' },
          { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
          { key: 'act', header: '', render: (s) => (can('colleges.manage') && (s.status === 'joined' || s.status === 'invited') ? <button type="button" className="ad-btn sm" onClick={() => setUnlinking(s)}>Unlink</button> : null) }
        ]}
      />
      {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      {unlinking && (
        <ConfirmDialog
          title={`Unlink ${unlinking.email}?`}
          description="The college stops seeing this student, and another college can then invite them. Use this when a student moves to another college."
          confirmLabel="Unlink"
          danger
          busy={busy === 'unlink'}
          onClose={() => setUnlinking(null)}
          onConfirm={async () => {
            const ok = await run('unlink', () => api(`/colleges/${collegeId}/students/${unlinking.id}/unlink`, { method: 'POST' }), 'Student unlinked');
            setUnlinking(null);
            if (ok !== undefined) { reload(); onChanged(); }
          }}
        />
      )}
    </>
  );
}

interface AuditRow { id: string; actorName: string; actorType: string; action: string; targetLabel: string; ip: string; createdAt: string }

function ActivityTab({ collegeId }: { collegeId: string }) {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi<Paged<AuditRow>>(`/colleges/${collegeId}/audit`, { page, limit: 50 });
  return (
    <>
      <DataTable
        rows={data?.data}
        loading={loading}
        error={error}
        onRetry={reload}
        rowKey={(r) => r.id}
        empty={<Empty title="No activity yet" />}
        columns={[
          { key: 'when', header: 'When', render: (r) => <span className="muted">{date(r.createdAt)}</span> },
          { key: 'who', header: 'Who', render: (r) => (r.actorType === 'cvmind' ? 'CVMind' : r.actorName) },
          { key: 'what', header: 'Action', render: (r) => <span className="ad-mono">{r.action}</span> },
          { key: 'on', header: 'On', render: (r) => <span className="muted">{r.targetLabel}</span> }
        ]}
      />
      {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
    </>
  );
}

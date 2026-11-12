import { useState } from 'react';
import type { FormEvent } from 'react';
import { Archive, Pencil, Plus, Trash2, UserMinus } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { Badge, Card, ConfirmDialog, DataTable, Empty, Modal, SearchInput, Segment, Spinner } from '../ui';
import type { Tone } from '../ui';

// Team workspace → Past members: people whose time at CVMind ended. A manager marks a current
// member as left (their details are copied in) or adds an older record by hand.

type Reason = 'internship_completed' | 'resigned' | 'contract_ended' | 'terminated' | 'other';
const REASONS: Array<{ value: Reason; label: string; tone: Tone }> = [
  { value: 'internship_completed', label: 'Internship completed', tone: 'green' },
  { value: 'resigned', label: 'Resigned', tone: 'blue' },
  { value: 'contract_ended', label: 'Contract ended', tone: 'purple' },
  { value: 'terminated', label: 'Terminated', tone: 'red' },
  { value: 'other', label: 'Other', tone: 'gray' }
];
const reasonOf = (r: Reason) => REASONS.find((x) => x.value === r) || REASONS[4];

interface PastMember {
  id: string; adminId: string | null; name: string; email: string; phone: string; idNumber: string; role: string; department: string;
  joinedOn: string; leftOn: string; reason: Reason; certificateIssued: boolean; lorIssued: boolean; notes: string; addedByName: string; createdAt: string;
}
interface Member { id: string; name: string; username: string; roleLabel: string; active: boolean; idNumber?: string }

// "2026-11-12" → "12 Nov 2026", without a timezone shift
const day = (v: string) => {
  if (!v) return '—';
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type Editing = { mode: 'member' } | { mode: 'manual' } | { mode: 'edit'; row: PastMember };

export function PastMembersTab() {
  const { busy, run } = useAction();
  const [q, setQ] = useState('');
  const [reason, setReason] = useState<'' | Reason>('');
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<{ data: PastMember[] }>('/team/past-members', { q: search, reason });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<PastMember | null>(null);

  return (
    <>
      <Card
        bodyClass={false}
        title="Past members"
        description="Everyone whose time at CVMind has ended: finished internships, resignations and older records. Mark a current member as left, or add an old record by hand."
        actions={
          <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="ad-btn sm" onClick={() => setEditing({ mode: 'manual' })}><Plus size={14} /> Add old record</button>
            <button type="button" className="ad-btn primary sm" onClick={() => setEditing({ mode: 'member' })}><UserMinus size={14} /> Mark member as left</button>
          </span>
        }
      >
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, ID or role" />
          <Segment<'' | Reason>
            value={reason}
            onChange={setReason}
            options={[{ value: '' as const, label: 'All' }, ...REASONS.map((r) => ({ value: r.value, label: r.label }))]}
          />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(r) => r.id}
          empty={<Empty icon={<Archive size={20} />} title="No past members yet" text="When someone's internship or job ends, mark them as left and they will be listed here." />}
          columns={[
            { key: 'who', header: 'Person', render: (r) => <span><strong>{r.name}</strong><br /><span className="muted">{[r.email, r.phone].filter(Boolean).join(' · ') || '—'}</span></span> },
            { key: 'id', header: 'ID', render: (r) => r.idNumber ? <span className="ad-mono">{r.idNumber}</span> : <span className="muted">—</span> },
            { key: 'role', header: 'Role', render: (r) => <span>{r.role || '—'}{r.department && <><br /><span className="muted">{r.department}</span></>}</span> },
            { key: 'period', header: 'Worked', render: (r) => <span>{day(r.joinedOn)} – {day(r.leftOn)}</span> },
            { key: 'reason', header: 'Why they left', render: (r) => <Badge tone={reasonOf(r.reason).tone}>{reasonOf(r.reason).label}</Badge> },
            { key: 'docs', header: 'Documents', render: (r) => (
              <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                <Badge tone={r.certificateIssued ? 'green' : 'gray'}>{r.certificateIssued ? '✓' : '✗'} Certificate</Badge>
                <Badge tone={r.lorIssued ? 'green' : 'gray'}>{r.lorIssued ? '✓' : '✗'} LOR</Badge>
              </span>
            ) },
            { key: 'actions', header: '', className: 'actions', render: (r) => (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button type="button" className="ad-btn sm" onClick={() => setEditing({ mode: 'edit', row: r })} aria-label={`Edit ${r.name}`}><Pencil size={13} /> Edit</button>
                <button type="button" className="ad-btn sm danger-outline" onClick={() => setDeleting(r)} aria-label={`Delete ${r.name}`}><Trash2 size={13} /></button>
              </span>
            ) }
          ]}
        />
      </Card>
      {editing && <PastMemberForm editing={editing} recorded={(data?.data || []).map((r) => r.adminId).filter(Boolean) as string[]} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}'s record?`}
          description="Only this record is removed. Their account, if they still have one, doesn't change."
          confirmLabel="Delete record"
          danger
          busy={busy === 'delete'}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const ok = await run('delete', () => api(`/team/past-members/${deleting.id}`, { method: 'DELETE' }), 'Record deleted');
            setDeleting(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </>
  );
}

function PastMemberForm({ editing, recorded, onClose, onDone }: { editing: Editing; recorded: string[]; onClose: () => void; onDone: () => void }) {
  const { admin } = useAdmin();
  const { busy, run } = useAction();
  const people = useApi<{ data: Member[] }>(editing.mode === 'member' ? '/team/members' : null);
  const candidates = (people.data?.data || []).filter((p) => p.active && p.id !== admin.id && !recorded.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  const row = editing.mode === 'edit' ? editing.row : null;
  const [memberId, setMemberId] = useState('');
  const [form, setForm] = useState({
    name: row?.name || '', email: row?.email || '', phone: row?.phone || '', idNumber: row?.idNumber || '', role: row?.role || '', department: row?.department || '',
    joinedOn: row?.joinedOn || '', leftOn: row?.leftOn || todayIso(), reason: (row?.reason || 'internship_completed') as Reason,
    certificateIssued: row?.certificateIssued || false, lorIssued: row?.lorIssued || false, notes: row?.notes || ''
  });
  const [removeAccess, setRemoveAccess] = useState(true);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const member = candidates.find((p) => p.id === memberId);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (editing.mode === 'member') {
      const { joinedOn, leftOn, reason, certificateIssued, lorIssued, notes } = form;
      const body = { leftOn, reason, certificateIssued, lorIssued, notes, removeAccess, ...(joinedOn ? { joinedOn } : {}) };
      const ok = await run('save', () => api(`/team/past-members/from-member/${memberId}`, { method: 'POST', body }), `${member?.name || 'They'} moved to Past members`);
      if (ok !== undefined) onDone();
      return;
    }
    const ok = await run('save', () => api(row ? `/team/past-members/${row.id}` : '/team/past-members', { method: row ? 'PATCH' : 'POST', body: form }), row ? 'Record saved' : 'Record added');
    if (ok !== undefined) onDone();
  };

  const title = editing.mode === 'member' ? 'Mark a member as left' : row ? `Edit ${row.name}` : 'Add an old record';
  const description = editing.mode === 'member'
    ? 'Their name, email, phone, ID number, role and department are copied from their account.'
    : row ? undefined : 'For someone who left before CVMind Team, or never had an account.';
  const canSave = editing.mode === 'member' ? !!memberId && !!form.leftOn : !!form.name.trim() && !!form.leftOn;

  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      wide
      footer={<>
        <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="ad-past" className="ad-btn primary" disabled={busy === 'save' || !canSave}>{busy === 'save' && <Spinner size={14} />} {editing.mode === 'member' ? 'Mark as left' : 'Save'}</button>
      </>}
    >
      <form id="ad-past" onSubmit={submit}>
        {editing.mode === 'member' ? (
          <div className="ad-field">
            <label htmlFor="pm-member">Member</label>
            <select id="pm-member" className="ad-select" value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
              <option value="">{people.loading ? 'Loading…' : 'Choose who is leaving'}</option>
              {candidates.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.roleLabel}{p.idNumber ? ` · ${p.idNumber}` : ''}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div className="ad-form-row">
              <div className="ad-field"><label htmlFor="pm-name">Full name</label><input id="pm-name" className="ad-input" value={form.name} onChange={set('name')} maxLength={80} required autoFocus /></div>
              <div className="ad-field"><label htmlFor="pm-id">ID number</label><input id="pm-id" className="ad-input ad-mono" value={form.idNumber} onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value.toUpperCase() }))} maxLength={20} placeholder="CVM/INTERNS/0001" /></div>
            </div>
            <div className="ad-form-row" style={{ marginTop: 14 }}>
              <div className="ad-field"><label htmlFor="pm-email">Email</label><input id="pm-email" type="email" className="ad-input" value={form.email} onChange={set('email')} maxLength={120} /></div>
              <div className="ad-field"><label htmlFor="pm-phone">Phone number</label><input id="pm-phone" type="tel" className="ad-input" value={form.phone} onChange={set('phone')} maxLength={20} /></div>
            </div>
            <div className="ad-form-row" style={{ marginTop: 14 }}>
              <div className="ad-field"><label htmlFor="pm-role">Role</label><input id="pm-role" className="ad-input" value={form.role} onChange={set('role')} maxLength={80} placeholder="Content Writing Intern" /></div>
              <div className="ad-field"><label htmlFor="pm-dept">Department</label><input id="pm-dept" className="ad-input" value={form.department} onChange={set('department')} maxLength={60} /></div>
            </div>
          </>
        )}
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field">
            <label htmlFor="pm-joined">Joined on</label>
            <input id="pm-joined" type="date" className="ad-input" value={form.joinedOn} onChange={set('joinedOn')} />
            {editing.mode === 'member' && <span className="ad-hint">Leave empty to use the day their account was made.</span>}
          </div>
          <div className="ad-field"><label htmlFor="pm-left">Left on</label><input id="pm-left" type="date" className="ad-input" value={form.leftOn} onChange={set('leftOn')} required /></div>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="pm-reason">Why they left</label>
          <select id="pm-reason" className="ad-select" value={form.reason} onChange={set('reason')}>
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="ad-field">
          <span className="ad-label">Documents given</span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label className="ad-check"><input type="checkbox" checked={form.certificateIssued} onChange={(e) => setForm((f) => ({ ...f, certificateIssued: e.target.checked }))} /> Completion certificate</label>
            <label className="ad-check"><input type="checkbox" checked={form.lorIssued} onChange={(e) => setForm((f) => ({ ...f, lorIssued: e.target.checked }))} /> Letter of recommendation</label>
          </div>
        </div>
        <div className="ad-field">
          <label htmlFor="pm-notes">Notes</label>
          <textarea id="pm-notes" className="ad-textarea" value={form.notes} onChange={set('notes')} maxLength={1000} placeholder="Anything worth remembering about their work" />
        </div>
        {editing.mode === 'member' && (
          <label className="ad-check"><input type="checkbox" checked={removeAccess} onChange={(e) => setRemoveAccess(e.target.checked)} /> Turn off their CVMind Team access now (signs them out of team.cvmind.in)</label>
        )}
      </form>
    </Modal>
  );
}

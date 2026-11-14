import { useState } from 'react';
import type { FormEvent } from 'react';
import { Ban, Download, ExternalLink, FilePlus2, FileSignature, RotateCcw, Save } from 'lucide-react';
import { api, downloadFile } from '../api';
import { useAction, useApi } from '../hooks';
import { dateTime } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Empty, Modal, Notice, PageHeader, Segment, Spinner, Tabs } from '../ui';
import { day } from '../erp';

// ERP → Letters: issue offer letters, certificates and more from each person's HR file.
// Every letter gets a number and a public verify link (cvmind.in/verify/<code>).

interface Letter { id: string; number: string; code: string; type: string; typeLabel: string; recipientName: string; recipientEmail: string; title: string; issuedOn: string; issuedByName: string; status: 'valid' | 'revoked'; revokedReason: string; emailedAt: string | null; verifyUrl: string }
interface LetterType { value: string; label: string }
interface Request { id: string; adminId: string; name: string; type: string; typeLabel: string; note: string; status: string; createdAt: string }
interface Template { type: string; label: string; title: string; body: string; custom: boolean; updatedByName: string }
interface Person { id: string; name: string; active: boolean; designation: string; roleLabel: string }

type View = 'issued' | 'requests' | 'templates';

export default function ErpLetters() {
  const [view, setView] = useState<View>('issued');
  const list = useApi<{ data: Letter[]; types: LetterType[]; pendingRequests: number }>('/erp/letters');
  const [issuing, setIssuing] = useState<{ adminId?: string; type?: string; requestId?: string } | null>(null);

  return (
    <>
      <PageHeader
        title="Letters & certificates"
        description="Offer letters, internship certificates, experience and relieving letters, pay certificates and recommendations. Filled from the HR file, emailed as a PDF, and checkable by anyone at their verify link."
        actions={<button type="button" className="ad-btn primary" onClick={() => setIssuing({})}><FilePlus2 size={15} /> Issue a letter</button>}
      />
      <Tabs<View>
        active={view}
        onChange={setView}
        tabs={[
          { id: 'issued', label: 'Issued' },
          { id: 'requests', label: 'Requests', count: list.data?.pendingRequests || undefined },
          { id: 'templates', label: 'Templates' }
        ]}
      />
      {view === 'issued' && <IssuedTab list={list} />}
      {view === 'requests' && <RequestsTab onIssue={(r) => setIssuing({ adminId: r.adminId, type: r.type, requestId: r.id })} />}
      {view === 'templates' && <TemplatesTab />}
      {issuing && <IssueForm start={issuing} types={list.data?.types || []} onClose={() => setIssuing(null)} onDone={() => { setIssuing(null); list.reload(); setView('issued'); }} />}
    </>
  );
}

function IssuedTab({ list }: { list: ReturnType<typeof useApi<{ data: Letter[]; types: LetterType[]; pendingRequests: number }>> }) {
  const { busy, run } = useAction();
  const [type, setType] = useState('');
  const [revoking, setRevoking] = useState<Letter | null>(null);
  const rows = (list.data?.data || []).filter((l) => !type || l.type === type);
  return (
    <Card bodyClass={false}>
      <div className="ad-toolbar">
        <Segment<string> value={type} onChange={setType} options={[{ value: '', label: 'All' }, ...(list.data?.types || []).map((t) => ({ value: t.value, label: t.label.replace(/ \/.*$/, '') }))]} />
      </div>
      <DataTable
        rows={list.data ? rows : undefined}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        rowKey={(l) => l.id}
        empty={<Empty icon={<FileSignature size={20} />} title="No letters yet" text="Issue one from someone's HR file details." />}
        columns={[
          { key: 'num', header: 'Number', render: (l) => <span className="ad-mono">{l.number}</span> },
          { key: 'who', header: 'For', render: (l) => <span><strong>{l.recipientName}</strong><br /><span className="muted">{l.typeLabel}</span></span> },
          { key: 'date', header: 'Issued', render: (l) => <span>{day(l.issuedOn)}<br /><span className="muted">by {l.issuedByName}{l.emailedAt ? ' · emailed' : ''}</span></span> },
          { key: 'status', header: 'Status', render: (l) => l.status === 'valid' ? <Badge tone="green">Valid</Badge> : <span><Badge tone="red">Revoked</Badge><br /><span className="muted">{l.revokedReason}</span></span> },
          { key: 'actions', header: '', className: 'actions', render: (l) => (
            <span style={{ display: 'inline-flex', gap: 6 }}>
              <button type="button" className="ad-btn sm" disabled={busy === l.id} onClick={() => run(l.id, () => downloadFile(`/erp/letters/${l.id}/pdf`, `${l.number}.pdf`))}><Download size={13} /> PDF</button>
              <a className="ad-btn sm" href={l.verifyUrl} target="_blank" rel="noreferrer" aria-label="Open verify page"><ExternalLink size={13} /></a>
              {l.status === 'valid' && <button type="button" className="ad-btn sm danger-outline" onClick={() => setRevoking(l)} aria-label={`Revoke ${l.number}`}><Ban size={13} /></button>}
            </span>
          ) }
        ]}
      />
      {revoking && (
        <ConfirmDialog
          title={`Revoke ${revoking.number}?`}
          description="Its verify page will say it was revoked. This can't be undone; issue a new letter instead."
          confirmLabel="Revoke"
          danger
          reason={{ label: 'Why', placeholder: 'Issued with a wrong date', required: true }}
          busy={busy === 'revoke'}
          onClose={() => setRevoking(null)}
          onConfirm={async (reason?: string) => {
            const ok = await run('revoke', () => api(`/erp/letters/${revoking.id}/revoke`, { method: 'POST', body: { reason } }), 'Letter revoked');
            setRevoking(null);
            if (ok !== undefined) list.reload();
          }}
        />
      )}
    </Card>
  );
}

function RequestsTab({ onIssue }: { onIssue: (r: Request) => void }) {
  const { busy, run } = useAction();
  const { data, error, loading, reload } = useApi<{ data: Request[] }>('/erp/letter-requests');
  const [declining, setDeclining] = useState<Request | null>(null);
  return (
    <Card bodyClass={false} title="Requests from the team" description="Members ask for letters from CVMind Team → Profile.">
      <DataTable
        rows={data?.data}
        loading={loading}
        error={error}
        onRetry={reload}
        rowKey={(r) => r.id}
        empty={<Empty icon={<FileSignature size={20} />} title="No requests waiting" />}
        columns={[
          { key: 'who', header: 'From', render: (r) => <strong>{r.name}</strong> },
          { key: 'type', header: 'Letter', render: (r) => <span>{r.typeLabel}{r.note && <><br /><span className="muted">{r.note}</span></>}</span> },
          { key: 'when', header: 'Asked', render: (r) => dateTime(r.createdAt) },
          { key: 'actions', header: '', className: 'actions', render: (r) => (
            <span style={{ display: 'inline-flex', gap: 6 }}>
              <button type="button" className="ad-btn sm primary" onClick={() => onIssue(r)}>Issue</button>
              <button type="button" className="ad-btn sm" onClick={() => setDeclining(r)}>Decline</button>
            </span>
          ) }
        ]}
      />
      {declining && (
        <ConfirmDialog
          title={`Decline ${declining.name}'s request?`}
          description="They'll see your reply in CVMind Team."
          confirmLabel="Decline"
          reason={{ label: 'Reply', placeholder: 'Your internship ends next week; ask again then.', required: false }}
          busy={busy === 'decline'}
          onClose={() => setDeclining(null)}
          onConfirm={async (reply?: string) => {
            const ok = await run('decline', () => api(`/erp/letter-requests/${declining.id}/decline`, { method: 'POST', body: { reply } }), 'Request declined');
            setDeclining(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </Card>
  );
}

function IssueForm({ start, types, onClose, onDone }: { start: { adminId?: string; type?: string; requestId?: string }; types: LetterType[]; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const people = useApi<{ data: Person[] }>('/erp/people', { status: 'all' });
  const [adminId, setAdminId] = useState(start.adminId || '');
  const [type, setType] = useState(start.type || 'completion');
  const [details, setDetails] = useState('');
  const [draft, setDraft] = useState<{ title: string; body: string; recipientEmail: string } | null>(null);
  const [sendEmail, setSendEmail] = useState(true);

  const preview = async (e: FormEvent) => {
    e.preventDefault();
    const res = await run('preview', () => api<{ data: { title: string; body: string; recipientEmail: string } }>('/erp/letters/preview', { method: 'POST', body: { adminId, type, details } }));
    if (res) setDraft(res.data);
  };
  const issue = async () => {
    if (!draft) return;
    const ok = await run('issue', () => api('/erp/letters', { method: 'POST', body: { adminId, type, title: draft.title, body: draft.body, sendEmail, requestId: start.requestId } }), 'Letter issued');
    if (ok !== undefined) onDone();
  };

  return (
    <Modal
      title={draft ? 'Check and issue' : 'Issue a letter'}
      description={draft ? 'Edit anything before issuing. Once issued, the letter gets a number and can only be revoked, not changed.' : 'Pick the person and the letter. The text is filled from their HR file.'}
      onClose={onClose}
      wide
      footer={draft ? <>
        <button type="button" className="ad-btn" onClick={() => setDraft(null)}>Back</button>
        <button type="button" className="ad-btn primary" disabled={busy === 'issue'} onClick={issue}>{busy === 'issue' && <Spinner size={14} />} Issue letter</button>
      </> : <>
        <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="erp-letter" className="ad-btn primary" disabled={busy === 'preview' || !adminId}>{busy === 'preview' && <Spinner size={14} />} Preview</button>
      </>}
    >
      {!draft ? (
        <form id="erp-letter" onSubmit={preview}>
          <div className="ad-form-row">
            <div className="ad-field">
              <label htmlFor="lt-person">For</label>
              <select id="lt-person" className="ad-select" value={adminId} onChange={(e) => setAdminId(e.target.value)} required>
                <option value="">{people.loading ? 'Loading…' : 'Choose a person'}</option>
                {(people.data?.data || []).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.designation || p.roleLabel}{p.active ? '' : ' (left)'}</option>)}
              </select>
            </div>
            <div className="ad-field">
              <label htmlFor="lt-type">Letter</label>
              <select id="lt-type" className="ad-select" value={type} onChange={(e) => setType(e.target.value)}>
                {types.filter((t) => t.value !== 'offer').map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="ad-field" style={{ marginTop: 14 }}>
            <label htmlFor="lt-details">Extra lines (optional)</label>
            <textarea id="lt-details" className="ad-textarea" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={3000} placeholder={type === 'recommendation' ? 'What they did well, projects, skills' : 'Projects they worked on, achievements'} />
            <span className="ad-hint">Goes where the template has {'{details}'}. Offer letters for new hires are issued from Hiring.</span>
          </div>
        </form>
      ) : (
        <>
          <div className="ad-field"><label htmlFor="lt-title">Title</label><input id="lt-title" className="ad-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120} /></div>
          <div className="ad-field" style={{ marginTop: 14 }}><label htmlFor="lt-body">Text</label><textarea id="lt-body" className="ad-textarea" rows={14} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} maxLength={12000} /></div>
          <label className="ad-check" style={{ marginTop: 10 }}><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} disabled={!draft.recipientEmail} /> Email the PDF to {draft.recipientEmail || 'them (no email on their account)'}</label>
        </>
      )}
    </Modal>
  );
}

function TemplatesTab() {
  const { data, error, loading, reload } = useApi<{ data: Template[]; placeholders: string[]; canEdit: boolean }>('/erp/letter-templates');
  const [open, setOpen] = useState<Template | null>(null);
  if (error && !data) return <Card><Notice tone="red">{error}</Notice></Card>;
  return (
    <>
      {data && !data.canEdit && <Notice tone="blue">Only the CEO, CTO, CMO or owner can change templates.</Notice>}
      <Card bodyClass={false}>
        <DataTable
          rows={data?.data}
          loading={loading}
          rowKey={(t) => t.type}
          onRowClick={(t) => setOpen(t)}
          columns={[
            { key: 'label', header: 'Letter', render: (t) => <strong>{t.label}</strong> },
            { key: 'title', header: 'Title on the letter', render: (t) => t.title },
            { key: 'custom', header: '', render: (t) => t.custom ? <Badge tone="blue">Edited{t.updatedByName ? ` by ${t.updatedByName}` : ''}</Badge> : <Badge tone="gray">Built-in</Badge> }
          ]}
        />
      </Card>
      {open && data && <TemplateForm template={open} placeholders={data.placeholders} canEdit={data.canEdit} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload(); }} />}
    </>
  );
}

function TemplateForm({ template, placeholders, canEdit, onClose, onDone }: { template: Template; placeholders: string[]; canEdit: boolean; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [title, setTitle] = useState(template.title);
  const [body, setBody] = useState(template.body);
  const save = async (reset = false) => {
    const ok = await run(reset ? 'reset' : 'save', () => api(`/erp/letter-templates/${template.type}`, { method: 'PUT', body: reset ? { reset: true } : { title, body } }), reset ? 'Back to the built-in text' : 'Template saved');
    if (ok !== undefined) onDone();
  };
  return (
    <Modal
      title={template.label}
      description={<>Placeholders: {placeholders.map((p) => <code key={p} style={{ marginRight: 6 }}>{`{${p}}`}</code>)}</>}
      onClose={onClose}
      wide
      footer={canEdit ? <>
        {template.custom && <button type="button" className="ad-btn" disabled={busy === 'reset'} onClick={() => save(true)}><RotateCcw size={14} /> Use built-in text</button>}
        <button type="button" className="ad-btn primary" disabled={busy === 'save'} onClick={() => save(false)}>{busy === 'save' && <Spinner size={14} />} <Save size={14} /> Save template</button>
      </> : <button type="button" className="ad-btn" onClick={onClose}>Close</button>}
    >
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="ad-field"><label htmlFor="tp-title">Title</label><input id="tp-title" className="ad-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
        <div className="ad-field" style={{ marginTop: 14 }}><label htmlFor="tp-body">Text</label><textarea id="tp-body" className="ad-textarea" rows={16} value={body} onChange={(e) => setBody(e.target.value)} maxLength={12000} /></div>
      </fieldset>
    </Modal>
  );
}
